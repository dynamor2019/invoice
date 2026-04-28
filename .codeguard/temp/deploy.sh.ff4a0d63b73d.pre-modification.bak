#!/bin/bash
set -e
echo "[INFO] install prod deps"
npm install --production
mkdir -p server/data/uploads
export NODE_ENV=production
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete handv-backend >/dev/null 2>&1 || true
  pm2 start server/index.cjs --name handv-backend
  pm2 save
else
  npx pm2 delete handv-backend >/dev/null 2>&1 || true
  npx pm2 start server/index.cjs --name handv-backend
fi
echo "[OK] started on :3001"
