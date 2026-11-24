use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

/// O adb embutido fica em `<resource_dir>/adb/adb.exe` (com as DLLs ao lado).
/// O app nunca usa o adb do PATH.
pub fn adb_path(resource_dir: &Path) -> PathBuf {
    resource_dir.join("adb").join("adb.exe")
}

/// Caminho do adb embutido para este app (dev e instalado).
pub fn app_adb_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Não achei a pasta do app: {e}"))?;
    let path = adb_path(&dir);
    if path.exists() {
        Ok(path)
    } else {
        Err(format!(
            "adb embutido não encontrado em {}. Rode scripts\\baixar-platform-tools.ps1.",
            path.display()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adb_fica_na_pasta_adb_dos_resources() {
        assert_eq!(adb_path(Path::new("C:\\app")), PathBuf::from("C:\\app\\adb\\adb.exe"));
    }
}
