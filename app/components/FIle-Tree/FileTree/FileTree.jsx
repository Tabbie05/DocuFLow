'use client';
import React, { useEffect } from 'react';
import useFileTree from '@/hooks/useFileTree';
import FileNode from '../../../components/FIle-Tree/FileNode/FIleNode';
import { normalizeFileName, getInitialContentFor } from '@/lib/latexBoilerplate';

export default function FileTree({ projectId, onFileSelect }) {
  const { files, fetchFiles, addItem, deleteItem, loading, error } = useFileTree(projectId);

  useEffect(() => {
    if (projectId) fetchFiles();
  }, [projectId]);

  const rootFiles = files.filter(f => f.parentId === null);

  const handleAddRoot = async (type) => {
    const raw = prompt(`New ${type} name:`);
    if (!raw || !raw.trim()) return;

    if (type === 'file') {
      const name = normalizeFileName(raw);
      await addItem(name, 'file', null, getInitialContentFor(name));
    } else {
      await addItem(raw.trim(), 'folder', null, '');
    }
  };

  return (
    <div className="h-full flex flex-col text-white/90">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">
            Files
          </span>
          <span className="text-[10px] text-white/30 font-mono">{rootFiles.length}</span>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => handleAddRoot('file')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 text-violet-100 backdrop-blur-md transition-all"
          >
            <span>＋</span> File
          </button>
          <button
            onClick={() => handleAddRoot('folder')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-100 backdrop-blur-md transition-all"
          >
            <span>＋</span> Folder
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-2">
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-white/45">
            <span className="h-3 w-3 mr-2 rounded-full border-2 border-violet-400/40 border-t-violet-400 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {!loading && rootFiles.length === 0 && !error && (
          <div className="text-center py-10 px-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="text-3xl mb-2 opacity-50">📂</div>
            <div className="text-xs text-white/55 font-medium">No files yet</div>
            <div className="text-[10px] text-white/30 mt-1">Click + File to get started</div>
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
