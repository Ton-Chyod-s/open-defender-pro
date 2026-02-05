# Script para limpar histórico de ameaças do Windows Defender
# Execute como Administrador

# Verifica Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Execute este script como Administrador!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Limpeza de Historico do Windows Defender  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Conta ameacas iniciais
$initial = (Get-MpThreatDetection -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "Ameacas no historico: $initial" -ForegroundColor Yellow

if ($initial -eq 0) {
    Write-Host "Nenhuma ameaca para limpar!" -ForegroundColor Green
    Read-Host "Pressione Enter para sair"
    exit
}

# Tenta remover via API primeiro
Write-Host "`nTentando remover via Remove-MpThreat..." -ForegroundColor Yellow
$threats = Get-MpThreatDetection -ErrorAction SilentlyContinue
foreach ($t in $threats) {
    try {
        Remove-MpThreat -ThreatID $t.ThreatID -ErrorAction SilentlyContinue 2>&1 | Out-Null
    } catch {}
}
Start-Sleep -Seconds 2

$afterApi = (Get-MpThreatDetection -ErrorAction SilentlyContinue | Measure-Object).Count
if ($afterApi -eq 0) {
    Write-Host "Sucesso! Todas as ameacas foram removidas." -ForegroundColor Green
    Read-Host "Pressione Enter para sair"
    exit
}

Write-Host "Ainda restam $afterApi ameacas. Fazendo limpeza profunda..." -ForegroundColor Yellow

# Para os servicos do Defender
Write-Host "`nParando servicos do Windows Defender..." -ForegroundColor Yellow
Stop-Service WinDefend -Force -ErrorAction SilentlyContinue 2>&1 | Out-Null
Stop-Service WdNisSvc -Force -ErrorAction SilentlyContinue 2>&1 | Out-Null
Start-Sleep -Seconds 3

# Paths do historico
$paths = @(
    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Service\DetectionHistory",
    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\CacheManager",
    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\ReportLatency",
    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Store",
    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Results\Resource",
    "C:\ProgramData\Microsoft\Windows Defender\Scans\History\Results\Quick",
    "C:\ProgramData\Microsoft\Windows Defender\LocalCopy"
)

foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "Limpando: $p" -ForegroundColor Cyan
        try {
            takeown /f $p /a /r /d Y 2>&1 | Out-Null
            icacls $p /grant Administrators:F /t /c /q 2>&1 | Out-Null
            Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "  Falha ao limpar: $p" -ForegroundColor Red
        }
    }
}

# Limpa database do mpengine
$dbFiles = @(
    "C:\ProgramData\Microsoft\Windows Defender\Scans\mpenginedb.db",
    "C:\ProgramData\Microsoft\Windows Defender\Scans\mpenginedb.db-wal",
    "C:\ProgramData\Microsoft\Windows Defender\Scans\mpenginedb.db-shm"
)
foreach ($db in $dbFiles) {
    if (Test-Path $db) {
        try {
            Remove-Item -LiteralPath $db -Force -ErrorAction SilentlyContinue
            Write-Host "Removido: $db" -ForegroundColor Cyan
        } catch {}
    }
}

# Limpa Event Log
Write-Host "`nLimpando Event Log do Defender..." -ForegroundColor Yellow
try {
    wevtutil cl "Microsoft-Windows-Windows Defender/Operational" 2>&1 | Out-Null
} catch {}

Write-Host "`nReiniciando servicos do Windows Defender..." -ForegroundColor Yellow
Start-Service WinDefend -ErrorAction SilentlyContinue 2>&1 | Out-Null
Start-Service WdNisSvc -ErrorAction SilentlyContinue 2>&1 | Out-Null
Start-Sleep -Seconds 5

$count = (Get-MpThreatDetection -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Ameacas restantes: $count" -ForegroundColor $(if ($count -eq 0) { "Green" } else { "Yellow" })

if ($count -eq 0) {
    Write-Host "Historico limpo com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Algumas ameacas ainda permanecem." -ForegroundColor Yellow
    Write-Host "Isso pode ocorrer se o Tamper Protection esta ativo." -ForegroundColor Yellow
    Write-Host "Tente reiniciar o PC para completar a limpeza." -ForegroundColor Yellow
}

Read-Host "`nPressione Enter para sair"
