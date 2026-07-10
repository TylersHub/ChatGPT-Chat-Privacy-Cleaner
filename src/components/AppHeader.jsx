import { CircleHelp } from 'lucide-react';

export function AppHeader({ connected, onHelp }) {
  return (
    <header className="app-header">
      <div className="local-status" title="ClearSlate runs on this computer">
        <span className="local-status__dot" />
        Local only
      </div>
      <span className="header-divider" />
      <div className={`connection-status ${connected ? 'is-connected' : ''}`}>
        {connected ? 'ChatGPT connected' : 'ChatGPT not verified'}
      </div>
      <button className="icon-text-button" type="button" onClick={onHelp}>
        <CircleHelp size={19} strokeWidth={1.8} /> Help
      </button>
    </header>
  );
}

