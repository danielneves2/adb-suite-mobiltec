//! Comandos contínuos (logcat contínuo, gravar tela): linhas vão pra UI em lotes até o técnico clicar Parar.

use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::task::JoinHandle;

use crate::process::hidden_command;
use crate::runner::{decode_output, run_one, unique_path, CancellationToken, StepIn, StepOut};

const BATCH_INTERVAL: Duration = Duration::from_millis(100);
const BATCH_MAX_LINES: usize = 200;
const STOP_GRACE: Duration = Duration::from_secs(3);

/// Roda o passo em modo contínuo, entregando linhas em lotes a `on_lines`.
/// Com `redirect_to`, cada linha também vai pro arquivo. Devolve (exit code, arquivo salvo).
pub async fn stream_with(
    program: &Path,
    step: StepIn,
    mut on_lines: impl FnMut(Vec<String>),
    cancel: CancellationToken,
) -> Result<(i32, Option<String>), String> {
    let mut file = match &step.redirect_to {
        Some(target) => {
            let path = PathBuf::from(target);
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Não deu pra criar a pasta {}: {e}", parent.display()))?;
            }
            let path = unique_path(&path);
            let f = std::fs::File::create(&path).map_err(|e| format!("Não deu pra criar {}: {e}", path.display()))?;
            Some((std::io::BufWriter::new(f), path))
        }
        None => None,
    };

    let mut child = hidden_command(program)
        .args(&step.args)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Não deu pra rodar o adb: {e}"))?;

    let mut stdout = BufReader::new(child.stdout.take().expect("stdout piped"));
    let mut stderr = child.stderr.take().expect("stderr piped");
    let stderr_task = tokio::spawn(async move {
        let mut buf = Vec::new();
        let _ = tokio::io::AsyncReadExt::read_to_end(&mut stderr, &mut buf).await;
        buf
    });

    let mut batch: Vec<String> = Vec::new();
    let mut ticker = tokio::time::interval(BATCH_INTERVAL);
    let mut buf = Vec::new();
    let mut cancelled = false;

    loop {
        tokio::select! {
            biased;
            _ = cancel.cancelled() => { cancelled = true; break; }
            read = stdout.read_until(b'\n', &mut buf) => {
                match read {
                    Ok(0) => break,
                    Ok(_) => {
                        if let Some((w, _)) = file.as_mut() {
                            w.write_all(&buf).map_err(|e| format!("Falha ao gravar o arquivo: {e}"))?;
                        }
                        let line = decode_output(&buf);
                        batch.push(line.trim_end_matches(['\r', '\n']).to_string());
                        buf.clear();
                        if batch.len() >= BATCH_MAX_LINES {
                            on_lines(std::mem::take(&mut batch));
                        }
                    }
                    Err(e) => return Err(format!("Falha ao ler a saída do adb: {e}")),
                }
            }
            _ = ticker.tick() => {
                if !batch.is_empty() {
                    on_lines(std::mem::take(&mut batch));
                }
            }
        }
    }

    if !batch.is_empty() {
        on_lines(batch);
    }
    if cancelled {
        let _ = child.kill().await;
    }
    let code = child.wait().await.map(|s| s.code().unwrap_or(-1)).unwrap_or(-1);
    // Um neto do processo (ex.: servidor adb iniciado agora) pode herdar o pipe e nunca fechá-lo:
    // depois de cancelar, não espera o stderr mais que 1 s.
    let stderr_bytes = if cancelled {
        match tokio::time::timeout(Duration::from_secs(1), stderr_task).await {
            Ok(r) => r.unwrap_or_default(),
            Err(_) => Vec::new(),
        }
    } else {
        stderr_task.await.unwrap_or_default()
    };
    if !stderr_bytes.is_empty() {
        on_lines(decode_output(&stderr_bytes).lines().map(str::to_string).collect());
    }
    let saved = match file {
        Some((mut w, path)) => {
            w.flush().map_err(|e| format!("Falha ao gravar o arquivo: {e}"))?;
            Some(path.to_string_lossy().to_string())
        }
        None => None,
    };
    Ok((code, saved))
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StreamOutput {
    run_id: String,
    lines: Vec<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StreamEnd {
    run_id: String,
    exit_code: i32,
    saved_to: Option<String>,
    error: Option<String>,
}

/// Execuções contínuas em andamento, por `run_id`.
#[derive(Default)]
pub struct StreamRegistry(pub Mutex<HashMap<String, (CancellationToken, JoinHandle<()>)>>);

#[tauri::command]
pub async fn start_stream(
    app: tauri::AppHandle,
    registry: tauri::State<'_, StreamRegistry>,
    run_id: String,
    step: StepIn,
    device_dir: Option<String>,
) -> Result<(), String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    if let Some(dir) = device_dir {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Não deu pra criar a pasta {dir}: {e}"))?;
    }
    let token = CancellationToken::new();
    let (app2, id2, token2) = (app.clone(), run_id.clone(), token.clone());
    let handle = tokio::spawn(async move {
        let emitter = app2.clone();
        let id_lines = id2.clone();
        let result = stream_with(
            &adb,
            step,
            move |lines| {
                let _ = emitter.emit("stream-output", StreamOutput { run_id: id_lines.clone(), lines });
            },
            token2,
        )
        .await;
        let end = match result {
            Ok((exit_code, saved_to)) => StreamEnd { run_id: id2, exit_code, saved_to, error: None },
            Err(e) => StreamEnd { run_id: id2, exit_code: -1, saved_to: None, error: Some(e) },
        };
        let _ = app2.emit("stream-end", end);
    });
    registry.0.lock().unwrap().insert(run_id, (token, handle));
    Ok(())
}

/// Para: roda `stop_step` (ex.: pkill -INT screenrecord), espera até 3 s o processo sair sozinho,
/// senão mata; depois roda `after_step` (ex.: puxar o vídeo).
#[tauri::command]
pub async fn stop_stream(
    app: tauri::AppHandle,
    registry: tauri::State<'_, StreamRegistry>,
    run_id: String,
    stop_step: Option<StepIn>,
    after_step: Option<StepIn>,
) -> Result<Option<StepOut>, String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    let entry = registry.0.lock().unwrap().remove(&run_id);
    let none = CancellationToken::new();
    if let Some((token, mut handle)) = entry {
        if let Some(step) = &stop_step {
            run_one(&adb, step, None, &none).await?;
        }
        if tokio::time::timeout(STOP_GRACE, &mut handle).await.is_err() {
            token.cancel();
            let _ = handle.await;
        }
    }
    match &after_step {
        Some(step) => Ok(Some(run_one(&adb, step, None, &none).await?)),
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn cmd_exe() -> PathBuf {
        PathBuf::from(std::env::var("ComSpec").unwrap_or_else(|_| "C:\\Windows\\System32\\cmd.exe".into()))
    }

    fn step(args: &[&str]) -> StepIn {
        StepIn { args: args.iter().map(|s| s.to_string()).collect(), redirect_to: None, uses_previous: false }
    }

    #[tokio::test]
    async fn stream_entrega_as_linhas_e_o_codigo() {
        let mut lines = Vec::new();
        let (code, saved) = stream_with(&cmd_exe(), step(&["/C", "echo a& echo b"]), |batch| lines.extend(batch), CancellationToken::new())
            .await
            .unwrap();
        assert_eq!(lines, vec!["a".to_string(), "b".to_string()]);
        assert_eq!(code, 0);
        assert_eq!(saved, None);
    }

    #[tokio::test]
    async fn stream_com_redirecionamento_grava_e_mostra() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("logs").join("log.txt");
        let mut s = step(&["/C", "echo a& echo b"]);
        s.redirect_to = Some(target.to_string_lossy().to_string());
        let mut lines = Vec::new();
        let (_, saved) = stream_with(&cmd_exe(), s, |batch| lines.extend(batch), CancellationToken::new()).await.unwrap();
        assert_eq!(lines.len(), 2);
        assert_eq!(saved.as_deref(), Some(target.to_string_lossy().as_ref()));
        assert_eq!(std::fs::read_to_string(&target).unwrap().replace("\r\n", "\n"), "a\nb\n");
    }

    #[tokio::test]
    async fn stream_cancelado_termina() {
        let token = CancellationToken::new();
        let t2 = token.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            t2.cancel();
        });
        let started = std::time::Instant::now();
        let _ = stream_with(&cmd_exe(), step(&["/C", "ping", "-n", "30", "127.0.0.1"]), |_| {}, token).await;
        assert!(started.elapsed().as_secs() < 10);
    }
}
