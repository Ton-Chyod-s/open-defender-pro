import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/defenderApi';

export function useDefender() {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  
  const loadingRef = useRef(false);
  const lastLoadRef = useRef(0);

  const loadStatus = useCallback(async (force = false) => {
    const now = Date.now();
    if (loadingRef.current) return;
    if (!force && now - lastLoadRef.current < 1000) return;

    loadingRef.current = true;
    lastLoadRef.current = now;
    
    try {
      setError(null);
      const result = await api.getDefenderStatus();
      setStatus(result);
    } catch (err) {
      setError(err);
      console.error('Erro ao carregar status:', err);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const updateDefinitions = useCallback(async () => {
    setIsUpdating(true);
    try {
      await api.updateDefinitions();
      await loadStatus(true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    } finally {
      setIsUpdating(false);
    }
  }, [loadStatus]);

  useEffect(() => {
    loadStatus(true);

    const handleFocus = () => loadStatus(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadStatus(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadStatus]);

  return {
    status,
    isLoading,
    isUpdating,
    error,
    refresh: () => loadStatus(true),
    updateDefinitions
  };
}

export default useDefender;
