use std::path::Path;

/// Cria um processo sem abrir janela de console no Windows (CREATE_NO_WINDOW).
pub fn hidden_command(program: &Path) -> tokio::process::Command {
    #[allow(unused_mut)]
    let mut cmd = tokio::process::Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    cmd.kill_on_drop(true);
    cmd
}
