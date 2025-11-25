"""
Backend configuration management with deployment-safe defaults
"""
import os
from pathlib import Path
from typing import List

class Config:
    """Configuration class with environment variable support"""
    
    # Base paths
    BASE_DIR = Path(__file__).resolve().parent
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Model settings
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./yolov5su.pt")
    MODEL_CONFIDENCE_THRESHOLD: float = float(os.getenv("MODEL_CONFIDENCE_THRESHOLD", "0.5"))
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    
    # CORS settings
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:8080"
    ).split(",")
    
    # Feature flags
    ENABLE_TTS: bool = os.getenv("ENABLE_TTS", "true").lower() == "true"
    ENABLE_VOICE_FEEDBACK: bool = os.getenv("ENABLE_VOICE_FEEDBACK", "true").lower() == "true"
    FALLBACK_MODE: bool = os.getenv("FALLBACK_MODE", "false").lower() == "true"
    
    # Platform detection
    PLATFORM: str = os.getenv("PLATFORM", "local")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    @classmethod
    def get_model_path(cls) -> Path:
        """
        Get absolute path to model file with deployment-safe resolution
        
        Priority order:
        1. Absolute path from environment variable
        2. Relative to backend directory
        3. Relative to current working directory
        """
        model_path = Path(cls.MODEL_PATH)
        
        # If absolute path exists, use it
        if model_path.is_absolute() and model_path.exists():
            return model_path
        
        # Try relative to BASE_DIR (backend/)
        relative_to_base = cls.BASE_DIR / cls.MODEL_PATH
        if relative_to_base.exists():
            return relative_to_base
        
        # Try relative to current working directory
        relative_to_cwd = Path.cwd() / cls.MODEL_PATH
        if relative_to_cwd.exists():
            return relative_to_cwd
        
        # If nothing found, raise error with helpful message
        raise FileNotFoundError(
            f"Model file not found at: {cls.MODEL_PATH}\n"
            f"Searched locations:\n"
            f"  1. {model_path}\n"
            f"  2. {relative_to_base}\n"
            f"  3. {relative_to_cwd}\n"
            f"Please ensure yolov5su.pt is present or set MODEL_PATH environment variable."
        )
    
    @classmethod
    def validate(cls) -> dict:
        """Validate configuration and return status"""
        status = {
            "valid": True,
            "warnings": [],
            "errors": []
        }
        
        # Check model file
        try:
            model_path = cls.get_model_path()
            model_size_mb = model_path.stat().st_size / (1024 * 1024)
            
            if model_size_mb > 100:
                status["warnings"].append(
                    f"Model file is {model_size_mb:.1f}MB. "
                    f"Some platforms (e.g., Render free tier) have 100MB limit. "
                    f"Consider using smaller model (yolov5n.pt or yolov5s.pt)."
                )
        except FileNotFoundError as e:
            status["valid"] = False
            status["errors"].append(str(e))
        
        # Check platform-specific requirements
        if cls.PLATFORM == "render" and cls.ENABLE_TTS:
            status["warnings"].append(
                "TTS (pyttsx3) may not work on Render due to system dependencies. "
                "Set ENABLE_TTS=false for Render deployment."
            )
        
        return status

# Global config instance
config = Config()
