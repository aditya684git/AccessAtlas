# Integration Validation Script for AccessAtlas (PowerShell)
# Run this to verify all components are properly configured

Write-Host "Integration Validation" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check backend
Write-Host "📦 Backend Status:" -ForegroundColor Yellow
if (Test-Path "backend/main.py") {
    Write-Host "  ✅ main.py exists"
    if (Select-String -Path "backend/main.py" -Pattern "from fastapi import" -Quiet) {
        Write-Host "  ✅ FastAPI imported"
    }
    if (Select-String -Path "backend/main.py" -Pattern "CORSMiddleware" -Quiet) {
        Write-Host "  ✅ CORS configured"
    }
    if (Select-String -Path "backend/main.py" -Pattern '@app.post\("/detect"\)' -Quiet) {
        Write-Host "  ✅ /detect endpoint defined"
    }
    if (Select-String -Path "backend/main.py" -Pattern '@app.post\("/voice"\)' -Quiet) {
        Write-Host "  ✅ /voice endpoint defined"
    }
} else {
    Write-Host "  ❌ main.py not found" -ForegroundColor Red
}

Write-Host ""

# Check frontend structure
Write-Host "🎨 Frontend Status:" -ForegroundColor Yellow
if (Test-Path "frontend/src") {
    Write-Host "  ✅ src/ directory exists"
    
    if (Test-Path "frontend/src/components/ui/upload.tsx") {
        Write-Host "  ✅ Upload component exists"
    }
    
    if (Test-Path "frontend/src/hooks/useDetection.ts") {
        Write-Host "  ✅ useDetection hook exists"
    }
    
    if (Test-Path "frontend/src/hooks/useVoice.ts") {
        Write-Host "  ✅ useVoice hook exists"
    }
    
    if (Test-Path "frontend/src/hooks/useHistory.ts") {
        Write-Host "  ✅ useHistory hook exists"
    }
    
    if (Test-Path "frontend/src/lib/api.ts") {
        Write-Host "  ✅ api.ts exists"
        if (Select-String -Path "frontend/src/lib/api.ts" -Pattern "const BASE_URL = 'http://localhost:8000'" -Quiet) {
            Write-Host "  ✅ API base URL correct"
        }
        if (Select-String -Path "frontend/src/lib/api.ts" -Pattern "timeout: 60000" -Quiet) {
            Write-Host "  ✅ 60s timeout configured"
        }
    }
    
    if (Test-Path "frontend/src/lib/historyService.ts") {
        Write-Host "  ✅ historyService exists"
    }
} else {
    Write-Host "  ❌ src/ directory not found" -ForegroundColor Red
}

Write-Host ""

# Check configuration files
Write-Host "⚙️  Configuration Status:" -ForegroundColor Yellow
if (Test-Path "frontend/tsconfig.app.json") {
    Write-Host "  ✅ tsconfig.app.json exists"
    if (Select-String -Path "frontend/tsconfig.app.json" -Pattern '"@/\*": \["./src/\*"\]' -Quiet) {
        Write-Host "  ✅ Path alias @/ configured"
    }
}

if (Test-Path "frontend/vite.config.ts") {
    Write-Host "  ✅ vite.config.ts exists"
}

Write-Host ""

# Check backend requirements
Write-Host "🔧 Backend Dependencies:" -ForegroundColor Yellow
if (Test-Path "backend/requirements.txt") {
    Write-Host "  ✅ requirements.txt exists"
    if (Select-String -Path "backend/requirements.txt" -Pattern "fastapi" -Quiet) {
        Write-Host "  ✅ FastAPI listed"
    }
    if (Select-String -Path "backend/requirements.txt" -Pattern "uvicorn" -Quiet) {
        Write-Host "  ✅ Uvicorn listed"
    }
    if (Select-String -Path "backend/requirements.txt" -Pattern "ultralytics" -Quiet) {
        Write-Host "  ✅ YOLOv5 (ultralytics) listed"
    }
    if (Select-String -Path "backend/requirements.txt" -Pattern "pyttsx3" -Quiet) {
        Write-Host "  ✅ pyttsx3 (voice) listed"
    }
} else {
    Write-Host "  ❌ requirements.txt not found" -ForegroundColor Red
}

Write-Host ""

# Check frontend dependencies
Write-Host "📚 Frontend Dependencies:" -ForegroundColor Yellow
if (Test-Path "frontend/package.json") {
    Write-Host "  ✅ package.json exists"
    if (Select-String -Path "frontend/package.json" -Pattern '"axios"' -Quiet) {
        Write-Host "  ✅ Axios listed"
    }
    if (Select-String -Path "frontend/package.json" -Pattern '"react"' -Quiet) {
        Write-Host "  ✅ React listed"
    }
    if (Select-String -Path "frontend/package.json" -Pattern '"typescript"' -Quiet) {
        Write-Host "  ✅ TypeScript listed"
    }
} else {
    Write-Host "  ❌ package.json not found" -ForegroundColor Red
}

Write-Host ""

# Check UI components
Write-Host "🎛️  UI Components Status:" -ForegroundColor Yellow
$components = @("FileInput.tsx", "LoadingIndicator.tsx", "ErrorMessage.tsx", "DetectionList.tsx", "VoiceFeedback.tsx", "ActionButtons.tsx")
foreach ($component in $components) {
    if (Test-Path "frontend/src/components/ui/$component") {
        Write-Host "  ✅ $component exists"
    } else {
        Write-Host "  ❌ $component missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Validation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Install backend: pip install -r backend/requirements.txt"
Write-Host "2. Run backend: cd backend; uvicorn main:app --reload"
Write-Host "3. Run frontend: cd frontend; npm run dev"
Write-Host "4. Visit: http://localhost:8080"
Write-Host ""
