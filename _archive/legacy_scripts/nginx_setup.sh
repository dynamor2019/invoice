#!/usr/bin/env bash
set -euo pipefail

# 一键配置 Nginx：将 80 端口反向代理到前端进程（默认 8080），并将 /api 与 /uploads 代理到后端 6666。
# 用法：
#   sudo bash nginx_setup.sh [FRONT_PORT] [BACK_PORT] [SERVER_NAME]
# 示例：
#   sudo bash nginx_setup.sh 8080 6666 8.163.7.207
# 若不提供参数，默认 FRONT_PORT=8080、BACK_PORT=6666、SERVER_NAME=_（无域名场景）

FRONT_PORT="${1:-8080}"
BACK_PORT="${2:-6666}"
SERVER_NAME="${3:-_}"

echo "[nginx-setup] 前端端口: ${FRONT_PORT}"
echo "[nginx-setup] 后端端口: ${BACK_PORT}"
echo "[nginx-setup] server_name: ${SERVER_NAME}"

function has_cmd() { command -v "$1" >/dev/null 2>&1; }

function install_nginx() {
  if has_cmd nginx; then
    echo "[nginx-setup] 检测到已安装 Nginx"
    return
  fi
  echo "[nginx-setup] 正在安装 Nginx…"
  if has_cmd apt; then
    sudo apt update -y
    sudo apt install -y nginx
  elif has_cmd yum; then
    sudo yum install -y epel-release || true
    sudo yum install -y nginx
    sudo systemctl enable nginx || true
  elif has_cmd dnf; then
    sudo dnf install -y nginx
    sudo systemctl enable nginx || true
  else
    echo "[nginx-setup] 未找到 apt/yum/dnf，请手动安装 Nginx 后重试" >&2
    exit 1
  fi
  echo "[nginx-setup] Nginx 安装完成"
}

function ensure_service_running() {
  if has_cmd systemctl; then
    sudo systemctl enable nginx || true
    sudo systemctl start nginx || true
  else
    sudo service nginx start || true
  fi
}

# 选择配置目录：优先使用 /etc/nginx/sites-available（Debian/Ubuntu），否则使用 /etc/nginx/conf.d（CentOS/RHEL）
CONF_DIR="/etc/nginx/conf.d"
SITE_AVAIL="/etc/nginx/sites-available"
SITE_ENABLED="/etc/nginx/sites-enabled"
CONF_NAME="handv"
CONF_PATH="${CONF_DIR}/${CONF_NAME}.conf"

if [ -d "$SITE_AVAIL" ]; then
  CONF_PATH="${SITE_AVAIL}/${CONF_NAME}"
fi

install_nginx
ensure_service_running

echo "[nginx-setup] 写入 Nginx 配置：${CONF_PATH}"
sudo tee "$CONF_PATH" >/dev/null <<EOF
server {
  listen 80;
  server_name ${SERVER_NAME};

  # 前端 SPA：代理到本机前端进程（例如 npx serve -s build_tmp -l 0.0.0.0:${FRONT_PORT}）
  location / {
    proxy_pass http://127.0.0.1:${FRONT_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  # 后端 API：转发到本机 6666
  location /api/ {
    proxy_pass http://127.0.0.1:${BACK_PORT}/api/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 300;
  }

  # 上传资源（图片等）
  location /uploads/ {
    proxy_pass http://127.0.0.1:${BACK_PORT}/uploads/;
  }

  # 可根据需要放宽上传大小
  client_max_body_size 20m;
}
EOF

# Debian/Ubuntu 系列需要 sites-enabled 的符号链接
if [ -d "$SITE_ENABLED" ]; then
  sudo ln -sf "$CONF_PATH" "$SITE_ENABLED/${CONF_NAME}"
fi

echo "[nginx-setup] 测试 Nginx 配置"
sudo nginx -t
echo "[nginx-setup] 重载 Nginx"
if has_cmd systemctl; then
  sudo systemctl reload nginx
else
  sudo service nginx reload
fi

echo "[nginx-setup] 完成。现在可以通过 http://8.163.7.207/ 访问前端。"
echo "[nginx-setup] 若前端进程未启动，请在项目根：python3 deploy.py --start --frontend-port ${FRONT_PORT}"
echo "[nginx-setup] 后端健康检查：curl http://127.0.0.1:${BACK_PORT}/api/ping"