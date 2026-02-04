use crate::models::DefenderStatus;
use crate::services::DefenderStatusService;

/// Obtém o status atual do Windows Defender
#[tauri::command]
pub fn get_defender_status() -> Result<DefenderStatus, String> {
    DefenderStatusService::get_status()
}

/// Atualiza as definições de vírus
#[tauri::command]
pub async fn update_definitions() -> Result<String, String> {
    DefenderStatusService::update_definitions().await
}

/// Atualiza a detecção de ameaças
#[tauri::command]
pub async fn refresh_threat_detection() -> Result<String, String> {
    DefenderStatusService::refresh_detection().await
}
