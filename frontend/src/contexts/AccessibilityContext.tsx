/**
 * Accessibility Context
 * Provides global accessibility settings throughout the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useAccessibilitySettings,
  AccessibilitySettings,
} from '../hooks/useAccessibilitySettings';

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(
  undefined
);

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const accessibilityHook = useAccessibilitySettings();

  return (
    <AccessibilityContext.Provider value={accessibilityHook}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};
