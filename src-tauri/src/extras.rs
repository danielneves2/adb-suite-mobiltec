//! Ações extras: imagem no clipboard, zip, salvar texto e abrir terminal.

use std::io::Write;
use std::path::{Path, PathBuf};

use crate::runner::unique_path;

/// Compacta os arquivos de `dir` (sem subpastas) em `zip_path`.
pub fn zip_dir(dir: &Path, zip_path: &Path) -> Result<(), String> {
    let file = std::fs::File::create(zip_path).map_err(|e| format!("Não deu pra criar {}: {e}", zip_path.display()))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default();
    let mut entries: Vec<_> = std::fs::read_dir(dir)
        .map_err(|e| format!("Não deu pra ler {}: {e}", dir.display()))?
        .filter_map(Result::ok)
        .filter(|e| e.path().is_file())
        .collect();
    entries.sort_by_key(|e| e.file_name());
    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        zip.start_file(name, options).map_err(|e| format!("Falha no zip: {e}"))?;
        let bytes = std::fs::read(entry.path()).map_err(|e| format!("Não deu pra ler {}: {e}", entry.path().display()))?;
        zip.write_all(&bytes).map_err(|e| format!("Falha no zip: {e}"))?;
    }
    zip.finish().map_err(|e| format!("Falha no zip: {e}"))?;
    Ok(())
}

/// Grava texto criando a pasta; nunca sobrescreve (acrescenta `_2`, `_3`…).
pub fn write_text(path: &Path, contents: &str) -> Result<PathBuf, String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Não deu pra criar a pasta {}: {e}", parent.display()))?;
    }
    let target = unique_path(path);
    std::fs::write(&target, contents).map_err(|e| format!("Não deu pra salvar {}: {e}", target.display()))?;
    Ok(target)
}

#[tauri::command]
pub fn copy_image_to_clipboard(path: String) -> Result<(), String> {
    let img = image::open(&path).map_err(|e| format!("Não deu pra abrir a imagem: {e}"))?.to_rgba8();
    let (width, height) = img.dimensions();
    let mut clipboard = arboard::Clipboard::new().map_err(|e| format!("Clipboard indisponível: {e}"))?;
    clipboard
        .set_image(arboard::ImageData { width: width as usize, height: height as usize, bytes: img.into_raw().into() })
        .map_err(|e| format!("Não deu pra copiar a imagem: {e}"))
}

#[tauri::command]
pub fn zip_folder(dir: String, zip_path: String) -> Result<String, String> {
    let target = unique_path(Path::new(&zip_path));
    zip_dir(Path::new(&dir), &target)?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<String, String> {
    Ok(write_text(Path::new(&path), &contents)?.to_string_lossy().to_string())
}

/// Abre uma janela de terminal do Windows já dentro do aparelho (`adb -s <serial> shell`),
/// com o adb embutido no PATH só dessa janela.
#[tauri::command]
pub fn open_terminal(app: tauri::AppHandle, serial: String) -> Result<(), String> {
    let adb = crate::adb_path::app_adb_path(&app)?;
    let adb_dir = adb.parent().map(Path::to_path_buf).unwrap_or_default();
    let path = format!("{};{}", adb_dir.display(), std::env::var("PATH").unwrap_or_default());
    let mut cmd = std::process::Command::new("cmd.exe");
    cmd.args(["/K", "title", "ADB Shell", "&&", "adb", "-s", &serial, "shell"]).env("PATH", path);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0000_0010); // CREATE_NEW_CONSOLE
    }
    cmd.spawn().map_err(|e| format!("Não deu pra abrir o terminal: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zip_dir_compacta_os_arquivos() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("diagnostico_20261124_1432");
        std::fs::create_dir_all(&src).unwrap();
        std::fs::write(src.join("logcat.txt"), "log").unwrap();
        std::fs::write(src.join("props.txt"), "props").unwrap();
        let zip_path = dir.path().join("diagnostico_20261124_1432.zip");
        zip_dir(&src, &zip_path).unwrap();
        let archive = zip::ZipArchive::new(std::fs::File::open(&zip_path).unwrap()).unwrap();
        let mut names: Vec<_> = archive.file_names().map(|n| n.unwrap().to_string()).collect();
        names.sort();
        assert_eq!(names, vec!["logcat.txt", "props.txt"]);
    }

    #[test]
    fn write_text_file_cria_pasta_e_nao_sobrescreve() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("Samsung-A54_R58N").join("saida.txt");
        let first = write_text(&target, "um").unwrap();
        let second = write_text(&target, "dois").unwrap();
        assert_eq!(first, target);
        assert_eq!(second, dir.path().join("Samsung-A54_R58N").join("saida_2.txt"));
        assert_eq!(std::fs::read_to_string(&first).unwrap(), "um");
    }
}
