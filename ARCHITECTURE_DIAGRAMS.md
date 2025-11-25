# AccessAtlas: Architecture & Dataflow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          React + Vite + TypeScript Frontend              │  │
│  │          http://localhost:8080                           │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  Upload Component (95 lines)                      │   │  │
│  │  │  ├─ File Input                                    │   │  │
│  │  │  ├─ Loading Indicator                            │   │  │
│  │  │  ├─ Error Message                                │   │  │
│  │  │  ├─ Detection List                               │   │  │
│  │  │  ├─ Voice Feedback                               │   │  │
│  │  │  └─ Action Buttons                               │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                        │                                 │  │
│  │  ┌──────────────────────┴──────────────────────────┐   │  │
│  │  │                      │                          │   │  │
│  │  ▼                      ▼                          ▼   │  │
│  │ useDetection      useVoice                    useHistory   │  │
│  │ ├─ detect()       ├─ speak()                 ├─ addEntry()  │  │
│  │ ├─ clear()        ├─ clear()                 ├─ getHistory()│  │
│  │ └─ abort()        └─ error state             ├─ clearAll()  │  │
│  │                                               └─ stats()     │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  API Client (api.ts)                             │   │  │
│  │  │  ├─ sendImage(file)                              │   │  │
│  │  │  ├─ sendVoice(text)                              │   │  │
│  │  │  ├─ healthCheck()                                │   │  │
│  │  │  └─ APIError class                               │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                        │                                 │  │
│  │  ┌──────────────────────┴──────────────────────────┐   │  │
│  │  │                  Axios Instance                 │   │  │
│  │  │  baseURL: http://localhost:8000                 │   │  │
│  │  │  timeout: 60000ms                               │   │  │
│  │  │  headers: Accept: application/json             │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                        │                                 │  │
│  │  ┌──────────────────────┴──────────────────────────┐   │  │
│  │  │         localStorage                            │   │  │
│  │  │  (historyService.ts)                            │   │  │
│  │  │  ├─ detections history                          │   │  │
│  │  │─ voice commands                                │   │  │
│  │  └─ max 50 entries                                │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │ HTTP/CORS
                           │ POST /detect (multipart/form-data)
                           │ POST /voice (?text=...)
                           │ GET /health
                           │ GET /models
                           │ POST /model/switch
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                              │
│              http://localhost:8000                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         CORS Middleware                                │    │
│  │  ✓ Origins: localhost:8080, localhost:3000            │    │
│  │  ✓ Methods: GET, POST, OPTIONS                        │    │
│  │  ✓ Headers: All allowed                               │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│  ┌────────────────────────┴─────────────────────────────┐    │
│  │                       │                               │    │
│  ▼                       ▼                               ▼    │
│ POST /detect       POST /voice                 GET /health    │
│ ├─ Load image      ├─ Validate text            ├─ Check model │
│ ├─ Run inference   ├─ Init pyttsx3            ├─ Return status│
│ ├─ Extract boxes   ├─ Threading (daemon)      └─ Return timestamp│
│ ├─ Calculate pos   └─ Error handling            │              │
│ ├─ Format response                             │              │
│ └─ Voice feedback                              ▼              │
│                                           GET /models        │
│ ┌──────────────────────────────────────┐  ├─ List available  │
│ │  YOLOv5su Model                      │  └─ Return info    │
│ │  ├─ Loaded in memory                 │         │           │
│ │  ├─ 100MB .pt file                   │         ▼           │
│ │  ├─ 200-500ms inference per image    │    POST /model/switch│
│ │  └─ Outputs: boxes, conf, labels     │    ├─ Load new model│
│ └──────────────────────────────────────┘    ├─ Verify .pt file
│                                              └─ Return status │
│  ┌──────────────────────────────────────┐                    │
│  │  Logging System                      │                    │
│  │  ├─ INFO: requests, detections       │                    │
│  │  ├─ ERROR: exceptions with traceback │                    │
│  │  ├─ Structured output for debugging  │                    │
│  │  └─ Performance metrics (timing)     │                    │
│  └──────────────────────────────────────┘                    │
│                                                               │
│  ┌──────────────────────────────────────┐                    │
│  │  pyttsx3 Engine (Text-to-Speech)     │                    │
│  │  ├─ Windows SAPI5 support            │                    │
│  │  ├─ macOS NSSpeechSynthesizer        │                    │
│  │  ├─ Linux espeak/festival            │                    │
│  │  └─ Non-blocking via daemon threads  │                    │
│  └──────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Image Detection

```
User Action: Upload Image
     │
     ▼
Browser renders <input type="file" />
     │
     ├─ User selects image.jpg (500KB)
     │
     ▼
handleUpload() triggered
     │
     ├─ Validate file.type === 'image/*'
     ├─ Store fileRef = file
     ├─ Set fileName state
     ├─ clear() previous results
     │
     ▼
detect(file) from useDetection
     │
     ├─ setState { loading: true, error: null }
     ├─ Create AbortController
     │
     ▼
sendImage(file) from api.ts
     │
     ├─ Validate file.type
     ├─ Create FormData
     ├─ formData.append('file', file)
     │
     ▼
axios.post('/detect', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 60000
})
     │ (HTTP request over network)
     │
     ▼
Backend: POST /detect receives request
     │
     ├─ Log: "Detection request received: image.jpg"
     ├─ contents = await file.read()
     ├─ image = Image.open(BytesIO(contents))
     │
     ▼
YOLOv5su Model Inference
     │
     ├─ image passed to model()
     ├─ Neural network processes image
     ├─ Returns predictions
     │ · boxes with coordinates
     │ · confidence scores
     │ · class labels
     │
     ▼
Extract and Process Results
     │
     ├─ For each box in results:
     │  ├─ Get confidence, class, bounding box coords
     │  ├─ Calculate center_x = (x1 + x2) // 2
     │  ├─ Determine position:
     │  │  ├─ center_x < width/3   → "on the left"
     │  │  ├─ center_x > 2*width/3 → "on the right"
     │  │  └─ else                 → "in the center"
     │  └─ Create detection object
     │
     ├─ Create sentence for voice
     │  "I see a person in the center, a car on the right"
     │
     ▼
speak(sentence) in background thread
     │
     ├─ Thread(target=run, daemon=True).start()
     ├─ pyttsx3.init()
     ├─ engine.say(sentence)
     ├─ engine.runAndWait()
     │
     ▼
Return JSON Response
{
  "detections": [
    {
      "label": "person",
      "confidence": 0.92,
      "position": "in the center",
      "timestamp": "2025-11-15 14:30:45"
    },
    {
      "label": "car",
      "confidence": 0.87,
      "position": "on the right",
      "timestamp": "2025-11-15 14:30:45"
    }
  ],
  "spoken": "I see a person in the center, a car on the right",
  "timestamp": "2025-11-15 14:30:45",
  "inference_time_ms": 245.67,
  "count": 2
}
     │ (HTTP 200 response)
     │
     ▼
Frontend: Response received in detect()
     │
     ├─ setState {
     │    detections: result.detections,
     │    spokenText: result.spoken,
     │    timestamp: result.timestamp,
     │    inferenceTime: result.inference_time_ms,
     │    loading: false
     │  }
     │
     ▼
uploadComponent renders new state
     │
     ├─ <LoadingIndicator /> hidden (loading=false)
     ├─ <DetectionList /> shows 2 objects
     ├─ <VoiceFeedback /> shows speaking status
     │
     ▼
addEntry() to history
     │
     ├─ Create HistoryEntry object
     ├─ localStorage.setItem('accessatlas_history', ...)
     │
     ▼
User sees results + hears voice feedback
```

---

## Component Hierarchy

```
<App>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/camera" element={<Camera />} />
      
      [Optional new page]
      <Route path="/detection" element={
        <Upload />  ◄── Main component
      } />
      
      [Optional statistics page]
      <Route path="/stats" element={
        <Statistics />  ◄── useHistory hook
      } />
    </Routes>
  </BrowserRouter>
</App>

<Upload>
  ├─ State (3 hooks):
  │  ├─ useDetection()
  │  ├─ useVoice()
  │  └─ useHistory()
  │
  └─ Render (6 sub-components):
     ├─ <FileInput />
     │  └─ HTML: <input type="file" />
     │
     ├─ <LoadingIndicator />
     │  └─ Animated spinner when loading
     │
     ├─ <VoiceFeedback />
     │  └─ Status: speaking / error
     │
     ├─ <ErrorMessage type="detection" />
     │  └─ Display detection errors
     │
     ├─ <ErrorMessage type="voice" />
     │  └─ Display voice errors
     │
     ├─ <DetectionList />
     │  └─ For each detection:
     │     └─ Label | Confidence | Position | Time
     │
     └─ <ActionButtons />
        ├─ Clear button
        └─ Retry button
```

---

## State Management Flow

```
User Interaction
     │
     ├─ Upload file
     │  └─ handleUpload(event)
     │     └─ detect(file)
     │        └─ useDetection.setState()
     │           └─ Re-render with loading=true
     │
     ├─ Detection complete
     │  └─ Response received
     │     └─ useDetection.setState()
     │        └─ detections, spokenText, timestamp
     │           └─ Re-render with results
     │
     └─ Auto voice
        └─ spokenText available
           └─ speak(text)
              └─ useVoice.setState()
                 └─ isSpeaking=true
                    └─ Re-render voice status
```

---

## Storage Architecture

```
Browser Storage
│
├─ localStorage
│  │
│  └─ accessatlas_history (JSON string)
│     │
│     └─ [
│          {
│            "id": "detection-1700000000000-abc123",
│            "type": "detection",
│            "timestamp": "2025-11-15T14:30:45Z",
│            "data": {
│              "fileName": "photo.jpg",
│              "objectCount": 2
│            },
│            "status": "success"
│          },
│          {
│            "id": "voice-1700000000001-def456",
│            "type": "voice",
│            "timestamp": "2025-11-15T14:30:45Z",
│            "data": {
│              "text": "I see a person"
│            },
│            "status": "success"
│          },
│          ...max 50 entries total
│        ]
│
└─ Available methods:
   ├─ getHistory() → all 50 entries
   ├─ getHistoryByType('detection') → filtered
   ├─ getHistoryStats() → { totalEntries, successRate, ... }
   ├─ addHistoryEntry(...) → auto-save
   ├─ deleteHistoryEntry(id) → remove one
   ├─ clearHistory() → wipe all
   └─ exportHistory() → JSON export
```

---

## Error Handling Flow

```
Error Occurs
│
├─ If validation error:
│  └─ throw APIError('Invalid file type') before request
│     └─ catch in Upload component
│        └─ Display ErrorMessage
│           └─ Log to history as 'error' status
│
├─ If network error:
│  └─ catch (err instanceof AxiosError)
│     └─ Extract error from response.data.error
│        └─ throw APIError(message, status)
│           └─ Display ErrorMessage
│
├─ If backend inference error:
│  └─ Backend returns 500 with { error: "..." }
│     └─ Frontend catches Axios response
│        └─ throw APIError(error.data.error, 500)
│           └─ addEntry('detection', {...}, 'error', message)
│              └─ Display ErrorMessage
│
└─ If voice error:
   └─ speak() fails in background thread
      └─ voiceError state updated
         └─ Display ErrorMessage type="voice"
```

---

## Integration Points

```
Frontend ←→ Backend (4 endpoints)

1. POST /detect
   Request:  FormData { file: File }
   Response: { detections[], spoken, timestamp, inference_time_ms }
   Errors:   400 (validation), 500 (inference)

2. POST /voice
   Request:  ?text=Hello
   Response: { status, text, timestamp }
   Errors:   400 (empty text), 500 (voice engine)

3. GET /health
   Request:  None
   Response: { status, model, timestamp }
   Errors:   None (always 200)

4. GET /models
   Request:  None
   Response: { available_models[], current_model, timestamp }
   Errors:   None

5. POST /model/switch
   Request:  ?model_name=yolov5m
   Response: { status, model, timestamp }
   Errors:   400 (invalid), 500 (load fail)
```

---

## Performance Timeline (Example)

```
T=0ms     User clicks upload
T=50ms    File validation + FormData creation
T=100ms   Network request sent
T=200ms   Backend receives + image loading
T=400ms   YOLOv5 inference starts
T=600ms   Model processing image
T=800ms   Results extraction
T=850ms   Voice thread spawned
T=900ms   Network response sent
T=950ms   Frontend receives + state update
T=1000ms  React re-renders
T=1050ms  Voice engine starts speaking
T=1200ms  Speech complete
          ├─ Network latency: ~100ms
          ├─ Backend processing: ~800ms
          ├─ Frontend rendering: ~50ms
          └─ Voice playback: ~150ms
```

---

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────┐
│  Docker Compose (Local Development)          │
├─────────────────────────────────────────────┤
│                                              │
│  Frontend Container                          │
│  ├─ Node 18 Alpine                           │
│  ├─ Port 8080                                │
│  └─ npm run dev                              │
│                                              │
│  Backend Container                           │
│  ├─ Python 3.11 Slim                         │
│  ├─ Port 8000                                │
│  ├─ YOLOv5su model (100MB)                  │
│  └─ uvicorn main:app                        │
│                                              │
│  Volume Mounts                               │
│  ├─ ./frontend → /app                        │
│  ├─ ./backend → /app                         │
│  └─ ./models → /models (cache)               │
│                                              │
└─────────────────────────────────────────────┘
```

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Scalable component structure
- ✅ Efficient data flow
- ✅ Robust error handling
- ✅ Persistent history tracking
- ✅ Performance optimized
- ✅ Easy to extend
