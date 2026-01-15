'use client';
export default function FileActions({ onAddFile, onAddFolder, onDelete }) {
  return (
    <div className="flex gap-0.5">
      <button
        onClick={(e) => { e.stopPropagation(); onAddFile(); }}
        className="text-gray-500 hover:text-blue-400 text-xs px-1"
        title="Add File"
      >
        📄+
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAddFolder(); }}
        className="text-gray-500 hover:text-green-400 text-xs px-1"
        title="Add Folder"
      >
        📁+
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-gray-500 hover:text-red-400 text-xs px-1"
          title="Delete"
        >
          🗑️
        </button>
      )}
    </div>
  );
}