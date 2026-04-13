#!/bin/bash

# 进入脚本所在目录
cd "$(dirname "$0")"

echo "=========================================="
echo "      HANDV System Deployment Script"
echo "=========================================="

# 1. 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js 未安装 (Node.js is not installed)."
    echo "请先安装 Node.js (推荐 v18 或 v20)。"
    echo "如果是宝塔面板，请去'软件商店'安装'Node.js版本管理器'。"
    exit 1
fi

echo "[CHECK] Node.js version: $(node -v)"

# 2. 安装依赖 (自动使用淘宝源)
echo "[INFO] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies (using npmmirror)..."
    npm install --omit=dev --registry=https://registry.npmmirror.com
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies."
        exit 1
    fi
    echo "[SUCCESS] Dependencies installed."
else
    echo "[INFO] Dependencies already installed."
fi

# 3. 检查并安装 PM2 (进程守护管理器)
if ! command -v pm2 &> /dev/null; then
    echo "[INFO] PM2 not found. Installing PM2 globally..."
    npm install -g pm2 --registry=https://registry.npmmirror.com
    if [ $? -eq 0 ]; then
        echo "[SUCCESS] PM2 installed."
    else
        echo "[WARN] Failed to install PM2 globally. Will try to run with raw 'node' command."
    fi
fi

# 4. 启动服务
export PORT=6666
APP_NAME="handv-app"

echo "[INFO] Ensuring port $PORT is free..."
# 尝试杀掉占用 6666 端口的进程
pid=$(lsof -t -i:$PORT 2>/dev/null)
if [ -n "$pid" ]; then
    echo "[WARN] Port $PORT is occupied by PID $pid. Killing it..."
    kill -9 $pid 2>/dev/null
fi
# 如果 lsof 不存在，尝试使用 netstat/fuser 或暴力 kill node
pkill -f "node server/index.cjs" 2>/dev/null

if command -v pm2 &> /dev/null; then
    # 停止并删除旧的 PM2 进程，确保干净启动
    pm2 delete "$APP_NAME" > /dev/null 2>&1
    
    echo "[INFO] Starting application with PM2..."
    pm2 start server/index.cjs --name "$APP_NAME"
    pm2 save
    
    echo "=========================================="
    echo "[SUCCESS] Deployment Complete!"
    echo "App is running in background with PM2."
else
    echo "[INFO] Starting application with Node (Foreground mode)..."
    echo "Press Ctrl+C to stop."
    node server/index.cjs
fi
