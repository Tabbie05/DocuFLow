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
    placeholder: 'What do you want to change? e.g. "Make the summary more concise" or "Add a Skills section"',
  },
  {
    icon: '📝',
    label: 'New Document',
    description: 'Generate any LaTeX document from scratch',
    mode: 'generate',
    placeholder: 'Describe what document you want. e.g. "A cover letter for a software engineer role at Google"',
  },
  {
    icon: '📊',
    label: 'Cover Letter',
    description: 'Generate a cover letter for a specific role',
    mode: 'generate',
    placeholder: 'Describe the role and company. e.g. "Cover letter for Senior Developer at Amazon, I have 3 years React experience"',
  },
];

export default function AIPanel({ existingContent, onLatexGenerated, isVisible, onClose }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const textareaRef = useRef(null);
  const historyEndRef = useRef(null);

  // Auto-scroll history
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus textarea when mode selected
  useEffect(() => {
    if (selectedMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedMode]);

  if (!isVisible) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Add user message to history
    const userMsg = { role: 'user', text: prompt, mode: selectedMode?.mode };
    setHistory(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          existingContent: existingContent || '',
          mode: selectedMode?.mode || 'generate',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();

      // Add AI response to history
      setHistory(prev => [...prev, {
        role: 'assistant',
        text: `LaTeX generated successfully (${data.usage?.completion_tokens || '?'} tokens)`,
        latex: data.latex,
      }]);

      // Push LaTeX into the editor
      onLatexGenerated(data.latex);

      // Clear prompt after success
      setPrompt('');

    } catch (err) {
      console.error('❌ AI error:', err);
      setError(err.message);
      setHistory(prev => [...prev, { role: 'error', text: err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const resetPanel = () => {
    setSelectedMode(null);
    setPrompt('');
    setError(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-950">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="text-sm font-bold text-white">AI Assistant</h3>
            <p className="text-xs text-gray-500">Generates LaTeX → Editor → PDF</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {history.length === 0 && !selectedMode && (
          <>
            <p className="text-gray-500 text-xs text-center pt-2 pb-1">What do you want to create?</p>
            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.mode + action.label}
                  onClick={() => { setSelectedMode(action); setError(null); }}
                  className="text-left p-3 rounded-lg border border-gray-700 hover:border-blue-500 bg-gray-800 hover:bg-gray-750 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-xs font-semibold text-white group-hover:text-blue-400">{action.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-tight">{action.description}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* History Messages */}
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' && (
              <div className="max-w-[85%] bg-blue-600 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-200 mb-0.5 font-semibold">
                  {msg.mode === 'resume_from_jd' ? '📄 Resume from JD' :
                   msg.mode === 'modify' ? '✏️ Modify' : '📝 Generate'}
                </p>
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.text.length > 200 ? msg.text.slice(0, 200) + '...' : msg.text}</p>
              </div>
            )}
            {msg.role === 'assistant' && (
              <div className="max-w-[85%] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-green-400 text-xs">✅</span>
                  <p className="text-xs text-green-400 font-semibold">{msg.text}</p>
                </div>
                <p className="text-xs text-gray-400">Code inserted into editor. PDF compiling...</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.latex);
                    alert('LaTeX code copied!');
                  }}
                  className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  📋 Copy LaTeX
                </button>
              </div>
            )}
            {msg.role === 'error' && (
              <div className="max-w-[85%] bg-red-900 bg-opacity-30 border border-red-700 rounded-lg px-3 py-2">
                <p className="text-xs text-red-400">❌ {msg.text}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 bg-gray-950 p-3 space-y-2">
        {/* Mode selector if history exists but no mode */}
        {history.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.mode + action.label}
                onClick={() => setSelectedMode(action)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedMode?.label === action.label
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedMode?.placeholder || 'Describe what you want to generate...'}
          disabled={isLoading}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600">Ctrl+Enter to send</span>
            {existingContent && (
              <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.4 rounded mr-2 ">
                📄 {existingContent.length} chars in editor
              </span>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              prompt.trim() && !isLoading
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-600/40'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="w-4 p-2 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <span>🤖</span>
                Generate
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-900 bg-opacity-20 px-2 py-1 rounded">❌ {error}</p>
        )}

        {showVersions && (
  <div style={{ width: "22%" }} className="bg-gray-950 border-l border-gray-700 flex flex-col">
    
    <div className="p-3 border-b border-gray-700 font-bold text-sm">
      Version History
    </div>

    <div className="flex-1 overflow-y-auto">
      {versions.map((v) => (
        <div
          key={v._id}
          className="p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
          onClick={() => restoreVersion(v.content)}
        >
          <p className="text-xs text-gray-400">
            {new Date(v.createdAt).toLocaleString()}
          </p>
          <p className="text-xs text-blue-400">
            {v.userId?.username || "User"}
          </p>
        </div>
      ))}
    </div>
  </div>
)}

      </div>
    </div>
  );
}
