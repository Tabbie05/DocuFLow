'use client';
import { useState } from 'react';

export default function PDFPreview({ pdfUrl, isCompiling, fileName, error }) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Preview Header */}
      <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
        <span className="text-gray-400 text-sm font-medium">Preview</span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            disabled={!pdfUrl}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            disabled={!pdfUrl}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto bg-gray-700 flex items-start justify-center p-4">
        {isCompiling ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-400 text-sm">Compiling LaTeX...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-red-400 text-xl font-semibold mb-2">Compilation Error</h3>
            <p className="text-gray-400 text-sm max-w-md">{error}</p>
            <p className="text-gray-500 text-xs mt-4">Check your LaTeX syntax</p>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full bg-white rounded shadow-2xl"
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              minHeight: '100%'
            }}
            title="PDF Preview"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-white text-xl font-semibold mb-2">No Preview Yet</h3>
            <p className="text-gray-400 text-sm max-w-md">
              Start typing LaTeX code in the editor to see a live preview here.
              The preview will update automatically as you type.
            </p>
            <div className="mt-6 p-4 bg-gray-800 rounded-lg text-left">
              <p className="text-gray-300 text-xs mb-2">Example LaTeX:</p>
              <pre className="text-green-400 text-xs">
{`\\documentclass{article}
\\begin{document}
Hello, World!
\\end{document}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}