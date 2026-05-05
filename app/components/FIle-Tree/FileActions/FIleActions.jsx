'use client';
export default function FileActions({ onAddFile, onAddFolder, onDelete }) {
  const cls = "text-white/30 hover:text-white text-xs px-1 transition-colors";
  return (
    <div className="flex gap-0.5">
      <button
        onClick={(e) => { e.stopPropagation(); onAddFile(); }}
        className={`${cls} hover:text-violet-300`}
        title="Add file"
      >
        📄＋
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAddFolder(); }}
        className={`${cls} hover:text-cyan-300`}
        title="Add folder"
      >
        📁＋
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={`${cls} hover:text-red-300`}
          title="Delete"
        >
          🗑
        </button>
      )}
    </div>
  );
}
