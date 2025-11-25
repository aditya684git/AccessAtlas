"""
AccessAtlas Baseline Model Architecture

Combines CNN image features with metadata (lat/lon, source type) for tag classification.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class CNNFeatureExtractor(nn.Module):
    """
    Convolutional neural network for extracting features from image tiles.
    """
    
    def __init__(self, channels=[32, 64, 128], dropout=0.3):
        super(CNNFeatureExtractor, self).__init__()
        
        # Conv Block 1: 3 -> 32
        self.conv1 = nn.Sequential(
            nn.Conv2d(3, channels[0], kernel_size=3, padding=1),
            nn.BatchNorm2d(channels[0]),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),  # 224 -> 112
            nn.Dropout2d(dropout)
        )
        
        # Conv Block 2: 32 -> 64
        self.conv2 = nn.Sequential(
            nn.Conv2d(channels[0], channels[1], kernel_size=3, padding=1),
            nn.BatchNorm2d(channels[1]),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),  # 112 -> 56
            nn.Dropout2d(dropout)
        )
        
        # Conv Block 3: 64 -> 128
        self.conv3 = nn.Sequential(
            nn.Conv2d(channels[1], channels[2], kernel_size=3, padding=1),
            nn.BatchNorm2d(channels[2]),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),  # 56 -> 28
            nn.Dropout2d(dropout)
        )
        
        # Global average pooling
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        
        self.output_dim = channels[2]
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, 3, 224, 224) image tensor
        Returns:
            features: (batch_size, 128) feature vector
        """
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.global_pool(x)
        x = x.view(x.size(0), -1)  # Flatten
        return x


class MetadataEncoder(nn.Module):
    """
    Encodes metadata (lat, lon, source) into a dense feature vector.
    """
    
    def __init__(self, num_sources=3, hidden_dim=64):
        super(MetadataEncoder, self).__init__()
        
        # Lat/lon are continuous, source is one-hot encoded
        # Input: 2 (lat/lon) + num_sources (one-hot)
        input_dim = 2 + num_sources
        
        self.fc = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True)
        )
        
        self.output_dim = hidden_dim
    
    def forward(self, lat, lon, source_onehot):
        """
        Args:
            lat: (batch_size, 1) latitude
            lon: (batch_size, 1) longitude
            source_onehot: (batch_size, num_sources) one-hot encoded source
        Returns:
            features: (batch_size, hidden_dim) metadata features
        """
        # Normalize lat/lon to [-1, 1] range (approximate)
        lat_norm = lat / 90.0
        lon_norm = lon / 180.0
        
        # Concatenate all metadata
        x = torch.cat([lat_norm, lon_norm, source_onehot], dim=1)
        x = self.fc(x)
        return x


class FusionLayer(nn.Module):
    """
    Fuses image features and metadata features.
    """
    
    def __init__(self, image_dim, metadata_dim, fusion_dim=256):
        super(FusionLayer, self).__init__()
        
        self.fusion = nn.Sequential(
            nn.Linear(image_dim + metadata_dim, fusion_dim),
            nn.BatchNorm1d(fusion_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(fusion_dim, fusion_dim),
            nn.BatchNorm1d(fusion_dim),
            nn.ReLU(inplace=True)
        )
        
        self.output_dim = fusion_dim
    
    def forward(self, image_features, metadata_features):
        """
        Args:
            image_features: (batch_size, image_dim)
            metadata_features: (batch_size, metadata_dim)
        Returns:
            fused: (batch_size, fusion_dim)
        """
        x = torch.cat([image_features, metadata_features], dim=1)
        x = self.fusion(x)
        return x


class AccessAtlasModel(nn.Module):
    """
    Complete model combining CNN, metadata encoder, fusion, and classification.
    """
    
    def __init__(self, config):
        super(AccessAtlasModel, self).__init__()
        
        # Extract config
        cnn_channels = config['model']['cnn_channels']
        cnn_dropout = config['model']['cnn_dropout']
        metadata_hidden = config['model']['metadata_hidden']
        fusion_hidden = config['model']['fusion_hidden']
        num_classes = config['model']['num_classes']
        num_sources = len(config['source_types'])
        
        # Components
        self.cnn = CNNFeatureExtractor(channels=cnn_channels, dropout=cnn_dropout)
        self.metadata_encoder = MetadataEncoder(num_sources=num_sources, hidden_dim=metadata_hidden)
        self.fusion = FusionLayer(
            image_dim=self.cnn.output_dim,
            metadata_dim=self.metadata_encoder.output_dim,
            fusion_dim=fusion_hidden
        )
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(self.fusion.output_dim, num_classes)
        )
    
    def forward(self, image, lat, lon, source_onehot):
        """
        Args:
            image: (batch_size, 3, 224, 224)
            lat: (batch_size, 1)
            lon: (batch_size, 1)
            source_onehot: (batch_size, num_sources)
        Returns:
            logits: (batch_size, num_classes)
        """
        # Extract features
        image_features = self.cnn(image)
        metadata_features = self.metadata_encoder(lat, lon, source_onehot)
        
        # Fuse and classify
        fused = self.fusion(image_features, metadata_features)
        logits = self.classifier(fused)
        
        return logits


def get_model(config):
    """
    Factory function to create model instance.
    """
    model = AccessAtlasModel(config)
    return model


if __name__ == "__main__":
    # Test model instantiation
    import yaml
    
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    model = get_model(config)
    
    # Test forward pass
    batch_size = 4
    dummy_image = torch.randn(batch_size, 3, 224, 224)
    dummy_lat = torch.randn(batch_size, 1)
    dummy_lon = torch.randn(batch_size, 1)
    dummy_source = torch.randn(batch_size, 3)
    
    output = model(dummy_image, dummy_lat, dummy_lon, dummy_source)
    print(f"Model output shape: {output.shape}")
    print(f"Expected shape: (batch_size={batch_size}, num_classes={config['model']['num_classes']})")
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nTotal parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
