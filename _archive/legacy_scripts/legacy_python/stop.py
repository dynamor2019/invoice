#!/usr/bin/env python3
import os
import sys

try:
    from deploy import (
        kill_pidfile,
        SERVER_PID,
        FRONT_PID,
    )
except Exception as e:
    print(f"无法导入 deploy.py：{e}", file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.abspath(__file__))


def main():
    os.chdir(ROOT)
    kill_pidfile(SERVER_PID, '后端')
    kill_pidfile(FRONT_PID, '前端')
    print('已尝试停止：后端与前端（如仍在运行，请检查日志或手动结束进程）。')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"停止失败：{e}", file=sys.stderr)
        sys.exit(1)