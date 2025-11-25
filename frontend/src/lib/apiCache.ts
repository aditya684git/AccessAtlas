/**
 * API Caching Utility
 * Implements intelligent caching for Overpass and Nominatim API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class APICache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  /**
   * Get cached data if valid
   */
  get<T>(endpoint: string, params: Record<string, any>): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache HIT] ${endpoint}`);
    return entry.data as T;
  }

  /**
   * Set cache entry
   */
  set<T>(
    endpoint: string,
    params: Record<string, any>,
    data: T,
    expiresIn: number = 3600000 // 1 hour default
  ): void {
    const key = this.generateKey(endpoint, params);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });

    console.log(`[Cache SET] ${endpoint}`);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    console.log('[Cache CLEARED]');
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.expiresIn) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`[Cache] Cleared ${cleared} expired entries`);
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instance
export const apiCache = new APICache(100);

// Clear expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.clearExpired();
  }, 5 * 60 * 1000);
}

/**
 * Cached fetch with retry logic
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheKey: { endpoint: string; params: Record<string, any> },
  cacheExpiry: number = 3600000, // 1 hour
  retries: number = 3
): Promise<T> {
  // Check cache first
  const cached = apiCache.get<T>(cacheKey.endpoint, cacheKey.params);
  if (cached) {
    return cached;
  }

  // Fetch with retry logic
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[API] Fetching ${url} (attempt ${attempt}/${retries})`);
      
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: T = await response.json();

      // Cache successful response
      apiCache.set(cacheKey.endpoint, cacheKey.params, data, cacheExpiry);

      return data;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[API] Attempt ${attempt} failed:`, error);

      // Exponential backoff
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[API] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error(`[API] All ${retries} attempts failed for ${url}`);
  throw lastError || new Error('Request failed after retries');
}

/**
 * Local fallback data for offline mode
 */
export const fallbackData = {
  /**
   * Sample accessibility tags for offline demo
   */
  sampleTags: [
    {
      id: 'fallback-1',
      type: 'ramp' as const,
      lat: 40.7128,
      lon: -74.0060,
      source: 'osm' as const,
      address: 'Broadway & 42nd St, New York',
      readonly: true,
    },
    {
      id: 'fallback-2',
      type: 'elevator' as const,
      lat: 40.7589,
      lon: -73.9851,
      source: 'osm' as const,
      address: 'Times Square Station',
      readonly: true,
    },
    {
      id: 'fallback-3',
      type: 'tactile_path' as const,
      lat: 40.7614,
      lon: -73.9776,
      source: 'osm' as const,
      address: 'Central Park South',
      readonly: true,
    },
  ],

  /**
   * Get fallback tags for area
   */
  getTagsNearby(lat: number, lon: number, radius: number = 1000): typeof fallbackData.sampleTags {
    // In a real implementation, you'd filter by distance
    // For now, return all sample tags
    console.log('[Fallback] Using offline tag data');
    return this.sampleTags;
  },
};

/**
 * Example usage:
 * 
 * // Overpass query with caching
 * const tags = await cachedFetch(
 *   'https://overpass-api.de/api/interpreter',
 *   {
 *     method: 'POST',
 *     body: query
 *   },
 *   {
 *     endpoint: 'overpass',
 *     params: { bbox, types: ['ramp', 'elevator'] }
 *   },
 *   3600000 // 1 hour cache
 * );
 * 
 * // Nominatim geocoding with caching
 * const location = await cachedFetch(
 *   `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}`,
 *   {},
 *   {
 *     endpoint: 'nominatim',
 *     params: { lat, lon }
 *   },
 *   86400000 // 24 hour cache
 * );
 * 
 * // Handle offline with fallback
 * try {
 *   const tags = await cachedFetch(...);
 * } catch (error) {
 *   console.warn('API unavailable, using fallback data');
 *   const tags = fallbackData.getTagsNearby(lat, lon);
 * }
 */
