import './Badge.css';

export function Badge({ children, variant = 'default', size = 'medium', icon }) {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {icon && <span className="badge__icon">{icon}</span>}
      {children}
    </span>
  );
}

export default Badge;
