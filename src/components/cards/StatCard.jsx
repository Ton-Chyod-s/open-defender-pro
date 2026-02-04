import { Card, Badge } from '../ui';
import './StatCard.css';

export function StatCard({ icon, value, label, variant = 'default', trend }) {
  return (
    <Card className={`stat-card stat-card--${variant}`}>
      <div className="stat-card__content">
        <div className="stat-card__icon-wrapper">
          <span className="stat-card__icon">{icon}</span>
        </div>
        <div className="stat-card__data">
          <div className="stat-card__value">{value}</div>
          <div className="stat-card__label">{label}</div>
          {trend && (
            <Badge variant={trend > 0 ? 'danger' : 'success'} size="small">
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

export default StatCard;
