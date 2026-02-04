use crate::models::DefenderStatus;
use crate::services::DefenderStatusService;

/// Obtém o status atual do Windows Defender
#[tauri::command]
pub async fn get_defender_status() -> Result<DefenderStatus, String> {
    tauri::async_runtime::spawn_blocking(|| DefenderStatusService::get_status())
        .await
        .map_err(|e| format!("Erro ao executar comando: {}", e))?
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

