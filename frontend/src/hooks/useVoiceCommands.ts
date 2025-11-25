/**
 * Voice Commands Hook
 * Custom React hook for voice command recognition and handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  VoiceCommandActions,
  VoiceCommandConfig,
  VoiceCommandResult,
  VoiceRecognitionState
} from '../types/voice';
import { commandParser } from '../lib/voiceCommandParser';
import { ttsService } from '../lib/ttsService';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VoiceCommandConfig> = {
  language: 'en-US',
  continuous: true,
  confidenceThreshold: 0.6,
  debug: false
};

/**
 * Voice Commands Hook
 * @param actions - Actions to execute for each command
 * @param config - Optional configuration
 */
export const useVoiceCommands = (
  actions: VoiceCommandActions,
  config: VoiceCommandConfig = {}
) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // React Speech Recognition hook
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // State
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Refs to track processing
  const processingRef = useRef(false);
  const lastTranscriptRef = useRef('');

  /**
   * Log debug messages if enabled
   */
  const log = useCallback((...args: any[]) => {
    if (mergedConfig.debug) {
      console.log('[VoiceCommands]', ...args);
    }
  }, [mergedConfig.debug]);

  /**
   * Speak feedback and update status
   */
  const provideFeedback = useCallback((message: string, immediate = false) => {
    setStatusMessage(message);
    ttsService.speak(message, immediate).catch(err => {
      log('TTS error:', err);
    });
  }, [log]);

  /**
   * Execute a recognized command
   */
  const executeCommand = useCallback(async (
    command: string,
    params?: any,
    confidence?: number
  ): Promise<VoiceCommandResult> => {
    log('Executing command:', command, params);

    const result: VoiceCommandResult = {
      command: command as any,
      transcript: lastTranscriptRef.current,
      confidence: confidence || 0,
      executed: false,
      feedback: ''
    };

    try {
      switch (command) {
        case 'add_ramp':
        case 'add_elevator':
        case 'add_entrance':
        case 'add_obstacle':
        case 'add_tactile_path':
          if (params?.tagType) {
            actions.addTag(params.tagType);
            result.feedback = `${params.tagType} tag added.`;
            result.executed = true;
          }
          break;

        case 'show_model_tags':
          actions.filterTags('model');
          result.feedback = 'Showing model-generated tags.';
          result.executed = true;
          break;

        case 'show_osm_tags':
          actions.filterTags('osm');
          result.feedback = 'Showing OpenStreetMap tags.';
          result.executed = true;
          break;

        case 'show_user_tags':
          actions.filterTags('user');
          result.feedback = 'Showing user-created tags.';
          result.executed = true;
          break;

        case 'show_all_tags':
          actions.filterTags('all');
          result.feedback = 'Showing all tags.';
          result.executed = true;
          break;

        case 'read_tags':
          actions.readTags();
          // Note: readTags action should call actions.speak() internally
          result.feedback = 'Reading tags...';
          result.executed = true;
          break;

        case 'navigate_to_elevator':
        case 'navigate_to_ramp':
        case 'navigate_to_entrance':
          if (params?.tagType) {
            actions.navigateTo(params.tagType);
            result.feedback = `Navigating to nearest ${params.tagType}.`;
            result.executed = true;
          }
          break;

        case 'clear_filters':
          actions.clearFilters();
          result.feedback = 'Filters cleared.';
          result.executed = true;
          break;

        case 'help':
          actions.showHelp();
          result.feedback = 'Showing available commands.';
          result.executed = true;
          break;

        case 'cancel_navigation':
          // Emit event to cancel navigation
          window.dispatchEvent(new CustomEvent('voiceCancelNavigation'));
          result.feedback = 'Cancelling navigation.';
          result.executed = true;
          break;

        case 'capture_photo':
          // Emit event to trigger camera capture
          window.dispatchEvent(new CustomEvent('voiceCapturePhoto'));
          result.feedback = 'Opening camera...';
          result.executed = true;
          break;

        case 'confirm_tag':
          // Emit event to confirm tag prediction
          window.dispatchEvent(new CustomEvent('voiceConfirmTag'));
          result.feedback = 'Confirming tag...';
          result.executed = true;
          break;

        case 'unknown':
          result.feedback = "Sorry, I didn't understand that command. Say 'help' for available commands.";
          break;

        default:
          result.feedback = 'Command not implemented yet.';
      }

      if (result.feedback) {
        provideFeedback(result.feedback);
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log('Command execution error:', errorMessage);
      
      result.feedback = 'Sorry, there was an error executing that command.';
      provideFeedback(result.feedback);
      
      return result;
    }
  }, [actions, provideFeedback, log]);

  /**
   * Process transcript and execute command
   */
  const processTranscript = useCallback(async (text: string) => {
    if (!text || processingRef.current) {
      return;
    }

    // Avoid processing same transcript twice
    if (text === lastTranscriptRef.current) {
      return;
    }

    processingRef.current = true;
    lastTranscriptRef.current = text;

    log('Processing transcript:', text);

    try {
      // Parse command
      const parsed = commandParser.parse(text);
      log('Parsed command:', parsed);

      // Check confidence threshold
      if (parsed.confidence < mergedConfig.confidenceThreshold) {
        log('Low confidence, ignoring:', parsed.confidence);
        provideFeedback("I'm not sure I understood that. Please try again.");
        return;
      }

      // Execute command
      const result = await executeCommand(
        parsed.command,
        parsed.params,
        parsed.confidence
      );

      setLastCommand(result);
      setError(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log('Processing error:', errorMessage);
      setError(errorMessage);
      provideFeedback('Sorry, there was an error processing your command.');
    } finally {
      processingRef.current = false;
      
      // Reset transcript after processing
      setTimeout(() => {
        resetTranscript();
        lastTranscriptRef.current = '';
      }, 1000);
    }
  }, [executeCommand, provideFeedback, resetTranscript, log, mergedConfig.confidenceThreshold]);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(async () => {
    if (!browserSupportsSpeechRecognition) {
      const msg = 'Speech recognition is not supported in this browser.';
      setError(msg);
      provideFeedback(msg);
      return;
    }

    try {
      await SpeechRecognition.startListening({
        continuous: mergedConfig.continuous,
        language: mergedConfig.language
      });
      
      setError(null);
      provideFeedback('Voice commands activated. Listening...', true);
      log('Started listening');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log('Start listening error:', errorMessage);
      setError(errorMessage);
      provideFeedback('Failed to start voice commands.');
    }
  }, [
    browserSupportsSpeechRecognition,
    mergedConfig.continuous,
    mergedConfig.language,
    provideFeedback,
    log
  ]);

  /**
   * Stop listening for voice commands
   */
  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
    provideFeedback('Voice commands stopped.', true);
    log('Stopped listening');
  }, [provideFeedback, log]);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  /**
   * Process transcript when it changes
   */
  useEffect(() => {
    if (transcript && listening) {
      // Debounce: wait for user to finish speaking
      const timer = setTimeout(() => {
        processTranscript(transcript);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [transcript, listening, processTranscript]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (listening) {
        SpeechRecognition.stopListening();
      }
      ttsService.cancel();
    };
  }, [listening]);

  // Return state and controls
  const state: VoiceRecognitionState = {
    isListening: listening,
    transcript,
    lastCommand,
    isSupported: browserSupportsSpeechRecognition,
    error
  };

  return {
    ...state,
    statusMessage,
    startListening,
    stopListening,
    toggleListening,
    speak: (text: string) => ttsService.speak(text),
    cancel: () => ttsService.cancel()
  };
};
