'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FileTree from '../../../components/FIle-Tree/FileTree/FileTree';
import LatexEditor from '../../../components/LatexEditor/LatexEditor';
import Toolbar from '../../../components/Editor/Toolbar';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id;
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // Toolbar and LatexEditor are siblings, so these refs bridge them:
  // LatexEditor installs its compile fn and mirrors the live editor text,
  // and the Toolbar reads both at click time.
  const compileNowRef = useRef(null);
  const liveContentRef = useRef('');

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(user => {
        if (!user || !user.userId) router.push('/login');
      });
  }, []);

  const handleFileSelect = (file) => {
    if (file.type !== 'file') return;
    if (file._id !== selectedFile?._id) {
      // LatexEditor is keyed by file id, so the old instance is about to die.
      // Drop refs pointing at it so a click in the gap can't hit stale state.
      compileNowRef.current = null;
      liveContentRef.current = file.content || '';
      setIsCompiling(false);
    }
    setSelectedFile(file);
  };

  const handleFileSave = async (content) => {
    if (!selectedFile) return;
    try {
      await fetch(`/api/files/${selectedFile._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch {}
  };

  return (
    <div className="editor-shell aurora-bg flex flex-col h-screen layout-clip">
      <Toolbar
        projectId={projectId}
        selectedFile={selectedFile}
        liveContentRef={liveContentRef}
        isCompiling={isCompiling}
        onCompileNow={() => compileNowRef.current?.()}
        showAIPanel={showAIPanel}
        onToggleAI={() => {
          setShowAIPanel((p) => {
            const next = !p;
            if (next) setShowVersions(false);
            return next;
          });
        }}
        showVersions={showVersions}
        onToggleVersions={() => {
          setShowVersions((p) => {
            const next = !p;
            if (next) setShowAIPanel(false);
            return next;
          });
        }}
      />

      <div className="flex flex-1 min-h-0 layout-clip">
        {/* SIDEBAR */}
        <div
          className={`relative shrink-0 flex flex-col min-h-0 layout-clip border-r border-white/5 bg-[#0a0a10]/60 backdrop-blur-xl transition-all duration-300 ${
            isSidebarCollapsed ? 'w-12' : 'w-64'
          }`}
        >
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full h-9 shrink-0 flex items-center justify-center border-b border-white/5 hover:bg-white/5 transition-all text-white/45 hover:text-white"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {!isSidebarCollapsed && (
            <FileTree projectId={projectId} onFileSelect={handleFileSelect} />
          )}
        </div>

        {/* MAIN */}
        <div className="flex-1 relative min-w-0 min-h-0">
          {selectedFile ? (
            <LatexEditor
              key={selectedFile._id}
              file={selectedFile}
              onSave={handleFileSave}
              compileNowRef={compileNowRef}
              liveContentRef={liveContentRef}
              onCompilingChange={setIsCompiling}
              showAIPanel={showAIPanel}
              onAIPanelClose={() => setShowAIPanel(false)}
              showVersions={showVersions}
              onVersionsClose={() => setShowVersions(false)}
            />
          ) : (
            <WelcomeState />
          )}

          {selectedFile && (
            <div
              className="absolute top-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 backdrop-blur-xl shadow-lg shadow-emerald-500/10 transition-all duration-200"
              style={{
                right: showAIPanel
                  ? 'calc(380px + 1rem)'   // AI drawer width
                  : showVersions
                  ? 'calc(320px + 1rem)'   // Versions panel width
                  : '1rem',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-200">Auto-saving</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="relative h-full flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-[600px] bg-violet-500/15 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 right-10 h-64 w-64 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-xl w-full">
        <div className="glow-border p-10 text-center animate-fade-up">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-2xl shadow-violet-500/40 flex items-center justify-center text-4xl mb-6 animate-float-slow">
            ✨
          </div>
          <span className="chip"><span className="chip-dot" /> Ready when you are</span>
          <h2 className="mt-5 text-4xl md:text-5xl font-black tracking-tight">
            <span className="text-gradient">Welcome to your canvas.</span>
          </h2>
          <p className="mt-4 text-white/60 text-base">
            Pick a file from the sidebar, or create one to start writing.<br/>
            <span className="text-white/40 text-sm">LaTeX, Markdown, or plain code — all supported.</span>
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 text-left">
            <div className="glass p-3">
              <div className="text-lg mb-1">⚡</div>
              <div className="text-[11px] font-semibold">Live preview</div>
              <div className="text-[10px] text-white/45 mt-0.5">Compile as you type</div>
            </div>
            <div className="glass p-3">
              <div className="text-lg mb-1">🤝</div>
              <div className="text-[11px] font-semibold">Real-time</div>
              <div className="text-[10px] text-white/45 mt-0.5">Edit together live</div>
            </div>
            <div className="glass p-3">
              <div className="text-lg mb-1">🤖</div>
              <div className="text-[11px] font-semibold">AI assist</div>
              <div className="text-[10px] text-white/45 mt-0.5">Drafts & fixes</div>
            </div>
          </div>

          <p className="mt-7 text-[11px] text-white/30 font-mono">
            Tip: press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">⌘K</kbd> for the command bar
          </p>
        </div>
      </div>
    </div>
  );
}
