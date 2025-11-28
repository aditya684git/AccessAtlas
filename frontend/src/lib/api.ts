import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const OFFLINE_MODE_KEY = 'offline_mode_enabled';

// Helper to check offline mode
const getOfflineMode = (): boolean => {
  try {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for inference
  headers: {
    'Accept': 'application/json',
  },
});

/**
 * Response types for type safety
 */
export interface Detection {
  label: string;
  confidence: number;
  position: 'on the left' | 'on the right' | 'in the center';
  timestamp: string;
}

export interface DetectResponse {
  detections: Detection[];
  message?: string;
  spoken?: string;
  error?: string;
  timestamp: string;
}

export interface VoiceResponse {
  status: string;
  text: string;
}

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public originalError?: AxiosError
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Send image for object detection
 * @param file - Image file to analyze
 * @returns Detection results with labels, positions, and voice feedback
 * @throws APIError if request fails or inference encounters an error
 */
export const sendImage = async (file: File, signal?: AbortSignal): Promise<DetectResponse> => {
  // Check offline mode
  if (getOfflineMode()) {
    console.warn('Offline mode enabled — skipping image detection API call');
    throw new APIError('Offline mode is enabled. Image detection requires an internet connection.');
  }

  try {
    if (!file.type.startsWith('image/')) {
      throw new APIError('Invalid file type. Please upload an image.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<DetectResponse>('/detect', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Support request cancellation with AbortController
      signal,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Network error (no response) vs server error
      if (!error.response) {
        const message = `Network error: Cannot reach detection service at ${BASE_URL}`;
        throw new APIError(message, undefined, error);
      }

      const message = 
        error.response?.data?.error || 
        error.response?.statusText || 
        error.message ||
        'Detection failed. Please try again.';
      throw new APIError(message, error.response?.status, error);
    }
    throw new APIError('An unexpected error occurred during detection.');
  }
};

/**
 * Trigger voice feedback for text
 * @param text - Text to speak
 * @returns Voice response confirmation
 * @throws APIError if request fails
 */
export const sendVoice = async (text: string): Promise<VoiceResponse> => {
  // Check offline mode
  if (getOfflineMode()) {
    console.warn('Offline mode enabled — skipping voice API call');
    throw new APIError('Offline mode is enabled. Voice feedback requires an internet connection.');
  }

  try {
    if (!text || text.trim().length === 0) {
      throw new APIError('Voice text cannot be empty.');
    }

    const response = await apiClient.post<VoiceResponse>('/voice', null, {
      params: { text },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = 
        error.response?.data?.error || 
        error.message || 
        'Voice feedback failed.';
      throw new APIError(message, error.response?.status, error);
    }
    throw new APIError('An unexpected error occurred during voice feedback.');
  }
};

/**
 * Health check endpoint (optional, for monitoring backend availability)
 */
export const healthCheck = async (): Promise<boolean> => {
  if (getOfflineMode()) {
    console.warn('Offline mode enabled — skipping health check');
    return false;
  }

  try {
    const response = await apiClient.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
};

/**
 * Tags API - Types
 */
export interface TagCreate {
  type: string;
  lat: number;
  lon: number;
  source: 'user' | 'osm' | 'model';
  address?: string;
  confidence?: number;
  osm_id?: string;
  notes?: string;
}

export interface TagsStoreRequest {
  location_name: string;
  lat: number;
  lon: number;
  tags: TagCreate[];
}

export interface TagsStoreResponse {
  success: boolean;
  message: string;
  location_name: string;
  tags_stored: number;
  tag_ids: number[];
}

export interface TagResponse {
  id: number;
  tag_type: string;
  lat: number;
  lon: number;
  source: 'user' | 'osm' | 'model';
  address?: string;
  confidence?: number;
  osm_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface TagsGroupedResponse {
  location_name: string;
  lat: number;
  lon: number;
  total_tags: number;
  tags: {
    user: TagResponse[];
    osm: TagResponse[];
    model: TagResponse[];
  };
}

/**
 * Store tags to database
 * @param request - Tags store request with location and tags
 * @returns Store response with success status and tag IDs
 * @throws APIError if request fails
 */
export const storeTags = async (request: TagsStoreRequest): Promise<TagsStoreResponse> => {
  if (getOfflineMode()) {
    console.warn('Offline mode enabled — skipping tag storage');
    throw new APIError('Offline mode is enabled. Tag storage requires an internet connection.');
  }

  try {
    const response = await apiClient.post<TagsStoreResponse>('/api/tags/store', request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = 
        error.response?.data?.detail || 
        error.message || 
        'Failed to store tags.';
      throw new APIError(message, error.response?.status, error);
    }
    throw new APIError('An unexpected error occurred while storing tags.');
  }
};

/**
 * Get tags for a location
 * @param locationName - Name of the location
 * @param options - Optional radius and coordinates for proximity search
 * @returns Tags grouped by source (user, osm, model)
 * @throws APIError if request fails
 */
export const getTags = async (
  locationName: string,
  options?: { radius_km?: number; lat?: number; lon?: number }
): Promise<TagsGroupedResponse> => {
  if (getOfflineMode()) {
    console.warn('Offline mode enabled — skipping tag retrieval');
    throw new APIError('Offline mode is enabled. Tag retrieval requires an internet connection.');
  }

  try {
    const params = new URLSearchParams();
    if (options?.radius_km) params.append('radius_km', options.radius_km.toString());
    if (options?.lat) params.append('lat', options.lat.toString());
    if (options?.lon) params.append('lon', options.lon.toString());

    const url = `/api/tags/location/${encodeURIComponent(locationName)}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await apiClient.get<TagsGroupedResponse>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = 
        error.response?.data?.detail || 
        error.message || 
        'Failed to retrieve tags.';
      throw new APIError(message, error.response?.status, error);
    }
    throw new APIError('An unexpected error occurred while retrieving tags.');
  }
};