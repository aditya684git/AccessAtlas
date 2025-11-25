#!/usr/bin/env python3
"""
Data Preprocessing Pipeline for AccessAtlas

Loads raw tags.csv, normalizes features, encodes categorical variables,
and splits data into train/val/test sets with stratification.

Usage:
    # Basic preprocessing with default splits
    python preprocess.py --input tags.csv
    
    # Custom split ratios
    python preprocess.py --input tags.csv --train 0.8 --val 0.1 --test 0.1
    
    # Keep validation images separate (no augmentation)
    python preprocess.py --input tags.csv --preserve-val-images
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import yaml


class DataPreprocessor:
    """Preprocess AccessAtlas training data."""
    
    def __init__(
        self,
        train_split: float = 0.7,
        val_split: float = 0.15,
        test_split: float = 0.15,
        random_seed: int = 42
    ):
        """
        Initialize preprocessor.
        
        Args:
            train_split: Fraction of data for training
            val_split: Fraction of data for validation
            test_split: Fraction of data for testing
            random_seed: Random seed for reproducibility
        """
        if not np.isclose(train_split + val_split + test_split, 1.0):
            raise ValueError("Split ratios must sum to 1.0")
        
        self.train_split = train_split
        self.val_split = val_split
        self.test_split = test_split
        self.random_seed = random_seed
        
        # Initialize encoders
        self.lat_lon_scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
        # Store metadata
        self.metadata = {
            'source_types': [],
            'tag_types': [],
            'lat_mean': None,
            'lat_std': None,
            'lon_mean': None,
            'lon_std': None,
            'num_classes': None,
            'class_weights': None
        }
    
    def load_data(self, csv_path: str) -> pd.DataFrame:
        """
        Load and validate raw CSV data.
        
        Args:
            csv_path: Path to tags.csv
            
        Returns:
            Loaded DataFrame
        """
        df = pd.read_csv(csv_path)
        
        # Validate required columns
        required_cols = ['image_path', 'lat', 'lon', 'type', 'source']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Check for missing values
        missing_counts = df[required_cols].isnull().sum()
        if missing_counts.any():
            print("⚠️  Warning: Missing values detected:")
            print(missing_counts[missing_counts > 0])
            df = df.dropna(subset=required_cols)
            print(f"Dropped rows with missing values. Remaining: {len(df)}")
        
        # Validate image paths exist
        images_dir = Path(csv_path).parent / 'images'
        if images_dir.exists():
            missing_images = []
            for img_path in df['image_path']:
                full_path = images_dir / img_path if not os.path.isabs(img_path) else Path(img_path)
                if not full_path.exists():
                    missing_images.append(img_path)
            
            if missing_images:
                print(f"⚠️  Warning: {len(missing_images)} images not found")
                if len(missing_images) <= 10:
                    print("Missing:", missing_images)
        
        print(f"✅ Loaded {len(df)} samples from {csv_path}")
        return df
    
    def normalize_coordinates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize latitude and longitude values.
        
        Args:
            df: DataFrame with lat/lon columns
            
        Returns:
            DataFrame with normalized coordinates
        """
        coords = df[['lat', 'lon']].values
        normalized = self.lat_lon_scaler.fit_transform(coords)
        
        df['lat_norm'] = normalized[:, 0]
        df['lon_norm'] = normalized[:, 1]
        
        # Store statistics
        self.metadata['lat_mean'] = float(self.lat_lon_scaler.mean_[0])
        self.metadata['lat_std'] = float(self.lat_lon_scaler.scale_[0])
        self.metadata['lon_mean'] = float(self.lat_lon_scaler.mean_[1])
        self.metadata['lon_std'] = float(self.lat_lon_scaler.scale_[1])
        
        print(f"✅ Normalized coordinates (μ_lat={self.metadata['lat_mean']:.4f}, σ_lat={self.metadata['lat_std']:.4f})")
        
        return df
    
    def encode_labels(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Encode tag types as integer labels.
        
        Args:
            df: DataFrame with 'type' column
            
        Returns:
            DataFrame with 'label' column
        """
        df['label'] = self.label_encoder.fit_transform(df['type'])
        
        self.metadata['tag_types'] = self.label_encoder.classes_.tolist()
        self.metadata['num_classes'] = len(self.metadata['tag_types'])
        
        print(f"✅ Encoded {self.metadata['num_classes']} tag types: {self.metadata['tag_types']}")
        
        return df
    
    def encode_source(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Store source types for one-hot encoding during training.
        
        Args:
            df: DataFrame with 'source' column
            
        Returns:
            DataFrame (unchanged, but metadata updated)
        """
        self.metadata['source_types'] = sorted(df['source'].unique().tolist())
        
        print(f"✅ Identified {len(self.metadata['source_types'])} source types: {self.metadata['source_types']}")
        
        return df
    
    def compute_class_weights(self, df: pd.DataFrame) -> np.ndarray:
        """
        Compute class weights for handling imbalanced datasets.
        
        Args:
            df: DataFrame with 'label' column
            
        Returns:
            Array of class weights
        """
        from collections import Counter
        
        label_counts = Counter(df['label'])
        total = len(df)
        
        weights = []
        for i in range(self.metadata['num_classes']):
            count = label_counts.get(i, 1)
            weight = total / (self.metadata['num_classes'] * count)
            weights.append(weight)
        
        weights = np.array(weights)
        self.metadata['class_weights'] = weights.tolist()
        
        print(f"✅ Computed class weights: {weights.round(2)}")
        
        return weights
    
    def stratified_split(
        self,
        df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Split data into train/val/test with stratification by tag type.
        
        Args:
            df: Full DataFrame
            
        Returns:
            Tuple of (train_df, val_df, test_df)
        """
        # First split: separate test set
        train_val_df, test_df = train_test_split(
            df,
            test_size=self.test_split,
            stratify=df['type'],
            random_state=self.random_seed
        )
        
        # Second split: separate validation from training
        val_ratio = self.val_split / (self.train_split + self.val_split)
        train_df, val_df = train_test_split(
            train_val_df,
            test_size=val_ratio,
            stratify=train_val_df['type'],
            random_state=self.random_seed
        )
        
        print(f"✅ Split dataset:")
        print(f"   Train: {len(train_df)} samples ({len(train_df)/len(df)*100:.1f}%)")
        print(f"   Val:   {len(val_df)} samples ({len(val_df)/len(df)*100:.1f}%)")
        print(f"   Test:  {len(test_df)} samples ({len(test_df)/len(df)*100:.1f}%)")
        
        # Verify stratification
        print("\n📊 Tag distribution:")
        for split_name, split_df in [('Train', train_df), ('Val', val_df), ('Test', test_df)]:
            dist = split_df['type'].value_counts(normalize=True).sort_index()
            print(f"   {split_name}: {dict(dist.round(2))}")
        
        return train_df, val_df, test_df
    
    def save_splits(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        test_df: pd.DataFrame,
        output_dir: str
    ):
        """
        Save split datasets to CSV files.
        
        Args:
            train_df: Training DataFrame
            val_df: Validation DataFrame
            test_df: Test DataFrame
            output_dir: Directory to save CSVs
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        train_path = output_path / 'tags_train.csv'
        val_path = output_path / 'tags_val.csv'
        test_path = output_path / 'tags_test.csv'
        
        train_df.to_csv(train_path, index=False)
        val_df.to_csv(val_path, index=False)
        test_df.to_csv(test_path, index=False)
        
        print(f"\n✅ Saved split datasets:")
        print(f"   {train_path}")
        print(f"   {val_path}")
        print(f"   {test_path}")
    
    def save_metadata(self, output_dir: str):
        """
        Save preprocessing metadata (scalers, encoders, statistics).
        
        Args:
            output_dir: Directory to save metadata
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        metadata_path = output_path / 'preprocessing_metadata.json'
        
        with open(metadata_path, 'w') as f:
            json.dump(self.metadata, f, indent=2)
        
        print(f"✅ Saved preprocessing metadata: {metadata_path}")
    
    def preprocess(
        self,
        csv_path: str,
        output_dir: Optional[str] = None
    ) -> Dict[str, pd.DataFrame]:
        """
        Run full preprocessing pipeline.
        
        Args:
            csv_path: Path to input tags.csv
            output_dir: Directory to save outputs (default: same as csv_path)
            
        Returns:
            Dict with 'train', 'val', 'test' DataFrames
        """
        if output_dir is None:
            output_dir = str(Path(csv_path).parent)
        
        print("\n" + "="*70)
        print("🚀 AccessAtlas Data Preprocessing Pipeline")
        print("="*70 + "\n")
        
        # Load data
        df = self.load_data(csv_path)
        
        # Normalize coordinates
        df = self.normalize_coordinates(df)
        
        # Encode labels
        df = self.encode_labels(df)
        
        # Encode source
        df = self.encode_source(df)
        
        # Compute class weights
        self.compute_class_weights(df)
        
        # Split dataset
        train_df, val_df, test_df = self.stratified_split(df)
        
        # Save outputs
        self.save_splits(train_df, val_df, test_df, output_dir)
        self.save_metadata(output_dir)
        
        print("\n" + "="*70)
        print("✅ Preprocessing complete!")
        print("="*70 + "\n")
        
        return {
            'train': train_df,
            'val': val_df,
            'test': test_df
        }


def main():
    parser = argparse.ArgumentParser(
        description='Preprocess AccessAtlas training data',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--input',
        type=str,
        required=True,
        help='Path to input tags.csv'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='Output directory (default: same as input)'
    )
    parser.add_argument(
        '--train',
        type=float,
        default=0.7,
        help='Training split ratio (default: 0.7)'
    )
    parser.add_argument(
        '--val',
        type=float,
        default=0.15,
        help='Validation split ratio (default: 0.15)'
    )
    parser.add_argument(
        '--test',
        type=float,
        default=0.15,
        help='Test split ratio (default: 0.15)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed (default: 42)'
    )
    
    args = parser.parse_args()
    
    # Validate splits sum to 1.0
    if not np.isclose(args.train + args.val + args.test, 1.0):
        parser.error("Split ratios must sum to 1.0")
    
    # Initialize preprocessor
    preprocessor = DataPreprocessor(
        train_split=args.train,
        val_split=args.val,
        test_split=args.test,
        random_seed=args.seed
    )
    
    # Run preprocessing
    preprocessor.preprocess(args.input, args.output)


if __name__ == '__main__':
    main()
