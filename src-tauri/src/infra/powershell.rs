use std::process::Command;

/// Executor de comandos PowerShell
pub struct PowerShellExecutor;

impl PowerShellExecutor {
    /// Executa um comando PowerShell e retorna o resultado
    pub fn run(command: &str) -> Result<String, String> {
        let full_command = format!(
            "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; {}",
            command
        );
        let output = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-ExecutionPolicy")
            .arg("Bypass")
            .arg("-Command")
            .arg(full_command)
            .output()
            .map_err(|e| format!("Erro ao executar PowerShell: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            Err(format!("STDERR: {} | STDOUT: {}", stderr, stdout))
        }
    }

    /// Verifica se há uma verificação em andamento (via Get-MpComputerStatus ou processo)
    pub fn check_scan_running() -> Result<bool, String> {
        let check_command = r#"
            # Verifica via processo MpCmdRun
            $mpProcess = Get-Process -Name "MpCmdRun" -ErrorAction SilentlyContinue
            if ($mpProcess) {
                "RUNNING"
            } else {
                # Verifica via status do Defender
                $status = Get-MpComputerStatus -ErrorAction SilentlyContinue
                if ($status -and $status.AntivirusScanInProgress) {
                    "RUNNING"
                } else {
                    "IDLE"
                }
            }
        "#;
        
        let result = Self::run(check_command)?;
        Ok(result.trim() == "RUNNING")
    }
}
