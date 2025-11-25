"""
Improved FastAPI backend with deployment-safe model loading and fallback logic
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import time
import logging
from pathlib import Path

try:
    from config import config
except ImportError:
    # Fallback if config.py not available
    class config:
        CORS_ORIGINS = ["http://localhost:3000"]
        MODEL_CONFIDENCE_THRESHOLD = 0.5
        ENABLE_TTS = True
        LOG_LEVEL = "INFO"
        @staticmethod
        def get_model_path():
            return Path("yolov5su.pt")
        @staticmethod
        def validate():
            return {"valid": True, "warnings": [], "errors": []}

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AccessAtlas Backend",
    description="YOLOv5 Object Detection API with Voice Feedback",
    version="2.0.0"
)

# CORS middleware with deployment-safe origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Model Loading with Deployment-Safe Error Handling
# ============================================================================

_HAS_FULL_STACK = False
model = None
model_load_error = None

try:
    # Import dependencies
    from ultralytics import YOLO
    from PIL import Image
    import io
    import threading
    import pyttsx3 if config.ENABLE_TTS else None
    
    logger.info("ML dependencies imported successfully")
    
    # Validate configuration
    validation = config.validate()
    if not validation["valid"]:
        for error in validation["errors"]:
            logger.error(f"Config error: {error}")
        raise RuntimeError("Invalid configuration")
    
    for warning in validation["warnings"]:
        logger.warning(f"Config warning: {warning}")
    
    # Load model with proper path resolution
    try:
        model_path = config.get_model_path()
        logger.info(f"Loading model from: {model_path}")
        
        model = YOLO(str(model_path))
        _HAS_FULL_STACK = True
        
        logger.info(f"✅ Model loaded successfully: {model_path.name} ({model_path.stat().st_size / (1024*1024):.1f}MB)")
        
    except FileNotFoundError as e:
        model_load_error = str(e)
        logger.error(f"❌ Model file not found: {e}")
        logger.warning("Running in FALLBACK mode - detection will return mock data")
        
    except Exception as e:
        model_load_error = f"Failed to load model: {e}"
        logger.error(f"❌ {model_load_error}")
        logger.warning("Running in FALLBACK mode - detection will return mock data")

except ImportError as e:
    model_load_error = f"Missing dependencies: {e}"
    logger.warning(f"ML stack unavailable: {e}")
    logger.warning("Running in FALLBACK mode - detection will return mock data")

# ============================================================================
# Voice Feedback (optional)
# ============================================================================

def speak(text: str):
    """Speak text using pyttsx3 if available"""
    if not config.ENABLE_TTS or not _HAS_FULL_STACK:
        logger.debug(f"(TTS disabled) {text}")
        return
    
    try:
        def run():
            try:
                engine = pyttsx3.init()
                engine.say(text)
                engine.runAndWait()
            except Exception as e:
                logger.error(f"TTS playback error: {e}")
        
        threading.Thread(target=run, daemon=True).start()
    except Exception as e:
        logger.error(f"Failed to spawn TTS thread: {e}")

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "AccessAtlas Backend API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "detect": "/detect (POST)",
            "config": "/config"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with detailed status"""
    status = {
        "status": "ok",
        "stack": "full" if _HAS_FULL_STACK and model is not None else "fallback",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "model_loaded": model is not None,
        "tts_enabled": config.ENABLE_TTS,
    }
    
    if model_load_error:
        status["warning"] = model_load_error
    
    return JSONResponse(status_code=200, content=status)

@app.get("/config")
async def get_config():
    """Get current configuration (for debugging)"""
    validation = config.validate()
    
    return {
        "model_path": str(config.MODEL_PATH),
        "confidence_threshold": config.MODEL_CONFIDENCE_THRESHOLD,
        "tts_enabled": config.ENABLE_TTS,
        "platform": config.PLATFORM,
        "validation": validation,
        "model_exists": model is not None
    }

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """
    Detect accessibility features in uploaded image
    
    Returns:
        - Real YOLOv5 detections if model loaded
        - Mock data if running in fallback mode
    """
    start_time = time.time()
    
    try:
        filename = getattr(file, 'filename', 'upload')
        logger.info(f"[/detect] Processing: {filename}")
        
        contents = await file.read()
        
        # Validate file size
        if len(contents) > config.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File too large (max {config.MAX_UPLOAD_SIZE_MB}MB)"
            )
        
        # ===== FULL STACK: Real YOLOv5 Inference =====
        if _HAS_FULL_STACK and model is not None:
            try:
                image = Image.open(io.BytesIO(contents)).convert("RGB")
                results = model(image, conf=config.MODEL_CONFIDENCE_THRESHOLD)
                boxes = results[0].boxes
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                
                output = []
                spoken_labels = []
                
                for box in boxes:
                    cls_id = int(box.cls[0])
                    label = model.names[cls_id]
                    confidence = float(box.conf[0])
                    coords = box.xyxy[0].tolist()
                    
                    output.append({
                        "label": label,
                        "confidence": round(confidence, 3),
                        "bbox": [round(c, 2) for c in coords],
                    })
                    spoken_labels.append(label)
                
                # Voice feedback
                if spoken_labels:
                    message = f"Detected: {', '.join(set(spoken_labels))}"
                    speak(message)
                else:
                    speak("No objects detected")
                
                elapsed = time.time() - start_time
                logger.info(f"[/detect] ✅ Processed in {elapsed:.2f}s - {len(output)} detections")
                
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "detections": output,
                        "count": len(output),
                        "timestamp": timestamp,
                        "processing_time": round(elapsed, 2),
                        "mode": "full"
                    }
                )
                
            except Exception as e:
                logger.error(f"[/detect] Inference error: {e}")
                raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
        
        # ===== FALLBACK MODE: Mock Data =====
        else:
            logger.warning(f"[/detect] Running in FALLBACK mode")
            
            mock_detections = [
                {"label": "ramp", "confidence": 0.85, "bbox": [100, 150, 300, 400]},
                {"label": "entrance", "confidence": 0.72, "bbox": [350, 200, 500, 450]},
            ]
            
            elapsed = time.time() - start_time
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "detections": mock_detections,
                    "count": len(mock_detections),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "processing_time": round(elapsed, 2),
                    "mode": "fallback",
                    "warning": model_load_error or "Model not loaded"
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/detect] Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Log configuration on startup"""
    logger.info("=" * 60)
    logger.info("AccessAtlas Backend Starting...")
    logger.info("=" * 60)
    logger.info(f"Mode: {'FULL STACK' if _HAS_FULL_STACK and model else 'FALLBACK'}")
    logger.info(f"Model loaded: {model is not None}")
    logger.info(f"TTS enabled: {config.ENABLE_TTS}")
    logger.info(f"CORS origins: {config.CORS_ORIGINS}")
    
    if model_load_error:
        logger.warning(f"⚠️  {model_load_error}")
    
    logger.info("=" * 60)

# ============================================================================
# Run with: uvicorn main_improved:app --host 0.0.0.0 --port 8000
# ============================================================================
