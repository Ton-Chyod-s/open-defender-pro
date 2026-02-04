# DefenderPro - Arquitetura Modular

## 📐 Visão Geral da Arquitetura

Esta é a arquitetura modular completa do DefenderPro, seguindo os princípios de Clean Architecture e separação de responsabilidades.

```
src-tauri/src/
├── main.rs                          # Entry point da aplicação
├── models/                          # Camada de Dados
│   └── mod.rs                       # Estruturas de dados (DTOs)
├── infra/                           # Camada de Infraestrutura
│   ├── mod.rs
│   └── powershell.rs               # Executor PowerShell
├── services/                        # Camada de Negócio
│   ├── mod.rs
│   ├── defender_status_service.rs  # Lógica de status
│   ├── scan_service.rs             # Lógica de scans
│   ├── threat_management_service.rs # Lógica de ameaças
│   └── cleanup_service.rs          # Lógica de limpeza
└── commands/                        # Camada de Apresentação (API)
    ├── mod.rs
    ├── defender_status_commands.rs # Comandos de status
    ├── scan_commands.rs            # Comandos de scan
    ├── threat_commands.rs          # Comandos de ameaças
    └── cleanup_commands.rs         # Comandos de limpeza
```

## 🏗️ Camadas da Arquitetura

### 1. Models (Camada de Dados)
**Responsabilidade**: Definir estruturas de dados compartilhadas

**Arquivo**: `models/mod.rs`

```rust
pub struct DefenderStatus { ... }
pub struct ScanResult { ... }
pub struct ThreatDetail { ... }
pub struct ThreatSummary { ... }
```

**Características**:
- Estruturas puras (DTOs - Data Transfer Objects)
- Serializáveis (Serde)
- Sem lógica de negócio
- Compartilhadas entre todas as camadas

---

### 2. Infra (Camada de Infraestrutura)
**Responsabilidade**: Comunicação com sistemas externos

**Arquivo**: `infra/powershell.rs`

```rust
pub struct PowerShellExecutor;

impl PowerShellExecutor {
    pub fn run(command: &str) -> Result<String, String>
    pub fn check_scan_running() -> Result<bool, String>
}
```

**Características**:
- Abstrai a execução de comandos PowerShell
- Pode ser facilmente testada com mocks
- Centraliza tratamento de erros de infraestrutura
- Isola dependências externas

---

### 3. Services (Camada de Negócio)
**Responsabilidade**: Lógica de negócio e regras da aplicação

**Arquivos**:
- `services/defender_status_service.rs`
- `services/scan_service.rs`
- `services/threat_management_service.rs`
- `services/cleanup_service.rs`

```rust
pub struct DefenderStatusService;

impl DefenderStatusService {
    pub fn get_status() -> Result<DefenderStatus, String>
    pub async fn update_definitions() -> Result<String, String>
}
```

**Características**:
- Contém toda a lógica de negócio
- Usa a camada de infraestrutura
- Retorna modelos tipados
- Independente da camada de apresentação
- Facilmente testável

---

### 4. Commands (Camada de Apresentação/API)
**Responsabilidade**: Expor funcionalidades para o frontend via Tauri

**Arquivos**:
- `commands/defender_status_commands.rs`
- `commands/scan_commands.rs`
- `commands/threat_commands.rs`
- `commands/cleanup_commands.rs`

```rust
#[tauri::command]
pub fn get_defender_status() -> Result<DefenderStatus, String> {
    DefenderStatusService::get_status()
}
```

**Características**:
- Funções anotadas com `#[tauri::command]`
- Apenas delegam para os services
- Camada fina de adaptação
- Registradas no `main.rs`

---

## 🔄 Fluxo de Dados

```
Frontend (React)
    ↓ invoke('get_threat_details')
Commands (threat_commands.rs)
    ↓ ThreatManagementService::get_threat_details()
Services (threat_management_service.rs)
    ↓ PowerShellExecutor::run(command)
Infra (powershell.rs)
    ↓ Command::new("powershell")...
Windows Defender PowerShell
    ↓ Result
Infra → Services → Commands → Frontend
```

## 📦 Organização por Funcionalidade

### Status do Defender
```
models/mod.rs                        → DefenderStatus
infra/powershell.rs                  → PowerShellExecutor
services/defender_status_service.rs  → DefenderStatusService
commands/defender_status_commands.rs → get_defender_status, update_definitions
```

### Verificações (Scans)
```
models/mod.rs                        → ScanResult, ScanHistoryItem
infra/powershell.rs                  → PowerShellExecutor
services/scan_service.rs             → ScanService
commands/scan_commands.rs            → quick_scan, full_scan, cancel_scan
```

### Gerenciamento de Ameaças
```
models/mod.rs                        → ThreatDetail, ThreatSummary
infra/powershell.rs                  → PowerShellExecutor
services/threat_management_service.rs → ThreatManagementService
commands/threat_commands.rs          → quarantine_threat, remove_specific_threat
```

### Limpeza
```
models/mod.rs                        → CleanResult
infra/powershell.rs                  → PowerShellExecutor
services/cleanup_service.rs          → CleanupService
commands/cleanup_commands.rs         → clean_temp_files
```

## 🎯 Benefícios da Arquitetura

### 1. Separação de Responsabilidades
- Cada camada tem um propósito único e bem definido
- Facilita manutenção e evolução do código
- Reduz acoplamento entre componentes

### 2. Testabilidade
- Services podem ser testados sem Tauri
- Infra pode ser mockada facilmente
- Testes unitários por camada

### 3. Reutilização
- Services podem ser usados por múltiplos commands
- PowerShellExecutor é reutilizado por todos os services
- Models são compartilhados

### 4. Escalabilidade
- Fácil adicionar novos services
- Fácil adicionar novos commands
- Estrutura clara para novos desenvolvedores

### 5. Manutenibilidade
- Código organizado e fácil de encontrar
- Mudanças isoladas em suas camadas
- Reduz riscos de regressão

## 📝 Como Adicionar Nova Funcionalidade

### Exemplo: Adicionar "Verificação Personalizada"

**1. Adicionar Model** (`models/mod.rs`)
```rust
#[derive(Serialize, Deserialize)]
pub struct CustomScanResult {
    pub path: String,
    pub threats_found: u32,
    pub duration: String,
}
```

**2. Adicionar método no Service** (`services/scan_service.rs`)
```rust
impl ScanService {
    pub async fn custom_scan(path: String) -> Result<CustomScanResult, String> {
        // Lógica de scan personalizado
        let command = format!("Start-MpScan -ScanType CustomScan -ScanPath '{}'", path);
        let result = PowerShellExecutor::run(&command)?;
        // Processar resultado
        Ok(CustomScanResult { ... })
    }
}
```

**3. Adicionar Command** (`commands/scan_commands.rs`)
```rust
#[tauri::command]
pub async fn custom_scan(path: String) -> Result<CustomScanResult, String> {
    ScanService::custom_scan(path).await
}
```

**4. Registrar no main.rs**
```rust
.invoke_handler(tauri::generate_handler![
    // ... outros comandos
    custom_scan,
])
```

**5. Usar no Frontend**
```javascript
const result = await invoke('custom_scan', { path: 'C:\\Users' });
```

## 🧪 Exemplo de Teste Unitário

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_threat_details() {
        let json = r#"{"threat_id": 123, "threat_name": "Test", ...}"#;
        let threat: ThreatDetail = serde_json::from_str(json).unwrap();
        assert_eq!(threat.threat_id, 123);
    }

    #[tokio::test]
    async fn test_scan_service() {
        // Mock PowerShellExecutor se necessário
        let result = ScanService::quick_scan().await;
        assert!(result.is_ok());
    }
}
```

## 🔍 Padrões Utilizados

### 1. Repository Pattern
- `Services` atuam como repositories
- Encapsulam acesso aos dados

### 2. Dependency Injection
- Services usam `PowerShellExecutor`
- Commands usam Services
- Facilita testes e mocks

### 3. Command Pattern
- Cada `command` é uma ação específica
- Fácil adicionar/remover funcionalidades

### 4. DTO Pattern
- `Models` são Data Transfer Objects
- Separam representação de lógica

## 📚 Convenções de Código

### Nomenclatura
- **Services**: `NomeService` (ex: `ScanService`)
- **Commands**: `verbo_substantivo` (ex: `get_defender_status`)
- **Models**: `Substantivo` (ex: `ThreatDetail`)

### Estrutura de Funções
```rust
// Service
pub async fn nome_funcao(params) -> Result<Tipo, String> {
    // 1. Validações
    // 2. Lógica de negócio
    // 3. Chamada à infra
    // 4. Processamento do resultado
    // 5. Retorno
}

// Command
#[tauri::command]
pub async fn nome_comando(params) -> Result<Tipo, String> {
    ServiceName::nome_funcao(params).await
}
```

### Tratamento de Erros
```rust
// PowerShell retorna "ERROR: " na string
if result.contains("ERROR:") {
    return Err(result.replace("ERROR: ", "").trim().to_string());
}

Ok(result.replace("SUCCESS: ", "").trim().to_string())
```

## 🚀 Compilação e Build

```bash
# Desenvolvimento
cd src-tauri
cargo build

# Produção
cargo build --release

# Rodar app
cargo tauri dev
```

## 📊 Métricas da Arquitetura

| Camada | Arquivos | Linhas | Responsabilidade |
|--------|----------|--------|------------------|
| Models | 1 | ~60 | Estruturas de dados |
| Infra | 2 | ~50 | Comunicação PowerShell |
| Services | 5 | ~600 | Lógica de negócio |
| Commands | 5 | ~100 | API Tauri |
| **Total** | **13** | **~810** | - |

## 🎓 Princípios SOLID Aplicados

- **S** (Single Responsibility): Cada service tem uma responsabilidade
- **O** (Open/Closed): Fácil estender sem modificar existente
- **L** (Liskov Substitution): Services podem ser substituídos
- **I** (Interface Segregation): Commands expõem apenas necessário
- **D** (Dependency Inversion): Dependências apontam para abstrações

---

**Desenvolvido com ❤️ seguindo as melhores práticas de Rust e Clean Architecture**
