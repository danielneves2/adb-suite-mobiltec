//! Detecção de aparelhos com o adb embutido.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

use serde::Serialize;

use crate::process::hidden_command;
use crate::runner::decode_output;

#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub serial: String,
    /// `device` (pronto), `unauthorized`, `offline`…
    pub state: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub android: Option<String>,
}

/// (serial, estado) de cada linha de `adb devices -l`; ignora cabeçalho e linhas `*`.
pub fn parse_devices(output: &str) -> Vec<(String, String)> {
    output
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('*') && !l.starts_with("List of devices"))
        .filter_map(|l| {
            let mut parts = l.split_whitespace();
            Some((parts.next()?.to_string(), parts.next()?.to_string()))
        })
        .collect()
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

/// (marca, modelo, versão do Android) a partir da saída de `getprop` (`[chave]: [valor]`).
pub fn parse_getprop(output: &str) -> (Option<String>, Option<String>, Option<String>) {
    let mut props: HashMap<&str, &str> = HashMap::new();
    for line in output.lines() {
        let line = line.trim();
        if let Some((key, value)) = line.split_once("]: [") {
            let key = key.trim_start_matches('[');
            let value = value.trim_end_matches(']');
            props.insert(key, value);
        }
    }
    let get = |k: &str| props.get(k).filter(|v| !v.is_empty()).map(|v| v.to_string());
    (
        get("ro.product.manufacturer").map(|b| capitalize(&b)),
        get("ro.product.model"),
        get("ro.build.version.release"),
    )
}

/// Outro adb de versão diferente está segurando o servidor na porta 5037.
pub fn adb_server_conflict(stderr: &str) -> bool {
    stderr.contains("doesn't match this client")
}

/// Saída do `pm list packages`: sem `package:`, ordenada.
pub fn parse_packages(output: &str) -> Vec<String> {
    let mut pkgs: Vec<String> = output
        .lines()
        .filter_map(|l| l.trim().strip_prefix("package:").map(str::to_string))
        .filter(|p| !p.is_empty())
        .collect();
    pkgs.sort();
    pkgs
}

/// Argumentos do `pm list packages`: "user" (-3, padrão), "system" (-s) ou "all" (sem filtro).
pub fn packages_args<'a>(serial: &'a str, kind: &str) -> Vec<&'a str> {
    let mut args = vec!["-s", serial, "shell", "pm", "list", "packages"];
    match kind {
        "system" => args.push("-s"),
        "all" => {}
        _ => args.push("-3"),
    }
    args
}

/// Cache de marca/modelo/Android por serial (getprop só roda uma vez por aparelho).
#[derive(Default)]
pub struct DeviceCache(pub Mutex<HashMap<String, (Option<String>, Option<String>, Option<String>)>>);

async fn adb_output(adb: &Path, args: &[&str]) -> Result<(String, String), String> {
    let out = hidden_command(adb)
        .args(args)
        .stdin(std::process::Stdio::null())
        .output()
        .await
        .map_err(|e| format!("Não deu pra rodar o adb: {e}"))?;
    Ok((decode_output(&out.stdout), decode_output(&out.stderr)))
}

#[tauri::command]
pub async fn list_devices(app: tauri::AppHandle, cache: tauri::State<'_, DeviceCache>) -> Result<Vec<Device>, String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    let (stdout, stderr) = adb_output(&adb, &["devices", "-l"]).await?;
    if adb_server_conflict(&stderr) {
        return Err("Outro adb de versão diferente está rodando neste computador. Use \"Reiniciar servidor adb\".".into());
    }
    let mut devices = Vec::new();
    for (serial, state) in parse_devices(&stdout) {
        let cached = cache.0.lock().unwrap().get(&serial).cloned();
        let info = match cached {
            Some(info) => info,
            None if state == "device" => {
                let (props, _) = adb_output(&adb, &["-s", &serial, "shell", "getprop"]).await?;
                let info = parse_getprop(&props);
                cache.0.lock().unwrap().insert(serial.clone(), info.clone());
                info
            }
            None => (None, None, None),
        };
        devices.push(Device { serial, state, brand: info.0, model: info.1, android: info.2 });
    }
    Ok(devices)
}

#[tauri::command]
pub async fn restart_adb_server(app: tauri::AppHandle, cache: tauri::State<'_, DeviceCache>) -> Result<(), String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    adb_output(&adb, &["kill-server"]).await?;
    adb_output(&adb, &["start-server"]).await?;
    cache.0.lock().unwrap().clear();
    Ok(())
}

#[tauri::command]
pub async fn list_packages(app: tauri::AppHandle, serial: String, kind: Option<String>) -> Result<Vec<String>, String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    let (stdout, _) = adb_output(&adb, &packages_args(&serial, kind.as_deref().unwrap_or("user"))).await?;
    Ok(parse_packages(&stdout))
}

#[cfg(test)]
mod tests {
    use super::*;

    const DEVICES: &str = "* daemon not running; starting now at tcp:5037\r\n* daemon started successfully\r\nList of devices attached\r\nR58N12ABCDE            device usb:1-1 product:a54xnsxx model:SM_A546E device:a54x transport_id:1\r\nZY22ABC                unauthorized usb:1-2 transport_id:2\r\n192.168.0.10:5555      offline transport_id:3\r\n\r\n";

    #[test]
    fn parse_devices_le_serial_e_estado() {
        assert_eq!(
            parse_devices(DEVICES),
            vec![
                ("R58N12ABCDE".to_string(), "device".to_string()),
                ("ZY22ABC".to_string(), "unauthorized".to_string()),
                ("192.168.0.10:5555".to_string(), "offline".to_string()),
            ]
        );
    }

    #[test]
    fn parse_devices_vazio() {
        assert!(parse_devices("List of devices attached\n\n").is_empty());
        assert!(parse_devices("").is_empty());
    }

    #[test]
    fn parse_getprop_le_as_tres_chaves() {
        let out = "[ro.build.version.release]: [14]\n[ro.product.manufacturer]: [samsung]\n[ro.product.model]: [SM-A546E]\n[ro.x]: [y]\n";
        assert_eq!(
            parse_getprop(out),
            (Some("Samsung".to_string()), Some("SM-A546E".to_string()), Some("14".to_string()))
        );
        assert_eq!(parse_getprop("[ro.x]: [y]"), (None, None, None));
    }

    #[test]
    fn detecta_conflito_de_versao_do_servidor() {
        assert!(adb_server_conflict("adb server version (40) doesn't match this client (41); killing..."));
        assert!(!adb_server_conflict("error: no devices/emulators found"));
    }

    #[test]
    fn argumentos_do_pm_por_tipo() {
        assert_eq!(packages_args("R58N", "user"), vec!["-s", "R58N", "shell", "pm", "list", "packages", "-3"]);
        assert_eq!(packages_args("R58N", "system"), vec!["-s", "R58N", "shell", "pm", "list", "packages", "-s"]);
        assert_eq!(packages_args("R58N", "all"), vec!["-s", "R58N", "shell", "pm", "list", "packages"]);
        assert_eq!(packages_args("R58N", "qualquer"), vec!["-s", "R58N", "shell", "pm", "list", "packages", "-3"]);
    }

    #[test]
    fn parse_packages_ordena_e_tira_prefixo() {
        assert_eq!(
            parse_packages("package:com.b\r\npackage:com.a\n\n"),
            vec!["com.a".to_string(), "com.b".to_string()]
        );
    }
}
