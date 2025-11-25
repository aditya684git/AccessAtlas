"""
Evaluation script for AccessAtlas baseline model.
"""

import os
import yaml
import torch
import numpy as np
from tqdm import tqdm
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
import matplotlib.pyplot as plt
import seaborn as sns
import json
from datetime import datetime
from PIL import Image

from model import get_model
from dataset import get_dataloaders


class Evaluator:
    """
    Evaluator class for model evaluation and error analysis.
    """
    
    def __init__(self, config, checkpoint_path):
        self.config = config
        self.device = torch.device(config['device'] if torch.cuda.is_available() else 'cpu')
        
        # Load model
        self.model = get_model(config).to(self.device)
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()
        
        print(f"Model loaded from: {checkpoint_path}")
        print(f"Epoch: {checkpoint['epoch']}, Best Val Acc: {checkpoint['best_val_acc']:.2f}%")
        
        self.tag_types = config['tag_types']
        self.error_dir = config['logging']['error_dir']
        os.makedirs(self.error_dir, exist_ok=True)
    
    def evaluate(self, data_loader, split='test'):
        """
        Evaluate model on a dataset.
        
        Returns:
            metrics: Dictionary of evaluation metrics
            predictions: List of (label, predicted, confidence, info)
        """
        all_labels = []
        all_predictions = []
        all_confidences = []
        all_infos = []
        
        with torch.no_grad():
            pbar = tqdm(data_loader, desc=f"Evaluating [{split}]")
            for batch in pbar:
                # Move to device
                images = batch['image'].to(self.device)
                lat = batch['lat'].to(self.device)
                lon = batch['lon'].to(self.device)
                source_onehot = batch['source_onehot'].to(self.device)
                labels = batch['label'].to(self.device)
                
                # Forward pass
                outputs = self.model(images, lat, lon, source_onehot)
                probs = torch.softmax(outputs, dim=1)
                confidences, predicted = probs.max(1)
                
                # Store results
                all_labels.extend(labels.cpu().numpy())
                all_predictions.extend(predicted.cpu().numpy())
                all_confidences.extend(confidences.cpu().numpy())
                
                # Handle batch['info'] - convert dict of lists to list of dicts
                batch_size = len(labels)
                for i in range(batch_size):
                    info_dict = {key: batch['info'][key][i] if isinstance(batch['info'][key], list) else batch['info'][key] 
                                 for key in batch['info'].keys()}
                    all_infos.append(info_dict)
        
        # Convert to numpy arrays
        all_labels = np.array(all_labels)
        all_predictions = np.array(all_predictions)
        all_confidences = np.array(all_confidences)
        
        # Calculate metrics
        accuracy = 100.0 * np.mean(all_labels == all_predictions)
        
        # Per-class metrics
        precision, recall, f1, support = precision_recall_fscore_support(
            all_labels, all_predictions, average=None, zero_division=0
        )
        
        # Confusion matrix
        cm = confusion_matrix(all_labels, all_predictions)
        
        # Aggregate metrics
        macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(
            all_labels, all_predictions, average='macro', zero_division=0
        )
        
        metrics = {
            'accuracy': accuracy,
            'macro_precision': macro_precision * 100,
            'macro_recall': macro_recall * 100,
            'macro_f1': macro_f1 * 100,
            'per_class': {
                self.tag_types[i]: {
                    'precision': precision[i] * 100,
                    'recall': recall[i] * 100,
                    'f1': f1[i] * 100,
                    'support': int(support[i])
                }
                for i in range(len(self.tag_types))
            },
            'confusion_matrix': cm.tolist()
        }
        
        # Create predictions list
        predictions = [
            {
                'label': int(all_labels[i]),
                'predicted': int(all_predictions[i]),
                'confidence': float(all_confidences[i]),
                'correct': bool(all_labels[i] == all_predictions[i]),
                'info': all_infos[i]
            }
            for i in range(len(all_labels))
        ]
        
        return metrics, predictions
    
    def print_metrics(self, metrics, split='test'):
        """
        Pretty print evaluation metrics.
        """
        print(f"\n{'='*70}")
        print(f"{split.upper()} SET EVALUATION RESULTS")
        print(f"{'='*70}\n")
        
        print(f"Overall Accuracy: {metrics['accuracy']:.2f}%")
        print(f"Macro Precision:  {metrics['macro_precision']:.2f}%")
        print(f"Macro Recall:     {metrics['macro_recall']:.2f}%")
        print(f"Macro F1-Score:   {metrics['macro_f1']:.2f}%")
        
        print(f"\n{'='*70}")
        print("PER-CLASS METRICS")
        print(f"{'='*70}\n")
        
        print(f"{'Class':<15} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'Support':>10}")
        print(f"{'-'*70}")
        
        for tag_type, class_metrics in metrics['per_class'].items():
            print(f"{tag_type:<15} "
                  f"{class_metrics['precision']:>9.2f}% "
                  f"{class_metrics['recall']:>9.2f}% "
                  f"{class_metrics['f1']:>9.2f}% "
                  f"{class_metrics['support']:>10}")
        
        print(f"{'='*70}\n")
    
    def plot_confusion_matrix(self, cm, split='test'):
        """
        Plot and save confusion matrix.
        """
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=self.tag_types,
            yticklabels=self.tag_types
        )
        plt.title(f'Confusion Matrix - {split.upper()} Set')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_path = os.path.join(self.error_dir, f'confusion_matrix_{split}_{timestamp}.png')
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Confusion matrix saved: {save_path}")
        plt.close()
    
    def analyze_errors(self, predictions, split='test', top_k=20):
        """
        Analyze and save misclassified samples.
        """
        # Filter misclassified samples
        errors = [p for p in predictions if not p['correct']]
        
        if len(errors) == 0:
            print("No misclassified samples found!")
            return
        
        print(f"\nFound {len(errors)} misclassified samples")
        
        # Sort by confidence (most confident errors first)
        errors.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Save error analysis
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        error_json_path = os.path.join(
            self.error_dir,
            f'error_analysis_{split}_{timestamp}.json'
        )
        
        error_data = {
            'total_errors': len(errors),
            'total_samples': len(predictions),
            'error_rate': len(errors) / len(predictions) * 100,
            'top_k_errors': errors[:top_k]
        }
        
        with open(error_json_path, 'w') as f:
            json.dump(error_data, f, indent=2, default=str)
        
        print(f"Error analysis saved: {error_json_path}")
        
        # Save error breakdown by class
        error_by_class = {}
        for error in errors:
            true_label = self.tag_types[error['label']]
            pred_label = self.tag_types[error['predicted']]
            key = f"{true_label} -> {pred_label}"
            error_by_class[key] = error_by_class.get(key, 0) + 1
        
        print(f"\nTop error patterns:")
        sorted_errors = sorted(error_by_class.items(), key=lambda x: x[1], reverse=True)
        for pattern, count in sorted_errors[:10]:
            print(f"  {pattern}: {count} samples")
        
        # Optionally copy misclassified images to error directory
        if self.config['evaluation']['save_misclassified']:
            self.save_misclassified_images(errors[:top_k], split)
    
    def save_misclassified_images(self, errors, split='test'):
        """
        Copy misclassified images to error directory for manual inspection.
        """
        error_images_dir = os.path.join(self.error_dir, f'images_{split}')
        os.makedirs(error_images_dir, exist_ok=True)
        
        for i, error in enumerate(errors):
            info = error['info']
            true_label = self.tag_types[error['label']]
            pred_label = self.tag_types[error['predicted']]
            confidence = error['confidence']
            
            # Source image path
            src_path = os.path.join(
                self.config['data']['images_dir'],
                info['image_path']
            )
            
            # Destination filename
            dst_filename = f"{i+1:03d}_true_{true_label}_pred_{pred_label}_conf_{confidence:.2f}.jpg"
            dst_path = os.path.join(error_images_dir, dst_filename)
            
            # Copy image
            try:
                img = Image.open(src_path)
                img.save(dst_path)
            except Exception as e:
                print(f"Failed to copy {src_path}: {e}")
        
        print(f"Misclassified images saved to: {error_images_dir}")
    
    def save_metrics(self, metrics, split='test'):
        """
        Save metrics to JSON file.
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        metrics_path = os.path.join(
            self.error_dir,
            f'metrics_{split}_{timestamp}.json'
        )
        
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        print(f"Metrics saved: {metrics_path}")


def main():
    """
    Main evaluation function.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate AccessAtlas model')
    parser.add_argument(
        '--checkpoint',
        type=str,
        default='checkpoints/best_model.pth',
        help='Path to model checkpoint'
    )
    parser.add_argument(
        '--split',
        type=str,
        default='test',
        choices=['train', 'val', 'test'],
        help='Dataset split to evaluate'
    )
    parser.add_argument(
        '--config',
        type=str,
        default='config.yaml',
        help='Path to config file'
    )
    
    args = parser.parse_args()
    
    # Load config
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Get dataloaders
    print("Loading datasets...")
    train_loader, val_loader, test_loader = get_dataloaders(config)
    
    # Select appropriate loader
    if args.split == 'train':
        data_loader = train_loader
    elif args.split == 'val':
        data_loader = val_loader
    else:
        data_loader = test_loader
    
    # Initialize evaluator
    evaluator = Evaluator(config, args.checkpoint)
    
    # Evaluate
    metrics, predictions = evaluator.evaluate(data_loader, split=args.split)
    
    # Print results
    evaluator.print_metrics(metrics, split=args.split)
    
    # Plot confusion matrix
    if config['evaluation']['confusion_matrix']:
        cm = np.array(metrics['confusion_matrix'])
        evaluator.plot_confusion_matrix(cm, split=args.split)
    
    # Error analysis
    if config['evaluation']['save_misclassified']:
        evaluator.analyze_errors(
            predictions,
            split=args.split,
            top_k=config['evaluation']['top_k_errors']
        )
    
    # Save metrics
    evaluator.save_metrics(metrics, split=args.split)


if __name__ == "__main__":
    main()
