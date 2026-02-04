use serde::{Deserialize, Serialize};

/// Status do Windows Defender
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DefenderStatus {
    pub is_enabled: bool,
    pub last_scan: Option<String>,
}

/// Resultado de uma verificação (scan)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScanResult {
    pub threats_found: u32,
    pub files_scanned: u32,
    pub scan_time: String,
}

/// Resumo do último scan do Defender
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScanSummary {
    pub scan_type: String,
    pub last_scan: Option<String>,
    pub threats_found: u32,
    pub duration: String,
    pub files_scanned: u64,
}

/// Resultado de limpeza de arquivos
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CleanResult {
    pub files_deleted: u32,
}

/// Detalhes de uma ameaça individual
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ThreatDetail {
    pub threat_id: u64,
    pub threat_name: String,
    pub severity: String,
    pub status: String,
    pub category: String,
    pub file_path: String,
    pub file_exists: bool,
    pub detected_time: String,
    pub action_taken: String,
}

/// Resumo de todas as ameaças
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ThreatSummary {
    pub total_threats: u32,
    pub high_severity: u32,
    pub medium_severity: u32,
    pub low_severity: u32,
    pub threats: Vec<ThreatDetail>,
}

/// Item do histórico de verificações
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScanHistoryItem {
    pub scan_type: String,
    pub start_time: String,
    pub end_time: String,
    pub threats_found: u32,
    pub files_scanned: u32,
}
