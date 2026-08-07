'use client';

export default function PDFPreview({
  pdfUrl,
  isCompiling,
  error,
  compilesCount,
}) {
  return (
    <div className="h-full flex flex-col bg-[#0a0a10]">
      {/* ============ TOP NAVBAR ============ */}
      <div className="relative h-11 flex items-center justify-between px-4 border-b border-white/5 bg-gradient-to-r from-[#0a0a0e] via-[#0d0a14] to-[#0a0a0e]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white/85 tracking-tight">
            Live Preview
          </span>
          {compilesCount > 0 && (
            <span className="text-[10px] font-mono text-white/35 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
              #{compilesCount}
            </span>
          )}
        </div>
      </div>

      {/* ============ PREVIEW BODY ============ */}
      <div className="flex-1 overflow-auto bg-[#1a1a22]">
        {isCompiling ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
              <div className="absolute inset-0 flex items-center justify-center text-violet-300 text-lg">
                ✦
              </div>
            </div>
            <p className="text-white text-sm font-semibold mt-5 mb-1">Compiling LaTeX…</p>
            <p className="text-white/40 text-xs">Usually 5–20 seconds</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full px-4 max-w-lg mx-auto">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-red-300 text-base font-bold mb-3">Compilation Failed</h3>
            <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-3 text-sm text-red-200 w-full mb-4 backdrop-blur-md">
              <pre className="whitespace-pre-wrap text-xs">{error}</pre>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/70 w-full backdrop-blur-md">
              <p className="font-semibold mb-1.5 text-xs text-white/85">Common Fixes</p>
              <ul className="space-y-1 text-xs">
                <li>• Check for missing <code className="bg-white/10 px-1 rounded">\end{'{}'}document</code></li>
                <li>• Escape special chars: <code className="bg-white/10 px-1 rounded">% $ &amp; # _</code></li>
                <li>• Use <code className="bg-white/10 px-1 rounded">--</code> instead of <code className="bg-white/10 px-1 rounded">—</code></li>
              </ul>
            </div>
          </div>
        ) : pdfUrl ? (
          <div className="w-full h-full">
            <iframe
              src={`${pdfUrl}#view=FitH`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 mb-4 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-2xl shadow-violet-500/40 flex items-center justify-center text-3xl">
              📄
            </div>
            <h3 className="text-white text-lg font-bold mb-2">PDF Preview</h3>
            <p className="text-white/45 text-xs max-w-xs">
              Type LaTeX in the editor or use{' '}
              <span className="text-fuchsia-300 font-semibold">AI</span> to generate a document.
              Preview updates automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
