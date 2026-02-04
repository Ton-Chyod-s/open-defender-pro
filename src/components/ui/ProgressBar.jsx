import './ProgressBar.css';

export function ProgressBar({ value, max = 100, variant = 'primary', showLabel = false, animated = false }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="progress">
      <div 
        className={`progress__bar progress__bar--${variant} ${animated ? 'progress__bar--animated' : ''}`}
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="progress__label">{Math.round(percentage)}%</span>
      )}
    </div>
  );
}

export default ProgressBar;
