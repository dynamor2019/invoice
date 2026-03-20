#!/usr/bin/env python3
import argparse
import os
import sys
import subprocess
import shlex
import time
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SERVER_PID = os.path.join(ROOT, 'server.pid')
FRONT_PID = os.path.join(ROOT, 'frontend.pid')
SERVER_LOG = os.path.join(ROOT, 'server.log')
FRONT_LOG = os.path.join(ROOT, 'frontend.log')


def run(cmd, env=None, cwd=ROOT, check=True):
    print(f"$ {cmd}")
    proc = subprocess.run(shlex.split(cmd), cwd=cwd, env=env, capture_output=True, text=True)
    if proc.stdout:
        print(proc.stdout)
    if proc.stderr:
        print(proc.stderr, file=sys.stderr)
    if check and proc.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}")
    return proc


def which(bin_name):
    return subprocess.run(['which', bin_name], capture_output=True, text=True).stdout.strip()


def ensure_node():
    if not which('node') or not which('npm'):
        raise RuntimeError('未检测到 node/npm，请先安装 Node.js (>=18) 与 npm 再执行部署。')


def npm_install():
    # 优先使用 npm ci（有 package-lock）
    lock_path = os.path.join(ROOT, 'package-lock.json')
    if os.path.exists(lock_path):
        run('npm ci')
    else:
        run('npm install')


def build_frontend(api_base=None):
    # 不清理 build_tmp：宝塔面板会在站点根投放不可删除的 .user.ini（chattr +i），
    # 清空目录可能失败。改为依赖 Vite 的覆盖输出（emptyOutDir=false）。
    # 如需强制清理，请在服务器手动执行：
    #   sudo chattr -i build_tmp/.user.ini && sudo rm -rf build_tmp

    env = os.environ.copy()
    if api_base:
        env['VITE_API_BASE'] = api_base
        print(f"构建时注入 VITE_API_BASE={api_base}")
    run('npm run build', env=env)


def start_backend():
    # 后端：固定端口 6666
    cmd = f"nohup env PORT=6666 node server/index.cjs > {SERVER_LOG} 2>&1 & echo $!"
    print(f"启动后端：{cmd}")
    pid = subprocess.check_output(cmd, shell=True, cwd=ROOT).decode().strip()
    with open(SERVER_PID, 'w') as f:
        f.write(pid)
    time.sleep(0.5)
    print(f"后端已启动，PID={pid}，日志：{SERVER_LOG}")


def start_frontend(port=80, host='0.0.0.0'):
    # 前端：npx serve -s build_tmp -l <host:port>
    # 绑定 80 端口可能需要 root 或 CAP_NET_BIND_SERVICE 权限
    try:
        if int(port) < 1024 and hasattr(os, 'geteuid') and os.geteuid() != 0:
            print(f"警告：端口 {port} 可能需要 root 权限，若启动失败请使用反向代理或以 root 运行。")
    except Exception:
        # 在部分平台（如 Windows）无 geteuid，忽略此检查
        pass
    bind = f"{host}:{int(port)}"
    cmd = f"nohup npx serve -s build_tmp -l {bind} > {FRONT_LOG} 2>&1 & echo $!"
    print(f"启动前端：{cmd}")
    pid = subprocess.check_output(cmd, shell=True, cwd=ROOT).decode().strip()
    with open(FRONT_PID, 'w') as f:
        f.write(pid)
    time.sleep(0.5)
    print(f"前端已启动，PID={pid}，日志：{FRONT_LOG}")
    print("提示：前端已在 0.0.0.0 监听，如无法绑定 80，请用 Nginx 将 80/443 反代到此进程。")


def kill_pidfile(path, name):
    if not os.path.exists(path):
        print(f"{name} 未运行（不存在 {path}）")
        return
    with open(path) as f:
        pid = f.read().strip()
    try:
        os.kill(int(pid), 15)  # SIGTERM
        print(f"已发送停止信号给 {name} 进程 PID={pid}")
    except Exception as e:
        print(f"停止 {name} 失败：{e}")
    try:
        os.remove(path)
    except Exception:
        pass


def is_running(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except Exception:
        return False


def read_pid(path):
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return f.read().strip()


def main():
    parser = argparse.ArgumentParser(description='Linux 部署脚本：安装依赖、构建前端、启动/停止服务。')
    parser.add_argument('--api-base', default='http://8.163.7.207:6666/api', help='前端构建时使用的后端 API 基址（默认 http://8.163.7.207:6666/api）')
    parser.add_argument('--frontend-port', type=int, default=60, help='前端静态服务端口（默认 60）')
    parser.add_argument('--install', action='store_true', help='执行 npm install/ci 安装依赖')
    parser.add_argument('--build', action='store_true', help='构建前端（生成 dist/）')
    parser.add_argument('--start', action='store_true', help='启动后端与前端')
    parser.add_argument('--stop', action='store_true', help='停止后端与前端')
    parser.add_argument('--status', action='store_true', help='查看当前运行状态')
    parser.add_argument('--restart-frontend', action='store_true', help='重启前端静态服务')
    args = parser.parse_args()

    os.chdir(ROOT)
    if args.install:
        ensure_node()
        npm_install()

    if args.build:
        ensure_node()
        build_frontend(api_base=args.api_base)

    if args.start:
        ensure_node()
        start_backend()
        start_frontend(port=args.frontend_port)

    if args.stop:
        kill_pidfile(SERVER_PID, '后端')
        kill_pidfile(FRONT_PID, '前端')

    if args.restart_frontend:
        kill_pidfile(FRONT_PID, '前端')
        start_frontend(port=args.frontend_port)

    if args.status:
        spid = read_pid(SERVER_PID)
        fpid = read_pid(FRONT_PID)
        print('运行状态：')
        if spid:
            print(f"- 后端：PID={spid}，{'运行中' if is_running(spid) else '未运行'}，日志={SERVER_LOG}")
        else:
            print("- 后端：未运行（无 PID 文件）")
        if fpid:
            print(f"- 前端：PID={fpid}，{'运行中' if is_running(fpid) else '未运行'}，日志={FRONT_LOG}")
        else:
            print("- 前端：未运行（无 PID 文件）")

    # 若未传任何参数，执行最常用的一键流程：安装 + 构建 + 启动
    if not any([args.install, args.build, args.start, args.stop, args.status, args.restart_frontend]):
        print('未提供参数，执行默认流程：--install --build --start（前端默认端口 60）')
        ensure_node()
        npm_install()
        build_frontend(api_base=args.api_base)
        start_backend()
        start_frontend(port=args.frontend_port)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"部署失败：{e}", file=sys.stderr)
        sys.exit(1)