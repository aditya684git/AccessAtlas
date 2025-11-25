"""
Inference script for making predictions on new images.
"""

import os
import yaml
import torch
from PIL import Image
import numpy as np

from model import get_model
from dataset import get_transforms


class Predictor:
    """
    Predictor class for making predictions on new images.
    """
    
    def __init__(self, config_path='config.yaml', checkpoint_path='checkpoints/best_model.pth'):
        """
        Initialize predictor with config and checkpoint.
        """
        # Load config
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.device = torch.device(self.config['device'] if torch.cuda.is_available() else 'cpu')
        self.tag_types = self.config['tag_types']
        self.source_types = self.config['source_types']
        
        # Load model
        self.model = get_model(self.config).to(self.device)
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()
        
        # Get transforms
        self.transform = get_transforms(self.config, split='test')
        
        print(f"✅ Predictor initialized")
        print(f"   Device: {self.device}")
        print(f"   Model: {checkpoint_path}")
        print(f"   Epoch: {checkpoint.get('epoch', 'unknown')}")
        print(f"   Best Val Acc: {checkpoint.get('best_val_acc', 'unknown'):.2f}%\n")
    
    def predict_single(self, image_path, lat, lon, source='user', return_probs=False):
        """
        Make prediction for a single image.
        
        Args:
            image_path: Path to image file
            lat: Latitude (float)
            lon: Longitude (float)
            source: Source type ('user', 'osm', 'model')
            return_probs: If True, return class probabilities
        
        Returns:
            prediction: dict with predicted class, confidence, and optionally probabilities
        """
        # Load and preprocess image
        try:
            image = Image.open(image_path).convert('RGB')
        except Exception as e:
            return {'error': f"Failed to load image: {e}"}
        
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # Prepare metadata
        lat_tensor = torch.tensor([[lat]], dtype=torch.float32).to(self.device)
        lon_tensor = torch.tensor([[lon]], dtype=torch.float32).to(self.device)
        
        # One-hot encode source
        source_onehot = torch.zeros(1, len(self.source_types), dtype=torch.float32)
        if source in self.source_types:
            source_idx = self.source_types.index(source)
            source_onehot[0, source_idx] = 1.0
        source_onehot = source_onehot.to(self.device)
        
        # Predict
        with torch.no_grad():
            outputs = self.model(image_tensor, lat_tensor, lon_tensor, source_onehot)
            probs = torch.softmax(outputs, dim=1)
            confidence, predicted = probs.max(1)
        
        # Prepare result
        predicted_class = self.tag_types[predicted.item()]
        confidence_value = confidence.item()
        
        result = {
            'predicted_class': predicted_class,
            'confidence': confidence_value,
            'image_path': image_path,
            'metadata': {
                'lat': lat,
                'lon': lon,
                'source': source
            }
        }
        
        if return_probs:
            result['probabilities'] = {
                self.tag_types[i]: probs[0, i].item()
                for i in range(len(self.tag_types))
            }
        
        return result
    
    def predict_batch(self, samples):
        """
        Make predictions for multiple samples.
        
        Args:
            samples: List of dicts with keys: 'image_path', 'lat', 'lon', 'source'
        
        Returns:
            predictions: List of prediction dicts
        """
        predictions = []
        
        for sample in samples:
            result = self.predict_single(
                sample['image_path'],
                sample['lat'],
                sample['lon'],
                sample.get('source', 'user')
            )
            predictions.append(result)
        
        return predictions
    
    def print_prediction(self, result):
        """
        Pretty print a prediction result.
        """
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            return
        
        print(f"{'='*70}")
        print(f"📍 Prediction Result")
        print(f"{'='*70}")
        print(f"Image:      {result['image_path']}")
        print(f"Predicted:  {result['predicted_class']}")
        print(f"Confidence: {result['confidence']*100:.2f}%")
        print(f"Location:   ({result['metadata']['lat']:.6f}, {result['metadata']['lon']:.6f})")
        print(f"Source:     {result['metadata']['source']}")
        
        if 'probabilities' in result:
            print(f"\nClass Probabilities:")
            sorted_probs = sorted(result['probabilities'].items(), 
                                 key=lambda x: x[1], reverse=True)
            for class_name, prob in sorted_probs:
                bar = '█' * int(prob * 50)
                print(f"  {class_name:<15} {prob*100:>6.2f}% {bar}")
        
        print(f"{'='*70}\n")


def main():
    """
    Command-line interface for inference.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Make predictions with AccessAtlas model')
    parser.add_argument('image_path', type=str, help='Path to image file')
    parser.add_argument('--lat', type=float, required=True, help='Latitude')
    parser.add_argument('--lon', type=float, required=True, help='Longitude')
    parser.add_argument('--source', type=str, default='user', 
                       choices=['user', 'osm', 'model'],
                       help='Source type')
    parser.add_argument('--checkpoint', type=str, default='checkpoints/best_model.pth',
                       help='Path to model checkpoint')
    parser.add_argument('--config', type=str, default='config.yaml',
                       help='Path to config file')
    parser.add_argument('--probs', action='store_true',
                       help='Show class probabilities')
    
    args = parser.parse_args()
    
    # Initialize predictor
    predictor = Predictor(args.config, args.checkpoint)
    
    # Make prediction
    result = predictor.predict_single(
        args.image_path,
        args.lat,
        args.lon,
        args.source,
        return_probs=args.probs
    )
    
    # Print result
    predictor.print_prediction(result)


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) == 1:
        # Demo mode
        print("Demo: Testing predictor with synthetic data\n")
        
        predictor = Predictor()
        
        # Create sample prediction
        sample = {
            'image_path': '../../data/images/sample_001.jpg',
            'lat': 34.670123,
            'lon': -82.480456,
            'source': 'user'
        }
        
        if os.path.exists(sample['image_path']):
            result = predictor.predict_single(
                sample['image_path'],
                sample['lat'],
                sample['lon'],
                sample['source'],
                return_probs=True
            )
            predictor.print_prediction(result)
        else:
            print(f"Sample image not found: {sample['image_path']}")
            print("\nUsage:")
            print("  python predict.py <image_path> --lat <lat> --lon <lon> [--source user/osm/model] [--probs]")
            print("\nExample:")
            print("  python predict.py my_image.jpg --lat 34.67 --lon -82.48 --source user --probs")
    else:
        main()
