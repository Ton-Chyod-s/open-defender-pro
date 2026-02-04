# DefenderPro - Versão Modular 🛡️

> Aplicação Tauri para gerenciamento avançado do Windows Defender com arquitetura modular e escalável

## 🌟 Destaques

- ✅ **15 Funções Completas** - Todas testadas e funcionando
- 🏗️ **Arquitetura Modular** - Clean Architecture com 4 camadas
- 🧪 **Testável** - Separação clara facilita testes unitários
- 📦 **Organizado** - Código dividido por responsabilidade
- 🚀 **Escalável** - Fácil adicionar novas funcionalidades
- 📝 **Documentado** - Comentários e guias completos

## 📂 Estrutura do Projeto

```
defender-pro-modular/
├── src-tauri/
│   └── src/
│       ├── main.rs                          # Entry point
│       ├── models/                          # 📊 Estruturas de dados
│       │   └── mod.rs
│       ├── infra/                           # 🔌 Infraestrutura
│       │   ├── mod.rs
│       │   └── powershell.rs
│       ├── services/                        # 💼 Lógica de negócio
│       │   ├── mod.rs
│       │   ├── defender_status_service.rs
│       │   ├── scan_service.rs
│       │   ├── threat_management_service.rs
│       │   └── cleanup_service.rs
│       └── commands/                        # 🎯 API Tauri
│           ├── mod.rs
│           ├── defender_status_commands.rs
│           ├── scan_commands.rs
│           ├── threat_commands.rs
│           └── cleanup_commands.rs
├── ARQUITETURA.md                           # Documentação da arquitetura
└── README.md                                # Este arquivo
```

## 🎯 Funcionalidades

### Status e Configurações (3)
- `get_defender_status()` - Status do Defender
- `update_definitions()` - Atualiza definições de vírus
- `refresh_threat_detection()` - Refresh rápido

### Verificações/Scans (4)
- `quick_scan()` - Verificação rápida (~15-60s)
- `full_scan()` - Verificação completa (~20-90min)
- `cancel_scan()` - Cancela scan em andamento
- `get_scan_history()` - Histórico de scans

### Gerenciamento de Ameaças (7)
- `get_threat_details()` - Lista todas as ameaças
- `quarantine_threat()` - Coloca em quarentena
- `remove_specific_threat()` - Remove ameaça
- `allow_threat()` - Permite/ignora ameaça
- `restore_threat()` - Restaura da quarentena
- `clean_quarantine()` - Limpa quarentena
- `remove_all_threats()` - Remove todas

### Limpeza (1)
- `clean_temp_files()` - Limpa arquivos temporários

## 🏗️ Arquitetura

A aplicação segue **Clean Architecture** com 4 camadas bem definidas:

```
┌─────────────────────────────────────────────┐
│           Frontend (React/Tauri)            │
└──────────────────┬──────────────────────────┘
                   │ invoke()
┌──────────────────▼──────────────────────────┐
│         Commands (Camada de API)            │
│  - defender_status_commands.rs              │
│  - scan_commands.rs                         │
│  - threat_commands.rs                       │
│  - cleanup_commands.rs                      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      Services (Lógica de Negócio)          │
│  - DefenderStatusService                    │
│  - ScanService                              │
│  - ThreatManagementService                  │
│  - CleanupService                           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│    Infra (Comunicação Externa)             │
│  - PowerShellExecutor                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Windows Defender (PowerShell)        │
└─────────────────────────────────────────────┘
```

**Models** (Estruturas de dados) são compartilhados entre todas as camadas.

## 🚀 Como Usar

### Instalação

```bash
# Clone o repositório
git clone <repo>

# Entre na pasta
cd defender-pro-modular

# Instale as dependências do frontend
npm install

# Entre na pasta Rust
cd src-tauri

# Compile o projeto Rust
cargo build

# Volte para raiz e rode a aplicação
cd ..
npm run tauri dev
```

### Build de Produção

```bash
npm run tauri build
```

## 💻 Exemplo de Uso no Frontend

```javascript
import { invoke } from '@tauri-apps/api/tauri';

// Obter status do Defender
const status = await invoke('get_defender_status');
console.log('Defender ativo:', status.is_enabled);

// Executar scan rápido
const result = await invoke('quick_scan');
console.log(`${result.threats_found} ameaças encontradas`);

// Listar ameaças
const threats = await invoke('get_threat_details');
console.log(`Total de ameaças: ${threats.total_threats}`);

// Remover ameaça específica
await invoke('remove_specific_threat', { 
  threatId: 2147734096 
});
```

## 📖 Documentação

- **[ARQUITETURA.md](./ARQUITETURA.md)** - Documentação completa da arquitetura
  - Explicação detalhada de cada camada
  - Fluxo de dados
  - Como adicionar novas funcionalidades
  - Padrões e convenções

## 🧩 Componentes Principais

### 1. Models (`models/mod.rs`)
Estruturas de dados puras:
```rust
pub struct DefenderStatus { ... }
pub struct ThreatDetail { ... }
pub struct ScanResult { ... }
```

### 2. Infrastructure (`infra/powershell.rs`)
Executor PowerShell centralizado:
```rust
impl PowerShellExecutor {
    pub fn run(command: &str) -> Result<String, String>
    pub fn check_scan_running() -> Result<bool, String>
}
```

### 3. Services (`services/*.rs`)
Lógica de negócio organizada:
```rust
impl ScanService {
    pub async fn quick_scan() -> Result<ScanResult, String>
    pub async fn full_scan() -> Result<ScanResult, String>
}
```

### 4. Commands (`commands/*.rs`)
API Tauri exposta ao frontend:
```rust
#[tauri::command]
pub async fn quick_scan() -> Result<ScanResult, String> {
    ScanService::quick_scan().await
}
```

## 🎨 Vantagens da Arquitetura Modular

### ✅ Manutenibilidade
- Código organizado e fácil de entender
- Mudanças isoladas em suas camadas
- Reduz riscos de bugs

### ✅ Testabilidade
- Services podem ser testados isoladamente
- Fácil criar mocks da infraestrutura
- Testes unitários por camada

### ✅ Escalabilidade
- Adicionar novas funcionalidades é simples
- Estrutura clara para novos desenvolvedores
- Reutilização de código

### ✅ Separação de Responsabilidades
- Cada camada tem um propósito único
- Facilita trabalho em equipe
- Reduz acoplamento

## 🔄 Como Adicionar Nova Funcionalidade

1. **Adicionar Model** (se necessário)
   ```rust
   // models/mod.rs
   pub struct NovoTipo { ... }
   ```

2. **Adicionar no Service**
   ```rust
   // services/nome_service.rs
   impl NomeService {
       pub async fn nova_funcao() -> Result<NovoTipo, String> { ... }
   }
   ```

3. **Criar Command**
   ```rust
   // commands/nome_commands.rs
   #[tauri::command]
   pub async fn novo_comando() -> Result<NovoTipo, String> {
       NomeService::nova_funcao().await
   }
   ```

4. **Registrar no main.rs**
   ```rust
   .invoke_handler(tauri::generate_handler![
       novo_comando,
   ])
   ```

## 🧪 Testes

```bash
# Rodar testes
cd src-tauri
cargo test

# Testes com output
cargo test -- --nocapture
```

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Linhas de código | ~810 |
| Arquivos Rust | 13 |
| Camadas | 4 |
| Funções públicas | 15 |
| Services | 4 |
| Commands | 4 módulos |

## 🛠️ Tecnologias

- **Rust** - Linguagem principal
- **Tauri** - Framework desktop
- **PowerShell** - Integração Windows Defender
- **Serde** - Serialização/Deserialização
- **Tokio** - Runtime async

## 📝 Convenções

### Nomenclatura
- Services: `NomeService`
- Commands: `verbo_substantivo`
- Models: `Substantivo`

### Estrutura
- Services contêm lógica de negócio
- Commands apenas delegam para services
- Infra isola dependências externas
- Models são estruturas puras

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Crie um Pull Request

## 📜 Licença

Este projeto é licenciado sob a MIT License.

## ✨ Créditos

Desenvolvido seguindo as melhores práticas de:
- Clean Architecture
- SOLID Principles
- Domain-Driven Design
- Rust Best Practices

---

**Desenvolvido com ❤️ usando Rust + Tauri**
