/**
 * NavigationContext
 * Manages navigation state across the app
 * Stores the target tag for navigation and provides methods to start/stop navigation
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Tag } from '../types/tag';

interface NavigationContextType {
  /**
   * Current target tag for navigation (null if no navigation active)
   */
  targetTag: Tag | null;

  /**
   * Whether navigation is currently active
   */
  isNavigating: boolean;

  /**
   * Start navigation to a specific tag
   */
  startNavigation: (tag: Tag) => void;

  /**
   * Stop/cancel current navigation
   */
  stopNavigation: () => void;

  /**
   * User's current location (if available)
   */
  userLocation: { lat: number; lon: number } | null;

  /**
   * Update user's current location
   */
  setUserLocation: (location: { lat: number; lon: number } | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * NavigationProvider Component
 * Wraps the app to provide navigation state
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [targetTag, setTargetTag] = useState<Tag | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  /**
   * Start navigation to a tag
   */
  const startNavigation = useCallback((tag: Tag) => {
    setTargetTag(tag);
    setIsNavigating(true);
    console.log('🧭 Navigation started to:', tag.type, 'at', tag.lat, tag.lon);
  }, []);

  /**
   * Stop/cancel navigation
   */
  const stopNavigation = useCallback(() => {
    setTargetTag(null);
    setIsNavigating(false);
    console.log('🛑 Navigation stopped');
  }, []);

  const value: NavigationContextType = {
    targetTag,
    isNavigating,
    startNavigation,
    stopNavigation,
    userLocation,
    setUserLocation,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * Hook to use navigation context
 * Throws error if used outside NavigationProvider
 */
export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};
