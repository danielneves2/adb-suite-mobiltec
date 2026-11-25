//! Vigia de prints: enquanto roda, cada print novo tirado no aparelho é puxado para a pasta do aparelho no PC.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use tauri::Emitter;

use crate::process::hidden_command;
use crate::runner::{unique_path, CancellationToken};
use crate::stream::{StreamEnd, StreamOutput, StreamRegistry};

/// Pastas onde o Android guarda os prints (Samsung usa DCIM, a maioria usa Pictures).
pub const SCREENSHOT_DIRS: [&str; 2] = ["/sdcard/DCIM/Screenshots", "/sdcard/Pictures/Screenshots"];
const POLL: Duration = Duration::from_millis(1500);
/// Espera o aparelho terminar de gravar o arquivo antes de puxar.
const SETTLE: Duration = Duration::from_millis(800);

/// Script de shell que lista o caminho completo de cada arquivo das pastas de print (pastas que não existem são ignoradas).
pub fn listing_script() -> String {
    format!(
        "for d in {}; do [ -d \"$d\" ] && ls -1 \"$d\" | while read f; do echo \"$d/$f\"; done; done",
        SCREENSHOT_DIRS.join(" ")
    )
}

/// Só imagens, uma por linha, sem \r.
pub fn parse_listing(output: &str) -> Vec<String> {
    output
        .lines()
        .map(|l| l.trim_end_matches('\r').trim())
        .filter(|l| {
            let lower = l.to_ascii_lowercase();
            l.starts_with('/') && [".png", ".jpg", ".jpeg", ".webp"].iter().any(|ext| lower.ends_with(ext))
        })
        .map(str::to_string)
        .collect()
}

/// Arquivos que apareceram desde a última leitura (na ordem da listagem).
pub fn new_files(known: &HashSet<String>, current: &[String]) -> Vec<String> {
    current.iter().filter(|f| !known.contains(*f)).cloned().collect()
}

/// Nome local do print: o mesmo do aparelho, dentro de `<pasta do aparelho>\prints`, sem sobrescrever.
pub fn local_target(device_dir: &Path, remote: &str) -> PathBuf {
    let name = remote.rsplit('/').next().unwrap_or("print.png");
    unique_path(&device_dir.join("prints").join(name))
}

async fn list(adb: &Path, serial: &str) -> Result<Vec<String>, String> {
    let out = hidden_command(adb)
        .args(["-s", serial, "shell", &listing_script()])
        .stdin(std::process::Stdio::null())
        .output()
        .await
        .map_err(|e| format!("Não deu pra rodar o adb: {e}"))?;
    if !out.status.success() && out.stdout.is_empty() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    Ok(parse_listing(&String::from_utf8_lossy(&out.stdout)))
}

async fn pull(adb: &Path, serial: &str, remote: &str, local: &Path) -> Result<(), String> {
    if let Some(parent) = local.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Não deu pra criar a pasta {}: {e}", parent.display()))?;
    }
    let out = hidden_command(adb)
        .args(["-s", serial, "pull", remote, &local.to_string_lossy()])
        .stdin(std::process::Stdio::null())
        .output()
        .await
        .map_err(|e| format!("Não deu pra rodar o adb: {e}"))?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// Loop do vigia: fotografa a lista inicial (prints antigos não vêm) e puxa os novos até cancelar.
pub async fn watch_with(adb: &Path, serial: &str, device_dir: &Path, mut on_lines: impl FnMut(Vec<String>), cancel: CancellationToken) -> Result<(), String> {
    let mut known: HashSet<String> = list(adb, serial).await?.into_iter().collect();
    on_lines(vec![format!(
        "Vigiando os prints do aparelho ({} já existentes ficam de fora). Tire um print no aparelho…",
        known.len()
    )]);
    loop {
        tokio::select! {
            _ = cancel.cancelled() => return Ok(()),
            _ = tokio::time::sleep(POLL) => {}
        }
        let current = match list(adb, serial).await {
            Ok(c) => c,
            Err(e) => {
                on_lines(vec![format!("Não deu pra ler os prints: {e}")]);
                continue;
            }
        };
        let fresh = new_files(&known, &current);
        if fresh.is_empty() {
            continue;
        }
        tokio::time::sleep(SETTLE).await;
        for remote in fresh {
            let local = local_target(device_dir, &remote);
            match pull(adb, serial, &remote, &local).await {
                Ok(()) => on_lines(vec![format!("Print salvo: {}", local.display())]),
                Err(e) => on_lines(vec![format!("Não deu pra puxar {remote}: {e}")]),
            }
            known.insert(remote);
        }
    }
}

/// Começa a vigiar os prints. Para com o mesmo `stop_stream` dos comandos contínuos.
#[tauri::command]
pub async fn start_watch_prints(
    app: tauri::AppHandle,
    registry: tauri::State<'_, StreamRegistry>,
    run_id: String,
    serial: String,
    device_dir: String,
) -> Result<(), String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    let token = CancellationToken::new();
    let (app2, id2, token2) = (app.clone(), run_id.clone(), token.clone());
    let handle = tokio::spawn(async move {
        let emitter = app2.clone();
        let id_lines = id2.clone();
        let result = watch_with(
            &adb,
            &serial,
            Path::new(&device_dir),
            move |lines| {
                let _ = emitter.emit("stream-output", StreamOutput { run_id: id_lines.clone(), lines });
            },
            token2,
        )
        .await;
        let end = match result {
            Ok(()) => StreamEnd { run_id: id2, exit_code: 0, saved_to: None, error: None },
            Err(e) => StreamEnd { run_id: id2, exit_code: -1, saved_to: None, error: Some(e) },
        };
        let _ = app2.emit("stream-end", end);
    });
    registry.0.lock().unwrap().insert(run_id, (token, handle));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lista_so_imagens_com_caminho() {
        let out = "/sdcard/DCIM/Screenshots/Screenshot_20261125-151200_One UI.jpg\r\n/sdcard/DCIM/Screenshots/.thumbnails\r\n/sdcard/Pictures/Screenshots/a.PNG\nls: x: No such file\n\n";
        assert_eq!(
            parse_listing(out),
            vec!["/sdcard/DCIM/Screenshots/Screenshot_20261125-151200_One UI.jpg".to_string(), "/sdcard/Pictures/Screenshots/a.PNG".to_string()]
        );
    }

    #[test]
    fn novos_sao_so_os_que_nao_estavam() {
        let known: HashSet<String> = ["/a/1.png".to_string()].into_iter().collect();
        let current = vec!["/a/1.png".to_string(), "/a/2.png".to_string()];
        assert_eq!(new_files(&known, &current), vec!["/a/2.png".to_string()]);
    }

    #[test]
    fn script_olha_as_duas_pastas() {
        let s = listing_script();
        assert!(s.contains("/sdcard/DCIM/Screenshots"));
        assert!(s.contains("/sdcard/Pictures/Screenshots"));
    }

    #[test]
    fn destino_fica_em_prints_sem_sobrescrever() {
        let dir = tempfile::tempdir().unwrap();
        let first = local_target(dir.path(), "/sdcard/DCIM/Screenshots/s1.jpg");
        assert_eq!(first, dir.path().join("prints").join("s1.jpg"));
        std::fs::create_dir_all(first.parent().unwrap()).unwrap();
        std::fs::write(&first, "x").unwrap();
        assert_eq!(local_target(dir.path(), "/sdcard/DCIM/Screenshots/s1.jpg"), dir.path().join("prints").join("s1_2.jpg"));
    }
}
