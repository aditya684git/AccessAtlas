# Navigation Enhancement Testing Guide

## 🎯 Quick Start

### 1. Start the Development Server
```bash
cd frontend
npm run dev
```

### 2. Navigate to Tagging Page
- Open browser to `http://localhost:5173`
- Go to Tagging page (from home or directly to `/tagging`)

### 3. Test Basic Navigation

#### **Option A: Click Navigation**
1. Click any accessibility tag marker on the map (wheelchair, elevator, etc.)
2. Green "Navigate" button appears at bottom
3. Click "Navigate"
4. Should redirect to Navigation Screen

#### **Option B: Voice Navigation**
1. Click blue "Voice" button (microphone icon)
2. Say "navigate to elevator" (or ramp/entrance/tactile path)
3. Should automatically navigate to nearest matching tag

## 🧪 Feature Tests

### ✅ Test 1: Route Calculation
**Expected Behavior:**
- Map shows blue route line from user location to destination
- Status card shows:
  - Destination type and address
  - Distance (meters/kilometers)
  - Estimated time (minutes)
- Voice announces: "Route calculated. Total distance: X meters. [First instruction]"

**What to Check:**
- [ ] Route appears on map (blue line)
- [ ] Distance/time displayed correctly
- [ ] First instruction spoken automatically

### ✅ Test 2: Turn-by-Turn Instructions
**Expected Behavior:**
- Status card has "Turn-by-Turn Directions" section
- Shows numbered list of instructions
- Each instruction has:
  - Text description (e.g., "Turn left on Main Street")
  - Distance (e.g., "in 100m")
  - Volume icon

**What to Check:**
- [ ] Instructions list appears
- [ ] Each instruction readable and accurate
- [ ] Tap instruction → hears it spoken
- [ ] Instructions scroll if many steps

### ✅ Test 3: Obstacle Detection
**Expected Behavior:**
- If obstacles (stairs, construction) near route:
  - Red warning box appears in status card
  - Shows "X Obstacles Detected"
  - Lists obstacle types
  - ⚠️ markers appear on map
  - Voice announces: "Warning: X obstacles detected along the route"
- If no obstacles:
  - Voice announces: "Path is clear. No obstacles detected"

**What to Check:**
- [ ] Obstacle count accurate
- [ ] Warning markers (⚠️) on map
- [ ] Click marker → shows obstacle type in popup
- [ ] Voice announcement plays

### ✅ Test 4: Voice Announcements
**Expected Behavior:**
- Route start: Announces distance and first instruction
- Obstacle warning: Announces count or "path is clear"
- Cancel navigation: Announces "Navigation cancelled"
- Tap instruction: Speaks that instruction

**What to Check:**
- [ ] All announcements clear and audible
- [ ] Current instruction shows in blue box
- [ ] Volume icon visible on current instruction
- [ ] No overlapping speech (cancels previous)

### ✅ Test 5: Cancel Navigation
**Test 5a: Click Cancel Button**
- [ ] Click red "Cancel" button
- [ ] Hears "Navigation cancelled. Returning to tagging."
- [ ] Returns to Tagging screen
- [ ] Map state preserved (tags still visible)

**Test 5b: Click Back Button**
- [ ] Click "Back" button (outline style)
- [ ] Hears "Navigation cancelled"
- [ ] Returns to Tagging screen

**Test 5c: Voice Cancel**
- [ ] Say "cancel navigation"
- [ ] Hears confirmation
- [ ] Returns to Tagging screen

## 🔍 Edge Cases to Test

### No Obstacles Scenario
1. Navigate to tag with no nearby obstacles
2. Should hear "Path is clear"
3. No red warning box appears

### Many Obstacles Scenario
1. Navigate to tag near multiple obstacles
2. Red box shows obstacle count
3. Shows first 3 obstacles, then "and X more..."
4. All obstacles marked on map

### Routing Error Scenario
1. If OSRM service unavailable (offline test):
   - Should show toast "Could not calculate route"
   - Falls back to dashed straight line
   - Still shows distance calculation
   - Obstacle detection still works

### No User Location
1. If browser doesn't provide location:
   - Uses default location (34.67, -82.48)
   - Route still calculates from default point
   - All features work normally

## 📱 Mobile Testing

### Touch Interactions
- [ ] Tap tag marker → selects tag
- [ ] Tap Navigate button → starts navigation
- [ ] Tap instruction → speaks instruction
- [ ] Tap Cancel/Back → returns to tagging
- [ ] Pinch/zoom map → works smoothly
- [ ] Drag map → pans correctly

### Voice Button
- [ ] Tap Voice button → opens voice panel
- [ ] Say "navigate to elevator" → works
- [ ] Say "cancel navigation" → works
- [ ] Voice panel closes after command

### Screen Rotation
- [ ] Rotate device → UI adapts
- [ ] Map resizes correctly
- [ ] Status card remains readable
- [ ] Navigation state preserved

## 🎨 Visual Testing

### UI Elements
- [ ] Status card has white background, shadow
- [ ] Destination icon visible (♿, 🛗, etc.)
- [ ] Route line is blue, clear on map
- [ ] Obstacle markers (⚠️) stand out
- [ ] Current instruction has blue background
- [ ] Buttons have correct colors (blue outline, red destructive)

### Accessibility
- [ ] Text size readable on mobile (14px minimum)
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Touch targets large enough (44x44px)
- [ ] Icons have descriptive labels
- [ ] Focus states visible on keyboard navigation

## 🎤 Voice Command Testing

### Navigation Commands
```
✅ "navigate to elevator"
✅ "navigate to ramp"
✅ "navigate to entrance"
✅ "navigate to tactile path"
✅ "cancel navigation"
✅ "stop navigation"
✅ "end navigation"
```

### Expected Behavior
- [ ] Command recognized within 1-2 seconds
- [ ] Visual feedback shows command heard
- [ ] Action executes correctly
- [ ] Voice confirms action

## 🐛 Known Issues & Workarounds

### Issue: Route takes time to appear
**Cause**: OSRM server calculates route
**Workaround**: Status shows "Initializing navigation..." until route ready
**Expected**: 500-1000ms delay normal

### Issue: Microphone permission denied
**Cause**: Browser security settings
**Workaround**: Click voice button again, allow microphone in browser settings
**Expected**: Prompt appears on first use

### Issue: Voice not speaking
**Cause**: Browser tab not focused, volume muted
**Workaround**: Ensure tab focused, volume up, TTS enabled in system settings
**Expected**: Check browser console for TTS errors

## 📊 Performance Benchmarks

**Good Performance:**
- Route calculation: < 1 second
- Obstacle detection: < 100ms
- Map render: < 200ms
- TTS response: < 300ms
- Total navigation start: < 2 seconds

**If Slower:**
- Check network connection (OSRM service online?)
- Check tag count in localStorage (too many tags slow obstacle detection)
- Check browser performance (close other tabs)

## ✅ Success Criteria

Navigation enhancement is successful if:
1. ✅ Route appears on map with blue line
2. ✅ Turn-by-turn instructions displayed and speakable
3. ✅ Obstacles detected and marked on map
4. ✅ Voice announces route summary and obstacles
5. ✅ All buttons/commands work correctly
6. ✅ UI responsive and accessible
7. ✅ No console errors
8. ✅ Graceful error handling

## 🎉 Test Complete!

If all tests pass, the navigation enhancement is ready for use. Users can now:
- Get real turn-by-turn walking directions
- See obstacles along their route
- Hear voice announcements for all navigation events
- Use voice commands for hands-free navigation

---

**Test Environment:**
- Browser: Chrome/Firefox/Safari (latest)
- Device: Desktop, Mobile, Tablet
- Network: Online (for OSRM routing)
- Microphone: Required for voice commands

**Test Duration:** ~10-15 minutes for full suite
