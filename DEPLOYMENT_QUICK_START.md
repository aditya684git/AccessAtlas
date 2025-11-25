# ⚡ Quick Deployment Guide - AccessAtlas

## 30-Second Setup

### Backend (Render)
```bash
# 1. Environment variables
MODEL_PATH=./yolov5su.pt
ENABLE_TTS=false
CORS_ORIGINS=https://your-app.vercel.app

# 2. Start command
uvicorn main_improved:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel)
```bash
# 1. Environment variables
VITE_API_BASE_URL=https://your-backend.onrender.com

# 2. Build settings
Build Command: npm run build
Output Directory: dist
```

---

## Essential Files Checklist

### ✅ Backend Must-Haves
- [ ] `yolov5su.pt` (17.7 MB) - in repo or uploaded
- [ ] `config.py` - NEW config module
- [ ] `main_improved.py` - NEW improved backend
- [ ] `.env` - environment variables

### ✅ Frontend Must-Haves
- [ ] `public/data/osm_fallback.json` - NEW fallback data
- [ ] Updated `osmApi.ts` or use `osmApi_improved.ts`
- [ ] Updated `tagStorage.ts` or use `tagStorage_improved.ts`

---

## 🚨 Critical Issues Fixed

| Issue | Before | After |
|-------|--------|-------|
| Model path | Hard-coded | Environment variable |
| OSM offline | ❌ Fails | ✅ Fallback data |
| CORS | Localhost only | Production URLs |
| TTS | Always on | Disabled for Render |
| Errors | Silent failures | Comprehensive logging |

---

## Test Commands

```bash
# Backend health
curl https://your-backend.onrender.com/health

# Frontend build
cd frontend && npm run build

# Model test
python -c "from ultralytics import YOLO; YOLO('./yolov5su.pt')"
```

---

## Common Errors & Fixes

### "Model file not found"
```bash
# Fix: Set MODEL_PATH environment variable
MODEL_PATH=/opt/render/project/src/backend/yolov5su.pt
```

### "CORS error"
```bash
# Fix: Add frontend URL to CORS_ORIGINS
CORS_ORIGINS=https://accessatlas.vercel.app
```

### "OSM API timeout"
```bash
# Fix: Enable offline mode or check fallback data exists
# File: frontend/public/data/osm_fallback.json
```

---

## File Locations

```
AccessAtlas/
├── backend/
│   ├── yolov5su.pt         # 17.7 MB model
│   ├── main_improved.py    # NEW: Use this
│   ├── config.py           # NEW: Config module
│   ├── .env.example        # NEW: Template
│   └── requirements.txt
│
└── frontend/
    ├── public/
    │   └── data/
    │       └── osm_fallback.json  # NEW: Fallback data
    └── src/
        └── lib/
            ├── osmApi_improved.ts      # NEW: Use this
            └── tagStorage_improved.ts  # NEW: Use this
```

---

**Full details**: See `DEPLOYMENT_STORAGE_AUDIT.md`
