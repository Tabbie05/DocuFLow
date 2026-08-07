'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function Toolbar({
  projectId,
  selectedFile,
  liveContentRef,
  isCompiling,
  onCompileNow,
  showAIPanel,
  onToggleAI,
  showVersions,
  onToggleVersions,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareWrapRef = useRef(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (!isShareOpen) return;
    const handler = (e) => {
      if (shareWrapRef.current && !shareWrapRef.current.contains(e.target)) {
        setIsShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isShareOpen]);

  const getCurrentContent = () =>
    (liveContentRef?.current ?? '').length > 0
      ? liveContentRef.current
      : selectedFile?.content || '';

  const handleDownloadPDF = async () => {
    if (!selectedFile) return showNotification('No file selected', 'error');
    const content = getCurrentContent();
    if (!content.trim()) return showNotification('Nothing to compile', 'error');

    setIsDownloading(true);
    try {
      const response = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Received empty PDF');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedFile.name.replace('.tex', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('PDF downloaded', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTeX = () => {
    if (!selectedFile) return showNotification('No file selected', 'error');
    const content = getCurrentContent();
    const blob = new Blob([content], { type: 'application/x-tex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('.tex downloaded', 'success');
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showNotification('Link copied — anyone with it can edit live', 'success');
    } catch (err) {
      showNotification(err?.message || 'Unable to copy', 'error');
    }
  };

  const handleNativeShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: selectedFile ? `${selectedFile.name} — DocuFlow` : 'DocuFlow project',
          text: 'Edit this LaTeX document with me on DocuFlow',
          url: shareUrl,
        });
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        showNotification(err.message || 'Unable to share', 'error');
      }
    }
  };

  const showNotification = (message, type = 'success') => {
    const el = document.createElement('div');
    el.className = `fixed top-5 right-5 px-5 py-3 rounded-xl shadow-2xl z-50 backdrop-blur-xl border text-sm font-medium animate-slide-in ${
      type === 'success'
        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
        : 'bg-red-500/15 border-red-400/30 text-red-200'
    }`;
    el.textContent = (type === 'success' ? '✓ ' : '✕ ') + message;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(120%)';
      setTimeout(() => el.remove(), 300);
    }, 2800);
  };

  const IconBack = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
  const IconRefresh = ({ spin }) => (
    <svg className={`w-3.5 h-3.5 ${spin ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
  const IconShare = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
  const IconDoc = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
  const IconDown = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
  const tbBtn = "shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all backdrop-blur-md border";

  return (
    <div className="relative shrink-0 h-14 flex items-center justify-between gap-3 px-4 border-b border-white/5 bg-gradient-to-r from-[#0a0a0e] via-[#0d0a14] to-[#0a0a0e]">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      {/* LEFT — the only shrinkable cluster; the filename truncates */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link
          href="/"
          className="shrink-0 flex items-center gap-1.5 text-white/55 hover:text-white text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all"
        >
          <IconBack />
          Home
        </Link>

        <div className="h-5 w-px bg-white/10 shrink-0" />

        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 shrink-0 rounded-md bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-violet-500/30 flex items-center justify-center text-[10px] font-black">D</div>
          <span className="text-white font-semibold text-sm tracking-tight shrink-0 hidden sm:inline">DocuFlow</span>
          {selectedFile && (
            <>
              <span className="text-white/30 shrink-0">/</span>
              <span
                className="text-sm font-mono text-gradient-accent truncate min-w-0"
                title={selectedFile.name}
              >
                {selectedFile.name}
              </span>
            </>
          )}
        </div>

        {selectedFile && (isCompiling || isDownloading) && (
          <div className="ml-1 shrink-0 flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/30 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[11px] font-medium text-violet-200">
              {isDownloading ? 'Preparing PDF…' : 'Compiling…'}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT — never shrinks; labels collapse by breakpoint instead */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onCompileNow}
          disabled={!selectedFile || isCompiling}
          title="Force recompile"
          className={`${tbBtn} ${
            selectedFile && !isCompiling
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/15'
              : 'bg-white/3 border-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <IconRefresh spin={isCompiling} />
          <span className="hidden lg:inline">{isCompiling ? 'Compiling…' : 'Compile'}</span>
        </button>

        <button
          onClick={onToggleVersions}
          disabled={!selectedFile}
          title="Version history"
          className={`${tbBtn} ${
            !selectedFile
              ? 'bg-white/3 border-white/5 text-white/30 cursor-not-allowed'
              : showVersions
              ? 'bg-violet-500/20 border-violet-400/40 text-violet-100'
              : 'bg-white/5 border-white/10 text-white/85 hover:bg-white/10'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden lg:inline">Versions</span>
        </button>

        <div ref={shareWrapRef} className="relative shrink-0">
          <button
            onClick={() => setIsShareOpen((p) => !p)}
            title="Share this project"
            className="btn-primary text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ borderRadius: 8 }}
          >
            <IconShare />
            <span className="hidden md:inline">Share</span>
          </button>

          {isShareOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-white/10 bg-[#0a0a10]/95 backdrop-blur-xl shadow-2xl shadow-black/60 animate-share-pop p-4">
              <div className="absolute -top-1.5 right-5 h-3 w-3 rotate-45 bg-[#0a0a10]/95 border-t border-l border-white/10" />
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow shadow-violet-500/30 flex items-center justify-center">
                  <IconShare />
                </div>
                <p className="text-sm font-semibold text-white">Share this project</p>
              </div>
              <p className="text-[11px] text-white/55 mb-3 leading-snug">
                Anyone with this link can open & edit live in real time.
              </p>

              <div className="flex items-stretch gap-1.5">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 text-[11px] font-mono px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white/85 focus:outline-none focus:border-violet-400/40"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="text-[11px] font-semibold px-3 rounded-lg bg-violet-500/25 border border-violet-400/40 text-violet-100 hover:bg-violet-500/35 transition-all"
                >
                  Copy
                </button>
              </div>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="mt-2 w-full text-[11px] font-medium px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/75 hover:bg-white/10 transition-all"
                >
                  Or use system share…
                </button>
              )}

              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Real-time sync via Socket.IO
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleDownloadTeX}
          disabled={!selectedFile}
          title="Download .tex"
          className={`${tbBtn} ${
            selectedFile
              ? 'bg-white/5 border-white/10 text-white/85 hover:bg-white/10'
              : 'bg-white/3 border-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <IconDoc />
          .tex
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={!selectedFile || isDownloading}
          title="Compile and download PDF"
          className={`${tbBtn} ${
            selectedFile && !isDownloading
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20'
              : 'bg-white/3 border-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          {isDownloading ? <IconRefresh spin /> : <IconDown />}
          <span className="hidden xl:inline">Download&nbsp;</span>PDF
        </button>

        <button
          onClick={onToggleAI}
          title="AI assistant"
          className={`${tbBtn} ${
            showAIPanel
              ? 'bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 border-fuchsia-400/50 text-fuchsia-100 shadow-md shadow-fuchsia-500/20'
              : 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-fuchsia-400/25 text-fuchsia-200 hover:from-violet-500/20 hover:to-fuchsia-500/20'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI
        </button>

        <div className="h-5 w-px bg-white/10 hidden 2xl:block shrink-0" />

        <div className="hidden 2xl:block text-[10px] font-mono text-white/30 px-2 shrink-0">
          ID: {projectId?.slice(0, 8)}…
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
          transition: all 0.3s ease-out;
        }
        @keyframes share-pop {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .animate-share-pop {
          animation: share-pop 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
