'use client';
import { useState, useEffect, useRef } from 'react';
import MonacoEditor from '../../components/Editor/MonacoEditor';
import PDFPreview from '../../components/Editor/PDFPreview';
import AIPanel from '../../components/AI/AIPanel';
import useAutoSave from '../../../hooks/useAutoSave';
import { io } from "socket.io-client";

export default function LatexEditor({ file, onSave, onToggleVersionsRef, compileNowRef, liveContentRef, onCompilingChange, showAIPanel = false, onAIPanelClose }) {
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
  const [showVersions, setShowVersions] = useState(false);

  // UI LAYOUT
  const [splitPosition, setSplitPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const lastCompiledContent = useRef('');
  const compileTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const isRemoteChange = useRef(false);
  const editorApiRef = useRef(null);

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

  const saveVersion = async (contentToSave) => {
    try {
      const res = await fetch('/api/versions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file._id,
          content: contentToSave,
          label: 'Auto-save'
        }),
      });
      
      if (res.ok) {
        console.log('📸 Version saved');
        // Reload versions if panel is open
        if (showVersions) {
          loadVersions();
        }
      } else {
        console.error("Version save failed:", res.status);
      }
    } catch (err) {
      console.error("Failed to save version", err);
    }
  };

  const restoreVersion = (oldContent) => {
    setContent(oldContent);
    lastCompiledContent.current = "";
    saveVersion(oldContent);
    setShowVersions(false); // Close panel after restore
  };

  const toggleVersionsPanel = () => {
    const newState = !showVersions;
    setShowVersions(newState);
    if (newState) {
      loadVersions();
    }
  };

  // expose toggle to parent (Toolbar button)
  useEffect(() => {
    if (onToggleVersionsRef) {
      onToggleVersionsRef.current = toggleVersionsPanel;
    }
  }, [showVersions]);

  // expose manual compile to parent so the Toolbar's "Compile" button can fire it
  useEffect(() => {
    if (compileNowRef) {
      compileNowRef.current = () => {
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
  }, [content]);

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
    } catch (err) {
      console.error("Compilation error:", err);
      setError(err.message);
      setPdfUrl(null);
      setPdfBlob(null);
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
      <div style={{ width: `${editorWidth}%` }} className="flex flex-col border-r border-white/5">
        <EditorToolbar
          isConnected={isConnected}
          activeUsers={activeUsers}
          onBold={handleBold}
          onItalic={handleItalic}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onBulletList={handleBulletList}
          onSearch={handleSearch}
        />

        <MonacoEditor
          value={content}
          onChange={handleEditorChange}
          language="latex"
          editorApiRef={editorApiRef}
        />
      </div>

      {/* RESIZER */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="w-1 bg-white/5 cursor-col-resize hover:bg-violet-500/60 transition-colors"
      />

      {/* PDF PREVIEW */}
      <div style={{ width: `${pdfWidth}%` }} className="border-r border-white/5">
        <PDFPreview
          pdfUrl={pdfUrl}
          isCompiling={isCompiling}
          error={error}
          onToggleVersions={toggleVersionsPanel}
          showVersions={showVersions}
          compilesCount={compilesCount}
        />
      </div>

      {/* AI PANEL */}
      {showAIPanel && (
        <div style={{ width: `${aiWidth}%` }}>
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
          style={{ width: '24%' }}
          className="absolute right-0 top-0 bottom-0 z-50 flex flex-col bg-[#0a0a10]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl shadow-black/60 animate-slide-in-right"
        >
          <div className="relative h-11 flex items-center justify-between px-4 border-b border-white/5 bg-gradient-to-r from-[#0a0a0e] via-[#0d0a14] to-[#0a0a0e]">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-white tracking-tight">Version History</span>
              {versions.length > 0 && (
                <span className="text-[10px] font-mono text-white/35 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
                  {versions.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowVersions(false)}
              className="text-white/45 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {versions.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-white/70 text-xs font-medium">No versions yet</p>
                <p className="text-white/35 text-[11px] mt-1.5 leading-snug">
                  Versions are saved automatically as you edit.
                </p>
              </div>
            ) : (
              versions.map((v) => (
                <button
                  key={v._id}
                  onClick={() => restoreVersion(v.content)}
                  className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-400/40 backdrop-blur-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-medium text-white/80">
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      Restore →
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-fuchsia-300 font-medium">
                      {v.userId?.username || 'Guest'}
                    </span>
                    <span className="text-white/25">•</span>
                    <span className="text-white/50 font-mono">{v.content.length} chars</span>
                  </div>
                  {v.label && (
                    <p className="text-[10px] text-white/40 mt-1.5 italic">{v.label}</p>
                  )}
                </button>
              ))
            )}
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
}) {
  const btn =
    'inline-flex items-center justify-center h-7 w-7 rounded-md text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all';

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
      </div>
    </div>
  );
}