#!/bin/bash
# Integration Validation Script for AccessAtlas
# Run this to verify all components are properly configured

echo "🔍 AccessAtlas Integration Validation"
echo "=================================="
echo ""

# Check backend
echo "📦 Backend Status:"
if [ -f "backend/main.py" ]; then
    echo "  ✅ main.py exists"
    if grep -q "from fastapi import" backend/main.py; then
        echo "  ✅ FastAPI imported"
    fi
    if grep -q "CORSMiddleware" backend/main.py; then
        echo "  ✅ CORS configured"
    fi
    if grep -q "@app.post(\"/detect\")" backend/main.py; then
        echo "  ✅ /detect endpoint defined"
    fi
    if grep -q "@app.post(\"/voice\")" backend/main.py; then
        echo "  ✅ /voice endpoint defined"
    fi
else
    echo "  ❌ main.py not found"
fi

echo ""

# Check frontend structure
echo "🎨 Frontend Status:"
if [ -d "frontend/src" ]; then
    echo "  ✅ src/ directory exists"
    
    if [ -f "frontend/src/components/ui/upload.tsx" ]; then
        echo "  ✅ Upload component exists"
    fi
    
    if [ -f "frontend/src/hooks/useDetection.ts" ]; then
        echo "  ✅ useDetection hook exists"
    fi
    
    if [ -f "frontend/src/hooks/useVoice.ts" ]; then
        echo "  ✅ useVoice hook exists"
    fi
    
    if [ -f "frontend/src/hooks/useHistory.ts" ]; then
        echo "  ✅ useHistory hook exists"
    fi
    
    if [ -f "frontend/src/lib/api.ts" ]; then
        echo "  ✅ api.ts exists"
        if grep -q "const BASE_URL = 'http://localhost:8000'" frontend/src/lib/api.ts; then
            echo "  ✅ API base URL correct"
        fi
        if grep -q "timeout: 60000" frontend/src/lib/api.ts; then
            echo "  ✅ 60s timeout configured"
        fi
    fi
    
    if [ -f "frontend/src/lib/historyService.ts" ]; then
        echo "  ✅ historyService exists"
    fi
else
    echo "  ❌ src/ directory not found"
fi

echo ""

# Check configuration files
echo "⚙️  Configuration Status:"
if [ -f "frontend/tsconfig.app.json" ]; then
    echo "  ✅ tsconfig.app.json exists"
    if grep -q '"@/\*": \["./src/\*"\]' frontend/tsconfig.app.json; then
        echo "  ✅ Path alias @/ configured"
    fi
fi

if [ -f "frontend/vite.config.ts" ]; then
    echo "  ✅ vite.config.ts exists"
fi

echo ""

# Check backend requirements
echo "🔧 Backend Dependencies:"
if [ -f "backend/requirements.txt" ]; then
    echo "  ✅ requirements.txt exists"
    if grep -q "fastapi" backend/requirements.txt; then
        echo "  ✅ FastAPI listed"
    fi
    if grep -q "uvicorn" backend/requirements.txt; then
        echo "  ✅ Uvicorn listed"
    fi
    if grep -q "ultralytics" backend/requirements.txt; then
        echo "  ✅ YOLOv5 (ultralytics) listed"
    fi
    if grep -q "pyttsx3" backend/requirements.txt; then
        echo "  ✅ pyttsx3 (voice) listed"
    fi
else
    echo "  ❌ requirements.txt not found"
fi

echo ""

# Check frontend dependencies
echo "📚 Frontend Dependencies:"
if [ -f "frontend/package.json" ]; then
    echo "  ✅ package.json exists"
    if grep -q '"axios"' frontend/package.json; then
        echo "  ✅ Axios listed"
    fi
    if grep -q '"react"' frontend/package.json; then
        echo "  ✅ React listed"
    fi
    if grep -q '"typescript"' frontend/package.json; then
        echo "  ✅ TypeScript listed"
    fi
else
    echo "  ❌ package.json not found"
fi

echo ""

# Check UI components
echo "🎛️  UI Components Status:"
components=("FileInput.tsx" "LoadingIndicator.tsx" "ErrorMessage.tsx" "DetectionList.tsx" "VoiceFeedback.tsx" "ActionButtons.tsx")
for component in "${components[@]}"; do
    if [ -f "frontend/src/components/ui/$component" ]; then
        echo "  ✅ $component exists"
    else
        echo "  ❌ $component missing"
    fi
done

echo ""
echo "✅ Validation Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Install backend: pip install -r backend/requirements.txt"
echo "2. Run backend: cd backend && uvicorn main:app --reload"
echo "3. Run frontend: cd frontend && npm run dev"
echo "4. Visit: http://localhost:8080"
echo ""
