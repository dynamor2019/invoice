
          
部署与使用简明指南（端口统一：前端 6667、后端 6666）

一、环境准备
- 操作系统：Linux（推荐）或 Windows
- 必需软件：Node.js ≥ 18、npm、Python ≥ 3.8
- 网络：建议通过反向代理对外暴露 80/443，内网服务端口为 6667（前端）、6666（后端）

二、快速部署（推荐一键脚本）
- 进入项目根目录后执行：
  `python3 deploy.py --api-base http://<服务器IP或域名>:6666/api --frontend-port 6667 --install --build --start`
- 访问地址：
  - 前端：`http://<服务器IP或域名>:6667/`
  - 后端健康检查：`curl http://127.0.0.1:6666/api/ping`
- 说明：
  - `--api-base` 注入到前端构建的 `VITE_API_BASE`
  - `--frontend-port` 设置生产静态服务端口（默认 6667）

三、常用运维命令
- 停止服务：`python3 deploy.py --stop`
- 查看状态：`python3 deploy.py --status`
- 仅重启前端：`python3 deploy.py --restart-frontend`
- 重新构建并重启前端：`python3 deploy.py --build --restart-frontend`

四、开发模式（本地/服务器调试）
- 启动后端（默认 6666）：`npm run server`
- 启动前端（默认 6667，外部访问加 --host）：`npm run dev -- --host`
- 本地访问：`http://localhost:6667/`

五、反向代理示例（Nginx）
- 前端：
  `location / { proxy_pass http://127.0.0.1:6667; }`
- 后端 API：
  `location /api/ { proxy_pass http://127.0.0.1:6666/api/; }`
- 建议开启 HTTPS 并在防火墙开放 80/443

六、端口与浏览器提示
- 部分浏览器对端口 `6667`（IRC 端口）有安全限制，可能出现 `ERR_UNSAFE_PORT`
- 生产环境建议通过反向代理映射到 `80/443` 对外提供服务，避免该限制
- 在本地 IDE 预览时，如受限，可临时使用安全端口（如 `5177`）进行开发预览

七、环境变量
- `VITE_API_BASE`：前端接口基址；未设置时默认 `http://localhost:6666/api`

八、目录与数据
- 前端构建产物：`dist/`
- 后端入口：`server/index.cjs`（默认监听 6666）
- 数据与上传：`server/data/app.db`、`server/data/uploads/`（备份迁移请保留）

九、故障排查
- 前端无法访问接口：检查 `VITE_API_BASE`、后端进程与端口；查看 `server.log`
- 端口占用：调整 `--frontend-port` 或 `PORT` 环境变量；或停止占用进程
- 静态资源无法访问：确认 `npm run build` 成功、前端进程已启动（`frontend.pid`、`frontend.log`）

更多详细说明与完整部署流程请参考 `DEPLOY.md`。
        
          

        