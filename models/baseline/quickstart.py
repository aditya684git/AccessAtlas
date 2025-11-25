#!/usr/bin/env python3
"""
Quick start script to test the entire pipeline with synthetic data.
"""

import os
import sys
import subprocess


def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"\n{'='*70}")
    print(f"🚀 {description}")
    print(f"{'='*70}\n")
    print(f"Running: {cmd}\n")
    
    result = subprocess.run(cmd, shell=True)
    
    if result.returncode != 0:
        print(f"\n❌ Failed: {description}")
        sys.exit(1)
    
    print(f"\n✅ Completed: {description}")


def main():
    """
    Quick start pipeline:
    1. Generate synthetic data
    2. Train model (5 epochs for testing)
    3. Evaluate on test set
    """
    # Ensure we're in the correct directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    print(f"Working directory: {os.getcwd()}\n")
    
    print("""
    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║            AccessAtlas Baseline Model - Quick Start              ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    # Step 1: Generate synthetic data
    run_command(
        "python generate_data.py --num_samples 100",
        "Step 1: Generating 100 synthetic samples"
    )
    
    # Step 2: Train model (reduced epochs for quick test)
    print("\n📝 Note: Training with reduced epochs (5) for quick testing.")
    print("   Edit config.yaml to increase num_epochs for production training.\n")
    
    # Temporarily modify config for quick test
    import yaml
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    original_epochs = config['training']['num_epochs']
    config['training']['num_epochs'] = 5
    config['training']['early_stopping_patience'] = 10
    
    with open('config.yaml', 'w') as f:
        yaml.dump(config, f)
    
    run_command(
        "python train.py",
        "Step 2: Training model (5 epochs)"
    )
    
    # Restore original config
    config['training']['num_epochs'] = original_epochs
    with open('config.yaml', 'w') as f:
        yaml.dump(config, f)
    
    # Step 3: Evaluate
    run_command(
        "python evaluate.py --checkpoint checkpoints/best_model.pth --split test",
        "Step 3: Evaluating model on test set"
    )
    
    print("""
    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║                    ✅ PIPELINE TEST COMPLETE!                     ║
    ║                                                                   ║
    ║  Next steps:                                                      ║
    ║  1. Check checkpoints/ for saved models                          ║
    ║  2. Check logs/ for training history                             ║
    ║  3. Check errors/ for evaluation results                         ║
    ║                                                                   ║
    ║  For production training:                                         ║
    ║  - Generate more samples (500+)                                   ║
    ║  - Use real images from your dataset                              ║
    ║  - Increase num_epochs in config.yaml (50+)                       ║
    ║  - Adjust hyperparameters as needed                               ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝
    """)


if __name__ == "__main__":
    main()
