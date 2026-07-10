import { ArrowRight, Eye, EyeOff, LockKeyhole, Plus, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function mergeKeywords(current, incoming) {
  const seen = new Set();
  return [...current, ...incoming].filter((keyword) => {
    const key = keyword.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
}

export function KeywordsStep({ state, act, onNavigate }) {
  const [keywords, setKeywords] = useState(state.keywords);
  const [input, setInput] = useState('');
  const [description, setDescription] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setKeywords(state.keywords);
  }, [dirty, state.keywords]);

  const keywordCount = `${keywords.length} keyword${keywords.length === 1 ? '' : 's'}`;

  function addKeyword() {
    const next = input.trim().replace(/\s+/g, ' ');
    if (!next) return;
    setKeywords((current) => mergeKeywords(current, [next]));
    setInput('');
    setDirty(true);
  }

  async function save() {
    setBusy('save');
    try {
      await act('/keywords', { keywords });
      setDirty(false);
    } catch {
      // Shared feedback handles errors.
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy('generate');
    try {
      const result = await act('/keywords/generate', { description, apiKey });
      setKeywords((current) => mergeKeywords(current, result.keywords));
      setApiKey('');
      setDirty(true);
    } catch {
      // Shared feedback handles errors.
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="screen screen--keywords">
      <div className="screen-heading">
        <h1>Choose what to look for</h1>
        <p>Add terms that may appear in chats you want to review.</p>
      </div>

      <div className="keyword-layout">
        <div className="keyword-composer">
          <label className="field-label" htmlFor="keyword-input">Add a keyword</label>
          <div className="inline-input">
            <input id="keyword-input" value={input} maxLength={80} placeholder="e.g. passport number" onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addKeyword(); } }} />
            <button className="button button--primary" type="button" onClick={addKeyword} disabled={!input.trim()}><Plus size={18} /> Add</button>
          </div>

          <div className="keyword-list" aria-live="polite">
            {keywords.length ? keywords.map((keyword) => (
              <span className="keyword-chip" key={keyword.toLocaleLowerCase()}>
                {keyword}
                <button type="button" aria-label={`Remove ${keyword}`} onClick={() => { setKeywords((current) => current.filter((item) => item !== keyword)); setDirty(true); }}><X size={15} /></button>
              </span>
            )) : <p className="empty-inline">No keywords yet. Add a focused phrase to begin.</p>}
          </div>

          <div className="keyword-actions">
            <span>{keywordCount}</span>
            <button className="button button--primary" type="button" disabled={!keywords.length || Boolean(busy)} onClick={save}>
              {busy === 'save' ? 'Saving…' : 'Save keywords'}
            </button>
          </div>
        </div>

        <aside className="ai-panel">
          <div className="panel-title"><Sparkles size={23} strokeWidth={1.8} /><h2>Draft with AI</h2></div>
          <label className="field-label" htmlFor="ai-description">What kinds of conversations are you concerned about?</label>
          <textarea id="ai-description" rows="6" maxLength={2000} placeholder="For example: financial details, health concerns, account access, private plans…" value={description} onChange={(event) => setDescription(event.target.value)} />
          <label className="field-label" htmlFor="api-key">OpenAI API key</label>
          <div className="password-input">
            <input id="api-key" type={showKey ? 'text' : 'password'} autoComplete="off" value={apiKey} placeholder="sk-…" onChange={(event) => setApiKey(event.target.value)} />
            <button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <p className="privacy-note"><LockKeyhole size={15} /> Sent to OpenAI only when you generate. Your key is never saved.</p>
          <button className="button button--dark button--wide" type="button" disabled={Boolean(busy) || !apiKey || description.trim().length < 12} onClick={generate}>
            <Sparkles size={18} /> {busy === 'generate' ? 'Generating…' : 'Generate suggestions'}
          </button>
        </aside>
      </div>

      <div className="how-it-works">
        <h2>How this works</h2>
        <div className="how-it-works__steps">
          <div><span className="how-icon"><Search size={25} /></span><strong>Search</strong><p>ClearSlate searches your ChatGPT history for these terms.</p></div>
          <div><span className="how-icon">2</span><strong>Review</strong><p>You inspect every matching chat and its pin state.</p></div>
          <div><span className="how-icon">3</span><strong>Confirm</strong><p>You choose what to delete. Nothing is removed yet.</p></div>
        </div>
        <button className="text-action" type="button" disabled={!state.keywords.length || dirty} onClick={() => onNavigate('scan')}>
          Continue to scan <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}
