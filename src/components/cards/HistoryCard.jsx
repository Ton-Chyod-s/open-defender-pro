import { Card, Badge } from '../ui';
import './HistoryCard.css';

export function HistoryCard({ scan }) {
  const statusConfig = {
    completed: { variant: 'success', label: 'Concluído', icon: '✅' },
    running: { variant: 'primary', label: 'Em andamento', icon: '🔄' },
    failed: { variant: 'danger', label: 'Falhou', icon: '❌' },
    cancelled: { variant: 'warning', label: 'Cancelado', icon: '⚠️' }
  };

  const status = statusConfig[scan.status] || statusConfig.completed;

  return (
    <Card className="history-card">
      <div className="history-card__content">
        <div className="history-card__icon">{status.icon}</div>
        
        <div className="history-card__info">
          <h4 className="history-card__title">{scan.scan_type || 'Verificação'}</h4>
          <div className="history-card__meta">
            <span>📅 {scan.start_time}</span>
            {scan.end_time && scan.end_time !== 'Em andamento' && (
              <span>⏱️ {scan.end_time}</span>
            )}
          </div>
        </div>

        <div className="history-card__stats">
          <Badge variant={scan.threats_found > 0 ? 'danger' : 'success'}>
            {scan.threats_found || 0} ameaça(s)
          </Badge>
          <span className="history-card__files">
            {(scan.files_scanned || 0).toLocaleString()} arquivos
          </span>
        </div>
      </div>
    </Card>
  );
}

export default HistoryCard;
