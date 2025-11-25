"""
Batch Inference Script for Model-Generated Tags

This script loads map tile images and runs inference using the trained accessibility model
to generate predictions that can be displayed on the map.

Usage:
    python batch_infer_model_tags.py --checkpoint ../models/baseline/checkpoints/best_model.pth \
                                      --images ../archive/vizwiz_data_ver1/data/images \
                                      --output ../data/model_predictions.json \
                                      --min-confidence 0.5
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import List, Dict, Any
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
from tqdm import tqdm
import random
import yaml
import requests
import time

# Add baseline model directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'models' / 'baseline'))
from model import get_model

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Label mapping (update to match your model)
LABEL_MAP = {
    0: 'ramp',
    1: 'elevator',
    2: 'tactile_path',
    3: 'entrance',
    4: 'obstacle'
}

# Reverse mapping for display names
DISPLAY_NAMES = {
    'ramp': 'Ramp',
    'elevator': 'Elevator',
    'tactile_path': 'Tactile Path',
    'entrance': 'Entrance',
    'obstacle': 'Obstacle'
}


def load_model(checkpoint_path: Path, device: torch.device) -> nn.Module:
    """Load trained model from checkpoint"""
    logger.info(f"Loading model from {checkpoint_path}")
    
    try:
        # Load config
        config_path = Path(__file__).parent.parent / 'models' / 'baseline' / 'config.yaml'
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Create model from config
        model = get_model(config)
        checkpoint = torch.load(checkpoint_path, map_location=device)
        
        # Handle different checkpoint formats
        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
                logger.info(f"Loaded from epoch {checkpoint.get('epoch', 'unknown')}")
            else:
                model.load_state_dict(checkpoint)
        else:
            model.load_state_dict(checkpoint)
        
        model.to(device)
        model.eval()
        logger.info("Model loaded successfully")
        return model
    
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


def get_image_transform() -> transforms.Compose:
    """Get image preprocessing transforms"""
    return transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                           std=[0.229, 0.224, 0.225])
    ])


def fetch_address(lat: float, lon: float) -> str:
    """
    Fetch address from Nominatim reverse geocoding
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1
        }
        headers = {"User-Agent": "AccessAtlas/1.0"}
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            address = data.get('display_name', '')
            if address:
                # Shorten the address
                parts = address.split(', ')
                if len(parts) > 3:
                    return ', '.join(parts[:3])
                return address
        
        time.sleep(1)  # Rate limiting
        return None
    
    except Exception as e:
        logger.warning(f"Failed to fetch address for ({lat}, {lon}): {e}")
        return None


def extract_coords_from_filename(filename: str) -> tuple:
    """
    Extract coordinates from filename
    Expected format: tile_LAT_LON.png or similar
    Returns random coordinates if extraction fails
    """
    try:
        # Try to parse filename like "tile_34.67_-82.48.png"
        parts = filename.replace('.png', '').replace('.jpg', '').split('_')
        if len(parts) >= 3:
            lat = float(parts[-2])
            lon = float(parts[-1])
            return lat, lon
    except:
        pass
    
    # Return random coordinates near Clemson, SC
    base_lat = 34.67
    base_lon = -82.48
    lat = base_lat + random.uniform(-0.05, 0.05)
    lon = base_lon + random.uniform(-0.05, 0.05)
    return lat, lon


def run_inference(
    model: nn.Module,
    image_path: Path,
    transform: transforms.Compose,
    device: torch.device
) -> tuple:
    """
    Run inference on a single image
    Returns: (predicted_class, confidence, lat, lon)
    """
    try:
        # Load and preprocess image
        image = Image.open(image_path).convert('RGB')
        image_tensor = transform(image).unsqueeze(0).to(device)
        
        # Extract coordinates from filename
        lat, lon = extract_coords_from_filename(image_path.name)
        
        # Create metadata tensors
        lat_tensor = torch.tensor([[lat]], dtype=torch.float32).to(device)
        lon_tensor = torch.tensor([[lon]], dtype=torch.float32).to(device)
        # Source: model=2 (0=user, 1=osm, 2=model)
        source_onehot = torch.tensor([[0, 0, 1]], dtype=torch.float32).to(device)
        
        # Run inference
        with torch.no_grad():
            output = model(image_tensor, lat_tensor, lon_tensor, source_onehot)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted = torch.max(probabilities, dim=1)
        
        predicted_class = predicted.item()
        confidence_score = confidence.item()
        
        return predicted_class, confidence_score, lat, lon
    
    except Exception as e:
        logger.warning(f"Failed to process {image_path.name}: {e}")
        return None, None, None, None


def batch_inference(
    checkpoint_path: Path,
    image_dir: Path,
    output_path: Path,
    min_confidence: float = 0.5,
    max_images: int = None
) -> List[Dict[str, Any]]:
    """
    Run batch inference on all images in directory
    """
    # Setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    # Load model
    model = load_model(checkpoint_path, device)
    transform = get_image_transform()
    
    # Get image files
    image_extensions = ['.png', '.jpg', '.jpeg']
    image_files = []
    for ext in image_extensions:
        image_files.extend(image_dir.glob(f'*{ext}'))
    
    if not image_files:
        logger.error(f"No images found in {image_dir}")
        return []
    
    logger.info(f"Found {len(image_files)} images")
    
    # Limit number of images if specified
    if max_images:
        image_files = random.sample(image_files, min(max_images, len(image_files)))
        logger.info(f"Randomly selected {len(image_files)} images for inference")
    
    # Run inference
    predictions = []
    filtered_count = 0
    
    for image_path in tqdm(image_files, desc="Running inference"):
        predicted_class, confidence, lat, lon = run_inference(
            model, image_path, transform, device
        )
        
        if predicted_class is None:
            continue
        
        # Filter by confidence
        if confidence < min_confidence:
            filtered_count += 1
            continue
        
        # Fetch address
        address = fetch_address(lat, lon)
        
        # Create tag object
        tag = {
            "id": f"model-{len(predictions)}",
            "type": DISPLAY_NAMES.get(LABEL_MAP.get(predicted_class, 'ramp'), 'Ramp'),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "source": "model",
            "confidence": round(confidence, 3),
            "timestamp": None,  # Will be set by frontend
            "image_path": str(image_path.name)
        }
        
        if address:
            tag["address"] = address
        
        predictions.append(tag)
    
    # Save results
    logger.info(f"Generated {len(predictions)} predictions")
    logger.info(f"Filtered out {filtered_count} low-confidence predictions (< {min_confidence})")
    
    # Count by type
    type_counts = {}
    for pred in predictions:
        pred_type = pred['type']
        type_counts[pred_type] = type_counts.get(pred_type, 0) + 1
    
    logger.info("Predictions by type:")
    for pred_type, count in sorted(type_counts.items()):
        logger.info(f"  {pred_type}: {count}")
    
    # Save to JSON
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(predictions, f, indent=2)
    
    logger.info(f"Saved predictions to {output_path}")
    
    return predictions


def main():
    parser = argparse.ArgumentParser(
        description="Run batch inference to generate model-predicted accessibility tags"
    )
    parser.add_argument(
        '--checkpoint',
        type=str,
        default='../models/baseline/checkpoints/best_model.pth',
        help='Path to model checkpoint'
    )
    parser.add_argument(
        '--images',
        type=str,
        default='../archive/vizwiz_data_ver1/data/images',
        help='Directory containing map tile images'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='../data/model_predictions.json',
        help='Output JSON file path'
    )
    parser.add_argument(
        '--min-confidence',
        type=float,
        default=0.5,
        help='Minimum confidence threshold (0-1)'
    )
    parser.add_argument(
        '--max-images',
        type=int,
        default=None,
        help='Maximum number of images to process (default: all)'
    )
    
    args = parser.parse_args()
    
    # Convert to Path objects
    checkpoint_path = Path(args.checkpoint)
    image_dir = Path(args.images)
    output_path = Path(args.output)
    
    # Validate paths
    if not checkpoint_path.exists():
        logger.error(f"Checkpoint not found: {checkpoint_path}")
        sys.exit(1)
    
    if not image_dir.exists():
        logger.error(f"Image directory not found: {image_dir}")
        sys.exit(1)
    
    # Run inference
    try:
        predictions = batch_inference(
            checkpoint_path=checkpoint_path,
            image_dir=image_dir,
            output_path=output_path,
            min_confidence=args.min_confidence,
            max_images=args.max_images
        )
        
        logger.info("✅ Batch inference completed successfully!")
        logger.info(f"Generated {len(predictions)} tags")
        
    except Exception as e:
        logger.error(f"❌ Batch inference failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
