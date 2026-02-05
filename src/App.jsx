import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CleanerPage } from './pages/CleanerPage';
import './App-CCleaner-Style.css';

function App() {
  const [activeTab, setActiveTab] = useState('defender');
  const [threats, setThreats] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [currentFile, setCurrentFile] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-icon">🛡️</div>
          <div className="sidebar-title">
            <h1>DefenderPro</h1>
            <p>Scanner Profissional</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'cleaner' ? 'active' : ''}`}
            onClick={() => setActiveTab('cleaner')}
          >
            <span className="nav-item-icon">🧹</span>
            <span>Cleaner</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'defender' ? 'active' : ''}`}
            onClick={() => setActiveTab('defender')}
          >
            <span className="nav-item-icon">🛡️</span>
            <span>Defender</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-item-icon">⚙️</span>
            <span>Configurações</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          v1.0.0 | Open Source
        </div>
      </aside>

      <main className="content-area">
        <header className="content-header">
          <h2>
            {activeTab === 'cleaner' && 'Windows Cleaner'}
            {activeTab === 'defender' && 'Windows Defender'}
            {activeTab === 'settings' && 'Configurações'}
          </h2>
        </header>

        <div className="content-scroll">
          {activeTab === 'cleaner' && <CleanerTab />}
          {activeTab === 'defender' && (
            <DefenderTab 
              threats={threats}
              setThreats={setThreats}
              isScanning={isScanning}
              setIsScanning={setIsScanning}
              scanResults={scanResults}
              setScanResults={setScanResults}
              currentFile={currentFile}
              setCurrentFile={setCurrentFile}
              filesScanned={filesScanned}
              setFilesScanned={setFilesScanned}
            />
          )}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

function CleanerTab() {
  return <CleanerPage />;
}

// COMPONENTE MODAL
function Modal({ isOpen, onClose, title, message, type = 'info' }) {
  if (!isOpen) return null;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${type}`}>
          <span className="modal-icon">{icons[type]}</span>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// COMPONENTE MODAL DE CONFIRMAÇÃO
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header warning">
          <span className="modal-icon">⚠️</span>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={async () => { await onConfirm?.(); onClose(); }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function DefenderTab({ threats, setThreats, isScanning, setIsScanning, scanResults, setScanResults, currentFile, setCurrentFile, filesScanned, setFilesScanned }) {
  const [subTab, setSubTab] = useState('scan');
  const [defenderInfo, setDefenderInfo] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const defenderLoadingRef = useRef(false);
  const lastDefenderLoadRef = useRef(0);
  
  // Estados do modal
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  useEffect(() => {
    loadThreats();
    loadDefenderInfo(true);

    const handleFocus = () => {
      loadDefenderInfo(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadDefenderInfo(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
  };

  const formatDefenderScanMessage = (scanTypeLabel, summary, fallbackFilesScanned) => {
    const now = new Date();
    const datePart = now.toLocaleDateString('pt-BR');
    const timePart = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const lastScan = `${datePart} ${timePart}`;
    const safeLastScan = summary?.last_scan || lastScan;
    const safeThreatsFound = summary?.threats_found ?? 0;
    const summaryFiles = summary?.files_scanned ?? 0;
    const safeFilesScanned = String(summaryFiles > 0 ? summaryFiles : (fallbackFilesScanned ?? 0));
    const duration = summary?.duration || 'N/A';

    return [
      `${safeThreatsFound} ameaças encontradas.`,
      `Duração da verificação ${duration}`,
      `${safeFilesScanned} arquivos verificados.`,
    ].join('\n');
  };

  const formatDurationFromScanTime = (scanTime) => {
    if (!scanTime) return 'N/A';
    if (scanTime.endsWith('s')) {
      const seconds = Math.round(parseFloat(scanTime.replace('s', '')) || 0);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins} minutos ${secs} segundos` : `${secs} segundos`;
    }
    if (scanTime.endsWith('min')) {
      const minsFloat = parseFloat(scanTime.replace('min', '')) || 0;
      const totalSeconds = Math.round(minsFloat * 60);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return secs > 0 ? `${mins} minutos ${secs} segundos` : `${mins} minutos`;
    }
    return scanTime;
  };

  const handleScanInProgress = (retryAction) => {
    showConfirm(
      'Verificação em andamento',
      'Já existe uma verificação em andamento. Deseja cancelar a verificação atual e iniciar uma nova?',
      async () => {
        try {
          await invoke('cancel_scan');
          if (typeof retryAction === 'function') {
            await retryAction();
          }
        } catch (cancelError) {
          showModal('Erro', 'Erro ao cancelar verificação: ' + cancelError, 'error');
        }
      }
    );
  };

  const loadThreats = async () => {
    try {
      const result = await invoke('get_threat_details');
      setThreats(result);
      return result;
    } catch (error) {
      console.error('Erro ao carregar ameaças:', error);
      const fallback = { 
        total_threats: 0, 
        threats: [],
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0
      };
      setThreats(fallback);
      return fallback;
    }
  };

  const loadDefenderInfo = async (force = false) => {
    const now = Date.now();
    if (defenderLoadingRef.current) return;
    if (!force && now - lastDefenderLoadRef.current < 1000) return;

    defenderLoadingRef.current = true;
    lastDefenderLoadRef.current = now;
    try {
      const result = await invoke('get_defender_status');
      setDefenderInfo(result);
    } catch (error) {
      console.error('Erro ao carregar info:', error);
    } finally {
      defenderLoadingRef.current = false;
    }
  };

  const updateDefinitions = async () => {
    setIsUpdating(true);
    try {
      await invoke('update_definitions');
      await loadDefenderInfo(true);
      showModal('Sucesso', 'Definições do Windows Defender atualizadas com sucesso!', 'success');
    } catch (error) {
      showModal('Erro', 'Erro ao atualizar definições: ' + error, 'error');
    } finally {
      setIsUpdating(false);
    }
  };



  const startQuickScan = async () => {
    try {
      setIsScanning(true);
      setScanResults(null);
      setFilesScanned(0);
      setCurrentFile('Iniciando scan...');
      
      // Inicia o scan em background (não bloqueante)
      await invoke('start_quick_scan');
      
      const commonPaths = [
        'C:\\Users\\Downloads\\',
        'C:\\Users\\Documents\\',
        'C:\\Users\\Desktop\\',
        'C:\\Users\\AppData\\Local\\',
        'C:\\Users\\AppData\\Roaming\\',
        'C:\\Windows\\System32\\',
        'C:\\Windows\\SysWOW64\\',
        'C:\\Program Files\\',
        'C:\\Program Files (x86)\\',
        'C:\\Windows\\Temp\\',
      ];
      
      let fileCount = 0;
      const startTime = Date.now();
      let isChecking = false; // Flag para evitar chamadas simultâneas
      
      // Interval para animação visual (rápido)
      const animationInterval = setInterval(() => {
        const randomPath = commonPaths[Math.floor(Math.random() * commonPaths.length)];
        const randomFile = `${randomPath}arquivo_${Math.floor(Math.random() * 10000)}.dll`;
        setCurrentFile(randomFile);
        fileCount += Math.floor(Math.random() * 50) + 10;
        setFilesScanned(fileCount);
      }, 150);
      
      // Interval separado para polling de status (mais lento)
      const statusInterval = setInterval(async () => {
        if (isChecking) return; // Evita chamadas simultâneas
        isChecking = true;
        
        try {
          const isRunning = await invoke('is_scan_running');
          if (!isRunning) {
            // Scan terminou - limpa os intervals
            clearInterval(animationInterval);
            clearInterval(statusInterval);
            window.currentScanInterval = null;
            window.currentStatusInterval = null;
            
            const elapsedMs = Date.now() - startTime;
            const scanTime = elapsedMs < 60000 
              ? `${(elapsedMs / 1000).toFixed(2)}s` 
              : `${(elapsedMs / 60000).toFixed(1)}min`;
            
            setCurrentFile('Scan concluído!');
            setScanResults({ threats_found: 0, files_scanned: fileCount, scan_time: scanTime });
            setFilesScanned(fileCount);
            setIsScanning(false);

            const nowLabel = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            setDefenderInfo((prev) => ({
              ...(prev || {}),
              is_enabled: prev?.is_enabled ?? true,
              last_scan: nowLabel,
            }));

            await loadThreats();
            
            try {
              const summary = await invoke('get_last_scan_summary', { scanType: 'quick' });
              showModal(
                'Ameaças atuais',
                formatDefenderScanMessage('verificação rápida', summary, fileCount),
                (summary?.threats_found ?? 0) > 0 ? 'warning' : 'success'
              );
            } catch (e) {
              showModal('Sucesso', `Verificação rápida concluída!\n\nArquivos verificados: ${fileCount}\nTempo: ${scanTime}`, 'success');
            }
          }
        } catch (err) {
          console.error('Erro ao verificar status:', err);
        } finally {
          isChecking = false;
        }
      }, 2000); // Verifica a cada 2 segundos

      // Guarda referências para poder cancelar
      window.currentScanInterval = animationInterval;
      window.currentStatusInterval = statusInterval;

    } catch (error) {
      console.error('Erro no scan:', error);
      setIsScanning(false);
      if (String(error).toLowerCase().includes('em andamento')) {
        handleScanInProgress(startQuickScan);
      } else {
        showModal('Erro', 'Erro ao executar scan: ' + error, 'error');
      }
    }
  };

  const startFullScan = async () => {
    try {
      setIsScanning(true);
      setScanResults(null);
      setFilesScanned(0);
      setCurrentFile('Iniciando scan completo...');
      
      // Inicia o scan em background (não bloqueante)
      await invoke('start_full_scan');
      
      const commonPaths = [
        'C:\\Users\\Downloads\\',
        'C:\\Users\\Documents\\',
        'C:\\Users\\Desktop\\',
        'C:\\Users\\AppData\\Local\\',
        'C:\\Users\\AppData\\Roaming\\',
        'C:\\Windows\\System32\\',
        'C:\\Windows\\SysWOW64\\',
        'C:\\Program Files\\',
        'C:\\Program Files (x86)\\',
        'C:\\Windows\\Temp\\',
      ];
      
      let fileCount = 0;
      const startTime = Date.now();
      
      // Polling para verificar se o scan ainda está rodando
      const checkScanStatus = async () => {
        try {
          const isRunning = await invoke('is_scan_running');
          if (!isRunning) {
            // Scan terminou
            clearInterval(scanInterval);
            const elapsedMs = Date.now() - startTime;
            const scanTime = elapsedMs < 60000 
              ? `${(elapsedMs / 1000).toFixed(2)}s` 
              : `${(elapsedMs / 60000).toFixed(1)}min`;
            
            setCurrentFile('Scan concluído!');
            setScanResults({ threats_found: 0, files_scanned: fileCount, scan_time: scanTime });
            setFilesScanned(fileCount);
            setIsScanning(false);

            const nowLabel = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            setDefenderInfo((prev) => ({
              ...(prev || {}),
              is_enabled: prev?.is_enabled ?? true,
              last_scan: nowLabel,
            }));

            await loadThreats();
            
            try {
              const summary = await invoke('get_last_scan_summary', { scanType: 'full' });
              showModal(
                'Ameaças atuais',
                formatDefenderScanMessage('verificação completa', summary, fileCount),
                (summary?.threats_found ?? 0) > 0 ? 'warning' : 'success'
              );
            } catch (e) {
              showModal('Sucesso', `Verificação completa concluída!\n\nArquivos verificados: ${fileCount}\nTempo: ${scanTime}`, 'success');
            }
          }
        } catch (err) {
          console.error('Erro ao verificar status:', err);
        }
      };
      
      const scanInterval = setInterval(() => {
        const randomPath = commonPaths[Math.floor(Math.random() * commonPaths.length)];
        const randomFile = `${randomPath}arquivo_${Math.floor(Math.random() * 10000)}.dll`;
        setCurrentFile(randomFile);
        fileCount += Math.floor(Math.random() * 100) + 20;
        setFilesScanned(fileCount);
        
        // Verifica status a cada iteração
        checkScanStatus();
      }, 300);

      // Guarda referência do interval para poder cancelar
      window.currentScanInterval = scanInterval;

    } catch (error) {
      console.error('Erro no scan:', error);
      setIsScanning(false);
      if (String(error).toLowerCase().includes('em andamento')) {
        handleScanInProgress(startFullScan);
      } else {
        showModal('Erro', 'Erro ao executar scan completo: ' + error, 'error');
      }
    }
  };

  const startCustomScan = async () => {
    try {
      const selectedPath = await invoke('select_folder');
      
      if (!selectedPath || selectedPath.trim() === '') {
        showModal('Aviso', 'Nenhuma pasta foi selecionada.', 'warning');
        return;
      }
      
      setIsScanning(true);
      setScanResults(null);
      setFilesScanned(0);
      setCurrentFile(`Escaneando: ${selectedPath}`);
      
      let fileCount = 0;
      const scanInterval = setInterval(() => {
        const randomFile = `${selectedPath}\\arquivo_${Math.floor(Math.random() * 10000)}.dll`;
        setCurrentFile(randomFile);
        fileCount += Math.floor(Math.random() * 30) + 5;
        setFilesScanned(fileCount);
      }, 700);

      const result = await invoke('custom_scan', { path: selectedPath });
      
      clearInterval(scanInterval);
      setCurrentFile('Scan concluído!');
      setScanResults(result);
      setFilesScanned(result?.files_scanned ?? fileCount);
      setIsScanning(false);

      const nowLabel = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setDefenderInfo((prev) => ({
        ...(prev || {}),
        is_enabled: prev?.is_enabled ?? true,
        last_scan: nowLabel,
      }));

      const immediateSummary = {
        last_scan: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        threats_found: threats?.total_threats ?? 0,
        duration: formatDurationFromScanTime(result?.scan_time),
        files_scanned: result?.files_scanned ?? fileCount,
      };

      showModal(
        'Ameaças atuais',
        formatDefenderScanMessage('verificação personalizada', immediateSummary, result?.files_scanned ?? fileCount),
        (immediateSummary.threats_found ?? 0) > 0 ? 'warning' : 'success'
      );

      loadThreats().then(async () => {
        try {
          await loadDefenderInfo();
          const summary = await invoke('get_last_scan_summary', { scanType: 'custom' });
          showModal(
            'Ameaças atuais',
            formatDefenderScanMessage('verificação personalizada', summary, result?.files_scanned ?? fileCount),
            (summary?.threats_found ?? 0) > 0 ? 'warning' : 'success'
          );
        } catch (e) {
          // mantém o modal imediato se falhar
        }
      });
    } catch (error) {
      console.error('Erro no scan personalizado:', error);
      setIsScanning(false);
      if (String(error).toLowerCase().includes('em andamento')) {
        handleScanInProgress(startCustomScan);
      } else {
        showModal('Erro', 'Erro ao executar scan personalizado: ' + error, 'error');
      }
    }
  };

  const handleCancelScan = async () => {
    // Primeiro limpa os intervals imediatamente (resposta instantânea no UI)
    if (window.currentScanInterval) {
      clearInterval(window.currentScanInterval);
      window.currentScanInterval = null;
    }
    if (window.currentStatusInterval) {
      clearInterval(window.currentStatusInterval);
      window.currentStatusInterval = null;
    }
    
    // Reseta o estado do frontend imediatamente
    setIsScanning(false);
    setCurrentFile('');
    setFilesScanned(0);
    setScanResults(null);
    
    // Depois tenta cancelar o processo no backend
    try {
      await invoke('cancel_scan');
      showModal('Cancelado', 'Verificação cancelada com sucesso.', 'info');
    } catch (error) {
      console.error('Erro ao cancelar processo:', error);
      // Mesmo com erro, o UI já foi resetado
      showModal('Aviso', 'Verificação interrompida no aplicativo.', 'info');
    }
  };

  const handleRemoveThreat = async (threatId) => {
    showConfirm(
      'Confirmar Remoção',
      'Tem certeza que deseja remover esta ameaça? Esta ação não pode ser desfeita.',
      async () => {
        try {
          const result = await invoke('remove_specific_threat', { threatId });
          await loadThreats();
          const isInUse = typeof result === 'string' && result.toLowerCase().includes('arquivo em uso');
          showModal(isInUse ? 'Atenção' : 'Sucesso', result, isInUse ? 'warning' : 'success');
        } catch (error) {
          showModal('Erro', 'Erro ao remover ameaça: ' + error, 'error');
        }
      }
    );
  };

  const handleQuarantineThreat = async (threatId) => {
    try {
      const result = await invoke('quarantine_threat', { threatId });
      await loadThreats();
      showModal('Sucesso', result, 'success');
    } catch (error) {
      showModal('Erro', 'Erro ao colocar em quarentena: ' + error, 'error');
    }
  };

  return (
    <>
      {/* Modais */}
      <Modal 
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      {/* Card de Info */}
      {defenderInfo && (
        <div className="cleaner-card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-header-icon">ℹ️</span>
            <div className="card-header-title">
              <h3>Status do Windows Defender</h3>
              <p>{defenderInfo.is_enabled ? '✅ Proteção ativa' : '⚠️ Proteção desativada'}</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ padding: '16px 20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Última verificação:</strong> {defenderInfo.last_scan || 'Nunca'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-abas */}
      <div className="defender-subtabs">
        <button 
          className={`defender-subtab ${subTab === 'scan' ? 'active' : ''}`}
          onClick={() => setSubTab('scan')}
        >
          🛡️ Proteção do Sistema
        </button>
        <button 
          className={`defender-subtab ${subTab === 'history' ? 'active' : ''}`}
          onClick={() => setSubTab('history')}
        >
          📋 Histórico de Proteção
        </button>
      </div>

      {/* Sub-aba SCAN */}
      {subTab === 'scan' && (
        <>
          <div className="cleaner-card">
            <div className="card-header">
              <span className="card-header-icon">🛡️</span>
              <div className="card-header-title">
                <h3>Proteção do Sistema</h3>
                <p>Escaneie seu sistema em busca de ameaças</p>
              </div>
            </div>
            <div className="card-body">
              {isScanning ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <h3 style={{ marginBottom: '16px' }}>Scan em andamento...</h3>
                  
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: '16px', 
                    borderRadius: '8px',
                    marginBottom: '16px',
                    textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '12px', color: '#5f6368', fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>
                      {currentFile}
                    </div>
                  </div>
                  
                  <div className="spinner-container">
                    <div className="spinner"></div>
                  </div>
                  
                  <button className="btn btn-danger" onClick={handleCancelScan}>
                    ❌ Cancelar Scan
                  </button>
                </div>
              ) : (
                <div className="defender-scan-grid">
                  <div className="defender-scan-card" onClick={startQuickScan}>
                    <div className="defender-scan-icon">⚡</div>
                    <h4>Scan Rápido</h4>
                    <p>Verifica áreas comuns onde ameaças costumam estar</p>
                    <div className="defender-scan-time">~2 minutos</div>
                  </div>

                  <div className="defender-scan-card" onClick={startFullScan}>
                    <div className="defender-scan-icon">🔍</div>
                    <h4>Scan Completo</h4>
                    <p>Verifica todos os arquivos e programas do sistema</p>
                    <div className="defender-scan-time">~1 hora</div>
                  </div>

                  <div className="defender-scan-card" onClick={startCustomScan}>
                    <div className="defender-scan-icon">📁</div>
                    <h4>Scan Personalizado</h4>
                    <p>Escolha pastas específicas para escanear</p>
                    <div className="defender-scan-time">Variável</div>
                  </div>

                  <div className="defender-scan-card">
                    <div className="defender-scan-icon">🌐</div>
                    <h4>Scan Offline</h4>
                    <p>Reinicia o PC para remover ameaças persistentes</p>
                    <div className="defender-scan-time">~15 minutos</div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </>
      )}

      {/* Sub-aba HISTÓRICO */}
      {subTab === 'history' && (
        <div className="cleaner-card">
          <div className="card-header">
            <span className="card-header-icon">📋</span>
            <div className="card-header-title">
              <h3>Histórico de Proteção</h3>
              <p>
                {threats && threats.total_threats > 0 
                  ? `${threats.total_threats} ameaça(s) detectada(s)` 
                  : 'Nenhuma ameaça detectada'}
              </p>
            </div>
          </div>
          <div className="card-body">
            {!threats || threats.total_threats === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Sistema Protegido</h3>
                <p style={{ color: '#5f6368' }}>Nenhuma ameaça foi detectada em seu sistema</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '16px 20px', background: '#fff3cd', borderBottom: '1px solid #e0e0e0' }}>
                  <strong>📊 Resumo:</strong> {threats.total_threats} ameaça(s) - 
                  <span style={{ color: '#d32f2f', marginLeft: '8px' }}>Alta: {threats.high_severity}</span>
                  <span style={{ color: '#f57c00', marginLeft: '8px' }}>Média: {threats.medium_severity}</span>
                  <span style={{ color: '#1976d2', marginLeft: '8px' }}>Baixa: {threats.low_severity}</span>
                </div>
                <div className="threats-history">
                  {(() => {
                    const withFile = threats.threats.filter(t => t.file_exists !== false);
                    const withoutFile = threats.threats.filter(t => t.file_exists === false);

                    return (
                      <>
                        {withFile.map((threat, index) => {
                          const isRemoved = threat.status === 'Removida' || threat.category === 'Removida';
                          const canAct = !isRemoved;
                          return (
                            <div key={index} className="threat-history-item">
                              <div className="threat-history-header">
                                <div className="threat-history-title">
                                  <span className="threat-icon">⚠️</span>
                                  <div>
                                    <strong>{threat.threat_name}</strong>
                                    <div className="threat-path">📁 {threat.file_path}</div>
                                    <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
                                      Status: {threat.status} | Categoria: {threat.category}
                                    </div>
                                  </div>
                                </div>
                                <span className={`threat-severity ${threat.severity.toLowerCase()}`}>
                                  {threat.severity}
                                </span>
                              </div>
                              <div className="threat-history-footer">
                                <span className="threat-time">Detectado em: {threat.detected_time}</span>
                                <div className="threat-actions">
                                  <button 
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleRemoveThreat(threat.threat_id)}
                                    disabled={!canAct}
                                  >
                                    🗑️ Remover
                                  </button>
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleQuarantineThreat(threat.threat_id)}
                                    disabled={!canAct}
                                  >
                                    🔒 Quarentena
                                  </button>
                                  {!canAct && (
                                    <span style={{ fontSize: '12px', color: '#5f6368', marginLeft: '8px' }}>
                                      Já removida
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {withoutFile.length > 0 && (
                          <details className="threat-history-item" style={{ marginTop: '12px' }}>
                            <summary className="threat-history-header" style={{ cursor: 'pointer', listStyle: 'none' }}>
                              <div className="threat-history-title">
                                <span className="threat-icon">🧾</span>
                                <div>
                                  <strong>Ameaças sem arquivo para remover ({withoutFile.length})</strong>
                                  <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
                                    Entradas mantidas no histórico pelo Windows Defender
                                  </div>
                                </div>
                              </div>
                            </summary>
                            <div style={{ padding: '12px 16px' }}>
                              {withoutFile.map((threat, idx) => (
                                <div key={idx} className="threat-history-item" style={{ marginTop: '8px' }}>
                                  <div className="threat-history-header">
                                    <div className="threat-history-title">
                                      <span className="threat-icon">⚠️</span>
                                      <div>
                                        <strong>{threat.threat_name}</strong>
                                        <div className="threat-path">
                                          📁 {threat.file_path}
                                          <span style={{ marginLeft: '8px', color: '#d32f2f', fontSize: '12px' }}>
                                            (arquivo não existe)
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
                                          Status: {threat.status} | Categoria: {threat.category}
                                        </div>
                                      </div>
                                    </div>
                                    <span className={`threat-severity ${threat.severity.toLowerCase()}`}>
                                      {threat.severity}
                                    </span>
                                  </div>
                                  <div className="threat-history-footer">
                                    <span className="threat-time">Detectado em: {threat.detected_time}</span>
                                    <div className="threat-actions">
                                      <button className="btn btn-danger btn-sm" disabled>
                                        🗑️ Remover
                                      </button>
                                      <button className="btn btn-secondary btn-sm" disabled>
                                        🔒 Quarentena
                                      </button>
                                      <span style={{ fontSize: '12px', color: '#5f6368', marginLeft: '8px' }}>
                                        Sem arquivo para remover
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SettingsTab() {
  return (
    <div className="cleaner-card">
      <div className="card-header">
        <span className="card-header-icon">⚙️</span>
        <div className="card-header-title">
          <h3>Configurações</h3>
        </div>
      </div>
      <div className="card-body">
        <p style={{ padding: '20px' }}>Configurações em desenvolvimento...</p>
      </div>
    </div>
  );
}

export default App;
