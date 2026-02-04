import './Button.css';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  icon, 
  disabled = false, 
  loading = false,
  onClick,
  className = '',
  ...props 
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${loading ? 'btn--loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn__spinner" />}
      {icon && !loading && <span className="btn__icon">{icon}</span>}
      <span className="btn__text">{children}</span>
    </button>
  );
}

export default Button;
