'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import FileTree from '../../../components/FIle-Tree/FileTree/FileTree';
import LatexEditor from '../../../components/LatexEditor/LatexEditor';
import Toolbar from '../../../components/Editor/Toolbar';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id;
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleFileSelect = (file) => {
    if (file.type === 'file') {
      setSelectedFile(file);
    }
  };

  const handleFileSave = async (content) => {
    if (!selectedFile) return;

    try {
      const res = await fetch(`/api/files/${selectedFile._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        console.log('✅ Auto-saved!');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Top Bar with Gradient */}
      <Toolbar projectId={projectId} selectedFile={selectedFile} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: File Tree with Collapse */}
        <div 
          className={`border-r border-gray-700 bg-gradient-to-b from-gray-900 to-gray-950 transition-all duration-300 ${
            isSidebarCollapsed ? 'w-12' : 'w-64'
          }`}
        >
          {/* Collapse Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full h-10 flex items-center justify-center border-b border-gray-700 hover:bg-gray-800 transition-colors"
          >
            <span className="text-gray-400">
              {isSidebarCollapsed ? '→' : '←'}
            </span>
          </button>

          {!isSidebarCollapsed && (
            <FileTree projectId={projectId} onFileSelect={handleFileSelect} />
          )}
        </div>

        {/* CENTER + RIGHT: Editor + Preview */}
        <div className="flex-1 relative">
          {selectedFile ? (
            <LatexEditor 
              key={selectedFile._id}
              file={selectedFile}
              onSave={handleFileSave}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
              <div className="text-center max-w-md p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700">
                <div className="text-7xl mb-6 animate-bounce">📝</div>
                <h2 className="text-3xl text-white font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Welcome to DocuFlow
                </h2>
                <p className="text-gray-400 text-base mb-6">
                  Select a file from the sidebar to start editing, or create a new file to begin your document.
                </p>
                <div className="flex gap-3 justify-center">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all transform hover:scale-105">
                    New File
                  </button>
                  <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all transform hover:scale-105">
                    Templates
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Auto-save Indicator */}
          {selectedFile && (
            <div className="absolute top-4 right-4 bg-gray-800 px-3 py-1.5 rounded-full shadow-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-300">Auto-saving</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}