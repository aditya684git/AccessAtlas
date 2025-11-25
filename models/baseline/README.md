# AccessAtlas Baseline Model

A PyTorch-based baseline model for predicting accessibility tag types from image tiles and metadata.

## Project Structure

```
models/baseline/
├── model.py           # Model architecture (CNN + Metadata Fusion)
├── dataset.py         # Dataset loader and preprocessing
├── train.py           # Training loop
├── evaluate.py        # Evaluation and error analysis
├── config.yaml        # Hyperparameters and configuration
├── requirements.txt   # Python dependencies
├── checkpoints/       # Saved model weights
├── logs/              # Training logs
└── errors/            # Misclassified samples and analysis
```

## Features

### Model Architecture
- **CNN Feature Extractor**: 3-layer convolutional network for image feature extraction
- **Metadata Encoder**: Fully connected layers for lat/lon + one-hot encoded source
- **Fusion Layer**: Combines image and metadata features
- **Classification Head**: Predicts tag type (ramp, elevator, tactile_path, entrance, obstacle)

### Training Features
- ✅ Cross-entropy loss with Adam/SGD optimizer
- ✅ Learning rate scheduling (StepLR, CosineAnnealing)
- ✅ Early stopping with patience
- ✅ Data augmentation (rotation, flip, color jitter, crop)
- ✅ Gradient clipping
- ✅ Checkpoint saving (best and last)
- ✅ Training history logging

### Evaluation Features
- ✅ Accuracy, precision, recall, F1-score
- ✅ Per-class metrics
- ✅ Confusion matrix visualization
- ✅ Error analysis with top-K misclassified samples
- ✅ Automatic image export of errors

## Installation

### 1. Create Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate
```

### 2. Install Dependencies

```bash
cd models/baseline
pip install -r requirements.txt
```

## Data Preparation

### CSV Format

Your `data/tags.csv` should have the following columns:

```csv
image_path,lat,lon,type,source
images/sample_001.jpg,34.670,-82.480,ramp,user
images/sample_002.jpg,34.671,-82.481,elevator,osm
...
```

- **image_path**: Relative path from `data/images/`
- **lat**: Latitude (float)
- **lon**: Longitude (float)
- **type**: Tag type (one of: ramp, elevator, tactile_path, entrance, obstacle)
- **source**: Source type (one of: user, osm, model)

### Image Requirements

- Place all images in `data/images/`
- Recommended size: 224x224 or larger
- Format: JPG, PNG
- The dataset loader will automatically resize to 224x224

## Usage

### 1. Configure Hyperparameters

Edit `config.yaml` to adjust:
- Model architecture (CNN channels, hidden dimensions)
- Training parameters (batch size, learning rate, epochs)
- Data augmentation settings
- Paths and logging options

### 2. Train Model

```bash
cd models/baseline
python train.py
```

This will:
- Automatically split your data into train/val/test (70/15/15)
- Train for the specified number of epochs
- Save checkpoints to `checkpoints/`
- Log training history to `logs/`
- Apply early stopping if validation accuracy plateaus

**Training Output:**
```
Epoch 1/50 [Train]: 100%|████████| Loss: 1.2345 | Acc: 45.67%
Epoch 1/50 [Val]:   100%|████████| Loss: 1.1234 | Acc: 50.12%

Epoch 1/50
  Train Loss: 1.2345 | Train Acc: 45.67%
  Val Loss:   1.1234 | Val Acc:   50.12%

Checkpoint saved: checkpoints/best_model_epoch_1.pth
```

### 3. Evaluate Model

```bash
# Evaluate on test set
python evaluate.py --checkpoint checkpoints/best_model.pth --split test

# Evaluate on validation set
python evaluate.py --checkpoint checkpoints/best_model.pth --split val
```

**Evaluation Output:**
```
======================================================================
TEST SET EVALUATION RESULTS
======================================================================

Overall Accuracy: 87.50%
Macro Precision:  86.23%
Macro Recall:     85.67%
Macro F1-Score:   85.94%

======================================================================
PER-CLASS METRICS
======================================================================

Class           Precision     Recall   F1-Score    Support
----------------------------------------------------------------------
ramp               92.31%     88.89%     90.57%        100
elevator           85.71%     84.00%     84.84%         80
tactile_path       80.00%     82.35%     81.16%         90
entrance           88.46%     90.62%     89.53%         85
obstacle           84.62%     82.50%     83.54%         95
======================================================================

Confusion matrix saved: errors/confusion_matrix_test_20250120_143022.png
Error analysis saved: errors/error_analysis_test_20250120_143022.json
Misclassified images saved to: errors/images_test/
```

### 4. Error Analysis

After evaluation, check the `errors/` directory for:

- **confusion_matrix_*.png**: Visual confusion matrix
- **error_analysis_*.json**: JSON with all misclassified samples
- **images_test/**: Copied images of misclassified samples with naming:
  ```
  001_true_ramp_pred_elevator_conf_0.87.jpg
  002_true_entrance_pred_obstacle_conf_0.73.jpg
  ```

## Configuration Options

### Key Hyperparameters

```yaml
# Model size
model:
  cnn_channels: [32, 64, 128]  # More channels = more capacity
  fusion_hidden: 256            # Fusion layer size

# Training
training:
  batch_size: 16               # Adjust based on GPU memory
  learning_rate: 0.001         # Lower for fine-tuning
  num_epochs: 50               # More epochs for complex data
  early_stopping_patience: 10  # Stop if no improvement

# Augmentation
augmentation:
  enabled: true                # Disable for debugging
  random_rotation: 15          # Degrees
  random_horizontal_flip: 0.5  # Probability
```

## Extending the Model

### Add More Tag Types

1. Edit `config.yaml`:
   ```yaml
   tag_types:
     - "ramp"
     - "elevator"
     - "tactile_path"
     - "entrance"
     - "obstacle"
     - "parking"        # New type
     - "restroom"       # New type
   ```

2. Update `num_classes` in config:
   ```yaml
   model:
     num_classes: 7  # Updated from 5
   ```

3. Retrain from scratch

### Use Pre-trained CNN Backbone

Replace `CNNFeatureExtractor` in `model.py` with:

```python
import torchvision.models as models

class PretrainedCNN(nn.Module):
    def __init__(self):
        super().__init__()
        resnet = models.resnet18(pretrained=True)
        self.features = nn.Sequential(*list(resnet.children())[:-1])
        self.output_dim = 512
    
    def forward(self, x):
        x = self.features(x)
        return x.view(x.size(0), -1)
```

### Add TensorBoard Logging

1. Install: `pip install tensorboard`
2. Enable in `config.yaml`:
   ```yaml
   logging:
     tensorboard: true
   ```
3. Add to `train.py`:
   ```python
   from torch.utils.tensorboard import SummaryWriter
   writer = SummaryWriter(log_dir='logs/tensorboard')
   writer.add_scalar('Loss/train', train_loss, epoch)
   ```

## Troubleshooting

### Out of Memory (OOM)
- Reduce `batch_size` in config.yaml
- Reduce `cnn_channels` (e.g., [16, 32, 64])
- Use smaller `image_size` (e.g., 128)

### Low Accuracy
- Increase `num_epochs` (try 100+)
- Enable data `augmentation`
- Increase model capacity (`cnn_channels`, `fusion_hidden`)
- Check data quality and class balance

### Overfitting
- Increase `dropout` values
- Enable more aggressive `augmentation`
- Reduce model size
- Add more training data

### Slow Training
- Increase `batch_size` (if GPU allows)
- Set `num_workers: 4` or higher
- Ensure `pin_memory: true`
- Use GPU: `device: cuda`

## Model Performance Tips

### For Small Datasets (~500 samples)
- Use aggressive augmentation
- Lower learning rate (0.0001)
- Smaller model (channels: [16, 32, 64])
- More dropout (0.5)

### For Large Datasets (5000+ samples)
- Larger model (channels: [64, 128, 256])
- Higher learning rate (0.001)
- Less dropout (0.3)
- Batch size 32-64

## Citation

```bibtex
@software{accessatlas_baseline,
  title={AccessAtlas Baseline Model},
  author={Your Name},
  year={2025},
  url={https://github.com/yourusername/AccessAtlas}
}
```

## License

MIT License - See LICENSE file for details
