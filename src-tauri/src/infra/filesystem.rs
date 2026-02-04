use std::fs;

pub fn list_files(path: &str) -> Result<Vec<String>, String> {
  fs::read_dir(path)
    .map_err(|e| e.to_string())?
    .filter_map(|e| e.ok())
    .map(|e| e.path().display().to_string())
    .collect::<Vec<_>>()
    .into()
}
