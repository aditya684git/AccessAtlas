/**
 * Enhanced Navigation Screen with Turn-by-Turn Instructions
 * Uses Leaflet Routing Machine for route calculation and obstacle detection
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-geometryutil';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Navigation as NavigationIcon, Volume2, X, AlertTriangle } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { useNavigation } from '../contexts/NavigationContext';
import { ttsService } from '../lib/ttsService';
import { toast } from '../hooks/use-toast';
import type { Tag } from '../types/tag';

// Tag type to emoji mapping
const TAG_ICONS: Record<string, string> = {
  'ramp': '♿',
  'elevator': '🛗',
  'tactile_path': '🦯',
  'entrance': '🚪',
  'obstacle': '🚧',
};

interface RouteInstruction {
  text: string;
  distance: number;
  index: number;
}

const NavigationScreen: React.FC = () => {
  const navigate = useNavigate();
  const { targetTag, isNavigating, stopNavigation, userLocation } = useNavigation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routingControl = useRef<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing navigation...');
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [instructions, setInstructions] = useState<RouteInstruction[]>([]);
  const [obstaclesDetected, setObstaclesDetected] = useState<Tag[]>([]);
  const [isRouteCalculated, setIsRouteCalculated] = useState(false);

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, []);

  /**
   * Check if a point is near a polyline (within threshold meters)
   */
  const isPointNearPolyline = (
    point: L.LatLng,
    polyline: L.Polyline,
    thresholdMeters: number = 20
  ): boolean => {
    const latlngs = polyline.getLatLngs() as L.LatLng[];
    for (let i = 0; i < latlngs.length - 1; i++) {
      const segmentStart = latlngs[i];
      const segmentEnd = latlngs[i + 1];
      
      // Calculate distance from point to line segment using GeometryUtil
      const dist = L.GeometryUtil.closestOnSegment(map.current!, point, segmentStart, segmentEnd);
      const distanceMeters = calculateDistance(
        point.lat,
        point.lng,
        dist.lat,
        dist.lng
      );
      
      if (distanceMeters <= thresholdMeters) {
        return true;
      }
    }
    return false;
  };

  /**
   * Detect obstacles along the route
   */
  const detectObstacles = useCallback(async (routePolyline: L.Polyline) => {
    try {
      // Get all tags from localStorage
      const storedTags = localStorage.getItem('accessibility_tags');
      if (!storedTags) return [];

      const allTags: Tag[] = JSON.parse(storedTags);
      
      // Filter for obstacle-type tags
      const obstacleTags = allTags.filter(tag => 
        ['obstacle', 'stairs', 'construction'].includes(tag.type.toLowerCase())
      );

      // Check which obstacles are near the route
      const detectedObstacles: Tag[] = [];
      for (const tag of obstacleTags) {
        const tagPoint = L.latLng(tag.lat, tag.lon);
        if (isPointNearPolyline(tagPoint, routePolyline, 20)) {
          detectedObstacles.push(tag);
        }
      }

      return detectedObstacles;
    } catch (err) {
      console.error('Error detecting obstacles:', err);
      return [];
    }
  }, [calculateDistance]);

  /**
   * Speak instruction with TTS
   */
  const speakInstruction = useCallback((text: string) => {
    setCurrentInstruction(text);
    ttsService.speak(text);
  }, []);

  /**
   * Initialize map and routing
   */
  useEffect(() => {
    // Redirect if no target tag
    if (!targetTag) {
      console.warn('No target tag for navigation, redirecting to tagging');
      navigate('/tagging');
      return;
    }

    // Inject Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    if (!document.querySelector(`link[href="${link.href}"]`)) {
      document.head.appendChild(link);
    }

    // Inject Leaflet Routing Machine CSS
    const routingLink = document.createElement('link');
    routingLink.rel = 'stylesheet';
    routingLink.href = 'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css';
    if (!document.querySelector(`link[href="${routingLink.href}"]`)) {
      document.head.appendChild(routingLink);
    }

    // Initialize map
    if (mapContainer.current && !map.current) {
      map.current = L.map(mapContainer.current).setView(
        [targetTag.lat, targetTag.lon],
        16
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map.current);

      // Add destination marker
      const icon = TAG_ICONS[targetTag.type] || '📍';
      const destinationIcon = L.divIcon({
        html: `<div style="font-size: 32px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${icon}</div>`,
        className: 'destination-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      L.marker([targetTag.lat, targetTag.lon], { icon: destinationIcon })
        .addTo(map.current)
        .bindPopup(`<strong>${targetTag.type.replace('_', ' ')}</strong><br/>${targetTag.address || 'Destination'}`)
        .openPopup();

      // Determine start location
      const startLat = userLocation?.lat || 34.67;
      const startLon = userLocation?.lon || -82.48;

      // Add user location marker
      const userIcon = L.divIcon({
        html: `<div style="width: 16px; height: 16px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'user-marker',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([startLat, startLon], { icon: userIcon })
        .addTo(map.current)
        .bindPopup('You are here');

      // Initialize Leaflet Routing Machine
      try {
        // @ts-ignore - Leaflet Routing Machine types
        routingControl.current = L.Routing.control({
          waypoints: [
            L.latLng(startLat, startLon),
            L.latLng(targetTag.lat, targetTag.lon)
          ],
          // @ts-ignore
          router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'foot' // Walking route
          }),
          lineOptions: {
            styles: [{ color: '#2563eb', opacity: 0.8, weight: 6 }]
          },
          show: false, // Hide default instructions panel
          addWaypoints: false,
          routeWhileDragging: false,
          fitSelectedRoutes: true,
          showAlternatives: false,
        }).addTo(map.current);

        // Handle route found event
        routingControl.current.on('routesfound', (e: any) => {
          const routes = e.routes;
          const summary = routes[0].summary;
          
          setDistance(summary.totalDistance);
          setDuration(summary.totalTime);
          setIsRouteCalculated(true);

          // Extract turn-by-turn instructions
          const routeInstructions: RouteInstruction[] = routes[0].instructions.map((instr: any, idx: number) => ({
            text: instr.text,
            distance: instr.distance,
            index: idx
          }));
          
          setInstructions(routeInstructions);

          // Speak first instruction
          if (routeInstructions.length > 0) {
            const firstInstruction = routeInstructions[0].text;
            const distanceText = summary.totalDistance < 1000
              ? `${Math.round(summary.totalDistance)} meters`
              : `${(summary.totalDistance / 1000).toFixed(1)} kilometers`;
            
            const message = `Route calculated. Total distance: ${distanceText}. ${firstInstruction}`;
            setStatusMessage(message);
            speakInstruction(message);
          }

          // Detect obstacles along the route
          const routePolyline = routes[0].coordinates.map((coord: any) => L.latLng(coord.lat, coord.lng));
          const polyline = L.polyline(routePolyline);
          
          detectObstacles(polyline).then((obstacles) => {
            setObstaclesDetected(obstacles);
            
            if (obstacles.length > 0) {
              const obstacleMessage = `Warning: ${obstacles.length} obstacle${obstacles.length > 1 ? 's' : ''} detected along the route.`;
              toast({
                title: 'Obstacles Detected',
                description: obstacleMessage,
                variant: 'destructive',
              });
              ttsService.speak(obstacleMessage);
              
              // Add obstacle markers
              obstacles.forEach(obstacle => {
                L.marker([obstacle.lat, obstacle.lon], {
                  icon: L.divIcon({
                    html: '<div style="font-size: 24px;">⚠️</div>',
                    className: 'obstacle-marker',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                  })
                }).addTo(map.current!)
                  .bindPopup(`<strong>Obstacle:</strong> ${obstacle.type}`);
              });
            } else {
              const clearMessage = 'Path is clear. No obstacles detected.';
              speakInstruction(clearMessage);
            }
          });
        });

        // Handle routing errors
        routingControl.current.on('routingerror', (e: any) => {
          console.error('Routing error:', e);
          const errorMessage = 'Could not calculate route. Please try again.';
          setStatusMessage(errorMessage);
          ttsService.speak(errorMessage);
          toast({
            title: 'Routing Error',
            description: errorMessage,
            variant: 'destructive',
          });
        });

      } catch (err) {
        console.error('Error initializing routing:', err);
        const errorMessage = 'Navigation unavailable. Using direct route.';
        setStatusMessage(errorMessage);
        ttsService.speak(errorMessage);
        
        // Fallback: Draw straight line
        L.polyline(
          [[startLat, startLon], [targetTag.lat, targetTag.lon]],
          { color: '#2563eb', weight: 4, opacity: 0.7, dashArray: '10, 10' }
        ).addTo(map.current!);
      }
    }

    return () => {
      if (routingControl.current && map.current) {
        try {
          map.current.removeControl(routingControl.current);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      routingControl.current = null;
    };
  }, [targetTag, userLocation, navigate, speakInstruction, detectObstacles]);

  /**
   * Handle back button
   */
  const handleBack = useCallback(() => {
    stopNavigation();
    ttsService.speak('Navigation cancelled');
    navigate('/tagging');
  }, [stopNavigation, navigate]);

  /**
   * Handle cancel navigation
   */
  const handleCancelNavigation = useCallback(() => {
    stopNavigation();
    ttsService.speak('Navigation cancelled. Returning to tagging.');
    toast({
      title: 'Navigation Cancelled',
      description: 'Returning to tagging screen',
    });
    navigate('/tagging');
  }, [stopNavigation, navigate]);

  // Voice command: cancel navigation
  useEffect(() => {
    const handleVoiceCancelNavigation = () => {
      handleCancelNavigation();
    };

    window.addEventListener('voiceCancelNavigation', handleVoiceCancelNavigation);
    return () => {
      window.removeEventListener('voiceCancelNavigation', handleVoiceCancelNavigation);
    };
  }, [handleCancelNavigation]);

  /**
   * Speak next instruction (can be triggered by button or periodically)
   */
  const speakNextInstruction = useCallback((index: number) => {
    if (index < instructions.length) {
      const instruction = instructions[index];
      const distanceText = instruction.distance < 1000
        ? `in ${Math.round(instruction.distance)} meters`
        : `in ${(instruction.distance / 1000).toFixed(1)} kilometers`;
      
      const message = `${instruction.text} ${distanceText}`;
      speakInstruction(message);
    }
  }, [instructions, speakInstruction]);

  if (!targetTag) {
    return null;
  }

  return (
    <MobileLayout title="Navigation" showNav={false}>
      <div className="relative w-full h-full flex flex-col">
        {/* Status Bar */}
        <Card className="absolute top-4 left-4 right-4 z-[1000] bg-white shadow-lg max-h-[70vh] overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Destination Info */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <NavigationIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg capitalize">
                  {targetTag.type.replace('_', ' ')}
                </h3>
                {targetTag.address && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {targetTag.address}
                  </p>
                )}
                <div className="flex gap-4 mt-1">
                  {distance !== null && (
                    <p className="text-sm text-blue-600 font-medium">
                      {distance < 1000
                        ? `${Math.round(distance)}m`
                        : `${(distance / 1000).toFixed(1)}km`}
                    </p>
                  )}
                  {duration !== null && (
                    <p className="text-sm text-gray-600">
                      ~{Math.round(duration / 60)} min
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Current Instruction */}
            {currentInstruction && (
              <div
                className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg"
                role="status"
                aria-live="polite"
              >
                <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900 flex-1">
                  {currentInstruction}
                </p>
              </div>
            )}

            {/* Obstacle Warning */}
            {obstaclesDetected.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">
                    {obstaclesDetected.length} Obstacle{obstaclesDetected.length > 1 ? 's' : ''} Detected
                  </p>
                  <ul className="text-xs text-red-700 mt-1 space-y-1">
                    {obstaclesDetected.slice(0, 3).map((obstacle, idx) => (
                      <li key={idx}>• {obstacle.type.replace('_', ' ')}</li>
                    ))}
                    {obstaclesDetected.length > 3 && (
                      <li>• and {obstaclesDetected.length - 3} more...</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Turn-by-Turn Instructions */}
            {isRouteCalculated && instructions.length > 1 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Turn-by-Turn Directions
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {instructions.map((instruction, idx) => (
                    <button
                      key={idx}
                      onClick={() => speakNextInstruction(idx)}
                      className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-gray-500 mt-0.5">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">
                            {instruction.text}
                          </p>
                          {instruction.distance > 0 && (
                            <p className="text-xs text-gray-500">
                              {instruction.distance < 1000
                                ? `${Math.round(instruction.distance)}m`
                                : `${(instruction.distance / 1000).toFixed(1)}km`}
                            </p>
                          )}
                        </div>
                        <Volume2 className="w-3 h-3 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 border-t pt-3">
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1"
                aria-label="Go back to tagging screen"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCancelNavigation}
                variant="destructive"
                className="flex-1"
                aria-label="Cancel navigation"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>

        {/* Map Container */}
        <div
          ref={mapContainer}
          className="w-full h-full"
          role="application"
          aria-label="Navigation map showing route to destination"
        />

        {/* Accessibility Instructions (Hidden but read by screen readers) */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isNavigating && targetTag && (
            <>
              <p>
                Navigation active to {targetTag.type.replace('_', ' ')}.
                {distance && ` Distance: ${
                  distance < 1000
                    ? `${Math.round(distance)} meters`
                    : `${(distance / 1000).toFixed(1)} kilometers`
                }`}
                {duration && `. Estimated time: ${Math.round(duration / 60)} minutes`}
              </p>
              {obstaclesDetected.length > 0 && (
                <p>Warning: {obstaclesDetected.length} obstacles detected on route.</p>
              )}
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default NavigationScreen;
