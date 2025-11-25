# 🚀 AccessAtlas Deployment Storage Audit

## Executive Summary

✅ **Model File**: `yolov5su.pt` found (17.7MB) - within limits  
⚠️ **OSM Data**: Using live APIs (Nominatim/Overpass) - fallback needed  
✅ **User Tags**: LocalStorage implementation working  
⚠️ **Deployment Issues**: Found 4 critical improvements needed

---

## 1. ML Model (YOLOv5 `.pt` file)

### Current Status
- **Location**: `backend/yolov5su.pt`
- **Size**: 17.7 MB (18,581,255 bytes)
- **Status**: ✅ Well below platform limits

### Platform Limits
| Platform | Limit | Status |
|----------|-------|--------|
| Render Free | 100 MB | ✅ Safe (17.7 MB) |
| Railway | 500 MB | ✅ Safe |
| Heroku | 500 MB | ✅ Safe |
| Vercel (frontend) | N/A | ✅ Not deployed to frontend |

### Current Implementation Issues
```python
# ❌ PROBLEM: Hard-coded relative path
model = YOLO('yolov5su.pt')
```

**Issues:**
1. No error handling for missing file
2. Hard-coded path breaks in different directories
3. No environment variable support
4. No fallback mechanism

### ✅ SOLUTION PROVIDED: `backend/config.py` + `backend/main_improved.py`

**New Features:**
- Environment variable support (`MODEL_PATH`)
- Multi-location path resolution (absolute, relative to backend/, relative to cwd)
- Comprehensive error messages
- Automatic fallback to mock mode if model missing
- File size warnings for platform limits

**Usage:**
```bash
# Development
MODEL_PATH=./yolov5su.pt uvicorn main_improved:app

# Production (Render)
MODEL_PATH=/opt/render/project/backend/yolov5su.pt uvicorn main_improved:app
```

---

## 2. OSM Data (OpenStreetMap APIs)

### Current Status
- **Nominatim API**: ✅ Live API working
- **Overpass API**: ✅ Live API working
- **Offline Mode**: ⚠️ Partial implementation
- **Fallback Data**: ❌ Missing bundled JSON

### Current Implementation
```typescript
// frontend/src/lib/osmApi.ts
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';
```

**Issues:**
1. No fallback data for offline/demo mode
2. No caching (repeated API calls)
3. No retry logic for failed requests
4. Rate limiting risk (Nominatim: 1 req/sec)

### ✅ SOLUTION PROVIDED: `frontend/src/lib/osmApi_improved.ts` + `frontend/public/data/osm_fallback.json`

**New Features:**
- 5-minute in-memory cache
- Automatic fallback to bundled JSON
- Offline mode detection
- Graceful error handling
- Cache statistics API

**Fallback Data Structure:**
```json
{
  "addresses": [...],
  "features": [...],
  "metadata": { "note": "Fallback data for offline mode" }
}
```

**Deployment Checklist:**
- [ ] Bundle `osm_fallback.json` in `/public/data/`
- [ ] Test offline mode: `localStorage.setItem('offline_mode_enabled', 'true')`
- [ ] Verify fallback data loads correctly
- [ ] Add real sample data from your area

---

## 3. User-Generated Tags

### Current Status
- **Storage**: ✅ LocalStorage (browser-based)
- **Validation**: ✅ Duplicate detection working
- **Persistence**: ⚠️ Per-device only (no cloud sync)

### Current Implementation
```typescript
// frontend/src/lib/tagStorage.ts
localStorage.setItem('accessibility_tags', JSON.stringify(tags));
```

**Strengths:**
- ✅ Works offline
- ✅ No backend required
- ✅ Validation and deduplication
- ✅ Type-safe TypeScript

**Limitations:**
- ❌ Data lost if user clears browser data
- ❌ No cross-device sync
- ❌ No backup/export functionality
- ❌ Limited storage (~5-10MB per domain)

### ✅ SOLUTION PROVIDED: `frontend/src/lib/tagStorage_improved.ts`

**New Features:**
- Enhanced error logging
- Clear success/failure messages
- CRUD operations (Create, Read, Update, Delete)
- Deduplication API
- Template for cloud integration (Firebase/Supabase)

**Cloud Integration Template (Optional):**
```typescript
// Uncomment in tagStorage_improved.ts for Firebase
export class CloudTagStorage implements TagStorageService {
  private db: Firestore;
  
  async saveTag(tag: Tag): Promise<SaveTagResult> {
    await addDoc(collection(this.db, 'tags'), tag);
    return { success: true, validation: { valid: true } };
  }
}
```

**Recommended for Production:**
- **Option 1**: Supabase (free tier, PostgreSQL backend)
- **Option 2**: Firebase Firestore (free tier, real-time sync)
- **Option 3**: Backend API endpoint (`POST /api/tags`)

---

## 4. Deployment Configuration

### Frontend (Vercel)

#### `.env` Variables
```bash
# frontend/.env.production
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_ENABLE_OFFLINE_MODE=true
VITE_CACHE_EXPIRY_MS=300000

# Optional: Cloud storage
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
```

#### Build Configuration
```json
{
  "build": {
    "command": "npm run build",
    "output": "dist"
  },
  "env": {
    "VITE_API_BASE_URL": "@api-url"
  }
}
```

#### File Bundling Checklist
- [ ] `public/data/osm_fallback.json` - OSM fallback data
- [ ] `public/robots.txt` - SEO configuration
- [ ] `public/favicon.ico` - App icon

---

### Backend (Render)

#### `.env` Variables
```bash
# backend/.env.production
HOST=0.0.0.0
PORT=8000
MODEL_PATH=/opt/render/project/src/backend/yolov5su.pt
MODEL_CONFIDENCE_THRESHOLD=0.5
MAX_UPLOAD_SIZE_MB=10

CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

ENABLE_TTS=false  # TTS doesn't work on Render (no audio devices)
ENABLE_VOICE_FEEDBACK=false
LOG_LEVEL=INFO

PLATFORM=render
```

#### `render.yaml` Configuration
```yaml
services:
  - type: web
    name: accessatlas-backend
    env: python
    region: oregon
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main_improved:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MODEL_PATH
        value: ./yolov5su.pt
      - key: ENABLE_TTS
        value: false
      - key: CORS_ORIGINS
        value: https://your-frontend.vercel.app
```

#### File Inclusion
- [ ] `yolov5su.pt` - Model file (17.7 MB)
- [ ] `requirements.txt` - Python dependencies
- [ ] `main_improved.py` - Improved backend code
- [ ] `config.py` - Configuration module
- [ ] `.env.example` - Environment template

---

## 5. Critical Warnings & Fixes

### ⚠️ Warning #1: TTS Won't Work on Render
**Problem**: `pyttsx3` requires system audio devices (unavailable on Render containers)

**Fix**: Set `ENABLE_TTS=false` in production environment
```bash
# backend/.env.production
ENABLE_TTS=false
```

---

### ⚠️ Warning #2: Model File Not in Git
**Problem**: `.gitignore` excludes `*.pt` files

**Current `.gitignore`:**
```gitignore
# Model files (too large for git)
*.pt
*.pth
*.onnx
*.weights
```

**Fix Options:**

**Option A: Include in Git (for files < 100MB)**
```bash
git add -f backend/yolov5su.pt
git commit -m "Add YOLOv5 model for deployment"
```

**Option B: Upload to Render Disk (for larger files)**
1. Create Render Disk: Dashboard → Disks → Create
2. Mount at `/data`
3. Upload `yolov5su.pt` to `/data/yolov5su.pt`
4. Set `MODEL_PATH=/data/yolov5su.pt`

**Option C: Download at Build Time**
```yaml
# render.yaml
buildCommand: |
  pip install -r requirements.txt
  wget -O yolov5su.pt https://your-storage-url.com/yolov5su.pt
```

---

### ⚠️ Warning #3: CORS Origins Must Match
**Problem**: Hard-coded CORS origins will block production requests

**Current Code:**
```python
allow_origins=["http://localhost:8080", "http://localhost:3000"]
```

**Fix**: Use environment variable
```python
# main_improved.py (already fixed)
allow_origins=config.CORS_ORIGINS
```

**Set in Render:**
```bash
CORS_ORIGINS=https://accessatlas.vercel.app,http://localhost:3000
```

---

### ⚠️ Warning #4: Rate Limiting on OSM APIs
**Problem**: Nominatim rate limit = 1 request/second

**Current Risk**: Multiple users → API blocking

**Fix**: Implemented in `osmApi_improved.ts`:
- 5-minute cache for repeated queries
- Automatic fallback to local data
- Rate limit detection and retry logic

---

## 6. Pre-Deployment Checklist

### Backend Deployment (Render)

- [ ] **Model File**
  - [ ] Verify `yolov5su.pt` exists in `backend/`
  - [ ] Confirm size < 100MB (current: 17.7MB ✅)
  - [ ] Test model loading: `python -c "from ultralytics import YOLO; YOLO('yolov5su.pt')"`

- [ ] **Environment Variables**
  - [ ] Set `MODEL_PATH` to deployment path
  - [ ] Set `CORS_ORIGINS` to Vercel URL
  - [ ] Set `ENABLE_TTS=false` (won't work on Render)
  - [ ] Set `LOG_LEVEL=INFO`

- [ ] **Configuration**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Update `requirements.txt` with exact versions
  - [ ] Test with `main_improved.py` (not `main.py`)

- [ ] **Testing**
  - [ ] Test health check: `curl http://localhost:8000/health`
  - [ ] Test config endpoint: `curl http://localhost:8000/config`
  - [ ] Test detection: `curl -X POST -F "file=@test.jpg" http://localhost:8000/detect`

### Frontend Deployment (Vercel)

- [ ] **OSM Data**
  - [ ] Create `public/data/` directory
  - [ ] Add `osm_fallback.json` with sample data
  - [ ] Test fallback: Set offline mode in Settings
  - [ ] Verify file loads: `fetch('/data/osm_fallback.json')`

- [ ] **Environment Variables**
  - [ ] Set `VITE_API_BASE_URL` to Render backend URL
  - [ ] Set `VITE_ENABLE_OFFLINE_MODE=true`
  - [ ] Optional: Add Firebase credentials for cloud storage

- [ ] **Build**
  - [ ] Test build: `npm run build`
  - [ ] Check bundle size: `ls -lh dist/`
  - [ ] Test preview: `npm run preview`

- [ ] **LocalStorage**
  - [ ] Test tag creation in production build
  - [ ] Verify tags persist after page reload
  - [ ] Test localStorage errors (private browsing mode)

### Integration Testing

- [ ] **End-to-End**
  - [ ] Frontend → Backend detection API
  - [ ] OSM API fetching with fallback
  - [ ] Tag storage and retrieval
  - [ ] Offline mode functionality

- [ ] **Error Scenarios**
  - [ ] Backend offline → graceful error
  - [ ] OSM API down → fallback data loads
  - [ ] LocalStorage disabled → warning shown
  - [ ] Model file missing → fallback mode activates

---

## 7. Code Migration Guide

### Replace Backend Files

```bash
# Backup original
cp backend/main.py backend/main_backup.py

# Use improved version
cp backend/main_improved.py backend/main.py

# Or keep both and update start command:
# uvicorn main_improved:app --host 0.0.0.0 --port 8000
```

### Replace Frontend Files

```bash
# Backup originals
cp frontend/src/lib/osmApi.ts frontend/src/lib/osmApi_backup.ts
cp frontend/src/lib/tagStorage.ts frontend/src/lib/tagStorage_backup.ts

# Use improved versions
cp frontend/src/lib/osmApi_improved.ts frontend/src/lib/osmApi.ts
cp frontend/src/lib/tagStorage_improved.ts frontend/src/lib/tagStorage.ts

# Update imports if needed (already compatible)
```

### Add Fallback Data

```bash
# Create directory
mkdir -p frontend/public/data

# Copy fallback file
cp frontend/public/data/osm_fallback.json frontend/public/data/

# Customize with your area's data (optional)
# Edit frontend/public/data/osm_fallback.json
```

---

## 8. Cloud Storage Integration (Optional)

### For Cross-Device Tag Sync

#### Option A: Firebase Firestore

```bash
# Install Firebase
npm install firebase

# Add to .env
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_PROJECT_ID=your-project
```

```typescript
// Uncomment cloud storage code in tagStorage_improved.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);
// Use CloudTagStorage class
```

#### Option B: Supabase

```bash
# Install Supabase
npm install @supabase/supabase-js

# Add to .env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Table schema:
// CREATE TABLE tags (
//   id UUID PRIMARY KEY,
//   type TEXT,
//   lat FLOAT,
//   lon FLOAT,
//   description TEXT,
//   timestamp TIMESTAMP
// );
```

#### Option C: Backend API

```python
# backend/main_improved.py - Add endpoints

@app.post("/api/tags")
async def save_tag(tag: dict):
    # Save to PostgreSQL/MongoDB
    return {"success": True, "id": tag["id"]}

@app.get("/api/tags")
async def get_tags():
    # Retrieve from database
    return {"tags": [...]}
```

---

## 9. Performance Optimization

### Caching Strategy

```typescript
// frontend/src/lib/cache.ts
const CACHE_CONFIG = {
  osmData: 5 * 60 * 1000,      // 5 minutes
  detections: 2 * 60 * 1000,    // 2 minutes
  tags: Infinity,                // Never expire (LocalStorage)
};
```

### Bundle Size Optimization

```bash
# Analyze bundle
npm run build -- --report

# Expected sizes:
# - Total: < 1.5 MB
# - Vendor chunks: < 800 KB
# - App code: < 400 KB
```

---

## 10. Monitoring & Debugging

### Health Check Endpoints

```bash
# Backend
curl https://your-backend.onrender.com/health
# Response: {"status": "ok", "model_loaded": true, "stack": "full"}

curl https://your-backend.onrender.com/config
# Response: {"model_path": "./yolov5su.pt", "validation": {...}}
```

### Frontend Debug Mode

```javascript
// Browser console
localStorage.setItem('debug', 'true');

// Check cache stats
import { getCacheStats } from './lib/osmApi';
console.log(getCacheStats());

// Check stored tags
const tags = JSON.parse(localStorage.getItem('accessibility_tags') || '[]');
console.log(`Stored ${tags.length} tags`);
```

---

## Summary of Improvements

| Component | Before | After | Impact |
|-----------|--------|-------|--------|
| **Model Loading** | Hard-coded path | Environment variable + fallback | ✅ Deployment-safe |
| **OSM APIs** | No fallback | Cached + bundled JSON | ✅ Offline-capable |
| **Tag Storage** | Basic LocalStorage | Enhanced + cloud template | ✅ Production-ready |
| **Error Handling** | Minimal | Comprehensive logging | ✅ Debuggable |
| **Configuration** | None | `.env` + `config.py` | ✅ Flexible |

---

## Next Steps

1. **Immediate** (Pre-Deployment):
   - [ ] Copy improved backend files
   - [ ] Add OSM fallback data
   - [ ] Test locally with improved code
   - [ ] Configure environment variables

2. **Deployment** (Day 1):
   - [ ] Deploy backend to Render
   - [ ] Deploy frontend to Vercel
   - [ ] Test integration end-to-end
   - [ ] Monitor error logs

3. **Post-Deployment** (Week 1):
   - [ ] Add cloud storage for tags (optional)
   - [ ] Implement export/import for tags
   - [ ] Add analytics/monitoring
   - [ ] Optimize bundle size

---

## Support Resources

- **YOLOv5 Deployment**: https://docs.ultralytics.com/yolov5/tutorials/running_on_google_cloud/
- **Render Python Docs**: https://render.com/docs/deploy-fastapi
- **Vercel React Deployment**: https://vercel.com/docs/frameworks/vite
- **OSM API Usage Policy**: https://operations.osmfoundation.org/policies/nominatim/

---

**Generated**: 2025-11-25  
**Version**: 2.0  
**Status**: Ready for Deployment ✅
