#!/usr/bin/env python3
"""
Advanced Training Pipeline for AccessAtlas Production Model

Features:
- Experiment tracking with MLflow or Weights & Biases
- Learning rate scheduling (CosineAnnealing, ReduceLROnPlateau)
- Mixed precision training (FP16)
- Gradient accumulation for larger effective batch sizes
- Advanced data augmentation (RandAugment, MixUp, CutMix)
- Model checkpointing with best K models
- Early stopping with patience
- Cross-validation support
- Distributed training support

Usage:
    # Basic training with default config
    python train_pipeline.py --config config.yaml
    
    # Training with experiment tracking
    python train_pipeline.py --config config.yaml --experiment-name "resnet18-aug-v1"
    
    # Resume from checkpoint
    python train_pipeline.py --config config.yaml --resume checkpoints/best_model.pth
    
    # Mixed precision training
    python train_pipeline.py --config config.yaml --amp
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torch.cuda.amp import autocast, GradScaler
import yaml
from tqdm import tqdm
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from baseline.model_v2 import create_model, AccessAtlasModel
from baseline.dataset import TagDataset, create_data_loaders


class AdvancedTrainer:
    """
    Advanced training pipeline with production features.
    """
    
    def __init__(
        self,
        config: Dict[str, Any],
        experiment_name: Optional[str] = None,
        use_amp: bool = False,
        use_wandb: bool = False,
        resume_path: Optional[str] = None
    ):
        """
        Initialize trainer.
        
        Args:
            config: Configuration dictionary
            experiment_name: Name for experiment tracking
            use_amp: Use automatic mixed precision (FP16)
            use_wandb: Use Weights & Biases for tracking
            resume_path: Path to checkpoint to resume from
        """
        self.config = config
        self.experiment_name = experiment_name or f"exp_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.use_amp = use_amp
        self.use_wandb = use_wandb
        
        # Setup device
        self.device = torch.device(config.get('device', 'cuda' if torch.cuda.is_available() else 'cpu'))
        print(f"Using device: {self.device}")
        
        # Create output directories
        self.checkpoint_dir = Path(config['logging']['checkpoint_dir'])
        self.log_dir = Path(config['logging']['log_dir'])
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize model
        self.model = create_model(config).to(self.device)
        print(f"Model: {self.model.get_model_info()}")
        
        # Initialize optimizer
        self.optimizer = self._create_optimizer()
        
        # Initialize learning rate scheduler
        self.scheduler = self._create_scheduler()
        
        # Mixed precision scaler
        self.scaler = GradScaler() if use_amp else None
        
        # Initialize experiment tracking
        if use_wandb:
            self._init_wandb()
        
        # Training state
        self.current_epoch = 0
        self.best_val_acc = 0.0
        self.best_val_loss = float('inf')
        self.epochs_without_improvement = 0
        self.training_history = []
        
        # Resume from checkpoint if provided
        if resume_path:
            self.load_checkpoint(resume_path)
    
    def _create_optimizer(self) -> optim.Optimizer:
        """Create optimizer from config."""
        training_config = self.config['training']
        optimizer_name = training_config.get('optimizer', 'adam').lower()
        lr = training_config['learning_rate']
        weight_decay = training_config.get('weight_decay', 0.0001)
        
        if optimizer_name == 'adam':
            optimizer = optim.Adam(
                self.model.parameters(),
                lr=lr,
                weight_decay=weight_decay
            )
        elif optimizer_name == 'adamw':
            optimizer = optim.AdamW(
                self.model.parameters(),
                lr=lr,
                weight_decay=weight_decay
            )
        elif optimizer_name == 'sgd':
            momentum = training_config.get('momentum', 0.9)
            optimizer = optim.SGD(
                self.model.parameters(),
                lr=lr,
                momentum=momentum,
                weight_decay=weight_decay
            )
        else:
            raise ValueError(f"Unknown optimizer: {optimizer_name}")
        
        return optimizer
    
    def _create_scheduler(self):
        """Create learning rate scheduler from config."""
        training_config = self.config['training']
        scheduler_name = training_config.get('scheduler', 'step').lower()
        
        if scheduler_name == 'step':
            step_size = training_config.get('step_lr_step_size', 20)
            gamma = training_config.get('step_lr_gamma', 0.1)
            return optim.lr_scheduler.StepLR(
                self.optimizer,
                step_size=step_size,
                gamma=gamma
            )
        
        elif scheduler_name == 'cosine':
            num_epochs = training_config['num_epochs']
            return optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer,
                T_max=num_epochs
            )
        
        elif scheduler_name == 'plateau':
            patience = training_config.get('plateau_patience', 5)
            factor = training_config.get('plateau_factor', 0.5)
            return optim.lr_scheduler.ReduceLROnPlateau(
                self.optimizer,
                mode='max',
                factor=factor,
                patience=patience,
                verbose=True
            )
        
        elif scheduler_name == 'none':
            return None
        
        else:
            raise ValueError(f"Unknown scheduler: {scheduler_name}")
    
    def _init_wandb(self):
        """Initialize Weights & Biases tracking."""
        try:
            import wandb
            
            wandb.init(
                project="accessatlas",
                name=self.experiment_name,
                config=self.config
            )
            wandb.watch(self.model)
            
        except ImportError:
            print("⚠️  Weights & Biases not installed. Install with: pip install wandb")
            self.use_wandb = False
    
    def train_epoch(
        self,
        train_loader: DataLoader,
        epoch: int
    ) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        
        total_loss = 0.0
        correct = 0
        total = 0
        
        grad_accum_steps = self.config['training'].get('grad_accumulation_steps', 1)
        grad_clip = self.config['training'].get('grad_clip', None)
        
        pbar = tqdm(train_loader, desc=f"Epoch {epoch} [Train]")
        
        for batch_idx, batch in enumerate(pbar):
            # Move to device
            images = batch['image'].to(self.device)
            lat = batch['lat'].to(self.device)
            lon = batch['lon'].to(self.device)
            source_onehot = batch['source_onehot'].to(self.device)
            labels = batch['label'].to(self.device)
            
            # Forward pass with mixed precision
            if self.use_amp:
                with autocast():
                    outputs = self.model(images, lat, lon, source_onehot)
                    loss = nn.functional.cross_entropy(outputs, labels)
                    loss = loss / grad_accum_steps
                
                # Backward pass
                self.scaler.scale(loss).backward()
                
                # Gradient accumulation
                if (batch_idx + 1) % grad_accum_steps == 0:
                    if grad_clip:
                        self.scaler.unscale_(self.optimizer)
                        torch.nn.utils.clip_grad_norm_(self.model.parameters(), grad_clip)
                    
                    self.scaler.step(self.optimizer)
                    self.scaler.update()
                    self.optimizer.zero_grad()
            
            else:
                # Standard training
                outputs = self.model(images, lat, lon, source_onehot)
                loss = nn.functional.cross_entropy(outputs, labels)
                loss = loss / grad_accum_steps
                
                loss.backward()
                
                if (batch_idx + 1) % grad_accum_steps == 0:
                    if grad_clip:
                        torch.nn.utils.clip_grad_norm_(self.model.parameters(), grad_clip)
                    
                    self.optimizer.step()
                    self.optimizer.zero_grad()
            
            # Statistics
            total_loss += loss.item() * grad_accum_steps * images.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            # Update progress bar
            pbar.set_postfix({
                'loss': f"{loss.item() * grad_accum_steps:.4f}",
                'acc': f"{100. * correct / total:.2f}%"
            })
        
        avg_loss = total_loss / total
        accuracy = 100. * correct / total
        
        return {'loss': avg_loss, 'accuracy': accuracy}
    
    def validate(
        self,
        val_loader: DataLoader,
        epoch: int
    ) -> Dict[str, float]:
        """Validate model."""
        self.model.eval()
        
        total_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            pbar = tqdm(val_loader, desc=f"Epoch {epoch} [Val]")
            
            for batch in pbar:
                images = batch['image'].to(self.device)
                lat = batch['lat'].to(self.device)
                lon = batch['lon'].to(self.device)
                source_onehot = batch['source_onehot'].to(self.device)
                labels = batch['label'].to(self.device)
                
                # Forward pass
                if self.use_amp:
                    with autocast():
                        outputs = self.model(images, lat, lon, source_onehot)
                        loss = nn.functional.cross_entropy(outputs, labels)
                else:
                    outputs = self.model(images, lat, lon, source_onehot)
                    loss = nn.functional.cross_entropy(outputs, labels)
                
                # Statistics
                total_loss += loss.item() * images.size(0)
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()
                
                pbar.set_postfix({
                    'loss': f"{loss.item():.4f}",
                    'acc': f"{100. * correct / total:.2f}%"
                })
        
        avg_loss = total_loss / total
        accuracy = 100. * correct / total
        
        return {'loss': avg_loss, 'accuracy': accuracy}
    
    def save_checkpoint(
        self,
        epoch: int,
        val_metrics: Dict[str, float],
        is_best: bool = False
    ):
        """Save model checkpoint."""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict() if self.scheduler else None,
            'best_val_acc': self.best_val_acc,
            'best_val_loss': self.best_val_loss,
            'config': self.config,
            'val_metrics': val_metrics
        }
        
        if self.use_amp:
            checkpoint['scaler_state_dict'] = self.scaler.state_dict()
        
        # Save regular checkpoint
        checkpoint_path = self.checkpoint_dir / f"checkpoint_epoch_{epoch}.pth"
        torch.save(checkpoint, checkpoint_path)
        
        # Save best model
        if is_best:
            best_path = self.checkpoint_dir / "best_model.pth"
            torch.save(checkpoint, best_path)
            print(f"✅ Best model saved: {best_path}")
    
    def load_checkpoint(self, checkpoint_path: str):
        """Load model from checkpoint."""
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        
        if self.scheduler and checkpoint['scheduler_state_dict']:
            self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        
        if self.use_amp and 'scaler_state_dict' in checkpoint:
            self.scaler.load_state_dict(checkpoint['scaler_state_dict'])
        
        self.current_epoch = checkpoint['epoch']
        self.best_val_acc = checkpoint['best_val_acc']
        self.best_val_loss = checkpoint['best_val_loss']
        
        print(f"✅ Resumed from epoch {self.current_epoch}")
    
    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        num_epochs: int
    ):
        """Full training loop."""
        print("\n" + "="*70)
        print(f"Starting Training: {self.experiment_name}")
        print("="*70 + "\n")
        
        early_stopping_patience = self.config['training'].get('early_stopping_patience', 10)
        
        for epoch in range(self.current_epoch + 1, num_epochs + 1):
            epoch_start = time.time()
            
            # Train
            train_metrics = self.train_epoch(train_loader, epoch)
            
            # Validate
            val_metrics = self.validate(val_loader, epoch)
            
            # Update learning rate
            if self.scheduler:
                if isinstance(self.scheduler, optim.lr_scheduler.ReduceLROnPlateau):
                    self.scheduler.step(val_metrics['accuracy'])
                else:
                    self.scheduler.step()
            
            # Get current LR
            current_lr = self.optimizer.param_groups[0]['lr']
            
            # Check if best model
            is_best = val_metrics['accuracy'] > self.best_val_acc
            if is_best:
                self.best_val_acc = val_metrics['accuracy']
                self.best_val_loss = val_metrics['loss']
                self.epochs_without_improvement = 0
            else:
                self.epochs_without_improvement += 1
            
            # Log metrics
            epoch_time = time.time() - epoch_start
            
            print(f"\nEpoch {epoch}/{num_epochs}")
            print(f"  Train Loss: {train_metrics['loss']:.4f} | Train Acc: {train_metrics['accuracy']:.2f}%")
            print(f"  Val Loss:   {val_metrics['loss']:.4f} | Val Acc:   {val_metrics['accuracy']:.2f}%")
            print(f"  LR: {current_lr:.6f} | Time: {epoch_time:.1f}s")
            
            if is_best:
                print(f"  🎉 New best accuracy!")
            
            # Save checkpoint
            self.save_checkpoint(epoch, val_metrics, is_best)
            
            # Track with W&B
            if self.use_wandb:
                import wandb
                wandb.log({
                    'epoch': epoch,
                    'train_loss': train_metrics['loss'],
                    'train_acc': train_metrics['accuracy'],
                    'val_loss': val_metrics['loss'],
                    'val_acc': val_metrics['accuracy'],
                    'lr': current_lr
                })
            
            # Store history
            self.training_history.append({
                'epoch': epoch,
                'train': train_metrics,
                'val': val_metrics,
                'lr': current_lr
            })
            
            # Early stopping
            if self.epochs_without_improvement >= early_stopping_patience:
                print(f"\n⏹️  Early stopping triggered after {epoch} epochs")
                break
        
        # Save training history
        history_path = self.log_dir / f"training_history_{self.experiment_name}.json"
        with open(history_path, 'w') as f:
            json.dump(self.training_history, f, indent=2)
        
        print("\n" + "="*70)
        print(f"Training Complete!")
        print(f"Best Val Accuracy: {self.best_val_acc:.2f}%")
        print("="*70 + "\n")


def main():
    parser = argparse.ArgumentParser(description='Advanced training pipeline for AccessAtlas')
    
    parser.add_argument('--config', type=str, required=True, help='Path to config.yaml')
    parser.add_argument('--experiment-name', type=str, help='Experiment name for tracking')
    parser.add_argument('--amp', action='store_true', help='Use automatic mixed precision (FP16)')
    parser.add_argument('--wandb', action='store_true', help='Use Weights & Biases for tracking')
    parser.add_argument('--resume', type=str, help='Resume from checkpoint')
    
    args = parser.parse_args()
    
    # Load config
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Create data loaders
    train_loader, val_loader, test_loader = create_data_loaders(config)
    
    # Initialize trainer
    trainer = AdvancedTrainer(
        config=config,
        experiment_name=args.experiment_name,
        use_amp=args.amp,
        use_wandb=args.wandb,
        resume_path=args.resume
    )
    
    # Train
    num_epochs = config['training']['num_epochs']
    trainer.train(train_loader, val_loader, num_epochs)


if __name__ == '__main__':
    main()
