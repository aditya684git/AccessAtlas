# Camera Detection - Quick Reference

## 🚀 Quick Start

### Access Camera Screen
1. Tap Camera icon in bottom navigation
2. Or navigate to `/camera`

### Basic Flow
```
Take Photo → Analyzing... → Prediction → Confirm → Navigate
```

## 🎯 Main Functions

### Photo Capture
```typescript
// Trigger camera
triggerCamera() // Opens file picker with camera

// Handle capture
handleCapture(event) // Processes selected image
```

### ML Prediction
```typescript
// Run prediction on image
const prediction = await runPrediction(file);
// Returns: { type, confidence, lat, lon }
```

### Tag Management
```typescript
// Confirm and save tag
handleConfirm() // Saves to localStorage

// Edit tag type
handleEdit() // Enter edit mode
setEditedType(type) // Select new type
```

### Navigation
```typescript
// Navigate to confirmed tag
handleNavigate()
// → startNavigation(tag)
// → navigate('/navigation-screen')
```

## 🎤 Voice Commands

| Say | Result |
|-----|--------|
| "capture photo" | Opens camera |
| "confirm tag" | Saves prediction |
| "navigate to [type]" | Starts navigation |

## 📝 Tag Types

| Type | Emoji | Name |
|------|-------|------|
| `ramp` | ♿ | Ramp |
| `elevator` | 🛗 | Elevator |
| `tactile_path` | 🦯 | Tactile Path |
| `entrance` | 🚪 | Entrance |
| `obstacle` | 🚧 | Obstacle |

## 🔄 State Flow

```
┌─────────────┐
│ No Photo    │ ← Initial state
│ "Take Photo"│
└──────┬──────┘
       ↓ (capture)
┌─────────────┐
│ Loading     │
│ "Analyzing" │
└──────┬──────┘
       ↓ (prediction complete)
┌─────────────┐
│ Prediction  │ ← Show type + confidence
│ Confirm/Edit│
└──────┬──────┘
       ↓ (confirm)
┌─────────────┐
│ Confirmed   │ ← Show navigate option
│ Navigate    │
└─────────────┘
```

## 🛠️ Integration Points

### NavigationContext
```typescript
import { useNavigation } from '../contexts/NavigationContext';
const { startNavigation } = useNavigation();

// Set target tag
startNavigation(confirmedTag);
```

### Voice Commands
```typescript
// Listen for voice events
window.addEventListener('voiceCapturePhoto', handleCapture);
window.addEventListener('voiceConfirmTag', handleConfirm);
window.addEventListener('voiceNavigateToTag', handleNavigate);
```

### LocalStorage
```typescript
// Save tag
const tags = JSON.parse(localStorage.getItem('accessibility_tags') || '[]');
tags.push(newTag);
localStorage.setItem('accessibility_tags', JSON.stringify(tags));

// Emit event for map refresh
window.dispatchEvent(new CustomEvent('tagAdded', { detail: { tag } }));
```

## 📱 UI States

### Button States
- **Take Photo**: Blue, large, camera icon
- **Confirm**: Green, check icon
- **Edit**: Blue outline, edit icon
- **Navigate**: Green, navigation icon
- **Capture Another**: Blue outline, camera icon

### Visual Feedback
- **Loading**: Spinner + "Analyzing image..."
- **Prediction**: Emoji + type name + confidence %
- **Confirmed**: Green check + success message
- **Error**: Red toast notification

## 🎨 Styling

### Colors
- Primary: Blue (#2563eb)
- Success: Green
- Error: Red
- Background: White/Gray

### Icons
- Camera: Lucide `<Camera />`
- Check: Lucide `<Check />`
- Edit: Lucide `<Edit3 />`
- Navigation: Lucide `<Navigation />`
- Loading: Lucide `<Loader2 />` (spinning)

## 🔍 Debugging

### Check Prediction
```typescript
console.log('Prediction:', prediction);
// { type: 'ramp', confidence: 0.89, lat: 34.67, lon: -82.48 }
```

### Check Saved Tags
```typescript
const tags = JSON.parse(localStorage.getItem('accessibility_tags') || '[]');
console.log('Tags:', tags);
```

### Voice Command Events
```typescript
window.addEventListener('voiceCapturePhoto', () => {
  console.log('Voice: capture photo');
});
```

## ⚡ Performance Tips

1. **Image Size**: Keep images under 5MB
2. **Geolocation**: Request permission early
3. **Loading State**: Show spinner immediately
4. **Error Handling**: Always catch async errors
5. **Event Cleanup**: Remove listeners on unmount

## 🚨 Common Issues

### Camera Not Opening
- Check mobile permissions
- Ensure `capture="environment"` attribute set
- Test on actual device (not desktop)

### Prediction Slow
- Check network connection (if using API)
- Verify geolocation permission granted
- Check console for errors

### Tag Not Saving
- Check localStorage quota
- Verify tag format matches Tag type
- Check browser console for errors

### Navigation Not Working
- Ensure NavigationContext imported
- Check if targetTag is set correctly
- Verify `/navigation-screen` route exists

## 📦 Dependencies

- React 18
- TypeScript
- react-router-dom (navigation)
- Lucide icons
- shadcn/ui components
- NavigationContext (custom)
- ttsService (custom)

## 🎯 Success Indicators

✅ Camera opens on button tap  
✅ Image displays after capture  
✅ Loading spinner shows during prediction  
✅ Prediction displays with confidence  
✅ Confirm saves tag to localStorage  
✅ Navigate switches to navigation screen  
✅ Voice commands trigger actions  
✅ TTS announces all states  

---

**Route**: `/camera`  
**Component**: `Camera.tsx`  
**Status**: ✅ Production Ready
