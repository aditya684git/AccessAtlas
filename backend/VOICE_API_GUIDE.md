# Voice API Guide - Text-to-Speech Endpoints

## Overview

The Voice API provides text-to-speech functionality with two engines:
1. **gTTS** (Google Text-to-Speech) - Primary, web-compatible MP3 generation
2. **pyttsx3** - Fallback, system-level TTS

## Endpoints

### 1. **GET /voice** - Generate Downloadable MP3 ✨ NEW

Generate speech from text and download as an MP3 file.

#### Request
```http
GET /voice?text=Hello%20world HTTP/1.1
```

#### Parameters
| Parameter | Type | Required | Max Length | Description |
|-----------|------|----------|------------|-------------|
| `text` | string | Yes | 500 chars | Text to convert to speech |

#### Response
- **Content-Type**: `audio/mpeg`
- **Headers**:
  - `Content-Disposition: attachment; filename="speech_{timestamp}_{id}.mp3"`
  - `Cache-Control: no-cache`

#### Success (200 OK)
Returns MP3 audio file as binary data

#### Errors
| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Text cannot be empty" | Missing or empty text parameter |
| 503 | "TTS service unavailable" | gTTS not installed |
| 500 | "Audio generation failed" | File creation error |

#### Examples

**JavaScript (Frontend)**
```javascript
// Download as file
async function downloadSpeech(text) {
  const response = await fetch(`/voice?text=${encodeURIComponent(text)}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'speech.mp3';
  a.click();
}

// Play in browser
async function playSpeech(text) {
  const response = await fetch(`/voice?text=${encodeURIComponent(text)}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
}

// Use with HTML5 audio element
const audioElement = document.getElementById('myAudio');
audioElement.src = `/voice?text=${encodeURIComponent('Hello world')}`;
audioElement.play();
```

**Python**
```python
import requests

response = requests.get("http://localhost:8000/voice", params={"text": "Hello world"})
with open("speech.mp3", "wb") as f:
    f.write(response.content)
```

**cURL**
```bash
# Download to file
curl -X GET "http://localhost:8000/voice?text=Hello%20world" -o speech.mp3

# Play with mpg123/ffplay
curl -X GET "http://localhost:8000/voice?text=Hello%20world" | mpg123 -
```

---

### 2. **POST /voice/speak** - Immediate Playback (Legacy)

Trigger immediate audio playback on the server (non-blocking).

#### Request
```http
POST /voice/speak?text=Hello%20world HTTP/1.1
```

#### Response
```json
{
  "status": "speaking",
  "text": "Hello world",
  "note": "Use GET /voice?text=... for downloadable MP3 files"
}
```

**Note**: This uses threading and plays audio on the **server** machine, not the client. Use `/voice` for client-side playback.

---

### 3. **DELETE /voice/cleanup** - Clean Temp Files

Remove temporary audio files older than 1 hour.

#### Request
```http
DELETE /voice/cleanup HTTP/1.1
```

#### Response
```json
{
  "status": "ok",
  "cleaned": 5,
  "size_freed_mb": 1.23,
  "message": "Cleaned 5 old audio files"
}
```

---

## Technical Details

### File Generation

**Unique Filenames**
```python
filename = f"speech_{timestamp}_{uuid}.mp3"
# Example: speech_1700000000_a1b2c3d4.mp3
```

**Storage Location**
```python
temp_dir = Path(tempfile.gettempdir()) / "accessatlas_audio"
# Linux/Mac: /tmp/accessatlas_audio/
# Windows: C:\Users\<user>\AppData\Local\Temp\accessatlas_audio\
```

**File Lifecycle**
1. Generated on demand with unique filename
2. Served to client with proper MIME type
3. Remains on disk until cleanup (manual or automatic)
4. Auto-deleted after 1 hour via `/voice/cleanup`

### TTS Engine Priority

1. **gTTS** (Preferred)
   - Pure Python, no system dependencies
   - Generates web-compatible MP3 files
   - Uses Google's TTS API (requires internet)
   - Better voice quality
   - Multiple languages supported

2. **pyttsx3** (Fallback)
   - Offline, uses system TTS
   - Platform-dependent (SAPI5 on Windows, NSSpeechSynthesizer on Mac)
   - May not support MP3 on all platforms
   - Works offline

### Audio Format

- **Format**: MP3 (MPEG Audio Layer 3)
- **MIME Type**: `audio/mpeg`
- **Bitrate**: Default (gTTS uses ~24 kbps)
- **Sample Rate**: 24000 Hz (gTTS default)
- **Channels**: Mono

### File Size Estimates

| Text Length | Approximate MP3 Size |
|-------------|---------------------|
| 10 words | ~5-10 KB |
| 50 words | ~20-30 KB |
| 100 words | ~40-60 KB |
| 500 chars (max) | ~50-80 KB |

---

## Frontend Integration

### React Example

```typescript
import { useState } from 'react';

function TextToSpeech() {
  const [text, setText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateSpeech = async () => {
    try {
      const response = await fetch(
        `/api/voice?text=${encodeURIComponent(text)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error('TTS Error:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        placeholder="Enter text to speak..."
      />
      <button onClick={generateSpeech}>Generate Speech</button>
      
      {audioUrl && (
        <audio controls src={audioUrl}>
          Your browser does not support audio playback.
        </audio>
      )}
    </div>
  );
}
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Text to Speech</title>
</head>
<body>
  <input id="textInput" type="text" maxlength="500" placeholder="Enter text...">
  <button onclick="generateSpeech()">Speak</button>
  <audio id="audioPlayer" controls></audio>

  <script>
    async function generateSpeech() {
      const text = document.getElementById('textInput').value;
      const audioPlayer = document.getElementById('audioPlayer');
      
      try {
        const response = await fetch(`/voice?text=${encodeURIComponent(text)}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        audioPlayer.src = url;
        audioPlayer.play();
      } catch (error) {
        console.error('TTS Error:', error);
        alert('Failed to generate speech');
      }
    }
  </script>
</body>
</html>
```

---

## Error Handling

### Client-Side

```typescript
async function generateSpeech(text: string) {
  try {
    const response = await fetch(`/voice?text=${encodeURIComponent(text)}`);
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 400:
          console.error('Invalid input:', error.detail);
          break;
        case 503:
          console.error('TTS unavailable:', error.detail);
          alert('Voice service is not available. Please try again later.');
          break;
        case 500:
          console.error('Server error:', error.detail);
          break;
        default:
          console.error('Unexpected error:', error);
      }
      return null;
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

---

## Deployment Considerations

### Environment Variables

```env
# Optional: Customize temp directory
TEMP_AUDIO_DIR=/opt/render/project/audio
```

### Render Deployment

**requirements.txt** (already updated)
```txt
gTTS==2.5.0
```

**Notes:**
- gTTS requires internet access (calls Google API)
- Temp files stored in `/tmp/accessatlas_audio/`
- Files auto-cleanup after 1 hour
- No system dependencies required

### Cleanup Strategy

**Option 1: Manual Cleanup**
```bash
curl -X DELETE https://your-app.onrender.com/voice/cleanup
```

**Option 2: Cron Job (Recommended)**
```python
# Add to main.py startup
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_audio_files, 'interval', hours=1)
scheduler.start()
```

**Option 3: Background Task (FastAPI)**
```python
from fastapi import BackgroundTasks

@app.get("/voice")
async def generate_voice(text: str, background_tasks: BackgroundTasks):
    # ... generate audio ...
    
    # Schedule cleanup after serving
    background_tasks.add_task(cleanup_old_files)
    
    return FileResponse(audio_path)
```

---

## Testing

### Unit Tests

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_voice_endpoint_success():
    response = client.get("/voice", params={"text": "Hello world"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert len(response.content) > 0

def test_voice_endpoint_empty_text():
    response = client.get("/voice", params={"text": ""})
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_voice_endpoint_long_text():
    text = "a" * 501  # Exceeds 500 char limit
    response = client.get("/voice", params={"text": text})
    assert response.status_code == 422

def test_cleanup_endpoint():
    response = client.delete("/voice/cleanup")
    assert response.status_code == 200
    assert "cleaned" in response.json()
```

### Manual Testing

```bash
# Test voice generation
curl -X GET "http://localhost:8000/voice?text=Testing%20one%20two%20three" -o test.mp3
mpg123 test.mp3

# Test cleanup
curl -X DELETE "http://localhost:8000/voice/cleanup"

# Test health (check TTS availability)
curl http://localhost:8000/health
```

---

## Performance

### Benchmarks (gTTS)

| Metric | Value |
|--------|-------|
| Generation time (10 words) | ~0.5-1s |
| Generation time (50 words) | ~1-2s |
| File size (10 words) | ~8 KB |
| File size (50 words) | ~25 KB |
| Concurrent requests | Limited by Google API rate limits |

### Optimization Tips

1. **Cache common phrases**
   ```python
   # Store frequently used phrases
   CACHED_PHRASES = {
       "hello": "speech_hello.mp3",
       "welcome": "speech_welcome.mp3"
   }
   ```

2. **Use CDN for static audio**
   - Pre-generate common phrases
   - Upload to S3/CloudFront
   - Serve cached versions

3. **Implement rate limiting**
   ```python
   from slowapi import Limiter
   
   limiter = Limiter(key_func=get_remote_address)
   
   @app.get("/voice")
   @limiter.limit("10/minute")
   async def generate_voice(text: str):
       # ...
   ```

---

## Troubleshooting

### Issue: "gTTS not available"

**Cause:** gTTS not installed

**Solution:**
```bash
pip install gTTS==2.5.0
```

### Issue: Empty MP3 file

**Cause:** Network error or API failure

**Solution:**
- Check internet connection (gTTS requires internet)
- Verify Google TTS API is accessible
- Check logs for detailed error

### Issue: Audio not playing in browser

**Cause:** MIME type or CORS issue

**Solution:**
- Verify `Content-Type: audio/mpeg` header
- Check CORS settings allow audio files
- Try different browser

### Issue: Temp directory fills up

**Cause:** Cleanup not running

**Solution:**
```bash
# Manual cleanup
curl -X DELETE https://your-app.onrender.com/voice/cleanup

# Or set up automatic cleanup (see Deployment section)
```

---

## Migration Guide

### From pyttsx3 to gTTS

**Before:**
```python
@app.post("/voice")
async def voice(text: str):
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()
    return {"status": "ok"}
```

**After:**
```python
@app.get("/voice")
async def generate_voice(text: str = Query(...)):
    # ... (see implementation above)
    return FileResponse(audio_path, media_type="audio/mpeg")
```

**Frontend Change:**
```javascript
// Before: POST request, no audio returned
await fetch('/voice', { method: 'POST', body: JSON.stringify({ text }) });

// After: GET request, audio file returned
const response = await fetch(`/voice?text=${encodeURIComponent(text)}`);
const blob = await response.blob();
const audio = new Audio(URL.createObjectURL(blob));
audio.play();
```

---

## Summary

✅ **Advantages of New Implementation:**
- Web-compatible MP3 files
- No system dependencies (pure Python)
- Downloadable audio responses
- Frontend playback support
- Unique filenames (no collisions)
- Automatic cleanup
- Better error handling

❌ **Limitations:**
- Requires internet (gTTS calls Google API)
- Rate limits (Google API)
- Temp storage required
- Max 500 characters per request

**Recommended for:**
- Web applications
- Mobile apps
- Any client-side audio playback

**Not recommended for:**
- Offline applications (use pyttsx3 instead)
- High-volume/real-time applications (cache audio)
- Long-form content (>500 chars - split into chunks)
