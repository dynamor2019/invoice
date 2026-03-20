"""
Preview runner for the bills project on a public IP (no domain).

What it does:
- Installs Node dependencies (npm install).
- Builds the frontend with an API base pointing to http://<PUBLIC_IP>:6666/api.
- Starts the Node backend (Express) on PORT=6666.
- Serves the built SPA from ./dist on port 8080 with proper history fallback.

Usage:
  PUBLIC_IP=8.163.7.207 python3 preview.py
  # Or edit DEFAULT_PUBLIC_IP below if you prefer not to set env.

Notes:
- Open your cloud security group ports: 8080 (frontend) and 6666 (backend).
- Visit: http://<PUBLIC_IP>:8080/
"""

import os
import sys
import time
import shutil
import signal
import subprocess
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from pathlib import Path


DEFAULT_PUBLIC_IP = "8.163.7.207"
FRONT_PORT = int(os.environ.get("FRONT_PORT", "8080"))
BACK_PORT = int(os.environ.get("PORT", "6666"))
PROJECT_ROOT = Path(__file__).parent.resolve()
DIST_DIR = PROJECT_ROOT / "dist"


def log(msg: str):
    print(f"[preview] {msg}")


def check_bin(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"Required command not found: {name}. Please install it and ensure it's in PATH.")
    return path


def run(cmd: list, env: dict | None = None, cwd: Path | None = None):
    log(f"$ {' '.join(cmd)}")
    subprocess.run(cmd, check=True, env=env or os.environ.copy(), cwd=str(cwd or PROJECT_ROOT))


def build_frontend(public_ip: str):
    # Bake API base into the frontend so it calls the backend directly.
    # This avoids needing a proxy for /api on the preview server.
    env = os.environ.copy()
    env["VITE_API_BASE"] = f"http://{public_ip}:{BACK_PORT}/api"
    # Use npm ci when lockfile exists; fallback to npm install.
    npm = check_bin("npm")
    lockfile = PROJECT_ROOT / "package-lock.json"
    try:
        if lockfile.exists():
            run([npm, "ci"], env=env)
        else:
            run([npm, "install"], env=env)
    except subprocess.CalledProcessError:
        # In some environments, ci may fail (e.g., platform optional deps). Try install.
        run([npm, "install"], env=env)
    run([npm, "run", "build"], env=env)


def start_backend() -> subprocess.Popen:
    node = check_bin("node")
    env = os.environ.copy()
    env["PORT"] = str(BACK_PORT)
    # Allow any origin for quick preview (production should restrict).
    # Leaving ALLOW_ORIGINS empty means CORS allows all origins in server/index.cjs.
    backend_cmd = [node, str(PROJECT_ROOT / "server" / "index.cjs")]
    log(f"Starting backend on PORT={BACK_PORT}...")
    proc = subprocess.Popen(backend_cmd, cwd=str(PROJECT_ROOT), env=env)
    time.sleep(1.0)  # small delay for server to bind
    return proc


class SpaFallbackHandler(SimpleHTTPRequestHandler):
    # Serve built SPA from DIST_DIR with history API fallback to index.html
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def send_head(self):
        # Try to serve the requested file; otherwise, fallback to index.html
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, "index.html")
            if os.path.exists(index):
                path = index
        if not os.path.exists(path):
            # Fallback to root index.html
            path = os.path.join(str(DIST_DIR), "index.html")
        ctype = self.guess_type(path)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        self.send_response(200)
        self.send_header("Content-type", ctype)
        fs = os.fstat(f.fileno())
        self.send_header("Content-Length", str(fs[6]))
        self.end_headers()
        return f


def start_front_server():
    # Bind to 0.0.0.0 so it’s reachable via public IP
    addr = ("0.0.0.0", FRONT_PORT)
    log(f"Starting frontend preview server on {addr[0]}:{addr[1]} serving {DIST_DIR}")
    httpd = TCPServer(addr, SpaFallbackHandler)
    return httpd


def main():
    public_ip = os.environ.get("PUBLIC_IP", DEFAULT_PUBLIC_IP)
    log(f"Using PUBLIC_IP={public_ip}")

    try:
        # 1) Build frontend bundle
        build_frontend(public_ip)

        # 2) Start backend
        backend = start_backend()

        # 3) Start frontend preview server
        httpd = start_front_server()
        log("Preview ready.")
        log(f"Visit: http://{public_ip}:{FRONT_PORT}/")
        log(f"API:   http://{public_ip}:{BACK_PORT}/api")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            log("Stopping preview...")
        finally:
            httpd.server_close()
            if backend and backend.poll() is None:
                try:
                    log("Stopping backend...")
                    if os.name == "nt":
                        backend.terminate()
                    else:
                        os.kill(backend.pid, signal.SIGTERM)
                    backend.wait(timeout=5)
                except Exception:
                    try:
                        backend.kill()
                    except Exception:
                        pass
    except Exception as e:
        log(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()