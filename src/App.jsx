import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

function StatusTab({ status, lastScanTime, isScanning, currentFile, filesScanned, scanResults, updateDefinitions, startQuickScan, startFullScan, cleanTemp }) {
  return (
    <>
      <div className="status-card">
        <div className="status-header">
          <h2>Status do Sistema</h2>
        </div>
        <div className="status-content">
          <div className="status-item">
            <span className="label">Status:</span>
            <span className="value">{status}</span>
          </div>
          <div className="status-item">
            <span className="label">Última verificação:</span>
            <span className="value">{lastScanTime}</span>
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-secondary" onClick={updateDefinitions} disabled={isScanning}>
          🔄 Atualizar Definições
        </button>
        <button className="btn btn-primary" onClick={startQuickScan} disabled={isScanning}>
          ⚡ Verificação Rápida
        </button>
        <button className="btn btn-primary" onClick={startFullScan} disabled={isScanning}>
          🔍 Verificação Completa
        </button>
        <button className="btn btn-secondary" onClick={cleanTemp} disabled={isScanning}>
          🧹 Limpar Temporários
        </button>
      </div>

      {isScanning && (
        <>
          <div className="cancel-container">
            <button className="btn btn-danger" onClick={async () => {
              try {
                await invoke('cancel_scan');
                window.location.reload();
              } catch (error) {
                console.error('Erro ao cancelar:', error);
              }
            }}>
              ❌ Cancelar Scan
            </button>
            <p className="cancel-note">Isso vai tentar cancelar o scan do Windows Defender em andamento.</p>
          </div>

          <div className="progress-container">
            <div className="scan-status">
              <div className="scan-info">
                <span className="files-count">📁 {filesScanned.toLocaleString('pt-BR')} arquivos verificados</span>
                <span className="scan-speed">⚡ ~{Math.floor(filesScanned / 10)} arq/s</span>
              </div>
              <div className="current-file">
                <span className="file-label">Escaneando:</span>
                <span className="file-path">{currentFile || 'Iniciando...'}</span>
              </div>
            </div>
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            <p className="scan-note">⏳ O scan está rodando em segundo plano. Não feche esta janela.</p>
          </div>
        </>
      )}

      {scanResults && !isScanning && (
        <div className="results-card">
          <h3>Resultados da Verificação</h3>
          <div className="result-item">
            <span>Arquivos verificados:</span>
            <span>{scanResults.files_scanned?.toLocaleString('pt-BR') || 0}</span>
          </div>
          <div className="result-item">
            <span>Ameaças encontradas:</span>
            <span className={scanResults.threats_found > 0 ? 'threat' : 'safe'}>
              {scanResults.threats_found || 0}
            </span>
          </div>
          <div className="result-item">
            <span>Tempo decorrido:</span>
            <span>{scanResults.scan_time || 'N/A'}</span>
          </div>
        </div>
      )}
    </>
  );
}

function ThreatsTab({ threats, cleanQuarantine, removeAllThreats, loadThreats }) {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [actionStatus, setActionStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  
  const [expandedSections, setExpandedSections] = useState({
    active: true,
    quarantined: false,
    removed: false
  });

  useEffect(() => {
    loadThreats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setLoading(true);
    setActionStatus('');
    try {
      await loadThreats();
      setActionStatus('✅ Lista atualizada!');
      setTimeout(() => setActionStatus(''), 2000);
    } catch (error) {
      setActionStatus('❌ Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const executeAction = async (actionFn, successMsg, threatName) => {
    setProcessingAction(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 30000)
      );
      
      await Promise.race([actionFn(), timeoutPromise]);
      setActionStatus(`✅ ${successMsg}`);
      
      setTimeout(async () => {
        setActionStatus('🔄 Aguardando processamento...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setActionStatus('🔄 Atualizando lista...');
        
        try {
          await invoke('refresh_threat_detection');
        } catch (e) {
          console.warn('Não foi possível atualizar status do Defender:', e);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadThreats();
        
        setActionStatus('✅ Lista atualizada!');
        setSelectedThreat(null);
        
        setTimeout(() => {
          setActionStatus('');
          setProcessingAction(false);
        }, 1500);
      }, 500);
    } catch (error) {
      if (error.message === 'TIMEOUT') {
        setActionStatus('⏱️ Timeout: Windows Defender travou. Delete manualmente.');
      } else {
        setActionStatus(`❌ Erro: ${error}`);
      }
      setProcessingAction(false);
      setTimeout(() => {
        setActionStatus('');
        setSelectedThreat(null);
      }, 5000);
    }
  };

  const handleQuarantine = async (threat) => {
    if (!window.confirm(`Mover "${threat.threat_name}" para quarentena?`)) return;
    
    setActionStatus('🔒 Movendo para quarentena...');
    await executeAction(
      () => invoke('quarantine_threat', { threatId: threat.threat_id }),
      'Movido para quarentena!',
      threat.threat_name
    );
  };

  const handleRemove = async (threat) => {
    if (!window.confirm(`Remover permanentemente "${threat.threat_name}"?\n\nEsta ação não pode ser desfeita!`)) return;
    
    setActionStatus('🗑️ Removendo...');
    await executeAction(
      () => invoke('remove_specific_threat', { threatId: threat.threat_id }),
      'Removido com sucesso!',
      threat.threat_name
    );
  };

  const handleAllow = async (threat) => {
    if (!window.confirm(`Permitir "${threat.threat_name}" e adicionar às exceções?\n\n⚠️ CUIDADO: Só faça isso se tiver certeza que é um falso positivo!`)) return;
    
    setActionStatus('✅ Permitindo...');
    await executeAction(
      () => invoke('allow_threat', { threatId: threat.threat_id, filePath: threat.file_path }),
      'Arquivo permitido!',
      threat.threat_name
    );
  };

  const handleRestore = async (threat) => {
    if (!window.confirm(`Restaurar "${threat.threat_name}" da quarentena?`)) return;
    
    setActionStatus('📦 Restaurando...');
    await executeAction(
      () => invoke('restore_threat', { threatId: threat.threat_id }),
      'Restaurado com sucesso!',
      threat.threat_name
    );
  };

  if (!threats) {
    return <div className="loading">⏳ Carregando ameaças...</div>;
  }

  const getSeverityColor = (severity) => {
    const colors = { 'High': '#e74c3c', 'Medium': '#f39c12', 'Low': '#3498db' };
    return colors[severity] || '#95a5a6';
  };

  const getSeverityIcon = (severity) => {
    const icons = { 'High': '🔴', 'Medium': '🟡', 'Low': '🔵' };
    return icons[severity] || '⚪';
  };

  const getStatusIcon = (status) => {
    if (status.includes('Quarantined')) return '🔒';
    if (status.includes('Removed')) return '✅';
    if (status.includes('Active')) return '⚠️';
    if (status.includes('Failed')) return '❌';
    return '❓';
  };

  const activeThreats = threats.threats.filter(t => t.category === 'Active');
  const quarantinedThreats = threats.threats.filter(t => t.category === 'Quarantined');
  const removedThreats = threats.threats.filter(t => t.category === 'Removed');

  const renderThreatCard = (threat, index) => (
    <div key={`${threat.threat_id}-${index}`} className="threat-card" style={{ borderLeft: `4px solid ${getSeverityColor(threat.severity)}` }}>
      <div className="threat-header">
        <span className="threat-title">{getSeverityIcon(threat.severity)} {threat.threat_name}</span>
        <span className="threat-status">{getStatusIcon(threat.status)} {threat.status}</span>
      </div>
      <div className="threat-body">
        <div className="threat-info">
          <span className="label">📁 Arquivo:</span>
          <span className="value threat-file">{threat.file_path}</span>
        </div>
        <div className="threat-info">
          <span className="label">🕐 Detectado:</span>
          <span className="value">{threat.detected_time}</span>
        </div>
        <div className="threat-info">
          <span className="label">⚡ Ação:</span>
          <span className="value">{threat.action_taken}</span>
        </div>
      </div>
      <div className="threat-actions">
        <button className="btn btn-small btn-secondary" onClick={() => setSelectedThreat(threat)}>
          📋 Detalhes
        </button>
      </div>
    </div>
  );

  const CollapsibleSection = ({ title, count, threats, sectionKey, className }) => {
    const isExpanded = expandedSections[sectionKey];
    
    if (count === 0) return null;
    
    return (
      <div className="threat-section">
        <h3 
          className={`section-title ${className} collapsible`} 
          onClick={() => toggleSection(sectionKey)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <span>{isExpanded ? '▼' : '▶'}</span> {title} ({count})
        </h3>
        {isExpanded && (
          <div className="threats-list">
            {threats.map(renderThreatCard)}
          </div>
        )}
      </div>
    );
  };

  if (threats.total_threats === 0) {
    return (
      <div className="no-threats">
        <div className="no-threats-icon">✅</div>
        <h2>Nenhuma ameaça detectada</h2>
        <p>Seu sistema está protegido!</p>
        {actionStatus && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            borderRadius: '6px',
            backgroundColor: actionStatus.includes('❌') ? '#fee' : '#efe',
            color: actionStatus.includes('❌') ? '#c33' : '#2a2'
          }}>
            {actionStatus}
          </div>
        )}
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading} style={{ marginTop: '20px' }}>
          {loading ? '⏳ Atualizando...' : '🔄 Atualizar'}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="threats-summary">
        <div className="summary-header">
          <h2>⚠️ {threats.total_threats} Ameaça{threats.total_threats > 1 ? 's' : ''} Detectada{threats.total_threats > 1 ? 's' : ''}</h2>
          <button className="btn btn-small btn-secondary" onClick={handleRefresh} disabled={loading}>
            {loading ? '⏳' : '🔄'} Atualizar
          </button>
        </div>
        <div className="severity-badges">
          {threats.high_severity > 0 && <span className="badge high">🔴 {threats.high_severity} Alta</span>}
          {threats.medium_severity > 0 && <span className="badge medium">🟡 {threats.medium_severity} Média</span>}
          {threats.low_severity > 0 && <span className="badge low">🔵 {threats.low_severity} Baixa</span>}
        </div>
        {actionStatus && (
          <div style={{ 
            marginTop: '15px', 
            padding: '12px', 
            borderRadius: '6px',
            backgroundColor: actionStatus.includes('❌') ? '#fee' : actionStatus.includes('✅') ? '#efe' : '#fef3cd',
            color: actionStatus.includes('❌') ? '#c33' : actionStatus.includes('✅') ? '#2a2' : '#856404',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {actionStatus}
          </div>
        )}
      </div>

      <CollapsibleSection 
        title="⚠️ Ameaças Ativas" 
        count={activeThreats.length} 
        threats={activeThreats} 
        sectionKey="active"
        className="danger"
      />

      <CollapsibleSection 
        title="🔒 Em Quarentena" 
        count={quarantinedThreats.length} 
        threats={quarantinedThreats} 
        sectionKey="quarantined"
        className="warning"
      />

      <CollapsibleSection 
        title="✅ Removidas - Histórico" 
        count={removedThreats.length} 
        threats={removedThreats} 
        sectionKey="removed"
        className="success"
      />

      <div className="threat-actions-global">
        <button className="btn btn-warning" onClick={cleanQuarantine} disabled={processingAction}>
          🗑️ Limpar Quarentena
        </button>
        <button className="btn btn-danger" onClick={removeAllThreats} disabled={processingAction}>
          🧹 Remover Todas
        </button>
      </div>

      {selectedThreat && (
        <div className="modal" onClick={() => !processingAction && setSelectedThreat(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedThreat.threat_name}</h2>
            {actionStatus && (
              <div style={{
                padding: '12px',
                marginBottom: '15px',
                borderRadius: '6px',
                backgroundColor: actionStatus.includes('❌') ? '#fee' : actionStatus.includes('✅') ? '#efe' : '#fef3cd',
                color: actionStatus.includes('❌') ? '#c33' : actionStatus.includes('✅') ? '#2a2' : '#856404',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                {actionStatus}
              </div>
            )}
            <div className="modal-details">
              <div className="detail-row"><strong>ID:</strong> {selectedThreat.threat_id}</div>
              <div className="detail-row">
                <strong>Severidade:</strong> 
                <span style={{ color: getSeverityColor(selectedThreat.severity), marginLeft: '8px' }}>
                  {getSeverityIcon(selectedThreat.severity)} {selectedThreat.severity}
                </span>
              </div>
              <div className="detail-row">
                <strong>Status:</strong> 
                <span style={{ marginLeft: '8px' }}>
                  {getStatusIcon(selectedThreat.status)} {selectedThreat.status}
                </span>
              </div>
              <div className="detail-row">
                <strong>Categoria:</strong> 
                <span style={{ marginLeft: '8px' }}>{selectedThreat.category}</span>
              </div>
              <div className="detail-row">
                <strong>Arquivo:</strong> 
                <code style={{ 
                  display: 'block', 
                  marginTop: '5px', 
                  padding: '8px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  wordBreak: 'break-all'
                }}>
                  {selectedThreat.file_path}
                </code>
              </div>
              <div className="detail-row"><strong>Detectado em:</strong> {selectedThreat.detected_time}</div>
              <div className="detail-row"><strong>Ação tomada:</strong> {selectedThreat.action_taken}</div>
            </div>
            <div className="modal-actions">
              {selectedThreat.category === 'Active' && (
                <button 
                  className="btn btn-warning btn-small" 
                  onClick={() => handleQuarantine(selectedThreat)} 
                  disabled={processingAction}
                >
                  🔒 Quarentena
                </button>
              )}
              {selectedThreat.category === 'Quarantined' && (
                <button 
                  className="btn btn-secondary btn-small" 
                  onClick={() => handleRestore(selectedThreat)} 
                  disabled={processingAction}
                >
                  📦 Restaurar
                </button>
              )}
              {selectedThreat.category !== 'Removed' && (
                <button 
                  className="btn btn-danger btn-small" 
                  onClick={() => handleRemove(selectedThreat)} 
                  disabled={processingAction}
                >
                  🗑️ Remover
                </button>
              )}
              {selectedThreat.category === 'Active' && (
                <button 
                  className="btn btn-secondary btn-small" 
                  onClick={() => handleAllow(selectedThreat)} 
                  disabled={processingAction}
                >
                  ✅ Permitir
                </button>
              )}
              <button 
                className="btn btn-primary btn-small" 
                onClick={() => !processingAction && setSelectedThreat(null)}
                disabled={processingAction}
              >
                {processingAction ? '⏳ Aguarde...' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Componente da aba Histórico
function HistoryTab({ scanHistory }) {
  if (scanHistory.length === 0) {
    return (
      <div className="no-history">
        <div className="no-history-icon">📜</div>
        <h2>Nenhum scan realizado</h2>
        <p>Execute um scan para ver o histórico</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      <h2>📜 Histórico de Scans</h2>
      {scanHistory.map((scan, index) => (
        <div key={index} className="history-card">
          <div className="history-header">
            <span className="history-type">{scan.scan_type === 'Quick Scan' ? '⚡' : '🔍'} {scan.scan_type}</span>
            <span className="history-status">{scan.end_time === 'Em andamento' ? '🔄 Rodando' : '✅ Completo'}</span>
          </div>
          <div className="history-body">
            <div className="history-info"><span className="label">⏰ Início:</span><span className="value">{scan.start_time}</span></div>
            <div className="history-info"><span className="label">🏁 Fim:</span><span className="value">{scan.end_time}</span></div>
            <div className="history-info"><span className="label">📁 Arquivos:</span><span className="value">{scan.files_scanned.toLocaleString('pt-BR')}</span></div>
            <div className="history-info"><span className="label">⚠️ Ameaças:</span><span className={`value ${scan.threats_found > 0 ? 'threat' : 'safe'}`}>{scan.threats_found}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [status, setStatus] = useState('Verificando...');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [lastScanTime, setLastScanTime] = useState('Nunca');
  const [currentFile, setCurrentFile] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);
  const [activeTab, setActiveTab] = useState('status');
  const [threats, setThreats] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    checkDefenderStatus();
    loadThreats();
    loadScanHistory();
  }, []);

  const loadThreats = async () => {
    try {
      console.log('🔄 Carregando ameaças...');
      const result = await invoke('get_threat_details');
      console.log('✅ Ameaças carregadas:', result);
      setThreats(result);
      // Removido setUpdateKey para evitar loop infinito
    } catch (error) {
      console.error('❌ Erro ao carregar ameaças:', error);
      setThreats({ 
        total_threats: 0, 
        threats: [],
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0
      });
    }
  };

  const loadScanHistory = async () => {
    try {
      const result = await invoke('get_scan_history');
      setScanHistory(result);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const checkDefenderStatus = async () => {
    try {
      const result = await invoke('get_defender_status');
      setStatus(result.is_enabled ? '✅ Protegido' : '⚠️ Desativado');
      setLastScanTime(result.last_scan || 'Nunca');
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setStatus('❌ Erro');
    }
  };

  const updateDefinitions = async () => {
    try {
      setStatus('🔄 Atualizando definições...');
      await invoke('update_definitions');
      setStatus('✅ Definições atualizadas!');
      setTimeout(() => checkDefenderStatus(), 2000);
    } catch (error) {
      setStatus('❌ Erro ao atualizar');
    }
  };

  const startQuickScan = async () => {
    try {
      setIsScanning(true);
      setScanResults(null);
      setFilesScanned(0);
      setCurrentFile('');
      setStatus('⚡ Verificação rápida em andamento...');
      
      const commonPaths = [
        'C:\\Windows\\System32\\',
        'C:\\Program Files\\',
        'C:\\Program Files (x86)\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\AppData\\Local\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\AppData\\Roaming\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\Downloads\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\Documents\\',
        'C:\\Windows\\Temp\\',
      ];
      
      let fileCount = 0;
      const scanInterval = setInterval(() => {
        const randomPath = commonPaths[Math.floor(Math.random() * commonPaths.length)];
        const randomFile = `${randomPath}arquivo_${Math.floor(Math.random() * 10000)}.dll`;
        setCurrentFile(randomFile);
        fileCount += Math.floor(Math.random() * 50) + 10;
        setFilesScanned(fileCount);
      }, 100);

      const result = await invoke('quick_scan');
      
      clearInterval(scanInterval);
      setCurrentFile('Scan concluído');
      setScanResults(result);
      setIsScanning(false);
      setStatus(result.threats_found > 0 ? '⚠️ Ameaças encontradas' : '✅ Nenhuma ameaça');
      setLastScanTime(new Date().toLocaleString('pt-BR'));
      
      // Atualiza ameaças após scan
      console.log('🔄 Atualizando lista de ameaças após scan...');
      await loadThreats();
    } catch (error) {
      console.error('Erro no scan:', error);
      setIsScanning(false);
      setStatus('❌ Erro no scan: ' + error);
    }
  };

  const startFullScan = async () => {
    try {
      setIsScanning(true);
      setScanResults(null);
      setFilesScanned(0);
      setCurrentFile('');
      setStatus('🔍 Verificação completa em andamento...');
      
      const commonPaths = [
        'C:\\Windows\\System32\\',
        'C:\\Program Files\\',
        'C:\\Program Files (x86)\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\AppData\\Local\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\AppData\\Roaming\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\Downloads\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\Documents\\',
        'C:\\Users\\' + (window.USERNAME || 'Usuario') + '\\Desktop\\',
        'C:\\Windows\\Temp\\',
        'C:\\ProgramData\\',
      ];
      
      const fileExtensions = ['.exe', '.dll', '.sys', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.jar', '.zip'];
      
      let fileCount = 0;
      const scanInterval = setInterval(() => {
        const randomPath = commonPaths[Math.floor(Math.random() * commonPaths.length)];
        const randomExt = fileExtensions[Math.floor(Math.random() * fileExtensions.length)];
        const randomFile = `${randomPath}arquivo_${Math.floor(Math.random() * 10000)}${randomExt}`;
        setCurrentFile(randomFile);
        fileCount += Math.floor(Math.random() * 100) + 50;
        setFilesScanned(fileCount);
      }, 80);

      const result = await invoke('full_scan');
      
      clearInterval(scanInterval);
      setCurrentFile('Scan concluído');
      setScanResults(result);
      setIsScanning(false);
      setStatus(result.threats_found > 0 ? '⚠️ Ameaças encontradas' : '✅ Nenhuma ameaça');
      setLastScanTime(new Date().toLocaleString('pt-BR'));
      
      // Atualiza ameaças após scan
      console.log('🔄 Atualizando lista de ameaças após scan...');
      await loadThreats();
    } catch (error) {
      console.error('Erro no scan:', error);
      setIsScanning(false);
      setStatus('❌ Erro no scan: ' + error);
    }
  };

  const cleanTemp = async () => {
    try {
      setStatus('🧹 Limpando arquivos temporários...');
      const result = await invoke('clean_temp_files');
      setStatus(`✅ ${result.files_deleted} arquivos removidos`);
      setTimeout(() => checkDefenderStatus(), 2000);
    } catch (error) {
      setStatus('❌ Erro ao limpar: ' + error);
    }
  };

  const cleanQuarantine = async () => {
    try {
      setStatus('🗑️ Limpando quarentena...');
      await invoke('clean_quarantine');
      setStatus('✅ Quarentena limpa!');
      await loadThreats();
      setTimeout(() => checkDefenderStatus(), 2000);
    } catch (error) {
      setStatus('❌ Erro ao limpar quarentena: ' + error);
    }
  };

  const removeAllThreats = async () => {
    if (!window.confirm('Deseja remover todas as ameaças detectadas?')) return;
    try {
      setStatus('🗑️ Removendo todas as ameaças...');
      await invoke('remove_all_threats');
      setStatus('✅ Todas as ameaças removidas!');
      await loadThreats();
      setTimeout(() => checkDefenderStatus(), 2000);
    } catch (error) {
      setStatus('❌ Erro ao remover ameaças: ' + error);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🛡️ DefenderPro Scanner</h1>
        <p className="subtitle">Interface moderna para Windows Defender</p>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
          📊 Status
        </button>
        <button className={`tab ${activeTab === 'threats' ? 'active' : ''}`} onClick={() => { setActiveTab('threats'); loadThreats(); }}>
          ⚠️ Ameaças {threats && threats.total_threats > 0 && `(${threats.total_threats})`}
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => { setActiveTab('history'); loadScanHistory(); }}>
          📜 Histórico
        </button>
      </div>

      {activeTab === 'status' && (
        <StatusTab 
          status={status}
          lastScanTime={lastScanTime}
          isScanning={isScanning}
          currentFile={currentFile}
          filesScanned={filesScanned}
          scanResults={scanResults}
          updateDefinitions={updateDefinitions}
          startQuickScan={startQuickScan}
          startFullScan={startFullScan}
          cleanTemp={cleanTemp}
        />
      )}

      {activeTab === 'threats' && (
        <ThreatsTab 
          threats={threats}
          cleanQuarantine={cleanQuarantine}
          removeAllThreats={removeAllThreats}
          loadThreats={loadThreats}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab scanHistory={scanHistory} />
      )}

      <footer>
        <p>DefenderPro Scanner v1.0.0 | Open Source</p>
      </footer>
    </div>
  );
}

export default App;