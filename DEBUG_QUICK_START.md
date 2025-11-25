# Tag Debugging - Quick Start Guide

## Problem
**"I only see my manually-added tags. Where are the model predictions and OSM features?"**

## Solution in 30 Seconds

### Step 1: Open Debug Panel
Click the **🐛 Debug** button in the top-right corner of the map.

### Step 2: Check the Counts
Look at the statistics:
```
👤 User: 15
🗺️  OSM: 0    ← Problem! Should have OSM tags
🤖 Model: 0   ← Problem! Should have model tags
```

### Step 3: Enable Missing Sources
If counts are > 0 but tags aren't visible:
- Turn ON **"👤 Show User Tags"**
- Turn ON **"🗺️ Show OSM Tags"**
- Turn ON **"🤖 Show Model Tags"**

### Step 4: Lower Confidence
Drag the **"Min Confidence"** slider to **0%**

### Step 5: Click "Show All Tags"
This enables everything instantly!

---

## Visual Guide

### What You'll See on the Map:

**User Tags** (Green Border):
```
  🟢
┌──────┐
│  ♿   │  ← Green border, no badge
└──────┘
```

**OSM Tags** (Blue Border):
```
  🔵
┌──────┐
│  🛗   │  ← Blue border, no badge
└──────┘
```

**Model Tags** (Yellow Border + Confidence):
```
  🟡
┌──────┐
│  🦯   │  ← Yellow border
│  85% │  ← Confidence badge
└──────┘
```

---

## Common Scenarios

### Scenario 1: Only User Tags Visible ✅

**Diagnosis:**
```typescript
// In console:
console.log('Model tags:', tags.filter(t => t.source === 'model').length);
console.log('OSM tags:', tags.filter(t => t.source === 'osm').length);
```

**If both return 0:**
- Model not generating predictions
- OSM API not being called

**If both return > 0:**
- Tags are filtered out
- Use debug panel to enable them

---

### Scenario 2: Model Tags at 0 📉

**Check if model is saving predictions:**
```typescript
// Look at a model prediction when it's created:
console.log('New prediction:', {
  type: 'Ramp',
  lat: 34.67,
  lon: -82.48,
  source: 'model',        // ← Must be 'model'
  confidence: 0.85,       // ← Should have confidence
});
```

**Fix:**
Ensure model predictions include:
- `source: 'model'`
- `confidence: number` (0-1)

---

### Scenario 3: OSM Tags at 0 🗺️

**Check if OSM features are being fetched:**

1. Open DevTools → Network tab
2. Look for requests to:
   - `overpass-api.de`
   - `nominatim.openstreetmap.org`

**If no requests:**
- OSM fetching not implemented
- Check `fetchAccessibilityFeatures()` function

**If requests fail:**
- API rate limit exceeded
- Network connection issue
- Invalid coordinates

---

### Scenario 4: Tags Exist but Filtered 🚫

**Debug Panel shows:**
```
Total Tags: 42
Visible: 10
Filtered Out: 32  ← Problem!
```

**Check "Filtered Tags" section:**
- Low Confidence: 15 → Lower threshold
- Source Filtered: 10 → Enable source toggles
- Type Filtered: 7 → Enable tag types

**Fix:** Adjust filters to show more tags

---

## Console Commands

### Must-Know Commands:

```typescript
// 1. Quick health check
import { logTagStats } from './lib/tagDebugger';
logTagStats(tags);

// 2. Full diagnostic
import { runDebugCheck } from './lib/tagDebugger';
runDebugCheck(tags, visibleTags);

// 3. Inspect specific tag
import { logTagDetails } from './lib/tagDebugger';
logTagDetails(tags[0]);
```

### Copy-Paste Health Check:

```typescript
// Paste into console for instant diagnosis:
const stats = {
  total: tags.length,
  user: tags.filter(t => t.source === 'user').length,
  osm: tags.filter(t => t.source === 'osm').length,
  model: tags.filter(t => t.source === 'model').length,
  visible: visibleTags.length
};
console.table(stats);
```

---

## Decision Flow

```
Q: Can you see ANY tags on the map?
├─ NO  → Backend/storage issue
│       → Check: console.log(tags)
│
└─ YES → Are there different colored borders?
   ├─ Only Green → Missing OSM & Model
   │              → Enable in debug panel
   │
   ├─ Green + Blue → Missing Model only
   │                → Check model source field
   │
   └─ All Colors → Everything working! ✅
```

---

## 5-Minute Full Diagnostic

### Minute 1: Open Debug Panel
- Click 🐛 button
- Review statistics

### Minute 2: Check Console
```typescript
runDebugCheck(tags, visibleTags);
```

### Minute 3: Enable All Sources
- Turn on all three toggles
- Set confidence to 0%

### Minute 4: Inspect Tags
```typescript
// Check each source has valid tags:
console.log('User tag:', tags.find(t => t.source === 'user'));
console.log('OSM tag:', tags.find(t => t.source === 'osm'));
console.log('Model tag:', tags.find(t => t.source === 'model'));
```

### Minute 5: Fix Root Cause
Based on findings:
- No model tags? → Fix model saving
- No OSM tags? → Fix OSM fetching
- Tags hidden? → Adjust filters

---

## Warning Signs

### 🚨 Critical Issues

**"No tags found in the system!"**
→ Backend not returning data
→ Storage not loading
→ Check API endpoints

**"Tags exist but none are visible!"**
→ All tags filtered out
→ Click "Show All Tags"
→ Check viewport zoom level

**"No model-generated tags found!"**
→ Model not saving predictions
→ Missing `source: 'model'` field
→ Check model integration

**"No OSM tags found!"**
→ OSM API not being called
→ Overpass integration missing
→ Check network requests

---

## Success Criteria

✅ **Everything Working When:**
- Debug panel shows tags for all 3 sources
- Map shows green, blue, AND yellow borders
- Can toggle each source on/off
- Confidence slider affects model tags only
- "Run Full Debug" shows no warnings

---

## Next Steps

### If Still Not Working:

1. **Read Full Guide:**
   - See `TAG_DEBUG_SYSTEM.md`

2. **Check Integration:**
   - Verify model saves with `source: 'model'`
   - Verify OSM saves with `source: 'osm'`

3. **Run Full Debug:**
   ```typescript
   runDebugCheck(tags, visibleTags);
   ```

4. **Check Detailed Checklist:**
   - See `DEBUG_CHECKLIST.md`

---

## Most Common Fix

**90% of issues solved by:**

1. Open debug panel
2. Click **"Show All Tags"**
3. Look at tag counts
4. Enable missing source toggles

**That's it!** 🎉

---

## Key Takeaways

✅ **Debug panel is your friend** - Shows exactly what's wrong  
✅ **Source field is critical** - Must be 'user', 'osm', or 'model'  
✅ **Visual indicators help** - Colors show tag sources instantly  
✅ **Console is powerful** - Use `runDebugCheck()` for details  
✅ **"Show All Tags" is magic** - Reveals everything instantly  

---

**Questions? Run `runDebugCheck()` in console for detailed analysis!**
