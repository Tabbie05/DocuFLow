'use client';
import { useState, useEffect, useRef } from 'react';
import MonacoEditor from '../../components/Editor/MonacoEditor';
import PDFPreview from '../../components/Editor/PDFPreview';
import AIPanel from '../../components/AI/AIPanel';
import useAutoSave from '../../../hooks/useAutoSave';
import { io } from "socket.io-client";

export default function LatexEditor({
  file,
  onSave,
  compileNowRef,
  liveContentRef,
  onCompilingChange,
  showAIPanel = false,
  onAIPanelClose,
  showVersions = false,
  onVersionsClose,
}) {
  // ================= STATE =================
  const [content, setContent] = useState(file.content || '');

  // Keep parent's live ref in sync with the latest text on every render.
  // Toolbar reads liveContentRef.current at click time so downloads are fresh.
  if (liveContentRef) liveContentRef.current = content;
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState(null);
  const [compilesCount, setCompilesCount] = useState(0);
  const socketRef = useRef(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // VERSION HISTORY
  const [versions, setVersions] = useState([]);
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  // UI LAYOUT
  const [splitPosition, setSplitPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const lastCompiledContent = useRef('');
  const compileTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const isRemoteChange = useRef(false);
  const editorApiRef = useRef(null);

  // Circuit breaker: pause auto-compile after consecutive failures so a
  // bad doc can't keep hammering (and crashing) the upstream service.
  const failureCount = useRef(0);
  const FAILURE_LIMIT = 2;
  const [autoCompilePaused, setAutoCompilePaused] = useState(false);

  // ================= EDITOR ACTIONS =================
  const withEditor = (fn) => {
    const api = editorApiRef.current;
    if (!api?.editor) return;
    fn(api.editor, api.monaco);
    api.editor.focus();
  };

  const wrapSelection = (before, after = '') => {
    withEditor((editor) => {
      const selection = editor.getSelection();
      const text = editor.getModel().getValueInRange(selection);
      editor.executeEdits('toolbar', [{
        range: selection,
        text: `${before}${text}${after}`,
      }]);
    });
  };

  const handleBold = () => wrapSelection('\\textbf{', '}');
  const handleItalic = () => wrapSelection('\\textit{', '}');
  const handleUndo = () => withEditor((editor) => editor.trigger('toolbar', 'undo', null));
  const handleRedo = () => withEditor((editor) => editor.trigger('toolbar', 'redo', null));
  const handleSearch = () => withEditor((editor) => editor.getAction('actions.find')?.run());
  const handleInsertIcon = (latex) => {
    withEditor((editor) => {
      const selection = editor.getSelection();
      editor.executeEdits('toolbar', [{ range: selection, text: `${latex} \\; ` }]);
      // Make sure fontawesome5 is in the preamble — add it once if missing
      const model = editor.getModel();
      const full = model.getValue();
      if (!/\\usepackage\{fontawesome5\}/.test(full)) {
        const docclassMatch = full.match(/\\documentclass[^\n]*\n/);
        if (docclassMatch) {
          const pos = docclassMatch.index + docclassMatch[0].length;
          const lineCol = model.getPositionAt(pos);
          editor.executeEdits('toolbar', [{
            range: new (editorApiRef.current.monaco.Range)(lineCol.lineNumber, lineCol.column, lineCol.lineNumber, lineCol.column),
            text: '\\usepackage{fontawesome5}\n',
          }]);
        }
      }
    });
  };
  const handleBulletList = () => {
    withEditor((editor) => {
      const selection = editor.getSelection();
      const selectedText = editor.getModel().getValueInRange(selection).trim();
      const items = selectedText
        ? selectedText.split('\n').map((l) => `\t\\item ${l.trim()}`).join('\n')
        : '\t\\item ';
      editor.executeEdits('toolbar', [{
        range: selection,
        text: `\\begin{itemize}\n${items}\n\\end{itemize}`,
      }]);
    });
  };

  // ================= VERSION FUNCTIONS =================
  const loadVersions = async () => {
    try {
      const res = await fetch(`/api/versions/${file._id}`);
      if (!res.ok) {
        console.error("Failed to load versions:", res.status);
        return;
      }
      const data = await res.json();
      console.log("Loaded versions:", data);
      setVersions(data);
    } catch (err) {
      console.error("Failed to load versions", err);
    }
  };

  const saveVersion = async (contentToSave, label = 'Auto-save') => {
    try {
      const res = await fetch('/api/versions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file._id,
          content: contentToSave,
          label,
        }),
      });

      if (res.ok) {
        if (showVersions) loadVersions();
      }
    } catch (err) {
      console.error('Failed to save version', err);
    }
  };

  const handleManualSnapshot = async () => {
    if (savingSnapshot) return;
    setSavingSnapshot(true);
    await saveVersion(content, `Snapshot · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    await loadVersions();
    setSavingSnapshot(false);
  };

  const restoreVersion = (oldContent) => {
    setContent(oldContent);
    lastCompiledContent.current = '';
    saveVersion(oldContent, 'Restored');
    onVersionsClose?.();
  };

  // Load versions whenever the parent opens the panel
  useEffect(() => {
    if (showVersions) loadVersions();
  }, [showVersions]);

  // expose manual compile to parent so the Toolbar's "Compile" button can fire it
  useEffect(() => {
    if (compileNowRef) {
      compileNowRef.current = () => {
        // Manual click resets the circuit breaker — user explicitly asked to retry
        failureCount.current = 0;
        setAutoCompilePaused(false);
        // Bypass debounce + the "same as last compiled" guard
        lastCompiledContent.current = "";
        if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current);
        compileLatex();
      };
    }
  });

  // ================= AUTO SAVE WITH VERSION =================
  useAutoSave(content, async (contentToSave) => {
    await onSave(contentToSave);
    // Save version every ~5 edits (20% chance)
    const shouldSaveVersion = Math.random() < 0.2;
    if (shouldSaveVersion) {
      await saveVersion(contentToSave);
    }
  }, 2000);

  // ================= WARM UP LATEX SERVICE =================
  // Fires once on mount so the (Render free-tier) service is awake by the
  // time the 2s debounce fires the first compile.
  useEffect(() => {
    fetch('/api/latex/warmup').catch(() => {});
  }, []);

  // ================= SOCKET.IO CONNECTION =================
  useEffect(() => {
    // Get socket URL from environment variable
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    console.log("Connecting to socket server:", SOCKET_URL);
    
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      
      // Get username from localStorage or generate one
      const username = localStorage.getItem('username') || `User-${Date.now()}`;
      
      socketRef.current.emit('join-project', {
        projectId: file.projectId,
        username
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('receive-changes', ({ content: newContent, username }) => {
      console.log(`📝 Received changes from ${username}`);
      isRemoteChange.current = true;
      setContent(newContent);
      setTimeout(() => {
        isRemoteChange.current = false;
      }, 100);
    });

    socketRef.current.on('active-users', ({ activeUsers }) => {
      setActiveUsers(activeUsers);
    });

    socketRef.current.on('user-joined', ({ username, activeUsers }) => {
      setActiveUsers(activeUsers);
      console.log(`👤 ${username} joined`);
    });

    socketRef.current.on('user-left', ({ username, activeUsers }) => {
      setActiveUsers(activeUsers);
      console.log(`👋 ${username} left`);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [file.projectId]);

  // ================= AUTO COMPILE =================
  useEffect(() => {
    if (isRemoteChange.current) return;
    if (content === lastCompiledContent.current) return;
    // Circuit breaker — once we've failed FAILURE_LIMIT times in a row,
    // stop auto-compiling. User must click Compile to resume.
    if (autoCompilePaused) return;

    if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current);

    compileTimeoutRef.current = setTimeout(() => {
      if (content.trim()) compileLatex();
      else {
        setPdfUrl(null);
        setPdfBlob(null);
        setError(null);
      }
    }, 2000);

    return () => clearTimeout(compileTimeoutRef.current);
  }, [content, autoCompilePaused]);

  // ================= RESIZE HANDLER =================
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.min(Math.max(pct, 20), 80));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // ================= LATEX COMPILE =================
  const compileLatex = async () => {
    const codeToCompile = content;
    if (!codeToCompile.trim()) return;

    setIsCompiling(true);
    onCompilingChange?.(true);
    setError(null);

    try {
      const response = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: codeToCompile }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.hint
          ? `${errorData.error || 'Compilation failed'} — ${errorData.hint}`
          : (errorData.error || 'Compilation failed');
        throw new Error(msg);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Received empty PDF');

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfBlob(blob);
      lastCompiledContent.current = codeToCompile;
      setCompilesCount(prev => prev + 1);
      failureCount.current = 0;
      if (autoCompilePaused) setAutoCompilePaused(false);
    } catch (err) {
      console.error("Compilation error:", err);
      failureCount.current += 1;
      const willPause = failureCount.current >= FAILURE_LIMIT;
      setError(
        willPause
          ? `${err.message}\n\n⏸ Auto-compile paused after ${FAILURE_LIMIT} failures. Fix the document and click Compile to resume.`
          : err.message
      );
      setPdfUrl(null);
      setPdfBlob(null);
      if (willPause) setAutoCompilePaused(true);
    } finally {
      setIsCompiling(false);
      onCompilingChange?.(false);
    }
  };

  // Throttle typing emits so we send at most one update per ~120ms even
  // when the user is hammering keys. Latest content always wins on the next tick.
  const pendingEmit = useRef(null);
  const lastEmitTs = useRef(0);

  const handleEditorChange = (value) => {
    if (isRemoteChange.current) {
      return;
    }

    setContent(value);

    if (!socketRef.current?.connected) return;

    const username = localStorage.getItem('username') || 'Anonymous';
    const now = Date.now();
    const minGap = 120; // ms
    pendingEmit.current = { value, username };

    const flush = () => {
      const next = pendingEmit.current;
      if (!next) return;
      pendingEmit.current = null;
      lastEmitTs.current = Date.now();
      socketRef.current?.emit('typing', {
        projectId: file.projectId,
        content: next.value,
        username: next.username,
      });
    };

    if (now - lastEmitTs.current >= minGap) {
      flush();
    } else if (!handleEditorChange._timer) {
      handleEditorChange._timer = setTimeout(() => {
        handleEditorChange._timer = null;
        flush();
      }, minGap - (now - lastEmitTs.current));
    }
  };

  const handleLatexGenerated = (newLatex) => {
    setContent(newLatex);
    lastCompiledContent.current = "";
    saveVersion(newLatex);
  };

  // ================= LAYOUT WIDTHS =================
  const editorWidth = showAIPanel ? splitPosition * 0.7 : splitPosition;
  const pdfWidth = showAIPanel ? (100 - splitPosition) * 0.7 : 100 - splitPosition;
  const aiWidth = showAIPanel ? 30 : 0;

  // ================= UI =================
  return (
    <div ref={containerRef} className="flex h-full">
      {/* ===== EDITOR ===== */}
      <div style={{ width: `${editorWidth}%` }} className="h-full flex flex-col min-h-0 border-r border-white/5">
        <EditorToolbar
          isConnected={isConnected}
          activeUsers={activeUsers}
          onBold={handleBold}
          onItalic={handleItalic}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onBulletList={handleBulletList}
          onSearch={handleSearch}
          onInsertIcon={handleInsertIcon}
        />

        <div className="flex-1 min-h-0">
          <MonacoEditor
            value={content}
            onChange={handleEditorChange}
            language="latex"
            editorApiRef={editorApiRef}
          />
        </div>
      </div>

      {/* RESIZER */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="w-1 bg-white/5 cursor-col-resize hover:bg-violet-500/60 transition-colors"
      />

      {/* PDF PREVIEW */}
      <div style={{ width: `${pdfWidth}%` }} className="h-full flex flex-col min-h-0 border-r border-white/5">
        <PDFPreview
          pdfUrl={pdfUrl}
          isCompiling={isCompiling}
          error={error}
          compilesCount={compilesCount}
        />
      </div>

      {/* AI PANEL */}
      {showAIPanel && (
        <div style={{ width: `${aiWidth}%` }} className="h-full flex flex-col min-h-0 border-l border-white/5">
          <AIPanel
            existingContent={content}
            onLatexGenerated={handleLatexGenerated}
            isVisible={showAIPanel}
            onClose={() => onAIPanelClose?.()}
          />
        </div>
      )}

      {/* VERSION HISTORY PANEL */}
      {showVersions && (
        <div
          style={{ width: '320px' }}
          className="absolute right-0 top-0 bottom-0 z-50 flex flex-col bg-[#0a0a10]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl shadow-black/60 animate-slide-in-right"
        >
          {/* Floating close button — always on top */}
          <button
            onClick={() => onVersionsClose?.()}
            title="Close version history"
            className="absolute top-3 right-3 z-20 shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg border border-violet-400/60 bg-violet-500/30 hover:bg-violet-500/45 hover:border-violet-300/80 transition-colors shadow-lg shadow-violet-500/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
          {/* HEADER */}
          <div className="relative shrink-0 px-4 pt-4 pb-3 border-b border-white/10 bg-gradient-to-b from-violet-950/40 via-[#11091a] to-[#0a0a0e]">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-violet-500/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">Version history</p>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5">
                    {versions.length} {versions.length === 1 ? 'snapshot' : 'snapshots'}
                  </p>
                </div>
              </div>
              {/* spacer to balance the floating Close button on the right */}
              <div className="w-20" aria-hidden="true" />
            </div>

            <button
              onClick={handleManualSnapshot}
              disabled={savingSnapshot}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-400/30 text-violet-100 hover:from-violet-500/30 hover:to-fuchsia-500/30 transition-all disabled:opacity-50"
            >
              {savingSnapshot ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving snapshot…
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Save snapshot now
                </>
              )}
            </button>
          </div>

          {/* LIST */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {versions.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-white/75 text-xs font-medium">No snapshots yet</p>
                <p className="text-white/40 text-[11px] mt-1.5 leading-snug">
                  Versions save automatically as you edit, or hit "Save snapshot" to capture this moment.
                </p>
              </div>
            ) : (
              versions.map((v, i) => {
                const date = new Date(v.createdAt);
                const isLatest = i === 0;
                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={v._id}
                    className={`relative p-3 rounded-xl border backdrop-blur-md transition-all group ${
                      isLatest
                        ? 'border-violet-400/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5'
                        : 'border-white/10 bg-white/5 hover:border-violet-400/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-white">{dateStr}</span>
                          <span className="text-white/30 text-[10px]">·</span>
                          <span className="text-[11px] font-mono text-white/65">{timeStr}</span>
                          {isLatest && (
                            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                              Latest
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                          <span className="text-fuchsia-300 font-medium">
                            {v.userId?.username || 'Guest'}
                          </span>
                          <span className="text-white/25">·</span>
                          <span className="text-white/45 font-mono">
                            {v.content.length.toLocaleString()} chars
                          </span>
                        </div>
                        {v.label && (
                          <p className="text-[10px] text-white/45 mt-1.5 italic truncate">
                            {v.label}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => restoreVersion(v.content)}
                      className="w-full mt-1 inline-flex items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-white/75 hover:bg-violet-500/20 hover:border-violet-400/40 hover:text-violet-100 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Restore this version
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER NOTE */}
          <div className="px-4 py-2.5 border-t border-white/5 bg-[#0a0a0e]">
            <p className="text-[10px] text-white/35 leading-snug">
              Restoring creates a new snapshot — your current draft isn't lost.
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
      `}</style>
    </div>
  );
}

function EditorToolbar({
  isConnected,
  activeUsers,
  onBold,
  onItalic,
  onUndo,
  onRedo,
  onBulletList,
  onSearch,
  onInsertIcon,
}) {
  const btn =
    'inline-flex items-center justify-center h-7 w-7 rounded-md text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all';

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPickerRef = useRef(null);

  useEffect(() => {
    if (!iconPickerOpen) return;
    const close = (e) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target)) {
        setIconPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [iconPickerOpen]);

  // Curated, verified-working FA icons (tested on this LaTeX service).
  // Each entry: [LaTeX command, label, unicode-ish preview].
  const ICON_GROUPS = [
    {
      label: 'Contact',
      items: [
        ['\\faEnvelope', 'Email', '✉'],
        ['\\faAt', 'At', '@'],
        ['\\faPhone', 'Phone', '☎'],
        ['\\faPaperPlane', 'Send', '➤'],
        ['\\faMapMarker', 'Location', '📍'],
        ['\\faCalendar', 'Calendar', '📅'],
        ['\\faClock', 'Clock', '⏰'],
        ['\\faBuilding', 'Building', '🏢'],
      ],
    },
    {
      label: 'Web & Links',
      items: [
        ['\\faGlobe', 'Globe', '🌐'],
        ['\\faLink', 'Link', '🔗'],
        ['\\faDownload', 'Download', '⬇'],
      ],
    },
    {
      label: 'Brands',
      items: [
        ['\\faGithub', 'GitHub', 'GH'],
        ['\\faGitlab', 'GitLab', 'GL'],
        ['\\faBitbucket', 'Bitbucket', 'BB'],
        ['\\faLinkedin', 'LinkedIn', 'in'],
        ['\\faTwitter', 'Twitter', 'X'],
        ['\\faFacebook', 'Facebook', 'fb'],
        ['\\faInstagram', 'Instagram', 'ig'],
        ['\\faYoutube', 'YouTube', 'yt'],
        ['\\faStackOverflow', 'Stack Overflow', 'SO'],
        ['\\faMedium', 'Medium', 'M'],
      ],
    },
    {
      label: 'Work & Education',
      items: [
        ['\\faBriefcase', 'Briefcase', '💼'],
        ['\\faGraduationCap', 'Education', '🎓'],
        ['\\faFile', 'File', '📄'],
        ['\\faFilePdf', 'PDF', 'pdf'],
        ['\\faCode', 'Code', '<>'],
        ['\\faTerminal', 'Terminal', '$_'],
        ['\\faStar', 'Star', '★'],
        ['\\faCheckCircle', 'Check', '✓'],
      ],
    },
  ];

  return (
    <div className="relative h-11 flex items-center justify-between px-3 border-b border-white/5 bg-gradient-to-r from-[#0a0a0e] via-[#0d0a14] to-[#0a0a0e]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {/* LEFT: status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-[10px] font-medium text-white/70">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10">
            <svg className="w-3 h-3 text-white/55" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-[10px] font-medium text-white/70">{activeUsers.length}</span>
          </div>
        )}
        <span className="text-[10px] text-white/30 font-mono ml-1">LaTeX</span>
      </div>

      {/* RIGHT: formatting */}
      <div className="flex items-center gap-0.5">
        <button onClick={onBold} title="Bold (⌘B)" className={btn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h7a4 4 0 010 8H6V4zm0 8h8a4 4 0 010 8H6v-8z" />
          </svg>
        </button>
        <button onClick={onItalic} title="Italic (⌘I)" className={btn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 4h-9M14 20H5M15 4L9 20" />
          </svg>
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        <button onClick={onUndo} title="Undo (⌘Z)" className={btn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
          </svg>
        </button>
        <button onClick={onRedo} title="Redo (⌘⇧Z)" className={btn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
          </svg>
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        <button onClick={onBulletList} title="Bulleted list" className={btn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
        <button onClick={onSearch} title="Find (⌘F)" className={btn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* ICON PICKER */}
        <div ref={iconPickerRef} className="relative">
          <button
            onClick={() => setIconPickerOpen((p) => !p)}
            title="Insert icon (verified-working FontAwesome icons)"
            className={`${btn} ${iconPickerOpen ? 'bg-white/10 border-white/15 text-white' : ''}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {iconPickerOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-white/10 bg-[#0a0a10]/95 backdrop-blur-xl shadow-2xl shadow-black/60 p-3 animate-share-pop">
              <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 bg-[#0a0a10]/95 border-t border-l border-white/10" />
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-semibold text-white">Insert icon</p>
                <span className="text-[10px] text-white/35 font-mono">FontAwesome 5</span>
              </div>
              <p className="text-[10px] text-white/45 leading-snug mb-2 px-1">
                Adds <code className="text-white/65">\usepackage{'{fontawesome5}'}</code> automatically if missing.
              </p>
              <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
                {ICON_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-1.5 px-1">{group.label}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {group.items.map(([cmd, label, preview]) => (
                        <button
                          key={cmd}
                          onClick={() => {
                            onInsertIcon?.(cmd);
                            setIconPickerOpen(false);
                          }}
                          title={`${cmd} — ${label}`}
                          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-violet-500/20 hover:border-violet-400/40 transition-all group"
                        >
                          <span className="text-base leading-none text-white/85 group-hover:text-white">{preview}</span>
                          <span className="text-[9px] text-white/45 group-hover:text-white/70 leading-tight">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-white/30 mt-2 px-1 leading-snug">
                All icons here are verified to compile in this project&apos;s LaTeX service.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}