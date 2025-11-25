/**
 * Local storage service for detection and voice history
 * Provides methods to save, retrieve, and clear history
 */

export interface HistoryEntry {
  id: string;
  type: 'detection' | 'voice';
  timestamp: string;
  data: Record<string, any>;
  status: 'success' | 'error';
  errorMessage?: string;
}

const STORAGE_KEY = 'accessatlas_history';
const MAX_HISTORY_ITEMS = 50; // Keep last 50 items

/**
 * Initialize history storage
 */
export const initializeHistory = (): void => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }
};

/**
 * Get all history entries
 */
export const getHistory = (): HistoryEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[History] Failed to retrieve history:', error);
    return [];
  }
};

/**
 * Get history filtered by type
 */
export const getHistoryByType = (type: 'detection' | 'voice'): HistoryEntry[] => {
  return getHistory().filter((entry) => entry.type === type);
};

/**
 * Add entry to history
 */
export const addHistoryEntry = (
  type: 'detection' | 'voice',
  data: Record<string, any>,
  status: 'success' | 'error',
  errorMessage?: string
): HistoryEntry => {
  const entry: HistoryEntry = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    data,
    status,
    errorMessage,
  };

  try {
    let history = getHistory();
    history.unshift(entry); // Add to beginning

    // Keep only last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history = history.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    console.log(`[History] ${type} entry added (total: ${history.length})`);
  } catch (error) {
    console.error('[History] Failed to save entry:', error);
  }

  return entry;
};

/**
 * Delete entry from history
 */
export const deleteHistoryEntry = (id: string): boolean => {
  try {
    const history = getHistory().filter((entry) => entry.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    console.log(`[History] Entry ${id} deleted`);
    return true;
  } catch (error) {
    console.error('[History] Failed to delete entry:', error);
    return false;
  }
};

/**
 * Clear all history
 */
export const clearHistory = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    console.log('[History] All history cleared');
  } catch (error) {
    console.error('[History] Failed to clear history:', error);
  }
};

/**
 * Export history as JSON
 */
export const exportHistory = (): string => {
  return JSON.stringify(getHistory(), null, 2);
};

/**
 * Get statistics about history
 */
export const getHistoryStats = () => {
  const history = getHistory();
  const detections = history.filter((e) => e.type === 'detection');
  const voices = history.filter((e) => e.type === 'voice');
  const successfulDetections = detections.filter((e) => e.status === 'success');
  const failedDetections = detections.filter((e) => e.status === 'error');

  return {
    totalEntries: history.length,
    detections: detections.length,
    voices: voices.length,
    successfulDetections: successfulDetections.length,
    failedDetections: failedDetections.length,
    successRate:
      detections.length > 0
        ? ((successfulDetections.length / detections.length) * 100).toFixed(1)
        : 'N/A',
  };
};
