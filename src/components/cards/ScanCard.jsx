import { Card, Badge } from '../ui';
import './ScanCard.css';

export function ScanCard({ icon, title, description, duration, onClick, disabled = false }) {
  return (
    <Card 
      variant="interactive" 
      onClick={disabled ? undefined : onClick}
      className={`scan-card ${disabled ? 'scan-card--disabled' : ''}`}
    >
      <div className="scan-card__content">
        <div className="scan-card__icon">{icon}</div>
        <h4 className="scan-card__title">{title}</h4>
        <p className="scan-card__description">{description}</p>
        <Badge variant="muted" size="small">{duration}</Badge>
      </div>
    </Card>
  );
}

export default ScanCard;
