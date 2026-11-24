mod adb_path;
mod process;
mod runner;

use adb_path::app_adb_path;
use process::hidden_command;

/// Primeira linha de `adb version` do adb embutido.
#[tauri::command]
async fn adb_version(app: tauri::AppHandle) -> Result<String, String> {
    let adb = app_adb_path(&app)?;
    let out = hidden_command(&adb)
        .arg("version")
        .output()
        .await
        .map_err(|e| format!("Não deu pra rodar o adb: {e}"))?;
    Ok(String::from_utf8_lossy(&out.stdout).lines().next().unwrap_or_default().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(runner::RunRegistry::default())
        .invoke_handler(tauri::generate_handler![adb_version, runner::run_steps, runner::cancel_run])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
