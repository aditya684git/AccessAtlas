/**
 * Voice Command Parser
 * Maps spoken phrases to commands and extracts parameters
 */

import { VoiceCommand } from '../types/voice';
import { Tag } from '../types/tag';

/**
 * Command pattern matching configuration
 */
interface CommandPattern {
  command: VoiceCommand;
  patterns: RegExp[];
  priority: number; // Higher priority checked first
}

/**
 * Parsed command result
 */
export interface ParsedCommand {
  command: VoiceCommand;
  params?: {
    tagType?: Tag['type'];
    source?: 'model' | 'osm' | 'user' | 'all';
  };
  confidence: number;
}

class VoiceCommandParser {
  private commandPatterns: CommandPattern[] = [
    // Add tag commands (high priority)
    {
      command: 'add_ramp',
      patterns: [
        /\b(add|create|place|mark)\s+(a\s+)?ramp\b/i,
        /\bramp\s+(here|now)\b/i,
      ],
      priority: 10
    },
    {
      command: 'add_elevator',
      patterns: [
        /\b(add|create|place|mark)\s+(an?\s+)?elevator\b/i,
        /\belevator\s+(here|now)\b/i,
      ],
      priority: 10
    },
    {
      command: 'add_entrance',
      patterns: [
        /\b(add|create|place|mark)\s+(an?\s+)?entrance\b/i,
        /\bentrance\s+(here|now)\b/i,
      ],
      priority: 10
    },
    {
      command: 'add_obstacle',
      patterns: [
        /\b(add|create|place|mark)\s+(an?\s+)?obstacle\b/i,
        /\bobstacle\s+(here|now)\b/i,
      ],
      priority: 10
    },
    {
      command: 'add_tactile_path',
      patterns: [
        /\b(add|create|place|mark)\s+(a\s+)?tactile\s+path\b/i,
        /\btactile\s+(path|paving)\s+(here|now)\b/i,
      ],
      priority: 10
    },

    // Filter commands
    {
      command: 'show_model_tags',
      patterns: [
        /\b(show|display|filter|view)\s+(only\s+)?(model|ai|predicted)\s+tags?\b/i,
        /\b(model|ai)\s+tags?\s+only\b/i,
      ],
      priority: 8
    },
    {
      command: 'show_osm_tags',
      patterns: [
        /\b(show|display|filter|view)\s+(only\s+)?(osm|openstreetmap)\s+tags?\b/i,
        /\b(osm|openstreetmap)\s+tags?\s+only\b/i,
      ],
      priority: 8
    },
    {
      command: 'show_user_tags',
      patterns: [
        /\b(show|display|filter|view)\s+(only\s+)?(user|my)\s+tags?\b/i,
        /\b(user|my)\s+tags?\s+only\b/i,
      ],
      priority: 8
    },
    {
      command: 'show_all_tags',
      patterns: [
        /\b(show|display|view)\s+all\s+tags?\b/i,
        /\ball\s+tags?\b/i,
      ],
      priority: 7
    },

    // Navigation commands
    {
      command: 'navigate_to_elevator',
      patterns: [
        /\b(navigate|go|take me|direct me|find)\s+(to|the)?\s+(nearest|closest)?\s+elevator\b/i,
        /\bwhere\s+(is|are)\s+(the\s+)?(nearest|closest)?\s+elevator\b/i,
      ],
      priority: 9
    },
    {
      command: 'navigate_to_ramp',
      patterns: [
        /\b(navigate|go|take me|direct me|find)\s+(to|the)?\s+(nearest|closest)?\s+ramp\b/i,
        /\bwhere\s+(is|are)\s+(the\s+)?(nearest|closest)?\s+ramp\b/i,
      ],
      priority: 9
    },
    {
      command: 'navigate_to_entrance',
      patterns: [
        /\b(navigate|go|take me|direct me|find)\s+(to|the)?\s+(nearest|closest)?\s+entrance\b/i,
        /\bwhere\s+(is|are)\s+(the\s+)?(nearest|closest)?\s+entrance\b/i,
      ],
      priority: 9
    },

    // Camera commands
    {
      command: 'capture_photo',
      patterns: [
        /\b(capture|take|snap)\s+(a\s+)?(photo|picture|image)\b/i,
        /\b(open|start|use)\s+(the\s+)?camera\b/i,
      ],
      priority: 9
    },
    {
      command: 'confirm_tag',
      patterns: [
        /\b(confirm|save|accept)\s+(the\s+)?(tag|prediction)\b/i,
        /\b(looks?|seems?)\s+(good|correct|right)\b/i,
      ],
      priority: 9
    },

    // Utility commands
    {
      command: 'read_tags',
      patterns: [
        /\b(read|tell me|what are|show me|count)\s+(the\s+)?(tags?|markers?|items?)\b/i,
        /\bhow many\s+tags?\b/i,
      ],
      priority: 7
    },
    {
      command: 'clear_filters',
      patterns: [
        /\b(clear|remove|reset)\s+(all\s+)?filters?\b/i,
        /\bshow\s+everything\b/i,
      ],
      priority: 6
    },
    {
      command: 'help',
      patterns: [
        /\b(help|what can (i|you) (do|say)|commands?|instructions?)\b/i,
      ],
      priority: 5
    },
    {
      command: 'cancel_navigation',
      patterns: [
        /\b(cancel|stop|end)\s+(navigation|navigating|route|routing)\b/i,
        /\b(go|take me)\s+back\b/i,
        /\breturn\s+to\s+(tagging|map)\b/i,
      ],
      priority: 8
    },
  ];

  /**
   * Parse transcript and return best matching command
   */
  parse(transcript: string): ParsedCommand {
    const normalizedTranscript = transcript.trim().toLowerCase();

    if (!normalizedTranscript) {
      return {
        command: 'unknown',
        confidence: 0
      };
    }

    // Sort by priority
    const sortedPatterns = [...this.commandPatterns].sort(
      (a, b) => b.priority - a.priority
    );

    // Try to match patterns
    for (const { command, patterns } of sortedPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedTranscript)) {
          return {
            command,
            params: this.extractParams(command, normalizedTranscript),
            confidence: this.calculateConfidence(normalizedTranscript, pattern)
          };
        }
      }
    }

    // No match found
    return {
      command: 'unknown',
      confidence: 0
    };
  }

  /**
   * Extract parameters from command
   */
  private extractParams(
    command: VoiceCommand,
    transcript: string
  ): ParsedCommand['params'] | undefined {
    const params: ParsedCommand['params'] = {};

    // Extract tag type for add commands
    if (command.startsWith('add_')) {
      const tagType = command.replace('add_', '') as Tag['type'];
      params.tagType = tagType === 'tactile_path' ? 'Tactile Path' : 
                       tagType.charAt(0).toUpperCase() + tagType.slice(1) as Tag['type'];
    }

    // Extract source for filter commands
    if (command.startsWith('show_') && command.includes('_tags')) {
      const source = command.replace('show_', '').replace('_tags', '');
      params.source = source as 'model' | 'osm' | 'user' | 'all';
    }

    // Extract tag type for navigation commands
    if (command.startsWith('navigate_to_')) {
      const tagType = command.replace('navigate_to_', '');
      params.tagType = tagType.charAt(0).toUpperCase() + tagType.slice(1) as Tag['type'];
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  /**
   * Calculate confidence score based on pattern match
   */
  private calculateConfidence(transcript: string, pattern: RegExp): number {
    const match = transcript.match(pattern);
    if (!match) return 0;

    // Higher confidence for longer, more specific matches
    const matchLength = match[0].length;
    const transcriptLength = transcript.length;
    const ratio = matchLength / transcriptLength;

    // Bonus for exact matches
    const exactMatch = match[0] === transcript;
    
    return Math.min(0.95, 0.7 + (ratio * 0.2) + (exactMatch ? 0.05 : 0));
  }

  /**
   * Get list of example commands
   */
  getExampleCommands(): string[] {
    return [
      'Add ramp',
      'Add obstacle',
      'Add elevator',
      'Add tactile path'
    ];
  }
}

// Singleton instance
export const commandParser = new VoiceCommandParser();
