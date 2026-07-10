import { Check, ShieldCheck, Square, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { ProgressBar } from '../components/ProgressBar.jsx';

export function DeleteStep({ state, act, onNavigate }) {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = state.candidates.filter((item) => state.approvedIds.includes(item.id));
  const deleting = state.job === 'delete';
  const exactConfirmation = `DELETE ${selected.length}`;

  async function startDelete() {
    setBusy(true);
    try {
      await act('/delete/start', { confirmation });
    } catch {
      // Shared feedback handles errors.
    } finally {
      setBusy(false);
    }
  }

  async function startAnotherReview() {
    await act('/session/reset');
    onNavigate('scan');
  }

  return (
    <section className="screen screen--delete">
      <div className="screen-heading">
        <h1>{deleting ? 'Deleting approved chats' : state.deletionResults.length ? 'Deletion run complete' : 'Final confirmation'}</h1>
        <p>{deleting ? 'Keep this window open. ClearSlate rechecks each chat before deleting it.' : 'Deletion is permanent and cannot be undone through the ChatGPT interface.'}</p>
      </div>

      {!selected.length && !state.deletionResults.length ? (
        <div className="empty-state empty-state--warning">
          <TriangleAlert size={42} strokeWidth={1.5} />
          <h2>No chats selected</h2>
          <p>Choose unpinned chats in Review before continuing.</p>
          <button className="button button--primary" type="button" onClick={() => onNavigate('review')}>Return to Review</button>
        </div>
      ) : deleting ? (
        <div className="delete-progress-layout">
          <div className="progress-section">
            <div className="progress-section__label">
              <div><span>Deletion progress</span><strong>{state.progress.label}</strong></div>
              <button className="button button--secondary button--small" type="button" onClick={() => act('/job/cancel')}><Square size={14} fill="currentColor" /> Stop</button>
            </div>
            <ProgressBar value={state.progress.percent} label="Deletion progress" />
          </div>
          <div className="activity-list delete-activity">
            {state.progress.activity.map((item) => (
              <div className={`activity-row is-${item.tone}`} key={item.id}>
                {item.tone === 'success' ? <Check size={18} /> : <TriangleAlert size={18} />}
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : state.deletionResults.length ? (
        <div className="results-summary">
          <div className="result-stat result-stat--success"><strong>{state.deletionResults.filter((item) => item.status === 'deleted').length}</strong><span>Deleted</span></div>
          <div className="result-stat"><strong>{state.deletionResults.filter((item) => item.status === 'skipped').length}</strong><span>Protected</span></div>
          <div className="result-stat result-stat--warning"><strong>{state.deletionResults.filter((item) => item.status === 'error').length}</strong><span>Errors</span></div>
          <div className="result-list">
            {state.deletionResults.map((item) => <div key={item.id}><span>{item.title}</span><strong className={`status-text status-text--${item.status}`}>{item.status}</strong></div>)}
          </div>
          <button className="button button--secondary" type="button" onClick={startAnotherReview}>Start another review</button>
        </div>
      ) : (
        <div className="confirm-layout">
          <div className="approved-list">
            <h2>{selected.length} approved chat{selected.length === 1 ? '' : 's'}</h2>
            {selected.map((item) => <div key={item.id}><ShieldCheck size={17} /><span>{item.title}</span><span>Unpinned</span></div>)}
          </div>
          <aside className="danger-panel">
            <Trash2 size={30} strokeWidth={1.6} />
            <h2>Confirm permanent deletion</h2>
            <p>Type <strong>{exactConfirmation}</strong> to verify the exact count.</p>
            <label className="field-label" htmlFor="delete-confirmation">Confirmation</label>
            <input id="delete-confirmation" value={confirmation} autoComplete="off" placeholder={exactConfirmation} onChange={(event) => setConfirmation(event.target.value)} />
            <button className="button button--danger button--wide" type="button" disabled={busy || confirmation !== exactConfirmation} onClick={startDelete}>
              <Trash2 size={18} /> {busy ? 'Starting…' : `Delete ${selected.length} chats`}
            </button>
            <p className="danger-note">Each chat’s ID and pin state will be checked again immediately before deletion.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
