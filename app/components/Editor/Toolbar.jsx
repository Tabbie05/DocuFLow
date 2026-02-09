'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Toolbar({ projectId, selectedFile, onToggleVersions }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!selectedFile || !selectedFile.content) {
      showNotification('❌ No file selected', 'error');
      return;
    }
    
    setIsDownloading(true);
    
    try {
      console.log('📝 Compiling PDF...');
      
      const response = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: selectedFile.content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Received empty PDF');
      }

      // Download PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedFile.name.replace('.tex', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ PDF downloaded successfully');
      showNotification('✅ PDF downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Download error:', error);
      showNotification(`❌ ${error.message}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTeX = () => {
    if (!selectedFile) {
      showNotification('❌ No file selected', 'error');
      return;
    }
    
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('✅ .tex file downloaded!', 'success');
  };

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  return (
    <div className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Link 
          href="/" 
          className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Home
        </Link>
        
        <div className="h-6 w-px bg-gray-700"></div>
        
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">📝 DocuFlow</span>
          {selectedFile && (
            <>
              <span className="text-gray-600">/</span>
              <span className="text-blue-400 text-sm font-mono">{selectedFile.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Download .tex */}
        <button
          onClick={handleDownloadTeX}
          disabled={!selectedFile}
          title="Download LaTeX source (.tex)"
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
            selectedFile
              ? 'bg-gray-700 hover:bg-gray-600 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          .tex
        </button>

        {/* Download PDF */}
        <button
          onClick={handleDownloadPDF}
          disabled={!selectedFile || isDownloading}
          title="Compile and download PDF"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            selectedFile && !isDownloading
              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg hover:shadow-green-600/50'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isDownloading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Compiling...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </>
          )}
        </button>

        <button
  onClick={onToggleVersions}
  className="text-xs bg-gray-700 text-gray-300 px-2.5 py-1 rounded-md font-semibold hover:bg-gray-600"
>
  🕒 Versions
</button>



        <div className="h-6 w-px bg-gray-700"></div>

        <div className="text-xs text-gray-600 font-mono">
          ID: {projectId.slice(0, 8)}...
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
          transition: all 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}