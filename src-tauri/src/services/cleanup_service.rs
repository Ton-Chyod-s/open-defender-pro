use crate::infra::PowerShellExecutor;
use crate::models::CleanResult;

/// Serviço para operações de limpeza do sistema
pub struct CleanupService;

impl CleanupService {
    /// Limpa arquivos temporários do sistema
    pub async fn clean_temp_files() -> Result<CleanResult, String> {
        let command = r#"
            try {
                $tempFolders = @(
                    "$env:TEMP\*",
                    "$env:WINDIR\Temp\*",
                    "$env:LOCALAPPDATA\Temp\*"
                )
                
                $totalDeleted = 0
                foreach ($folder in $tempFolders) {
                    try {
                        $items = Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
                        $count = ($items | Measure-Object).Count
                        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
                        $totalDeleted += $count
                    } catch {
                        # Continua mesmo se falhar em alguma pasta
                    }
                }
                
                Write-Output $totalDeleted
            } catch {
                Write-Output "0"
            }
        "#;
        
        let output = PowerShellExecutor::run(command)?;
        let files_deleted: u32 = output.trim().parse().unwrap_or(0);
        
        Ok(CleanResult { files_deleted })
    }
}
