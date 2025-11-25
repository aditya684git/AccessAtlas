import { useState, useCallback } from 'react';
import { sendVoice, APIError } from '../lib/api';

interface UseVoiceState {
  isSpeaking: boolean;
  error: string | null;
  lastSpokenText: string | null;
}

interface UseVoiceReturn extends UseVoiceState {
  speak: (text: string) => Promise<void>;
  clear: () => void;
}

/**
 * Custom hook for voice feedback logic
 * Manages voice playback state, loading, and error handling
 * 
 * @returns {UseVoiceReturn} Voice state and methods
 * 
 * @example
 * const { isSpeaking, error, speak, clear } = useVoice();
 * 
 * const handleSpeak = async () => {
 *   await speak('Hello, this is a test.');
 * };
 */
export const useVoice = (): UseVoiceReturn => {
  const [state, setState] = useState<UseVoiceState>({
    isSpeaking: false,
    error: null,
    lastSpokenText: null,
  });

  /**
   * Speak given text using backend voice API
   */
  const speak = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) {
      console.warn('[Voice] Empty text provided, skipping voice feedback.');
      return;
    }

    setState((prev) => ({ ...prev, isSpeaking: true, error: null }));

    try {
      await sendVoice(text);

      setState((prev) => ({
        ...prev,
        isSpeaking: false,
        error: null,
        lastSpokenText: text,
      }));

      console.log('[Voice] Spoke:', text);
    } catch (err) {
      const errorMessage =
        err instanceof APIError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Voice feedback failed unexpectedly.';

      console.error('[Voice Error]', errorMessage, err);

      setState((prev) => ({
        ...prev,
        isSpeaking: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Clear voice state
   */
  const clear = useCallback(() => {
    setState({
      isSpeaking: false,
      error: null,
      lastSpokenText: null,
    });
  }, []);

  return {
    ...state,
    speak,
    clear,
  };
};

export default useVoice;
