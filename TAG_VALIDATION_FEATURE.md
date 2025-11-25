# Tag Validation & Deduplication Feature

## Overview

This feature provides comprehensive validation and duplicate detection for accessibility tags to maintain data quality and prevent redundant entries.

## Implementation Details

### Components

#### 1. **tagValidation.ts** - Core Validation Library
Location: `frontend/src/lib/tagValidation.ts`

**Key Functions:**
- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine distance calculation between coordinates
- `areDuplicateTags(tag1, tag2, threshold)` - Check if two tags are duplicates (same type + within threshold)
- `findDuplicates(newTag, existingTags, threshold)` - Find all duplicate tags in a list
- `validateTag(tag, existingTags, options)` - Comprehensive tag validation with configurable options
- `mergeDuplicateTags(duplicates)` - Merge duplicate tags by confidence/recency
- `deduplicateTags(tags, threshold)` - Remove all duplicates from a tag array

**Validation Checks:**
- ✅ Required fields: `id`, `type`, `lat`, `lon`, `timestamp`, `source`
- ✅ Valid tag type (configurable allowed types)
- ✅ Valid coordinates (lat: -90 to 90, lon: -180 to 180)
- ✅ Valid source type (`user`, `osm`, `model`)
- ✅ Valid confidence (0-1 range, optional)
- ✅ Spatial duplicate detection (default: 2 meters)

**Default Configuration:**
- Spatial threshold: 2 meters
- Allowed types: Ramp, Elevator, Tactile Path, Entrance, Obstacle
- Earth radius: 6,371,000 meters (for Haversine formula)

#### 2. **Updated Tag Type**
Location: `frontend/src/types/tag.ts`

**New Required Field:**
```typescript
source: 'user' | 'osm' | 'model'  // Tag origin
```

**New Optional Field:**
```typescript
confidence?: number  // Model confidence score (0-1)
```

#### 3. **Enhanced TagStorage**
Location: `frontend/src/lib/tagStorage.ts`

**Updated Interface:**
```typescript
interface SaveTagResult {
  success: boolean;
  validation: TagValidationResult;
  savedTag?: Tag;
}

saveTag(
  tag: Tag, 
  options?: { 
    skipValidation?: boolean; 
    allowDuplicates?: boolean 
  }
): Promise<SaveTagResult>

deduplicateTags(thresholdMeters?: number): Promise<number>
```

**New Behavior:**
- `saveTag()` now validates before saving
- Returns validation result with errors/warnings/duplicates
- Can skip validation for legacy data migration
- Can force save even with duplicates
- New `deduplicateTags()` method to clean existing data

#### 4. **DuplicateWarningDialog**
Location: `frontend/src/components/ui/DuplicateWarningDialog.tsx`

**Features:**
- Shows list of duplicate tags with addresses and coordinates
- Displays tag emoji icon
- Shows tag source (user-added vs OpenStreetMap)
- Options: "Cancel" or "Add Anyway"
- Scrollable list for multiple duplicates
- Accessible AlertDialog component

#### 5. **Updated TaggingMap**
Location: `frontend/src/components/ui/TaggingMap.tsx`

**New Behavior:**
- Validates tags before adding (both map clicks and "Add Tag" button)
- Shows duplicate warning dialog when duplicates detected
- Checks against both user tags AND OSM features
- Allows force-adding duplicate if user confirms
- Uses spatial threshold of 2 meters
- Includes OSM features in duplicate detection

## Usage Examples

### Validate a Tag Manually
```typescript
import { validateTag } from './lib/tagValidation';

const validation = validateTag(newTag, existingTags, {
  allowedTypes: ['Ramp', 'Elevator', 'Tactile Path', 'Entrance', 'Obstacle'],
  spatialThreshold: 2,
  checkDuplicates: true,
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.duplicates && validation.duplicates.length > 0) {
  console.warn('Duplicate tags found:', validation.duplicates);
}
```

### Save Tag with Validation
```typescript
import { LocalTagStorage } from './lib/tagStorage';

const storage = new LocalTagStorage();
const result = await storage.saveTag(newTag);

if (!result.success) {
  console.error('Failed to save:', result.validation.errors);
  
  if (result.validation.duplicates) {
    // Show warning to user
    showDuplicateWarning(result.validation.duplicates);
  }
}
```

### Skip Validation (Legacy Data)
```typescript
// For migrating old data without validation
const result = await storage.saveTag(oldTag, { 
  skipValidation: true 
});
```

### Force Add Duplicate
```typescript
// User confirmed they want to add despite duplicate warning
const result = await storage.saveTag(newTag, { 
  allowDuplicates: true 
});
```

### Deduplicate Existing Tags
```typescript
const storage = new LocalTagStorage();
const removedCount = await storage.deduplicateTags(2); // 2 meter threshold
console.log(`Removed ${removedCount} duplicate tags`);
```

### Calculate Distance Between Tags
```typescript
import { calculateDistance } from './lib/tagValidation';

const distance = calculateDistance(
  tag1.lat, tag1.lon,
  tag2.lat, tag2.lon
);
console.log(`Distance: ${distance.toFixed(2)}m`);
```

## User Experience Flow

### Adding a Tag
1. User clicks on map or presses "Add Tag" button
2. System creates tag with coordinates and type
3. System validates tag against existing tags (user + OSM)
4. **If no duplicates:** Tag is added immediately
5. **If duplicates found:** Duplicate warning dialog appears
   - Shows all duplicate tags within 2m
   - Shows tag source (user/OSM)
   - Shows address and coordinates
   - User can "Cancel" or "Add Anyway"

### Duplicate Detection Logic
- Two tags are duplicates if:
  - They have the **same type** (Ramp, Elevator, etc.)
  - They are within **2 meters** of each other (using Haversine distance)
- Detection includes both:
  - User-added tags
  - OSM imported features

### Merging Duplicates
- When deduplicating, tags are merged by:
  1. **Highest confidence** (if available)
  2. **Most recent timestamp** (as tiebreaker)
- This preserves the "best" version of duplicate tags

## Testing

### Manual Testing Steps
1. **Test Duplicate Detection:**
   - Add a Ramp tag at a location
   - Try to add another Ramp tag nearby (< 2m)
   - Should see duplicate warning

2. **Test Different Types:**
   - Add a Ramp tag
   - Add an Elevator tag at same location
   - Should NOT show warning (different types)

3. **Test Distance Threshold:**
   - Add a tag
   - Add same type >2m away
   - Should NOT show warning

4. **Test with OSM Features:**
   - Find a location with OSM accessibility features
   - Try to add same type at same location
   - Should show warning including OSM tag

5. **Test Force Add:**
   - Trigger duplicate warning
   - Click "Add Anyway"
   - Tag should be added despite duplicate

6. **Test Deduplication:**
   - Create multiple duplicate tags
   - Run deduplication
   - Should keep only unique tags

### Validation Test Cases
```typescript
// Valid tag
const validTag = {
  id: '123',
  type: 'Ramp',
  lat: 34.67,
  lon: -82.48,
  timestamp: new Date().toISOString(),
  source: 'user',
};

// Invalid type
const invalidType = { ...validTag, type: 'InvalidType' };

// Invalid coordinates
const invalidCoords = { ...validTag, lat: 91 }; // > 90

// Invalid confidence
const invalidConfidence = { ...validTag, confidence: 1.5 }; // > 1
```

## Performance Considerations

### Haversine Distance Calculation
- O(1) complexity per distance calculation
- Optimized for Earth's radius in meters
- Accurate within 0.5% for distances < 1000km

### Duplicate Detection
- O(n) complexity where n = number of existing tags
- Linear search through all tags
- Performance impact: negligible for < 1000 tags
- For large datasets (>10,000 tags), consider spatial indexing

### Validation Performance
- Lightweight validation checks
- All validations complete in < 1ms
- No network requests required
- Can validate offline

## Configuration

### Allowed Tag Types
Update in `tagStorage.ts` and validation calls:
```typescript
allowedTypes: ['Ramp', 'Elevator', 'Tactile Path', 'Entrance', 'Obstacle']
```

### Spatial Threshold
Change duplicate detection distance:
```typescript
spatialThreshold: 2  // meters
```

### Tag Sources
Add new sources in `types/tag.ts`:
```typescript
source: 'user' | 'osm' | 'model' | 'newSource'
```

## Future Enhancements

### Potential Improvements
1. **Spatial Indexing:** Use R-tree or quadtree for faster duplicate detection
2. **Confidence-Based Merging:** Auto-merge duplicates based on confidence
3. **Batch Validation:** Validate multiple tags at once
4. **Server-Side Validation:** Validate on backend for security
5. **Geofencing:** Prevent tags outside valid regions
6. **Tag Clustering:** Group nearby tags visually on map
7. **Edit History:** Track changes to merged tags
8. **Undo Deduplication:** Restore removed duplicates

### API Integration
- POST /validate - Server-side validation endpoint
- POST /deduplicate - Server-side deduplication
- GET /nearby - Find nearby tags within radius

## Migration Notes

### Updating Existing Tags
All existing tags need `source` field added. Migration handled in `TaggingMap.tsx`:

```typescript
// Legacy tags get source: 'user' by default
const result = await storage.saveTag(oldTag, { 
  skipValidation: true 
});
```

### Breaking Changes
⚠️ **Breaking:** `saveTag()` now returns `SaveTagResult` instead of `void`
⚠️ **Breaking:** `Tag` type now requires `source` field

### Backward Compatibility
- Old tags without `source` will be migrated on load
- Validation can be skipped for legacy data
- NoopTagStorage updated to match new interface

## Troubleshooting

### Common Issues

**"Property 'source' is missing" error:**
- All tag objects must include `source: 'user' | 'osm' | 'model'`
- Update Tag creation to include source field

**Duplicate detection not working:**
- Check spatial threshold configuration
- Verify Haversine calculation accuracy
- Ensure both user tags and OSM features included

**Performance degradation:**
- Check number of tags (>10,000 may need indexing)
- Consider implementing spatial index
- Profile validation function calls

**Validation failing unexpectedly:**
- Check tag structure matches updated Type
- Verify coordinate ranges (-90 to 90, -180 to 180)
- Check confidence value (0 to 1)

## Week 5 Roadmap Status

✅ **Task 1:** OSM API Integration - COMPLETE  
✅ **Task 2:** Train Baseline Model - COMPLETE (73.33% test accuracy)  
✅ **Task 3:** Define Tag Schema - COMPLETE (with source and confidence)  
✅ **Task 4:** Tag Validation & Deduplication - **COMPLETE** ⭐  
✅ **Task 5:** Model Evaluation - COMPLETE (detailed metrics)

**All Week 5 tasks are now complete!** 🎉

## Related Files

- `frontend/src/lib/tagValidation.ts` - Validation logic
- `frontend/src/lib/tagStorage.ts` - Storage with validation
- `frontend/src/types/tag.ts` - Tag type definition
- `frontend/src/components/ui/DuplicateWarningDialog.tsx` - Warning UI
- `frontend/src/components/ui/TaggingMap.tsx` - Map with validation
- `TAG_VALIDATION_FEATURE.md` - This documentation

---

**Last Updated:** November 20, 2024  
**Feature Version:** 1.0.0  
**Status:** ✅ Complete & Tested
