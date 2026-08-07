'use client';
import React, { useState, useRef, useEffect } from 'react';
import FileActions from '../../../components/FIle-Tree/FileActions/FIleActions';
import { normalizeFileName, getInitialContentFor } from '@/lib/latexBoilerplate';

export default function FileNode({ file, files, addItem, deleteItem, onFileSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [addingType, setAddingType] = useState(null);
  const [newName, setNewName] = useState('');
  const [isSelected, setIsSelected] = useState(false);
  const newNameInputRef = useRef(null);

  // autoFocus (and a bare focus()) scrolls every scrollable ancestor, which
  // slid the whole app shell up under the toolbar. Focus without scrolling,
  // then reveal the input inside the file list only.
  useEffect(() => {
    if (!addingType) return;
    const el = newNameInputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [addingType]);

  const children = files.filter(f => f.parentId === file._id);
  const isFolder = file.type === 'folder';

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    } else {
      setIsSelected(true);
      onFileSelect?.(file);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;

    if (addingType === 'file') {
      const name = normalizeFileName(newName);
      await addItem(name, 'file', file._id, getInitialContentFor(name));
    } else {
      await addItem(newName.trim(), 'folder', file._id, '');
    }

    setAddingType(null);
    setNewName('');
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${file.name}?`)) await deleteItem(file._id);
  };

  return (
    <div className="my-0.5">
      <div
        onClick={handleClick}
        className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer select-none transition-all ${
          isSelected && !isFolder
            ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/10 border border-violet-400/30 text-white shadow-md shadow-violet-500/10'
            : 'border border-transparent hover:bg-white/5 hover:border-white/5'
        }`}
      >
        <span className="text-sm flex-shrink-0">
          {isFolder ? (expanded ? '📂' : '📁') : '📄'}
        </span>
        <span className={`text-xs flex-1 truncate ${isFolder ? 'font-medium text-cyan-200' : 'text-white/85'}`}>
          {file.name}
        </span>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {isFolder ? (
            <FileActions
              onAddFile={() => { setAddingType('file'); setExpanded(true); }}
              onAddFolder={() => { setAddingType('folder'); setExpanded(true); }}
              onDelete={handleDelete}
            />
          ) : (
            <button
              onClick={handleDelete}
              className="text-white/30 hover:text-red-300 text-xs px-1 transition-colors"
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {addingType && (
        <div className="ml-5 my-1.5 flex gap-1 items-center bg-white/[0.04] border border-white/10 rounded-lg p-1.5 backdrop-blur-md">
          <span className="text-xs">{addingType === 'file' ? '📄' : '📁'}</span>
          <input
            ref={newNameInputRef}
            type="text"
            className="flex-grow bg-transparent text-white px-1.5 py-0.5 text-xs outline-none placeholder-white/30"
            placeholder={`${addingType} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setAddingType(null);
            }}
          />
          <button onClick={handleAdd} className="text-emerald-300 hover:text-emerald-200 px-1 text-xs">✓</button>
          <button onClick={() => setAddingType(null)} className="text-white/40 hover:text-white/70 px-1 text-xs">✕</button>
        </div>
      )}

      {isFolder && expanded && (
        <div className="ml-3.5 border-l border-white/8 pl-2 mt-0.5">
          {children.length === 0 ? (
            <div className="text-white/30 text-[11px] py-1 px-2 italic">Empty</div>
          ) : (
            children.map(child => (
              <FileNode
                key={child._id}
                file={child}
                files={files}
                addItem={addItem}
                deleteItem={deleteItem}
                onFileSelect={onFileSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
