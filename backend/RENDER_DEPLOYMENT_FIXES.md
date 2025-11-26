# FastAPI + YOLOv5 Render Deployment Fixes

## Issues Found & Fixed

### ❌ **Issue 1: Missing NumPy Import (500 Error)**
**Problem:** Code used NumPy arrays implicitly via YOLOv5 but never imported numpy
**Symptom:** `'Numpy is not available'` error on Render
**Fix:** Added explicit `import numpy as np` at the top

```python
# ✓ FIXED
import numpy as np  # Required by torch/ultralytics
from ultralytics import YOLO
```

### ❌ **Issue 2: No Input Validation (422 Error)**
**Problem:** No validation for file type, size, or content before processing
**Symptom:** 422 errors for invalid files, memory errors for large files
**Fix:** Added comprehensive validation

```python
# ✓ FIXED - Validate file extension
allowed_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
file_ext = Path(filename).suffix.lower()
if file_ext not in allowed_extensions:
    raise HTTPException(status_code=422, detail=f"Invalid file type '{file_ext}'")

# ✓ FIXED - Validate file size (10MB limit)
MAX_FILE_SIZE = 10 * 1024 * 1024
contents = await file.read()
if len(contents) > MAX_FILE_SIZE:
    raise HTTPException(status_code=422, detail="File too large")
if len(contents) == 0:
    raise HTTPException(status_code=422, detail="Empty file")

# ✓ FIXED - Validate image can be opened
try:
    image = Image.open(io.BytesIO(contents)).convert("RGB")
except Exception as e:
    raise HTTPException(status_code=422, detail=f"Cannot open image: {str(e)}")
```

### ❌ **Issue 3: Model Path Not Found (500 Error)**
**Problem:** Hardcoded `YOLO('yolov5su.pt')` fails if file not in working directory
**Symptom:** `FileNotFoundError` on Render
**Fix:** Multiple fallback locations with detailed error messages

```python
# ✓ FIXED - Try multiple locations
MODEL_PATH = os.getenv("MODEL_PATH", "yolov5su.pt")
model_locations = [
    Path(MODEL_PATH),                      # Absolute or relative to CWD
    Path(__file__).parent / MODEL_PATH,    # Relative to backend/
    Path.cwd() / MODEL_PATH,               # Relative to working directory
    Path(__file__).parent / "yolov5su.pt", # Default name in backend/
]

model_file = None
for loc in model_locations:
    if loc.exists():
        model_file = loc
        break

if model_file is None:
    raise FileNotFoundError(f"Model file not found in any location")
```

### ❌ **Issue 4: CORS Not Configured for Render**
**Problem:** Only localhost origins allowed, blocking Render frontend
**Symptom:** CORS errors from deployed frontend
**Fix:** Added environment variable support with Render wildcard

```python
# ✓ FIXED
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8080,http://localhost:3000,https://*.onrender.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### ❌ **Issue 5: Poor Error Handling**
**Problem:** Generic exceptions, no structured error responses
**Symptom:** Unclear 500 errors, difficult debugging
**Fix:** HTTPException with detailed messages, structured logging

```python
# ✓ FIXED - Use HTTPException instead of JSONResponse for errors
try:
    results = model(image, conf=confidence)
except Exception as e:
    logger.error(f"Model inference failed: {e}", exc_info=True)
    raise HTTPException(
        status_code=500,
        detail=f"Model inference failed: {str(e)}. Check numpy/torch installation."
    )
```

### ❌ **Issue 6: Missing Torch Version Pin**
**Problem:** `requirements.txt` had `torch` without version
**Symptom:** Incompatible torch versions installed
**Fix:** Pinned to compatible version

```txt
# ✓ FIXED in requirements.txt
torch==2.1.0              # PyTorch (CPU version)
numpy>=1.24.0,<2.0.0      # NumPy (required by torch/ultralytics)
```

### ❌ **Issue 7: No Logging/Debugging Info**
**Problem:** Minimal logging, hard to debug on Render
**Fix:** Structured logging with timestamps and levels

```python
# ✓ FIXED
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Usage
logger.info(f"[DETECT] Processing: {filename}")
logger.info(f"[DETECT] Image loaded: {image.size}")
logger.info(f"[DETECT] Inference completed in {inference_time:.2f}s")
logger.error(f"Model inference failed: {e}", exc_info=True)
```

---

## Deployment Steps for Render

### 1. **Replace main.py**
```bash
cd backend
cp main_fixed.py main.py
```

### 2. **Update Environment Variables on Render**
In your Render dashboard, set:
```env
# Required
CORS_ORIGINS=https://your-frontend.onrender.com,http://localhost:3000

# Optional
MODEL_PATH=yolov5su.pt
CONFIDENCE_THRESHOLD=0.5
MAX_FILE_SIZE=10485760
```

### 3. **Ensure Model File is Deployed**
Make sure `yolov5su.pt` is:
- ✓ Committed to Git (17.7MB - within Render's limit)
- ✓ In the `backend/` directory
- ✓ Listed in `.gitattributes` if using LFS (optional)

```bash
# Verify model is tracked
git ls-files | grep yolov5su.pt
```

### 4. **Update requirements.txt**
Already fixed with pinned versions:
```txt
torch==2.1.0
numpy>=1.24.0,<2.0.0
ultralytics==8.0.200
```

### 5. **Test Locally First**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Test in another terminal
curl -X POST http://localhost:8000/detect \
  -F "file=@test_image.jpg"
```

### 6. **Deploy to Render**
```bash
git add backend/main.py backend/requirements.txt
git commit -m "Fix 422/500 errors: add numpy, validation, better error handling"
git push origin main
```

Render will automatically redeploy.

### 7. **Verify Deployment**
```bash
# Check health
curl https://your-app.onrender.com/health

# Expected response:
{
  "status": "ok",
  "stack": "full",
  "model_loaded": true,
  "tts_available": false,
  "timestamp": "2024-11-26 12:00:00"
}
```

---

## Common Render Issues & Solutions

### Issue: "Numpy is not available"
**Cause:** numpy not explicitly imported
**Solution:** ✓ Fixed - added `import numpy as np`

### Issue: "Model file not found"
**Cause:** Model not in Git or wrong path
**Solution:** 
```bash
# Ensure model is committed
ls -lh backend/yolov5su.pt
git add backend/yolov5su.pt
git commit -m "Add YOLOv5 model"
```

### Issue: 422 Error "Invalid file type"
**Cause:** Non-image file uploaded
**Solution:** ✓ Fixed - validation checks extension

### Issue: 422 Error "File too large"
**Cause:** File > 10MB
**Solution:** Compress image or increase `MAX_FILE_SIZE` env var

### Issue: CORS Error
**Cause:** Frontend domain not in CORS_ORIGINS
**Solution:** Add to Render env vars:
```
CORS_ORIGINS=https://your-frontend.onrender.com
```

### Issue: Slow Cold Starts
**Cause:** Free tier Render spins down after inactivity
**Solution:**
- Upgrade to paid tier, OR
- Use a keep-alive service (e.g., UptimeRobot pinging `/health`)

---

## Testing Checklist

- [ ] `/health` returns `"model_loaded": true`
- [ ] `/detect` accepts `.jpg` file and returns detections
- [ ] `/detect` rejects `.txt` file with 422
- [ ] `/detect` rejects 20MB file with 422
- [ ] `/detect` rejects corrupted image with 422
- [ ] Error messages are clear and actionable
- [ ] Logs show inference time and file details
- [ ] CORS allows your frontend domain

---

## Performance Optimization

### Use Smaller Model (Optional)
If 17.7MB `yolov5su.pt` is too large:
```python
# Use yolov5n (1.9MB) or yolov5s (7.2MB)
MODEL_PATH=yolov5s.pt
```

### Enable Model Caching
Render persists `/opt/render/project` directory:
```python
# In main.py, cache model to persistent storage
CACHE_DIR = Path("/opt/render/project/.cache")
CACHE_DIR.mkdir(exist_ok=True)
```

### Reduce Memory Usage
```python
# In detect endpoint, add garbage collection
import gc

# After inference
del image, results
gc.collect()
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `main.py` | Added numpy import, input validation, HTTPException, better logging, model path resolution, CORS env var |
| `requirements.txt` | Pinned torch==2.1.0, added numpy>=1.24.0 |
| Render Env Vars | Added CORS_ORIGINS, MAX_FILE_SIZE (optional) |

**Result:** 422 and 500 errors should be resolved. If issues persist, check Render logs for specific error messages.
