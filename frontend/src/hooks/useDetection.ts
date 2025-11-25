import { useState, useCallback, useRef } from 'react';
import { sendImage, type Detection, type DetectResponse, APIError } from '../lib/api';

interface UseDetectionState {
  detections: Detection[];
  loading: boolean;
  error: string | null;
  spokenText: string | null;
  timestamp: string | null;
  inferenceTime: number | null;
}

interface UseDetectionReturn extends UseDetectionState {
  detect: (file: File) => Promise<DetectResponse | null>;
  clear: () => void;
  abort: () => void;
}

/**
 * Custom hook for object detection logic
 * Manages detection state, loading, and error handling with abort support
 * 
 * @returns {UseDetectionReturn} Detection state and methods
 * 
 * @example
 * const { detections, loading, error, detect, clear, abort } = useDetection();
 * 
 * const handleUpload = async (file: File) => {
 *   const result = await detect(file);
 *   if (result) console.log(`Detected ${result.detections.length} objects`);
 * };
 */
export const useDetection = (): UseDetectionReturn => {
  const [state, setState] = useState<UseDetectionState>({
    detections: [],
    loading: false,
    error: null,
    spokenText: null,
    timestamp: null,
    inferenceTime: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Detect objects in image file
   * @returns Detection result or null if aborted
   */
  const detect = useCallback(async (file: File): Promise<DetectResponse | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Cancel previous request if still running
      // Cancel previous request if still running and create new controller
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const signal = abortControllerRef.current.signal;

      const result: DetectResponse = await sendImage(file, signal);

      setState((prev) => ({
        ...prev,
        detections: result.detections,
        spokenText: result.spoken || result.message || null,
        timestamp: result.timestamp,
        inferenceTime: (result as any).inference_time_ms || null,
        loading: false,
        error: null,
      }));

      // Log detection summary
      console.log(
        `[Detection] ${result.detections.length} objects detected in ${(result as any).inference_time_ms || '?'}ms`,
        result.detections
      );

      return result;
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[Detection] Request aborted');
        return null;
      }


      let errorMessage = 'Detection failed unexpectedly.';
      if (err instanceof APIError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof (err as any).message === 'string') {
        errorMessage = (err as any).message;
      }

      // Provide an explicit network error hint when appropriate
      if (errorMessage.includes('Network error')) {
        errorMessage += ' — check that the backend is running and CORS allows requests from this origin.';
      }

      console.error('[Detection Error]', errorMessage, err);

      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        detections: [],
        spokenText: null,
      }));

      return null;
    }
  }, []);

  /**
   * Clear detections and reset state
   */
  const clear = useCallback(() => {
    setState({
      detections: [],
      loading: false,
      error: null,
      spokenText: null,
      timestamp: null,
      inferenceTime: null,
    });
  }, []);

  /**
   * Abort current detection request
   */
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  return {
    ...state,
    detect,
    clear,
    abort,
  };
};

export default useDetection;
