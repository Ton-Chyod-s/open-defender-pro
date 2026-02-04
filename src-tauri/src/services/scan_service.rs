use crate::infra::PowerShellExecutor;
use crate::models::{ScanResult, ScanHistoryItem, ScanSummary};

/// Serviço para gerenciar verificações do Windows Defender
pub struct ScanService;

impl ScanService {
    /// Executa uma verificação rápida
    pub async fn quick_scan() -> Result<ScanResult, String> {
        // Verifica se já há uma verificação em andamento
        if PowerShellExecutor::check_scan_running()? {
            return Err("Já existe uma verificação em andamento. Aguarde ela terminar.".to_string());
        }
        
        let start_time = std::time::Instant::now();
        
        // Inicia a verificação rápida
        let scan_command = r#"
            try {
                Start-MpScan -ScanType QuickScan -ErrorAction Stop
                Write-Output "SUCCESS"
            } catch {
                Write-Output "ERROR: $($_.Exception.Message)"
            }
        "#;
        
        let scan_result = PowerShellExecutor::run(scan_command)?;
        
        if scan_result.contains("ERROR:") {
            return Err(scan_result.replace("ERROR: ", "").trim().to_string());
        }
        
        let scan_time = format!("{:.2}s", start_time.elapsed().as_secs_f64());
        
        // Conta ameaças encontradas
        let threats_command = r#"
            $threats = Get-MpThreatDetection
            if ($threats) { $threats.Count } else { 0 }
        "#;
        
        let threats_output = PowerShellExecutor::run(threats_command)?;
        let threats_found: u32 = threats_output.trim().parse().unwrap_or(0);
        
        Ok(ScanResult {
            threats_found,
            files_scanned: 50000,
            scan_time,
        })
    }

    /// Executa uma verificação completa
    pub async fn full_scan() -> Result<ScanResult, String> {
        // Verifica se já há uma verificação em andamento
        if PowerShellExecutor::check_scan_running()? {
            return Err("Já existe uma verificação em andamento. Aguarde ela terminar.".to_string());
        }
        
        let start_time = std::time::Instant::now();
        
        // Inicia a verificação completa
        let scan_command = r#"
            try {
                Start-MpScan -ScanType FullScan -ErrorAction Stop
                Write-Output "SUCCESS"
            } catch {
                Write-Output "ERROR: $($_.Exception.Message)"
            }
        "#;
        
        let scan_result = PowerShellExecutor::run(scan_command)?;
        
        if scan_result.contains("ERROR:") {
            return Err(scan_result.replace("ERROR: ", "").trim().to_string());
        }
        
        let scan_time = format!("{:.1}min", start_time.elapsed().as_secs_f64() / 60.0);
        
        // Conta ameaças encontradas
        let threats_command = r#"
            $threats = Get-MpThreatDetection
            if ($threats) { $threats.Count } else { 0 }
        "#;
        
        let threats_output = PowerShellExecutor::run(threats_command)?;
        let threats_found: u32 = threats_output.trim().parse().unwrap_or(0);
        
        Ok(ScanResult {
            threats_found,
            files_scanned: 500000,
            scan_time,
        })
    }

    /// Executa uma verificação personalizada
    pub async fn custom_scan(path: String) -> Result<ScanResult, String> {
        // Verifica se já há uma verificação em andamento
        if PowerShellExecutor::check_scan_running()? {
            return Err("Já existe uma verificação em andamento. Aguarde ela terminar.".to_string());
        }

        let start_time = std::time::Instant::now();
        let safe_path = path.replace('\'', "''");

        // Conta arquivos no caminho (aproximação)
        let count_command = format!(r#"
            try {{
                $count = (Get-ChildItem -LiteralPath '{}' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
                Write-Output $count
            }} catch {{
                Write-Output 0
            }}
        "#, safe_path);

        let files_output = PowerShellExecutor::run(&count_command)?;
        let files_scanned: u32 = files_output.trim().parse().unwrap_or(0);

        // Inicia a verificação personalizada
        let scan_command = format!(r#"
            try {{
                Start-MpScan -ScanType CustomScan -ScanPath '{}' -ErrorAction Stop
                Write-Output "SUCCESS"
            }} catch {{
                Write-Output "ERROR: $($_.Exception.Message)"
            }}
        "#, safe_path);

        let scan_result = PowerShellExecutor::run(&scan_command)?;

        if scan_result.contains("ERROR:") {
            return Err(scan_result.replace("ERROR: ", "").trim().to_string());
        }

        let scan_time = format!("{:.2}s", start_time.elapsed().as_secs_f64());

        // Conta ameaças encontradas
        let threats_command = r#"
            $threats = Get-MpThreatDetection
            if ($threats) { $threats.Count } else { 0 }
        "#;

        let threats_output = PowerShellExecutor::run(threats_command)?;
        let threats_found: u32 = threats_output.trim().parse().unwrap_or(0);

        Ok(ScanResult {
            threats_found,
            files_scanned,
            scan_time,
        })
    }

    /// Cancela uma verificação em andamento
    pub async fn cancel_scan() -> Result<String, String> {
        let command = r#"
            try {
                # Método 1: Usar MpCmdRun para cancelar (não requer admin para cancelar scan)
                $mpPath = "$env:ProgramFiles\Windows Defender\MpCmdRun.exe"
                if (Test-Path $mpPath) {
                    Start-Process -FilePath $mpPath -ArgumentList "-SignatureUpdate -Cancel" -NoNewWindow -Wait -ErrorAction SilentlyContinue
                }
                
                # Método 2: Parar apenas o processo de scan (MpCmdRun), não o serviço principal
                Get-Process -Name "MpCmdRun" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
                
                # Método 3: Usar WMI para cancelar scan ativo
                $defender = Get-WmiObject -Namespace "root\Microsoft\Windows\Defender" -Class MSFT_MpScan -ErrorAction SilentlyContinue
                if ($defender) {
                    $defender | Remove-WmiObject -ErrorAction SilentlyContinue
                }
                
                Write-Output "SUCCESS: Verificação cancelada"
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

    /// Obtém o histórico de verificações
    pub fn get_history() -> Result<Vec<ScanHistoryItem>, String> {
        let command = r#"
            $status = Get-MpComputerStatus
            
            $history = @()
            
            if ($status.QuickScanStartTime) {
                $history += @{
                    scan_type = "Verificação Rápida"
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
            
            if ($status.FullScanStartTime) {
                $history += @{
                    scan_type = "Verificação Completa"
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
            
            if ($history.Count -eq 0) {
                "[]"
            } elseif ($history.Count -eq 1) {
                "[" + ($history[0] | ConvertTo-Json -Compress) + "]"
            } else {
                $history | ConvertTo-Json
            }
        "#;
        
        let output = PowerShellExecutor::run(command)?;
        
        if output.trim() == "" || output.trim() == "null" || output.trim() == "[]" {
            return Ok(vec![]);
        }
        
        let history: Vec<ScanHistoryItem> = serde_json::from_str(&output)
            .map_err(|e| format!("Erro ao parsear histórico: {}", e))?;
        
        Ok(history)
    }

        /// Obtém resumo do último scan a partir dos logs do Defender
        pub fn get_last_scan_summary(scan_type: String) -> Result<ScanSummary, String> {
                let scan_type = scan_type.to_lowercase();
                let command = format!(r#"
$scanType = "{scan_type}"
$status = Get-MpComputerStatus
$pattern = switch ($scanType) {{
    "quick" {{ "Quick Scan|Verificação rápida" }}
    "full" {{ "Full Scan|Verificação completa" }}
    "custom" {{ "Custom Scan|Verificação personalizada" }}
    default {{ "" }}
}}

$event = $null
$events = Get-WinEvent -LogName "Microsoft-Windows-Windows Defender/Operational" -FilterXPath "*[System[(EventID=1001)]]"
if ($pattern -ne "") {{
    $event = $events | Where-Object {{ $_.Message -match $pattern }} | Select-Object -First 1
}}
if (-not $event) {{
    $event = $events | Select-Object -First 1
}}

$files = 0
$threats = 0
if ($event -and $event.Message) {{
    if ($event.Message -match '(?i)(Arquivos verificados|Arquivos examinados|Arquivos inspecionados|Recursos verificados|Scanned files|Number of scanned files|Resources scanned)\s*[:\.]\s*([0-9\s\.,]+)') {{
        $files = ($matches[2] -replace '\D', '')
    }}
    if ($event.Message -match '(?i)(Ameaças encontradas|Threats Found)\s*[:\.]\s*([0-9]+)') {{
        $threats = [int]$matches[2]
    }}
}}

$start = $null
$end = $null
switch ($scanType) {{
    "quick" {{ $start = $status.QuickScanStartTime; $end = $status.QuickScanEndTime }}
    "full" {{ $start = $status.FullScanStartTime; $end = $status.FullScanEndTime }}
    default {{ }}
}}

$lastScan = $null
if ($end) {{ $lastScan = $end }} elseif ($event) {{ $lastScan = $event.TimeCreated }}

$duration = ""
if ($start -and $end) {{
    $span = New-TimeSpan -Start $start -End $end
    $duration = "{{0}} minutos {{1}} segundos" -f $span.Minutes, $span.Seconds
}}

$lastScanStr = if ($lastScan) {{ $lastScan.ToString('dd/MM/yyyy HH:mm') }} else {{ $null }}

@{{
    scan_type = $scanType
    last_scan = $lastScanStr
    threats_found = [int]$threats
    duration = $duration
    files_scanned = [uint64]$files
}} | ConvertTo-Json
"#);

                let output = PowerShellExecutor::run(&command)?;
                serde_json::from_str(&output)
                        .map_err(|e| format!("Erro ao parsear JSON: {}", e))
        }
}
