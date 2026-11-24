//! Executa os passos montados pelo montador (src/lib/commandBuilder.ts) no adb embutido.
//! Sem cmd.exe: o adb recebe o vetor de args direto.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Instant;

use serde::{Deserialize, Serialize};
pub use tokio_util::sync::CancellationToken;

use crate::process::hidden_command;

pub const PREVIOUS_PLACEHOLDER: &str = "{anterior}";

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StepIn {
    pub args: Vec<String>,
    pub redirect_to: Option<String>,
    #[serde(default)]
    pub uses_previous: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StepOut {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
    pub saved_to: Option<String>,
}

/// 1ª linha não vazia da saída anterior, sem o prefixo `package:` (saída do `pm path`).
pub fn resolve_previous(stdout: &str) -> Option<String> {
    let line = stdout.lines().map(str::trim).find(|l| !l.is_empty())?;
    Some(line.strip_prefix("package:").unwrap_or(line).to_string())
}

/// Se o arquivo já existe, acrescenta `_2`, `_3`… antes da extensão.
pub fn unique_path(p: &Path) -> PathBuf {
    if !p.exists() {
        return p.to_path_buf();
    }
    let stem = p.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    let ext = p.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
    let parent = p.parent().unwrap_or_else(|| Path::new(""));
    (2..)
        .map(|n| parent.join(format!("{stem}_{n}{ext}")))
        .find(|candidate| !candidate.exists())
        .expect("sempre há um nome livre")
}

/// UTF-8 com substituição de bytes inválidos; quebras de linha do Windows viram `\n`.
pub fn decode_output(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).replace("\r\n", "\n")
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Não deu pra criar a pasta {}: {e}", parent.display()))?;
    }
    Ok(())
}

/// Roda um passo e devolve o resultado. `previous` é a saída do passo anterior.
pub async fn run_one(program: &Path, step: &StepIn, previous: Option<&str>, cancel: &CancellationToken) -> Result<StepOut, String> {
    let args = if step.uses_previous || step.args.iter().any(|a| a == PREVIOUS_PLACEHOLDER) {
        let value = previous
            .and_then(resolve_previous)
            .ok_or_else(|| "Não deu pra ler o resultado do passo anterior.".to_string())?;
        step.args.iter().map(|a| if a == PREVIOUS_PLACEHOLDER { value.clone() } else { a.clone() }).collect()
    } else {
        step.args.clone()
    };

    let redirect = match &step.redirect_to {
        Some(target) => {
            let path = PathBuf::from(target);
            ensure_parent(&path)?;
            Some(unique_path(&path))
        }
        None => None,
    };

    let started = Instant::now();
    let child = hidden_command(program)
        .args(&args)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Não deu pra rodar o adb: {e}"))?;

    // kill_on_drop: se o cancelamento vencer, o filho morre junto com o future.
    let output = tokio::select! {
        biased;
        _ = cancel.cancelled() => return Err("Cancelado.".to_string()),
        out = child.wait_with_output() => out.map_err(|e| format!("Falha ao ler a saída do adb: {e}"))?,
    };

    let mut saved_to = None;
    let stdout = match redirect {
        Some(path) => {
            std::fs::write(&path, &output.stdout).map_err(|e| format!("Não deu pra salvar {}: {e}", path.display()))?;
            saved_to = Some(path.to_string_lossy().to_string());
            String::new()
        }
        None => decode_output(&output.stdout),
    };

    Ok(StepOut {
        stdout,
        stderr: decode_output(&output.stderr),
        exit_code: output.status.code().unwrap_or(-1),
        duration_ms: started.elapsed().as_millis() as u64,
        saved_to,
    })
}

/// Roda os passos em sequência e para no primeiro que falhar.
pub async fn run_steps_with(
    program: &Path,
    steps: Vec<StepIn>,
    ensure_dir: Option<PathBuf>,
    cancel: CancellationToken,
) -> Result<Vec<StepOut>, String> {
    if let Some(dir) = ensure_dir {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Não deu pra criar a pasta {}: {e}", dir.display()))?;
    }
    let mut results: Vec<StepOut> = Vec::with_capacity(steps.len());
    for step in &steps {
        let previous = results.last().map(|r| r.stdout.as_str());
        let out = run_one(program, step, previous, &cancel).await?;
        let failed = out.exit_code != 0;
        results.push(out);
        if failed {
            break;
        }
    }
    Ok(results)
}

/// Execuções em andamento, por `run_id`, para o botão Parar.
#[derive(Default)]
pub struct RunRegistry(pub Mutex<HashMap<String, CancellationToken>>);

impl RunRegistry {
    pub fn register(&self, run_id: &str) -> CancellationToken {
        let token = CancellationToken::new();
        self.0.lock().unwrap().insert(run_id.to_string(), token.clone());
        token
    }
    pub fn finish(&self, run_id: &str) {
        self.0.lock().unwrap().remove(run_id);
    }
    pub fn cancel(&self, run_id: &str) {
        if let Some(token) = self.0.lock().unwrap().remove(run_id) {
            token.cancel();
        }
    }
}

#[tauri::command]
pub async fn run_steps(
    app: tauri::AppHandle,
    registry: tauri::State<'_, RunRegistry>,
    run_id: String,
    steps: Vec<StepIn>,
    device_dir: Option<String>,
) -> Result<Vec<StepOut>, String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    let token = registry.register(&run_id);
    let result = run_steps_with(&adb, steps, device_dir.map(PathBuf::from), token).await;
    registry.finish(&run_id);
    result
}

#[tauri::command]
pub fn cancel_run(registry: tauri::State<'_, RunRegistry>, run_id: String) {
    registry.cancel(&run_id);
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

    #[test]
    fn resolve_previous_pega_primeira_linha_sem_package() {
        assert_eq!(
            resolve_previous("package:/data/app/~~a==/x-1==/base.apk\n"),
            Some("/data/app/~~a==/x-1==/base.apk".to_string())
        );
        assert_eq!(resolve_previous("\n\n"), None);
    }

    #[test]
    fn unique_path_acrescenta_numero() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("log.txt"), "").unwrap();
        std::fs::write(dir.path().join("log_2.txt"), "").unwrap();
        assert_eq!(unique_path(&dir.path().join("log.txt")), dir.path().join("log_3.txt"));
        assert_eq!(unique_path(&dir.path().join("novo.txt")), dir.path().join("novo.txt"));
    }

    #[test]
    fn decode_output_troca_bytes_invalidos_e_crlf() {
        assert_eq!(decode_output(b"a\r\n\xff b"), "a\n\u{FFFD} b");
    }

    #[tokio::test]
    async fn anterior_recebe_saida_do_passo_anterior() {
        let mut second = step(&["/C", "echo", "{anterior}"]);
        second.uses_previous = true;
        let out = run_steps_with(&cmd_exe(), vec![step(&["/C", "echo", "package:C:\\x"]), second], None, CancellationToken::new())
            .await
            .unwrap();
        assert_eq!(out.len(), 2);
        assert!(out[1].stdout.contains("C:\\x"), "stdout: {:?}", out[1].stdout);
    }

    #[tokio::test]
    async fn redirecionamento_grava_arquivo_e_cria_pasta() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("sub dir").join("a.txt");
        let mut s = step(&["/C", "echo", "oi"]);
        s.redirect_to = Some(target.to_string_lossy().to_string());
        let out = run_steps_with(&cmd_exe(), vec![s], None, CancellationToken::new()).await.unwrap();
        assert_eq!(out[0].saved_to.as_deref(), Some(target.to_string_lossy().as_ref()));
        assert_eq!(out[0].stdout, "");
        assert!(std::fs::read_to_string(&target).unwrap().contains("oi"));
    }

    #[tokio::test]
    async fn para_no_primeiro_erro() {
        let out = run_steps_with(&cmd_exe(), vec![step(&["/C", "exit", "3"]), step(&["/C", "echo", "nao"])], None, CancellationToken::new())
            .await
            .unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].exit_code, 3);
    }

    #[tokio::test]
    async fn cria_pasta_do_aparelho() {
        let dir = tempfile::tempdir().unwrap();
        let device_dir = dir.path().join("Samsung-Galaxy-A54_R58N");
        run_steps_with(&cmd_exe(), vec![step(&["/C", "echo", "x"])], Some(device_dir.clone()), CancellationToken::new())
            .await
            .unwrap();
        assert!(device_dir.is_dir());
    }

    #[tokio::test]
    async fn cancelar_interrompe() {
        let token = CancellationToken::new();
        token.cancel();
        let err = run_steps_with(&cmd_exe(), vec![step(&["/C", "ping", "-n", "5", "127.0.0.1"])], None, token)
            .await
            .unwrap_err();
        assert_eq!(err, "Cancelado.");
    }
}
