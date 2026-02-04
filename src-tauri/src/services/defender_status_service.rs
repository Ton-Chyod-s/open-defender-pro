use crate::infra::PowerShellExecutor;
use crate::models::DefenderStatus;

/// Serviço para gerenciar o status do Windows Defender
pub struct DefenderStatusService;

impl DefenderStatusService {
    /// Obtém o status atual do Windows Defender
    pub fn get_status() -> Result<DefenderStatus, String> {
        let command = r#"
            $status = Get-MpComputerStatus
            $quickEnd = $status.QuickScanEndTime
            $fullEnd = $status.FullScanEndTime

            $lastScanTime = $null
            if ($quickEnd -and $fullEnd) {
                $lastScanTime = if ($quickEnd -gt $fullEnd) { $quickEnd } else { $fullEnd }
            } elseif ($quickEnd) {
                $lastScanTime = $quickEnd
            } elseif ($fullEnd) {
                $lastScanTime = $fullEnd
            }

            $lastScan = if ($lastScanTime) { 
                $lastScanTime.ToString('dd/MM/yyyy HH:mm') 
            } else { 
                $null 
            }

            @{
                # RealTimeProtectionEnabled reflete o estado do toggle de proteção em tempo real
                is_enabled = $status.RealTimeProtectionEnabled
                last_scan = $lastScan
            } | ConvertTo-Json
        "#;

        let output = PowerShellExecutor::run(command)?;
        serde_json::from_str(&output)
            .map_err(|e| format!("Erro ao parsear JSON: {}", e))
    }

    /// Atualiza as definições de vírus
    pub async fn update_definitions() -> Result<String, String> {
        let command = r#"
            try {
                Update-MpSignature -ErrorAction Stop
                Write-Output "SUCCESS: Definições atualizadas com sucesso"
            } catch {
                Write-Output "ERROR: $($_.Exception.Message)"
            }
        "#;
        
        let result = PowerShellExecutor::run(command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

    /// Atualiza a detecção de ameaças
    pub async fn refresh_detection() -> Result<String, String> {
        let command = r#"
            try {
                Update-MpSignature -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 300
                Write-Output "SUCCESS: Status atualizado"
            } catch {
                Write-Output "ERROR: $($_.Exception.Message)"
            }
        "#;
        
        let result = PowerShellExecutor::run(command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

}
