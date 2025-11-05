# 财务审批系统

本项目基于 React + Vite（前端）与 Express + sqlite3（后端）。
生产：前端经 Nginx 提供 `80`，后端 `6666`；开发：Vite `5173`。

## 快速开始（开发）
- 启动后端（默认 6666）：`npm run server`
- 启动前端（开发默认 5173，外部访问需加 --host）：`npm run dev -- --host`
- 浏览器访问：`http://localhost:5173/`
- 接口基址（默认）：`http://localhost:6666/api`

## 环境变量
- `VITE_API_BASE`：前端接口基址，构建时注入；未设置时默认 `http://localhost:6666/api`。

## 构建与预览（生产）
- 构建：`npm run build`
- 预览：`npm run preview`（开发端口 5173）

## 部署（Linux）
详见 `DEPLOY.md`，提供 `deploy.py` 一键部署脚本，推荐：
```
python3 deploy.py --api-base http://<服务器IP或域名>:6666/api --frontend-port 80 --install --build --start
```
- 前端访问（生产）：`http://<服务器IP或域名>/`
- 后端健康检查：`curl http://127.0.0.1:6666/api/ping`

## 目录结构
- `server/index.cjs`：后端服务入口（默认监听 6666）
- `src/`：前端源码
- `dist/`：前端构建产物
- `server/data/app.db` & `server/data/uploads/`：数据库与上传文件（备份迁移请保留）
