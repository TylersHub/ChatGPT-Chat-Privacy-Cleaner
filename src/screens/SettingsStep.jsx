import { Chrome, FolderOpen, RefreshCcw, Settings2 } from 'lucide-react';
import { useState } from 'react';

export function SettingsStep({ state, act }) {
  const [busy, setBusy] = useState(false);

  async function resetSession() {
    setBusy(true);
    try {
      await act('/session/reset');
    } catch {
      // Shared feedback handles errors.
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen screen--settings">
      <div className="screen-heading">
        <h1>Settings</h1>
        <p>ClearSlate uses fixed local folders so its behavior is easy to inspect and audit.</p>
      </div>
      <div className="settings-list">
        <div className="settings-row"><Chrome size={21} /><div><strong>Google Chrome</strong><code>{state.paths.browser || 'Not detected'}</code></div></div>
        <div className="settings-row"><FolderOpen size={21} /><div><strong>Dedicated profile</strong><code>{state.paths.profile}</code></div></div>
        <div className="settings-row"><FolderOpen size={21} /><div><strong>Local reports</strong><code>{state.paths.output}</code></div></div>
      </div>
      <div className="settings-action">
        <span><Settings2 size={22} /><span><strong>Clear the current review</strong><small>Keeps your saved keywords and ChatGPT login.</small></span></span>
        <button className="button button--secondary" type="button" disabled={busy || Boolean(state.job)} onClick={resetSession}><RefreshCcw size={17} /> {busy ? 'Clearing…' : 'Clear review'}</button>
      </div>
      <p className="config-note">Advanced users can copy <code>config.example.json</code> to <code>config.json</code> to change the Chrome path, local port, or timing values.</p>
    </section>
  );
}

