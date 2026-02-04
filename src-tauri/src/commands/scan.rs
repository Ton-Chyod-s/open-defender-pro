use crate::services::ScanService;
use crate::models::ScanResult;

/// Executa uma verificação de sistema personalizada
#[tauri::command]
pub async fn scan_system() -> Result<ScanResult, String> {
  ScanService::quick_scan().await
}
