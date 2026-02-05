use crate::models::{CleanResult, CleanupAnalysis};
use crate::services::CleanupService;

/// Analisa o que pode ser limpo no sistema
#[tauri::command]
pub fn analyze_cleanup() -> Result<CleanupAnalysis, String> {
    CleanupService::analyze()
}

/// Executa a limpeza das categorias selecionadas
#[tauri::command]
pub fn run_cleanup(categories: Vec<String>) -> Result<CleanResult, String> {
    CleanupService::clean(categories)
}
