'use client';
import { useState, useCallback } from 'react';

export default function useFileTree(projectId) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/files?projectId=${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const addItem = async (name, type, parentId, content = '') => {
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          type, 
          parentId: parentId || null, 
          projectId,
          content
        }),
      });
      
      if (!res.ok) throw new Error('Failed to add item');
      
      const newItem = await res.json();
      setFiles((prev) => [...prev, newItem]);
      return newItem;
    } catch (err) {
      console.error('Add item error:', err);
      alert(`Failed to add ${type}`);
      return null;
    }
  };

  const deleteItem = async (fileId) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      
      // Remove from state
      setFiles((prev) => prev.filter(f => f._id !== fileId));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete item');
    }
  };

  const updateItem = async (fileId, updates) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) throw new Error('Failed to update');
      
      const updated = await res.json();
      setFiles((prev) => prev.map(f => f._id === fileId ? updated : f));
      return updated;
    } catch (err) {
      console.error('Update error:', err);
      return null;
    }
  };

  return { 
    files, 
    loading, 
    error, 
    fetchFiles, 
    addItem,
    deleteItem,
    updateItem
  };
}