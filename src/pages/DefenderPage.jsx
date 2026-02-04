import { useState } from 'react';
import { Card, Button, Spinner, AlertModal, ConfirmModal } from '../components/ui';
import { ScanCard, StatCard, ThreatCard, HistoryCard } from '../components/cards';
import { TabNav } from '../components/layout';
import { useDefender, useScan, useThreats, useModal } from '../hooks';
import './DefenderPage.css';

export function DefenderPage() {
  const [subTab, setSubTab] = useState('scan');
  
  const { status, isUpdating, updateDefinitions } = useDefender();
  const { threats, totalThreats, threatsList, isRemoving, isClearing, removeThreat, clearAllThreats, refresh: refreshThreats } = useThreats();
  const { alertModal, confirmModal, showAlert, closeAlert, showConfirm, closeConfirm } = useModal();
  
  const { isScanning, scanType, progress, startScan, cancelScan, getSummary } = useScan({
    onComplete: async (result, type) => {
      await refreshThreats();
      try {
        const summary = await getSummary(type);
        showAlert(
          'Scan Concluído',
          formatScanMessage(summary, progress.filesScanned),
          (summary?.threats_found ?? 0) > 0 ? 'warning' : 'success'
        );
      } catch {
        showAlert('Scan Concluído', `${result?.threats_found || 0} ameaças encontradas.`, 'success');
      }
    },
    onError: ({ type, error, retryFn }) => {
      if (type === 'scan_in_progress') {
        showConfirm(
          'Verificação em andamento',
          'Já existe uma verificação em andamento. Deseja cancelar e iniciar uma nova?',
          async () => {
            await cancelScan();
            retryFn?.();
          }
        );
      } else {
        showAlert('Erro', 'Erro ao executar scan: ' + error, 'error');
      }
    }
  });

  const formatScanMessage = (summary, fallbackFiles) => {
    const threats = summary?.threats_found ?? 0;
    const duration = summary?.duration || 'N/A';
    const files = summary?.files_scanned || fallbackFiles || 0;
    return `${threats} ameaças encontradas.\nDuração: ${duration}\n${files.toLocaleString()} arquivos verificados.`;
  };

  const handleUpdateDefinitions = async () => {
    const result = await updateDefinitions();
    if (result.success) {
      showAlert('Sucesso', 'Definições atualizadas com sucesso!', 'success');
    } else {
      showAlert('Erro', 'Erro ao atualizar: ' + result.error, 'error');
    }
  };

  const handleRemoveThreat = async (threatId) => {
    showConfirm(
      'Remover Ameaça',
      'Tem certeza que deseja remover esta ameaça?',
      async () => {
        const result = await removeThreat(threatId);
        if (result.success) {
          showAlert('Sucesso', 'Ameaça removida com sucesso!', 'success');
        } else {
          showAlert('Erro', 'Erro ao remover: ' + result.error, 'error');
        }
      }
    );
  };

  const handleClearAllThreats = async () => {
    showConfirm(
      'Limpar Histórico',
      'Tem certeza que deseja limpar todo o histórico de ameaças?',
      async () => {
        const result = await clearAllThreats();
        if (result.success) {
          showAlert('Sucesso', 'Histórico limpo com sucesso!', 'success');
        } else {
          showAlert('Erro', 'Erro ao limpar: ' + result.error, 'error');
        }
      }
    );
  };

  const subTabs = [
    { id: 'scan', icon: '🔍', label: 'Verificar' },
    { id: 'history', icon: '📋', label: 'Histórico' },
    { id: 'protection', icon: '🛡️', label: 'Proteção' }
  ];

  return (
    <div className="defender-page">
      <AlertModal {...alertModal} onClose={closeAlert} />
      <ConfirmModal {...confirmModal} onClose={closeConfirm} />

      {/* Stats Row */}
      <div className="stats-grid">
        <StatCard
          icon="🛡️"
          value={status?.is_enabled ? 'Ativo' : 'Inativo'}
          label="Proteção"
          variant={status?.is_enabled ? 'success' : 'danger'}
        />
        <StatCard
          icon="⚠️"
          value={totalThreats}
          label="Ameaças"
          variant={totalThreats > 0 ? 'warning' : 'success'}
        />
        <StatCard
          icon="📅"
          value={status?.last_scan || 'Nunca'}
          label="Último Scan"
          variant="info"
        />
      </div>

      {/* Sub Navigation */}
      <TabNav tabs={subTabs} activeTab={subTab} onTabChange={setSubTab} />

      {/* Scan Tab */}
      {subTab === 'scan' && (
        <Card icon="🛡️" title="Proteção do Sistema" subtitle="Escaneie seu sistema em busca de ameaças">
          {isScanning ? (
            <div className="scan-progress">
              <div className="scan-progress__icon">🔍</div>
              <h3>Scan em andamento...</h3>
              
              <div className="scan-progress__file">
                <code>{progress.currentFile}</code>
              </div>
              
              <div className="scan-progress__count">
                {progress.filesScanned.toLocaleString()} arquivos verificados
              </div>

              <Spinner size="medium" />

              <Button variant="danger" onClick={cancelScan}>
                ❌ Cancelar Scan
              </Button>
            </div>
          ) : (
            <div className="scan-grid">
              <ScanCard
                icon="⚡"
                title="Scan Rápido"
                description="Verifica áreas comuns onde ameaças costumam estar"
                duration="~2 minutos"
                onClick={() => startScan('quick')}
              />
              <ScanCard
                icon="🔍"
                title="Scan Completo"
                description="Verifica todos os arquivos e programas do sistema"
                duration="~1 hora"
                onClick={() => startScan('full')}
              />
              <ScanCard
                icon="📁"
                title="Scan Personalizado"
                description="Escolha pastas específicas para escanear"
                duration="Variável"
                onClick={() => startScan('custom')}
              />
              <ScanCard
                icon="🌐"
                title="Scan Offline"
                description="Reinicia o PC para remover ameaças persistentes"
                duration="~15 minutos"
                disabled
              />
            </div>
          )}
        </Card>
      )}

      {/* History Tab */}
      {subTab === 'history' && (
        <Card
          icon="📋"
          title="Histórico de Proteção"
          subtitle={totalThreats > 0 ? `${totalThreats} ameaça(s) detectada(s)` : 'Nenhuma ameaça detectada'}
          footer={
            totalThreats > 0 && (
              <Button variant="danger" onClick={handleClearAllThreats} loading={isClearing}>
                🗑️ Limpar Histórico
              </Button>
            )
          }
        >
          {threatsList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">✅</div>
              <h4>Tudo limpo!</h4>
              <p>Nenhuma ameaça foi detectada no seu sistema.</p>
            </div>
          ) : (
            <div className="threats-list">
              {threatsList.map((threat, index) => (
                <ThreatCard
                  key={threat.id || index}
                  threat={threat}
                  onRemove={handleRemoveThreat}
                  isRemoving={isRemoving === threat.id}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Protection Tab */}
      {subTab === 'protection' && (
        <Card icon="🛡️" title="Configurações de Proteção">
          <div className="protection-settings">
            <div className="protection-item">
              <div className="protection-item__info">
                <h4>Proteção em Tempo Real</h4>
                <p>Monitora arquivos e programas para ameaças</p>
              </div>
              <span className={`protection-status ${status?.is_enabled ? 'protection-status--active' : ''}`}>
                {status?.is_enabled ? '✅ Ativo' : '❌ Inativo'}
              </span>
            </div>

            <div className="protection-item">
              <div className="protection-item__info">
                <h4>Atualizar Definições</h4>
                <p>Baixa as últimas definições de vírus</p>
              </div>
              <Button variant="primary" onClick={handleUpdateDefinitions} loading={isUpdating}>
                🔄 Atualizar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default DefenderPage;
