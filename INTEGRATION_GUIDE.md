# Frontend-Backend Integration Guide

## Overview
This guide documents the full-stack integration between the React + Vite + TypeScript frontend and the FastAPI backend for the AccessAtlas accessibility app.

---

## Architecture

### Frontend (React + Vite + TypeScript)
- **URL**: `http://localhost:8080`
- **Port**: 8080
- **Tech Stack**: React 18+, Vite, TypeScript, Axios
- **Key Files**:
  - `src/lib/api.ts` — API client with error handling
  - `src/hooks/useDetection.ts` — Detection state management hook
  - `src/hooks/useVoice.ts` — Voice feedback state management hook
  - `src/components/ui/upload.tsx` — Image upload component

### Backend (FastAPI)
- **URL**: `http://localhost:8000`
- **Port**: 8000
- **Tech Stack**: FastAPI, Ultralytics YOLOv5, pyttsx3, Python 3.8+
- **Key Files**:
  - `backend/main.py` — FastAPI application with /detect and /voice endpoints

---

## Alignment Checklist ✅

### 1. **API Configuration**
- ✅ **Axios Base URL**: `http://localhost:8000` (matches backend)
- ✅ **Request Timeout**: 60 seconds (accounts for model loading and inference)
- ✅ **Content-Type**: Auto-detected for FormData, explicitly set for /voice

### 2. **CORS Configuration**
- ✅ **Allowed Origins**: `http://localhost:8080`, `http://localhost:3000`
- ✅ **Allowed Methods**: `*` (GET, POST, PUT, DELETE, etc.)
- ✅ **Allowed Headers**: `*` (all headers)
- ✅ **Credentials**: Enabled
- ✅ **Expose Headers**: `Content-Type`, `X-Process-Time`

### 3. **Endpoint Contracts**

#### `/detect` Endpoint
**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Image file

**Response (Success - 200)**:
```json
{
  "detections": [
    {
      "label": "person",
      "confidence": 0.92,
      "position": "in the center",
      "timestamp": "2025-11-15 14:30:45"
    }
  ],
  "spoken": "I see a person in the center",
  "timestamp": "2025-11-15 14:30:45",
  "inference_time_ms": 245.67,
  "count": 1
}
```

**Response (No Detections - 200)**:
```json
{
  "detections": [],
  "message": "No objects detected",
  "timestamp": "2025-11-15 14:30:45",
  "inference_time_ms": 210.45
}
```

**Response (Error - 500)**:
```json
{
  "error": "Inference failed: Invalid image format",
  "timestamp": "2025-11-15 14:30:45",
  "inference_time_ms": 15.23
}
```

#### `/voice` Endpoint
**Request**:
- Method: `POST`
- Query Param: `text` (string, required)
- Example: `POST /voice?text=Hello%20World`

**Response (Success - 200)**:
```json
{
  "status": "speaking",
  "text": "Hello World",
  "timestamp": "2025-11-15 14:30:45"
}
```

**Response (Error - 500)**:
```json
{
  "error": "Voice failed: Text-to-speech engine error",
  "timestamp": "2025-11-15 14:30:45"
}
```

#### `/health` Endpoint (Optional)
**Request**:
- Method: `GET`

**Response**:
```json
{
  "status": "healthy",
  "model": "yolov5su",
  "timestamp": "2025-11-15 14:30:45"
}
```

---

## Error Handling

### Frontend Error Handling
All API calls are wrapped in try/catch blocks with custom `APIError` class:

```typescript
try {
  const result = await sendImage(file);
  // Handle success
} catch (error) {
  if (error instanceof APIError) {
    console.error(error.message, error.status);
  }
}
```

**Error Types**:
- **File Type Validation**: "Invalid file type. Please upload an image."
- **Network Errors**: Caught and logged with original Axios error
- **Backend Errors**: Parsed from response.data.error
- **Unexpected Errors**: Generic fallback messages

### Backend Error Handling
All endpoints use try/except with:
- Structured error logging
- Human-readable error messages
- HTTP status codes (400, 500)
- Consistent response format

---

## Custom Hooks

### `useDetection`
Manages image detection state and logic.

**Usage**:
```typescript
const { detections, loading, error, spokenText, timestamp, detect, clear } = useDetection();

const handleUpload = async (file: File) => {
  await detect(file);
};
```

**State**:
- `detections`: Array of detected objects
- `loading`: Loading state during inference
- `error`: Error message if detection failed
- `spokenText`: Text that was spoken
- `timestamp`: Detection timestamp

**Methods**:
- `detect(file)`: Run detection on image file
- `clear()`: Clear all detection state

### `useVoice`
Manages voice feedback state and logic.

**Usage**:
```typescript
const { isSpeaking, error, speak, clear } = useVoice();

const handleSpeak = async () => {
  await speak('Hello, this is a test.');
};
```

**State**:
- `isSpeaking`: Voice is currently playing
- `error`: Error message if voice failed
- `lastSpokenText`: Last text that was spoken

**Methods**:
- `speak(text)`: Speak given text
- `clear()`: Clear voice state

---

## Setup Instructions

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn ultralytics pillow pyttsx3 python-multipart

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

The frontend will be available at `http://localhost:8080` and the backend at `http://localhost:8000`.

---

## Testing

### Test /detect Endpoint
```bash
curl -X POST \
  -F "file=@/path/to/image.jpg" \
  http://localhost:8000/detect
```

### Test /voice Endpoint
```bash
curl -X POST "http://localhost:8000/voice?text=Hello%20World"
```

### Test /health Endpoint
```bash
curl http://localhost:8000/health
```

---

## Performance Considerations

1. **Model Loading**: YOLOv5su (~100MB) loads on first request, takes ~5-10 seconds
2. **Inference Time**: 200-500ms depending on image size (see `inference_time_ms` in response)
3. **Voice Playback**: Non-blocking via daemon threads (doesn't block API response)
4. **Request Timeout**: Set to 60 seconds to account for cold start

### Optimization Tips
- Cache model in memory after first load (already done)
- Use smaller images for faster inference
- Consider quantization for edge deployment
- Monitor voice engine performance on slow systems

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| CORS error in browser | Frontend CORS not configured | Check `CORSMiddleware` in backend |
| Image upload hangs | Model not loaded or slow hardware | Check backend logs, increase timeout |
| Voice not working | pyttsx3 engine error on Windows | Ensure Windows text-to-speech is installed |
| 404 on /detect | Wrong endpoint URL | Verify base URL is `http://localhost:8000` |
| File upload returns 500 | Invalid image format | Check file is valid JPEG/PNG/WebP |
| Localhost connection refused | Backend not running | Start backend with `uvicorn main:app --reload` |

---

## Scalability Recommendations

### For Production Deployment
1. **Environment Variables**: Store URLs, model paths, and configs in `.env`
2. **Logging**: Use structured logging (JSON) for easier debugging
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Authentication**: Add JWT/OAuth for secure API access
5. **Model Serving**: Consider TorchServe or TensorFlow Serving for large-scale inference
6. **Caching**: Implement Redis for detection result caching
7. **Monitoring**: Add Prometheus metrics for performance tracking
8. **Error Tracking**: Integrate Sentry for error monitoring

### API Versioning
Consider versioning endpoints for future compatibility:
```
/api/v1/detect
/api/v1/voice
/api/v1/health
```

### Frontend Improvements
1. **Request Retry**: Add exponential backoff for failed requests
2. **Offline Mode**: Cache recent detections
3. **Analytics**: Track user interactions and detection accuracy
4. **Accessibility**: Add aria labels for screen readers
5. **Progressive Enhancement**: Support file uploads without JavaScript

---

## Summary

The frontend-backend integration is **fully aligned** with:
- ✅ Matching URLs and CORS configuration
- ✅ Type-safe API client with error handling
- ✅ Reusable state management hooks
- ✅ Comprehensive error handling throughout
- ✅ Structured logging on backend
- ✅ Health check endpoint for monitoring

All requirements from the task have been met and improved with best practices for scalability and maintainability.
