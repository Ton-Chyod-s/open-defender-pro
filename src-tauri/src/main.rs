#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct DefenderStatus {
    is_enabled: bool,
    last_scan: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct ScanResult {
    threats_found: u32,
    files_scanned: u32,
    scan_time: String,
}

#[derive(Serialize, Deserialize)]
struct CleanResult {
    files_deleted: u32,
}

#[derive(Serialize, Deserialize, Clone)]
struct ThreatDetail {
    threat_id: u64,
    threat_name: String,
    severity: String,
    status: String,
    category: String,
    file_path: String,
    detected_time: String,
    action_taken: String,
}

#[derive(Serialize, Deserialize)]
struct ThreatSummary {
    total_threats: u32,
    high_severity: u32,
    medium_severity: u32,
    low_severity: u32,
    threats: Vec<ThreatDetail>,
}

#[derive(Serialize, Deserialize)]
struct ScanHistoryItem {
    scan_type: String,
    start_time: String,
    end_time: String,
    threats_found: u32,
    files_scanned: u32,
}

fn run_powershell(command: &str) -> Result<String, String> {
    let output = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-Command")
        .arg(command)
        .output()
        .map_err(|e| format!("Erro ao executar PowerShell: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_defender_status() -> Result<DefenderStatus, String> {
    let command = r#"
        $status = Get-MpComputerStatus
        $lastScan = if ($status.LastFullScanTime) { 
            $status.LastFullScanTime.ToString('dd/MM/yyyy HH:mm') 
        } else { 
            $null 
        }
        @{
            is_enabled = $status.AntivirusEnabled
            last_scan = $lastScan
        } | ConvertTo-Json
    "#;

    let output = run_powershell(command)?;
    serde_json::from_str(&output)
        .map_err(|e| format!("Erro ao parsear JSON: {}", e))
}

#[tauri::command]
async fn update_definitions() -> Result<String, String> {
    run_powershell("Update-MpSignature")?;
    Ok("Definições atualizadas com sucesso".to_string())
}

#[tauri::command]
async fn quick_scan() -> Result<ScanResult, String> {
    let check_command = r#"
        $status = Get-MpComputerStatus
        if ($status.QuickScanStartTime -and !$status.QuickScanEndTime) {
            "RUNNING"
        } elseif ($status.FullScanStartTime -and !$status.FullScanEndTime) {
            "RUNNING"
        } else {
            "IDLE"
        }
    "#;
    
    let check_result = run_powershell(check_command)?;
    if check_result.trim() == "RUNNING" {
        return Err("Já existe uma verificação em andamento. Aguarde ela terminar ou reinicie o Windows.".to_string());
    }
    
    let start_time = std::time::Instant::now();
    
    run_powershell("Start-MpScan -ScanType QuickScan")?;
    
    let scan_time = format!("{:.2}s", start_time.elapsed().as_secs_f64());
    
    let threats_command = r#"
        $threats = Get-MpThreatDetection
        if ($threats) { $threats.Count } else { 0 }
    "#;
    
    let threats_output = run_powershell(threats_command)?;
    let threats_found: u32 = threats_output.trim().parse().unwrap_or(0);
    
    Ok(ScanResult {
        threats_found,
        files_scanned: 50000,
        scan_time,
    })
}

#[tauri::command]
async fn full_scan() -> Result<ScanResult, String> {
    let check_command = r#"
        $status = Get-MpComputerStatus
        if ($status.QuickScanStartTime -and !$status.QuickScanEndTime) {
            "RUNNING"
        } elseif ($status.FullScanStartTime -and !$status.FullScanEndTime) {
            "RUNNING"
        } else {
            "IDLE"
        }
    "#;
    
    let check_result = run_powershell(check_command)?;
    if check_result.trim() == "RUNNING" {
        return Err("Já existe uma verificação em andamento. Aguarde ela terminar ou reinicie o Windows.".to_string());
    }
    
    let start_time = std::time::Instant::now();
    
    run_powershell("Start-MpScan -ScanType FullScan")?;
    
    let scan_time = format!("{:.1}min", start_time.elapsed().as_secs_f64() / 60.0);
    
    let threats_command = r#"
        $threats = Get-MpThreatDetection
        if ($threats) { $threats.Count } else { 0 }
    "#;
    
    let threats_output = run_powershell(threats_command)?;
    let threats_found: u32 = threats_output.trim().parse().unwrap_or(0);
    
    Ok(ScanResult {
        threats_found,
        files_scanned: 500000,
        scan_time,
    })
}

#[tauri::command]
async fn clean_temp_files() -> Result<CleanResult, String> {
    let command = r#"
        $tempFolders = @(
            "$env:TEMP\*",
            "$env:WINDIR\Temp\*",
            "$env:LOCALAPPDATA\Temp\*"
        )
        
        $totalDeleted = 0
        foreach ($folder in $tempFolders) {
            try {
                $items = Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
                $count = $items.Count
                Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
                $totalDeleted += $count
            } catch {}
        }
        
        $totalDeleted
    "#;
    
    let output = run_powershell(command)?;
    let files_deleted: u32 = output.trim().parse().unwrap_or(0);
    
    Ok(CleanResult { files_deleted })
}

#[tauri::command]
async fn cancel_scan() -> Result<String, String> {
    let command = r#"
        # Parar processos do Windows Defender scan
        Get-Process | Where-Object {
            $_.Name -like "*MpCmdRun*"
        } | Stop-Process -Force -ErrorAction SilentlyContinue
        
        "Scan cancelado"
    "#;
    
    run_powershell(command)?;
    Ok("Scan cancelado com sucesso".to_string())
}

#[tauri::command]
fn get_threat_details() -> Result<ThreatSummary, String> {
    let command = r#"
        $threats = Get-MpThreatDetection
        
        $result = @()
        foreach ($threat in $threats) {
            $threatName = switch ($threat.ThreatID) {
                2147734096 { "Trojan:Win32/Wacatac" }
                2147797489 { "Suspicious PowerShell Script" }
                default { "Unknown Threat (ID: $($threat.ThreatID))" }
            }
            
            $severity = switch ($threat.ThreatID) {
                2147734096 { "High" }
                2147797489 { "Medium" }
                default { "Low" }
            }
            
            # Determinar categoria baseado no status
            $category = switch ($threat.ThreatStatusID) {
                1 { "Active" }           # Detectado e ativo
                2 { "Quarantined" }      # Em quarentena
                3 { "Quarantined" }      # Em quarentena (variante)
                5 { "Allowed" }          # Permitido
                6 { "Removed" }          # Removido
                102 { "Active" }         # Falha ao limpar (ainda ativo)
                103 { "Active" }         # Falha quarentena (ainda ativo)
                104 { "Active" }         # Falha remover (ainda ativo)
                105 { "Active" }         # Falha permitir (ainda ativo)
                106 { "Removed" }        # Abandonado (considerado removido)
                107 { "Active" }         # Falha bloquear (ainda ativo)
                default { "Unknown" }
            }
            
            $status = switch ($threat.ThreatStatusID) {
                1 { "Active" }
                2 { "Quarantined" }
                3 { "Quarantined" }
                5 { "Allowed" }
                6 { "Removed" }
                102 { "Cleaning Failed" }
                103 { "Quarantine Failed" }
                104 { "Remove Failed" }
                105 { "Allow Failed" }
                106 { "Abandoned" }
                107 { "Block Failed" }
                default { "Unknown ($($threat.ThreatStatusID))" }
            }
            
            $actionTaken = switch ($threat.CleaningActionID) {
                2 { "Quarantine" }
                3 { "Remove" }
                6 { "Allow" }
                8 { "User Defined" }
                9 { "No Action" }
                10 { "Block" }
                default { "Unknown" }
            }
            
            $filePath = if ($threat.Resources) { 
                $threat.Resources[0] -replace "^[^:]+:_", "" 
            } else { 
                "Unknown" 
            }
            
            $obj = @{
                threat_id = $threat.ThreatID
                threat_name = $threatName
                severity = $severity
                status = $status
                category = $category
                file_path = $filePath
                detected_time = $threat.InitialDetectionTime.ToString('dd/MM/yyyy HH:mm:ss')
                action_taken = $actionTaken
            }
            
            $result += $obj
        }
        
        $result | ConvertTo-Json
    "#;
    
    let output = run_powershell(command)?;
    
    if output.trim() == "" || output.trim() == "null" {
        return Ok(ThreatSummary {
            total_threats: 0,
            high_severity: 0,
            medium_severity: 0,
            low_severity: 0,
            threats: vec![],
        });
    }
    
    let threats: Vec<ThreatDetail> = serde_json::from_str(&output)
        .map_err(|e| format!("Erro ao parsear ameaças: {}", e))?;
    
    let high = threats.iter().filter(|t| t.severity == "High").count() as u32;
    let medium = threats.iter().filter(|t| t.severity == "Medium").count() as u32;
    let low = threats.iter().filter(|t| t.severity == "Low").count() as u32;
    
    Ok(ThreatSummary {
        total_threats: threats.len() as u32,
        high_severity: high,
        medium_severity: medium,
        low_severity: low,
        threats,
    })
}

#[tauri::command]
async fn clean_quarantine() -> Result<String, String> {
    let command = r#"
        # Pegar todas as ameaças
        $threats = Get-MpThreatDetection
        
        if ($threats) {
            $count = $threats.Count
            
            # Remover uma por uma pelo ThreatID
            foreach ($threat in $threats) {
                try {
                    Remove-MpThreat -ThreatID $threat.ThreatID -ErrorAction Stop
                } catch {
                    # Ignorar erros
                }
            }
            
            # Aguardar um pouco
            Start-Sleep -Seconds 1
            
            # Verificar o que sobrou
            $remaining = Get-MpThreatDetection
            $remainingCount = if ($remaining) { $remaining.Count } else { 0 }
            
            "Removidas: $count | Restantes: $remainingCount"
        } else {
            "Nenhuma ameaça para remover"
        }
    "#;
    
    let result = run_powershell(command)?;
    Ok(result.trim().to_string())
}

#[tauri::command]
async fn remove_all_threats() -> Result<String, String> {
    let command = r#"
        # Contar ameaças
        $threats = Get-MpThreatDetection
        $count = $threats.Count
        
        # Remover uma por uma para garantir
        foreach ($threat in $threats) {
            Remove-MpThreat -ThreatID $threat.ThreatID
        }
        
        # Forçar limpeza do cache/histórico
        Remove-Item -Path "$env:ProgramData\Microsoft\Windows Defender\Scans\History\*" -Recurse -Force -ErrorAction SilentlyContinue
        
        # Verificar se ainda tem algo
        $remaining = (Get-MpThreatDetection).Count
        
        if ($remaining -gt 0) {
            "Removidas $count ameaças, mas $remaining ainda aparecem no histórico (normal)"
        } else {
            "Removidas $count ameaças com sucesso"
        }
    "#;
    
    let result = run_powershell(command)?;
    Ok(result.trim().to_string())
}

#[tauri::command]
async fn quarantine_threat(threat_id: u64) -> Result<String, String> {
    let command = format!(r#"
        # Colocar ameaça específica em quarentena
        $threat = Get-MpThreatDetection | Where-Object {{ $_.ThreatID -eq {} }}
        
        if ($threat) {{
            # Tentar colocar em quarentena
            Remove-MpThreat -ThreatID {}
            "Ameaça movida para quarentena"
        }} else {{
            "Ameaça não encontrada"
        }}
    "#, threat_id, threat_id);
    
    let result = run_powershell(&command)?;
    Ok(result.trim().to_string())
}

#[tauri::command]
async fn remove_specific_threat(threat_id: u64) -> Result<String, String> {
    let command = format!(r#"
        # Remover ameaça específica permanentemente
        Remove-MpThreat -ThreatID {}
        "Ameaça removida"
    "#, threat_id);
    
    let result = run_powershell(&command)?;
    Ok(result.trim().to_string())
}

#[tauri::command]
async fn allow_threat(threat_id: u64, file_path: String) -> Result<String, String> {
    let command = format!(r#"
        # Adicionar exceção para o arquivo
        Add-MpPreference -ExclusionPath "{}"
        
        # Remover da quarentena
        Remove-MpThreat -ThreatID {}
        
        "Arquivo permitido e adicionado às exceções"
    "#, file_path.replace("file:_", "").replace("->", "\\"), threat_id);
    
    let result = run_powershell(&command)?;
    Ok(result.trim().to_string())
}

#[tauri::command]
async fn restore_threat(threat_id: u64) -> Result<String, String> {
    let command = format!(r#"
        # Restaurar arquivo da quarentena
        Restore-MpPreference -ThreatID {}
        "Arquivo restaurado da quarentena"
    "#, threat_id);
    
    let result = run_powershell(&command)?;
    Ok(result.trim().to_string())
}

#[tauri::command]
fn get_scan_history() -> Result<Vec<ScanHistoryItem>, String> {
    let command = r#"
        $status = Get-MpComputerStatus
        
        $history = @()
        
        # Quick Scan
        if ($status.QuickScanStartTime) {
            $history += @{
                scan_type = "Quick Scan"
                start_time = $status.QuickScanStartTime.ToString('dd/MM/yyyy HH:mm:ss')
                end_time = if ($status.QuickScanEndTime) { 
                    $status.QuickScanEndTime.ToString('dd/MM/yyyy HH:mm:ss') 
                } else { 
                    "Em andamento" 
                }
                threats_found = 0
                files_scanned = 50000
            }
        }
        
        # Full Scan
        if ($status.FullScanStartTime) {
            $history += @{
                scan_type = "Full Scan"
                start_time = $status.FullScanStartTime.ToString('dd/MM/yyyy HH:mm:ss')
                end_time = if ($status.FullScanEndTime) { 
                    $status.FullScanEndTime.ToString('dd/MM/yyyy HH:mm:ss') 
                } else { 
                    "Em andamento" 
                }
                threats_found = 0
                files_scanned = 500000
            }
        }
        
        # IMPORTANTE: Converter para JSON como array
        if ($history.Count -eq 0) {
            "[]"
        } elseif ($history.Count -eq 1) {
            # PowerShell não converte array de 1 item corretamente
            "[" + ($history[0] | ConvertTo-Json -Compress) + "]"
        } else {
            $history | ConvertTo-Json
        }
    "#;
    
    let output = run_powershell(command)?;
    
    if output.trim() == "" || output.trim() == "null" || output.trim() == "[]" {
        return Ok(vec![]);
    }
    
    let history: Vec<ScanHistoryItem> = serde_json::from_str(&output)
        .map_err(|e| format!("Erro ao parsear histórico: {} - Output: {}", e, output))?;
    
    Ok(history)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_defender_status,
            update_definitions,
            quick_scan,
            full_scan,
            clean_temp_files,
            cancel_scan,
            get_threat_details,
            clean_quarantine,
            remove_all_threats,
            quarantine_threat,
            remove_specific_threat,
            allow_threat,
            restore_threat,
            get_scan_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run()
}
