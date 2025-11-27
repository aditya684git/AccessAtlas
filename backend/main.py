from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import time
import logging
import os
import uuid
import tempfile
from pathlib import Path

# Configure logging with better formatting
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Create FastAPI app
app = FastAPI(
    title="AccessAtlas Backend",
    description="YOLOv5 Object Detection API with Voice Feedback (fallback-capable)",
    version="1.0.0"
)

# CORS configuration - get from environment or use defaults
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8080,http://localhost:3000,http://localhost:8081,https://*.onrender.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Try to import heavy ML and TTS libraries with better error handling
_HAS_FULL_STACK = True
_HAS_TTS = False
model = None

try:
    import numpy as np  # type: ignore
    from ultralytics import YOLO  # type: ignore
    from PIL import Image  # type: ignore
    import io
    import threading
    import torch  # type: ignore
    
    logger.info(f"ML stack loaded - PyTorch {torch.__version__}, NumPy {np.__version__}")
    
    # Optional TTS - try gTTS first (better for web), fallback to pyttsx3
    try:
        from gtts import gTTS  # type: ignore
        _HAS_TTS = True
        _TTS_ENGINE = "gtts"
        logger.info("TTS (gTTS) available - web-compatible MP3 generation")
    except ImportError:
        try:
            import pyttsx3  # type: ignore
            _HAS_TTS = True
            _TTS_ENGINE = "pyttsx3"
            logger.info("TTS (pyttsx3) available - local audio playback")
        except ImportError:
            logger.warning("No TTS libraries available (gTTS or pyttsx3), TTS disabled")
            _HAS_TTS = False
            _TTS_ENGINE = None

    logger.info("Attempting to load YOLOv5 model...")
    
    # Find model file with multiple fallback locations
    MODEL_PATH = os.getenv("MODEL_PATH", "yolov5su.pt")
    model_locations = [
        Path(MODEL_PATH),                          # Absolute or relative to CWD
        Path(__file__).parent / MODEL_PATH,        # Relative to backend/
        Path.cwd() / MODEL_PATH,                   # Relative to working directory
        Path(__file__).parent / "yolov5su.pt",     # Default name in backend/
    ]
    
    model_file = None
    for loc in model_locations:
        if loc.exists():
            model_file = loc
            logger.info(f"Found model at: {model_file} ({model_file.stat().st_size / (1024*1024):.1f}MB)")
            break
    
    if model_file is None:
        logger.error(f"Model file not found. Searched locations:")
        for loc in model_locations:
            logger.error(f"  - {loc}")
        raise FileNotFoundError(f"Model file '{MODEL_PATH}' not found in any expected location")
    
    # Load model with error handling
    try:
        model = YOLO(str(model_file))
        logger.info(f"✓ Model loaded successfully: {len(model.names)} classes")
        logger.info(f"  Classes: {', '.join(list(model.names.values())[:10])}...")
    except Exception as e:
        logger.error(f"Failed to load model from {model_file}: {e}", exc_info=True)
        model = None
        raise
        
except ImportError as e:
    logger.warning(f"ML dependencies not available: {e}")
    logger.warning("Running in FALLBACK mode - mock responses only")
    _HAS_FULL_STACK = False
    _HAS_TTS = False
    _TTS_ENGINE = None
    model = None
except Exception as e:
    logger.error(f"Failed to initialize ML stack: {e}", exc_info=True)
    _HAS_FULL_STACK = False
    _HAS_TTS = False
    _TTS_ENGINE = None
    model = None


def speak(text: str):
    """Speak text using pyttsx3 if available; otherwise just log."""
    if _HAS_FULL_STACK and _HAS_TTS:
        try:
            def run():
                try:
                    import pyttsx3
                    engine = pyttsx3.init()
                    engine.say(text)
                    engine.runAndWait()
                except Exception as e:
                    logger.error(f"Voice playback error: {e}")
            threading.Thread(target=run, daemon=True).start()
        except Exception as e:
            logger.error(f"Failed to spawn TTS thread: {e}")
    else:
        logger.info(f"[TTS] {text}")


@app.get("/health")
async def health_check():
    """Health check endpoint with system status"""
    status = {
        "status": "ok",
        "stack": "full" if _HAS_FULL_STACK and model is not None else "mock",
        "model_loaded": model is not None,
        "tts_available": _HAS_TTS,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    if model is not None:
        status["model_classes"] = len(model.names)
    
    return JSONResponse(status_code=200, content=status)


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """
    Object detection endpoint with comprehensive validation and error handling
    
    Returns:
        JSON with detections, spoken text, count, timestamp, and inference time
    
    Raises:
        HTTPException 422: Invalid input (wrong file type, too large, corrupt)
        HTTPException 500: Server error (model failure, unexpected error)
    """
    start_time = time.time()
    
    # === INPUT VALIDATION ===
    if not file:
        raise HTTPException(status_code=422, detail="No file provided")
    
    filename = getattr(file, 'filename', 'upload')
    logger.info(f"[DETECT] Processing: {filename}")
    
    # Validate filename
    if not filename:
        raise HTTPException(status_code=422, detail="Invalid filename")
    
    # Validate file extension
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    file_ext = Path(filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid file type '{file_ext}'. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Read file with size limit
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 10 * 1024 * 1024))  # 10MB default
    try:
        contents = await file.read()
        file_size_mb = len(contents) / (1024 * 1024)
        
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=422,
                detail=f"File too large ({file_size_mb:.1f}MB). Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        if len(contents) == 0:
            raise HTTPException(status_code=422, detail="Empty file")
        
        logger.info(f"[DETECT] File size: {file_size_mb:.2f}MB")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise HTTPException(status_code=422, detail=f"Error reading file: {str(e)}")
    
    # === INFERENCE LOGIC ===
    try:
        if _HAS_FULL_STACK and model is not None:
            # === REAL INFERENCE PATH ===
            try:
                # Validate and load image
                try:
                    image = Image.open(io.BytesIO(contents)).convert("RGB")
                    logger.info(f"[DETECT] Image loaded: {image.size}, mode: {image.mode}")
                except Exception as e:
                    logger.error(f"Invalid image file: {e}")
                    raise HTTPException(status_code=422, detail=f"Cannot open image: {str(e)}")
                
                # Run YOLOv5 inference with confidence threshold
                confidence = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
                try:
                    logger.info(f"[DETECT] Running inference (conf={confidence})...")
                    results = model(image, conf=confidence)
                    inference_time = time.time() - start_time
                    logger.info(f"[DETECT] Inference completed in {inference_time:.2f}s")
                except Exception as e:
                    logger.error(f"Model inference failed: {e}", exc_info=True)
                    raise HTTPException(
                        status_code=500,
                        detail=f"Model inference failed: {str(e)}. Check if numpy/torch are properly installed."
                    )
                
                boxes = results[0].boxes
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                
                # No detections case
                if boxes is None or len(boxes) == 0:
                    logger.info("[DETECT] No objects detected")
                    speak("No objects detected")
                    return JSONResponse(content={
                        "detections": [],
                        "message": "No objects detected",
                        "timestamp": timestamp,
                        "inference_time": round(inference_time, 2)
                    })
                
                # Process detections
                output = []
                spoken_labels = []
                
                for box in boxes:
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    label = model.names[cls]
                    
                    # Calculate position
                    x1, x2 = int(box.xyxy[0][0]), int(box.xyxy[0][2])
                    center_x = (x1 + x2) // 2
                    width = image.width
                    
                    position = (
                        "on the left" if center_x < width / 3 else
                        "on the right" if center_x > 2 * width / 3 else
                        "in the center"
                    )
                    
                    directional_label = f"{label} {position}"
                    output.append({
                        "label": label,
                        "confidence": round(conf, 2),
                        "position": position
                    })
                    spoken_labels.append(directional_label)
                
                sentence = "I see " + ", ".join(spoken_labels)
                speak(sentence)
                
                logger.info(f"[DETECT] Found {len(output)} objects")
                return JSONResponse(content={
                    "detections": output,
                    "spoken": sentence,
                    "count": len(output),
                    "timestamp": timestamp,
                    "inference_time": round(inference_time, 2)
                })
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Inference pipeline failed: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")
        
        else:
            # === MOCK RESPONSE PATH (no ML stack) ===
            logger.info("[DETECT] Using mock response (ML stack unavailable)")
            mock = {
                "detections": [
                    {"label": "person", "confidence": 0.92, "position": "in the center"},
                    {"label": "bottle", "confidence": 0.76, "position": "on the right"}
                ],
                "spoken": "I see person in the center, bottle on the right",
                "count": 2,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "inference_time": 0.1,
                "mode": "mock"
            }
            speak(mock["spoken"])
            return JSONResponse(content=mock)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /detect: {e}", exc_info=True)
        speak("An error occurred during detection")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.get("/voice")
async def generate_voice(text: str = Query(..., min_length=1, max_length=500, description="Text to convert to speech")):
    """
    Text-to-speech endpoint that generates and returns an MP3 file.
    
    Args:
        text: Text to convert to speech (1-500 characters)
    
    Returns:
        FileResponse: Downloadable MP3 audio file
    
    Raises:
        HTTPException 400: Invalid text input
        HTTPException 503: TTS service unavailable
        HTTPException 500: Audio generation failed
    """
    # Validate input
    if not text or text.strip() == "":
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    text = text.strip()
    logger.info(f"[VOICE] Generating speech for: '{text[:50]}...' ({len(text)} chars)")
    
    # Check TTS availability
    if not _HAS_TTS:
        raise HTTPException(
            status_code=503,
            detail="TTS service unavailable. Install gtts or pyttsx3: pip install gtts"
        )
    
    try:
        # Generate unique filename to avoid collisions
        unique_id = uuid.uuid4().hex[:8]
        timestamp = int(time.time())
        filename = f"speech_{timestamp}_{unique_id}.mp3"
        
        # Use temp directory for audio files
        temp_dir = Path(tempfile.gettempdir()) / "accessatlas_audio"
        temp_dir.mkdir(exist_ok=True)
        audio_path = temp_dir / filename
        
        # Generate audio based on available engine
        if _TTS_ENGINE == "gtts":
            # Use gTTS (Google Text-to-Speech) - pure Python, generates MP3
            try:
                from gtts import gTTS
                
                # Create TTS object with optimized settings
                tts = gTTS(
                    text=text,
                    lang='en',  # English language
                    slow=False,  # Normal speed
                    tld='com'  # Use google.com (US accent)
                )
                
                # Save to file
                tts.save(str(audio_path))
                logger.info(f"[VOICE] Audio generated with gTTS: {audio_path} ({audio_path.stat().st_size} bytes)")
                
            except Exception as e:
                logger.error(f"gTTS generation failed: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"Audio generation failed: {str(e)}"
                )
        
        elif _TTS_ENGINE == "pyttsx3":
            # Fallback to pyttsx3 (requires system TTS, saves to file)
            try:
                import pyttsx3
                
                engine = pyttsx3.init()
                engine.setProperty('rate', 150)  # Speed (words per minute)
                engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)
                
                # Save to file (pyttsx3 supports wav/mp3 depending on system)
                # Note: pyttsx3.save_to_file may not work on all platforms
                engine.save_to_file(text, str(audio_path))
                engine.runAndWait()
                
                # Check if file was created
                if not audio_path.exists() or audio_path.stat().st_size == 0:
                    raise Exception("pyttsx3 failed to generate audio file")
                
                logger.info(f"[VOICE] Audio generated with pyttsx3: {audio_path}")
                
            except Exception as e:
                logger.error(f"pyttsx3 generation failed: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"Audio generation failed with pyttsx3: {str(e)}. Try installing gtts: pip install gtts"
                )
        
        else:
            raise HTTPException(status_code=503, detail="No TTS engine available")
        
        # Verify file was created successfully
        if not audio_path.exists():
            raise HTTPException(
                status_code=500,
                detail="Audio file generation failed - file not created"
            )
        
        file_size = audio_path.stat().st_size
        if file_size == 0:
            audio_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=500,
                detail="Audio file generation failed - empty file"
            )
        
        logger.info(f"[VOICE] Serving audio file: {filename} ({file_size} bytes)")
        
        # Return file as downloadable response
        # Note: FileResponse with background task will auto-delete after serving
        return FileResponse(
            path=str(audio_path),
            media_type="audio/mpeg",
            filename=filename,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            },
            background=None  # Don't auto-delete; cleanup happens via separate task
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /voice: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error generating audio: {str(e)}"
        )


@app.post("/voice/speak")
async def voice_speak(text: str = Query(..., min_length=1, max_length=500)):
    """
    Legacy endpoint for immediate audio playback (non-blocking).
    Use /voice for downloadable MP3 files instead.
    """
    if not text or text.strip() == "":
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    speak(text)
    return JSONResponse(status_code=200, content={
        "status": "speaking",
        "text": text,
        "note": "Use GET /voice?text=... for downloadable MP3 files"
    })


@app.delete("/voice/cleanup")
async def cleanup_audio_files():
    """
    Cleanup old temporary audio files (older than 1 hour).
    Called automatically or manually to free up disk space.
    """
    try:
        temp_dir = Path(tempfile.gettempdir()) / "accessatlas_audio"
        if not temp_dir.exists():
            return JSONResponse(content={"status": "ok", "cleaned": 0, "message": "No temp directory"})
        
        cleaned_count = 0
        cleaned_size = 0
        current_time = time.time()
        
        for audio_file in temp_dir.glob("speech_*.mp3"):
            try:
                # Remove files older than 1 hour
                file_age = current_time - audio_file.stat().st_mtime
                if file_age > 3600:  # 1 hour in seconds
                    file_size = audio_file.stat().st_size
                    audio_file.unlink()
                    cleaned_count += 1
                    cleaned_size += file_size
                    logger.info(f"[CLEANUP] Removed old audio file: {audio_file.name}")
            except Exception as e:
                logger.warning(f"Failed to remove {audio_file}: {e}")
        
        return JSONResponse(content={
            "status": "ok",
            "cleaned": cleaned_count,
            "size_freed_mb": round(cleaned_size / (1024 * 1024), 2),
            "message": f"Cleaned {cleaned_count} old audio files"
        })
    except Exception as e:
        logger.error(f"Cleanup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@app.get("/models")
async def list_models():
    """List available YOLOv5 models"""
    available_models = ['yolov5n', 'yolov5s', 'yolov5m', 'yolov5l', 'yolov5x', 'yolov5su']
    current_model = 'yolov5su' if model is None else getattr(model, 'model_name', 'yolov5su')
    return JSONResponse(status_code=200, content={
        "available_models": available_models,
        "current_model": current_model,
        "loaded": model is not None
    })


@app.post("/model/switch")
async def switch_model(model_name: str):
    """Switch to a different YOLOv5 model"""
    if not model_name:
        raise HTTPException(status_code=400, detail="model_name is required")
    
    if not _HAS_FULL_STACK:
        raise HTTPException(
            status_code=501,
            detail="Model switching requires full stack (torch/ultralytics)"
        )
    
    try:
        global model
        logger.info(f"Switching to model: {model_name}")
        model = YOLO(f"{model_name}.pt")
        return JSONResponse(status_code=200, content={
            "status": "switched",
            "model": model_name
        })
    except Exception as e:
        logger.error(f"Failed to switch model: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Model switch failed: {str(e)}")


@app.get("/info")
async def get_info():
    """Get API information"""
    return JSONResponse(status_code=200, content={
        "name": "AccessAtlas Backend",
        "version": "1.0.0",
        "mode": "full" if _HAS_FULL_STACK and model is not None else "mock",
        "model_loaded": model is not None,
        "tts_available": _HAS_TTS,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    })
