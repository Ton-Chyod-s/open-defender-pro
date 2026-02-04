import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/defenderApi';

export function useThreats() {
  const [threats, setThreats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(null); // threatId being removed
  const [isClearing, setIsClearing] = useState(false);

  const loadThreats = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.getThreatDetails();
      setThreats(result);
      return result;
    } catch (error) {
      console.error('Erro ao carregar ameaças:', error);
      const fallback = { 
        total_threats: 0, 
        threats: [],
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0
      };
      setThreats(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeThreat = useCallback(async (threatId) => {
    try {
      setIsRemoving(threatId);
      await api.removeThreat(threatId);
      await loadThreats();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsRemoving(null);
    }
  }, [loadThreats]);

  const clearAllThreats = useCallback(async () => {
    try {
      setIsClearing(true);
      await api.clearAllThreats();
      await loadThreats();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsClearing(false);
    }
  }, [loadThreats]);

  useEffect(() => {
    loadThreats();
  }, [loadThreats]);

  return {
    threats,
    threatsList: threats?.threats || [],
    totalThreats: threats?.total_threats || 0,
    highSeverity: threats?.high_severity || 0,
    mediumSeverity: threats?.medium_severity || 0,
    lowSeverity: threats?.low_severity || 0,
    isLoading,
    isRemoving,
    isClearing,
    refresh: loadThreats,
    removeThreat,
    clearAllThreats
  };
}

export default useThreats;
