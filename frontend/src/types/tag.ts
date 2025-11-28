export type Tag = {
  id: string;
  type: 'Ramp' | 'Elevator' | 'Tactile Path' | 'Entrance' | 'Obstacle' | string;
  lat: number;
  lon: number;
  timestamp: string;
  source: 'user' | 'osm' | 'model'; // Tag origin
  address?: string; // Optional address from reverse geocoding
  osmId?: number; // Optional OSM element ID if from Overpass API
  readonly?: boolean; // If true, tag is from OSM and cannot be edited/deleted
  confidence?: number; // Model confidence score (0-1) for model-generated tags
  notes?: string; // Optional user notes
};

export const STORAGE_KEY = 'accessibility_tags';

export default Tag;
