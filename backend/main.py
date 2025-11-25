from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Create FastAPI app (will be used in both full and fallback modes)
app = FastAPI(
    title="AccessAtlas Backend",
    description="YOLOv5 Object Detection API with Voice Feedback (fallback-capable)",
    version="1.0.0"
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Try to import heavy ML and TTS libraries. If unavailable, fall back to a lightweight
# mock implementation so `uvicorn main:app` works without installing torch/ultralytics.
_HAS_FULL_STACK = True
try:
    from ultralytics import YOLO  # type: ignore
    from PIL import Image  # type: ignore
    import io
    import threading
    import pyttsx3  # type: ignore

    logger.info("Full ML stack available; attempting to load model...")
    try:
        model = YOLO('yolov5su.pt')
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        model = None
except Exception as e:
    logger.warning(f"Full ML stack unavailable or import failed: {e}")
    _HAS_FULL_STACK = False
    model = None


def speak(text: str):
    """Speak text using pyttsx3 if available; otherwise just log."""
    if _HAS_FULL_STACK:
        try:
            def run():
                try:
                    engine = pyttsx3.init()
                    engine.say(text)
                    engine.runAndWait()
                except Exception as e:
                    logger.error(f"Voice playback error: {e}")
            threading.Thread(target=run, daemon=True).start()
        except Exception as e:
            logger.error(f"Failed to spawn TTS thread: {e}")
    else:
        logger.info(f"(mock speak) {text}")


@app.get("/health")
async def health_check():
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "stack": "full" if _HAS_FULL_STACK and model is not None else "mock",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    )


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    start_time = time.time()
    try:
        filename = getattr(file, 'filename', 'upload')
        logger.info(f"/detect request: {filename}")
        contents = await file.read()

        if _HAS_FULL_STACK and model is not None:
            # Real inference path
            try:
                image = Image.open(io.BytesIO(contents)).convert("RGB")
                results = model(image)
                boxes = results[0].boxes
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

                output = []
                spoken_labels = []

                if boxes is None or len(boxes) == 0:
                    speak("No objects detected")
                    return JSONResponse(content={"detections": [], "message": "No objects detected", "timestamp": timestamp})

                for box in boxes:
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    label = model.names[cls]
                    x1, x2 = int(box.xyxy[0][0]), int(box.xyxy[0][2])
                    center_x = (x1 + x2) // 2
                    width = image.width
                    position = (
                        "on the left" if center_x < width / 3 else
                        "on the right" if center_x > 2 * width / 3 else
                        "in the center"
                    )
                    directional_label = f"{label} {position}"
                    output.append({"label": label, "confidence": round(conf, 2), "position": position})
                    spoken_labels.append(directional_label)

                sentence = "I see " + ", ".join(spoken_labels)
                speak(sentence)
                return JSONResponse(content={"detections": output, "spoken": sentence, "count": len(output)})
            except Exception as e:
                logger.error(f"Real inference failed: {e}", exc_info=True)
                return JSONResponse(status_code=500, content={"error": str(e)})
        else:
            # Mock response path
            mock = {
                "detections": [
                    {"label": "person", "confidence": 0.92, "bbox": [50, 40, 200, 300]},
                    {"label": "bottle", "confidence": 0.76, "bbox": [220, 180, 260, 310]}
                ],
                "spoken": "Detected 2 objects: person and bottle.",
                "count": 2
            }
            speak("Detected 2 objects: person and bottle.")
            return JSONResponse(content=mock)
    except Exception as e:
        logger.error(f"Detection failed: {e}", exc_info=True)
        speak("An error occurred during detection")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/voice")
async def voice(text: str):
    if not text or text.strip() == "":
        return JSONResponse(status_code=400, content={"error": "Text cannot be empty"})
    speak(text)
    return JSONResponse(status_code=200, content={"status": "speaking", "text": text})


@app.get("/models")
async def list_models():
    available_models = ['yolov5n', 'yolov5s', 'yolov5m', 'yolov5l', 'yolov5x', 'yolov5su']
    current_model = 'yolov5su' if model is None else getattr(model, 'model_name', 'yolov5su')
    return JSONResponse(status_code=200, content={"available_models": available_models, "current_model": current_model})


@app.post("/model/switch")
async def switch_model(model_name: str):
    if not model_name:
        return JSONResponse(status_code=400, content={"error": "model_name is required"})
    if not _HAS_FULL_STACK:
        return JSONResponse(status_code=501, content={"error": "Model switching requires full stack (torch/ultralytics)"})
    try:
        global model
        model = YOLO(f"{model_name}.pt")
        return JSONResponse(status_code=200, content={"status": "switched", "model": model_name})
    except Exception as e:
        logger.error(f"Failed to switch model: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/info")
async def get_info():
    return JSONResponse(status_code=200, content={
        "name": "AccessAtlas Backend",
        "version": "1.0.0",
        "mode": "full" if _HAS_FULL_STACK and model is not None else "mock",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    })