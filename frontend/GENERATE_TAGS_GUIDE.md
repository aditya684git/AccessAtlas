# Generate Tags Feature - Documentation

## Overview

The **Generate Tags** button is an AI-powered feature that automatically generates accessibility tags by combining:
1. **OSM (OpenStreetMap)** real-world accessibility data
2. **ML Model** detection from uploaded images
3. **Local Tags** created manually by users

## UI Location

**Position**: Top-right corner of the tagging screen  
**Icon**: Purple sparkle (✨)  
**Panel**: White card with shadow

## How It Works

### Step 1: Optional Image Upload
```tsx
<input type="file" accept="image/*" onChange={handleImageSelect} />
```
- Select an image for ML detection (optional)
- Supported formats: JPG, PNG, WEBP, BMP
- Max size: 10MB (backend limit)
- Shows filename confirmation when selected

### Step 2: Click "Generate Tags"
```tsx
<Button onClick={handleGenerateTags}>
  <Sparkles /> Generate Tags
</Button>
```
- Triggers parallel fetching of OSM and model tags
- Shows loading spinner and disables button during generation
- Displays toast notifications for each step

### Step 3: Tags Are Generated

#### 🗺️ OSM Tags (Green)
- Fetched from Overpass API
- 500m radius around map center
- Filters for accessibility features:
  - `wheelchair=yes`
  - `ramp=yes`
  - `amenity=elevator`
  - `tactile_paving=yes`
  - `entrance=*`
  - `barrier=*`
- Maps OSM tags to app tag types
- Read-only (cannot be edited/deleted)

#### 🤖 Model Tags (Purple)
- Only generated if image is uploaded
- Calls backend `/detect` endpoint
- Returns detection results with confidence scores
- Maps detection labels to tag types:
  - "ramp" → Ramp
  - "elevator" → Elevator
  - "door/entrance" → Entrance
  - "path/tactile" → Tactile Path
  - Others → Obstacle
- Shows confidence percentage (e.g., 92%)
- Placed near map center with slight offsets

#### 📍 Local Tags (Blue)
- User-created tags
- Shown in summary for context
- Editable and deletable

## Code Architecture

### Frontend Components

#### Tagging.tsx
```tsx
// State management
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
const [generatedTags, setGeneratedTags] = useState<{
  osmTags: MapTag[];
  modelTags: MapTag[];
}>({ osmTags: [], modelTags: [] });

// Main generation function
const handleGenerateTags = async () => {
  // 1. Get map center
  // 2. Fetch OSM features
  // 3. Run model detection (if image provided)
  // 4. Convert to tags
  // 5. Dispatch to TaggingMap
};
```

#### TaggingMap.tsx
```tsx
// Event listeners
window.addEventListener('requestMapCenter', handleRequestMapCenter);
window.addEventListener('addGeneratedTags', handleAddGeneratedTags);

// Add tags to appropriate state
const handleAddGeneratedTags = (e) => {
  const osmTags = newTags.filter(t => t.source === 'osm');
  const modelTags = newTags.filter(t => t.source === 'model');
  
  setOsmFeatures((prev) => [...prev, ...osmTags]);
  setTags((prev) => [...prev, ...modelTags]);
};
```

### Backend Integration

#### 1. OSM API Call
```typescript
const osmElements = await fetchAccessibilityFeatures(lat, lon, radius);

// Map to tags
const osmTags = osmElements.map((el) => ({
  id: `osm-${el.id}`,
  type: mapOSMTagToType(el.tags),
  source: 'osm',
  readonly: true,
  ...
}));
```

#### 2. Model Detection Call
```typescript
const detectResponse = await sendImage(selectedImage);

// Convert detections to tags
const modelTags = detectResponse.detections.map((detection) => ({
  id: `model-${Date.now()}`,
  type: mapLabelToType(detection.label),
  source: 'model',
  confidence: detection.confidence,
  ...
}));
```

## Tag Display

### Summary Panel
Shows three sections with counts and samples:

```
📍 Local Tags: 5
  • Family Restroom
  • Bakinginator
  • Access Path

🗺️ OSM Tags: 12
  • Ramp - Main St entrance
  • Elevator - Building A
  • Tactile Path - Crosswalk

🤖 Model Tags: 3
  • Ramp (92%)
  • Entrance (87%)
  • Obstacle (65%)
```

### Map Markers
- **User Tags**: Blue border
- **OSM Tags**: Green border
- **Model Tags**: Purple border with confidence badge

## API Endpoints

### 1. OSM Overpass API
```
POST https://overpass-api.de/api/interpreter
Query: node/way[wheelchair=yes](around:500,lat,lon)
```

**Response:**
```json
{
  "elements": [
    {
      "id": 123456,
      "lat": 34.67,
      "lon": -82.48,
      "tags": {
        "wheelchair": "yes",
        "name": "Main Entrance"
      }
    }
  ]
}
```

### 2. Backend /detect Endpoint
```
POST /detect
Content-Type: multipart/form-data
Body: file=<image>
```

**Response:**
```json
{
  "detections": [
    {
      "label": "ramp",
      "confidence": 0.92,
      "position": "in the center"
    }
  ],
  "count": 1,
  "inference_time": 1.23
}
```

## Error Handling

### Network Errors
```typescript
try {
  const osmElements = await fetchAccessibilityFeatures(...);
} catch (error) {
  toast({
    title: "OSM Fetch Failed",
    description: "Could not load OSM features. Continuing with model detection.",
    variant: "destructive",
  });
}
```

### Model Detection Errors
```typescript
try {
  const detectResponse = await sendImage(selectedImage);
} catch (error) {
  toast({
    title: "Model Detection Failed",
    description: error.message,
    variant: "destructive",
  });
}
```

### Invalid File Type
```typescript
if (!file.type.startsWith('image/')) {
  toast({
    title: "Invalid File",
    description: "Please select an image file",
    variant: "destructive",
  });
  return;
}
```

## User Flow

```
1. User opens Tagging screen
   ↓
2. (Optional) User uploads image
   ↓
3. User clicks "Generate Tags"
   ↓
4. Loading spinner appears
   ↓
5. OSM features fetched (toast notification)
   ↓
6. Model detection runs (if image provided) (toast notification)
   ↓
7. Tags appear on map with appropriate colors
   ↓
8. Summary panel updates with counts
   ↓
9. User can interact with generated tags
```

## Tag Type Mapping

### OSM Tags → App Types
| OSM Tag | App Type |
|---------|----------|
| `wheelchair=yes` | Ramp |
| `ramp=yes` | Ramp |
| `amenity=elevator` | Elevator |
| `highway=elevator` | Elevator |
| `tactile_paving=yes` | Tactile Path |
| `entrance=*` | Entrance |
| `barrier=*` | Obstacle |

### Model Labels → App Types
| Detection Label | App Type |
|----------------|----------|
| "ramp", "wheelchair" | Ramp |
| "elevator", "lift" | Elevator |
| "door", "entrance" | Entrance |
| "path", "tactile" | Tactile Path |
| Others | Obstacle |

## Advantages

### 🚀 Speed
- Generates dozens of tags in seconds
- No manual placement required

### 🎯 Accuracy
- OSM data is verified by community
- Model provides confidence scores
- User can review before accepting

### 🌍 Coverage
- OSM provides real-world data
- Model fills gaps in OSM coverage
- Combines best of both sources

### ♿ Accessibility
- Voice feedback for each step
- Keyboard accessible
- Screen reader compatible

## Configuration

### Environment Variables
```env
# Backend API
VITE_API_URL=http://localhost:8000

# OSM API (default: public Overpass)
OSM_API_URL=https://overpass-api.de/api/interpreter

# Model settings (backend)
CONFIDENCE_THRESHOLD=0.5
```

### Customization

**Adjust OSM radius:**
```typescript
const osmElements = await fetchAccessibilityFeatures(lat, lon, 1000); // 1km
```

**Filter by confidence:**
```typescript
const modelTags = detections
  .filter(d => d.confidence > 0.7) // Only high confidence
  .map(...);
```

**Change tag placement:**
```typescript
const offsetLat = mapCenter.lat + offset * 0.001; // Increase offset
```

## Testing

### Manual Testing
1. Open tagging screen
2. Click "Generate Tags" (without image)
3. Verify OSM tags appear
4. Upload an image
5. Click "Generate Tags"
6. Verify model tags appear with confidence %

### Test Cases
- ✅ Generate with no image (OSM only)
- ✅ Generate with image (OSM + Model)
- ✅ Invalid file type rejection
- ✅ Network error handling
- ✅ Empty OSM response
- ✅ Empty model detection
- ✅ Mixed success (OSM success, model failure)
- ✅ Tag placement doesn't overlap
- ✅ Summary updates correctly

## Troubleshooting

### Issue: No OSM tags generated
**Cause:** Remote location with no OSM data  
**Solution:** Move map to urban area or increase radius

### Issue: Model detection fails
**Cause:** Backend not running or image too large  
**Solution:** Check backend is running on port 8000, reduce image size

### Issue: Tags overlap
**Cause:** Multiple tags at same location  
**Solution:** Increase offset multiplier in code

### Issue: Slow generation
**Cause:** Large image or slow network  
**Solution:** Compress image, check network speed

## Future Enhancements

- [ ] Batch image upload
- [ ] Custom tag type mapping
- [ ] Save OSM queries for offline use
- [ ] Model retraining with user feedback
- [ ] Confidence threshold slider
- [ ] Filter by tag source
- [ ] Export generated tags
- [ ] Share tags with community

## Performance

- **OSM fetch**: ~1-2 seconds
- **Model detection**: ~0.5-2 seconds (depends on image size)
- **Tag rendering**: ~100-200ms
- **Total**: ~2-4 seconds for full generation

## Limitations

- OSM coverage varies by location
- Model accuracy depends on image quality
- Requires internet connection
- Backend must be running for model detection
- Max 10MB image size

## Accessibility

- ✅ Keyboard navigable
- ✅ Screen reader announcements via toast
- ✅ Color blind friendly (distinct borders)
- ✅ High contrast UI
- ✅ Loading states clearly indicated
- ✅ Error messages descriptive

## Summary

The Generate Tags feature combines:
- 🗺️ **Real-world data** from OpenStreetMap
- 🤖 **AI detection** from YOLOv5 model
- 📍 **User input** from manual tagging

This creates a comprehensive, accurate accessibility map with minimal manual effort.
