#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Módulos da aplicação
mod commands;
mod models;
mod services;
mod infra;

// Importa todos os comandos
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // ===== Status e Configurações =====
            get_defender_status,
            update_definitions,
            refresh_threat_detection,
            
            // ===== Verificações (Scans) =====
            scan_system,
            quick_scan,
            full_scan,
            custom_scan,
            cancel_scan,
            start_quick_scan,
            start_full_scan,
            is_scan_running,
            get_scan_history,
            get_last_scan_summary,
            select_folder,
            
            // ===== Gerenciamento de Ameaças =====
            get_threat_details,
            quarantine_threat,
            remove_specific_threat,
            allow_threat,
            restore_threat,
            clean_quarantine,
            remove_all_threats,
            clean_threat_history,
            
            // ===== Limpeza =====
            clean_temp_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
