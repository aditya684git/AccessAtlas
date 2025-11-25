"""
Dataset loader and preprocessing for AccessAtlas tag classification.
"""

import os
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import numpy as np


class TagDataset(Dataset):
    """
    Dataset for loading accessibility tag images and metadata.
    """
    
    def __init__(self, csv_path, images_dir, tag_types, source_types, transform=None, split='train'):
        """
        Args:
            csv_path: Path to tags.csv
            images_dir: Directory containing images
            tag_types: List of valid tag types
            source_types: List of valid source types
            transform: Image transforms
            split: 'train', 'val', or 'test'
        """
        self.images_dir = images_dir
        self.tag_types = tag_types
        self.source_types = source_types
        self.transform = transform
        self.split = split
        
        # Load CSV
        self.df = pd.read_csv(csv_path)
        
        # Create label mappings
        self.tag_to_idx = {tag: idx for idx, tag in enumerate(tag_types)}
        self.source_to_idx = {src: idx for idx, src in enumerate(source_types)}
        
        # Filter valid samples
        self.df = self.df[self.df['type'].isin(tag_types)]
        self.df = self.df[self.df['source'].isin(source_types)]
        
        print(f"[{split}] Loaded {len(self.df)} samples")
        print(f"[{split}] Tag distribution: {self.df['type'].value_counts().to_dict()}")
    
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        """
        Returns:
            image: (3, 224, 224) tensor
            metadata: dict with lat, lon, source_onehot
            label: int (class index)
            info: dict with additional info for error analysis
        """
        row = self.df.iloc[idx]
        
        # Load image
        image_path = os.path.join(self.images_dir, row['image_path'])
        try:
            image = Image.open(image_path).convert('RGB')
        except Exception as e:
            print(f"Error loading {image_path}: {e}")
            # Return a blank image as fallback
            image = Image.new('RGB', (224, 224), color=(0, 0, 0))
        
        if self.transform:
            image = self.transform(image)
        
        # Extract metadata
        lat = torch.tensor([row['lat']], dtype=torch.float32)
        lon = torch.tensor([row['lon']], dtype=torch.float32)
        
        # One-hot encode source
        source_onehot = torch.zeros(len(self.source_types), dtype=torch.float32)
        source_idx = self.source_to_idx[row['source']]
        source_onehot[source_idx] = 1.0
        
        # Label
        label = self.tag_to_idx[row['type']]
        
        # Additional info for error analysis
        info = {
            'image_path': row['image_path'],
            'lat': row['lat'],
            'lon': row['lon'],
            'source': row['source'],
            'type': row['type']
        }
        
        return {
            'image': image,
            'lat': lat,
            'lon': lon,
            'source_onehot': source_onehot,
            'label': label,
            'info': info
        }


def get_transforms(config, split='train'):
    """
    Get image transforms for train/val/test.
    """
    image_size = config['model']['image_size']
    
    if split == 'train' and config['augmentation']['enabled']:
        # Training with augmentation
        transform = transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.RandomRotation(config['augmentation']['random_rotation']),
            transforms.RandomHorizontalFlip(config['augmentation']['random_horizontal_flip']),
            transforms.ColorJitter(
                brightness=config['augmentation']['color_jitter_brightness'],
                contrast=config['augmentation']['color_jitter_contrast']
            ),
            transforms.RandomResizedCrop(
                image_size,
                scale=tuple(config['augmentation']['random_crop_scale'])
            ),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    else:
        # Val/test without augmentation
        transform = transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    return transform


def split_dataset(csv_path, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15, seed=42):
    """
    Split tags.csv into train/val/test CSVs with stratification by tag type.
    
    Args:
        csv_path: Path to full tags.csv
        train_ratio, val_ratio, test_ratio: Split ratios
        seed: Random seed
    
    Returns:
        train_csv_path, val_csv_path, test_csv_path
    """
    df = pd.read_csv(csv_path)
    
    # Stratified split by tag type
    from sklearn.model_selection import train_test_split
    
    train_df, temp_df = train_test_split(
        df, train_size=train_ratio, stratify=df['type'], random_state=seed
    )
    
    val_size = val_ratio / (val_ratio + test_ratio)
    val_df, test_df = train_test_split(
        temp_df, train_size=val_size, stratify=temp_df['type'], random_state=seed
    )
    
    # Save splits
    base_dir = os.path.dirname(csv_path)
    train_csv = os.path.join(base_dir, 'tags_train.csv')
    val_csv = os.path.join(base_dir, 'tags_val.csv')
    test_csv = os.path.join(base_dir, 'tags_test.csv')
    
    train_df.to_csv(train_csv, index=False)
    val_df.to_csv(val_csv, index=False)
    test_df.to_csv(test_csv, index=False)
    
    print(f"Created splits:")
    print(f"  Train: {len(train_df)} samples -> {train_csv}")
    print(f"  Val:   {len(val_df)} samples -> {val_csv}")
    print(f"  Test:  {len(test_df)} samples -> {test_csv}")
    
    return train_csv, val_csv, test_csv


def get_dataloaders(config, split_csvs=None):
    """
    Create train/val/test dataloaders.
    
    Args:
        config: Configuration dict
        split_csvs: Optional tuple of (train_csv, val_csv, test_csv)
                   If None, will split the main CSV
    
    Returns:
        train_loader, val_loader, test_loader
    """
    images_dir = os.path.join(os.path.dirname(__file__), config['data']['images_dir'])
    tags_csv = os.path.join(os.path.dirname(__file__), config['data']['tags_csv'])
    
    # Split dataset if not already done
    if split_csvs is None:
        train_csv, val_csv, test_csv = split_dataset(
            tags_csv,
            train_ratio=config['data']['train_split'],
            val_ratio=config['data']['val_split'],
            test_ratio=config['data']['test_split'],
            seed=config['seed']
        )
    else:
        train_csv, val_csv, test_csv = split_csvs
    
    # Create datasets
    train_dataset = TagDataset(
        train_csv, images_dir,
        config['tag_types'], config['source_types'],
        transform=get_transforms(config, 'train'),
        split='train'
    )
    
    val_dataset = TagDataset(
        val_csv, images_dir,
        config['tag_types'], config['source_types'],
        transform=get_transforms(config, 'val'),
        split='val'
    )
    
    test_dataset = TagDataset(
        test_csv, images_dir,
        config['tag_types'], config['source_types'],
        transform=get_transforms(config, 'test'),
        split='test'
    )
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['training']['batch_size'],
        shuffle=True,
        num_workers=config['num_workers'],
        pin_memory=config['pin_memory']
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['training']['batch_size'],
        shuffle=False,
        num_workers=config['num_workers'],
        pin_memory=config['pin_memory']
    )
    
    test_loader = DataLoader(
        test_dataset,
        batch_size=config['training']['batch_size'],
        shuffle=False,
        num_workers=config['num_workers'],
        pin_memory=config['pin_memory']
    )
    
    return train_loader, val_loader, test_loader


if __name__ == "__main__":
    # Test dataset loading
    import yaml
    
    with open('../baseline/config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    print("Testing dataset loader...")
    
    # Create a dummy tags.csv for testing
    dummy_csv = "../../data/tags_dummy.csv"
    if not os.path.exists(dummy_csv):
        print(f"Please create {dummy_csv} with columns: image_path, lat, lon, type, source")
    else:
        dataset = TagDataset(
            dummy_csv,
            config['data']['images_dir'],
            config['tag_types'],
            config['source_types'],
            transform=get_transforms(config, 'train'),
            split='train'
        )
        
        print(f"Dataset length: {len(dataset)}")
        
        if len(dataset) > 0:
            sample = dataset[0]
            print(f"Sample keys: {sample.keys()}")
            print(f"Image shape: {sample['image'].shape}")
            print(f"Label: {sample['label']} ({config['tag_types'][sample['label']]})")
