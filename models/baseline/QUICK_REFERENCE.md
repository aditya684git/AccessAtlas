# 🚀 AccessAtlas Baseline Model - Quick Reference

## 📦 Installation
```bash
cd models/baseline
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

## ⚡ Quick Start (5 minutes)
```bash
python quickstart.py
# Generates 100 samples → Trains 5 epochs → Evaluates
```

## 🎯 Full Workflow

### 1. Prepare Data
```bash
# Option A: Generate synthetic data for testing
python generate_data.py --num_samples 500

# Option B: Use your own data
# Create data/tags.csv with columns: image_path,lat,lon,type,source
# Place images in data/images/
```

### 2. Train Model
```bash
python train.py
# Reads config.yaml, trains model, saves to checkpoints/
# Early stopping after 10 epochs without improvement
```

### 3. Evaluate
```bash
python evaluate.py --checkpoint checkpoints/best_model.pth --split test
# Outputs: accuracy, precision, recall, F1, confusion matrix
# Saves: errors/confusion_matrix_*.png, errors/error_analysis_*.json
```

### 4. Predict
```bash
python predict.py my_image.jpg --lat 34.67 --lon -82.48 --source user --probs
# Outputs: predicted class, confidence, probabilities
```

## 📝 CSV Format
```csv
image_path,lat,lon,type,source
images/sample_001.jpg,34.670123,-82.480456,ramp,user
images/sample_002.jpg,34.671234,-82.481567,elevator,osm
```

**Required Columns:**
- `image_path`: Relative path from `data/images/`
- `lat`: Latitude (float)
- `lon`: Longitude (float)
- `type`: One of: `ramp`, `elevator`, `tactile_path`, `entrance`, `obstacle`
- `source`: One of: `user`, `osm`, `model`

## ⚙️ Key Configuration (config.yaml)

```yaml
# Training
training:
  batch_size: 16           # Reduce if OOM (try 8 or 4)
  num_epochs: 50           # More epochs for better accuracy
  learning_rate: 0.001     # Lower for fine-tuning (0.0001)
  early_stopping_patience: 10

# Model
model:
  image_size: 224          # Input image size
  cnn_channels: [32, 64, 128]  # CNN depth
  num_classes: 5           # Number of tag types

# Augmentation
augmentation:
  enabled: true            # Disable for debugging
  random_rotation: 15
  random_horizontal_flip: 0.5
```

## 📊 Output Files

```
checkpoints/
├── best_model.pth              # Best model by validation accuracy
└── checkpoint_epoch_N.pth      # Checkpoint at epoch N

logs/
└── training_log_YYYYMMDD_HHMMSS.json  # Training history

errors/
├── confusion_matrix_test_*.png         # Confusion matrix heatmap
├── error_analysis_test_*.json          # Misclassified samples
├── metrics_test_*.json                 # Full metrics
└── images_test/                        # Copied misclassified images
    └── 001_true_ramp_pred_elevator_conf_0.87.jpg
```

## 🎓 Model Architecture

```
Input Image (224x224x3)
    ↓
CNN Feature Extractor (3 conv blocks)
    → Output: 128-dim feature vector
    
Metadata (lat, lon, source_onehot)
    ↓
Metadata Encoder (2 FC layers)
    → Output: 64-dim feature vector

Fusion Layer (concatenate + 2 FC layers)
    → Output: 256-dim fused features
    ↓
Classification Head
    → Output: 5 class logits
    ↓
Softmax
    → Output: Class probabilities
```

## 🔧 Common Commands

```bash
# Generate 1000 samples
python generate_data.py --num_samples 1000

# Train with custom config
python train.py  # Uses config.yaml

# Evaluate on validation set
python evaluate.py --checkpoint checkpoints/best_model.pth --split val

# Predict with full probabilities
python predict.py image.jpg --lat 34.67 --lon -82.48 --probs

# Test model architecture
python model.py

# Test dataset loader
python dataset.py
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Out of Memory | Reduce `batch_size` to 8 or 4 |
| Low Accuracy | Increase `num_epochs` to 100, enable `augmentation` |
| Slow Training | Increase `num_workers` to 4, use GPU |
| Import Errors | `pip install -r requirements.txt` |
| CUDA not found | Set `device: cpu` in config.yaml |

## 📈 Performance Tips

**Small Dataset (<500 samples):**
- Use aggressive augmentation
- Lower learning rate (0.0001)
- Smaller model: `cnn_channels: [16, 32, 64]`
- More dropout (0.5)

**Large Dataset (>5000 samples):**
- Larger model: `cnn_channels: [64, 128, 256]`
- Higher learning rate (0.001)
- Batch size 32-64
- Less dropout (0.3)

## 📞 Quick Help

```bash
python train.py --help        # Training options (none needed)
python evaluate.py --help     # Evaluation options
python predict.py --help      # Prediction options
```

## 🎯 Success Metrics

**Training is successful when:**
- ✅ Validation accuracy > 80%
- ✅ Training/validation loss converge
- ✅ No significant overfitting (train acc - val acc < 10%)
- ✅ Per-class F1 scores > 75%

**Check:**
1. `logs/training_log_*.json` for accuracy curves
2. `errors/confusion_matrix_*.png` for class confusions
3. `errors/error_analysis_*.json` for common mistakes

## 🔗 File Dependencies

```
train.py
  ├── imports: model.py, dataset.py, config.yaml
  └── outputs: checkpoints/, logs/

evaluate.py
  ├── imports: model.py, dataset.py, config.yaml
  └── outputs: errors/

predict.py
  ├── imports: model.py, config.yaml
  └── inputs: checkpoints/best_model.pth

dataset.py
  ├── inputs: data/tags.csv, data/images/
  └── outputs: train/val/test splits

generate_data.py
  └── outputs: data/tags.csv, data/images/
```

---

**Ready to start?** Run `python quickstart.py` to verify everything works!

**Need help?** Check `README.md` for detailed documentation.

**Found a bug?** All code is modular and easy to debug. Add print statements or use Python debugger.
