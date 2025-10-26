#!/usr/bin/env python3
import os
import sys
import time

# 复用 deploy.py 中的工具与启动函数
try:
    from deploy import (
        ensure_node,
        start_backend,
        start_frontend,
        read_pid,
        is_running,
        kill_pidfile,
        SERVER_PID,
        FRONT_PID,
        build_frontend,
    )
except Exception as e:
    print(f"无法导入 deploy.py：{e}", file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.abspath(__file__))


def main():
    os.chdir(ROOT)

    # 若前端构建产物缺失，自动构建（默认 API 指向本机后端）
    dist_index = os.path.join(ROOT, 'dist', 'index.html')
    if not os.path.exists(dist_index):
        print('未检测到 dist/index.html，自动执行前端构建…')
        ensure_node()
        build_frontend(api_base='http://localhost:6666/api')

    # 清理无效的 PID 文件
    spid = read_pid(SERVER_PID)
    if spid and not is_running(spid):
        kill_pidfile(SERVER_PID, '后端')
        spid = None
    fpid = read_pid(FRONT_PID)
    if fpid and not is_running(fpid):
        kill_pidfile(FRONT_PID, '前端')
        fpid = None

    # 先启动后端（固定 6666）
    if spid and is_running(spid):
        print(f"后端已运行，PID={spid}")
    else:
        ensure_node()
        start_backend()
        # 给后端预留片刻启动时间
        time.sleep(0.8)

    # 再启动前端（固定 6667）
    if fpid and is_running(fpid):
        print(f"前端已运行，PID={fpid}")
    else:
        start_frontend(port=6667)

    print('启动完成：后端 6666、前端 6667。若使用花生壳，请确保 443 映射到 127.0.0.1:6667。')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"启动失败：{e}", file=sys.stderr)
        sys.exit(1)