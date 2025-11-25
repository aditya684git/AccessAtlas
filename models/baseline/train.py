"""
Training script for AccessAtlas baseline model.
"""

import os
import yaml
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import StepLR, CosineAnnealingLR
from tqdm import tqdm
import json
from datetime import datetime
import numpy as np

from model import get_model
from dataset import get_dataloaders


class Trainer:
    """
    Trainer class for AccessAtlas model.
    """
    
    def __init__(self, config):
        self.config = config
        self.device = torch.device(config['device'] if torch.cuda.is_available() else 'cpu')
        
        # Set random seed
        torch.manual_seed(config['seed'])
        np.random.seed(config['seed'])
        if torch.cuda.is_available():
            torch.cuda.manual_seed(config['seed'])
        
        # Create directories
        self.checkpoint_dir = config['logging']['checkpoint_dir']
        self.log_dir = config['logging']['log_dir']
        os.makedirs(self.checkpoint_dir, exist_ok=True)
        os.makedirs(self.log_dir, exist_ok=True)
        
        # Initialize model
        self.model = get_model(config).to(self.device)
        print(f"Model initialized on {self.device}")
        
        # Loss function
        self.criterion = nn.CrossEntropyLoss()
        
        # Optimizer
        if config['training']['optimizer'] == 'adam':
            self.optimizer = optim.Adam(
                self.model.parameters(),
                lr=config['training']['learning_rate'],
                weight_decay=config['training']['weight_decay']
            )
        elif config['training']['optimizer'] == 'sgd':
            self.optimizer = optim.SGD(
                self.model.parameters(),
                lr=config['training']['learning_rate'],
                momentum=0.9,
                weight_decay=config['training']['weight_decay']
            )
        
        # Learning rate scheduler
        if config['training']['scheduler'] == 'step':
            self.scheduler = StepLR(
                self.optimizer,
                step_size=config['training']['step_lr_step_size'],
                gamma=config['training']['step_lr_gamma']
            )
        elif config['training']['scheduler'] == 'cosine':
            self.scheduler = CosineAnnealingLR(
                self.optimizer,
                T_max=config['training']['num_epochs']
            )
        else:
            self.scheduler = None
        
        # Training state
        self.current_epoch = 0
        self.best_val_acc = 0.0
        self.epochs_without_improvement = 0
        self.train_history = []
        self.val_history = []
    
    def train_epoch(self, train_loader):
        """
        Train for one epoch.
        """
        self.model.train()
        total_loss = 0.0
        correct = 0
        total = 0
        
        pbar = tqdm(train_loader, desc=f"Epoch {self.current_epoch+1} [Train]")
        for batch_idx, batch in enumerate(pbar):
            # Move to device
            images = batch['image'].to(self.device)
            lat = batch['lat'].to(self.device)
            lon = batch['lon'].to(self.device)
            source_onehot = batch['source_onehot'].to(self.device)
            labels = batch['label'].to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            outputs = self.model(images, lat, lon, source_onehot)
            loss = self.criterion(outputs, labels)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            if self.config['training']['grad_clip'] > 0:
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(),
                    self.config['training']['grad_clip']
                )
            
            self.optimizer.step()
            
            # Statistics
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            # Update progress bar
            if batch_idx % self.config['logging']['log_interval'] == 0:
                pbar.set_postfix({
                    'loss': f"{loss.item():.4f}",
                    'acc': f"{100.*correct/total:.2f}%"
                })
        
        avg_loss = total_loss / len(train_loader)
        accuracy = 100. * correct / total
        
        return avg_loss, accuracy
    
    def validate(self, val_loader):
        """
        Validate the model.
        """
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            pbar = tqdm(val_loader, desc=f"Epoch {self.current_epoch+1} [Val]")
            for batch in pbar:
                # Move to device
                images = batch['image'].to(self.device)
                lat = batch['lat'].to(self.device)
                lon = batch['lon'].to(self.device)
                source_onehot = batch['source_onehot'].to(self.device)
                labels = batch['label'].to(self.device)
                
                # Forward pass
                outputs = self.model(images, lat, lon, source_onehot)
                loss = self.criterion(outputs, labels)
                
                # Statistics
                total_loss += loss.item()
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()
                
                pbar.set_postfix({
                    'loss': f"{loss.item():.4f}",
                    'acc': f"{100.*correct/total:.2f}%"
                })
        
        avg_loss = total_loss / len(val_loader)
        accuracy = 100. * correct / total
        
        return avg_loss, accuracy
    
    def save_checkpoint(self, filename, is_best=False):
        """
        Save model checkpoint.
        """
        checkpoint = {
            'epoch': self.current_epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict() if self.scheduler else None,
            'best_val_acc': self.best_val_acc,
            'config': self.config
        }
        
        filepath = os.path.join(self.checkpoint_dir, filename)
        torch.save(checkpoint, filepath)
        print(f"Checkpoint saved: {filepath}")
        
        if is_best:
            best_path = os.path.join(self.checkpoint_dir, 'best_model.pth')
            torch.save(checkpoint, best_path)
            print(f"Best model saved: {best_path}")
    
    def load_checkpoint(self, filepath):
        """
        Load model checkpoint.
        """
        checkpoint = torch.load(filepath, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        if self.scheduler and checkpoint['scheduler_state_dict']:
            self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        self.current_epoch = checkpoint['epoch']
        self.best_val_acc = checkpoint['best_val_acc']
        print(f"Checkpoint loaded: {filepath}")
    
    def save_training_log(self):
        """
        Save training history to JSON.
        """
        log_data = {
            'train_history': self.train_history,
            'val_history': self.val_history,
            'best_val_acc': self.best_val_acc,
            'final_epoch': self.current_epoch,
            'config': self.config
        }
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_path = os.path.join(self.log_dir, f'training_log_{timestamp}.json')
        
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        print(f"Training log saved: {log_path}")
    
    def train(self, train_loader, val_loader):
        """
        Main training loop.
        """
        print(f"\n{'='*60}")
        print(f"Starting training for {self.config['training']['num_epochs']} epochs")
        print(f"{'='*60}\n")
        
        for epoch in range(self.config['training']['num_epochs']):
            self.current_epoch = epoch
            
            # Train
            train_loss, train_acc = self.train_epoch(train_loader)
            self.train_history.append({
                'epoch': epoch + 1,
                'loss': train_loss,
                'accuracy': train_acc
            })
            
            # Validate
            val_loss, val_acc = self.validate(val_loader)
            self.val_history.append({
                'epoch': epoch + 1,
                'loss': val_loss,
                'accuracy': val_acc
            })
            
            # Learning rate scheduler step
            if self.scheduler:
                self.scheduler.step()
                current_lr = self.optimizer.param_groups[0]['lr']
                print(f"Learning rate: {current_lr:.6f}")
            
            # Print epoch summary
            print(f"\nEpoch {epoch+1}/{self.config['training']['num_epochs']}")
            print(f"  Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
            print(f"  Val Loss:   {val_loss:.4f} | Val Acc:   {val_acc:.2f}%\n")
            
            # Save checkpoints
            if self.config['logging']['save_last']:
                self.save_checkpoint(f'checkpoint_epoch_{epoch+1}.pth')
            
            # Check if best model
            if val_acc > self.best_val_acc:
                self.best_val_acc = val_acc
                self.epochs_without_improvement = 0
                if self.config['logging']['save_best_only']:
                    self.save_checkpoint(f'best_model_epoch_{epoch+1}.pth', is_best=True)
            else:
                self.epochs_without_improvement += 1
            
            # Early stopping
            if self.epochs_without_improvement >= self.config['training']['early_stopping_patience']:
                print(f"\nEarly stopping triggered after {epoch+1} epochs")
                print(f"Best validation accuracy: {self.best_val_acc:.2f}%")
                break
        
        # Save final training log
        self.save_training_log()
        
        print(f"\n{'='*60}")
        print(f"Training completed!")
        print(f"Best validation accuracy: {self.best_val_acc:.2f}%")
        print(f"{'='*60}\n")


def main():
    """
    Main training function.
    """
    # Load config
    config_path = 'config.yaml'
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    print("Configuration loaded:")
    print(yaml.dump(config, default_flow_style=False))
    
    # Get dataloaders
    print("\nPreparing datasets...")
    train_loader, val_loader, test_loader = get_dataloaders(config)
    
    # Initialize trainer
    trainer = Trainer(config)
    
    # Start training
    trainer.train(train_loader, val_loader)


if __name__ == "__main__":
    main()
