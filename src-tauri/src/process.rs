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

/// Job do Windows que mata todos os processos dele quando o último handle fecha.
#[cfg(windows)]
pub struct KillOnCloseJob(windows_sys::Win32::Foundation::HANDLE);

#[cfg(windows)]
impl KillOnCloseJob {
    pub fn new() -> Result<Self, String> {
        use windows_sys::Win32::System::JobObjects::*;
        unsafe {
            let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
            if job.is_null() {
                return Err(format!("CreateJobObject falhou: {}", std::io::Error::last_os_error()));
            }
            let job = KillOnCloseJob(job);
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
            // BREAKAWAY_OK: o terminal aberto pelo técnico pode sair do job e continuar aberto.
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_BREAKAWAY_OK;
            let ok = SetInformationJobObject(
                job.0,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const std::ffi::c_void,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );
            if ok == 0 {
                return Err(format!("SetInformationJobObject falhou: {}", std::io::Error::last_os_error()));
            }
            Ok(job)
        }
    }

    pub fn assign(&self, process: std::os::windows::io::RawHandle) -> Result<(), String> {
        let ok = unsafe { windows_sys::Win32::System::JobObjects::AssignProcessToJobObject(self.0, process as _) };
        if ok == 0 {
            return Err(format!("AssignProcessToJobObject falhou: {}", std::io::Error::last_os_error()));
        }
        Ok(())
    }
}

#[cfg(windows)]
impl Drop for KillOnCloseJob {
    fn drop(&mut self) {
        unsafe { windows_sys::Win32::Foundation::CloseHandle(self.0) };
    }
}

/// Põe o próprio app num job "mata ao fechar": os processos adb que ele abrir (logcat contínuo,
/// gravação) morrem junto quando o app fecha, mesmo sem passar pelos destrutores.
pub fn kill_children_on_exit() {
    #[cfg(windows)]
    {
        let attach = || -> Result<KillOnCloseJob, String> {
            let job = KillOnCloseJob::new()?;
            let me = unsafe { windows_sys::Win32::System::Threading::GetCurrentProcess() };
            job.assign(me as _)?;
            Ok(job)
        };
        match attach() {
            // O handle fica aberto até o processo terminar; aí o Windows fecha e mata os filhos.
            Ok(job) => std::mem::forget(job),
            Err(e) => eprintln!("aviso: {e}"),
        }
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use std::os::windows::io::AsRawHandle;
    use std::time::{Duration, Instant};

    #[test]
    fn job_mata_o_filho_quando_fecha() {
        let job = KillOnCloseJob::new().unwrap();
        let mut child = std::process::Command::new("ping").args(["-n", "30", "127.0.0.1"]).spawn().unwrap();
        job.assign(child.as_raw_handle()).unwrap();
        drop(job);
        let started = Instant::now();
        while child.try_wait().unwrap().is_none() {
            assert!(started.elapsed() < Duration::from_secs(5), "o processo filho continuou vivo");
            std::thread::sleep(Duration::from_millis(50));
        }
    }
}
