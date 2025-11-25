import { useState, useEffect } from 'react';

const OFFLINE_MODE_KEY = 'offline_mode_enabled';

/**
 * Custom hook to manage offline mode state with localStorage persistence
 * @returns [offlineMode, setOfflineMode]
 */
export const useOfflineMode = (): [boolean, (enabled: boolean) => void] => {
  const [offlineMode, setOfflineModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_MODE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const setOfflineMode = (enabled: boolean) => {
    try {
      localStorage.setItem(OFFLINE_MODE_KEY, enabled.toString());
      setOfflineModeState(enabled);
    } catch (err) {
      console.warn('Failed to persist offline mode setting:', err);
      setOfflineModeState(enabled);
    }
  };

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === OFFLINE_MODE_KEY && e.newValue !== null) {
        setOfflineModeState(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return [offlineMode, setOfflineMode];
};

export default useOfflineMode;
