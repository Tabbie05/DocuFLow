'use client';

export default function PDFPreview({ 
  pdfUrl, 
  isCompiling, 
  error, 
  fileName, 
  compilesCount,
  onDownload,
  hasValidPdf 
}) {
  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="flex-1 overflow-auto bg-gray-700">
        {isCompiling ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-blue-400 text-lg">📝</span>
              </div>
            </div>
            <p className="text-white text-sm font-semibold mt-5 mb-1">Compiling LaTeX...</p>
            <p className="text-gray-500 text-xs">Usually 5–20 seconds</p>
          </div>

        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full px-4 max-w-lg mx-auto">
            <div className="text-4xl mb-3">❌</div>
            <h3 className="text-red-400 text-base font-bold mb-3">Compilation Failed</h3>
            <div className="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-3 text-sm text-red-300 w-full mb-4">
              <pre className="whitespace-pre-wrap text-xs">{error}</pre>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-400 w-full">
              <p className="font-semibold mb-1.5 text-xs text-gray-300">💡 Common Fixes:</p>
              <ul className="space-y-1 text-xs">
                <li>• Check for missing <code className="bg-gray-700 px-1 rounded">\end{'{}'}document</code></li>
                <li>• Escape special chars: <code className="bg-gray-700 px-1 rounded">% $ & # _</code></li>
                <li>• Use <code className="bg-gray-700 px-1 rounded">--</code> instead of <code className="bg-gray-700 px-1 rounded">—</code></li>
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
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-white text-lg font-bold mb-2">PDF Preview</h3>
            <p className="text-gray-500 text-xs max-w-xs">
              Type LaTeX code in the editor or use <span className="text-blue-400 font-semibold">🤖 AI</span> to generate a document. 
              Preview updates automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}