/**
 * Voice Command Types
 * Type definitions for voice command system
 */

import { Tag } from './tag';

/**
 * Available voice commands that the app can recognize
 */
export type VoiceCommand =
  | 'add_ramp'
  | 'add_elevator'
  | 'add_entrance'
  | 'add_obstacle'
  | 'add_tactile_path'
  | 'show_model_tags'
  | 'show_osm_tags'
  | 'show_user_tags'
  | 'show_all_tags'
  | 'read_tags'
  | 'navigate_to_elevator'
  | 'navigate_to_ramp'
  | 'navigate_to_entrance'
  | 'clear_filters'
  | 'cancel_navigation'
  | 'capture_photo'
  | 'confirm_tag'
  | 'help'
  | 'unknown';

/**
 * Actions that can be triggered by voice commands
 */
export interface VoiceCommandActions {
  /**
   * Add a new tag of specified type at current location
   */
  addTag: (type: Tag['type']) => void;

  /**
   * Filter tags by source (model, osm, user) or show all
   */
  filterTags: (source: 'model' | 'osm' | 'user' | 'all') => void;

  /**
   * Read out the current number and types of visible tags
   */
  readTags: () => void;

  /**
   * Navigate to nearest tag of specified type
   */
  navigateTo: (type: Tag['type']) => void;

  /**
   * Speak text using TTS
   */
  speak: (text: string) => void;

  /**
   * Clear all active filters
   */
  clearFilters: () => void;

  /**
   * Show help/available commands
   */
  showHelp: () => void;
}

/**
 * Voice command configuration
 */
export interface VoiceCommandConfig {
  /**
   * Language code for speech recognition (e.g., 'en-US')
   */
  language?: string;

  /**
   * Enable continuous listening
   */
  continuous?: boolean;

  /**
   * Confidence threshold (0-1) for command recognition
   */
  confidenceThreshold?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Voice command result
 */
export interface VoiceCommandResult {
  /**
   * Recognized command
   */
  command: VoiceCommand;

  /**
   * Raw transcript from speech recognition
   */
  transcript: string;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Whether command was successfully executed
   */
  executed: boolean;

  /**
   * Feedback message to user
   */
  feedback: string;
}

/**
 * Voice recognition state
 */
export interface VoiceRecognitionState {
  /**
   * Whether speech recognition is currently listening
   */
  isListening: boolean;

  /**
   * Current transcript being processed
   */
  transcript: string;

  /**
   * Last recognized command
   */
  lastCommand: VoiceCommandResult | null;

  /**
   * Whether browser supports speech recognition
   */
  isSupported: boolean;

  /**
   * Current error, if any
   */
  error: string | null;
}
