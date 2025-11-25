"""
AccessAtlas Production Model Architectures

Provides multiple model options:
1. Baseline: Custom CNN (original architecture)
2. ResNet: Transfer learning with pretrained ResNet18/34/50
3. EfficientNet: Transfer learning with EfficientNet-B0/B1
4. MobileNet: Lightweight model for mobile deployment

All models fuse image features with metadata (lat/lon, source).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
from typing import Optional


class CNNFeatureExtractor(nn.Module):
    """
    Custom CNN for extracting features from image tiles.
    Lightweight baseline architecture.
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
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.global_pool(x)
        x = x.view(x.size(0), -1)
        return x


class PretrainedBackbone(nn.Module):
    """
    Transfer learning backbone using pretrained models.
    Supports ResNet, EfficientNet, MobileNet.
    """
    
    def __init__(
        self,
        model_name: str = 'resnet18',
        pretrained: bool = True,
        freeze_layers: int = 0
    ):
        """
        Args:
            model_name: Model architecture ('resnet18', 'resnet34', 'resnet50',
                       'efficientnet_b0', 'efficientnet_b1', 'mobilenet_v3_small',
                       'mobilenet_v3_large')
            pretrained: Use ImageNet pretrained weights
            freeze_layers: Number of initial layers to freeze (0 = train all)
        """
        super(PretrainedBackbone, self).__init__()
        
        self.model_name = model_name
        
        # Load pretrained model
        if model_name == 'resnet18':
            self.backbone = models.resnet18(pretrained=pretrained)
            self.output_dim = 512
            self.backbone = nn.Sequential(*list(self.backbone.children())[:-1])
        
        elif model_name == 'resnet34':
            self.backbone = models.resnet34(pretrained=pretrained)
            self.output_dim = 512
            self.backbone = nn.Sequential(*list(self.backbone.children())[:-1])
        
        elif model_name == 'resnet50':
            self.backbone = models.resnet50(pretrained=pretrained)
            self.output_dim = 2048
            self.backbone = nn.Sequential(*list(self.backbone.children())[:-1])
        
        elif model_name == 'efficientnet_b0':
            self.backbone = models.efficientnet_b0(pretrained=pretrained)
            self.output_dim = 1280
            self.backbone.classifier = nn.Identity()
        
        elif model_name == 'efficientnet_b1':
            self.backbone = models.efficientnet_b1(pretrained=pretrained)
            self.output_dim = 1280
            self.backbone.classifier = nn.Identity()
        
        elif model_name == 'mobilenet_v3_small':
            self.backbone = models.mobilenet_v3_small(pretrained=pretrained)
            self.output_dim = 576
            self.backbone.classifier = nn.Identity()
        
        elif model_name == 'mobilenet_v3_large':
            self.backbone = models.mobilenet_v3_large(pretrained=pretrained)
            self.output_dim = 960
            self.backbone.classifier = nn.Identity()
        
        else:
            raise ValueError(f"Unknown model: {model_name}")
        
        # Freeze layers if requested
        if freeze_layers > 0:
            self._freeze_layers(freeze_layers)
    
    def _freeze_layers(self, num_layers: int):
        """Freeze first N layers."""
        layers = list(self.backbone.children())
        for i, layer in enumerate(layers[:num_layers]):
            for param in layer.parameters():
                param.requires_grad = False
    
    def forward(self, x):
        x = self.backbone(x)
        # Flatten if needed
        if x.dim() > 2:
            x = x.view(x.size(0), -1)
        return x


class MetadataEncoder(nn.Module):
    """
    Encode metadata (lat, lon, source) into dense representation.
    """
    
    def __init__(self, hidden_dim=64, num_sources=3, dropout=0.2):
        super(MetadataEncoder, self).__init__()
        
        # lat/lon (2) + source one-hot (num_sources)
        input_dim = 2 + num_sources
        
        self.fc = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True)
        )
        
        self.output_dim = hidden_dim
    
    def forward(self, lat, lon, source_onehot):
        # Concatenate all metadata
        x = torch.cat([
            lat.unsqueeze(1),
            lon.unsqueeze(1),
            source_onehot
        ], dim=1)
        
        return self.fc(x)


class FusionLayer(nn.Module):
    """
    Fuse image features with metadata features.
    """
    
    def __init__(self, image_dim, metadata_dim, fusion_dim=256, dropout=0.3):
        super(FusionLayer, self).__init__()
        
        self.fusion = nn.Sequential(
            nn.Linear(image_dim + metadata_dim, fusion_dim),
            nn.BatchNorm1d(fusion_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(fusion_dim, fusion_dim),
            nn.BatchNorm1d(fusion_dim),
            nn.ReLU(inplace=True)
        )
        
        self.output_dim = fusion_dim
    
    def forward(self, image_features, metadata_features):
        # Concatenate features
        x = torch.cat([image_features, metadata_features], dim=1)
        return self.fusion(x)


class ClassificationHead(nn.Module):
    """
    Classification head for final predictions.
    """
    
    def __init__(self, input_dim, num_classes, dropout=0.3):
        super(ClassificationHead, self).__init__()
        
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(input_dim, num_classes)
        )
    
    def forward(self, x):
        return self.classifier(x)


class AccessAtlasModel(nn.Module):
    """
    Complete AccessAtlas model combining image CNN with metadata.
    Supports multiple backbone architectures.
    """
    
    def __init__(
        self,
        num_classes: int = 5,
        backbone: str = 'custom',
        pretrained: bool = True,
        freeze_layers: int = 0,
        cnn_channels: list = [32, 64, 128],
        cnn_dropout: float = 0.3,
        metadata_hidden: int = 64,
        num_sources: int = 3,
        fusion_hidden: int = 256,
        fusion_dropout: float = 0.3,
        classifier_dropout: float = 0.3
    ):
        """
        Args:
            num_classes: Number of tag types to classify
            backbone: Image backbone ('custom', 'resnet18', 'resnet34', 'resnet50',
                     'efficientnet_b0', 'efficientnet_b1', 'mobilenet_v3_small',
                     'mobilenet_v3_large')
            pretrained: Use pretrained weights for transfer learning
            freeze_layers: Freeze first N layers of pretrained model
            cnn_channels: Channel dimensions for custom CNN
            cnn_dropout: Dropout rate for custom CNN
            metadata_hidden: Hidden dimension for metadata encoder
            num_sources: Number of source types (user, osm, model, etc.)
            fusion_hidden: Hidden dimension for fusion layer
            fusion_dropout: Dropout rate for fusion layer
            classifier_dropout: Dropout rate for classification head
        """
        super(AccessAtlasModel, self).__init__()
        
        self.backbone_name = backbone
        
        # Image feature extractor
        if backbone == 'custom':
            self.image_encoder = CNNFeatureExtractor(
                channels=cnn_channels,
                dropout=cnn_dropout
            )
        else:
            self.image_encoder = PretrainedBackbone(
                model_name=backbone,
                pretrained=pretrained,
                freeze_layers=freeze_layers
            )
        
        # Metadata encoder
        self.metadata_encoder = MetadataEncoder(
            hidden_dim=metadata_hidden,
            num_sources=num_sources,
            dropout=fusion_dropout
        )
        
        # Fusion layer
        self.fusion = FusionLayer(
            image_dim=self.image_encoder.output_dim,
            metadata_dim=self.metadata_encoder.output_dim,
            fusion_dim=fusion_hidden,
            dropout=fusion_dropout
        )
        
        # Classification head
        self.classifier = ClassificationHead(
            input_dim=self.fusion.output_dim,
            num_classes=num_classes,
            dropout=classifier_dropout
        )
    
    def forward(self, image, lat, lon, source_onehot):
        """
        Forward pass.
        
        Args:
            image: Batch of images [B, 3, H, W]
            lat: Batch of latitudes [B]
            lon: Batch of longitudes [B]
            source_onehot: Batch of one-hot source vectors [B, num_sources]
            
        Returns:
            Logits [B, num_classes]
        """
        # Extract features
        image_features = self.image_encoder(image)
        metadata_features = self.metadata_encoder(lat, lon, source_onehot)
        
        # Fuse features
        fused = self.fusion(image_features, metadata_features)
        
        # Classify
        logits = self.classifier(fused)
        
        return logits
    
    def get_num_params(self):
        """Count trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
    
    def get_model_info(self):
        """Get model architecture information."""
        return {
            'backbone': self.backbone_name,
            'num_params': self.get_num_params(),
            'image_feature_dim': self.image_encoder.output_dim,
            'metadata_feature_dim': self.metadata_encoder.output_dim,
            'fusion_dim': self.fusion.output_dim
        }


def create_model(config: dict) -> AccessAtlasModel:
    """
    Factory function to create model from config dictionary.
    
    Args:
        config: Configuration dict with model parameters
        
    Returns:
        Initialized model
    """
    model_config = config.get('model', {})
    
    model = AccessAtlasModel(
        num_classes=model_config.get('num_classes', 5),
        backbone=model_config.get('backbone', 'custom'),
        pretrained=model_config.get('pretrained', True),
        freeze_layers=model_config.get('freeze_layers', 0),
        cnn_channels=model_config.get('cnn_channels', [32, 64, 128]),
        cnn_dropout=model_config.get('cnn_dropout', 0.3),
        metadata_hidden=model_config.get('metadata_hidden', 64),
        num_sources=len(config.get('source_types', ['user', 'osm', 'model'])),
        fusion_hidden=model_config.get('fusion_hidden', 256),
        fusion_dropout=model_config.get('fusion_dropout', 0.3),
        classifier_dropout=model_config.get('classifier_dropout', 0.3)
    )
    
    return model


if __name__ == '__main__':
    # Test different architectures
    print("Testing AccessAtlas Model Architectures\n")
    
    # Create dummy input
    batch_size = 4
    images = torch.randn(batch_size, 3, 224, 224)
    lat = torch.randn(batch_size)
    lon = torch.randn(batch_size)
    source = torch.randn(batch_size, 3)
    
    # Test custom CNN
    print("1. Custom CNN Baseline")
    model_custom = AccessAtlasModel(num_classes=5, backbone='custom')
    output = model_custom(images, lat, lon, source)
    print(f"   Output shape: {output.shape}")
    print(f"   Parameters: {model_custom.get_num_params():,}")
    print(f"   Info: {model_custom.get_model_info()}\n")
    
    # Test ResNet18
    print("2. ResNet18 Transfer Learning")
    model_resnet = AccessAtlasModel(
        num_classes=5,
        backbone='resnet18',
        pretrained=True,
        freeze_layers=2
    )
    output = model_resnet(images, lat, lon, source)
    print(f"   Output shape: {output.shape}")
    print(f"   Parameters: {model_resnet.get_num_params():,}")
    print(f"   Info: {model_resnet.get_model_info()}\n")
    
    # Test MobileNetV3
    print("3. MobileNetV3 Small (Lightweight)")
    model_mobile = AccessAtlasModel(
        num_classes=5,
        backbone='mobilenet_v3_small',
        pretrained=True
    )
    output = model_mobile(images, lat, lon, source)
    print(f"   Output shape: {output.shape}")
    print(f"   Parameters: {model_mobile.get_num_params():,}")
    print(f"   Info: {model_mobile.get_model_info()}\n")
