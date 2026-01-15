'use client';
import React, { useEffect } from 'react';
import useFileTree from '@/hooks/useFileTree';
import FileNode from '../../../components/FIle-Tree/FileNode/FIleNode';
import { getLaTeXBoilerplate } from '../../../../lib/latexBoilerplate';

export default function FileTree({ projectId, onFileSelect }) {
  const { files, fetchFiles, addItem, deleteItem, loading, error } = useFileTree(projectId);

  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  const rootFiles = files.filter(f => f.parentId === null);

  const handleAddRoot = async (type) => {
    const name = prompt(`Enter ${type} name:`);
    if (!name || !name.trim()) return;

    const content = type === 'file' && name.endsWith('.tex') 
      ? getLaTeXBoilerplate(name.replace('.tex', ''))
      : '';

    await addItem(name.trim(), type, null, content);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          📁 Files
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleAddRoot('file')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-2 rounded transition-colors font-medium"
          >
            + File
          </button>
          <button
            onClick={() => handleAddRoot('folder')}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-2 rounded transition-colors font-medium"
          >
            + Folder
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto p-2">
        {loading && (
          <div className="text-center text-gray-400 py-8 text-sm">
            <div className="animate-pulse">Loading...</div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900 bg-opacity-20 border border-red-700 text-red-400 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}

        {!loading && rootFiles.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8 border border-dashed border-gray-700 rounded">
            <div className="mb-2">📂</div>
            <div>No files yet</div>
            <div className="text-gray-700 mt-1 text-xs">Click + File to start</div>
          </div>
        )}
        
        {rootFiles.map(file => (
          <FileNode 
            key={file._id} 
            file={file} 
            files={files} 
            addItem={addItem}
            deleteItem={deleteItem}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}