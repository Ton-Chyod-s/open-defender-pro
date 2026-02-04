import './Card.css';

export function Card({ icon, title, subtitle, children, footer, variant = 'default', onClick, className = '' }) {
  const isClickable = !!onClick;
  
  return (
    <div 
      className={`card card--${variant} ${isClickable ? 'card--clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {(icon || title) && (
        <div className="card__header">
          {icon && <span className="card__icon">{icon}</span>}
          {title && (
            <div className="card__title">
              <h3>{title}</h3>
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
        </div>
      )}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}

export default Card;
