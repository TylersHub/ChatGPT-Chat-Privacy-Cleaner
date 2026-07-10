export function ProgressBar({ value, label }) {
  const percent = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="progress" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} role="progressbar">
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress__value">{percent}%</span>
    </div>
  );
}

