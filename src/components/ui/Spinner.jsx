import './Spinner.css';

export function Spinner({ size = 'medium', label }) {
  return (
    <div className={`spinner-wrapper spinner--${size}`}>
      <div className="spinner" />
      {label && <span className="spinner__label">{label}</span>}
    </div>
  );
}

export default Spinner;
