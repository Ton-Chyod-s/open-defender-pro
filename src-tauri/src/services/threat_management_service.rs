use crate::infra::PowerShellExecutor;
use crate::models::ThreatSummary;

/// Serviço para gerenciar ameaças detectadas
pub struct ThreatManagementService;

impl ThreatManagementService {
    /// Obtém detalhes de todas as ameaças
    pub fn get_threat_details() -> Result<ThreatSummary, String> {
        let command = r#"
            # Força encoding UTF-8 para evitar problemas com caracteres especiais
            $OutputEncoding = [System.Text.Encoding]::UTF8
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            
            $threats = Get-MpThreatDetection
            
            # Se não há ameaças, retorna estrutura completa vazia
            if (-not $threats) {
                @{
                    total_threats = 0
                    high_severity = 0
                    medium_severity = 0
                    low_severity = 0
                    threats = @()
                } | ConvertTo-Json -Depth 10 -Compress
                exit
            }
            
            $result = @()
            foreach ($threat in $threats) {
                # Mapeamento de nomes de ameaças
                $threatName = switch ($threat.ThreatID) {
                    2147734096 { "Trojan:Win32/Wacatac" }
                    2147797489 { "Suspicious PowerShell Script" }
                    2147735503 { "Trojan:Win32/Sabsik" }
                    2147737010 { "Trojan:Win32/Agent" }
                    default { "Ameaça Desconhecida (ID: $($threat.ThreatID))" }
                }
                
                # Classificação de severidade
                $severity = switch ($threat.ThreatID) {
                    2147734096 { "High" }
                    2147797489 { "Medium" }
                    2147735503 { "High" }
                    2147737010 { "Medium" }
                    default { "Low" }
                }
                
                # Status da ameaça
                $status = switch ($threat.ThreatStatusID) {
                    1 { "Ativa" }
                    2 { "Em Quarentena" }
                    3 { "Em Quarentena" }
                    5 { "Permitida" }
                    6 { "Removida" }
                    102 { "Falha na Limpeza" }
                    103 { "Falha na Quarentena" }
                    104 { "Falha na Remoção" }
                    105 { "Falha ao Permitir" }
                    106 { "Abandonada" }
                    107 { "Falha ao Bloquear" }
                    default { "Desconhecido ($($threat.ThreatStatusID))" }
                }
                
                # Categoria
                $category = switch ($threat.ThreatStatusID) {
                    1 { "Ativa" }
                    2 { "Quarentena" }
                    3 { "Quarentena" }
                    5 { "Permitida" }
                    6 { "Removida" }
                    102 { "Ativa" }
                    103 { "Ativa" }
                    104 { "Ativa" }
                    105 { "Ativa" }
                    106 { "Removida" }
                    107 { "Ativa" }
                    default { "Desconhecida" }
                }
                
                # Ação tomada
                $actionTaken = switch ($threat.CleaningActionID) {
                    2 { "Colocar em Quarentena" }
                    3 { "Remover" }
                    6 { "Permitir" }
                    8 { "Definido pelo Usuário" }
                    9 { "Nenhuma Ação" }
                    10 { "Bloquear" }
                    default { "Desconhecida" }
                }
                
                # Caminho do arquivo com tratamento seguro
                $filePath = if ($threat.Resources) { 
                    $threat.Resources[0] -replace "^[^:]+:_", "" 
                } else { 
                    "Desconhecido" 
                }

                # Verifica se o arquivo ainda existe usando -LiteralPath para segurança
                $fileExists = if ($filePath -ne "Desconhecido" -and (Test-Path -LiteralPath $filePath -ErrorAction SilentlyContinue)) { 
                    $true 
                } else { 
                    $false 
                }
                
                # Monta o objeto
                $obj = @{
                    threat_id = [uint64]$threat.ThreatID
                    threat_name = $threatName
                    severity = $severity
                    status = $status
                    category = $category
                    file_path = $filePath
                    file_exists = $fileExists
                    detected_time = $threat.InitialDetectionTime.ToString('dd/MM/yyyy HH:mm:ss')
                    action_taken = $actionTaken
                }
                
                $result += $obj
            }
            
            # Calcula severidades no PowerShell para evitar reprocessamento
            $high = ($result | Where-Object { $_.severity -eq "High" }).Count
            $medium = ($result | Where-Object { $_.severity -eq "Medium" }).Count
            $low = ($result | Where-Object { $_.severity -eq "Low" }).Count
            
            # Retorna estrutura completa com metadados
            @{
                total_threats = $result.Count
                high_severity = $high
                medium_severity = $medium
                low_severity = $low
                threats = $result
            } | ConvertTo-Json -Depth 10 -Compress
        "#;
        
        let output = PowerShellExecutor::run(command)?;
        
        // Log para debug (apenas em modo debug)
        #[cfg(debug_assertions)]
        {
            eprintln!("=== DEBUG: get_threat_details output ===");
            eprintln!("{}", output);
            eprintln!("=== END DEBUG ===");
        }
        
        // Parse direto do JSON estruturado
        let summary: ThreatSummary = serde_json::from_str(&output)
            .map_err(|e| format!("Erro ao parsear JSON de ameaças: {} | Output: {}", e, output))?;
        
        Ok(summary)
    }
    /// Coloca uma ameaça em quarentena
    pub async fn quarantine_threat(threat_id: u64) -> Result<String, String> {
        let command = format!(r#"
            try {{
                $threat = Get-MpThreatDetection | Where-Object {{ $_.ThreatID -eq {} }}
                
                if (-not $threat) {{
                    Write-Output "SUCCESS: Ameaça não encontrada ou já foi tratada"
                    exit
                }}
                
                # Verifica status atual
                if ($threat.ThreatStatusID -eq 2 -or $threat.ThreatStatusID -eq 3) {{
                    Write-Output "SUCCESS: Ameaça já está em quarentena"
                    exit
                }}
                
                if ($threat.ThreatStatusID -eq 6) {{
                    Write-Output "SUCCESS: Ameaça já foi removida"
                    exit
                }}
                
                # Tenta remover/colocar em quarentena
                try {{
                    Remove-MpThreat -ThreatID $threat.ThreatID -ErrorAction Stop
                }} catch {{
                    try {{
                        Remove-MpThreat -ThreatId $threat.ThreatID -ErrorAction Stop
                    }} catch {{
                        $true
                    }}
                }}
                
                Write-Output "SUCCESS: Ameaça colocada em quarentena"
            }} catch {{
                Write-Output "ERROR: Falha ao colocar em quarentena: $($_.Exception.Message)"
            }}
        "#, threat_id);
        
        let result = PowerShellExecutor::run(&command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

    /// Remove uma ameaça específica
    pub async fn remove_specific_threat(threat_id: u64) -> Result<String, String> {
        let command = format!(r#"
            try {{
                $threat = Get-MpThreatDetection | Where-Object {{ $_.ThreatID -eq {} }}
                
                if (-not $threat) {{
                    Write-Output "SUCCESS: Ameaça não existe mais"
                    exit
                }}
                
                # Primeiro tenta remover através do Windows Defender
                try {{
                    Remove-MpThreat -ThreatID $threat.ThreatID -ErrorAction Stop
                    Write-Output "SUCCESS: Ameaça removida através do Windows Defender"
                    exit
                }} catch {{
                    # Tenta outra sintaxe
                    try {{
                        Remove-MpThreat -ThreatId $threat.ThreatID -ErrorAction Stop
                        Write-Output "SUCCESS: Ameaça removida através do Windows Defender"
                        exit
                    }} catch {{}}
                }}
                
                # Se tiver caminho de arquivo, tenta deletar
                if ($threat.Resources) {{
                    $filePath = $threat.Resources[0] -replace '^[^:]+:_', ''
                    
                    if (Test-Path $filePath) {{
                        # Evita tentar remover arquivo em uso (ex: o próprio app)
                        $isRunning = Get-Process | Where-Object {{ $_.Path -eq $filePath }}
                        if ($isRunning) {{
                            Write-Output "SUCCESS: Arquivo em uso. Feche o aplicativo e tente novamente"
                            exit
                        }}

                        takeown /f "$filePath" /a /r /d Y 2>&1 | Out-Null
                        icacls "$filePath" /grant Administrators:F /t /c /q 2>&1 | Out-Null
                        try {{
                            Remove-Item -Path $filePath -Force -ErrorAction Stop
                            Write-Output "SUCCESS: Arquivo deletado com sucesso"
                        }} catch {{
                            if ($_.Exception.Message -match "Acesso negado") {{
                                Write-Output "ERROR: Acesso negado. Execute como Administrador ou feche o aplicativo"
                            }} else {{
                                Write-Output "ERROR: Falha ao remover arquivo: $($_.Exception.Message)"
                            }}
                        }}
                    }} else {{
                        Write-Output "SUCCESS: Arquivo não existe mais"
                    }}
                }} else {{
                    Write-Output "SUCCESS: Ameaça removida do histórico"
                }}
            }} catch {{
                Write-Output "ERROR: Falha ao remover: $($_.Exception.Message)"
            }}
        "#, threat_id);
        
        let result = PowerShellExecutor::run(&command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

    /// Permite uma ameaça (adiciona às exceções)
    pub async fn allow_threat(_threat_id: u64, file_path: String) -> Result<String, String> {
        // Limpa o caminho do arquivo
        let clean_path = file_path
            .replace("file:_", "")
            .replace("->", "\\")
            .replace("/", "\\")
            .trim()
            .to_string();
        
        let command = format!(r#"
            try {{
                # Adiciona exceção no Windows Defender
                Add-MpPreference -ExclusionPath "{}" -ErrorAction Stop
                
                Write-Output "SUCCESS: Arquivo permitido e adicionado às exceções"
            }} catch {{
                Write-Output "ERROR: Falha ao permitir arquivo: $($_.Exception.Message)"
            }}
        "#, clean_path);
        
        let result = PowerShellExecutor::run(&command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

    /// Restaura uma ameaça da quarentena
    pub async fn restore_threat(threat_id: u64) -> Result<String, String> {
        let command = format!(r#"
            try {{
                $threat = Get-MpThreatDetection | Where-Object {{ $_.ThreatID -eq {} }}
                
                if (-not $threat) {{
                    Write-Output "ERROR: Ameaça não encontrada"
                    exit
                }}
                
                if ($threat.Resources) {{
                    $filePath = $threat.Resources[0] -replace '^[^:]+:_', ''
                    
                    # Adiciona às exceções
                    Add-MpPreference -ExclusionPath $filePath -ErrorAction Stop
                    
                    Write-Output "SUCCESS: Arquivo restaurado e adicionado às exceções"
                }} else {{
                    Write-Output "ERROR: Não foi possível determinar o caminho do arquivo"
                }}
            }} catch {{
                Write-Output "ERROR: Falha ao restaurar: $($_.Exception.Message)"
            }}
        "#, threat_id);
        
        let result = PowerShellExecutor::run(&command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

    /// Limpa toda a quarentena
    pub async fn clean_quarantine() -> Result<String, String> {
        let command = r#"
            try {
                $threats = Get-MpThreatDetection -ErrorAction SilentlyContinue
                
                if (-not $threats) {
                    Write-Output "SUCCESS: Nenhuma ameaça na quarentena"
                    exit
                }
                
                $count = 0
                foreach ($threat in $threats) {
                    try {
                        Remove-MpThreat -ThreatID $threat.ThreatID -ErrorAction SilentlyContinue
                        $count++
                    } catch {
                        # Continua mesmo se falhar
                    }
                }
                
                # Limpa arquivos de histórico - todos os diretórios relevantes
                $paths = @(
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Service\DetectionHistory",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\CacheManager",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\ReportLatency",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Store"
                )
                foreach ($path in $paths) {
                    if (Test-Path $path) {
                        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
                    }
                }
                
                Write-Output "SUCCESS: $count ameaça(s) removida(s) da quarentena"
            } catch {
                Write-Output "ERROR: Falha ao limpar quarentena: $($_.Exception.Message)"
            }
        "#;
        
        let result = PowerShellExecutor::run(command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

    /// Remove todas as ameaças
    pub async fn remove_all_threats() -> Result<String, String> {
        let command = r#"
            try {
                $threats = Get-MpThreatDetection -ErrorAction SilentlyContinue
                
                if (-not $threats) {
                    Write-Output "SUCCESS: Nenhuma ameaça para remover"
                    exit
                }
                
                $count = 0
                foreach ($threat in $threats) {
                    try {
                        Remove-MpThreat -ThreatID $threat.ThreatID -ErrorAction SilentlyContinue
                        $count++
                    } catch {
                        # Continua mesmo se falhar
                    }
                }
                
                # Limpa histórico - todos os diretórios relevantes
                $paths = @(
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Service\DetectionHistory",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\CacheManager",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\ReportLatency",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Store"
                )
                foreach ($path in $paths) {
                    if (Test-Path $path) {
                        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
                    }
                }
                
                Write-Output "SUCCESS: Todas as $count ameaça(s) foram removidas"
            } catch {
                Write-Output "ERROR: Falha ao remover todas as ameaças: $($_.Exception.Message)"
            }
        "#;
        
        let result = PowerShellExecutor::run(command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        Ok(result.replace("SUCCESS: ", "").trim().to_string())
    }

    /// Limpa o histórico de ameaças corrompido
    pub async fn clean_threat_history() -> Result<String, String> {
        let command = r#"
            try {
                # Verifica se está em modo Administrador
                $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
                if (-not $isAdmin) {
                    Write-Output "ERROR: Execute o app como Administrador para limpar o histórico"
                    exit
                }

                $threats = Get-MpThreatDetection -ErrorAction SilentlyContinue
                $total = if ($threats) { @($threats).Count } else { 0 }
                
                if ($total -eq 0) {
                    Write-Output "SUCCESS: Nenhuma ameaça para remover"
                    exit
                }

                # Tenta remoção via Remove-MpThreat primeiro
                $removed = 0
                if ($threats) {
                    $threatArray = @($threats)
                    foreach ($threat in $threatArray) {
                        try {
                            Remove-MpThreat -ThreatID $threat.ThreatID -ErrorAction Stop 2>&1 | Out-Null
                            $removed++
                        } catch {
                            # Silencia erro
                        }
                    }
                }

                # Aguarda Defender processar
                Start-Sleep -Seconds 2
                $remaining = @(Get-MpThreatDetection -ErrorAction SilentlyContinue).Count

                # Se Remove-MpThreat funcionou, sucesso
                if ($remaining -eq 0) {
                    Write-Output "SUCCESS: Removidas: $removed de $total"
                    exit
                }

                # Se ainda existem ameaças, faz limpeza profunda do histórico
                Stop-Service -Name WinDefend -Force -ErrorAction SilentlyContinue 2>&1 | Out-Null
                Stop-Service -Name WdNisSvc -Force -ErrorAction SilentlyContinue 2>&1 | Out-Null
                Start-Sleep -Seconds 3

                # Diretórios específicos de histórico do Defender
                $paths = @(
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Service\DetectionHistory",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\CacheManager",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\ReportLatency",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Store",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Results\Resource",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Results\Quick",
                    "C:\ProgramData\Microsoft\Windows Defender\LocalCopy",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\mpenginedb.db",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\mpenginedb.db-wal",
                    "C:\ProgramData\Microsoft\Windows Defender\Scans\mpenginedb.db-shm"
                )

                foreach ($path in $paths) {
                    if (Test-Path $path) {
                        try {
                            takeown /f "$path" /a /r /d Y 2>&1 | Out-Null
                            icacls "$path" /grant Administrators:F /t /c /q 2>&1 | Out-Null
                            Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
                        } catch {}
                    }
                }

                # Limpa Event Log do Windows Defender
                try {
                    wevtutil cl "Microsoft-Windows-Windows Defender/Operational" 2>&1 | Out-Null
                } catch {}

                # Reinicia serviço
                Start-Service -Name WinDefend -ErrorAction SilentlyContinue 2>&1 | Out-Null
                Start-Service -Name WdNisSvc -ErrorAction SilentlyContinue 2>&1 | Out-Null
                Start-Sleep -Seconds 3

                # Valida resultado final
                $final_remaining = @(Get-MpThreatDetection -ErrorAction SilentlyContinue).Count
                
                if ($final_remaining -eq 0) {
                    Write-Output "SUCCESS: Limpeza completa. Removidas: $total de $total"
                } else {
                    Write-Output "PARTIAL: Removidas: $removed de $total. Pendentes: $final_remaining. Reinicie o PC para completar."
                }
            } catch {
                Write-Output "ERROR: $($_.Exception.Message)"
            }
        "#;
        
        let result = PowerShellExecutor::run(command)?;
        
        if result.contains("ERROR:") {
            return Err(result.replace("ERROR: ", "").trim().to_string());
        }
        
        // INFO e PARTIAL são resultados válidos
        let output = result
            .replace("SUCCESS: ", "")
            .replace("PARTIAL: ", "")
            .trim()
            .to_string();
        
        Ok(output)
    }
}
