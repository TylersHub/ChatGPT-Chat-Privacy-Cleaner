import { ArrowRight, Check, Clock3, FileSearch, Pin, Search, ShieldCheck, Square, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProgressBar } from '../components/ProgressBar.jsx';

export function ScanStep({ state, act, onNavigate }) {
  const [busy, setBusy] = useState(false);
  const scanning = state.job === 'scan';
  const hasResults = state.candidates.length > 0 && !scanning;
  const counts = useMemo(() => ({
    unpinned: state.candidates.filter((item) => item.pinState === 'unpinned').length,
    pinned: state.candidates.filter((item) => item.pinState === 'pinned').length,
    unknown: state.candidates.filter((item) => item.pinState === 'unknown').length
  }), [state.candidates]);

  async function startScan() {
    setBusy(true);
    try {
      await act('/scan/start');
    } catch {
      // Shared feedback handles errors.
    } finally {
      setBusy(false);
    }
  }

  if (!scanning && !hasResults) {
    return (
      <section className="screen screen--scan-ready">
        <div className="screen-heading">
          <h1>Ready to scan</h1>
          <p>ClearSlate will search through ChatGPT using your saved keywords. Scanning never deletes chats.</p>
        </div>
        <div className="scan-ready-layout">
          <div className="scan-ready-copy">
            <h2>{state.keywords.length} saved keyword{state.keywords.length === 1 ? '' : 's'}</h2>
            <div className="keyword-preview">
              {state.keywords.slice(0, 12).map((keyword) => <span key={keyword}>{keyword}</span>)}
              {state.keywords.length > 12 && <span>+{state.keywords.length - 12} more</span>}
            </div>
            <div className="safety-callout"><ShieldCheck size={19} /> Nothing is deleted during scanning.</div>
            <button className="button button--primary" type="button" disabled={busy || !state.connected || !state.keywords.length} onClick={startScan}>
              <Search size={18} /> {busy ? 'Starting…' : 'Start scan'}
            </button>
            {!state.connected && <p className="field-hint">Return to Connect and verify your ChatGPT session first.</p>}
          </div>
          <div className="scan-visual scan-visual--idle" aria-hidden="true"><Search size={54} strokeWidth={1.4} /></div>
        </div>
      </section>
    );
  }

  return (
    <section className="screen screen--scan">
      <div className="screen-heading">
        <h1>{scanning ? 'Finding matching chats' : 'Scan complete'}</h1>
        <p>{scanning ? 'Keep this window open while ClearSlate searches your ChatGPT history.' : 'Review the matches and decide what should stay.'}</p>
      </div>

      <div className="progress-section">
        <div className="progress-section__label">
          <div><span>Search progress</span><strong>{state.progress.label || 'Complete'}</strong></div>
          {scanning && <button className="button button--secondary button--small" type="button" onClick={() => act('/job/cancel')}><Square size={14} fill="currentColor" /> Cancel scan</button>}
        </div>
        <ProgressBar value={scanning ? state.progress.percent : 100} label="Chat search progress" />
      </div>

      <div className="scan-status-layout">
        <div className="activity-region">
          <h2>Current activity</h2>
          <div className="activity-list" aria-live="polite">
            {scanning && state.progress.label && (
              <div className="activity-row is-active"><span className="spinner" /><span>{state.progress.label}</span></div>
            )}
            {state.progress.activity.map((item) => (
              <div className={`activity-row is-${item.tone}`} key={item.id}>
                {item.tone === 'success' ? <Check size={18} /> : item.tone === 'warning' ? <TriangleAlert size={18} /> : <Clock3 size={18} />}
                <span>{item.message}</span>
              </div>
            ))}
            {!state.progress.activity.length && !scanning && <div className="activity-row is-muted"><Check size={18} /><span>All keywords processed.</span></div>}
          </div>
          <div className="safety-callout"><ShieldCheck size={19} /> Nothing is deleted during scanning.</div>
        </div>

        <aside className="match-summary">
          <h2>Matches so far</h2>
          <div className="match-count"><strong>{state.candidates.length}</strong> chats</div>
          <div className="summary-row"><FileSearch size={18} /><span>{counts.unpinned} unpinned</span></div>
          <div className="summary-row"><Pin size={18} /><span>{counts.pinned} pinned — protected</span></div>
          <div className="summary-row summary-row--warning"><TriangleAlert size={18} /><span>{counts.unknown} need review</span></div>
          <div className={`scan-visual ${scanning ? 'is-running' : ''}`} aria-hidden="true"><Search size={45} strokeWidth={1.5} /></div>
        </aside>
      </div>

      <div className="next-step-row">
        <div><h2>What happens next</h2><p>You’ll review every match before anything can be deleted.</p></div>
        <button className="button button--secondary" type="button" disabled={scanning} onClick={() => onNavigate('review')}>Review matches <ArrowRight size={18} /></button>
      </div>
    </section>
  );
}

