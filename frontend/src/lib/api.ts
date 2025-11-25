import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://localhost:8000';
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