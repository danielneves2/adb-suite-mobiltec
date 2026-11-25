mod adb_path;
mod devices;
mod extras;
mod process;
mod runner;
mod stream;
mod watch;

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
    process::kill_children_on_exit();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(runner::RunRegistry::default())
        .manage(stream::StreamRegistry::default())
        .manage(devices::DeviceCache::default())
        .invoke_handler(tauri::generate_handler![
            adb_version,
            runner::run_steps,
            runner::cancel_run,
            stream::start_stream,
            stream::stop_stream,
            watch::start_watch_prints,
            devices::list_devices,
            devices::restart_adb_server,
            devices::list_packages,
            extras::copy_image_to_clipboard,
            extras::zip_folder,
            extras::write_text_file,
            extras::open_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
