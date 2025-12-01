# Deployment Configuration

## Frontend (Vercel)

### Environment Variables
Set these in Vercel Dashboard → Project → Settings → Environment Variables:

- **VITE_API_URL**: `https://accessatlas.onrender.com`

### Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Deployed URL
https://access-atlas.vercel.app/

---

## Backend (Render)

### Environment Variables
Set these in Render Dashboard → Service → Environment:

- **CORS_ORIGINS**: `https://access-atlas.vercel.app` (optional, defaults to allowing all with ALLOW_VERCEL_ORIGINS)
- **ALLOW_VERCEL_ORIGINS**: `true` (allows all origins including Vercel preview deployments)
- **PYTHON_VERSION**: `3.13.0`

### Build Settings
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Deployed URL
https://accessatlas.onrender.com

---

## Local Development

### Frontend
```bash
cd frontend
# Create .env file with:
# VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## How It Works

1. **Frontend**: Reads `VITE_API_URL` from environment variables
   - Local: `http://localhost:8000` (from `.env` file)
   - Vercel: `https://accessatlas.onrender.com` (from Vercel env vars)

2. **Backend**: CORS middleware allows requests from:
   - Local development ports (8080, 3000, 8081)
   - Vercel production: `https://access-atlas.vercel.app`
   - All origins when `ALLOW_VERCEL_ORIGINS=true` (includes preview deployments)

3. **File Uploads**: The `/detect` endpoint accepts multipart/form-data uploads and works with both local and deployed frontends.
