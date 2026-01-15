'use client';
import { useState, useEffect } from 'react';
import MonacoEditor from '../Editor/MonacoEditor';
import PDFPreview from '../Editor/PDFPreview';
import useAutoSave from '../../../hooks/useAutoSave';

export default function LatexEditor({ file, onSave }) {
  const [content, setContent] = useState(file.content || '');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState(null);

  // Auto-save hook
  useAutoSave(content, () => onSave(content), 2000);

  // Auto-compile on content change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim()) {
        compileLaTeX(content);
      } else {
        setPdfUrl(null);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content]);

  // Cleanup old PDF URL
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const compileLaTeX = async (latexCode) => {
    setIsCompiling(true);
    setError(null);

    try {
      const response = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: latexCode })
      });

      if (response.ok) {
        const blob = await response.blob();
        
        // Revoke old URL before creating new one
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Compilation failed');
        setPdfUrl(null);
      }
    } catch (err) {
      console.error('Compile error:', err);
      setError('Network error. Please check your connection.');
      setPdfUrl(null);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Editor */}
      <div className="flex-1 border-r border-gray-700">
        <MonacoEditor 
          value={content}
          onChange={setContent}
          language="latex"
        />
      </div>

      {/* Right: Preview */}
      <div className="flex-1 bg-gray-900">
        <PDFPreview 
          pdfUrl={pdfUrl}
          isCompiling={isCompiling}
          fileName={file.name}
          error={error}
        />
      </div>
    </div>
  );
}

