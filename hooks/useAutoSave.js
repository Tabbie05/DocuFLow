'use client';
import { useEffect, useRef } from 'react';

export default function useAutoSave(value, onSave, delay = 2000) {
  const timeoutRef = useRef(null);
  const previousValue = useRef(value);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only save if value changed
    if (value !== previousValue.current) {
      timeoutRef.current = setTimeout(() => {
        onSave(value);
        previousValue.current = value;
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, onSave, delay]);
}
