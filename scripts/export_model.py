#!/usr/bin/env python3
"""
Model Export Script for AccessAtlas

Exports trained PyTorch models to various formats for deployment:
- ONNX: Cross-platform inference
- TorchScript: Production PyTorch deployment
- TFLite: Mobile deployment (via ONNX -> TF -> TFLite)
- CoreML: iOS deployment

Usage:
    # Export to ONNX
    python export_model.py --checkpoint checkpoints/best_model.pth --format onnx
    
    # Export to TorchScript
    python export_model.py --checkpoint checkpoints/best_model.pth --format torchscript
    
    # Export with quantization (smaller model)
    python export_model.py --checkpoint checkpoints/best_model.pth --format onnx --quantize
    
    # Export all formats
    python export_model.py --checkpoint checkpoints/best_model.pth --format all
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import torch
import torch.nn as nn
import yaml

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from baseline.model_v2 import create_model, AccessAtlasModel


class ModelExporter:
    """Export trained models to deployment formats."""
    
    def __init__(
        self,
        checkpoint_path: str,
        output_dir: str = 'exports',
        image_size: int = 224
    ):
        """
        Initialize exporter.
        
        Args:
            checkpoint_path: Path to trained model checkpoint
            output_dir: Directory to save exported models
            image_size: Input image size
        """
        self.checkpoint_path = Path(checkpoint_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.image_size = image_size
        
        # Load checkpoint
        print(f"Loading checkpoint: {checkpoint_path}")
        self.checkpoint = torch.load(checkpoint_path, map_location='cpu')
        self.config = self.checkpoint['config']
        
        # Load model
        self.model = create_model(self.config)
        self.model.load_state_dict(self.checkpoint['model_state_dict'])
        self.model.eval()
        
        print(f"✅ Loaded model: {self.model.get_model_info()}")
        
        # Create example inputs
        self.example_inputs = self._create_example_inputs()
    
    def _create_example_inputs(self) -> Tuple[torch.Tensor, ...]:
        """Create example inputs for tracing."""
        batch_size = 1
        num_sources = len(self.config.get('source_types', ['user', 'osm', 'model']))
        
        image = torch.randn(batch_size, 3, self.image_size, self.image_size)
        lat = torch.randn(batch_size)
        lon = torch.randn(batch_size)
        source_onehot = torch.randn(batch_size, num_sources)
        
        return (image, lat, lon, source_onehot)
    
    def export_onnx(
        self,
        quantize: bool = False,
        opset_version: int = 14
    ) -> str:
        """
        Export model to ONNX format.
        
        Args:
            quantize: Apply dynamic quantization
            opset_version: ONNX opset version
            
        Returns:
            Path to exported ONNX file
        """
        print("\n📦 Exporting to ONNX...")
        
        model_name = self.checkpoint_path.stem
        output_path = self.output_dir / f"{model_name}.onnx"
        
        # Prepare model
        model = self.model.cpu()
        model.eval()
        
        # Apply quantization if requested
        if quantize:
            print("   Applying dynamic quantization...")
            model = torch.quantization.quantize_dynamic(
                model,
                {nn.Linear, nn.Conv2d},
                dtype=torch.qint8
            )
            output_path = self.output_dir / f"{model_name}_quantized.onnx"
        
        # Export
        torch.onnx.export(
            model,
            self.example_inputs,
            output_path,
            export_params=True,
            opset_version=opset_version,
            do_constant_folding=True,
            input_names=['image', 'lat', 'lon', 'source'],
            output_names=['logits'],
            dynamic_axes={
                'image': {0: 'batch_size'},
                'lat': {0: 'batch_size'},
                'lon': {0: 'batch_size'},
                'source': {0: 'batch_size'},
                'logits': {0: 'batch_size'}
            }
        )
        
        # Verify ONNX model
        try:
            import onnx
            onnx_model = onnx.load(str(output_path))
            onnx.checker.check_model(onnx_model)
            print(f"✅ ONNX export successful: {output_path}")
            
            # Get model size
            size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"   Model size: {size_mb:.2f} MB")
            
        except ImportError:
            print("⚠️  ONNX not installed. Install with: pip install onnx")
        
        return str(output_path)
    
    def export_torchscript(
        self,
        method: str = 'trace'
    ) -> str:
        """
        Export model to TorchScript format.
        
        Args:
            method: 'trace' or 'script'
            
        Returns:
            Path to exported TorchScript file
        """
        print("\n📦 Exporting to TorchScript...")
        
        model_name = self.checkpoint_path.stem
        output_path = self.output_dir / f"{model_name}.pt"
        
        model = self.model.cpu()
        model.eval()
        
        if method == 'trace':
            print("   Using torch.jit.trace...")
            traced = torch.jit.trace(model, self.example_inputs)
            traced.save(str(output_path))
        
        elif method == 'script':
            print("   Using torch.jit.script...")
            scripted = torch.jit.script(model)
            scripted.save(str(output_path))
        
        else:
            raise ValueError(f"Unknown method: {method}. Use 'trace' or 'script'")
        
        print(f"✅ TorchScript export successful: {output_path}")
        
        # Get model size
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"   Model size: {size_mb:.2f} MB")
        
        return str(output_path)
    
    def export_coreml(self) -> str:
        """
        Export model to CoreML format (for iOS).
        
        Returns:
            Path to exported CoreML file
        """
        print("\n📦 Exporting to CoreML...")
        
        try:
            import coremltools as ct
        except ImportError:
            print("⚠️  CoreMLTools not installed. Install with: pip install coremltools")
            return None
        
        model_name = self.checkpoint_path.stem
        output_path = self.output_dir / f"{model_name}.mlmodel"
        
        # First export to TorchScript
        model = self.model.cpu()
        model.eval()
        traced = torch.jit.trace(model, self.example_inputs)
        
        # Convert to CoreML
        image, lat, lon, source = self.example_inputs
        
        coreml_model = ct.convert(
            traced,
            inputs=[
                ct.ImageType(
                    name="image",
                    shape=image.shape,
                    scale=1/255.0,
                    bias=[0, 0, 0]
                ),
                ct.TensorType(name="lat", shape=lat.shape),
                ct.TensorType(name="lon", shape=lon.shape),
                ct.TensorType(name="source", shape=source.shape)
            ],
            outputs=[ct.TensorType(name="logits")],
            minimum_deployment_target=ct.target.iOS15
        )
        
        # Add metadata
        coreml_model.author = "AccessAtlas"
        coreml_model.short_description = "Accessibility tag classification model"
        coreml_model.version = "1.0"
        
        # Save
        coreml_model.save(str(output_path))
        
        print(f"✅ CoreML export successful: {output_path}")
        
        return str(output_path)
    
    def benchmark_inference(
        self,
        num_runs: int = 100
    ) -> Dict[str, float]:
        """
        Benchmark inference speed.
        
        Args:
            num_runs: Number of inference runs
            
        Returns:
            Timing statistics
        """
        print(f"\n⏱️  Benchmarking inference ({num_runs} runs)...")
        
        model = self.model.cpu()
        model.eval()
        
        # Warmup
        with torch.no_grad():
            for _ in range(10):
                model(*self.example_inputs)
        
        # Benchmark
        import time
        times = []
        
        with torch.no_grad():
            for _ in range(num_runs):
                start = time.perf_counter()
                model(*self.example_inputs)
                end = time.perf_counter()
                times.append((end - start) * 1000)  # Convert to ms
        
        times = np.array(times)
        
        stats = {
            'mean_ms': float(times.mean()),
            'std_ms': float(times.std()),
            'min_ms': float(times.min()),
            'max_ms': float(times.max()),
            'median_ms': float(np.median(times))
        }
        
        print(f"   Mean:   {stats['mean_ms']:.2f} ms")
        print(f"   Median: {stats['median_ms']:.2f} ms")
        print(f"   Min:    {stats['min_ms']:.2f} ms")
        print(f"   Max:    {stats['max_ms']:.2f} ms")
        
        return stats
    
    def save_metadata(self):
        """Save export metadata."""
        metadata = {
            'checkpoint': str(self.checkpoint_path),
            'config': self.config,
            'model_info': self.model.get_model_info(),
            'epoch': self.checkpoint.get('epoch'),
            'best_val_acc': self.checkpoint.get('best_val_acc'),
            'image_size': self.image_size
        }
        
        metadata_path = self.output_dir / 'export_metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n✅ Saved metadata: {metadata_path}")
    
    def export_all(self, quantize: bool = False):
        """Export to all supported formats."""
        print("\n" + "="*70)
        print("🚀 Exporting AccessAtlas Model to All Formats")
        print("="*70)
        
        # ONNX
        self.export_onnx(quantize=quantize)
        
        # TorchScript
        self.export_torchscript()
        
        # CoreML (optional, may fail if not on macOS)
        try:
            self.export_coreml()
        except Exception as e:
            print(f"⚠️  CoreML export failed: {e}")
        
        # Benchmark
        self.benchmark_inference()
        
        # Save metadata
        self.save_metadata()
        
        print("\n" + "="*70)
        print("✅ Export Complete!")
        print(f"Models saved to: {self.output_dir}")
        print("="*70 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='Export AccessAtlas models for deployment',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--checkpoint',
        type=str,
        required=True,
        help='Path to model checkpoint (.pth)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='exports',
        help='Output directory (default: exports)'
    )
    parser.add_argument(
        '--format',
        type=str,
        choices=['onnx', 'torchscript', 'coreml', 'all'],
        default='onnx',
        help='Export format (default: onnx)'
    )
    parser.add_argument(
        '--quantize',
        action='store_true',
        help='Apply dynamic quantization (ONNX only)'
    )
    parser.add_argument(
        '--image-size',
        type=int,
        default=224,
        help='Input image size (default: 224)'
    )
    parser.add_argument(
        '--benchmark',
        action='store_true',
        help='Run inference benchmark'
    )
    
    args = parser.parse_args()
    
    # Initialize exporter
    exporter = ModelExporter(
        checkpoint_path=args.checkpoint,
        output_dir=args.output,
        image_size=args.image_size
    )
    
    # Export
    if args.format == 'all':
        exporter.export_all(quantize=args.quantize)
    
    elif args.format == 'onnx':
        exporter.export_onnx(quantize=args.quantize)
        if args.benchmark:
            exporter.benchmark_inference()
        exporter.save_metadata()
    
    elif args.format == 'torchscript':
        exporter.export_torchscript()
        if args.benchmark:
            exporter.benchmark_inference()
        exporter.save_metadata()
    
    elif args.format == 'coreml':
        exporter.export_coreml()
        exporter.save_metadata()


if __name__ == '__main__':
    main()
