import { ArrowRight, X } from 'lucide-react';

export function HelpDialog({ open, onClose, onNavigate }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close help"><X size={20} /></button>
        <h2 id="help-title">Quick start</h2>
        <ol className="help-steps">
          <li><strong>Connect.</strong> Sign in through the normal Chrome window ClearSlate opens.</li>
          <li><strong>Choose keywords.</strong> Add your own or generate suggestions with OpenAI.</li>
          <li><strong>Scan.</strong> ClearSlate searches through the visible ChatGPT interface.</li>
          <li><strong>Review.</strong> Select only the unpinned matches you recognize.</li>
          <li><strong>Delete.</strong> Confirm the exact count before permanent deletion begins.</li>
        </ol>
        <button className="button button--primary" type="button" onClick={() => { onNavigate('connect'); onClose(); }}>
          Go to Connect <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}

