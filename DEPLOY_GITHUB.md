# GitHub 自动部署指南

本项目支持通过 GitHub Actions 将仓库内容同步到服务器并执行一键部署脚本 `deploy.py`，实现推送即发布。

## 工作流说明
- 工作流文件：`.github/workflows/deploy.yml`
- 触发条件：推送到 `main` 分支
- 部署流程：
  1. Checkout 仓库
  2. 使用 rsync 将仓库同步至服务器指定目录（会排除 `.git/`、`node_modules/`、日志与 PID 文件）
  3. 通过 SSH 进入服务器执行 `python3 deploy.py`（默认完成安装依赖、构建前端、启动后端与前端）

## 服务器前置条件
- 已安装 `python3`、`node` 与 `npm`（部署脚本会检测 node/npm，不满足会失败）
- 服务器目录（例如 `/opt/bill-app`）可写入，且端口：后端 `6666`、前端 `6667` 可用
- （可选）花生壳已将公网 `443` 映射到内网 `127.0.0.1:6667`

## 必需的 GitHub Secrets
请在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加以下 Secrets：
- `SSH_HOST`：服务器地址（如 `example.com` 或公网 IP）
- `SSH_PORT`：SSH 端口（默认 `22`，若默认即可填 `22`）
- `SSH_USER`：SSH 用户名（如 `ubuntu`、`root` 或你的普通用户）
- `SSH_PRIVATE_KEY`：私钥内容（PEM 格式，建议生成专用部署密钥；切勿泄露）
- `REMOTE_DIR`：部署目标目录（如 `/opt/bill-app`）

> 授权说明：以上 Secrets 即为授权内容，一旦配置，GitHub Actions 就可以通过 SSH 上传并执行部署脚本。若你需要我帮你创建/上传密钥，请告知，我会列出生成步骤与安全注意事项。

## 首次推送与部署
1. 在本地添加 GitHub 远程并推送：
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<your-account>/<your-repo>.git
   git push -u origin main
   ```
2. 在 GitHub 仓库添加 Secrets（见上文）。
3. 触发 `main` 推送后，工作流会自动将代码同步到服务器并运行 `deploy.py`。

## 验证
- 内网：`curl -I http://127.0.0.1:6667/`、`curl -s http://127.0.0.1:6666/api/ping`
- 外网（花生壳域名）：`curl -I https://你的域名/`
- 若失败，查看服务器上的 `server.log` / `frontend.log`，以及 GitHub Actions 的运行日志。

## 常见问题
- Node/npm 不存在：在服务器安装 Node.js（>=18）与 npm。
- 端口占用：确认 `6666/6667` 未被其他程序占用。
- 权限不足：确保 `REMOTE_DIR` 可写且 SSH 用户有权限执行 `python3`、`node`。
- 私钥格式错误：`SSH_PRIVATE_KEY` 使用 OpenSSH/PEM 私钥内容（包含 `BEGIN/END`）。

## 取消/暂停自动部署
- 将工作流触发分支改为其他分支，或手动在 GitHub 仓库的 Actions 里禁用该工作流。