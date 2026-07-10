import { ArrowRight, CheckCircle2, Chrome, ExternalLink, LockKeyhole } from 'lucide-react';
import { useState } from 'react';

export function ConnectStep({ state, act, onNavigate }) {
  const [busy, setBusy] = useState(null);

  async function run(name, path) {
    setBusy(name);
    try {
      await act(path);
    } catch {
      // The shared feedback bar displays the request error.
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="screen screen--connect">
      <div className="screen-heading">
        <h1>Connect your ChatGPT account</h1>
        <p>Sign in once using a dedicated Chrome profile. Your everyday browser profile stays untouched.</p>
      </div>

      <div className="connect-layout">
        <div className="instruction-list" aria-label="Connection instructions">
          <div className="instruction-row">
            <span className="instruction-row__number">1</span>
            <div><h2>Open the sign-in window</h2><p>ClearSlate starts normal installed Chrome without automation controlling the login page.</p></div>
          </div>
          <div className="instruction-row">
            <span className="instruction-row__number">2</span>
            <div><h2>Sign in to ChatGPT</h2><p>Use your normal login method, including Google sign-in or two-factor authentication.</p></div>
          </div>
          <div className="instruction-row">
            <span className="instruction-row__number">3</span>
            <div><h2>Close that Chrome window</h2><p>The dedicated profile must be closed before ClearSlate can safely reopen it for scanning.</p></div>
          </div>
          <div className="instruction-row">
            <span className="instruction-row__number">4</span>
            <div><h2>Verify the connection</h2><p>ClearSlate checks for the ChatGPT home screen and closes the browser immediately.</p></div>
          </div>
        </div>

        <aside className="connection-panel">
          <span className={`connection-illustration ${state.connected ? 'is-connected' : ''}`}>
            {state.connected ? <CheckCircle2 size={54} strokeWidth={1.6} /> : <Chrome size={54} strokeWidth={1.5} />}
          </span>
          <h2>{state.connected ? 'Connection verified' : 'Ready to connect'}</h2>
          <p>{state.connected ? 'This dedicated profile is signed in and ready for scanning.' : 'Chrome will open separately. Return here after you finish signing in.'}</p>
          {!state.connected && (
            <>
              <button className="button button--primary button--wide" type="button" disabled={Boolean(busy)} onClick={() => run('open', '/login/open')}>
                <ExternalLink size={18} /> {busy === 'open' ? 'Opening Chrome…' : 'Open Chrome to sign in'}
              </button>
              <button className="button button--secondary button--wide" type="button" disabled={Boolean(busy) || !state.loginOpened} onClick={() => run('verify', '/login/verify')}>
                {busy === 'verify' ? 'Checking…' : 'I signed in and closed Chrome'}
              </button>
            </>
          )}
          {state.connected && (
            <button className="button button--primary button--wide" type="button" onClick={() => onNavigate('keywords')}>
              Choose keywords <ArrowRight size={18} />
            </button>
          )}
          <div className="privacy-line"><LockKeyhole size={16} /> Login data stays in the local dedicated profile.</div>
        </aside>
      </div>
    </section>
  );
}

