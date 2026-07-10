import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { FeedbackBar } from './components/FeedbackBar.jsx';
import { HelpDialog } from './components/HelpDialog.jsx';
import { StepRail } from './components/StepRail.jsx';
import { useAppState } from './hooks/useAppState.js';
import { ConnectStep } from './screens/ConnectStep.jsx';
import { DeleteStep } from './screens/DeleteStep.jsx';
import { KeywordsStep } from './screens/KeywordsStep.jsx';
import { ReviewStep } from './screens/ReviewStep.jsx';
import { SafetyStep } from './screens/SafetyStep.jsx';
import { ScanStep } from './screens/ScanStep.jsx';
import { SettingsStep } from './screens/SettingsStep.jsx';

export function App() {
  const { state, requestError, act } = useAppState();
  const [active, setActive] = useState('connect');
  const [helpOpen, setHelpOpen] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [active]);

  useEffect(() => {
    if (!state?.notice) return undefined;
    setNoticeHidden(false);
    const timer = window.setTimeout(() => setNoticeHidden(true), 4500);
    return () => window.clearTimeout(timer);
  }, [state?.notice]);

  if (!state) {
    return <main className="loading-screen"><LoaderCircle className="spin" size={28} /><span>Starting ClearSlate…</span></main>;
  }

  const shared = { state, act, onNavigate: setActive };
  let screen;
  if (active === 'connect') screen = <ConnectStep {...shared} />;
  else if (active === 'keywords') screen = <KeywordsStep {...shared} />;
  else if (active === 'scan') screen = <ScanStep {...shared} />;
  else if (active === 'review') screen = <ReviewStep {...shared} />;
  else if (active === 'delete') screen = <DeleteStep {...shared} />;
  else if (active === 'safety') screen = <SafetyStep />;
  else screen = <SettingsStep state={state} act={act} />;

  return (
    <div className="app-shell">
      <StepRail active={active} onNavigate={setActive} />
      <div className="app-workspace">
        <AppHeader connected={state.connected} onHelp={() => setHelpOpen(true)} />
        <FeedbackBar error={requestError || state.error} notice={!requestError && !state.error && !noticeHidden ? state.notice : null} />
        <main className="app-main">{screen}</main>
      </div>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} onNavigate={setActive} />
    </div>
  );
}
