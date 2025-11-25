# Navigation Flow Implementation - Complete Guide

## 🎯 Overview

AccessAtlas now has a complete navigation flow that allows users to:
1. Select a tag on the tagging screen
2. Start navigation with a button or voice command
3. View the route on a dedicated navigation screen
4. Cancel navigation and return to tagging

## 📁 New Files Created

### 1. **NavigationContext.tsx** (`src/contexts/NavigationContext.tsx`)
- Manages global navigation state
- Stores the target tag for navigation
- Provides `startNavigation()` and `stopNavigation()` methods
- Tracks user location for route calculation

### 2. **NavigationScreen.tsx** (`src/pages/NavigationScreen.tsx`)
- Dedicated navigation screen with Leaflet map
- Shows route from user location to destination
- Displays distance and estimated time
- Provides TTS feedback: "Navigating to [tag type]"
- Includes Back and Cancel buttons
- Full accessibility with ARIA labels and screen reader support

## 🔄 Navigation Flow

### **Starting Navigation**

#### Option 1: Click a Tag → Navigate Button
```
1. User clicks on a map marker
   └─> TaggingMap emits 'tagSelected' event
2. Tagging page shows green "Navigate" button
3. User clicks "Navigate" button
   └─> Calls startNavigation(tag)
   └─> Navigates to /navigation-screen
4. NavigationScreen displays route and speaks feedback
```

#### Option 2: Voice Command
```
1. User says "navigate to elevator"
   └─> Voice command parser detects navigate_to_elevator
2. TaggingMap finds nearest elevator tag
3. If found:
   └─> Emits 'voiceStartNavigation' event with tag
   └─> Tagging page calls startNavigation(tag)
   └─> Navigates to /navigation-screen
4. If not found:
   └─> Speaks "No elevator found nearby"
```

### **During Navigation**

```
NavigationScreen shows:
- Destination marker with emoji icon
- User location marker (blue dot)
- Route line (dashed blue polyline)
- Distance display (meters or kilometers)
- Status message with audio icon
- Back button (returns to tagging)
- Cancel button (stops navigation)
```

### **Canceling Navigation**

#### Option 1: Click Cancel Button
```
1. User clicks "Cancel" button
   └─> Calls stopNavigation()
   └─> Speaks "Navigation cancelled"
   └─> Navigates back to /tagging
```

#### Option 2: Voice Command
```
1. User says "cancel navigation" or "go back"
   └─> Voice command parser detects cancel_navigation
   └─> Emits 'voiceCancelNavigation' event
   └─> NavigationScreen calls stopNavigation()
   └─> Navigates back to /tagging
```

## 📡 Event System

### Events Emitted

| Event Name | Emitted By | Payload | Handled By |
|------------|------------|---------|------------|
| `tagSelected` | TaggingMap (marker click) | `{ tag: Tag }` | Tagging page |
| `voiceStartNavigation` | TaggingMap (voice nav to type) | `{ tag: Tag }` | Tagging page |
| `voiceCancelNavigation` | useVoiceCommands hook | None | NavigationScreen |
| `voiceNavigateToType` | Tagging page | `{ type: string }` | TaggingMap |

### Event Flow Diagram

```
┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Voice   │ OR  ┌──────────┐
    │ Command  │     │  Click   │
    └────┬─────┘     │  Marker  │
         │           └─────┬────┘
         │                 │
    ┌────▼─────────────────▼────┐
    │  Event Emitted             │
    │  (tagSelected or voice)    │
    └────────────┬───────────────┘
                 │
        ┌────────▼────────┐
        │ NavigationContext│
        │  .startNavigation│
        └────────┬─────────┘
                 │
        ┌────────▼────────┐
        │  React Router   │
        │  /navigation    │
        └────────┬─────────┘
                 │
        ┌────────▼────────┐
        │ NavigationScreen│
        │   (with map)    │
        └─────────────────┘
```

## 🎤 Voice Commands

### New Navigation Commands

| Command | Example Phrases | Action |
|---------|----------------|--------|
| **Navigate to [type]** | "navigate to elevator"<br/>"navigate to nearest ramp"<br/>"take me to entrance" | Finds nearest tag of type, starts navigation |
| **Cancel Navigation** | "cancel navigation"<br/>"stop navigation"<br/>"go back" | Stops navigation, returns to tagging |

### Existing Commands Still Work

- "add ramp" → Adds ramp at map center
- "show model tags" → Filters to model-generated tags
- "clear filters" → Shows all tags
- "help" → Shows available commands

## 🗺️ Map Features

### TaggingMap Enhancements

1. **Marker Click Events**
   - Clicking any marker emits `tagSelected` event
   - Selected tag appears at bottom of Tagging screen

2. **Voice Navigation Handler**
   - Listens for `voiceNavigateToType` event
   - Finds nearest tag of requested type
   - Emits `voiceStartNavigation` with found tag
   - Speaks fallback if no tag found

### NavigationScreen Map

1. **Destination Marker**
   - Large emoji icon based on tag type
   - Popup shows type and address
   - Auto-opens on load

2. **User Location Marker**
   - Blue dot with white border
   - "You are here" popup

3. **Route Line**
   - Dashed blue polyline
   - Simple straight-line route (placeholder for real routing API)
   - Map auto-fits bounds to show both points

4. **Distance Calculation**
   - Haversine formula for accuracy
   - Displays in meters (<1km) or kilometers (≥1km)

## ♿ Accessibility Features

### Visual Accessibility

- **High Contrast**: Green "Navigate" button stands out
- **Clear Icons**: Navigation icon, audio icon for TTS
- **Large Touch Targets**: All buttons are 44x44px minimum
- **Status Messages**: Visible text mirrors spoken feedback

### Screen Reader Support

- **ARIA Labels**: All buttons have descriptive labels
- **Live Regions**: Status updates announced automatically
- **Hidden Instructions**: Screen reader-only navigation help
- **Semantic HTML**: Proper heading structure

### Keyboard Navigation

- **Tab Order**: Logical keyboard navigation
- **Focus Indicators**: Visible focus states on all interactive elements
- **Escape Key**: Can close dialogs and return

### Audio Feedback

- **TTS on Start**: "Navigating to [type]. Distance: [distance]"
- **TTS on Cancel**: "Navigation cancelled"
- **TTS on Error**: "No [type] found nearby"
- **Web Speech API**: Uses browser's built-in speech synthesis

## 🔧 Technical Implementation

### NavigationContext API

```typescript
interface NavigationContextType {
  targetTag: Tag | null;              // Current navigation target
  isNavigating: boolean;              // Navigation active status
  startNavigation: (tag: Tag) => void; // Start navigation
  stopNavigation: () => void;          // Stop navigation
  userLocation: {                      // User's current position
    lat: number;
    lon: number;
  } | null;
  setUserLocation: (loc) => void;     // Update user location
}

// Usage
const { startNavigation, stopNavigation, targetTag } = useNavigation();
```

### Route Configuration

```typescript
// In App.tsx
<Route path="/tagging" element={<Tagging />} />
<Route path="/navigation-screen" element={<NavigationScreen />} />

// Wrapped with NavigationProvider
<NavigationProvider>
  <BrowserRouter>
    <Routes>...</Routes>
  </BrowserRouter>
</NavigationProvider>
```

### Voice Command Integration

```typescript
// In voiceCommandParser.ts
{
  command: 'cancel_navigation',
  patterns: [
    /\b(cancel|stop|end)\s+(navigation|navigating|route|routing)\b/i,
    /\b(go|take me)\s+back\b/i,
    /\breturn\s+to\s+(tagging|map)\b/i,
  ],
  priority: 8
}

// In useVoiceCommands.ts
case 'cancel_navigation':
  window.dispatchEvent(new CustomEvent('voiceCancelNavigation'));
  result.feedback = 'Cancelling navigation.';
  break;
```

## 🧪 Testing the Flow

### Manual Testing Steps

1. **Test Tag Selection**
   ```
   1. Go to http://localhost:8080/tagging
   2. Click any marker on the map
   3. Verify "Navigate" button appears at bottom
   4. Click "Navigate"
   5. Verify navigation screen opens with route
   ```

2. **Test Voice Navigation**
   ```
   1. Click "Voice" button on tagging screen
   2. Click "Start Voice Commands"
   3. Say "navigate to elevator"
   4. Verify navigation starts to nearest elevator
   5. If no elevator: verify "No elevator found" message
   ```

3. **Test Cancel Navigation**
   ```
   1. Start navigation to any tag
   2. Click "Cancel" button
   3. Verify return to tagging screen
   4. OR say "cancel navigation" via voice
   5. Verify same result
   ```

4. **Test Accessibility**
   ```
   1. Use keyboard only (Tab, Enter)
   2. Enable screen reader (NVDA, JAWS, VoiceOver)
   3. Verify all buttons are announced
   4. Verify route instructions are spoken
   ```

## 📝 Future Enhancements

### Planned Features

1. **Real Routing API Integration**
   - Replace straight-line with actual walking route
   - Use OpenRouteService or Mapbox Directions API
   - Show turn-by-turn instructions

2. **GPS Tracking**
   - Continuous location updates during navigation
   - Real-time distance/ETA updates
   - "Arrived at destination" detection

3. **Offline Navigation**
   - Cache routes for offline use
   - Compass-based navigation
   - Haptic feedback for direction

4. **Advanced Features**
   - Alternative routes
   - Accessibility preferences (avoid stairs)
   - Save favorite destinations
   - Share routes

## 🎨 UI Components

### NavigationScreen Layout

```
┌───────────────────────────────────┐
│  Status Card (z-index: 1000)      │
│  ┌───────────────────────────┐   │
│  │ 🧭 Elevator               │   │
│  │ 123 Main St               │   │
│  │ 🔵 50m away               │   │
│  │ ┌─────────────────────┐  │   │
│  │ │ 🔊 Navigating to... │  │   │
│  │ └─────────────────────┘  │   │
│  │ [Back]  [Cancel]         │   │
│  └───────────────────────────┘   │
│                                   │
│  ┌───────────────────────────┐   │
│  │                           │   │
│  │         🗺️ Map            │   │
│  │      with Route           │   │
│  │                           │   │
│  │  🔵 (user)  ----→  🛗    │   │
│  │                           │   │
│  └───────────────────────────┘   │
└───────────────────────────────────┘
```

### Button States

```typescript
// Navigate button (on tagging screen when tag selected)
className="bg-green-600 hover:bg-green-700 text-white"

// Voice button
className="bg-blue-600 hover:bg-blue-700 text-white"

// Cancel button (on navigation screen)
variant="destructive"  // Red background
```

## 🔐 Error Handling

### No Target Tag
```typescript
// In NavigationScreen.tsx
useEffect(() => {
  if (!targetTag) {
    console.warn('No target tag, redirecting');
    navigate('/tagging');
    return;
  }
}, [targetTag]);
```

### No Tags Found (Voice Command)
```typescript
// In TaggingMap.tsx
if (matchingTags.length === 0) {
  const fallback = `No ${type} found nearby`;
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(fallback));
}
```

### Geolocation Errors
```typescript
// Optional: Add geolocation with error handling
navigator.geolocation.getCurrentPosition(
  (pos) => setUserLocation({ 
    lat: pos.coords.latitude, 
    lon: pos.coords.longitude 
  }),
  (err) => console.warn('Location unavailable:', err.message)
);
```

## 📚 Related Documentation

- [Voice Commands README](./VOICE_COMMANDS_README.md)
- [Tag Validation Feature](./TAG_VALIDATION_FEATURE.md)
- [TaggingMap Component](../frontend/src/components/ui/TaggingMap.tsx)
- [Navigation Context](../frontend/src/contexts/NavigationContext.tsx)

## ✅ Implementation Checklist

- [x] Create NavigationContext with state management
- [x] Build NavigationScreen component with map
- [x] Add tag selection in TaggingMap
- [x] Show Navigate button when tag selected
- [x] Implement voice "navigate to [type]" command
- [x] Implement voice "cancel navigation" command
- [x] Add route drawing (polyline)
- [x] Calculate and display distance
- [x] TTS feedback for navigation events
- [x] Accessibility features (ARIA, keyboard, screen reader)
- [x] Back/Cancel buttons with proper navigation
- [x] Event system for tag selection and voice commands
- [x] Update App.tsx with NavigationProvider and route
- [ ] Add real-time GPS tracking (future)
- [ ] Integrate routing API for turn-by-turn (future)

---

## 🚀 Quick Start

```bash
# Ensure dev server is running
cd frontend
npm run dev

# Open in browser
http://localhost:8080/tagging

# Test navigation flow
1. Click any marker → "Navigate" button appears
2. Click "Navigate" → Opens navigation screen with route
3. Click "Cancel" → Returns to tagging

# Test voice navigation
1. Click "Voice" button
2. Say "navigate to elevator"
3. Navigation starts automatically
4. Say "cancel navigation" to stop
```

---

**Implementation Complete!** ✨
All navigation features are now live and ready for testing.
