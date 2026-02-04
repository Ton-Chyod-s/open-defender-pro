import { invoke } from '@tauri-apps/api/core';

// Defender Status
export async function getDefenderStatus() {
  return invoke('get_defender_status');
}

export async function updateDefinitions() {
  return invoke('update_definitions');
}

// Scans
export async function quickScan() {
  return invoke('quick_scan');
}

export async function fullScan() {
  return invoke('full_scan');
}

export async function customScan(path) {
  return invoke('custom_scan', { path });
}

export async function cancelScan() {
  return invoke('cancel_scan');
}

export async function getLastScanSummary(scanType) {
  return invoke('get_last_scan_summary', { scanType });
}

export async function getScanHistory() {
  return invoke('get_scan_history');
}

// Threats
export async function getThreatDetails() {
  return invoke('get_threat_details');
}

export async function removeThreat(threatId) {
  return invoke('remove_threat', { threatId });
}

export async function clearAllThreats() {
  return invoke('clear_all_threats');
}

// Folder Selection
export async function selectFolder() {
  return invoke('select_folder');
}
