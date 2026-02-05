use crate::infra::PowerShellExecutor;
use crate::models::{CleanResult, CleanupAnalysis, CleanupCategory};

/// Serviço para operações de limpeza do sistema
pub struct CleanupService;

impl CleanupService {
    /// Analisa o que pode ser limpo no sistema
    pub fn analyze() -> Result<CleanupAnalysis, String> {
        let command = r#"
            $result = @{
                temp_files = @{ size = 0; count = 0 }
                windows_temp = @{ size = 0; count = 0 }
                recycle_bin = @{ size = 0; count = 0 }
                chrome_cache = @{ size = 0; count = 0 }
                brave_cache = @{ size = 0; count = 0 }
                edge_cache = @{ size = 0; count = 0 }
                firefox_cache = @{ size = 0; count = 0 }
                windows_logs = @{ size = 0; count = 0 }
                prefetch = @{ size = 0; count = 0 }
                thumbnails = @{ size = 0; count = 0 }
            }

            # Temp do usuário
            try {
                $items = Get-ChildItem -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
                $result.temp_files.size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $result.temp_files.count = ($items | Measure-Object).Count
            } catch {}

            # Windows Temp
            try {
                $items = Get-ChildItem -Path "$env:WINDIR\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
                $result.windows_temp.size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $result.windows_temp.count = ($items | Measure-Object).Count
            } catch {}

            # Lixeira
            try {
                $shell = New-Object -ComObject Shell.Application
                $recycleBin = $shell.Namespace(0xA)
                $items = $recycleBin.Items()
                $result.recycle_bin.count = $items.Count
                $totalSize = 0
                foreach ($item in $items) {
                    try {
                        $totalSize += $recycleBin.GetDetailsOf($item, 2) -replace '[^\d]', ''
                    } catch {}
                }
                $result.recycle_bin.size = $totalSize
            } catch {}

            # Cache do Chrome
            try {
                $chromePaths = @(
                    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*",
                    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache\*",
                    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\GPUCache\*"
                )
                $totalSize = 0
                $totalCount = 0
                foreach ($path in $chromePaths) {
                    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                    $totalSize += ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                    $totalCount += ($items | Measure-Object).Count
                }
                $result.chrome_cache.size = $totalSize
                $result.chrome_cache.count = $totalCount
            } catch {}

            # Cache do Brave
            try {
                $bravePaths = @(
                    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Cache\*",
                    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Code Cache\*",
                    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\GPUCache\*"
                )
                $totalSize = 0
                $totalCount = 0
                foreach ($path in $bravePaths) {
                    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                    $totalSize += ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                    $totalCount += ($items | Measure-Object).Count
                }
                $result.brave_cache.size = $totalSize
                $result.brave_cache.count = $totalCount
            } catch {}

            # Cache do Edge
            try {
                $edgePaths = @(
                    "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*",
                    "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache\*",
                    "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\GPUCache\*"
                )
                $totalSize = 0
                $totalCount = 0
                foreach ($path in $edgePaths) {
                    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                    $totalSize += ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                    $totalCount += ($items | Measure-Object).Count
                }
                $result.edge_cache.size = $totalSize
                $result.edge_cache.count = $totalCount
            } catch {}

            # Cache do Firefox
            try {
                $items = Get-ChildItem -Path "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2\*" -Recurse -Force -ErrorAction SilentlyContinue
                $result.firefox_cache.size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $result.firefox_cache.count = ($items | Measure-Object).Count
            } catch {}

            # Logs do Windows
            try {
                $items = Get-ChildItem -Path "$env:WINDIR\Logs\*" -Recurse -Force -ErrorAction SilentlyContinue
                $result.windows_logs.size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $result.windows_logs.count = ($items | Measure-Object).Count
            } catch {}

            # Prefetch
            try {
                $items = Get-ChildItem -Path "$env:WINDIR\Prefetch\*" -Force -ErrorAction SilentlyContinue
                $result.prefetch.size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $result.prefetch.count = ($items | Measure-Object).Count
            } catch {}

            # Thumbnails
            try {
                $items = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db" -Force -ErrorAction SilentlyContinue
                $result.thumbnails.size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $result.thumbnails.count = ($items | Measure-Object).Count
            } catch {}

            $result | ConvertTo-Json -Depth 3
        "#;

        let output = PowerShellExecutor::run(command)?;
        
        #[derive(serde::Deserialize)]
        struct RawCategory {
            size: Option<u64>,
            count: Option<u32>,
        }
        
        #[derive(serde::Deserialize)]
        struct RawAnalysis {
            temp_files: RawCategory,
            windows_temp: RawCategory,
            recycle_bin: RawCategory,
            chrome_cache: RawCategory,
            brave_cache: RawCategory,
            edge_cache: RawCategory,
            firefox_cache: RawCategory,
            windows_logs: RawCategory,
            prefetch: RawCategory,
            thumbnails: RawCategory,
        }

        let raw: RawAnalysis = serde_json::from_str(&output)
            .map_err(|e| format!("Erro ao parsear análise: {} | Output: {}", e, output))?;

        let categories = vec![
            CleanupCategory {
                id: "temp_files".to_string(),
                name: "Arquivos Temporários".to_string(),
                description: "Arquivos temporários do usuário".to_string(),
                icon: "🗑️".to_string(),
                size_bytes: raw.temp_files.size.unwrap_or(0),
                file_count: raw.temp_files.count.unwrap_or(0),
                selected: true,
            },
            CleanupCategory {
                id: "windows_temp".to_string(),
                name: "Windows Temp".to_string(),
                description: "Arquivos temporários do Windows".to_string(),
                icon: "🪟".to_string(),
                size_bytes: raw.windows_temp.size.unwrap_or(0),
                file_count: raw.windows_temp.count.unwrap_or(0),
                selected: true,
            },
            CleanupCategory {
                id: "recycle_bin".to_string(),
                name: "Lixeira".to_string(),
                description: "Itens na Lixeira do Windows".to_string(),
                icon: "🗑️".to_string(),
                size_bytes: raw.recycle_bin.size.unwrap_or(0),
                file_count: raw.recycle_bin.count.unwrap_or(0),
                selected: true,
            },
            CleanupCategory {
                id: "chrome_cache".to_string(),
                name: "Cache do Chrome".to_string(),
                description: "Cache, cookies e dados do Google Chrome".to_string(),
                icon: "🔵".to_string(),
                size_bytes: raw.chrome_cache.size.unwrap_or(0),
                file_count: raw.chrome_cache.count.unwrap_or(0),
                selected: true,
            },
            CleanupCategory {
                id: "brave_cache".to_string(),
                name: "Cache do Brave".to_string(),
                description: "Cache, cookies e dados do Brave Browser".to_string(),
                icon: "🦁".to_string(),
                size_bytes: raw.brave_cache.size.unwrap_or(0),
                file_count: raw.brave_cache.count.unwrap_or(0),
                selected: true,
            },
            CleanupCategory {
                id: "edge_cache".to_string(),
                name: "Cache do Edge".to_string(),
                description: "Cache, cookies e dados do Microsoft Edge".to_string(),
                icon: "🌊".to_string(),
                size_bytes: raw.edge_cache.size.unwrap_or(0),
                file_count: raw.edge_cache.count.unwrap_or(0),
                selected: true,
            },
            CleanupCategory {
                id: "firefox_cache".to_string(),
                name: "Cache do Firefox".to_string(),
                description: "Cache e dados do Mozilla Firefox".to_string(),
                icon: "🦊".to_string(),
                size_bytes: raw.firefox_cache.size.unwrap_or(0),
                file_count: raw.firefox_cache.count.unwrap_or(0),
                selected: true,
            },
            CleanupCategory {
                id: "windows_logs".to_string(),
                name: "Logs do Windows".to_string(),
                description: "Arquivos de log do sistema".to_string(),
                icon: "📋".to_string(),
                size_bytes: raw.windows_logs.size.unwrap_or(0),
                file_count: raw.windows_logs.count.unwrap_or(0),
                selected: false,
            },
            CleanupCategory {
                id: "prefetch".to_string(),
                name: "Prefetch".to_string(),
                description: "Dados de pré-carregamento de apps".to_string(),
                icon: "⚡".to_string(),
                size_bytes: raw.prefetch.size.unwrap_or(0),
                file_count: raw.prefetch.count.unwrap_or(0),
                selected: false,
            },
            CleanupCategory {
                id: "thumbnails".to_string(),
                name: "Miniaturas".to_string(),
                description: "Cache de miniaturas do Explorer".to_string(),
                icon: "🖼️".to_string(),
                size_bytes: raw.thumbnails.size.unwrap_or(0),
                file_count: raw.thumbnails.count.unwrap_or(0),
                selected: false,
            },
        ];

        let total_size: u64 = categories.iter().map(|c| c.size_bytes).sum();
        let total_files: u32 = categories.iter().map(|c| c.file_count).sum();

        Ok(CleanupAnalysis {
            categories,
            total_size_bytes: total_size,
            total_file_count: total_files,
        })
    }

    /// Executa a limpeza das categorias selecionadas
    pub fn clean(categories: Vec<String>) -> Result<CleanResult, String> {
        let mut total_deleted = 0u32;
        let mut total_size_freed = 0u64;
        let mut errors: Vec<String> = Vec::new();

        for category in categories {
            let result = match category.as_str() {
                "temp_files" => Self::clean_temp_files(),
                "windows_temp" => Self::clean_windows_temp(),
                "recycle_bin" => Self::clean_recycle_bin(),
                "chrome_cache" => Self::clean_chrome_cache(),
                "brave_cache" => Self::clean_brave_cache(),
                "edge_cache" => Self::clean_edge_cache(),
                "firefox_cache" => Self::clean_firefox_cache(),
                "windows_logs" => Self::clean_windows_logs(),
                "prefetch" => Self::clean_prefetch(),
                "thumbnails" => Self::clean_thumbnails(),
                _ => continue,
            };

            match result {
                Ok((count, size)) => {
                    total_deleted += count;
                    total_size_freed += size;
                }
                Err(e) => errors.push(format!("{}: {}", category, e)),
            }
        }

        Ok(CleanResult {
            files_deleted: total_deleted,
            size_freed_bytes: total_size_freed,
            errors: if errors.is_empty() { None } else { Some(errors) },
        })
    }

    fn clean_temp_files() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            try {
                $items = Get-ChildItem -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
                $size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $count = ($items | Measure-Object).Count
                Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
            } catch {}
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_windows_temp() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            try {
                $items = Get-ChildItem -Path "$env:WINDIR\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
                $size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $count = ($items | Measure-Object).Count
                Remove-Item -Path "$env:WINDIR\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
            } catch {}
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_recycle_bin() -> Result<(u32, u64), String> {
        let command = r#"
            try {
                $shell = New-Object -ComObject Shell.Application
                $recycleBin = $shell.Namespace(0xA)
                $count = $recycleBin.Items().Count
                Clear-RecycleBin -Force -ErrorAction SilentlyContinue
                Write-Output "$count|0"
            } catch {
                Write-Output "0|0"
            }
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_chrome_cache() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            $paths = @(
                "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*",
                "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache\*",
                "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\GPUCache\*",
                "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Service Worker\CacheStorage\*"
            )
            foreach ($path in $paths) {
                try {
                    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                    $size += ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                    $count += ($items | Measure-Object).Count
                    Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                } catch {}
            }
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_brave_cache() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            $paths = @(
                "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Cache\*",
                "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Code Cache\*",
                "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\GPUCache\*",
                "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Service Worker\CacheStorage\*"
            )
            foreach ($path in $paths) {
                try {
                    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                    $size += ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                    $count += ($items | Measure-Object).Count
                    Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                } catch {}
            }
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_edge_cache() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            $paths = @(
                "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*",
                "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache\*",
                "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\GPUCache\*",
                "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Service Worker\CacheStorage\*"
            )
            foreach ($path in $paths) {
                try {
                    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                    $size += ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                    $count += ($items | Measure-Object).Count
                    Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                } catch {}
            }
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_firefox_cache() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            try {
                $items = Get-ChildItem -Path "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2\*" -Recurse -Force -ErrorAction SilentlyContinue
                $size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $count = ($items | Measure-Object).Count
                Remove-Item -Path "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2\*" -Recurse -Force -ErrorAction SilentlyContinue
            } catch {}
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_windows_logs() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            try {
                $items = Get-ChildItem -Path "$env:WINDIR\Logs\*" -Recurse -Force -ErrorAction SilentlyContinue
                $size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $count = ($items | Measure-Object).Count
                Remove-Item -Path "$env:WINDIR\Logs\*" -Recurse -Force -ErrorAction SilentlyContinue
            } catch {}
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_prefetch() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            try {
                $items = Get-ChildItem -Path "$env:WINDIR\Prefetch\*" -Force -ErrorAction SilentlyContinue
                $size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $count = ($items | Measure-Object).Count
                Remove-Item -Path "$env:WINDIR\Prefetch\*" -Force -ErrorAction SilentlyContinue
            } catch {}
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn clean_thumbnails() -> Result<(u32, u64), String> {
        let command = r#"
            $size = 0
            $count = 0
            try {
                # Para o Explorer para liberar os arquivos
                Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
                
                $items = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db" -Force -ErrorAction SilentlyContinue
                $size = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                $count = ($items | Measure-Object).Count
                Remove-Item -Path "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db" -Force -ErrorAction SilentlyContinue
                
                # Reinicia o Explorer
                Start-Process explorer
            } catch {}
            Write-Output "$count|$size"
        "#;
        Self::parse_clean_result(PowerShellExecutor::run(command)?)
    }

    fn parse_clean_result(output: String) -> Result<(u32, u64), String> {
        let parts: Vec<&str> = output.trim().split('|').collect();
        if parts.len() == 2 {
            let count = parts[0].parse().unwrap_or(0);
            let size = parts[1].parse().unwrap_or(0);
            Ok((count, size))
        } else {
            Ok((0, 0))
        }
    }
}
