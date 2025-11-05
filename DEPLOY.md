# 财务审批系统部署说明（Linux）

本说明帮助你在 Linux 服务器上部署当前版本（前端 Vite 构建、后端 Express + sqlite3）。提供一键部署脚本 `deploy.py` 以及基础依赖声明 `requirements.txt`。

## 一、环境要求

- 操作系统：Linux（Ubuntu/Debian/CentOS等）
- 必需软件：
  - Node.js ≥ 18（建议 LTS）
  - npm（随 Node.js 安装）
  - Python ≥ 3.8（用于运行部署脚本）
- 网络：对外开放前端端口（生产为 80，经 Nginx 提供）与后端端口（默认 6666），或使用反向代理（Nginx/Traefik）。

## 二、项目结构与端口

- 后端服务：`server/index.cjs`，默认监听 `http://0.0.0.0:6666/`（接口基址 `http://<host>:6666/api`）。
- 前端服务（生产）：推荐使用 Nginx 直接静态托管 `build_tmp/`，外部端口 `80`。
- 前端服务（开发）：Vite 开发服务器，默认端口 `5173`。

## 三、快速部署（生产环境）

1) 上传/拉取代码至目标服务器，并进入项目根目录（例如 `/opt/fa`）。

2) 安装 Python 依赖（脚本使用标准库，无需额外依赖，可跳过）：

```
python3 -m pip install -r requirements.txt
```

3) 首次部署建议使用一键脚本（生产统一端口：前端 80，后端 6666）：

```
python3 deploy.py \
  --api-base http://<服务器IP或域名>:6666/api \
 --frontend-port 80 \
  --install --build --start
```

- `--api-base` 会注入到前端构建时的环境变量 `VITE_API_BASE`，用于前端请求后端接口。
- `--frontend-port` 为前端静态服务端口（生产推荐 80）。
- `--install` 执行 `npm install` 安装依赖。
- `--build` 执行前端构建输出到 `dist/`。
- `--start` 后台启动后端与前端两个进程，并写入 `server.pid` 与 `frontend.pid`。

4) 验证运行：

- 前端（浏览器访问）：`http://<服务器IP或域名>/`
- 后端健康检查：`curl http://127.0.0.1:6666/api/ping` 应返回 `{"ok": true}`。

## 四、常用运维命令

- 停止服务：

```
python3 deploy.py --stop
```

- 查看状态：

```
python3 deploy.py --status
```

- 仅重新构建前端并重启前端：

```
python3 deploy.py --build --restart-frontend
```

## 五、开发模式（可选）

若需在服务器上以开发模式运行（不推荐用于生产）：

```
# 启动后端（默认 6666）
npm run server

# 启动前端（监听 0.0.0.0 以便外部访问，开发默认 5173）
npm run dev -- --host
```

访问：`http://<服务器IP或域名>:5173/`，后端默认在 `6666`（开发模式）。

## 六、反向代理（可选）

生产环境建议使用 Nginx 静态模式托管前端（推荐）或代理前端进程：

- 静态模式（推荐）：
  `location / { try_files $uri $uri/ /index.html; }`
  `root /path/to/build_tmp;`
- 代理模式（如使用前端进程）：
  `location / { proxy_pass http://127.0.0.1:8080; }`
  `location /api/ { proxy_pass http://127.0.0.1:6666/api/; }`

同时配置 HTTPS 与防火墙规则。

## 七、数据存储

- sqlite 数据库位于 `server/data/app.db`，图片上传位于 `server/data/uploads/`。
- 备份时请一并复制该目录；迁移主机时按原路径恢复即可。

## 八、环境变量

- `VITE_API_BASE`：前端构建时注入的后端接口基址，例如 `http://your.domain:6666/api`。
  - 若未设置，前端默认使用 `http://localhost:6666/api`。
  - 部署到远程服务器时请显式传入 `--api-base` 保证正确路由至后端。

## 九、故障排查

- 前端无法访问接口：检查 `VITE_API_BASE` 是否正确，后端端口是否开放；查看 `server.log`。
- 归档/审批状态异常：检查后端日志与数据库 `server/data/app.db`；确认审批顺序包含会计且为最后一步。
- 静态资源无法访问：确认 `build_tmp/` 构建成功；Nginx 配置已加载并重载；或在测试场景下确认 `serve` 进程是否在运行（`frontend.pid`、`frontend.log`）。