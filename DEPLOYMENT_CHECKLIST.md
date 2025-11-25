# 📋 AccessAtlas Storage & Deployment Checklist

## ✅ Validation Status

**Last Validated**: 2025-11-25  
**Status**: All checks passed ✅

---

## 1️⃣ OSM Data (OpenStreetMap APIs)

### Current Implementation
- [x] Live Nominatim API calls working
- [x] Live Overpass API calls working
- [x] Offline mode detection implemented
- [x] 5-minute in-memory cache
- [x] Fallback JSON bundled in `/public/data/`

### Files
- ✅ `frontend/src/lib/osmApi_improved.ts` - Enhanced API with caching & fallback
- ✅ `frontend/public/data/osm_fallback.json` - Demo data for offline mode

### Deployment Checklist
- [ ] Update `VITE_API_BASE_URL` in Vercel environment
- [ ] Test offline mode: `localStorage.setItem('offline_mode_enabled', 'true')`
- [ ] Verify fallback data loads when APIs unavailable
- [ ] Optional: Replace demo data with real area data

### Testing
```bash
# Enable offline mode
localStorage.setItem('offline_mode_enabled', 'true');

# Test fallback loading
fetch('/data/osm_fallback.json').then(r => r.json()).then(console.log);

# Disable offline mode
localStorage.setItem('offline_mode_enabled', 'false');
```

---

## 2️⃣ ML Model (YOLOv5 `.pt` file)

### Current Status
- [x] Model file: `backend/yolov5su.pt`
- [x] Size: 17.7 MB (safe for all platforms)
- [x] Deployment-safe path resolution
- [x] Environment variable support
- [x] Automatic fallback to mock mode

### Files
- ✅ `backend/yolov5su.pt` - YOLOv5 Small-U model (17.7 MB)
- ✅ `backend/config.py` - Configuration with path resolution
- ✅ `backend/main_improved.py` - Enhanced backend with error handling
- ✅ `backend/.env.example` - Environment template

### Platform Compatibility
| Platform | Limit | Status |
|----------|-------|--------|
| Render Free | 100 MB | ✅ Safe (17.7 MB) |
| Railway | 500 MB | ✅ Safe |
| Heroku | 500 MB | ✅ Safe |
| AWS/GCP | No limit | ✅ Safe |

### Deployment Checklist
- [ ] Verify model file committed to git (added exception in `.gitignore`)
- [ ] Set `MODEL_PATH` environment variable in Render
- [ ] Set `ENABLE_TTS=false` (TTS won't work on Render)
- [ ] Set `CORS_ORIGINS` to include Vercel frontend URL
- [ ] Test health endpoint: `GET /health`
- [ ] Test config endpoint: `GET /config`

### Environment Variables (Render)
```bash
MODEL_PATH=./yolov5su.pt
MODEL_CONFIDENCE_THRESHOLD=0.5
MAX_UPLOAD_SIZE_MB=10
ENABLE_TTS=false
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
PLATFORM=render
LOG_LEVEL=INFO
```

### Testing
```bash
# Local test
cd backend
python -c "from config import config; print(config.get_model_path())"

# Health check
curl http://localhost:8000/health

# Detection test
curl -X POST -F "file=@test.jpg" http://localhost:8000/detect
```

---

## 3️⃣ User-Generated Tags

### Current Implementation
- [x] LocalStorage-based persistence
- [x] Duplicate detection (2-meter threshold)
- [x] CRUD operations (Create, Read, Update, Delete)
- [x] Validation with error messages
- [x] Cloud storage template (Firebase/Supabase)

### Files
- ✅ `frontend/src/lib/tagStorage_improved.ts` - Enhanced storage service
- ✅ `frontend/src/lib/tagValidation.ts` - Tag validation logic

### Storage Strategy
**Primary**: LocalStorage (browser-based, per-device)
- ✅ Works offline
- ✅ No backend required
- ✅ 5-10MB storage limit per domain
- ❌ Data lost if browser cleared
- ❌ No cross-device sync

**Optional**: Cloud backup (Firebase/Supabase)
- Template provided in `tagStorage_improved.ts`
- Requires additional setup

### Deployment Checklist
- [ ] Test tag creation in production build
- [ ] Verify tags persist after page reload
- [ ] Test localStorage errors (private browsing mode)
- [ ] Optional: Set up Firebase/Supabase for cloud sync
- [ ] Optional: Implement export/import functionality

### Cloud Integration (Optional)

#### Firebase Setup
```bash
npm install firebase

# .env
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_PROJECT_ID=your-project-id
```

#### Supabase Setup
```bash
npm install @supabase/supabase-js

# .env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

### Testing
```javascript
// Check stored tags
const tags = JSON.parse(localStorage.getItem('accessibility_tags') || '[]');
console.log(`Stored ${tags.length} tags`);

// Test tag creation
// Use app UI to create tag, then reload page to verify persistence
```

---

## 4️⃣ Deployment Configuration

### Backend (Render)

#### Environment Variables
```bash
# Server
HOST=0.0.0.0
PORT=8000

# Model
MODEL_PATH=./yolov5su.pt
MODEL_CONFIDENCE_THRESHOLD=0.5
MAX_UPLOAD_SIZE_MB=10

# CORS
CORS_ORIGINS=https://accessatlas.vercel.app,http://localhost:3000

# Features
ENABLE_TTS=false  # Doesn't work on Render
ENABLE_VOICE_FEEDBACK=false
LOG_LEVEL=INFO

# Platform
PLATFORM=render
```

#### Start Command
```bash
uvicorn main_improved:app --host 0.0.0.0 --port $PORT
```

#### Build Command
```bash
pip install -r requirements.txt
```

#### Checklist
- [ ] Create Render Web Service
- [ ] Set environment variables
- [ ] Configure build & start commands
- [ ] Add `yolov5su.pt` to repo (or upload to Render Disk)
- [ ] Test deployment: Check `/health` endpoint
- [ ] Monitor logs for errors

---

### Frontend (Vercel)

#### Environment Variables
```bash
# API
VITE_API_BASE_URL=https://your-backend.onrender.com

# Features
VITE_ENABLE_OFFLINE_MODE=true
VITE_CACHE_EXPIRY_MS=300000

# Optional: Cloud storage
# VITE_FIREBASE_API_KEY=your-key
# VITE_FIREBASE_PROJECT_ID=your-project
```

#### Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

#### Checklist
- [ ] Create Vercel project
- [ ] Set environment variables
- [ ] Configure build settings
- [ ] Verify `/data/osm_fallback.json` bundled in build
- [ ] Test deployment: Check homepage loads
- [ ] Test API integration: Upload image for detection

---

## 5️⃣ Integration Testing

### End-to-End Tests

#### 1. Image Detection Flow
- [ ] Upload image via frontend
- [ ] Backend processes with YOLOv5
- [ ] Detections returned to frontend
- [ ] Results displayed correctly
- [ ] Voice feedback works (if enabled)

#### 2. OSM Data Flow
- [ ] Fetch nearby features (online mode)
- [ ] Enable offline mode
- [ ] Verify fallback data loads
- [ ] Disable offline mode
- [ ] Verify cache persists (5 minutes)

#### 3. Tag Storage Flow
- [ ] Create accessibility tag
- [ ] Reload page
- [ ] Verify tag persists
- [ ] Update tag
- [ ] Delete tag
- [ ] Test duplicate detection

#### 4. Error Scenarios
- [ ] Backend offline → graceful error message
- [ ] OSM API down → fallback data loads
- [ ] LocalStorage disabled → warning shown
- [ ] Model file missing → fallback mode activates
- [ ] Large file upload → size limit error

---

## 6️⃣ File Manifest

### ✅ New Files Created

#### Backend
```
backend/
├── config.py                 # NEW: Configuration module
├── main_improved.py          # NEW: Enhanced backend
├── .env.example              # NEW: Environment template
└── yolov5su.pt               # EXISTING: Model file (17.7 MB)
```

#### Frontend
```
frontend/
├── public/
│   └── data/
│       └── osm_fallback.json       # NEW: Fallback OSM data
└── src/
    └── lib/
        ├── osmApi_improved.ts      # NEW: Enhanced OSM API
        └── tagStorage_improved.ts  # NEW: Enhanced storage
```

#### Root
```
AccessAtlas/
├── DEPLOYMENT_STORAGE_AUDIT.md     # NEW: Full audit report
├── DEPLOYMENT_QUICK_START.md       # NEW: Quick reference
├── DEPLOYMENT_CHECKLIST.md         # NEW: This file
└── validate_deployment.py          # NEW: Validation script
```

### 📝 Modified Files

```
.gitignore                  # Updated: Allow yolov5su.pt
```

---

## 7️⃣ Pre-Deployment Validation

### Run Validation Script
```bash
python validate_deployment.py
```

**Expected Output**:
```
✅ All checks passed! Ready for deployment.
```

### Manual Checks

#### Backend
```bash
# Test model loading
python -c "from ultralytics import YOLO; m = YOLO('./backend/yolov5su.pt'); print('✅ Model loaded')"

# Test config
python -c "from backend.config import config; print(config.validate())"

# Test server
cd backend && uvicorn main_improved:app --reload
curl http://localhost:8000/health
```

#### Frontend
```bash
# Build test
cd frontend && npm run build

# Check bundle size
ls -lh frontend/dist/

# Preview build
npm run preview
```

---

## 8️⃣ Post-Deployment Monitoring

### Health Checks

#### Backend
```bash
# Health endpoint
curl https://your-backend.onrender.com/health

# Expected response:
{
  "status": "ok",
  "stack": "full",
  "model_loaded": true,
  "tts_enabled": false,
  "timestamp": "2025-11-25 12:00:00"
}

# Config endpoint
curl https://your-backend.onrender.com/config
```

#### Frontend
```javascript
// Browser console
fetch('/data/osm_fallback.json').then(r => r.json()).then(console.log);

// Check LocalStorage
console.log(localStorage.getItem('accessibility_tags'));
```

### Error Monitoring

#### Backend Logs (Render)
- Check for `❌ Model file not found`
- Check for `CORS error`
- Check for `404 Not Found` on endpoints

#### Frontend Logs (Browser)
- Check for `Failed to load fallback data`
- Check for `localStorage not available`
- Check for API connection errors

---

## 9️⃣ Rollback Plan

### If Deployment Fails

#### Backend
```bash
# Revert to old main.py
git checkout HEAD~1 backend/main.py

# Or use original file
mv backend/main_backup.py backend/main.py
```

#### Frontend
```bash
# Revert improved files
git checkout HEAD~1 frontend/src/lib/osmApi.ts
git checkout HEAD~1 frontend/src/lib/tagStorage.ts
```

### Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| Model not found | Set `MODEL_PATH=/opt/render/project/src/backend/yolov5su.pt` |
| CORS error | Add frontend URL to `CORS_ORIGINS` |
| TTS error | Set `ENABLE_TTS=false` |
| OSM fallback fails | Check `/public/data/osm_fallback.json` exists |

---

## 🔟 Success Criteria

### ✅ Backend Deployed Successfully
- [ ] Health endpoint returns `{"status": "ok"}`
- [ ] Model loaded: `"model_loaded": true`
- [ ] Detection endpoint works: Upload test image
- [ ] CORS configured: Frontend can call API
- [ ] Logs show no errors

### ✅ Frontend Deployed Successfully
- [ ] Homepage loads without errors
- [ ] API integration works (image upload)
- [ ] OSM fallback data accessible
- [ ] Tags persist in LocalStorage
- [ ] Offline mode toggles correctly

### ✅ Integration Tests Pass
- [ ] Upload image → get detections
- [ ] Fetch OSM features → display on map
- [ ] Create tag → persists after reload
- [ ] Enable offline → fallback data loads
- [ ] All error scenarios handled gracefully

---

## 📚 Documentation Links

- **Full Audit**: `DEPLOYMENT_STORAGE_AUDIT.md` (10,000+ words)
- **Quick Start**: `DEPLOYMENT_QUICK_START.md` (< 1 page)
- **This Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Validation Script**: `validate_deployment.py`

---

## 🆘 Support

### Common Issues

1. **"Model file not found"**
   - Solution: Check `MODEL_PATH` environment variable
   - Verify file exists: `ls -lh backend/yolov5su.pt`

2. **"CORS blocked"**
   - Solution: Add frontend URL to `CORS_ORIGINS`
   - Format: `https://app.vercel.app,http://localhost:3000`

3. **"OSM API timeout"**
   - Solution: Enable offline mode or check fallback data
   - File: `frontend/public/data/osm_fallback.json`

4. **"localStorage not available"**
   - Solution: User in private browsing mode
   - Show warning: "Enable cookies for data persistence"

### Debugging Commands

```bash
# Backend health
curl https://your-backend.onrender.com/health | jq

# Frontend build
cd frontend && npm run build -- --report

# Model test
python -c "from ultralytics import YOLO; YOLO('./backend/yolov5su.pt')"

# Validation
python validate_deployment.py
```

---

**Last Updated**: 2025-11-25  
**Version**: 2.0  
**Status**: ✅ Ready for Production Deployment
