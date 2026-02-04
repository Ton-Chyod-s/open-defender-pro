import { Card, Badge, Button } from '../ui';
import './ThreatCard.css';

const severityConfig = {
  high: { variant: 'danger', label: 'Alta', icon: '🔴' },
  medium: { variant: 'warning', label: 'Média', icon: '🟠' },
  low: { variant: 'success', label: 'Baixa', icon: '🟡' },
  unknown: { variant: 'default', label: 'Desconhecida', icon: '⚪' }
};

export function ThreatCard({ threat, onRemove, onQuarantine, isRemoving = false }) {
  const severity = severityConfig[threat.severity?.toLowerCase()] || severityConfig.unknown;

  return (
    <Card variant={severity.variant} className="threat-card">
      <div className="threat-card__content">
        <div className="threat-card__info">
          <div className="threat-card__header">
            <span className="threat-card__icon">{severity.icon}</span>
            <h4 className="threat-card__name">{threat.name || 'Ameaça Desconhecida'}</h4>
            <Badge variant={severity.variant} size="small">
              Severidade {severity.label}
            </Badge>
          </div>
          
          <div className="threat-card__details">
            {threat.path && (
              <div className="threat-card__path">
                <span className="threat-card__label">Caminho:</span>
                <code>{threat.path}</code>
              </div>
            )}
            {threat.type && (
              <div className="threat-card__type">
                <span className="threat-card__label">Tipo:</span>
                <span>{threat.type}</span>
              </div>
            )}
          </div>
        </div>

        <div className="threat-card__actions">
          {onQuarantine && (
            <Button variant="secondary" size="small" onClick={() => onQuarantine(threat.id)}>
              🔒 Quarentena
            </Button>
          )}
          {onRemove && (
            <Button 
              variant="danger" 
              size="small" 
              onClick={() => onRemove(threat.id)}
              loading={isRemoving}
            >
              🗑️ Remover
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default ThreatCard;
