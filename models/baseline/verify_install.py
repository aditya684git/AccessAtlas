"""
Verify installation and environment setup.
"""

import sys
import os


def check_python_version():
    """Check Python version."""
    print("Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"  ✅ Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"  ❌ Python {version.major}.{version.minor} (requires 3.8+)")
        return False


def check_dependencies():
    """Check if required packages are installed."""
    print("\nChecking dependencies...")
    
    required = {
        'torch': 'PyTorch',
        'torchvision': 'TorchVision',
        'numpy': 'NumPy',
        'pandas': 'Pandas',
        'PIL': 'Pillow',
        'sklearn': 'scikit-learn',
        'matplotlib': 'Matplotlib',
        'seaborn': 'Seaborn',
        'yaml': 'PyYAML',
        'tqdm': 'tqdm'
    }
    
    missing = []
    for module, name in required.items():
        try:
            __import__(module)
            print(f"  ✅ {name}")
        except ImportError:
            print(f"  ❌ {name} (missing)")
            missing.append(name)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print(f"   Install with: pip install -r requirements.txt")
        return False
    
    return True


def check_file_structure():
    """Check if all required files exist."""
    print("\nChecking file structure...")
    
    required_files = [
        'config.yaml',
        'model.py',
        'dataset.py',
        'train.py',
        'evaluate.py',
        'predict.py',
        'generate_data.py',
        'requirements.txt',
        'README.md'
    ]
    
    missing = []
    for filename in required_files:
        if os.path.exists(filename):
            print(f"  ✅ {filename}")
        else:
            print(f"  ❌ {filename} (missing)")
            missing.append(filename)
    
    if missing:
        print(f"\n⚠️  Missing files: {', '.join(missing)}")
        return False
    
    return True


def check_directories():
    """Check if required directories exist."""
    print("\nChecking directories...")
    
    required_dirs = [
        'checkpoints',
        'logs',
        'errors',
        '../../data'
    ]
    
    missing = []
    for dirname in required_dirs:
        if os.path.exists(dirname):
            print(f"  ✅ {dirname}/")
        else:
            print(f"  ❌ {dirname}/ (missing)")
            missing.append(dirname)
    
    if missing:
        print(f"\n⚠️  Missing directories: {', '.join(missing)}")
        print(f"   Creating...")
        for dirname in missing:
            try:
                os.makedirs(dirname, exist_ok=True)
                print(f"     ✅ Created {dirname}/")
            except Exception as e:
                print(f"     ❌ Failed to create {dirname}: {e}")
    
    return True


def check_cuda():
    """Check CUDA availability."""
    print("\nChecking CUDA availability...")
    try:
        import torch
        if torch.cuda.is_available():
            print(f"  ✅ CUDA available")
            print(f"     Device: {torch.cuda.get_device_name(0)}")
            print(f"     CUDA version: {torch.version.cuda}")
            return True
        else:
            print(f"  ℹ️  CUDA not available (will use CPU)")
            print(f"     To use GPU, ensure CUDA-enabled PyTorch is installed")
            return True
    except ImportError:
        print(f"  ⚠️  PyTorch not installed")
        return False


def test_model_import():
    """Test if model can be imported."""
    print("\nTesting model import...")
    try:
        import yaml
        from model import get_model
        
        with open('config.yaml', 'r') as f:
            config = yaml.safe_load(f)
        
        model = get_model(config)
        print(f"  ✅ Model imported successfully")
        
        # Count parameters
        total_params = sum(p.numel() for p in model.parameters())
        print(f"     Total parameters: {total_params:,}")
        
        return True
    except Exception as e:
        print(f"  ❌ Failed to import model: {e}")
        return False


def main():
    """Run all checks."""
    print("""
    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║        AccessAtlas Baseline Model - Installation Checker         ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("File Structure", check_file_structure),
        ("Directories", check_directories),
        ("CUDA", check_cuda),
        ("Model Import", test_model_import)
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Error during {name} check: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70 + "\n")
    
    all_passed = True
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:<10} {name}")
        if not result:
            all_passed = False
    
    print("\n" + "="*70)
    
    if all_passed:
        print("""
    ✅ ALL CHECKS PASSED!
    
    You're ready to start training. Try:
      1. python quickstart.py        (Quick test with synthetic data)
      2. python generate_data.py     (Generate 500 samples)
      3. python train.py              (Train model)
      4. python evaluate.py           (Evaluate results)
    
    For detailed documentation, see README.md
        """)
    else:
        print("""
    ⚠️  SOME CHECKS FAILED
    
    Please fix the issues above before proceeding.
    
    Common solutions:
      - Install dependencies: pip install -r requirements.txt
      - Ensure you're in the correct directory: cd models/baseline
      - Check Python version: python --version (need 3.8+)
        """)
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
