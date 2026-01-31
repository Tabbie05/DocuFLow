'use client';
import { useState, useEffect, useRef } from 'react';
import MonacoEditor from '../../components/Editor/MonacoEditor';
import PDFPreview from '../../components/Editor/PDFPreview';
import useAutoSave from '../../../hooks/useAutoSave';

export default function LatexEditor({ file, onSave }) {
  const [content, setContent] = useState(file.content || '');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState(null);
  const [compilesCount, setCompilesCount] = useState(0);
  const [splitPosition, setSplitPosition] = useState(50); // % of width
  const [isResizing, setIsResizing] = useState(false);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  
  const lastCompiledContent = useRef('');
  const compileTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-save
  useAutoSave(content, () => onSave(content), 2000);

  // Auto-compile
  useEffect(() => {
    if (content === lastCompiledContent.current) return;
    
    if (compileTimeoutRef.current) {
      clearTimeout(compileTimeoutRef.current);
    }
    
    compileTimeoutRef.current = setTimeout(() => {
      if (content.trim()) {
        compileLatex();
      } else {
        setPdfUrl(null);
        setPdfBlob(null);
        setError(null);
      }
    }, 2000);

    return () => {
      if (compileTimeoutRef.current) {
        clearTimeout(compileTimeoutRef.current);
      }
    };
  }, [content]);

  // Handle mouse resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setSplitPosition(Math.min(Math.max(newPosition, 20), 80));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const compileLatex = async () => {
    const codeToCompile = content;
    
    if (codeToCompile === lastCompiledContent.current) return;
    if (!codeToCompile.trim()) return;
    
    setIsCompiling(true);
    setError(null);

    try {
      const response = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: codeToCompile }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Received empty PDF');
      }
      
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfBlob(blob);
      lastCompiledContent.current = codeToCompile;
      setCompilesCount(prev => prev + 1);
      setError(null);

    } catch (err) {
      console.error('❌ Compilation error:', err);
      setError(err.message || 'Compilation failed');
      setPdfUrl(null);
      setPdfBlob(null);
    } finally {
      setIsCompiling(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `${file.name.replace('.tex', '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      if (compileTimeoutRef.current) {
        clearTimeout(compileTimeoutRef.current);
      }
    };
  }, [pdfUrl]);

  if (pdfFullscreen) {
    return (
      <div className="h-full bg-gray-900 relative">
        <button
          onClick={() => setPdfFullscreen(false)}
          className="absolute top-4 right-4 z-10 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
        >
          ← Back to Editor
        </button>
        <PDFPreview 
          pdfUrl={pdfUrl}
          isCompiling={isCompiling}
          error={error}
          fileName={file.name}
          compilesCount={compilesCount}
          onDownload={downloadPDF}
          hasValidPdf={!!pdfBlob}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full relative">
      {/* Editor Panel */}
      <div 
        style={{ width: `${splitPosition}%` }}
        className="border-r border-gray-700 flex flex-col"
      >
        <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
          <span className="text-gray-400 text-sm font-medium">LaTeX Editor</span>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {content.length} chars
            </div>
          </div>
        </div>
        <div className="flex-1">
          <MonacoEditor 
            value={content}
            onChange={setContent}
            language="latex"
          />
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors ${
          isResizing ? 'bg-blue-500' : ''
        }`}
      />

      {/* PDF Panel */}
      <div 
        style={{ width: `${100 - splitPosition}%` }}
        className="bg-gray-900 flex flex-col"
      >
        <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
          <span className="text-gray-400 text-sm font-medium">PDF Preview</span>
          <button
            onClick={() => setPdfFullscreen(true)}
            disabled={!pdfUrl}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔍 Fullscreen
          </button>
        </div>
        <div className="flex-1">
          <PDFPreview 
            pdfUrl={pdfUrl}
            isCompiling={isCompiling}
            error={error}
            fileName={file.name}
            compilesCount={compilesCount}
            onDownload={downloadPDF}
            hasValidPdf={!!pdfBlob}
          />
        </div>
      </div>
    </div>
  );
}