#!/usr/bin/env python3
"""
一键部署脚本（onekey.py）

目标：将本项目在 Linux 服务器上的部署命令整合为一次性执行：
- 安装/更新 Node 依赖
- 构建前端并注入后端 API 基址
- 启动后端（端口 6666）与（可选）前端进程
- 安装/写入并重载 Nginx（静态托管或反向代理）

用法示例：
  静态托管（推荐）：
    python3 onekey.py --mode static \
      --server-name 8.163.7.207 \
      --listen-port 80 \
      --back-port 6666 \
      --static-root /opt/handv/build_tmp

  反向代理模式：
    python3 onekey.py --mode proxy \
      --server-name 8.163.7.207 \
      --listen-port 80 \
      --front-port 8080 \
      --back-port 6666

注意：
- 需在服务器上以具备 sudo 权限的用户执行（写 /etc/nginx）。
- 默认根据 --server-name 与 --back-port 推导 API 基址：http://<server-name>:<back-port>/api。
"""

from __future__ import annotations

import argparse
import logging
import os
import shutil
import subprocess
import sys
from typing import Optional, Sequence


# --- 日志配置 ---
logging.basicConfig(
    level=logging.INFO,
    format="[onekey] %(levelname)s: %(message)s",
)
log = logging.getLogger("onekey")


class OneKeyError(Exception):
    """一键部署错误类型。"""


def run_cmd(cmd: Sequence[str], cwd: Optional[str] = None, check: bool = True) -> subprocess.CompletedProcess:
    """执行命令并输出日志。"""
    cmd_str = " ".join(cmd)
    log.info("$ %s", cmd_str)
    proc = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if proc.stdout:
        sys.stdout.write(proc.stdout)
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    if check and proc.returncode != 0:
        raise OneKeyError(f"命令失败：{cmd_str}")
    return proc


def has_cmd(name: str) -> bool:
    return shutil.which(name) is not None


def compute_api_base(server_name: str, back_port: int) -> str:
    return f"http://{server_name}:{back_port}/api"


def install_and_build(api_base: str) -> None:
    """安装依赖并构建前端。"""
    # 复用 deploy.py 的实现，保证一致性
    try:
        from deploy import ensure_node, npm_install, build_frontend
    except Exception as e:
        raise OneKeyError(f"无法导入 deploy.py：{e}")

    ensure_node()
    npm_install()
    build_frontend(api_base=api_base)


def start_backend_process() -> None:
    """启动后端（固定端口 6666）。"""
    try:
        from deploy import start_backend
    except Exception as e:
        raise OneKeyError(f"无法导入 deploy.py：{e}")
    start_backend()


def start_frontend_process(front_port: int) -> None:
    """按需启动前端进程（proxy 模式）。"""
    try:
        from deploy import start_frontend
    except Exception as e:
        raise OneKeyError(f"无法导入 deploy.py：{e}")
    start_frontend(port=front_port)


def setup_nginx(mode: str, listen_port: int, server_name: str, back_port: int,
                front_port: Optional[int] = None, static_root: Optional[str] = None) -> None:
    """调用 nginx_setup.py 写入并重载 Nginx 配置。"""
    python_bin = shutil.which("python3") or "python3"
    use_sudo = has_cmd("sudo")

    base_cmd = [python_bin, "nginx_setup.py", "--mode", mode, "--listen-port", str(listen_port), "--back-port", str(back_port), "--server-name", server_name]
    if mode == "proxy":
        if not front_port:
            raise OneKeyError("proxy 模式需要提供 --front-port")
        base_cmd.extend(["--front-port", str(front_port)])
    else:
        root = static_root or os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_tmp")
        base_cmd.extend(["--static-root", root])

    cmd = (["sudo"] + base_cmd) if use_sudo else base_cmd
    run_cmd(cmd)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="一键部署：安装依赖、构建前端、启动后端/前端、配置 Nginx",
    )
    parser.add_argument("--mode", choices=["static", "proxy"], default="static", help="Nginx 模式：static(静态托管) 或 proxy(反代前端进程)")
    parser.add_argument("--server-name", default="_", help="server_name（可用域名或公网 IP，默认 _）")
    parser.add_argument("--listen-port", type=int, default=80, help="Nginx 对外监听端口，默认 80")
    parser.add_argument("--back-port", type=int, default=6666, help="后端服务端口，默认 6666")
    parser.add_argument("--front-port", type=int, default=8080, help="前端进程端口（proxy 模式有效），默认 8080")
    parser.add_argument("--static-root", default=None, help="静态托管根目录（static 模式有效），默认 <项目根>/build_tmp")
    parser.add_argument("--api-base", default=None, help="前端构建注入的 API 基址，不提供则按 server-name/back-port 推导")
    parser.add_argument("--skip-install", action="store_true", help="跳过依赖安装")
    parser.add_argument("--skip-build", action="store_true", help="跳过前端构建")
    parser.add_argument("--skip-backend", action="store_true", help="跳过后端启动")
    parser.add_argument("--skip-frontend", action="store_true", help="跳过前端进程启动（proxy）")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # 推导 API 基址
    api_base = args.api_base or compute_api_base(args.server_name, args.back_port)
    log.info("使用 API 基址：%s", api_base)

    # 安装 + 构建
    if not (args.skip_install and args.skip_build):
        install_and_build(api_base)
    else:
        log.info("跳过安装/构建")

    # 启动后端
    if not args.skip_backend:
        start_backend_process()
    else:
        log.info("跳过后端启动")

    # proxy 模式可选启动前端进程
    if args.mode == "proxy" and not args.skip_frontend:
        start_frontend_process(args.front_port)
    elif args.mode == "proxy":
        log.info("跳过前端进程启动（proxy 模式）")

    # 写入并重载 Nginx
    setup_nginx(
        mode=args.mode,
        listen_port=args.listen_port,
        server_name=args.server_name,
        back_port=args.back_port,
        front_port=(args.front_port if args.mode == "proxy" else None),
        static_root=(args.static_root if args.mode == "static" else None),
    )

    log.info("部署完成：前端 %s（通过 Nginx %s）、后端 %d", (
        f"进程:{args.front_port}" if args.mode == "proxy" else f"静态:{args.static_root or 'build_tmp'}"), args.listen_port, args.back_port)
    log.info("前端访问：http://%s:%d/", args.server_name if args.server_name != "_" else "<你的域名或IP>", args.listen_port)
    log.info("后端健康检查：curl http://127.0.0.1:%d/api/ping", args.back_port)


if __name__ == "__main__":
    try:
        main()
    except OneKeyError as e:
        log.error(str(e))
        sys.exit(1)
    except Exception as e:
        log.error("未知错误：%s", e)
        sys.exit(1)