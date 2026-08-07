'use client';
import { useState, useRef, useEffect } from 'react';

const QUICK_ACTIONS = [
  {
    icon: '📄',
    label: 'Resume from JD',
    description: 'Paste a job description and generate a tailored resume',
    mode: 'resume_from_jd',
    placeholder: 'Paste the full Job Description here...',
  },
  {
    icon: '✏️',
    label: 'Modify Current',
    description: 'Change something in your current document',
    mode: 'modify',
    placeholder: 'What do you want to change? e.g. "Make the summary more concise"',
  },
  {
    icon: '📝',
    label: 'New Document',
    description: 'Generate any LaTeX document from scratch',
    mode: 'generate',
    placeholder: 'Describe what document you want. e.g. "A cover letter for a software engineer"',
  },
  {
    icon: '📊',
    label: 'Cover Letter',
    description: 'Generate a cover letter for a specific role',
    mode: 'generate',
    placeholder: 'Describe the role and company. e.g. "Cover letter for Senior Developer at Amazon"',
  },
];

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `m${Date.now()}${Math.random().toString(36).slice(2)}`;

const URL_RE = /(https?:\/\/[^\s)\]]+)/g;

// Renders hint text with clickable links. The per-part test is deliberately
// non-global: .test() on a /g regex advances lastIndex and would drop every
// other match.
function Linkify({ text }) {
  if (!text) return null;
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200 break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function AIPanel({ existingContent, onLatexGenerated, isVisible, onClose }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);
  const textareaRef = useRef(null);
  const bodyRef = useRef(null);

  // Ticks only while a cooldown is active, and stops itself on the last tick.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    setNow(Date.now());
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= cooldownUntil) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  // NEVER use scrollIntoView() here: it walks every scrollable ancestor
  // (including overflow:hidden ones) and yanks the whole app shell up under
  // the toolbar. Scrolling the container directly cannot affect ancestors.
  useEffect(() => {
    if (!isVisible || history.length === 0) return;
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [history, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    if (selectedMode && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [selectedMode, isVisible]);

  const submit = async ({ text, mode, messageId }) => {
    if (!text.trim() || isLoading || cooldownUntil > Date.now()) return;

    setIsLoading(true);

    let id = messageId;
    if (id) {
      // Retry of an existing bubble — do NOT push a duplicate user message.
      setHistory((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'pending', error: null } : m))
      );
    } else {
      id = newId();
      setHistory((prev) => [
        ...prev,
        { id, role: 'user', text, mode, status: 'pending', error: null },
      ]);
    }

    const fail = (error) =>
      setHistory((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'error', error } : m))
      );

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          existingContent: existingContent || '',
          mode: mode || 'generate',
        }),
      });

      // The route always answers JSON, but a crashed dev server answers HTML.
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const headerRetry = parseInt(response.headers.get('Retry-After') || '', 10);
        const retryAfter = Number.isFinite(data.retryAfter)
          ? data.retryAfter
          : Number.isFinite(headerRetry)
          ? headerRetry
          : 0;

        if (response.status === 429 && retryAfter > 0) {
          setCooldownUntil(Date.now() + retryAfter * 1000);
        }

        fail({
          message: data.error || `Generation failed (HTTP ${response.status})`,
          hint: data.hint || '',
          code: data.code || '',
          httpStatus: response.status,
        });
        return; // prompt deliberately kept — the Retry button owns recovery
      }

      setHistory((prev) => [
        ...prev.map((m) => (m.id === id ? { ...m, status: 'done', error: null } : m)),
        {
          id: newId(),
          role: 'assistant',
          text: `LaTeX generated (${data.usage?.completion_tokens ?? '?'} tokens · ${data.model || 'model'})`,
          latex: data.latex,
        },
      ]);

      onLatexGenerated(data.latex);
      setPrompt('');
    } catch (err) {
      fail({
        message: err.message || 'Network error',
        hint: 'Could not reach /api/ai/generate. Is the dev server still running?',
        code: 'NETWORK',
        httpStatus: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => submit({ text: prompt, mode: selectedMode?.mode });
  const handleRetry = (msg) => submit({ text: msg.text, mode: msg.mode, messageId: msg.id });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (cooldownLeft > 0) return;
      handleGenerate();
    }
  };

  return (
    <div className="relative h-full min-h-0 flex flex-col bg-[#0a0a10] text-white">
      {/* Floating close button — guaranteed visible regardless of layout */}
      <button
        onClick={onClose}
        title="Close AI assistant"
        className="absolute top-3 right-3 z-20 shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg border border-fuchsia-400/60 bg-fuchsia-500/30 hover:bg-fuchsia-500/45 hover:border-fuchsia-300/80 transition-colors shadow-lg shadow-fuchsia-500/30"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Close
      </button>

      {/* ===== Header ===== */}
      <div className="relative shrink-0 h-14 flex items-center px-4 border-b border-white/10 bg-gradient-to-r from-violet-950/40 via-fuchsia-950/30 to-[#0a0a0e]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" />
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-fuchsia-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight leading-tight">AI Assistant</h3>
            <p className="text-[10px] text-white/45">LaTeX → Editor → PDF</p>
          </div>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {history.length === 0 && !selectedMode && (
          <>
            <p className="text-white/40 text-[11px] text-center pt-2 pb-1 uppercase tracking-wider">
              What do you want to create?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.mode + action.label}
                  onClick={() => setSelectedMode(action)}
                  className="text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-fuchsia-400/40 backdrop-blur-md transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-xs font-semibold text-white group-hover:text-fuchsia-200">
                      {action.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-snug">{action.description}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' && (
              <div className="max-w-[85%] flex flex-col items-end gap-1.5">
                <div className="bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-fuchsia-400/30 rounded-xl px-3 py-2 backdrop-blur-md">
                  <p className="text-[10px] text-fuchsia-200 mb-0.5 font-semibold uppercase tracking-wider">
                    {msg.mode === 'resume_from_jd' ? 'Resume from JD' :
                     msg.mode === 'modify' ? 'Modify' : 'Generate'}
                  </p>
                  <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                    {msg.text.length > 200 ? msg.text.slice(0, 200) + '…' : msg.text}
                  </p>
                  {msg.status === 'pending' && (
                    <p className="text-[10px] text-fuchsia-200/70 mt-1">Generating…</p>
                  )}
                </div>

                {msg.status === 'error' && msg.error && (
                  <div className="w-full bg-red-500/10 border border-red-400/30 rounded-xl px-3 py-2 text-left backdrop-blur-md">
                    <p className="text-xs text-red-200 font-medium">⚠ {msg.error.message}</p>
                    {msg.error.code && (
                      <p className="mt-0.5 text-[10px] font-mono text-red-300/60">
                        {msg.error.code}{msg.error.httpStatus ? ` · HTTP ${msg.error.httpStatus}` : ''}
                      </p>
                    )}
                    {msg.error.hint && (
                      <p className="mt-1.5 text-[11px] text-white/60 leading-snug whitespace-pre-wrap">
                        <Linkify text={msg.error.hint} />
                      </p>
                    )}
                    <button
                      onClick={() => handleRetry(msg)}
                      disabled={isLoading || cooldownLeft > 0}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {cooldownLeft > 0 ? `Retry in ${cooldownLeft}s` : '↻ Retry'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {msg.role === 'assistant' && (
              <div className="max-w-[85%] bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-3 py-2 backdrop-blur-md">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[11px] text-emerald-200 font-semibold">{msg.text}</p>
                </div>
                <p className="text-[11px] text-white/55">Code inserted into editor. PDF compiling…</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.latex);
                  }}
                  className="mt-1.5 text-[11px] text-cyan-300 hover:text-cyan-200 transition-colors"
                >
                  Copy LaTeX
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== Input ===== */}
      <div className="shrink-0 border-t border-white/5 bg-[#0a0a0e] p-3 space-y-2">
        {history.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.mode + action.label}
                onClick={() => setSelectedMode(action)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  selectedMode?.label === action.label
                    ? 'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100'
                    : 'border-white/10 bg-white/5 text-white/55 hover:border-white/20 hover:text-white'
                }`}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedMode?.placeholder || 'Describe what you want to generate...'}
          disabled={isLoading}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-fuchsia-400/40 focus:bg-white/10 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/35">⌘+Enter to send</span>
            {existingContent && (
              <span className="text-[10px] text-white/45 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                {existingContent.length} chars
              </span>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading || cooldownLeft > 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              prompt.trim() && !isLoading && cooldownLeft === 0
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50'
                : 'bg-white/5 border border-white/10 text-white/35 cursor-not-allowed'
            }`}
          >
            {cooldownLeft > 0 ? (
              `Rate limited · ${cooldownLeft}s`
            ) : isLoading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
