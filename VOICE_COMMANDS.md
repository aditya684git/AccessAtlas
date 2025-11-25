# 🗺️ AccessAtlas - Voice Commands Guide

## Overview
AccessAtlas supports comprehensive voice commands for hands-free navigation and accessibility feature tagging. This guide covers all available voice commands and best practices for optimal recognition.

## 🎤 Getting Started

### Browser Support
- ✅ **Chrome/Chromium** (recommended) - Full support
- ✅ **Microsoft Edge** - Full support
- ✅ **Safari** (macOS/iOS) - Full support with webkit
- ⚠️ **Firefox** - Limited support (requires flag)

### Enabling Voice Commands
1. Navigate to any screen with voice functionality
2. Click the microphone button
3. Grant microphone permissions when prompted
4. Speak clearly and wait for feedback

### Voice Settings
Customize voice feedback in **Settings**:
- **Voice Speed**: 0.5x to 2.0x (default: 1.0x)
- **Verbosity**: Brief, Standard, or Detailed
- **Enable/Disable**: Toggle voice feedback on/off

---

## 📋 Command Categories

### 🏠 Home Screen Commands

| Command | Action | Example Variations |
|---------|--------|-------------------|
| "open camera" | Navigate to Camera Screen | "camera", "take photo", "capture" |
| "open tagging" | Navigate to Tagging Screen | "tagging", "tag accessibility" |
| "open settings" | Navigate to Settings Screen | "settings", "preferences" |

**Usage Example:**
```
You: "Open camera"
App: "Opening Camera" [navigates to camera screen]
```

---

### 📸 Camera Screen Commands

| Command | Action | Example Variations |
|---------|--------|-------------------|
| "capture photo" | Take a photo | "take photo", "snap", "capture" |
| "confirm tag" | Confirm detected tag | "confirm", "save tag" |
| "navigate to [type]" | Navigate to detected feature | "navigate to ramp", "go to elevator" |

**Workflow Example:**
```
You: "Capture photo"
App: "Taking photo..." [captures image]
App: "Detected: Ramp with 85% confidence"

You: "Confirm tag"
App: "Tag saved successfully"

You: "Navigate to ramp"
App: [switches to navigation screen with route to ramp]
```

---

### 🗺️ Tagging Screen Commands

#### Adding Tags
| Command | Action | Tag Type |
|---------|--------|----------|
| "add ramp" | Add wheelchair ramp | ♿ Ramp |
| "add elevator" | Add elevator | 🛗 Elevator |
| "add entrance" | Add accessible entrance | 🚪 Entrance |
| "add obstacle" | Add obstacle/hazard | 🚧 Obstacle |
| "add tactile path" | Add tactile paving | 🦯 Tactile Path |

**Usage Example:**
```
You: "Add ramp"
App: "Added ramp at current location"
[visual marker appears on map with animation]
```

#### Filtering Tags
| Command | Action |
|---------|--------|
| "show user tags" | Display only your tags |
| "clear filters" | Show all tags |

#### Navigation Commands
| Command | Action | Example Variations |
|---------|--------|-------------------|
| "navigate to nearest elevator" | Route to closest elevator | "find elevator", "go to elevator" |
| "navigate to nearest ramp" | Route to closest ramp | "find ramp", "go to ramp" |
| "navigate to nearest entrance" | Route to closest entrance | "find entrance" |

#### Information Commands
| Command | Action |
|---------|--------|
| "read tags" | Speak count and types of visible tags |
| "help" | Show available commands |

**Example Session:**
```
You: "Add ramp"
App: "Ramp added at current location"

You: "Read tags"
App: "There are 5 tags visible: 2 ramps, 2 elevators, 1 entrance"

You: "Navigate to nearest elevator"
App: "Navigating to elevator at Main Street entrance"
[switches to navigation screen]
```

---

### 🧭 Navigation Screen Commands

| Command | Action |
|---------|--------|
| "cancel navigation" | Stop current navigation |
| "repeat instructions" | Repeat last turn instruction |

**Usage Example:**
```
[During active navigation]
You: "Repeat instructions"
App: "Turn right in 50 meters onto Elm Street"

You: "Cancel navigation"
App: "Navigation cancelled"
[returns to previous screen]
```

---

## 🎯 Best Practices

### For Optimal Recognition

1. **Speak Clearly**
   - Use normal speaking pace
   - Enunciate words clearly
   - Avoid background noise

2. **Wait for Feedback**
   - Each command provides visual + audio feedback
   - Wait for confirmation before next command
   - Watch for status indicators

3. **Use Natural Language**
   - Commands are case-insensitive
   - Multiple variations supported
   - "Add a ramp" = "Create ramp" = "Mark ramp"

4. **Check Microphone**
   - Ensure microphone permissions granted
   - Use quality microphone for best results
   - Check browser compatibility

### Accessibility Tips

1. **Visual + Audio Feedback**
   - All spoken responses also appear on screen
   - Status messages visible in toast notifications
   - Color-coded feedback (green=success, amber=warning)

2. **Screen Reader Integration**
   - All commands work with screen readers
   - ARIA labels on all interactive elements
   - Keyboard navigation fully supported

3. **Verbosity Control**
   - **Brief**: Short confirmations ("Tag added")
   - **Standard**: Moderate detail ("Ramp added at current location")
   - **Detailed**: Full context ("Added wheelchair ramp at latitude 40.7128, longitude -74.0060")

---

## 🔧 Troubleshooting

### "Voice commands not working"
**Solution:**
1. Check browser compatibility (use Chrome/Edge)
2. Grant microphone permissions
3. Ensure microphone is not muted
4. Try refreshing the page

### "Commands not recognized"
**Solution:**
1. Speak more clearly and slowly
2. Reduce background noise
3. Try alternative command phrasings
4. Check microphone is working (browser settings)

### "No audio feedback"
**Solution:**
1. Check volume settings
2. Enable voice feedback in Settings
3. Adjust voice speed if needed
4. Test with "read tags" command

### "Microphone permission denied"
**Solution:**
1. Click lock icon in address bar
2. Change microphone permission to "Allow"
3. Refresh the page
4. Try voice commands again

---

## 📊 Command Quick Reference

### Most Common Commands
```
✅ "Add ramp"              - Tag wheelchair ramp
✅ "Navigate to elevator"  - Route to nearest elevator
✅ "Capture photo"         - Take photo with camera
✅ "Read tags"             - Hear visible tag count
✅ "Clear filters"         - Show all tags
```

### Full Command Pattern Examples

**Adding Tags:**
- "Add [a/an] [type]" → "Add ramp", "Add an elevator"
- "[Type] here" → "Ramp here", "Elevator here"
- "Mark [type]" → "Mark entrance", "Mark obstacle"
- "Create [type]" → "Create tactile path"

**Navigation:**
- "Navigate to [nearest] [type]" → "Navigate to ramp"
- "Go to [type]" → "Go to elevator"
- "Find [type]" → "Find entrance"
- "Show me [type]" → "Show me ramp"

**Filtering:**
- "Show [source] tags" → "Show user tags"
- "Display [source] only" → "Display user only"
- "Filter by [source]" → "Filter by user"

---

## 🎓 Example Scenarios

### Scenario 1: Finding Accessible Route
```
1. Open app on Home screen
2. Say: "Open tagging"
3. Say: "Navigate to nearest elevator"
4. Follow turn-by-turn directions
5. Say: "Cancel navigation" (when done)
```

### Scenario 2: Adding Accessibility Feature
```
1. Navigate to Tagging screen
2. Position map at desired location
3. Say: "Add ramp"
4. Confirm visual marker appears
5. Say: "Read tags" to verify
```

### Scenario 3: ML-Assisted Tagging
```
1. Say: "Open camera"
2. Point camera at accessibility feature
3. Say: "Capture photo"
4. Wait for ML prediction
5. Say: "Confirm tag" to save
6. Say: "Navigate to ramp" to route
```

---

## 📱 Mobile Usage

### iOS Safari
- Hold microphone button while speaking
- Grant microphone access in Settings > Safari
- Use headset for better recognition in windy conditions

### Android Chrome
- Single tap microphone to start listening
- Microphone indicator shows in address bar
- Use "OK Google" integration (optional)

### Mobile-Specific Tips
- Use landscape mode for better map view
- Enable location services for accurate tagging
- Connect Bluetooth headset for hands-free use

---

## 🌐 Language Support

**Current:** English (US)

**Planned:**
- Spanish (ES)
- French (FR)
- German (DE)
- Chinese (ZH)

To request language support, open an issue on GitHub.

---

## 🤝 Contributing

Found a command pattern that should work but doesn't?

1. Open an issue with:
   - Your spoken command
   - Expected behavior
   - Actual behavior
   - Browser and OS

2. Or submit a PR to `voiceCommandParser.ts`

---

## 📞 Support

- **Documentation:** [README.md](./README.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/AccessAtlas/issues)
- **Email:** support@accessatlas.app

---

## 🎉 Tips for Power Users

1. **Chain Commands** (future feature)
   ```
   "Add ramp then navigate to elevator"
   ```

2. **Custom Shortcuts** (future feature)
   ```
   Settings > Voice > Custom Commands
   "Home" → Navigate to saved home location
   ```

3. **Voice Macros** (future feature)
   ```
   "Start accessibility audit"
   → Reads all tags + obstacles + routes
   ```

---

**Last Updated:** November 25, 2025  
**Version:** 1.0.0  
**Status:** Production Ready
