/**
 * OpenStreetMap API utilities for Nominatim and Overpass API
 */

const OFFLINE_MODE_KEY = 'offline_mode_enabled';

// Check if offline mode is enabled
const isOfflineMode = (): boolean => {
  try {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
};

// Nominatim API endpoints
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';

/**
 * Address information from Nominatim reverse geocoding
 */
export interface Address {
  road?: string;
  house_number?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  display_name: string;
}

/**
 * Nominatim reverse geocoding response
 */
interface NominatimResponse {
  address: Address;
  display_name: string;
}

/**
 * Overpass API element
 */
export interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

/**
 * Overpass API response
 */
interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Reverse geocode a lat/lon to get human-readable address
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Address object or null if failed
 */
export const reverseGeocode = async (
  lat: number,
  lon: number
): Promise<Address | null> => {
  if (isOfflineMode()) {
    console.warn('Offline mode enabled — skipping Nominatim reverse geocoding');
    return null;
  }

  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AccessAtlas/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`Nominatim API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: NominatimResponse = await response.json();
    return {
      ...data.address,
      display_name: data.display_name,
    };
  } catch (error) {
    console.error('[reverseGeocode] Failed to reverse geocode:', error);
    return null;
  }
};

/**
 * Build Overpass QL query for accessibility features
 * @param lat - Center latitude
 * @param lon - Center longitude
 * @param radius - Search radius in meters (default 500)
 * @returns Overpass QL query string
 */
export const buildOverpassQuery = (
  lat: number,
  lon: number,
  radius: number = 500
): string => {
  return `
    [out:json][timeout:25];
    (
      node["ramp"="yes"](around:${radius},${lat},${lon});
      node["highway"="elevator"](around:${radius},${lat},${lon});
      node["tactile_paving"="yes"](around:${radius},${lat},${lon});
      node["wheelchair"="yes"](around:${radius},${lat},${lon});
      node["entrance"](around:${radius},${lat},${lon});
      way["ramp"="yes"](around:${radius},${lat},${lon});
      way["highway"="elevator"](around:${radius},${lat},${lon});
      way["tactile_paving"="yes"](around:${radius},${lat},${lon});
    );
    out center;
  `.trim();
};

/**
 * Fetch accessibility features from Overpass API
 * @param lat - Center latitude
 * @param lon - Center longitude
 * @param radius - Search radius in meters (default 500)
 * @returns Array of Overpass elements
 */
export const fetchAccessibilityFeatures = async (
  lat: number,
  lon: number,
  radius: number = 500
): Promise<OverpassElement[]> => {
  if (isOfflineMode()) {
    console.warn('Offline mode enabled — skipping Overpass API call');
    return [];
  }

  try {
    const query = buildOverpassQuery(lat, lon, radius);
    const response = await fetch(OVERPASS_BASE, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.warn(`Overpass API error: ${response.status}`);
      return [];
    }

    const data: OverpassResponse = await response.json();
    
    // Filter and normalize elements
    return data.elements
      .filter((el) => el.lat && el.lon)
      .map((el) => ({
        ...el,
        lat: el.lat || (el as any).center?.lat || 0,
        lon: el.lon || (el as any).center?.lon || 0,
      }));
  } catch (error) {
    console.error('Failed to fetch accessibility features:', error);
    return [];
  }
};

/**
 * Map OSM tags to app tag types
 * @param tags - OSM tags object
 * @returns App tag type or null
 */
export const mapOSMTagToType = (tags: Record<string, string>): string | null => {
  if (tags.ramp === 'yes') return 'Ramp';
  if (tags.highway === 'elevator') return 'Elevator';
  if (tags.tactile_paving === 'yes') return 'Tactile Path';
  if (tags.entrance) return 'Entrance';
  if (tags.wheelchair === 'yes') return 'Ramp'; // wheelchair accessible often means ramp
  return null;
};

export default {
  reverseGeocode,
  buildOverpassQuery,
  fetchAccessibilityFeatures,
  mapOSMTagToType,
};
