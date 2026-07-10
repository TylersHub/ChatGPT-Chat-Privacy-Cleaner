import { Database, EyeOff, KeyRound, LockKeyhole, Pin, ShieldCheck } from 'lucide-react';

export function SafetyStep() {
  const safeguards = [
    { icon: Pin, title: 'Pinned chats are protected', text: 'Only chats whose menu positively shows Pin — meaning they are currently unpinned — can be selected.' },
    { icon: ShieldCheck, title: 'Every deletion is rechecked', text: 'ClearSlate reopens the approved URL and verifies the conversation ID and current pin state immediately before deletion.' },
    { icon: EyeOff, title: 'Conversation bodies are not saved', text: 'Visible chat text is used only in memory while scanning. Reports contain titles, URLs, keyword matches, and safety status.' },
    { icon: KeyRound, title: 'Your API key is never stored', text: 'The optional OpenAI key is used for one keyword-generation request and is not written to disk or application state.' },
    { icon: Database, title: 'Reports stay on this computer', text: 'Scan and deletion reports are written to the local output folder so you can audit what happened.' },
    { icon: LockKeyhole, title: 'No private or undocumented APIs', text: 'ClearSlate uses the visible ChatGPT interface. It never asks you to paste cookies, tokens, or browser profile data.' }
  ];

  return (
    <section className="screen screen--safety">
      <div className="screen-heading">
        <h1>Safety by default</h1>
        <p>ClearSlate is deliberately conservative. Uncertainty means keep, not delete.</p>
      </div>
      <div className="safety-list">
        {safeguards.map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <span><Icon size={22} strokeWidth={1.7} /></span>
            <div><h2>{title}</h2><p>{text}</p></div>
          </article>
        ))}
      </div>
      <div className="warning-band">
        <h2>Deletion is permanent</h2>
        <p>Export your ChatGPT account data first if you may need a backup. ChatGPT’s interface and retention behavior can change over time.</p>
      </div>
    </section>
  );
}

