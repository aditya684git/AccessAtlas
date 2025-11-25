# Voice Command System Documentation

Complete accessibility-focused voice command integration for blind and partially blind users.

## 📦 Installation

```bash
npm install react-speech-recognition regenerator-runtime
```

## 🏗️ Architecture

### Components

1. **`useVoiceCommands` Hook** (`src/hooks/useVoiceCommands.ts`)
   - Main React hook for voice command integration
   - Handles speech recognition and command execution
   - Manages state and provides feedback

2. **VoiceCommandPanel** (`src/components/ui/VoiceCommandPanel.tsx`)
   - UI component for voice command controls
   - Shows status, transcript, and help
   - Accessible with ARIA labels

3. **VoiceCommandsContainer** (`src/components/VoiceCommandsContainer.tsx`)
   - Integration layer connecting voice commands to app actions
   - Example implementation for the Tagging page

4. **Command Parser** (`src/lib/voiceCommandParser.ts`)
   - Maps spoken phrases to commands
   - Extracts parameters from natural language
   - Calculates confidence scores

5. **TTS Service** (`src/lib/ttsService.ts`)
   - Text-to-speech feedback system
   - Queue management for multiple messages
   - Configurable voice settings

## 🎯 Available Commands

### Adding Tags
- **"Add ramp"** - Mark a ramp at current location
- **"Add elevator"** - Mark an elevator
- **"Add entrance"** - Mark an accessible entrance
- **"Add obstacle"** - Mark an obstacle
- **"Add tactile path"** - Mark tactile paving

### Filtering Tags
- **"Show model tags"** - Display AI-generated tags only
- **"Show OSM tags"** - Display OpenStreetMap tags only
- **"Show user tags"** - Display your tags only
- **"Show all tags"** - Display all tags
- **"Clear filters"** - Remove all filters

### Navigation
- **"Navigate to nearest elevator"** - Find closest elevator
- **"Navigate to nearest ramp"** - Find closest ramp
- **"Navigate to nearest entrance"** - Find closest entrance

### Information
- **"Read tags"** - Speak number and types of visible tags
- **"Help"** - Show available commands

## 🚀 Integration Guide

### Step 1: Import Dependencies

```tsx
import { VoiceCommandsContainer } from '../components/VoiceCommandsContainer';
import { Tag } from '../types/tag';
```

### Step 2: Define Actions

```tsx
const handleAddTag = (type: Tag['type']) => {
  // Add tag at current location
  const newTag: Tag = {
    id: `user-${Date.now()}`,
    type,
    lat: currentLat,
    lon: currentLon,
    source: 'user',
    timestamp: new Date().toISOString()
  };
  setTags([...tags, newTag]);
};

const handleFilterTags = (source: 'model' | 'osm' | 'user' | 'all') => {
  if (source === 'all') {
    setFilteredTags(tags);
  } else {
    setFilteredTags(tags.filter(t => t.source === source));
  }
};

const handleNavigateTo = (type: Tag['type']) => {
  // Find nearest tag and pan map
  const nearest = tags
    .filter(t => t.type === type)
    .sort((a, b) => calculateDistance(userLocation, a) - calculateDistance(userLocation, b))[0];
  
  if (nearest) {
    mapRef.current?.panTo([nearest.lat, nearest.lon]);
  }
};
```

### Step 3: Add Voice Commands to Your Page

```tsx
function TaggingPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>(tags);

  return (
    <div className="p-4 space-y-4">
      {/* Voice Command Panel */}
      <VoiceCommandsContainer
        tags={filteredTags}
        onAddTag={handleAddTag}
        onFilterTags={handleFilterTags}
        onNavigateTo={handleNavigateTo}
        onClearFilters={() => setFilteredTags(tags)}
        onShowHelp={() => setShowHelpDialog(true)}
      />

      {/* Your existing map/content */}
      <TaggingMap tags={filteredTags} />
    </div>
  );
}
```

## 🎨 Customization

### Configure Voice Recognition

```tsx
const voiceCommands = useVoiceCommands(actions, {
  language: 'en-US',           // Language code
  continuous: true,            // Keep listening
  confidenceThreshold: 0.6,    // Minimum confidence (0-1)
  debug: false                 // Enable console logs
});
```

### Configure Text-to-Speech

```tsx
import { ttsService } from '../lib/ttsService';

ttsService.configure({
  rate: 1.0,        // Speech rate (0.1 - 10)
  pitch: 1.0,       // Voice pitch (0 - 2)
  volume: 1.0,      // Volume (0 - 1)
  lang: 'en-US',    // Language
  voiceName: ''     // Specific voice name (optional)
});
```

### Add Custom Commands

Edit `src/lib/voiceCommandParser.ts`:

```tsx
{
  command: 'my_custom_command',
  patterns: [
    /\b(trigger|phrase|here)\b/i,
  ],
  priority: 8
}
```

Then handle in `useVoiceCommands.ts`:

```tsx
case 'my_custom_command':
  actions.myCustomAction();
  result.feedback = 'Custom action executed.';
  result.executed = true;
  break;
```

## ♿ Accessibility Features

### Visual + Audio Feedback
- All spoken feedback is also displayed visually
- Color-coded status messages
- ARIA live regions for screen readers

### Keyboard Support
- All controls accessible via keyboard
- Focus management
- Tab navigation

### Error Handling
- Graceful fallback for unsupported browsers
- Clear error messages
- Retry mechanisms

### Status Indicators
- Visual "Listening" badge
- Transcript display
- Status messages
- Help dialog

## 🧪 Testing

### Browser Compatibility
- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Safari
- ❌ Firefox (limited support)

### Testing Commands

1. Click "Start Voice Commands"
2. Wait for "Listening..." status
3. Speak a command clearly
4. Wait for feedback
5. Verify action executed

### Debug Mode

Enable debug logging:

```tsx
const voiceCommands = useVoiceCommands(actions, {
  debug: true
});
```

Console will show:
- Raw transcripts
- Parsed commands
- Confidence scores
- Execution results

## 🔧 Troubleshooting

### "Speech recognition not supported"
- Use Chrome, Edge, or Safari
- Enable microphone permissions
- Use HTTPS (required for Web Speech API)

### Commands not recognized
- Speak more clearly
- Reduce background noise
- Lower `confidenceThreshold` in config
- Check console logs with `debug: true`

### No audio feedback
- Check browser audio settings
- Verify `speechSynthesis` is available
- Try different voice in TTS config

### Continuous listening stops
- Normal behavior after processing command
- Will restart automatically if `continuous: true`
- Check browser console for errors

## 📝 Example: Complete Integration

```tsx
import React, { useState, useCallback } from 'react';
import { VoiceCommandsContainer } from '../components/VoiceCommandsContainer';
import { Tag } from '../types/tag';

export function AccessibleTaggingPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>(tags);
  const [activeFilters, setActiveFilters] = useState<any>({});

  const handleAddTag = useCallback((type: Tag['type']) => {
    const newTag: Tag = {
      id: `user-${Date.now()}`,
      type,
      lat: 34.67, // Current location
      lon: -82.48,
      source: 'user',
      timestamp: new Date().toISOString()
    };
    setTags(prev => [...prev, newTag]);
    setFilteredTags(prev => [...prev, newTag]);
  }, []);

  const handleFilterTags = useCallback((source: 'model' | 'osm' | 'user' | 'all') => {
    if (source === 'all') {
      setFilteredTags(tags);
      setActiveFilters({});
    } else {
      setFilteredTags(tags.filter(t => t.source === source));
      setActiveFilters({ source });
    }
  }, [tags]);

  const handleNavigateTo = useCallback((type: Tag['type']) => {
    const matches = filteredTags.filter(t => t.type === type);
    if (matches.length > 0) {
      // Navigate to first match
      console.log('Navigate to:', matches[0]);
    }
  }, [filteredTags]);

  const handleClearFilters = useCallback(() => {
    setFilteredTags(tags);
    setActiveFilters({});
  }, [tags]);

  const handleShowHelp = useCallback(() => {
    console.log('Show help dialog');
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Accessible Tagging</h1>

      {/* Voice Command Panel */}
      <VoiceCommandsContainer
        tags={filteredTags}
        onAddTag={handleAddTag}
        onFilterTags={handleFilterTags}
        onNavigateTo={handleNavigateTo}
        onClearFilters={handleClearFilters}
        onShowHelp={handleShowHelp}
        activeFilters={activeFilters}
      />

      {/* Tag Display */}
      <div className="grid gap-2">
        {filteredTags.map(tag => (
          <div key={tag.id} className="p-4 border rounded">
            <strong>{tag.type}</strong> - {tag.source}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🎓 Best Practices

1. **Provide Clear Feedback**
   - Always speak confirmation after actions
   - Show visual status for deaf users
   - Use both success and error messages

2. **Handle Errors Gracefully**
   - Fallback to visual-only mode
   - Provide retry options
   - Log errors for debugging

3. **Keep Commands Simple**
   - Use natural, conversational phrases
   - Support variations of same command
   - Provide examples in help

4. **Test with Real Users**
   - Test with screen readers
   - Verify with voice-over users
   - Get feedback from accessibility community

5. **Performance**
   - Debounce transcript processing
   - Cancel previous TTS before new speech
   - Clean up on component unmount

## 📚 Additional Resources

- [Web Speech API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [react-speech-recognition](https://github.com/JamesBrill/react-speech-recognition)

## 📄 License

Same as parent project.
