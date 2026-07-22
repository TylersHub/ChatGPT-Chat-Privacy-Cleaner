import { ArrowRight, CheckCircle2, ExternalLink, Pin, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

function pinLabel(state) {
  if (state === 'pinned') return 'Pinned — protected';
  if (state === 'unpinned') return 'Unpinned';
  return 'Unknown — protected';
}

export function ReviewStep({ state, act, onNavigate }) {
  const [selected, setSelected] = useState(() => [...state.approvedIds]);
  const [busy, setBusy] = useState(false);
  const selectable = useMemo(() => state.candidates.filter((item) => item.pinState === 'unpinned'), [state.candidates]);

  function toggle(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function saveSelection() {
    setBusy(true);
    try {
      await act('/review', { approvedIds: selected });
      onNavigate('delete');
    } catch {
      // Shared feedback handles errors.
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen screen--review">
      <div className="screen-heading screen-heading--with-action">
        <div><h1>Review every match</h1><p>Select only chats you recognize and truly want to delete.</p></div>
        {selectable.length > 0 && (
          <button className="text-action" type="button" onClick={() => setSelected(selected.length === selectable.length ? [] : selectable.map((item) => item.id))}>
            {selected.length === selectable.length ? 'Clear selection' : 'Select all unpinned'}
          </button>
        )}
      </div>

      {!state.candidates.length ? (
        <div className="empty-state">
          <ShieldCheck size={42} strokeWidth={1.5} />
          <h2>{state.progress.stage === 'complete' ? 'No matching chats' : 'No scan results yet'}</h2>
          <p>{state.progress.stage === 'complete' ? 'Try adding another focused keyword and scan again.' : 'Run a scan before reviewing conversations.'}</p>
          <button className="button button--primary" type="button" onClick={() => onNavigate('scan')}>Go to Scan</button>
        </div>
      ) : (
        <>
          <div className="review-toolbar">
            <span><strong>{selected.length}</strong> selected for deletion</span>
            <span>{state.candidates.length - selectable.length} protected by pin safety</span>
          </div>
          <div className="candidate-list">
            {state.candidates.map((candidate) => {
              const canSelect = candidate.pinState === 'unpinned';
              const checked = selected.includes(candidate.id);
              return (
                <article className={`candidate-row ${checked ? 'is-selected' : ''} ${!canSelect ? 'is-protected' : ''}`} key={candidate.id}>
                  <label className="candidate-check">
                    <input type="checkbox" aria-label={`Select ${candidate.title}`} disabled={!canSelect} checked={checked} onChange={() => toggle(candidate.id)} />
                    <span className="custom-check" />
                  </label>
                  <div className="candidate-main">
                    <h2>{candidate.title}</h2>
                    <div className="match-terms">
                      {candidate.matchedKeywords.slice(0, 5).map((keyword) => <span key={keyword}>{keyword}</span>)}
                    </div>
                  </div>
                  <div className={`pin-state pin-state--${candidate.pinState}`}>
                    {candidate.pinState === 'unpinned' ? <CheckCircle2 size={17} /> : candidate.pinState === 'pinned' ? <Pin size={17} /> : <ShieldAlert size={17} />}
                    {pinLabel(candidate.pinState)}
                  </div>
                  <a className="icon-link" href={candidate.url} target="_blank" rel="noreferrer" aria-label={`Open ${candidate.title} in ChatGPT`}><ExternalLink size={18} /></a>
                </article>
              );
            })}
          </div>
          <div className="review-footer">
            <div className="safety-callout"><ShieldCheck size={19} /> Pinned and unknown-state chats cannot be selected.</div>
            <button className="button button--primary" type="button" disabled={!selected.length || busy} onClick={saveSelection}>
              {busy ? 'Saving…' : `Continue with ${selected.length}`} <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
