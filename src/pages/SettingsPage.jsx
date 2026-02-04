import { Card } from '../components/ui';
import './SettingsPage.css';

export function SettingsPage() {
  return (
    <div className="settings-page">
      <Card icon="⚙️" title="Configurações" subtitle="Configure as opções do DefenderPro">
        <div className="settings-section">
          <h4>Geral</h4>
          <div className="settings-item">
            <div className="settings-item__info">
              <span>Iniciar com o Windows</span>
              <small>O DefenderPro será iniciado automaticamente</small>
            </div>
            <label className="toggle">
              <input type="checkbox" />
              <span className="toggle__slider"></span>
            </label>
          </div>
          
          <div className="settings-item">
            <div className="settings-item__info">
              <span>Notificações</span>
              <small>Receber alertas de ameaças detectadas</small>
            </div>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle__slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h4>Sobre</h4>
          <div className="settings-about">
            <p><strong>DefenderPro</strong> v1.0.0</p>
            <p>Interface profissional para Windows Defender</p>
            <p className="settings-about__link">
              <a href="https://github.com/Ton-Chyod-s/open-defender-pro" target="_blank" rel="noopener noreferrer">
                📦 GitHub Repository
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SettingsPage;
