'use client';
import { useState, useEffect, useRef } from 'react';
import MonacoEditor from '../../components/Editor/MonacoEditor';
import PDFPreview from '../../components/Editor/PDFPreview';
import AIPanel from '../../components/AI/AIPanel';
import useAutoSave from '../../../hooks/useAutoSave';
import { io } from "socket.io-client";

export default function LatexEditor({ file, onSave, onToggleVersionsRef }) {
  // ================= STATE =================
  const [content, setContent] = useState(file.content || '');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState(null);
  const [compilesCount, setCompilesCount] = useState(0);
  const socketRef = useRef(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // VERSION HISTORY
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);

  // UI LAYOUT
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const lastCompiledContent = useRef('');
  const compileTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const isRemoteChange = useRef(false);

  // ================= VERSION FUNCTIONS =================
  const loadVersions = async () => {
    try {
      const res = await fetch(`/api/versions/${file._id}`);
      if (!res.ok) {
        console.error("Failed to load versions:", res.status);
        return;
      }
      const data = await res.json();
      console.log("Loaded versions:", data);
      setVersions(data);
    } catch (err) {
      console.error("Failed to load versions", err);
    }
  };

  const saveVersion = async (contentToSave) => {
    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file._id,
          content: contentToSave,
          label: 'Auto-save'
        }),
      });
      
      if (res.ok) {
        console.log('📸 Version saved');
        // Reload versions if panel is open
        if (showVersions) {
          loadVersions();
        }
      } else {
        console.error("Version save failed:", res.status);
      }
    } catch (err) {
      console.error("Failed to save version", err);
    }
  };

  const restoreVersion = (oldContent) => {
    setContent(oldContent);
    lastCompiledContent.current = "";
    saveVersion(oldContent);
    setShowVersions(false); // Close panel after restore
  };

  const toggleVersionsPanel = () => {
    const newState = !showVersions;
    setShowVersions(newState);
    if (newState) {
      loadVersions();
    }
  };

  // expose toggle to parent (Toolbar button)
  useEffect(() => {
    if (onToggleVersionsRef) {
      onToggleVersionsRef.current = toggleVersionsPanel;
    }
  }, [showVersions]);

  // ================= AUTO SAVE WITH VERSION =================
  useAutoSave(content, async (contentToSave) => {
    await onSave(contentToSave);
    // Save version every ~5 edits (20% chance)
    const shouldSaveVersion = Math.random() < 0.2;
    if (shouldSaveVersion) {
      await saveVersion(contentToSave);
    }
  }, 2000);

  // ================= SOCKET.IO CONNECTION =================
  useEffect(() => {
    // Get socket URL from environment variable
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    console.log("Connecting to socket server:", SOCKET_URL);
    
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      
      // Get username from localStorage or generate one
      const username = localStorage.getItem('username') || `User-${Date.now()}`;
      
      socketRef.current.emit('join-project', {
        projectId: file.projectId,
        username
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('receive-changes', ({ content: newContent, username }) => {
      console.log(`📝 Received changes from ${username}`);
      isRemoteChange.current = true;
      setContent(newContent);
      setTimeout(() => {
        isRemoteChange.current = false;
      }, 100);
    });

    socketRef.current.on('active-users', ({ activeUsers }) => {
      setActiveUsers(activeUsers);
    });

    socketRef.current.on('user-joined', ({ username, activeUsers }) => {
      setActiveUsers(activeUsers);
      console.log(`👤 ${username} joined`);
    });

    socketRef.current.on('user-left', ({ username, activeUsers }) => {
      setActiveUsers(activeUsers);
      console.log(`👋 ${username} left`);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [file.projectId]);

  // ================= AUTO COMPILE =================
  useEffect(() => {
    if (isRemoteChange.current) return;
    if (content === lastCompiledContent.current) return;

    if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current);

    compileTimeoutRef.current = setTimeout(() => {
      if (content.trim()) compileLatex();
      else {
        setPdfUrl(null);
        setPdfBlob(null);
        setError(null);
      }
    }, 2000);

    return () => clearTimeout(compileTimeoutRef.current);
  }, [content]);

  // ================= RESIZE HANDLER =================
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.min(Math.max(pct, 20), 80));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // ================= LATEX COMPILE =================
  const compileLatex = async () => {
    const codeToCompile = content;
    if (!codeToCompile.trim()) return;

    setIsCompiling(true);
    setError(null);

    try {
      const response = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: codeToCompile }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Received empty PDF');

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfBlob(blob);
      lastCompiledContent.current = codeToCompile;
      setCompilesCount(prev => prev + 1);
    } catch (err) {
      console.error("Compilation error:", err);
      setError(err.message);
      setPdfUrl(null);
      setPdfBlob(null);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleEditorChange = (value) => {
    if (isRemoteChange.current) {
      return;
    }

    setContent(value);

    if (socketRef.current?.connected) {
      const username = localStorage.getItem('username') || 'Anonymous';
      socketRef.current.emit('typing', {
        projectId: file.projectId,
        content: value,
        username
      });
    }
  };

  const handleLatexGenerated = (newLatex) => {
    setContent(newLatex);
    lastCompiledContent.current = "";
    saveVersion(newLatex);
  };

  // ================= LAYOUT WIDTHS =================
  const editorWidth = showAIPanel ? splitPosition * 0.7 : splitPosition;
  const pdfWidth = showAIPanel ? (100 - splitPosition) * 0.7 : 100 - splitPosition;
  const aiWidth = showAIPanel ? 30 : 0;

  // ================= UI =================
  return (
    <div ref={containerRef} className="flex h-full">
      {/* ===== EDITOR ===== */}
      <div style={{ width: `${editorWidth}%` }} className="flex flex-col border-r border-gray-700">
        <div className="h-9 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">● LaTeX Editor</span>
            
            {/* Connection Status */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Active Users */}
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-gray-500">👥</span>
                <span className="text-xs text-gray-400">{activeUsers.length}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={toggleVersionsPanel}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                showVersions 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              📜 Versions
            </button>
            <button 
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              🤖 AI
            </button>
          </div>
        </div>

        <MonacoEditor
          value={content}
          onChange={handleEditorChange}
          language="latex"
        />
      </div>

      {/* RESIZER */}
      <div onMouseDown={() => setIsResizing(true)} className="w-1 bg-gray-700 cursor-col-resize hover:bg-blue-500" />

      {/* PDF PREVIEW */}
      <div style={{ width: `${pdfWidth}%` }} className="border-r border-gray-700">
        <PDFPreview pdfUrl={pdfUrl} isCompiling={isCompiling} error={error} />
      </div>

      {/* AI PANEL */}
      {showAIPanel && (
        <div style={{ width: `${aiWidth}%` }}>
          <AIPanel 
            existingContent={content} 
            onLatexGenerated={handleLatexGenerated}
            isVisible={showAIPanel} 
            onClose={() => setShowAIPanel(false)} 
          />
        </div>
      )}

      {/* VERSION HISTORY PANEL */}
      {showVersions && (
        <div style={{ width: "22%" }} className="bg-gray-950 border-l border-gray-700 flex flex-col absolute right-0 top-0 bottom-0 z-50 shadow-2xl">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <span className="font-bold text-sm">Version History</span>
            <button 
              onClick={() => setShowVersions(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {versions.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-gray-500 text-xs">No versions yet</p>
                <p className="text-gray-600 text-xs mt-2">
                  Versions are saved automatically as you edit
                </p>
              </div>
            )}
            {versions.map((v) => (
              <div
                key={v._id}
                className="p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => restoreVersion(v.content)}
              >
                <p className="text-xs text-gray-400">
                  {new Date(v.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-blue-400">
                  {v.userId?.username || "User"}
                </p>
                {v.label && (
                  <p className="text-xs text-gray-500 mt-1">{v.label}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  {v.content.length} characters
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}