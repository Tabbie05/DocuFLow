'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Toolbar({ projectId, selectedFile }) {
  const [isCompiling, setIsCompiling] = useState(false);

  const handleDownloadPDF = async () => {
    if (!selectedFile || !selectedFile.content) {
      alert('⚠️ No file content to compile!');
      return;
    }
    
    setIsCompiling(true);
    
    try {
      const response = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: selectedFile.content })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedFile.name.replace('.tex', '')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        // Success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = '✅ PDF downloaded successfully!';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      
      // Error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = '❌ ' + error.message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="h-14 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 flex items-center justify-between px-6 shadow-lg">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <Link 
          href="/" 
          className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Home
        </Link>
        
        <div className="h-6 w-px bg-gray-700"></div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <span className="text-white font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DocuFlow
            </span>
          </div>
          {selectedFile && (
            <>
              <span className="text-gray-600">/</span>
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-md">
                <span className="text-blue-400 text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">
                  {selectedFile.content?.length || 0} chars
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDownloadPDF}
          disabled={!selectedFile || isCompiling}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            selectedFile && !isCompiling
              ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transform hover:scale-105'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCompiling ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Compiling...
            </>
          ) : (
            <>
              <span>📥</span>
              Download PDF
            </>
          )}
        </button>

        <div className="text-xs text-gray-500 bg-gray-800 px-3 py-2 rounded-md">
          <span className="text-gray-400">Project:</span>{' '}
          <span className="font-mono text-blue-400">{projectId.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}