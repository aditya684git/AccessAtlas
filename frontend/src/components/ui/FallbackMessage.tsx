/**
 * Fallback Message Component
 * Provides user-friendly messages for various failure scenarios
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { 
  MapPin, 
  Camera, 
  Navigation, 
  Mic, 
  Wifi,
  AlertTriangle,
  Info
} from 'lucide-react';

interface FallbackMessageProps {
  type: 
    | 'no-tags-found'
    | 'prediction-unavailable'
    | 'route-not-found'
    | 'voice-unavailable'
    | 'location-denied'
    | 'offline'
    | 'generic-error';
  onRetry?: () => void;
  message?: string; // Optional custom message
}

const fallbackConfig = {
  'no-tags-found': {
    icon: MapPin,
    title: 'No Accessibility Features Found',
    description: 'No accessibility features found in this area. Try zooming out or moving the map to explore nearby locations.',
    color: 'text-blue-500',
  },
  'prediction-unavailable': {
    icon: Camera,
    title: 'Prediction Unavailable',
    description: 'Unable to analyze the image. Please ensure good lighting and try again. If the problem persists, you can add tags manually.',
    color: 'text-amber-500',
  },
  'route-not-found': {
    icon: Navigation,
    title: 'Route Not Found',
    description: 'Unable to calculate a route to this location. The destination may be inaccessible or too far away. Try selecting a closer feature.',
    color: 'text-amber-500',
  },
  'voice-unavailable': {
    icon: Mic,
    title: 'Voice Commands Unavailable',
    description: 'Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari for the best experience.',
    color: 'text-red-500',
  },
  'location-denied': {
    icon: AlertTriangle,
    title: 'Location Access Denied',
    description: 'Location access is required for navigation and nearby features. Please enable location permissions in your browser settings.',
    color: 'text-red-500',
  },
  'offline': {
    icon: Wifi,
    title: 'You Are Offline',
    description: 'Some features require an internet connection. You can still view cached tags and use local navigation.',
    color: 'text-amber-500',
  },
  'generic-error': {
    icon: AlertTriangle,
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    color: 'text-red-500',
  },
};

export const FallbackMessage: React.FC<FallbackMessageProps> = ({ 
  type, 
  onRetry,
  message 
}) => {
  const config = fallbackConfig[type];
  const Icon = config.icon;

  return (
    <Alert 
      className="my-4 animate-slide-up" 
      variant={type.includes('unavailable') || type.includes('denied') || type.includes('error') ? 'destructive' : 'default'}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`h-4 w-4 ${config.color}`} />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message || config.description}</p>
        
        {/* Actionable advice based on error type */}
        {type === 'no-tags-found' && (
          <div className="text-sm space-y-1">
            <p className="font-semibold">What you can do:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Add new accessibility features you discover</li>
              <li>Use voice commands: "Add ramp" or "Add elevator"</li>
              <li>Zoom out to see features in a wider area</li>
            </ul>
          </div>
        )}
        
        {type === 'prediction-unavailable' && (
          <div className="text-sm space-y-1">
            <p className="font-semibold">Tips for better recognition:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure good lighting conditions</li>
              <li>Get closer to the accessibility feature</li>
              <li>Keep the camera steady</li>
              <li>Try capturing from a different angle</li>
            </ul>
          </div>
        )}
        
        {type === 'route-not-found' && (
          <div className="text-sm space-y-1">
            <p className="font-semibold">Alternatives:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Look for nearby accessibility features</li>
              <li>Try a different destination</li>
              <li>Check if you're in a supported area</li>
            </ul>
          </div>
        )}
        
        {type === 'location-denied' && (
          <div className="text-sm space-y-1">
            <p className="font-semibold">To enable location:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click the lock icon in the address bar</li>
              <li>Set location permission to "Allow"</li>
              <li>Refresh the page</li>
            </ul>
          </div>
        )}
        
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

/**
 * Empty State Component
 * For when there's no data but it's not an error
 */
export const EmptyState: React.FC<{
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon: Icon = Info, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
    {action && (
      <Button onClick={action.onClick} variant="default">
        {action.label}
      </Button>
    )}
  </div>
);

/**
 * Usage Examples:
 * 
 * // No tags found
 * <FallbackMessage type="no-tags-found" onRetry={() => fetchTags()} />
 * 
 * // ML prediction failed
 * <FallbackMessage type="prediction-unavailable" onRetry={() => retakePhoto()} />
 * 
 * // Navigation error
 * <FallbackMessage type="route-not-found" />
 * 
 * // Voice not supported
 * <FallbackMessage type="voice-unavailable" />
 * 
 * // Location denied
 * <FallbackMessage type="location-denied" />
 * 
 * // Offline mode
 * <FallbackMessage type="offline" message="Using cached data from earlier" />
 * 
 * // Generic error
 * <FallbackMessage type="generic-error" onRetry={() => reload()} />
 * 
 * // Empty state (not an error)
 * <EmptyState
 *   icon={MapPin}
 *   title="No Tags Yet"
 *   description="Start by adding your first accessibility feature"
 *   action={{
 *     label: "Add First Tag",
 *     onClick: () => openTaggingScreen()
 *   }}
 * />
 */
