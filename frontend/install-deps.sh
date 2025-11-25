#!/bin/bash
# Frontend dependencies installation script

echo "📦 Installing frontend dependencies..."

npm install \
  axios \
  @tanstack/react-query \
  react-router-dom \
  typescript \
  @types/react \
  @types/react-dom \
  @types/node \
  vite \
  @vitejs/plugin-react-swc

echo "✅ Frontend dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Navigate to the frontend directory: cd frontend"
echo "2. Start the dev server: npm run dev"
echo "3. Open http://localhost:8080 in your browser"
