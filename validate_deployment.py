#!/usr/bin/env python3
"""
Deployment validation script - Run before deploying!

Usage:
    python validate_deployment.py
"""

import os
import sys
from pathlib import Path

def check_backend():
    """Validate backend configuration"""
    print("🔍 Checking Backend...")
    issues = []
    warnings = []
    
    # Check model file
    model_path = Path("backend/yolov5su.pt")
    if not model_path.exists():
        issues.append(f"❌ Model file not found: {model_path}")
    else:
        size_mb = model_path.stat().st_size / (1024 * 1024)
        print(f"  ✅ Model file exists: {size_mb:.1f} MB")
        if size_mb > 100:
            warnings.append(f"⚠️  Model size ({size_mb:.1f}MB) exceeds Render free tier limit (100MB)")
    
    # Check config files
    config_path = Path("backend/config.py")
    if not config_path.exists():
        warnings.append("⚠️  config.py not found - using fallback configuration")
    else:
        print("  ✅ config.py found")
    
    # Check improved main.py
    main_path = Path("backend/main_improved.py")
    if not main_path.exists():
        warnings.append("⚠️  main_improved.py not found - deployment may fail")
    else:
        print("  ✅ main_improved.py found")
    
    # Check .env.example
    env_example = Path("backend/.env.example")
    if not env_example.exists():
        warnings.append("⚠️  .env.example not found - add environment template")
    else:
        print("  ✅ .env.example found")
    
    return issues, warnings

def check_frontend():
    """Validate frontend configuration"""
    print("\n🔍 Checking Frontend...")
    issues = []
    warnings = []
    
    # Check fallback data
    fallback_data = Path("frontend/public/data/osm_fallback.json")
    if not fallback_data.exists():
        issues.append(f"❌ OSM fallback data not found: {fallback_data}")
    else:
        print(f"  ✅ OSM fallback data exists")
    
    # Check improved libraries
    osm_improved = Path("frontend/src/lib/osmApi_improved.ts")
    if not osm_improved.exists():
        warnings.append("⚠️  osmApi_improved.ts not found - OSM fallback may not work")
    else:
        print("  ✅ osmApi_improved.ts found")
    
    storage_improved = Path("frontend/src/lib/tagStorage_improved.ts")
    if not storage_improved.exists():
        warnings.append("⚠️  tagStorage_improved.ts not found - tag storage may fail")
    else:
        print("  ✅ tagStorage_improved.ts found")
    
    # Check build config
    package_json = Path("frontend/package.json")
    if not package_json.exists():
        issues.append("❌ package.json not found")
    else:
        print("  ✅ package.json found")
    
    return issues, warnings

def check_environment():
    """Check environment configuration"""
    print("\n🔍 Checking Environment...")
    issues = []
    warnings = []
    
    # Check Python version
    py_version = sys.version_info
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 9):
        warnings.append(f"⚠️  Python version {py_version.major}.{py_version.minor} detected. Recommend 3.9+")
    else:
        print(f"  ✅ Python {py_version.major}.{py_version.minor} (compatible)")
    
    # Check requirements.txt
    req_path = Path("backend/requirements.txt")
    if not req_path.exists():
        issues.append("❌ requirements.txt not found")
    else:
        print("  ✅ requirements.txt found")
        
        # Check for critical dependencies
        with open(req_path) as f:
            content = f.read()
            critical_deps = ["fastapi", "ultralytics", "torch", "pillow"]
            for dep in critical_deps:
                if dep not in content.lower():
                    warnings.append(f"⚠️  {dep} not found in requirements.txt")
    
    return issues, warnings

def check_git():
    """Check git configuration"""
    print("\n🔍 Checking Git Configuration...")
    issues = []
    warnings = []
    
    gitignore_path = Path(".gitignore")
    if not gitignore_path.exists():
        warnings.append("⚠️  .gitignore not found")
    else:
        with open(gitignore_path) as f:
            content = f.read()
            
            # Check if model file is allowed
            if "*.pt" in content and "!backend/yolov5su.pt" not in content:
                warnings.append("⚠️  Model file may be excluded by .gitignore. Add: !backend/yolov5su.pt")
            
            # Check sensitive files are ignored
            if ".env" not in content:
                warnings.append("⚠️  .env files should be in .gitignore")
            
            print("  ✅ .gitignore configured")
    
    return issues, warnings

def main():
    """Run all validation checks"""
    print("=" * 60)
    print("🚀 AccessAtlas Deployment Validation")
    print("=" * 60)
    
    all_issues = []
    all_warnings = []
    
    # Run checks
    issues, warnings = check_backend()
    all_issues.extend(issues)
    all_warnings.extend(warnings)
    
    issues, warnings = check_frontend()
    all_issues.extend(issues)
    all_warnings.extend(warnings)
    
    issues, warnings = check_environment()
    all_issues.extend(issues)
    all_warnings.extend(warnings)
    
    issues, warnings = check_git()
    all_issues.extend(issues)
    all_warnings.extend(warnings)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 Validation Summary")
    print("=" * 60)
    
    if all_issues:
        print(f"\n❌ {len(all_issues)} Critical Issues Found:")
        for issue in all_issues:
            print(f"  {issue}")
    
    if all_warnings:
        print(f"\n⚠️  {len(all_warnings)} Warnings:")
        for warning in all_warnings:
            print(f"  {warning}")
    
    if not all_issues and not all_warnings:
        print("\n✅ All checks passed! Ready for deployment.")
        return 0
    elif not all_issues:
        print(f"\n⚠️  Ready for deployment with {len(all_warnings)} warnings.")
        return 0
    else:
        print(f"\n❌ Fix {len(all_issues)} critical issues before deploying.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
