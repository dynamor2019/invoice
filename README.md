# 财务审批系统

本项目基于 React + Vite（前端）与 Express + sqlite3（后端）。开发与部署端口统一：前端 6667，后端 6666。

## 快速开始（开发）
- 启动后端（默认 6666）：`npm run server`
- 启动前端（默认 6667，外部访问需加 --host）：`npm run dev -- --host`
- 浏览器访问：`http://localhost:6667/`
- 接口基址（默认）：`http://localhost:6666/api`

## 环境变量
- `VITE_API_BASE`：前端接口基址，构建时注入；未设置时默认 `http://localhost:6666/api`。

## 构建与预览（生产）
- 构建：`npm run build`
- 预览：`npm run preview`（端口 6667）

## 部署（Linux）
详见 `DEPLOY.md`，提供 `deploy.py` 一键部署脚本，推荐：
```
python3 deploy.py --api-base http://<服务器IP或域名>:6666/api --frontend-port 6667 --install --build --start
```
- 前端访问：`http://<服务器IP或域名>:6667/`
- 后端健康检查：`curl http://127.0.0.1:6666/api/ping`

## 目录结构
- `server/index.cjs`：后端服务入口（默认监听 6666）
- `src/`：前端源码
- `dist/`：前端构建产物
- `server/data/app.db` & `server/data/uploads/`：数据库与上传文件（备份迁移请保留）
