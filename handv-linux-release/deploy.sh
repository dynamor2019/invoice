#!/bin/bash

# Handv Linux Deployment Script

echo "=========================================="
echo "      Handv Deployment Setup"
echo "=========================================="

# 0. Cleanup & Stop Services (Ensure quiet environment)
echo "[INFO] Step 0: Cleaning up ALL previous services and releasing ports..."

# Function to stop and delete a PM2 process by name
cleanup_pm2_process() {
    local name=$1
    if command -v pm2 &> /dev/null; then
        echo "[INFO] Cleaning up global PM2 process: $name..."
        pm2 stop "$name" 2>/dev/null || true
        pm2 delete "$name" 2>/dev/null || true
    elif [ -f "./node_modules/.bin/pm2" ]; then
        echo "[INFO] Cleaning up local PM2 process: $name..."
        ./node_modules/.bin/pm2 stop "$name" 2>/dev/null || true
        ./node_modules/.bin/pm2 delete "$name" 2>/dev/null || true
    fi
}

# Clean up ALL known potential processes to ensure a clean slate
cleanup_pm2_process "handv-backend"
cleanup_pm2_process "handv-app"
cleanup_pm2_process "huaneng-app"
cleanup_pm2_process "handv" 

# Force kill any process occupying port 3001
echo "[INFO] Checking port 3001..."
if command -v lsof &> /dev/null; then
    PID=$(lsof -t -i:3001)
    if [ -n "$PID" ]; then
        echo "[WARN] Port 3001 is in use by PID $PID. Killing it..."
        kill -9 $PID
    fi
else
    # Fallback if lsof is missing, try fuser
    if command -v fuser &> /dev/null; then
        fuser -k 3001/tcp 2>/dev/null || true
    fi
fi

# 1. Install Dependencies
echo "[INFO] Step 1: Installing production dependencies..."
npm install --production

# 2. Check Database Directory
if [ ! -d "server/data" ]; then
    echo "[INFO] Step 2: Creating database directory..."
    mkdir -p server/data/uploads
else
    echo "[INFO] Step 2: Database directory exists."
fi

# 3. Start Backend with PM2
echo "[INFO] Step 3: Starting backend with PM2..."
# Set NODE_ENV to production if needed, though index.cjs doesn't strictly check it for serving, it's good practice
export NODE_ENV=production

if command -v pm2 &> /dev/null; then
    pm2 start server/index.cjs --name handv-backend
    pm2 save
    echo "[SUCCESS] Backend started on port 3001"
else
    echo "[WARN] PM2 not found globally. Trying local..."
    ./node_modules/.bin/pm2 start server/index.cjs --name handv-backend
    echo "[SUCCESS] Backend started on port 3001"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "Backend is running on port 3001."
echo "The backend is now serving the frontend (from build_tmp)."
echo "You can access the application at: http://<your-server-ip>:3001"
echo "If you use Nginx, proxy all requests to http://127.0.0.1:3001"
echo "=========================================="
