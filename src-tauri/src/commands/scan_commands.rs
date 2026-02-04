use crate::models::{ScanResult, ScanHistoryItem, ScanSummary};
use crate::services::ScanService;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

/// Executa uma verificação rápida
#[tauri::command]
pub async fn quick_scan() -> Result<ScanResult, String> {
    ScanService::quick_scan().await
}

/// Executa uma verificação completa
#[tauri::command]
pub async fn full_scan() -> Result<ScanResult, String> {
    ScanService::full_scan().await
}

/// Executa uma verificação personalizada
#[tauri::command]
pub async fn custom_scan(path: String) -> Result<ScanResult, String> {
    ScanService::custom_scan(path).await
}

/// Cancela uma verificação em andamento
#[tauri::command]
pub async fn cancel_scan() -> Result<String, String> {
    ScanService::cancel_scan().await
}

/// Obtém o histórico de verificações
#[tauri::command]
pub fn get_scan_history() -> Result<Vec<ScanHistoryItem>, String> {
    ScanService::get_history()
}

/// Obtém o resumo do último scan do Defender
#[tauri::command]
pub fn get_last_scan_summary(scan_type: String) -> Result<ScanSummary, String> {
    ScanService::get_last_scan_summary(scan_type)
}

/// Abre seletor de pasta
#[tauri::command]
pub async fn select_folder(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Option<FilePath>>();
    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });

    let folder = rx.await.map_err(|_| "Falha ao receber pasta selecionada".to_string())?;

    Ok(folder.map(|path| match path {
        FilePath::Path(path) => path.to_string_lossy().to_string(),
        FilePath::Url(url) => url.to_string(),
    }))
}
