"""
一键安装与配置 Nginx 的 Python 脚本。

功能：
- 将 HTTP 自定义端口（默认 60）反向代理到本机前端进程（默认 8080）或直接静态托管
- 将 /api 与 /uploads 路由到本机后端进程（默认 6666）
- 自动安装 Nginx（支持 apt/yum/dnf），校验配置并重载

用法：
  反代到前端进程（代理模式）：
    sudo python3 nginx_setup.py --mode proxy --listen-port 60 --front-port 8080 --back-port 6666 --server-name 8.163.7.207
  直接静态托管（推荐）：
    sudo python3 nginx_setup.py --mode static --listen-port 60 --static-root /www/wwwroot/HandV/5308uv16qj36.vicp.fun_6666/build_tmp --back-port 6666 --server-name 8.163.7.207

不带参数时默认：mode=static, listen_port=60, static_root=当前目录/build_tmp, back=6666, server_name="_"（匹配任意主机名）

要求：在服务器上以 root 或具备 sudo 权限运行；前端/后端进程已在本机监听对应端口。
"""

import argparse
import os
import shutil
import subprocess
import sys


class NginxSetupError(Exception):
    """脚本执行异常。"""


def has_cmd(name: str) -> bool:
    return shutil.which(name) is not None


def run(cmd, check: bool = True, input_text: str | None = None) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            cmd,
            check=check,
            text=True,
            input=input_text,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except subprocess.CalledProcessError as e:
        raise NginxSetupError(f"命令执行失败：{' '.join(cmd)}\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}")


def ensure_nginx_installed() -> None:
    if has_cmd("nginx"):
        print("[nginx-setup] 已检测到 Nginx")
        return
    print("[nginx-setup] 正在安装 Nginx…")
    if has_cmd("apt"):
        run(["sudo", "apt", "update", "-y"])
        run(["sudo", "apt", "install", "-y", "nginx"])
    elif has_cmd("yum"):
        run(["sudo", "yum", "install", "-y", "epel-release"], check=False)
        run(["sudo", "yum", "install", "-y", "nginx"])
        run(["sudo", "systemctl", "enable", "nginx"], check=False)
    elif has_cmd("dnf"):
        run(["sudo", "dnf", "install", "-y", "nginx"])
        run(["sudo", "systemctl", "enable", "nginx"], check=False)
    else:
        raise NginxSetupError("未找到 apt/yum/dnf 包管理器，请手动安装 Nginx 后重试。")
    print("[nginx-setup] Nginx 安装完成")


def ensure_nginx_running() -> None:
    if has_cmd("systemctl"):
        run(["sudo", "systemctl", "enable", "nginx"], check=False)
        run(["sudo", "systemctl", "start", "nginx"], check=False)
    else:
        run(["sudo", "service", "nginx", "start"], check=False)


def resolve_conf_path() -> tuple[str, str | None]:
    """
    返回 (conf_path, symlink_target)。
    检测顺序（考虑宝塔/BT 面板与 OpenResty）：
    1) /www/server/panel/vhost/nginx/（BT 面板常用，按文件名顺序加载）
    2) /www/server/nginx/conf/vhost/（BT 面板部分版本）
    3) /etc/nginx/sites-available + sites-enabled（Debian/Ubuntu）
    4) /etc/nginx/conf.d（CentOS/RHEL/OpenResty 通用）

    对 1) 采用 00_handv.conf，确保在同目录最先加载，从而抢占 default_server。
    """
    name = "handv"
    bt_panel_vhost = "/www/server/panel/vhost/nginx"
    bt_nginx_vhost = "/www/server/nginx/conf/vhost"
    site_avail = "/etc/nginx/sites-available"
    site_enabled = "/etc/nginx/sites-enabled"
    conf_d = "/etc/nginx/conf.d"

    if os.path.isdir(bt_panel_vhost):
        conf_path = os.path.join(bt_panel_vhost, f"00_{name}.conf")
        print(f"[nginx-setup] 检测到宝塔 vhost 目录：{bt_panel_vhost}")
        return conf_path, None

    if os.path.isdir(bt_nginx_vhost):
        # 同样提高加载顺序，避免被默认站点抢占
        conf_path = os.path.join(bt_nginx_vhost, f"00_{name}.conf")
        print(f"[nginx-setup] 检测到宝塔 Nginx vhost 目录：{bt_nginx_vhost}")
        return conf_path, None

    if os.path.isdir(site_avail):
        conf_path = os.path.join(site_avail, name)
        symlink = os.path.join(site_enabled, name) if os.path.isdir(site_enabled) else None
        print(f"[nginx-setup] 使用 Debian/Ubuntu 站点配置：{site_avail}")
        return conf_path, symlink

    conf_path = os.path.join(conf_d, f"{name}.conf")
    print(f"[nginx-setup] 使用 conf.d 目录：{conf_d}")
    return conf_path, None


def build_nginx_conf_proxy(listen_port: int, front_port: int, back_port: int, server_name: str) -> str:
    return f"""
server {{
  listen {listen_port} default_server;
  server_name {server_name};

  # 前端 SPA：代理到本机前端进程（例如 npx serve -s build_tmp -l 0.0.0.0:{front_port}）
  location / {{
    proxy_pass http://127.0.0.1:{front_port};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }}

  # 后端 API：转发到本机 {back_port}
  location /api/ {{
    proxy_pass http://127.0.0.1:{back_port}/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
  }}

  # 上传资源（图片等）
  location /uploads/ {{
    proxy_pass http://127.0.0.1:{back_port}/uploads/;
  }}

  client_max_body_size 20m;
}}
"""


def build_nginx_conf_static(listen_port: int, static_root: str, back_port: int, server_name: str) -> str:
    return f"""
server {{
  listen {listen_port} default_server;
  server_name {server_name};

  root {static_root};
  index index.html;

  # 前端 SPA 静态托管
  location / {{
    try_files $uri $uri/ /index.html;
  }}

  # 后端 API：转发到本机 {back_port}
  location /api/ {{
    proxy_pass http://127.0.0.1:{back_port}/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
  }}

  # 上传资源（图片等）
  location /uploads/ {{
    proxy_pass http://127.0.0.1:{back_port}/uploads/;
  }}

  client_max_body_size 20m;
}}
"""


def write_conf(conf_path: str, content: str) -> None:
    # 直接写 /etc 需要 root 权限；使用 sudo tee 可在非 root 下写入
    print(f"[nginx-setup] 写入配置：{conf_path}")
    run(["sudo", "tee", conf_path], input_text=content)


def ensure_symlink(target: str, link_path: str) -> None:
    if not target or not link_path:
        return
    print(f"[nginx-setup] 创建/更新软链：{link_path} -> {target}")
    run(["sudo", "ln", "-sf", target, link_path])


def test_and_reload() -> None:
    print("[nginx-setup] 测试 Nginx 配置")
    run(["sudo", "nginx", "-t"])
    print("[nginx-setup] 重载 Nginx")
    if has_cmd("systemctl"):
        run(["sudo", "systemctl", "reload", "nginx"], check=False)
    else:
        run(["sudo", "service", "nginx", "reload"], check=False)


def valid_port(p: int) -> bool:
    return 1 <= p <= 65535


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="安装并配置 Nginx（支持代理模式与静态托管，兼容宝塔面板路径，支持自定义监听端口）")
    parser.add_argument("--mode", choices=["proxy", "static"], default="static", help="运行模式：proxy 反代前端进程；static 直接静态托管（默认）")
    parser.add_argument("--listen-port", type=int, default=60, help="Nginx 对外监听端口（默认 60）")
    parser.add_argument("--front-port", type=int, default=8080, help="前端监听端口（仅 proxy 模式使用）")
    parser.add_argument("--static-root", type=str, default=os.path.join(os.getcwd(), "build_tmp"), help="静态文件根目录（仅 static 模式使用，默认为当前目录/build_tmp）")
    parser.add_argument("--back-port", type=int, default=6666, help="后端监听端口（默认 6666）")
    parser.add_argument("--server-name", type=str, default="_", help="Nginx server_name（默认 '_'）")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not valid_port(args.listen_port):
        raise NginxSetupError("监听端口参数不合法，范围应为 1-65535。")
    if args.mode == "proxy" and not valid_port(args.front_port):
        raise NginxSetupError("前端端口参数不合法，范围应为 1-65535。")
    if not valid_port(args.back_port):
        raise NginxSetupError("后端端口参数不合法，范围应为 1-65535。")

    if args.mode == "proxy":
        print(f"[nginx-setup] 运行模式: proxy")
        print(f"[nginx-setup] 监听端口: {args.listen_port}")
        print(f"[nginx-setup] 前端端口: {args.front_port}")
    else:
        print(f"[nginx-setup] 运行模式: static")
        print(f"[nginx-setup] 监听端口: {args.listen_port}")
        print(f"[nginx-setup] 静态根目录: {args.static_root}")
    print(f"[nginx-setup] 后端端口: {args.back_port}")
    print(f"[nginx-setup] server_name: {args.server_name}")

    ensure_nginx_installed()
    ensure_nginx_running()

    conf_path, symlink_path = resolve_conf_path()
    if args.mode == "proxy":
        content = build_nginx_conf_proxy(args.listen_port, args.front_port, args.back_port, args.server_name)
    else:
        # 静态模式下确保目录存在提示（不强制创建，避免误写）
        if not os.path.isdir(args.static_root):
            print(f"[nginx-setup] 警告：静态根目录不存在：{args.static_root}，请先构建前端（python3 deploy.py --build）", file=sys.stderr)
        content = build_nginx_conf_static(args.listen_port, args.static_root, args.back_port, args.server_name)
    write_conf(conf_path, content)
    if symlink_path:
        ensure_symlink(conf_path, symlink_path)

    test_and_reload()

    print(f"[nginx-setup] 完成。现在可以通过 {args.listen_port} 端口访问前端。")
    if args.mode == "proxy":
        print("[nginx-setup] 若前端未启动，请执行：python3 deploy.py --start --frontend-port {}".format(args.front_port))
    else:
        print("[nginx-setup] 静态模式：请确保已构建前端：python3 deploy.py --build，然后将 root 指向 build_tmp（默认已指向当前目录/build_tmp）")
    print("[nginx-setup] 后端健康检查：curl http://127.0.0.1:{}/api/ping".format(args.back_port))


if __name__ == "__main__":
    try:
        main()
    except NginxSetupError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"未知错误：{e}", file=sys.stderr)
        sys.exit(1)