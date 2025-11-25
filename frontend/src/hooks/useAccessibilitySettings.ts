/**
 * Accessibility Settings Hook
 * Manages voice feedback speed, verbosity, and other accessibility preferences
 */

import { useState, useEffect } from 'react';

export interface AccessibilitySettings {
  voiceSpeed: number; // 0.5 - 2.0
  voiceVerbosity: 'brief' | 'standard' | 'detailed';
  voiceEnabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigationHints: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  voiceSpeed: 1.0,
  voiceVerbosity: 'standard',
  voiceEnabled: true,
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
  keyboardNavigationHints: true,
};

const STORAGE_KEY = 'accessibility_settings';

/**
 * Hook for managing accessibility settings
 */
export const useAccessibilitySettings = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }, [settings]);

  // Apply reduced motion preference
  useEffect(() => {
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.reducedMotion]);

  // Apply high contrast
  useEffect(() => {
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [settings.highContrast]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
  };
};
