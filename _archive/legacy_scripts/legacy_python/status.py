#!/usr/bin/env python3
import os
import sys

try:
    from deploy import (
        read_pid,
        is_running,
        SERVER_PID,
        FRONT_PID,
        SERVER_LOG,
        FRONT_LOG,
    )
except Exception as e:
    print(f"无法导入 deploy.py：{e}", file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.abspath(__file__))


def main():
    os.chdir(ROOT)
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


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"状态查询失败：{e}", file=sys.stderr)
        sys.exit(1)