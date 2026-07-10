import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export function FeedbackBar({ error, notice, onDismiss }) {
  const message = error || notice;
  if (!message) return null;
  const Icon = error ? AlertTriangle : CheckCircle2;
  return (
    <div className={`feedback-bar ${error ? 'feedback-bar--error' : 'feedback-bar--success'}`} role={error ? 'alert' : 'status'}>
      <Icon size={18} strokeWidth={2} />
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message">
          <X size={17} />
        </button>
      )}
    </div>
  );
}

