import { useState, useCallback, useEffect } from 'react';
import {
  HistoryEntry,
  getHistory,
  getHistoryByType,
  addHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  getHistoryStats,
  initializeHistory,
} from '../lib/historyService';

interface UseHistoryReturn {
  history: HistoryEntry[];
  stats: ReturnType<typeof getHistoryStats>;
  addEntry: (type: 'detection' | 'voice', data: Record<string, any>, status: 'success' | 'error', errorMessage?: string) => void;
  deleteEntry: (id: string) => void;
  clearAll: () => void;
  getByType: (type: 'detection' | 'voice') => HistoryEntry[];
  refresh: () => void;
}

/**
 * Custom hook for managing detection and voice history
 * Automatically syncs with localStorage and provides history management
 * 
 * @returns {UseHistoryReturn} History state and methods
 * 
 * @example
 * const { history, stats, addEntry, clearAll } = useHistory();
 * 
 * // Add to history after detection
 * addEntry('detection', { count: 3, objects: [...] }, 'success');
 * 
 * // View statistics
 * console.log(stats.successRate); // "95.5%"
 */
export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState(getHistoryStats());

  // Initialize on mount
  useEffect(() => {
    initializeHistory();
    refreshHistory();
  }, []);

  /**
   * Refresh history from localStorage
   */
  const refreshHistory = useCallback(() => {
    const updated = getHistory();
    setHistory(updated);
    setStats(getHistoryStats());
  }, []);

  /**
   * Add new entry to history
   */
  const addEntry = useCallback(
    (type: 'detection' | 'voice', data: Record<string, any>, status: 'success' | 'error', errorMessage?: string) => {
      addHistoryEntry(type, data, status, errorMessage);
      refreshHistory();
    },
    [refreshHistory]
  );

  /**
   * Delete entry from history
   */
  const deleteEntry = useCallback(
    (id: string) => {
      deleteHistoryEntry(id);
      refreshHistory();
    },
    [refreshHistory]
  );

  /**
   * Clear all history
   */
  const clearAllHistory = useCallback(() => {
    clearHistory();
    refreshHistory();
  }, [refreshHistory]);

  /**
   * Get history filtered by type
   */
  const getByType = useCallback((type: 'detection' | 'voice') => {
    return getHistoryByType(type);
  }, []);

  return {
    history,
    stats,
    addEntry,
    deleteEntry,
    clearAll: clearAllHistory,
    getByType,
    refresh: refreshHistory,
  };
};

export default useHistory;
