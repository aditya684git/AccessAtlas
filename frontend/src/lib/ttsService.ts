/**
 * Text-to-Speech Service
 * Provides voice feedback using Web Speech API with accessibility settings support
 */

/**
 * Verbosity levels for messages
 */
export type VoiceVerbosity = 'brief' | 'standard' | 'detailed';

/**
 * Message with verbosity variants
 */
export interface VerboseMessage {
  brief: string;
  standard: string;
  detailed: string;
}

/**
 * TTS Configuration
 */
interface TTSConfig {
  /**
   * Voice rate (0.1 - 10, default 1)
   */
  rate?: number;

  /**
   * Voice pitch (0 - 2, default 1)
   */
  pitch?: number;

  /**
   * Voice volume (0 - 1, default 1)
   */
  volume?: number;

  /**
   * Language code (e.g., 'en-US')
   */
  lang?: string;

  /**
   * Preferred voice name
   */
  voiceName?: string;

  /**
   * Verbosity level
   */
  verbosity?: VoiceVerbosity;

  /**
   * Enable/disable voice
   */
  enabled?: boolean;
}

class TextToSpeechService {
  private synth: SpeechSynthesis;
  private config: Required<TTSConfig>;
  private isSpeaking: boolean = false;
  private queue: string[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
    this.config = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      lang: 'en-US',
      voiceName: '',
      verbosity: 'standard',
      enabled: true,
    };
  }

  /**
   * Update TTS configuration
   */
  configure(config: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Speak text or verbose message based on verbosity setting
   */
  speak(message: string | VerboseMessage, immediate: boolean = false): Promise<void> {
    if (!this.config.enabled) {
      return Promise.resolve();
    }

    let text: string;
    if (typeof message === 'string') {
      text = message;
    } else {
      text = message[this.config.verbosity];
    }

    return this._doSpeak(text, immediate);
  }

  /**
   * Speak with specific emotional tone
   */
  speakWithTone(
    text: string,
    tone: 'neutral' | 'success' | 'warning' | 'error',
    immediate: boolean = false
  ): Promise<void> {
    if (!this.config.enabled) {
      return Promise.resolve();
    }

    // Adjust pitch and rate based on tone
    const originalRate = this.config.rate;
    const originalPitch = this.config.pitch;

    switch (tone) {
      case 'success':
        this.config.pitch = Math.min(2.0, originalPitch * 1.1);
        this.config.rate = Math.min(10, originalRate * 1.05);
        break;
      case 'warning':
        this.config.pitch = originalPitch * 0.95;
        this.config.rate = originalRate * 0.95;
        break;
      case 'error':
        this.config.pitch = originalPitch * 0.9;
        this.config.rate = originalRate * 0.9;
        break;
      default:
        // neutral - use original
        break;
    }

    const promise = this._doSpeak(text, immediate);

    // Restore original settings
    promise.finally(() => {
      this.config.pitch = originalPitch;
      this.config.rate = originalRate;
    });

    return promise;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  /**
   * Select best voice for language
   */
  private selectVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    
    if (this.config.voiceName) {
      const namedVoice = voices.find(v => v.name === this.config.voiceName);
      if (namedVoice) return namedVoice;
    }

    // Try to find voice for specified language
    const langVoice = voices.find(v => v.lang.startsWith(this.config.lang.split('-')[0]));
    if (langVoice) return langVoice;

    // Fallback to default voice
    return voices[0] || null;
  }

  /**
   * Internal speak implementation
   */
  private _doSpeak(text: string, immediate: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel current speech if immediate
      if (immediate && this.isSpeaking) {
        this.cancel();
      }

      // Queue if currently speaking and not immediate
      if (this.isSpeaking && !immediate) {
        this.queue.push(text);
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply configuration
      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.lang;

      // Select appropriate voice
      const voice = this.selectVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // Event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
        
        // Process queue
        if (this.queue.length > 0) {
          const nextText = this.queue.shift()!;
          this.speak(nextText);
        }
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        console.error('TTS error:', event);
        reject(event);
      };

      // Speak
      this.synth.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  cancel(): void {
    this.synth.cancel();
    this.isSpeaking = false;
    this.queue = [];
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (this.isSpeaking) {
      this.synth.pause();
    }
  }

  /**
   * Resume speech
   */
  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  get speaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get queue length
   */
  get queueLength(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const ttsService = new TextToSpeechService();
