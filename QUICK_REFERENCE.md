# AccessAtlas Developer Quick Reference

## 🚀 Quick Start (5 minutes)

### Terminal 1: Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
```

**Result**: Backend at `http://localhost:8000`, Frontend at `http://localhost:8080`

---

## 📋 Common Tasks

### Add a New Detection Feature
1. Create hook in `src/hooks/useNewFeature.ts`
2. Use hook in component: `const { state, action } = useNewFeature()`
3. Call API from hook using `apiClient` in `src/lib/api.ts`

### Add a New Endpoint
1. Create async function in `backend/main.py`
2. Decorate with `@app.get()` or `@app.post()`
3. Return `JSONResponse` with consistent format
4. Create API wrapper in `src/lib/api.ts`
5. Add types in `src/lib/api.ts` interfaces

### Test an Endpoint
```bash
# Detection
curl -X POST -F "file=@image.jpg" http://localhost:8000/detect

# Voice
curl -X POST "http://localhost:8000/voice?text=Hello"

# Health
curl http://localhost:8000/health
```

---

## 🐛 Debugging

### Frontend Console Logs
```typescript
// All API calls log with prefix
[Detection] 3 objects detected
[Voice] Spoke: "I see a person"
[Detection Error] Invalid file type
```

### Backend Logs
```
INFO:root:Loading YOLOv5 model...
INFO:root:Detection request received: photo.jpg
INFO:root:Detection complete: 2 objects found
ERROR:root:Inference failed: Invalid image format
```

### Enable Verbose Logging
**Frontend**: Open DevTools → Console
**Backend**: Logs appear in terminal automatically

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                        │
│                  localhost:8080                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Upload Component                                │   │
│  │  • useDetection Hook                            │   │
│  │  • useVoice Hook                                │   │
│  │  • File input, Progress, Results                │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │ Axios                             │
└─────────────────────┼──────────────────────────────────┘
                      │
        HTTP/CORS ────┼──── http://localhost:8000
                      │
┌─────────────────────┼──────────────────────────────────┐
│                     ▼                                   │
│          FastAPI Backend                               │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐ ┌──────────────┐ │
│  │ /detect      │  │ /voice       │ │ /health      │ │
│  │ Image → YOLO │  │ Text → TTS   │ │ Monitor      │ │
│  └──────────────┘  └──────────────┘ └──────────────┘ │
│         │                 │                            │
│    YOLOv5su Model    pyttsx3 Engine                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files

| File | Purpose | Edit For |
|------|---------|----------|
| `src/lib/api.ts` | API client, types, errors | New endpoints, validation |
| `src/hooks/useDetection.ts` | Detection state | Detection logic, features |
| `src/hooks/useVoice.ts` | Voice state | Voice feedback features |
| `src/components/ui/upload.tsx` | Upload UI | UI improvements, layouts |
| `backend/main.py` | FastAPI app | New endpoints, models |

---

## 🔍 Type Safety

### Type-checked API calls
```typescript
// ✅ Type-safe response
const result: DetectResponse = await sendImage(file);
result.detections.forEach(d => {
  console.log(d.label);        // ✅ string
  console.log(d.confidence);   // ✅ number
  console.log(d.position);     // ✅ 'on the left' | 'on the right' | 'in the center'
});

// ❌ Type error caught at compile time
const x: string = d.confidence; // Error!
```

---

## ⚠️ Error Handling Pattern

### Frontend
```typescript
try {
  const result = await sendImage(file);
  // Use result
} catch (error) {
  if (error instanceof APIError) {
    console.error(`[${error.status}] ${error.message}`);
    showErrorToUser(error.message);
  }
}
```

### Backend
```python
try:
    # Logic
    return JSONResponse(content={"result": data})
except Exception as e:
    logger.error(f"Operation failed: {str(e)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(e), "timestamp": timestamp}
    )
```

---

## 📊 Response Format

### Success
```json
{
  "detections": [{...}],
  "spoken": "I see a person",
  "timestamp": "2025-11-15 14:30:45",
  "inference_time_ms": 245.67,
  "count": 1
}
```

### Error
```json
{
  "error": "Inference failed: Invalid image format",
  "timestamp": "2025-11-15 14:30:45",
  "inference_time_ms": 15.23
}
```

---

## 🎨 UI State Management

```typescript
// Before (props drilling)
<Upload detections={d} loading={l} error={e} />

// After (hooks)
const { detections, loading, error } = useDetection();
// Inside component, directly use the state
```

---

## 🔗 CORS Troubleshooting

**Problem**: "Access to XMLHttpRequest blocked by CORS"

**Solution**: Check `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🎓 Learning Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Hooks](https://react.dev/reference/react/hooks)
- [Axios](https://axios-http.com/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Ultralytics YOLOv5](https://docs.ultralytics.com/models/yolov5/)

---

## ✅ Pre-commit Checklist

Before pushing code:
- [ ] No console.log() left in production code
- [ ] All types defined (no `any`)
- [ ] Error handling present (try/catch)
- [ ] Tests written (if applicable)
- [ ] Comments for complex logic
- [ ] No hardcoded URLs (use BASE_URL)
- [ ] Accessibility attributes present (alt, aria-label)

---

## 📞 Support

**Backend Issues**: Check `backend/main.py` logs
**Frontend Issues**: Open DevTools (F12) → Console
**Integration Issues**: Check `CORS` and URL config
**API Contract Issues**: See `INTEGRATION_GUIDE.md`

---

## 🚀 Next Steps

1. ✅ Run backend and frontend locally
2. ✅ Upload an image and verify detection works
3. ✅ Check browser console for logs
4. ✅ Check backend terminal for logs
5. ✅ Read `INTEGRATION_GUIDE.md` for deep dive
6. ✅ Deploy to production following best practices

---

**Last Updated**: November 15, 2025
**Project**: AccessAtlas v1.0
**Status**: Production-Ready ✅
