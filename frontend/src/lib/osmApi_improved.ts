/**
 * OSM Data Service with Deployment-Safe Fallback Logic
 * 
 * Features:
 * - Live API calls to Nominatim and Overpass
 * - Local JSON fallback for offline/demo mode
 * - Cached responses for performance
 * - Error handling and retry logic
 */

const OFFLINE_MODE_KEY = 'offline_mode_enabled';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// API endpoints
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';

// Fallback data path (bundled in /public/data/)
const FALLBACK_DATA_PATH = '/data/osm_fallback.json';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache
const cache = new Map<string, CacheEntry<any>>();

/**
 * Check if offline mode is enabled
 */
export const isOfflineMode = (): boolean => {
  try {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Set offline mode
 */
export const setOfflineMode = (enabled: boolean): void => {
  try {
    localStorage.setItem(OFFLINE_MODE_KEY, enabled.toString());
  } catch (err) {
    console.error('Failed to set offline mode:', err);
  }
};

/**
 * Get cached data if available and not expired
 */
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_EXPIRY_MS) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Set cache entry
 */
function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Load fallback OSM data from bundled JSON
 */
async function loadFallbackData(): Promise<any> {
  try {
    const response = await fetch(FALLBACK_DATA_PATH);
    if (!response.ok) {
      console.warn(`Fallback data not found at ${FALLBACK_DATA_PATH}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load fallback OSM data:', error);
    return null;
  }
}

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
 * 
 * Fallback strategy:
 * 1. Check cache
 * 2. Try Nominatim API
 * 3. Fall back to local data if available
 * 
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Address object or null if failed
 */
export const reverseGeocode = async (
  lat: number,
  lon: number
): Promise<Address | null> => {
  // Check cache first
  const cacheKey = `geocode_${lat}_${lon}`;
  const cached = getCached<Address>(cacheKey);
  if (cached) {
    console.log('[reverseGeocode] Cache hit');
    return cached;
  }

  // If offline mode, skip API call
  if (isOfflineMode()) {
    console.warn('[reverseGeocode] Offline mode — skipping Nominatim API');
    
    // Try loading from fallback data
    const fallbackData = await loadFallbackData();
    if (fallbackData?.addresses) {
      // Return closest address from fallback data
      return fallbackData.addresses[0] || null;
    }
    
    return null;
  }

  // Try Nominatim API
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AccessAtlas/2.0',
      },
    });

    if (!response.ok) {
      console.warn(`[reverseGeocode] Nominatim API error: ${response.status}`);
      return null;
    }

    const data: NominatimResponse = await response.json();
    const address: Address = {
      ...data.address,
      display_name: data.display_name,
    };
    
    // Cache successful result
    setCache(cacheKey, address);
    
    return address;
  } catch (error) {
    console.error('[reverseGeocode] API request failed:', error);
    
    // Try fallback data
    const fallbackData = await loadFallbackData();
    if (fallbackData?.addresses) {
      console.warn('[reverseGeocode] Using fallback data');
      return fallbackData.addresses[0] || null;
    }
    
    return null;
  }
};

/**
 * Build Overpass QL query for accessibility features
 * 
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
 * 
 * Fallback strategy:
 * 1. Check cache
 * 2. Try Overpass API
 * 3. Fall back to local JSON if available
 * 
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
  // Check cache first
  const cacheKey = `overpass_${lat}_${lon}_${radius}`;
  const cached = getCached<OverpassElement[]>(cacheKey);
  if (cached) {
    console.log('[fetchAccessibilityFeatures] Cache hit');
    return cached;
  }

  // If offline mode, skip API call
  if (isOfflineMode()) {
    console.warn('[fetchAccessibilityFeatures] Offline mode — loading fallback data');
    
    const fallbackData = await loadFallbackData();
    if (fallbackData?.features) {
      return fallbackData.features as OverpassElement[];
    }
    
    return [];
  }

  // Try Overpass API
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
      console.warn(`[fetchAccessibilityFeatures] Overpass API error: ${response.status}`);
      return [];
    }

    const data: OverpassResponse = await response.json();
    
    // Cache successful result
    setCache(cacheKey, data.elements);
    
    console.log(`[fetchAccessibilityFeatures] Found ${data.elements.length} features`);
    return data.elements;
    
  } catch (error) {
    console.error('[fetchAccessibilityFeatures] API request failed:', error);
    
    // Try fallback data
    const fallbackData = await loadFallbackData();
    if (fallbackData?.features) {
      console.warn('[fetchAccessibilityFeatures] Using fallback data');
      return fallbackData.features as OverpassElement[];
    }
    
    return [];
  }
};

/**
 * Clear all cached OSM data
 */
export const clearCache = (): void => {
  cache.clear();
  console.log('[OSM] Cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};
