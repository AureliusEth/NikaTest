#!/bin/bash
# Backend start script - kills existing processes and starts fresh

echo "🛑 Stopping existing backend processes..."

# Kill processes using port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

# Kill nest start processes
pkill -f "nest start" 2>/dev/null || true
pkill -f "node.*dist/src/main" 2>/dev/null || true

# Wait a moment for processes to fully stop
sleep 2

echo "🚀 Starting backend in development mode..."
npm run start:dev


