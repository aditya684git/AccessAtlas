# AccessAtlas Training Pipeline - Command Reference

Quick reference for common commands in the production training pipeline.

---

## 📥 Data Preparation

### Generate Map Tiles
```bash
# From CSV with coordinates
cd scripts
python generate_tiles.py --csv ../data/tags.csv --zoom 18 --provider osm

# Single tile
python generate_tiles.py --lat 34.0522 --lon -118.2437 --zoom 18

# Mapbox tiles (better quality, requires token)
python generate_tiles.py --csv ../data/tags.csv --provider mapbox --token YOUR_TOKEN --zoom 18

# Google Maps tiles (requires API key)
python generate_tiles.py --csv ../data/tags.csv --provider google --token YOUR_API_KEY --zoom 18
```

### Preprocess Data
```bash
cd data
python preprocess.py --input tags.csv

# Custom split ratios
python preprocess.py --input tags.csv --train 0.8 --val 0.1 --test 0.1

# Different random seed
python preprocess.py --input tags.csv --seed 123
```

---

## 🏋️ Training

### Basic Training (Original Baseline)
```bash
cd models/baseline
python train.py
```

### Production Training (Transfer Learning)
```bash
cd scripts

# ResNet18 with pretrained weights
python train_pipeline.py --config ../models/baseline/config_production.yaml --experiment-name "resnet18-v1"

# With mixed precision (faster, less memory)
python train_pipeline.py --config ../models/baseline/config_production.yaml --amp

# With Weights & Biases tracking
python train_pipeline.py --config ../models/baseline/config_production.yaml --wandb --experiment-name "exp-001"

# Resume from checkpoint
python train_pipeline.py --config ../models/baseline/config_production.yaml --resume ../models/baseline/checkpoints/checkpoint_epoch_25.pth
```

### Quick Experiments
```bash
# Test with synthetic data
cd models/baseline
python quickstart.py

# Generate custom synthetic data
python generate_data.py --num_samples 500 --output ../../data/tags_synthetic.csv
```

---

## 📊 Evaluation

### Evaluate on Test Set
```bash
cd models/baseline

# Evaluate best model
python evaluate.py --checkpoint checkpoints/best_model.pth --split test

# Evaluate specific checkpoint
python evaluate.py --checkpoint checkpoints/checkpoint_epoch_30.pth --split test

# Evaluate on validation set
python evaluate.py --checkpoint checkpoints/best_model.pth --split val
```

### Single Prediction
```bash
cd models/baseline

python predict.py \
  --checkpoint checkpoints/best_model.pth \
  --image ../../data/images/tile_34.0522_-118.2437.png \
  --lat 34.0522 \
  --lon -118.2437 \
  --source user
```

---

## 🚢 Model Export

### Export to ONNX (Recommended)
```bash
cd scripts

# Standard export
python export_model.py \
  --checkpoint ../models/baseline/checkpoints/best_model.pth \
  --format onnx

# With quantization (4x smaller, minimal accuracy loss)
python export_model.py \
  --checkpoint ../models/baseline/checkpoints/best_model.pth \
  --format onnx \
  --quantize

# Custom output directory
python export_model.py \
  --checkpoint ../models/baseline/checkpoints/best_model.pth \
  --format onnx \
  --output ../exports/production
```

### Export to TorchScript
```bash
python export_model.py \
  --checkpoint ../models/baseline/checkpoints/best_model.pth \
  --format torchscript
```

### Export to CoreML (iOS)
```bash
python export_model.py \
  --checkpoint ../models/baseline/checkpoints/best_model.pth \
  --format coreml
```

### Export All Formats
```bash
python export_model.py \
  --checkpoint ../models/baseline/checkpoints/best_model.pth \
  --format all \
  --quantize
```

### Benchmark Inference Speed
```bash
python export_model.py \
  --checkpoint ../models/baseline/checkpoints/best_model.pth \
  --format onnx \
  --benchmark
```

---

## 🔧 Configuration Examples

### High-Accuracy Model (ResNet50)
```yaml
# config_resnet50.yaml
model:
  backbone: resnet50
  pretrained: true
  freeze_layers: 0

training:
  num_epochs: 100
  batch_size: 16  # Larger model needs smaller batch
  learning_rate: 0.00005
  scheduler: cosine
```

### Fast Training (MobileNet)
```yaml
# config_mobilenet.yaml
model:
  backbone: mobilenet_v3_small
  pretrained: true
  freeze_layers: 0

training:
  num_epochs: 50
  batch_size: 64  # Smaller model can use larger batch
  learning_rate: 0.0001
  scheduler: cosine
```

### Fine-Tuning Pretrained Model
```yaml
# config_finetune.yaml
model:
  backbone: resnet18
  pretrained: true
  freeze_layers: 6  # Freeze early layers

training:
  num_epochs: 30
  batch_size: 32
  learning_rate: 0.00001  # Very low LR
  scheduler: step
  step_lr_step_size: 10
```

### Large Effective Batch (Gradient Accumulation)
```yaml
# config_large_batch.yaml
training:
  batch_size: 8
  grad_accumulation_steps: 8  # Effective batch = 64
  learning_rate: 0.0002  # Scale with effective batch
```

---

## 🐛 Debugging Commands

### Check Data
```bash
# View CSV structure
head -n 5 data/tags.csv

# Count samples per class
cd data
python -c "import pandas as pd; df = pd.read_csv('tags.csv'); print(df['type'].value_counts())"

# Check for missing images
cd data
python -c "
import pandas as pd
from pathlib import Path
df = pd.read_csv('tags.csv')
missing = [p for p in df['image_path'] if not (Path('images')/p).exists()]
print(f'Missing {len(missing)} images')
"
```

### Verify Model Architecture
```bash
cd models/baseline

# Test model creation
python model_v2.py

# Check specific architecture
python -c "
from model_v2 import AccessAtlasModel
model = AccessAtlasModel(backbone='resnet18', pretrained=True)
print(model.get_model_info())
"
```

### Check GPU
```bash
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
```

### Verify Dependencies
```bash
cd models/baseline
python verify_install.py
```

---

## 📈 Monitoring

### View Training Logs
```bash
cd models/baseline/logs

# View latest training log
cat $(ls -t training_log_*.json | head -1) | python -m json.tool

# Extract validation accuracies
python -c "
import json
with open('$(ls -t training_log_*.json | head -1)') as f:
    log = json.load(f)
    for epoch in log['epochs']:
        print(f\"Epoch {epoch['epoch']}: Val Acc = {epoch['val_acc']:.2f}%\")
"
```

### View Confusion Matrix
```bash
cd models/baseline/errors

# Open latest confusion matrix
xdg-open $(ls -t confusion_matrix_*.png | head -1)  # Linux
open $(ls -t confusion_matrix_*.png | head -1)      # macOS
start $(ls -t confusion_matrix_*.png | head -1)     # Windows
```

### View Error Analysis
```bash
cd models/baseline/errors
cat $(ls -t error_analysis_*.json | head -1) | python -m json.tool
```

---

## 🔄 Workflow Examples

### Complete Training Workflow
```bash
# 1. Generate tiles
cd scripts
python generate_tiles.py --csv ../data/tags.csv --zoom 18

# 2. Preprocess
cd ../data
python preprocess.py --input tags.csv

# 3. Train with transfer learning
cd ../scripts
python train_pipeline.py --config ../models/baseline/config_production.yaml --amp --experiment-name "prod-v1"

# 4. Evaluate
cd ../models/baseline
python evaluate.py --checkpoint checkpoints/best_model.pth --split test

# 5. Export
cd ../../scripts
python export_model.py --checkpoint ../models/baseline/checkpoints/best_model.pth --format all
```

### Model Comparison Workflow
```bash
# Train multiple architectures
cd scripts

# ResNet18
python train_pipeline.py --config config_resnet18.yaml --experiment-name "resnet18"

# EfficientNet
python train_pipeline.py --config config_efficientnet.yaml --experiment-name "efficientnet"

# MobileNet
python train_pipeline.py --config config_mobilenet.yaml --experiment-name "mobilenet"

# Compare results
cd ../models/baseline/logs
python -c "
import json
from pathlib import Path

for log_file in sorted(Path('.').glob('training_history_*.json')):
    with open(log_file) as f:
        history = json.load(f)
        best_acc = max(e['val']['accuracy'] for e in history)
        print(f'{log_file.stem}: {best_acc:.2f}%')
"
```

### Hyperparameter Tuning
```bash
# Try different learning rates
for lr in 0.0001 0.0005 0.001 0.005; do
  python train_pipeline.py \
    --config config.yaml \
    --experiment-name "lr_${lr}" \
    2>&1 | tee "logs/train_lr_${lr}.log"
done
```

---

## 💡 Pro Tips

### Speed Up Training
```bash
# Use mixed precision + larger batch + more workers
python train_pipeline.py --config config.yaml --amp
# config.yaml: batch_size: 64, num_workers: 8
```

### Reduce Memory Usage
```bash
# Gradient accumulation with smaller batches
# config.yaml: 
#   batch_size: 8
#   grad_accumulation_steps: 8
```

### Quick Iteration
```bash
# Train on subset for debugging
# 1. Create small CSV
head -n 50 data/tags.csv > data/tags_debug.csv

# 2. Update config
# config.yaml: tags_csv: ../../data/tags_debug.csv, num_epochs: 5

# 3. Train fast
python train.py
```

---

**More details:** See `README_TRAINING_PIPELINE.md`
