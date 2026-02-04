use crate::models::CleanResult;
use crate::services::CleanupService;

/// Limpa arquivos temporários do sistema
#[tauri::command]
pub async fn clean_temp_files() -> Result<CleanResult, String> {
    CleanupService::clean_temp_files().await
}
