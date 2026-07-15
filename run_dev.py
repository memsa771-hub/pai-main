#!/usr/bin/env python3
"""
Placement AI - one-command dev startup.

Starts the FastAPI backend and Next.js frontend together.
Use this on any machine after cloning/copying the project.

Usage:
    python run_dev.py              # install deps if needed, then start both servers
    python run_dev.py --setup      # force reinstall Python + Node dependencies
    python run_dev.py --clean      # delete frontend .next cache before starting
    python run_dev.py --postgres     # also try to start local PostgreSQL (optional)
"""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "pai-backend"
FRONTEND = ROOT / "pai-frontend-main"
VENV_DIR = BACKEND / ".venv"
ENV_FILE = BACKEND / ".env"
ENV_EXAMPLE = BACKEND / ".env.example"

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8000
FRONTEND_PORT = 3000

PROCESSES: list[subprocess.Popen] = []


def log(msg: str) -> None:
    print(f"[PAI] {msg}", flush=True)


def warn(msg: str) -> None:
    print(f"[PAI] WARNING: {msg}", flush=True)


def fail(msg: str, code: int = 1) -> None:
    print(f"[PAI] ERROR: {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


def is_windows() -> bool:
    return platform.system() == "Windows"


def venv_python() -> Path:
    if is_windows():
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def port_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def run_command(cmd: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess:
    log(f"Running: {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=str(cwd), check=check)


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def ensure_prerequisites() -> None:
    if not command_exists("python") and not command_exists("python3"):
        fail("Python is not installed. Install Python 3.10+ and try again.")
    if not command_exists("node"):
        fail("Node.js is not installed. Install Node.js 18+ and try again.")
    if not command_exists("npm"):
        fail("npm is not installed. Install Node.js (includes npm) and try again.")
    if not BACKEND.exists():
        fail(f"Backend folder not found: {BACKEND}")
    if not FRONTEND.exists():
        fail(f"Frontend folder not found: {FRONTEND}")


def ensure_env_file() -> None:
    if ENV_FILE.exists():
        return
    if ENV_EXAMPLE.exists():
        shutil.copy(ENV_EXAMPLE, ENV_FILE)
        warn(
            f"Created {ENV_FILE.name} from .env.example — add your API keys before using chat/research features."
        )
    else:
        warn(f"No {ENV_FILE.name} found. Backend may fail without API keys and database settings.")


def ensure_pip(python_path: Path) -> None:
    check = subprocess.run(
        [str(python_path), "-m", "pip", "--version"],
        cwd=str(BACKEND),
        capture_output=True,
    )
    if check.returncode == 0:
        return
    log("Bootstrapping pip in the virtual environment...")
    run_command([str(python_path), "-m", "ensurepip", "--upgrade"], BACKEND)
    run_command([str(python_path), "-m", "pip", "install", "--upgrade", "pip"], BACKEND)


def venv_is_ready() -> bool:
    py = venv_python()
    if not py.exists():
        return False
    return subprocess.run(
        [str(py), "-c", "import uvicorn, fastapi"],
        cwd=str(BACKEND),
        capture_output=True,
    ).returncode == 0


def ensure_backend_venv(force_setup: bool) -> None:
    python_bin = shutil.which("python") or shutil.which("python3")
    if not python_bin:
        fail("Could not find python executable.")

    if force_setup and VENV_DIR.exists():
        log("Removing existing backend virtual environment...")
        shutil.rmtree(VENV_DIR, ignore_errors=True)

    if not VENV_DIR.exists():
        log("Creating backend virtual environment...")
        run_command([python_bin, "-m", "venv", str(VENV_DIR)], ROOT)

    pip = venv_python()
    ensure_pip(pip)

    req_file = BACKEND / "requirements.txt"
    if not req_file.exists():
        fail(f"Missing {req_file}")

    marker = VENV_DIR / ".deps_installed"
    if force_setup or not marker.exists() or not venv_is_ready():
        log("Installing backend Python dependencies...")
        run_command([str(pip), "-m", "pip", "install", "-r", str(req_file)], BACKEND)
        marker.write_text("ok", encoding="utf-8")


def ensure_frontend_deps(force_setup: bool) -> None:
    node_modules = FRONTEND / "node_modules"
    if force_setup and node_modules.exists():
        log("Removing existing frontend node_modules...")
        shutil.rmtree(node_modules, ignore_errors=True)

    if force_setup or not node_modules.exists():
        log("Installing frontend Node dependencies (this may take a few minutes)...")
        run_command(["npm", "install"], FRONTEND)


def clean_frontend_cache() -> None:
    next_dir = FRONTEND / ".next"
    if next_dir.exists():
        log("Cleaning frontend .next cache...")
        shutil.rmtree(next_dir, ignore_errors=True)


def maybe_setup_postgres(enable_postgres: bool) -> None:
    if not enable_postgres:
        log("Skipping PostgreSQL setup (use --postgres to enable). SQLite fallback is available.")
        return

    setup_script = BACKEND / "scripts" / "setup_postgres.py"
    if not setup_script.exists():
        warn("PostgreSQL setup script not found. Continuing without it.")
        return

    if port_open(5432):
        log("PostgreSQL port 5432 is already in use — assuming database is available.")
        return

    log("Attempting optional PostgreSQL setup...")
    py = str(venv_python())
    result = subprocess.run([py, str(setup_script)], cwd=str(BACKEND))
    if result.returncode != 0:
        warn("PostgreSQL setup did not complete. Backend will fall back to SQLite if needed.")


def npm_cmd() -> list[str]:
    return ["npm.cmd", "run", "dev"] if is_windows() else ["npm", "run", "dev"]


def start_backend() -> subprocess.Popen:
    py = str(venv_python())
    cmd = [
        py,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--host",
        BACKEND_HOST,
        "--port",
        str(BACKEND_PORT),
    ]
    log(f"Starting backend on http://{BACKEND_HOST}:{BACKEND_PORT}")
    return subprocess.Popen(
        cmd,
        cwd=str(BACKEND),
        env=os.environ.copy(),
    )


def start_frontend() -> subprocess.Popen:
    cmd = npm_cmd()
    log(f"Starting frontend on http://localhost:{FRONTEND_PORT}")
    return subprocess.Popen(
        cmd,
        cwd=str(FRONTEND),
        env=os.environ.copy(),
        shell=is_windows(),
    )


def stop_all() -> None:
    for proc in PROCESSES:
        if proc.poll() is None:
            proc.terminate()
    deadline = time.time() + 5
    for proc in PROCESSES:
        if proc.poll() is None:
            remaining = max(0, deadline - time.time())
            try:
                proc.wait(timeout=remaining)
            except subprocess.TimeoutExpired:
                proc.kill()


def handle_exit(signum, frame) -> None:  # noqa: ARG001
    log("Shutting down...")
    stop_all()
    sys.exit(0)


def wait_for_url(url: str, timeout: int = 60) -> bool:
    try:
        import urllib.request

        start = time.time()
        while time.time() - start < timeout:
            try:
                with urllib.request.urlopen(url, timeout=2) as resp:
                    if resp.status == 200:
                        return True
            except Exception:
                time.sleep(1)
    except ImportError:
        time.sleep(5)
        return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Placement AI backend and frontend together.")
    parser.add_argument("--setup", action="store_true", help="Reinstall Python and Node dependencies")
    parser.add_argument("--clean", action="store_true", help="Delete frontend .next cache before starting")
    parser.add_argument("--postgres", action="store_true", help="Try to start local PostgreSQL (optional; SQLite fallback exists)")
    args = parser.parse_args()

    if port_open(BACKEND_PORT):
        warn(
            f"Port {BACKEND_PORT} is already in use. "
            "Stop the other process first if startup fails."
        )
    if port_open(FRONTEND_PORT):
        warn(
            f"Port {FRONTEND_PORT} is already in use. "
            "Stop the other process first if startup fails."
        )

    signal.signal(signal.SIGINT, handle_exit)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, handle_exit)

    log("Placement AI dev launcher")
    ensure_prerequisites()
    ensure_env_file()
    ensure_backend_venv(force_setup=args.setup)
    ensure_frontend_deps(force_setup=args.setup)

    if args.clean:
        clean_frontend_cache()
    elif (FRONTEND / ".next").exists():
        # Corrupted partial builds often cause Internal Server Error (ENOENT manifests).
        manifest = FRONTEND / ".next" / "dev" / "routes-manifest.json"
        if not manifest.exists():
            warn("Frontend cache looks incomplete — cleaning .next automatically.")
            clean_frontend_cache()

    maybe_setup_postgres(enable_postgres=args.postgres)

    backend_proc = start_backend()
    PROCESSES.append(backend_proc)
    time.sleep(2)

    frontend_proc = start_frontend()
    PROCESSES.append(frontend_proc)

    log("")
    log("=" * 56)
    log("Placement AI is starting")
    log(f"  Frontend: http://localhost:{FRONTEND_PORT}")
    log(f"  Backend:  http://{BACKEND_HOST}:{BACKEND_PORT}")
    log(f"  API docs: http://{BACKEND_HOST}:{BACKEND_PORT}/docs")
    log("Press Ctrl+C to stop both servers")
    log("=" * 56)
    log("")

    if wait_for_url(f"http://{BACKEND_HOST}:{BACKEND_PORT}/"):
        log("Backend is ready.")
    else:
        warn("Backend did not respond in time — check logs above.")

    if wait_for_url(f"http://localhost:{FRONTEND_PORT}/", timeout=90):
        log("Frontend is ready.")
    else:
        warn("Frontend did not respond in time — if you see Internal Server Error, run: python run_dev.py --clean")

    while True:
        for proc in PROCESSES:
            code = proc.poll()
            if code is not None:
                name = "backend" if proc is backend_proc else "frontend"
                fail(f"{name} exited with code {code}. Fix the error above and run again.", code=code)
        time.sleep(1)


if __name__ == "__main__":
    main()
