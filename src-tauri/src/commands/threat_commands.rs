use crate::models::ThreatSummary;
use crate::services::ThreatManagementService;

/// Obtém detalhes de todas as ameaças
#[tauri::command]
pub fn get_threat_details() -> Result<ThreatSummary, String> {
    ThreatManagementService::get_threat_details()
}

/// Coloca uma ameaça em quarentena
#[tauri::command]
pub async fn quarantine_threat(threat_id: u64) -> Result<String, String> {
    ThreatManagementService::quarantine_threat(threat_id).await
}

/// Remove uma ameaça específica
#[tauri::command]
pub async fn remove_specific_threat(threat_id: u64) -> Result<String, String> {
    ThreatManagementService::remove_specific_threat(threat_id).await
}

/// Permite uma ameaça (adiciona às exceções)
#[tauri::command]
pub async fn allow_threat(threat_id: u64, file_path: String) -> Result<String, String> {
    ThreatManagementService::allow_threat(threat_id, file_path).await
}

/// Restaura uma ameaça da quarentena
#[tauri::command]
pub async fn restore_threat(threat_id: u64) -> Result<String, String> {
    ThreatManagementService::restore_threat(threat_id).await
}

/// Limpa toda a quarentena
#[tauri::command]
pub async fn clean_quarantine() -> Result<String, String> {
    ThreatManagementService::clean_quarantine().await
}

/// Remove todas as ameaças
#[tauri::command]
pub async fn remove_all_threats() -> Result<String, String> {
    ThreatManagementService::remove_all_threats().await
}

/// Limpa o histórico de ameaças corrompido
#[tauri::command]
pub async fn clean_threat_history() -> Result<String, String> {
    ThreatManagementService::clean_threat_history().await
}
