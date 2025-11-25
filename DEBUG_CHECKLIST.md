# Tag Visibility Debug Checklist

## Quick Diagnostic Steps

### 1. Check Total Tags 🔍
```typescript
// In browser console:
console.log('Total tags:', tags.length);
console.log('User tags:', tags.filter(t => t.source === 'user').length);
console.log('OSM tags:', tags.filter(t => t.source === 'osm').length);
console.log('Model tags:', tags.filter(t => t.source === 'model').length);
```

**Expected:** See counts for each source  
**If all 0:** Backend/storage issue  
**If some 0:** Specific source not working

---

### 2. Open Debug Panel 🐛
1. Click **🐛 Debug** button (top-right)
2. View statistics
3. Check warning messages

**Expected:** Panel shows tag breakdown  
**If errors:** Check React component

---

### 3. Verify Source Toggles ✅
- **👤 User Tags** - Should be ON
- **🗺️ OSM Tags** - Should be ON
- **🤖 Model Tags** - Should be ON

**Expected:** All toggles enabled  
**If OFF:** Click to enable missing sources

---

### 4. Check Confidence Threshold 📊
- View slider value
- Default: 50%
- Recommended: 0% for debugging

**Expected:** Low threshold shows more tags  
**If high:** Lower to 0% to see all

---

### 5. Run Full Debug Check 🔬
```typescript
// In browser console:
import { runDebugCheck } from './lib/tagDebugger';
runDebugCheck(allTags, visibleTags);
```

**Expected:** Detailed console report  
**Look for:** Warnings and error messages

---

### 6. Inspect Individual Tags 🔎
```typescript
// Check first model tag:
const modelTags = tags.filter(t => t.source === 'model');
console.log('First model tag:', modelTags[0]);

// Verify required fields:
console.log('Has ID?', !!modelTags[0]?.id);
console.log('Has type?', !!modelTags[0]?.type);
console.log('Has coords?', !!modelTags[0]?.lat && !!modelTags[0]?.lon);
console.log('Has source?', !!modelTags[0]?.source);
```

**Expected:** All fields present and valid  
**If missing:** Fix tag creation code

---

### 7. Visual Check on Map 🗺️
Look for colored borders:
- 🟢 **Green border** = User tag
- 🔵 **Blue border** = OSM tag
- 🟡 **Yellow border** = Model tag

**Expected:** See all three colors  
**If missing colors:** Source not visible or doesn't exist

---

### 8. Network Check 🌐
Open DevTools → Network tab:
- Check for OSM API requests
- Check for backend API requests
- Look for 404/500 errors

**Expected:** Successful API calls  
**If errors:** Fix backend/API issues

---

## Common Problems & Fixes

### ❌ Problem: No model tags visible

**Quick Fix:**
1. Open debug panel
2. Enable "🤖 Show Model Tags"
3. Set confidence to 0%

**Root Cause Check:**
```typescript
// Are model tags being created?
const hasSources = tags.every(t => t.source);
console.log('All tags have source?', hasSources);

// Check model tag creation:
console.log('Model tags exist?', tags.some(t => t.source === 'model'));
```

**Solution:**
- Ensure model predictions save with `source: 'model'`
- Add confidence field: `confidence: 0.85`

---

### ❌ Problem: No OSM tags visible

**Quick Fix:**
1. Enable "🗺️ Show OSM Tags"
2. Check network tab for Overpass API calls

**Root Cause Check:**
```typescript
// Check OSM feature fetching:
console.log('OSM features:', osmFeatures.length);
console.log('First OSM feature:', osmFeatures[0]);
```

**Solution:**
- Verify OSM API integration working
- Check tags have `source: 'osm'`
- Verify network connectivity

---

### ❌ Problem: Tags exist but invisible

**Quick Fix:**
1. Click "Show All Tags" button
2. Check viewport (zoom out)
3. Check type filters

**Root Cause Check:**
```typescript
import { generateFilterReport } from './lib/tagDebugger';
const report = generateFilterReport(allTags, visibleTags);
console.log('Filtered out:', report.filteredOut);
console.log('Reasons:', report.reasons);
```

**Solution:**
- Adjust filters to show more tags
- Check if tags are off-screen
- Verify tag types match visible types

---

### ❌ Problem: Low confidence tags hidden

**Quick Fix:**
1. Set confidence slider to 0%
2. Check "Low Confidence" count

**Root Cause Check:**
```typescript
// Check confidence values:
const modelTags = tags.filter(t => t.source === 'model');
modelTags.forEach(t => {
  console.log(`${t.type}: ${(t.confidence || 0) * 100}%`);
});
```

**Solution:**
- Lower confidence threshold
- Improve model accuracy
- Validate confidence field exists

---

### ❌ Problem: Missing required fields

**Quick Fix:**
Run validation check:
```typescript
import { validateTagStructure } from './lib/tagDebugger';
tags.forEach(tag => {
  const result = validateTagStructure(tag);
  if (!result.valid) {
    console.error('Invalid tag:', tag.id, 'Missing:', result.missing);
  }
});
```

**Solution:**
- Add missing fields to tag objects
- Ensure proper tag creation
- Migrate legacy tags

---

## One-Line Debug Commands

```typescript
// Quick stats
import { logTagStats } from './lib/tagDebugger';
logTagStats(tags);

// Full debug
import { runDebugCheck } from './lib/tagDebugger';
runDebugCheck(tags, visibleTags);

// Check specific tag
import { logTagDetails } from './lib/tagDebugger';
logTagDetails(tags[0]);

// Show all tags (in UI)
// Click "Show All Tags" button in debug panel
```

---

## Decision Tree

```
START: Tags not visible
│
├─ Are ANY tags visible?
│  ├─ NO → Check backend/storage
│  │      └─ Run: console.log(tags.length)
│  │
│  └─ YES → Are MODEL tags visible?
│     ├─ NO → Check model tag source
│     │      └─ Enable "Show Model Tags"
│     │
│     └─ YES → Are OSM tags visible?
│        ├─ NO → Check OSM API
│        │      └─ Enable "Show OSM Tags"
│        │
│        └─ YES → Problem solved! ✅
│
END
```

---

## Keyboard Shortcuts (Recommended)

Add these to your dev environment:

```typescript
// Add to window for quick access:
window.debugTags = () => {
  import('./lib/tagDebugger').then(({ runDebugCheck }) => {
    runDebugCheck(allTags, visibleTags);
  });
};

window.showAllTags = () => {
  setShowUserTags(true);
  setShowOSMTags(true);
  setShowModelTags(true);
  setMinConfidence(0);
};

// Usage in console:
// debugTags()
// showAllTags()
```

---

## Health Check Script

```typescript
// Copy/paste into console for instant diagnosis:
(function tagHealthCheck() {
  console.log('🏥 TAG HEALTH CHECK');
  console.log('===================');
  
  const total = tags.length;
  const user = tags.filter(t => t.source === 'user').length;
  const osm = tags.filter(t => t.source === 'osm').length;
  const model = tags.filter(t => t.source === 'model').length;
  const visible = visibleTags.length;
  
  console.log(`Total: ${total}`);
  console.log(`👤 User: ${user} (${(user/total*100).toFixed(1)}%)`);
  console.log(`🗺️  OSM: ${osm} (${(osm/total*100).toFixed(1)}%)`);
  console.log(`🤖 Model: ${model} (${(model/total*100).toFixed(1)}%)`);
  console.log(`✅ Visible: ${visible}/${total}`);
  
  if (model === 0) console.warn('⚠️  No model tags!');
  if (osm === 0) console.warn('⚠️  No OSM tags!');
  if (visible === 0 && total > 0) console.error('❌ No tags visible!');
  if (visible === total) console.log('✅ All tags visible!');
  
  console.log('===================');
})();
```

---

## Quick Reference

| Feature | Location | Action |
|---------|----------|--------|
| Debug Panel | Top-right button | Click 🐛 |
| Source Toggle | Debug panel | Switch on/off |
| Confidence | Debug panel | Adjust slider |
| Full Debug | Debug panel | Click "Run Full Debug" |
| Show All | Debug panel | Click "Show All Tags" |
| Console Stats | Browser console | `logTagStats(tags)` |
| Console Debug | Browser console | `runDebugCheck(tags, visible)` |
| Inspect Tag | Browser console | `logTagDetails(tags[0])` |

---

**Print this checklist and keep handy while debugging!** 📋✅
