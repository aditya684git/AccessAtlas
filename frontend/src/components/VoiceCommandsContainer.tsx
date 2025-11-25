/**
 * Voice Commands Integration Example
 * Shows how to integrate voice commands into the Tagging page
 */

import React, { useCallback, useMemo } from 'react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { VoiceCommandActions } from '../types/voice';
import { VoiceCommandPanel } from './ui/VoiceCommandPanel';
import { Tag } from '../types/tag';
import { ttsService } from '../lib/ttsService';

interface VoiceCommandsContainerProps {
  /**
   * Current tags to operate on
   */
  tags: Tag[];

  /**
   * Callback to add a new tag
   */
  onAddTag: (type: Tag['type']) => void;

  /**
   * Callback to filter tags by source
   */
  onFilterTags: (source: 'model' | 'osm' | 'user' | 'all') => void;

  /**
   * Callback to navigate to a tag
   */
  onNavigateTo: (type: Tag['type']) => void;

  /**
   * Callback to clear filters
   */
  onClearFilters: () => void;

  /**
   * Callback to show help
   */
  onShowHelp: () => void;

  /**
   * Current active filters
   */
  activeFilters?: {
    source?: 'model' | 'osm' | 'user';
  };
}

/**
 * Voice Commands Container Component
 * Integrates voice command system with app actions
 */
export const VoiceCommandsContainer: React.FC<VoiceCommandsContainerProps> = ({
  tags,
  onAddTag,
  onFilterTags,
  onNavigateTo,
  onClearFilters,
  onShowHelp,
  activeFilters
}) => {
  /**
   * Read out current tags
   */
  const readTags = useCallback(() => {
    const total = tags.length;
    
    if (total === 0) {
      ttsService.speak('There are no tags visible on the map.');
      return;
    }

    // Count by type
    const typeCounts = tags.reduce((acc, tag) => {
      acc[tag.type] = (acc[tag.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Build message
    let message = `There ${total === 1 ? 'is' : 'are'} ${total} tag${total === 1 ? '' : 's'} visible. `;
    
    const types = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}${count === 1 ? '' : 's'}`)
      .join(', ');
    
    message += types;

    // Add filter info
    if (activeFilters?.source) {
      message += `. Filtered by ${activeFilters.source} source.`;
    }

    ttsService.speak(message);
  }, [tags, activeFilters]);

  /**
   * Navigate to nearest tag of specified type
   */
  const navigateTo = useCallback((type: Tag['type']) => {
    const matchingTags = tags.filter(tag => tag.type === type);
    
    if (matchingTags.length === 0) {
      ttsService.speak(`No ${type.toLowerCase()} tags found on the map.`);
      return;
    }

    // Call parent navigation handler
    onNavigateTo(type);

    // Provide feedback
    const nearest = matchingTags[0]; // Assume parent sorts by distance
    const message = nearest.address
      ? `Navigating to ${type} at ${nearest.address}`
      : `Navigating to ${type}`;
    
    ttsService.speak(message);
  }, [tags, onNavigateTo]);

  /**
   * Define voice command actions
   */
  const actions: VoiceCommandActions = useMemo(() => ({
    addTag: (type: Tag['type']) => {
      onAddTag(type);
      // Feedback is handled by the hook
    },

    filterTags: (source: 'model' | 'osm' | 'user' | 'all') => {
      onFilterTags(source);
      // Feedback is handled by the hook
    },

    readTags,

    navigateTo,

    speak: (text: string) => {
      ttsService.speak(text);
    },

    clearFilters: () => {
      onClearFilters();
      // Feedback is handled by the hook
    },

    showHelp: () => {
      onShowHelp();
    }
  }), [onAddTag, onFilterTags, readTags, navigateTo, onClearFilters, onShowHelp]);

  /**
   * Initialize voice commands hook
   */
  const voiceCommands = useVoiceCommands(actions, {
    language: 'en-US',
    continuous: true,
    confidenceThreshold: 0.6,
    debug: true // Set to false in production
  });

  return (
    <VoiceCommandPanel
      isListening={voiceCommands.isListening}
      isSupported={voiceCommands.isSupported}
      transcript={voiceCommands.transcript}
      statusMessage={voiceCommands.statusMessage}
      error={voiceCommands.error}
      onStart={voiceCommands.startListening}
      onStop={voiceCommands.stopListening}
      onCancel={voiceCommands.cancel}
      showHelp={true}
    />
  );
};

/**
 * Usage Example in Tagging Page:
 * 
 * import { VoiceCommandsContainer } from '../components/VoiceCommandsContainer';
 * 
 * function TaggingPage() {
 *   const [tags, setTags] = useState<Tag[]>([]);
 *   const [filteredTags, setFilteredTags] = useState<Tag[]>(tags);
 *   const [activeFilters, setActiveFilters] = useState<any>({});
 * 
 *   const handleAddTag = (type: Tag['type']) => {
 *     // Implementation to add tag
 *     const newTag = { ... };
 *     setTags([...tags, newTag]);
 *   };
 * 
 *   const handleFilterTags = (source: 'model' | 'osm' | 'user' | 'all') => {
 *     if (source === 'all') {
 *       setFilteredTags(tags);
 *       setActiveFilters({});
 *     } else {
 *       setFilteredTags(tags.filter(t => t.source === source));
 *       setActiveFilters({ source });
 *     }
 *   };
 * 
 *   const handleNavigateTo = (type: Tag['type']) => {
 *     // Implementation to navigate to nearest tag
 *     const nearest = filteredTags
 *       .filter(t => t.type === type)
 *       .sort((a, b) => distance(a) - distance(b))[0];
 *     
 *     if (nearest) {
 *       // Pan map to tag location
 *       mapRef.current?.panTo([nearest.lat, nearest.lon]);
 *     }
 *   };
 * 
 *   const handleClearFilters = () => {
 *     setFilteredTags(tags);
 *     setActiveFilters({});
 *   };
 * 
 *   const handleShowHelp = () => {
 *     // Show help dialog
 *   };
 * 
 *   return (
 *     <div>
 *       <VoiceCommandsContainer
 *         tags={filteredTags}
 *         onAddTag={handleAddTag}
 *         onFilterTags={handleFilterTags}
 *         onNavigateTo={handleNavigateTo}
 *         onClearFilters={handleClearFilters}
 *         onShowHelp={handleShowHelp}
 *         activeFilters={activeFilters}
 *       />
 *       
 *       <TaggingMap tags={filteredTags} ... />
 *     </div>
 *   );
 * }
 */
