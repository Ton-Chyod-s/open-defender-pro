// ============================================
// DEFENDER PRO - LAYOUT ESTILO CCLEANER
// Estrutura com sidebar lateral
// ============================================

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App-CCleaner-Style.css';

function App() {
  const [activeTab, setActiveTab] = useState('cleaner');
  const [threats, setThreats] = useState(null);

  return (
    <div className="app-layout">
      {/* SIDEBAR LATERAL */}
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
            className={`nav-item ${activeTab === 'registry' ? 'active' : ''}`}
            onClick={() => setActiveTab('registry')}
          >
            <span className="nav-item-icon">📋</span>
            <span>Registry</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            <span className="nav-item-icon">🔧</span>
            <span>Tools</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'threats' ? 'active' : ''}`}
            onClick={() => setActiveTab('threats')}
          >
            <span className="nav-item-icon">⚠️</span>
            <span>Ameaças</span>
            {threats && threats.total_threats > 0 && (
              <span className="nav-badge">{threats.total_threats}</span>
            )}
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

      {/* ÁREA DE CONTEÚDO */}
      <main className="content-area">
        {/* Header superior */}
        <header className="content-header">
          <h2>
            {activeTab === 'cleaner' && 'Windows Cleaner'}
            {activeTab === 'registry' && 'Registry'}
            {activeTab === 'tools' && 'Ferramentas'}
            {activeTab === 'threats' && 'Gerenciar Ameaças'}
            {activeTab === 'settings' && 'Configurações'}
          </h2>
          <div className="header-actions">
            <button className="btn btn-secondary">
              🔄 Atualizar
            </button>
            <button className="btn btn-primary">
              ⚡ Scan Rápido
            </button>
          </div>
        </header>

        {/* Conteúdo com scroll */}
        <div className="content-scroll">
          {activeTab === 'cleaner' && <CleanerTab />}
          {activeTab === 'threats' && <ThreatsTab threats={threats} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

// ============================================
// TAB CLEANER (ESTILO CCLEANER)
// ============================================

function CleanerTab() {
  const [selectedItems, setSelectedItems] = useState({
    tempFiles: true,
    cookies: true,
    cache: true,
    logs: false,
    downloads: false
  });

  const toggleItem = (key) => {
    setSelectedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <>
      {/* Card Internet Explorer */}
      <div className="cleaner-card">
        <div className="card-header">
          <span className="card-header-icon">🌐</span>
          <div className="card-header-title">
            <h3>Internet Explorer</h3>
            <p>Navegador padrão do Windows</p>
          </div>
        </div>
        <div className="card-body">
          <ul className="cleaner-list">
            <li className="cleaner-item" onClick={() => toggleItem('tempFiles')}>
              <div className={`cleaner-checkbox ${selectedItems.tempFiles ? 'checked' : ''}`}></div>
              <div className="cleaner-item-content">
                <div className="cleaner-item-title">Arquivos Temporários</div>
                <div className="cleaner-item-desc">Arquivos de internet temporários e cache</div>
              </div>
              <div className="cleaner-item-size">245 MB</div>
            </li>
            
            <li className="cleaner-item" onClick={() => toggleItem('cookies')}>
              <div className={`cleaner-checkbox ${selectedItems.cookies ? 'checked' : ''}`}></div>
              <div className="cleaner-item-content">
                <div className="cleaner-item-title">Cookies</div>
                <div className="cleaner-item-desc">Cookies de sites visitados</div>
              </div>
              <div className="cleaner-item-size">12 MB</div>
            </li>

            <li className="cleaner-item" onClick={() => toggleItem('cache')}>
              <div className={`cleaner-checkbox ${selectedItems.cache ? 'checked' : ''}`}></div>
              <div className="cleaner-item-content">
                <div className="cleaner-item-title">Cache</div>
                <div className="cleaner-item-desc">Cache de páginas e imagens</div>
              </div>
              <div className="cleaner-item-size">89 MB</div>
            </li>
          </ul>
        </div>
      </div>

      {/* Card Windows */}
      <div className="cleaner-card">
        <div className="card-header">
          <span className="card-header-icon">🪟</span>
          <div className="card-header-title">
            <h3>Windows</h3>
            <p>Sistema operacional</p>
          </div>
        </div>
        <div className="card-body">
          <ul className="cleaner-list">
            <li className="cleaner-item" onClick={() => toggleItem('logs')}>
              <div className={`cleaner-checkbox ${selectedItems.logs ? 'checked' : ''}`}></div>
              <div className="cleaner-item-content">
                <div className="cleaner-item-title">Arquivos de Log</div>
                <div className="cleaner-item-desc">Logs do sistema e aplicativos</div>
              </div>
              <div className="cleaner-item-size">67 MB</div>
            </li>

            <li className="cleaner-item" onClick={() => toggleItem('downloads')}>
              <div className={`cleaner-checkbox ${selectedItems.downloads ? 'checked' : ''}`}></div>
              <div className="cleaner-item-content">
                <div className="cleaner-item-title">Downloads Antigos</div>
                <div className="cleaner-item-desc">Arquivos com mais de 30 dias</div>
              </div>
              <div className="cleaner-item-size">1.2 GB</div>
            </li>
          </ul>
        </div>
      </div>

      {/* Botão de ação */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary" style={{ fontSize: '16px', padding: '14px 32px' }}>
          🧹 Executar Limpeza
        </button>
        <button className="btn btn-secondary">
          ⚙️ Opções
        </button>
      </div>
    </>
  );
}

// ============================================
// TAB AMEAÇAS
// ============================================

function ThreatsTab({ threats }) {
  if (!threats || threats.total_threats === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Nenhuma ameaça detectada</h2>
        <p style={{ color: '#5f6368' }}>Seu sistema está protegido</p>
      </div>
    );
  }

  return (
    <>
      {threats.threats.map((threat, index) => (
        <div key={index} className="threat-item">
          <div className="threat-header">
            <span className="threat-icon">⚠️</span>
            <span className="threat-title">{threat.threat_name}</span>
            <span className={`threat-severity ${threat.severity.toLowerCase()}`}>
              {threat.severity}
            </span>
          </div>
          <div className="threat-body">
            <div className="threat-path">📁 {threat.file_path}</div>
            <div>Detectado em: {threat.detected_time}</div>
            <div className="threat-actions">
              <button className="btn btn-danger" style={{ fontSize: '12px', padding: '6px 16px' }}>
                🗑️ Remover
              </button>
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 16px' }}>
                🔒 Quarentena
              </button>
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 16px' }}>
                ℹ️ Detalhes
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ============================================
// TAB CONFIGURAÇÕES
// ============================================

function SettingsTab() {
  return (
    <div className="cleaner-card">
      <div className="card-header">
        <span className="card-header-icon">⚙️</span>
        <div className="card-header-title">
          <h3>Configurações</h3>
          <p>Personalize o DefenderPro</p>
        </div>
      </div>
      <div className="card-body">
        <ul className="cleaner-list">
          <li className="cleaner-item">
            <div className="cleaner-checkbox checked"></div>
            <div className="cleaner-item-content">
              <div className="cleaner-item-title">Iniciar com o Windows</div>
              <div className="cleaner-item-desc">Executar automaticamente ao ligar o PC</div>
            </div>
          </li>
          <li className="cleaner-item">
            <div className="cleaner-checkbox"></div>
            <div className="cleaner-item-content">
              <div className="cleaner-item-title">Minimizar para bandeja</div>
              <div className="cleaner-item-desc">Minimizar para a área de notificação</div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;