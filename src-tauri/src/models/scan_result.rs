use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ThreatType {
  Malware,
  PUA,
  Unwanted,
  Suspicious,
  Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Threat {
  pub name: String,
  pub threat_type: ThreatType,
  pub file_path: String,
  pub severity: u8, // 1-5
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
  pub total_files: u32,
  pub total_folders: u32,
  pub issues: u32,
  pub threats: Vec<Threat>,
  pub current_file: String,
  pub files_scanned: u32,
  pub progress_percent: u8,
  pub scan_duration_ms: u64,
}
