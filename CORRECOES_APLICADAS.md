# 🔧 Correções para DefenderPro - Histórico de Ameaças

## 📋 Resumo das Correções

Este documento contém todas as correções necessárias para resolver o problema do histórico de ameaças no DefenderPro.

---

## 🐛 Problemas Identificados e Soluções

### Problema #1: PowerShell retorna JSON malformado
**Localização:** `src-tauri/src/services/threat_management_service.rs`

**Bugs:**
1. Retorna `"[]"` como string ao invés de objeto estruturado
2. Falta `-Depth 10` no `ConvertTo-Json` (trunca arrays aninhados)
3. Não força encoding UTF-8
4. Não usa `-Compress` (JSON maior)
5. Calcula severidades no Rust ao invés de PowerShell

---

## 🔧 CORREÇÃO #1: threat_management_service.rs

**Arquivo:** `src-tauri/src/services/threat_management_service.rs`

**Substituir a função `get_threat_details` (linhas 8-137) por:**

```rust
    /// Obtém detalhes de todas as ameaças
    pub fn get_threat_details() -> Result<ThreatSummary, String> {
        let command = r#"
            # Força encoding UTF-8 para evitar problemas com caracteres especiais
            $OutputEncoding = [System.Text.Encoding]::UTF8
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            
            $threats = Get-MpThreatDetection
            
            # Se não há ameaças, retorna estrutura completa vazia
            if (-not $threats) {
                @{
                    total_threats = 0
                    high_severity = 0
                    medium_severity = 0
                    low_severity = 0
                    threats = @()
                } | ConvertTo-Json -Depth 10 -Compress
                exit
            }
            
            $result = @()
            foreach ($threat in $threats) {
                # Mapeamento de nomes de ameaças
                $threatName = switch ($threat.ThreatID) {
                    2147734096 { "Trojan:Win32/Wacatac" }
                    2147797489 { "Suspicious PowerShell Script" }
                    2147735503 { "Trojan:Win32/Sabsik" }
                    2147737010 { "Trojan:Win32/Agent" }
                    default { "Ameaça Desconhecida (ID: $($threat.ThreatID))" }
                }
                
                # Classificação de severidade
                $severity = switch ($threat.ThreatID) {
                    2147734096 { "High" }
                    2147797489 { "Medium" }
                    2147735503 { "High" }
                    2147737010 { "Medium" }
                    default { "Low" }
                }
                
                # Status da ameaça
                $status = switch ($threat.ThreatStatusID) {
                    1 { "Ativa" }
                    2 { "Em Quarentena" }
                    3 { "Em Quarentena" }
                    5 { "Permitida" }
                    6 { "Removida" }
                    102 { "Falha na Limpeza" }
                    103 { "Falha na Quarentena" }
                    104 { "Falha na Remoção" }
                    105 { "Falha ao Permitir" }
                    106 { "Abandonada" }
                    107 { "Falha ao Bloquear" }
                    default { "Desconhecido ($($threat.ThreatStatusID))" }
                }
                
                # Categoria
                $category = switch ($threat.ThreatStatusID) {
                    1 { "Ativa" }
                    2 { "Quarentena" }
                    3 { "Quarentena" }
                    5 { "Permitida" }
                    6 { "Removida" }
                    102 { "Ativa" }
                    103 { "Ativa" }
                    104 { "Ativa" }
                    105 { "Ativa" }
                    106 { "Removida" }
                    107 { "Ativa" }
                    default { "Desconhecida" }
                }
                
                # Ação tomada
                $actionTaken = switch ($threat.CleaningActionID) {
                    2 { "Colocar em Quarentena" }
                    3 { "Remover" }
                    6 { "Permitir" }
                    8 { "Definido pelo Usuário" }
                    9 { "Nenhuma Ação" }
                    10 { "Bloquear" }
                    default { "Desconhecida" }
                }
                
                # Caminho do arquivo com tratamento seguro
                $filePath = if ($threat.Resources) { 
                    $threat.Resources[0] -replace "^[^:]+:_", "" 
                } else { 
                    "Desconhecido" }

                # Verifica se o arquivo ainda existe usando -LiteralPath para segurança
                $fileExists = if ($filePath -ne "Desconhecido" -and (Test-Path -LiteralPath $filePath -ErrorAction SilentlyContinue)) { 
                    $true 
                } else { 
                    $false 
                }
                
                # Monta o objeto
                $obj = @{
                    threat_id = [uint64]$threat.ThreatID
                    threat_name = $threatName
                    severity = $severity
                    status = $status
                    category = $category
                    file_path = $filePath
                    file_exists = $fileExists
                    detected_time = $threat.InitialDetectionTime.ToString('dd/MM/yyyy HH:mm:ss')
                    action_taken = $actionTaken
                }
                
                $result += $obj
            }
            
            # Calcula severidades no PowerShell para evitar reprocessamento
            $high = ($result | Where-Object { $_.severity -eq "High" }).Count
            $medium = ($result | Where-Object { $_.severity -eq "Medium" }).Count
            $low = ($result | Where-Object { $_.severity -eq "Low" }).Count
            
            # Retorna estrutura completa com metadados
            @{
                total_threats = $result.Count
                high_severity = $high
                medium_severity = $medium
                low_severity = $low
                threats = $result
            } | ConvertTo-Json -Depth 10 -Compress
        "#;
        
        let output = PowerShellExecutor::run(command)?;
        
        // Log para debug (apenas em modo debug)
        #[cfg(debug_assertions)]
        {
            eprintln!("=== DEBUG: get_threat_details output ===");
            eprintln!("{}", output);
            eprintln!("=== END DEBUG ===");
        }
        
        // Parse direto do JSON estruturado
        let summary: ThreatSummary = serde_json::from_str(&output)
            .map_err(|e| format!("Erro ao parsear JSON de ameaças: {} | Output: {}", e, output))?;
        
        Ok(summary)
    }
```

**Melhorias aplicadas:**
- ✅ UTF-8 encoding explícito
- ✅ Retorna estrutura JSON completa sempre
- ✅ `-Depth 10` para evitar truncamento
- ✅ `-Compress` para JSON menor
- ✅ Calcula severidades no PowerShell (mais eficiente)
- ✅ `-LiteralPath` para segurança
- ✅ Logging em modo debug
- ✅ Mensagem de erro detalhada

---

## 🔧 CORREÇÃO #2: useThreats.js

**Arquivo:** `src/hooks/useThreats.js`

**Substituir TODO o conteúdo por:**

```javascript
import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/defenderApi';

export function useThreats() {
  const [threats, setThreats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(null); // threatId being removed
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState(null);

  const loadThreats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.getThreatDetails();
      
      // Log para debug
      console.log('✅ Ameaças carregadas:', result);
      
      setThreats(result);
      return result;
    } catch (error) {
      console.error('❌ Erro ao carregar ameaças:', error);
      setError(String(error));
      
      const fallback = { 
        total_threats: 0, 
        threats: [],
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0
      };
      setThreats(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeThreat = useCallback(async (threatId) => {
    try {
      setIsRemoving(threatId);
      setError(null);
      await api.removeThreat(threatId);
      await loadThreats();
      return { success: true };
    } catch (error) {
      setError(String(error));
      return { success: false, error };
    } finally {
      setIsRemoving(null);
    }
  }, [loadThreats]);

  const clearAllThreats = useCallback(async () => {
    try {
      setIsClearing(true);
      setError(null);
      await api.clearAllThreats();
      await loadThreats();
      return { success: true };
    } catch (error) {
      setError(String(error));
      return { success: false, error };
    } finally {
      setIsClearing(false);
    }
  }, [loadThreats]);

  useEffect(() => {
    loadThreats();
  }, [loadThreats]);

  return {
    threats,
    threatsList: threats?.threats || [],
    totalThreats: threats?.total_threats || 0,
    highSeverity: threats?.high_severity || 0,
    mediumSeverity: threats?.medium_severity || 0,
    lowSeverity: threats?.low_severity || 0,
    isLoading,
    isRemoving,
    isClearing,
    error,
    refresh: loadThreats,
    removeThreat,
    clearAllThreats
  };
}

export default useThreats;
```

**Melhorias aplicadas:**
- ✅ Adiciona campo `error` no estado
- ✅ Logs com emojis para facilitar debug
- ✅ Expõe `error` no retorno do hook
- ✅ Limpa erro antes de cada operação

---

## 🔧 CORREÇÃO #3: Mostrar Erros na UI

Se o componente que usa `useThreats` não estiver mostrando erros, adicione:

**Exemplo no DefenderPage ou onde você usa o hook:**

```jsx
import { useThreats } from '../hooks/useThreats';
import { useModal } from '../hooks/useModal';

function HistoryTab() {
  const { threats, isLoading, error, refresh } = useThreats();
  const { showError } = useModal();
  
  useEffect(() => {
    if (error) {
      showError(`Erro ao carregar ameaças: ${error}`);
    }
  }, [error, showError]);
  
  // Resto do componente...
}
```

---

## 🔧 CORREÇÃO #4: Adicionar Comando de Debug

**Arquivo:** `src-tauri/src/commands/threat_commands.rs`

Adicionar um novo comando para debug (opcional mas recomendado):

```rust
/// Debug: Obtém output bruto do PowerShell
#[tauri::command]
pub fn debug_get_threats_raw() -> Result<String, String> {
    let command = r#"
        $threats = Get-MpThreatDetection
        if (-not $threats) {
            "Nenhuma ameaça encontrada"
        } else {
            $threats | ConvertTo-Json -Depth 10
        }
    "#;
    
    crate::infra::PowerShellExecutor::run(command)
}
```

**Adicionar no main.rs:**
```rust
invoke_handler![
    // ... outros comandos
    debug_get_threats_raw,
]
```

**Usar no frontend (botão de debug):**
```jsx
<button onClick={async () => {
  const raw = await invoke('debug_get_threats_raw');
  console.log('PowerShell Raw Output:', raw);
  alert(raw);
}}>
  🐛 Debug Raw Threats
</button>
```

---

## 🧪 Como Testar

### 1. Compilar e Executar

```bash
cd defender-pro
npm run tauri:dev
```

### 2. Testar com Sistema Limpo

Se não houver ameaças:
- ✅ Deve mostrar "Sistema Protegido"
- ✅ Console deve mostrar: `✅ Ameaças carregadas: { total_threats: 0, ... }`

### 3. Criar Ameaça de Teste (EICAR)

Abra PowerShell **como Administrador** e execute:

```powershell
# Cria arquivo de teste inofensivo (EICAR)
$eicar = 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
Set-Content -Path "$env:TEMP\eicar.com" -Value $eicar

# Aguarda detecção (5 segundos)
Start-Sleep -Seconds 5

# Verifica se foi detectado
Get-MpThreatDetection
```

### 4. Verificar Histórico

- Abrir DefenderPro
- Clicar em "Histórico de Proteção"
- Deve mostrar a ameaça EICAR detectada

### 5. Verificar Console

Abrir DevTools (F12) e procurar por:
```
✅ Ameaças carregadas: { total_threats: 1, threats: [...] }
```

Se aparecer erro:
```
❌ Erro ao carregar ameaças: ...
```

---

## 📊 Checklist de Verificação

- [ ] **Backup feito?** (importante!)
- [ ] **Código Rust atualizado?** (threat_management_service.rs)
- [ ] **Hook useThreats atualizado?** (src/hooks/useThreats.js)
- [ ] **Compilou sem erros?** (`npm run tauri:dev`)
- [ ] **Console mostra logs?** (✅ ou ❌)
- [ ] **Testou com EICAR?**
- [ ] **UI mostra ameaças?**
- [ ] **UI mostra erros quando houver?**

---

## 🎯 Resultado Esperado

### Antes da Correção
```
❌ Retorna "[]" string
❌ Parse JSON falha
❌ Histórico sempre vazio
❌ Sem logs de debug
❌ Sem feedback de erros
```

### Depois da Correção
```
✅ Retorna JSON estruturado
✅ Parse JSON sempre funciona
✅ Histórico mostra ameaças
✅ Logs detalhados no console
✅ Erros visíveis para usuário
```

---

## 🚨 Troubleshooting

### Problema: "Erro ao parsear JSON"

**Solução:**
1. Adicione logging no Rust:
```rust
#[cfg(debug_assertions)]
eprintln!("PowerShell Output: {}", output);
```

2. Compile em modo debug: `cargo build`

3. Verifique output no terminal

### Problema: "Sistema Protegido" sempre aparece

**Possíveis causas:**
1. Não há ameaças reais → Normal
2. PowerShell retorna vazio → Execute `Get-MpThreatDetection` manualmente
3. Permissões insuficientes → Execute como Admin
4. Tamper Protection ativo → Desative temporariamente

### Problema: Ameaças aparecem mas não podem ser removidas

**Solução:**
Verifique:
- App está rodando como Administrador?
- Tamper Protection está desativado?
- Arquivo ainda existe no caminho mostrado?

---

## 📚 Arquivos Modificados

1. `src-tauri/src/services/threat_management_service.rs` - Função `get_threat_details`
2. `src/hooks/useThreats.js` - Adiciona campo `error` e logs

---

## ✅ Validação Final

Após aplicar todas as correções, execute:

```bash
# 1. Limpar build anterior
cargo clean

# 2. Compilar Rust
cd src-tauri
cargo build

# 3. Executar app
cd ..
npm run tauri:dev

# 4. Verificar console
# Deve mostrar:
# ✅ Ameaças carregadas: { total_threats: N, ... }
```

---

**Autor:** Claude (Anthropic)  
**Data:** 04/02/2026  
**Versão:** DefenderPro - Correção do Histórico
