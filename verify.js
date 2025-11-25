#!/usr/bin/env node
/**
 * Quick Verification Script for AccessAtlas
 * Run: node verify.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

const checkFileExists = (filePath, name) => {
  if (fs.existsSync(filePath)) {
    log.success(`${name} exists`);
    return true;
  } else {
    log.error(`${name} missing: ${filePath}`);
    return false;
  }
};

const checkFileHasContent = (filePath, name, searchStrings) => {
  if (!fs.existsSync(filePath)) {
    log.error(`${name} not found`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const allFound = searchStrings.every((str) => content.includes(str));

  if (allFound) {
    log.success(`${name} has required content`);
    return true;
  } else {
    log.error(`${name} missing required content`);
    searchStrings.forEach((str) => {
      if (!content.includes(str)) {
        log.warning(`  Missing: "${str}"`);
      }
    });
    return false;
  }
};

const verify = () => {
  console.clear();
  log.header('🔍 AccessAtlas Project Verification');

  let passCount = 0;
  let totalCount = 0;

  // Frontend Components
  log.header('Frontend Components');
  const components = [
    { path: 'frontend/src/components/ui/upload.tsx', name: 'Upload Component' },
    { path: 'frontend/src/components/ui/FileInput.tsx', name: 'FileInput Component' },
    { path: 'frontend/src/components/ui/LoadingIndicator.tsx', name: 'LoadingIndicator' },
    { path: 'frontend/src/components/ui/ErrorMessage.tsx', name: 'ErrorMessage Component' },
    { path: 'frontend/src/components/ui/DetectionList.tsx', name: 'DetectionList Component' },
    { path: 'frontend/src/components/ui/VoiceFeedback.tsx', name: 'VoiceFeedback Component' },
    { path: 'frontend/src/components/ui/ActionButtons.tsx', name: 'ActionButtons Component' },
  ];

  components.forEach(({ path: filePath, name }) => {
    totalCount++;
    if (checkFileExists(filePath, name)) passCount++;
  });

  // Frontend Hooks
  log.header('Frontend Hooks');
  const hooks = [
    {
      path: 'frontend/src/hooks/useDetection.ts',
      name: 'useDetection Hook',
      content: ['useDetection', 'detect', 'DetectResponse', 'AbortController'],
    },
    {
      path: 'frontend/src/hooks/useVoice.ts',
      name: 'useVoice Hook',
      content: ['useVoice', 'speak', 'isSpeaking'],
    },
    {
      path: 'frontend/src/hooks/useHistory.ts',
      name: 'useHistory Hook',
      content: ['useHistory', 'addEntry', 'history'],
    },
  ];

  hooks.forEach(({ path: filePath, name, content }) => {
    totalCount++;
    if (checkFileHasContent(filePath, name, content)) passCount++;
  });

  // Frontend Services
  log.header('Frontend Services');
  const services = [
    {
      path: 'frontend/src/lib/api.ts',
      name: 'API Client',
      content: [
        'http://localhost:8000',
        'timeout: 60000',
        'DetectResponse',
        'sendImage',
        'sendVoice',
      ],
    },
    {
      path: 'frontend/src/lib/historyService.ts',
      name: 'History Service',
      content: ['localStorage', 'addHistoryEntry', 'getHistory'],
    },
  ];

  services.forEach(({ path: filePath, name, content }) => {
    totalCount++;
    if (checkFileHasContent(filePath, name, content)) passCount++;
  });

  // TypeScript Configuration
  log.header('TypeScript Configuration');
  totalCount++;
  if (
    checkFileHasContent(
      'frontend/tsconfig.app.json',
      'TypeScript Config',
      ['strict', 'jsx', 'target']
    )
  ) {
    passCount++;
  }

  // Dependencies
  log.header('Dependencies');
  totalCount++;
  if (
    checkFileHasContent('frontend/package.json', 'package.json', [
      'react',
      'axios',
      'typescript',
      'vite',
    ])
  ) {
    passCount++;
  }

  // Backend Files
  log.header('Backend Files');
  totalCount++;
  if (checkFileExists('backend/main.py', 'FastAPI Backend')) passCount++;

  totalCount++;
  if (
    checkFileHasContent('backend/main.py', 'Backend Endpoints', [
      '/detect',
      '/voice',
      '/health',
    ])
  ) {
    passCount++;
  }

  // Documentation
  log.header('Documentation');
  const docs = [
    'README.md',
    'SETUP_AND_DEPLOYMENT.md',
    'PROJECT_STATUS.md',
    'ARCHITECTURE_DIAGRAMS.md',
    'FINAL_ASSESSMENT.md',
    'VERIFICATION_AND_TESTING_GUIDE.md',
  ];

  docs.forEach((doc) => {
    totalCount++;
    if (checkFileExists(doc, doc)) passCount++;
  });

  // Summary
  log.header('Summary');
  const percentage = Math.round((passCount / totalCount) * 100);
  console.log(
    `\n${colors.cyan}Verified: ${passCount}/${totalCount} (${percentage}%)${colors.reset}`
  );

  if (percentage === 100) {
    log.success('All checks passed! ✨ Project is ready for testing.');
    console.log(`
${colors.green}🚀 Next Steps:${colors.reset}
  1. Start backend:  cd backend && uvicorn main:app --reload
  2. Start frontend: cd frontend && npm run dev
  3. Open http://localhost:5173 in browser
  4. Upload an image to test detection
  5. Check console (F12) for logs
    `);
  } else {
    log.warning('Some checks failed. Review the errors above.');
  }

  console.log('');
};

verify();
