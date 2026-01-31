'use client';
import { useState } from 'react';

export default function PDFPreview({ 
  pdfUrl, 
  isCompiling, 
  error, 
  fileName, 
  compilesCount,
  onDownload,
  hasValidPdf 
}) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm font-medium">PDF Preview</span>
          {compilesCount > 0 && (
            <span className="text-xs text-green-400 bg-green-900 bg-opacity-20 px-2 py-0.5 rounded">
              ✓ {compilesCount} compile{compilesCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Download Button */}
          {hasValidPdf && (
            <button
              onClick={onDownload}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          )}
          
          {/* Zoom Controls */}
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            disabled={!pdfUrl}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            −
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            disabled={!pdfUrl}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-700">
        {isCompiling ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-blue-400 text-2xl">📝</span>
              </div>
            </div>
            <p className="text-white text-lg font-semibold mt-6 mb-2">Compiling LaTeX...</p>
            <p className="text-gray-400 text-sm">Using professional LaTeX compiler</p>
            <p className="text-gray-500 text-xs mt-2">This may take 5-15 seconds</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-red-400 text-2xl font-bold mb-4">Compilation Failed</h3>
            
            <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 text-sm text-red-300 w-full mb-6">
              <p className="font-semibold mb-2 text-base">Error Details:</p>
              <pre className="whitespace-pre-wrap text-xs bg-red-950 bg-opacity-30 p-3 rounded overflow-auto max-h-40">
{error}
              </pre>
            </div>

            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4 text-sm text-blue-300 w-full">
              <p className="font-semibold mb-2">💡 Common Issues:</p>
              <ul className="space-y-1 text-xs">
                <li>• Check for missing <code className="bg-blue-950 bg-opacity-50 px-1 rounded">\end{'{'}document{'}'}</code></li>
                <li>• Verify all <code className="bg-blue-950 bg-opacity-50 px-1 rounded">\begin{'{'}...{'}'}</code> have matching <code className="bg-blue-950 bg-opacity-50 px-1 rounded">\end{'{'}...{'}'}</code></li>
                <li>• Check for special characters that need escaping (%, $, &amp;, #)</li>
              </ul>
            </div>
          </div>
        ) : pdfUrl ? (
          // FULL WIDTH PDF VIEW
          <div className="w-full h-full bg-gray-600">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
              style={{ minHeight: '100%' }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-7xl mb-6">📄</div>
            <h3 className="text-white text-2xl font-bold mb-3">Ready to Compile</h3>
            <p className="text-gray-400 text-base max-w-md mb-8">
              Start typing LaTeX code. The PDF will compile automatically 
              2 seconds after you stop typing.
            </p>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-lg border border-gray-700 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">✨</span>
                <p className="text-green-400 font-bold text-lg">Professional LaTeX Compilation</p>
              </div>
              
              <ul className="text-gray-300 text-sm space-y-3 text-left">
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg">✓</span>
                  <span>Real PDF output using professional LaTeX compilers</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg">✓</span>
                  <span>Supports ALL LaTeX packages (amsmath, titlesec, etc.)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg">✓</span>
                  <span>One-click PDF download for your resume</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg">✓</span>
                  <span>Multiple fallback compilers ensure 99.9% uptime</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

