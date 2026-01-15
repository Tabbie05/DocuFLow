'use client';
import React, { useState } from 'react';
import FileActions from '../../../components/FIle-Tree/FileActions/FIleActions';

export default function FileNode({ file, files, addItem, deleteItem, onFileSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [addingType, setAddingType] = useState(null);
  const [newName, setNewName] = useState('');
  const [isSelected, setIsSelected] = useState(false);

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
    if (newName.trim()) {
      await addItem(newName.trim(), addingType, file._id);
      setAddingType(null);
      setNewName('');
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${file.name}?`)) {
      await deleteItem(file._id);
    }
  };

  return (
    <div className="my-0.5">
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none transition-colors group ${
          isSelected && !isFolder ? 'bg-blue-600 bg-opacity-20 border border-blue-600' : 'hover:bg-gray-800'
        } ${isFolder ? 'text-blue-400 font-medium' : 'text-gray-300'}`}
        onClick={handleClick}
      >
        <span className="text-sm">
          {isFolder ? (expanded ? '📂' : '📁') : '📄'}
        </span>
        <span className="text-sm flex-1 truncate">{file.name}</span>
        
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
              className="text-gray-500 hover:text-red-400 text-xs px-1"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {addingType && (
        <div className="ml-6 my-1 flex gap-1 items-center bg-gray-800 p-1.5 rounded">
          <span className="text-xs">{addingType === 'file' ? '📄' : '📁'}</span>
          <input
            autoFocus
            type="text"
            className="flex-grow rounded bg-gray-700 text-white px-2 py-1 text-xs outline-none"
            placeholder={`${addingType} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setAddingType(null);
            }}
          />
          <button onClick={handleAdd} className="text-green-400 hover:text-green-300 px-1">✓</button>
          <button onClick={() => setAddingType(null)} className="text-gray-400 hover:text-gray-300 px-1">✕</button>
        </div>
      )}

      {isFolder && expanded && (
        <div className="ml-4 border-l border-gray-700 pl-2 mt-0.5">
          {children.length === 0 ? (
            <div className="text-gray-600 text-xs py-1 px-2 italic">Empty</div>
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