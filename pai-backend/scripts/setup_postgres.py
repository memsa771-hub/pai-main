import os
import sys
import urllib.request
import zipfile
import subprocess
import time
import socket

PORT = 5432
DB_NAME = "placement_ai"
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PG_DIR = os.path.join(BACKEND_DIR, "pgsql")
DATA_DIR = os.path.join(PG_DIR, "data")
ZIP_PATH = os.path.join(BACKEND_DIR, "postgresql-binaries.zip")
DOWNLOAD_URL = "https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip"

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def check_postgres_running():
    # Attempt to ping port
    if is_port_open(PORT):
        print(f"[PG] Port {PORT} is already open. Checking if Postgres is active...")
        # Try running pg_isready
        pg_isready_path = os.path.join(PG_DIR, "bin", "pg_isready.exe")
        if os.path.exists(pg_isready_path):
            res = subprocess.run([pg_isready_path, "-p", str(PORT)], capture_output=True)
            if res.returncode == 0:
                print(f"[PG] PostgreSQL is already running on port {PORT}.")
                return True
        print(f"[PG] Port {PORT} is in use by another service. Fallback database connections will handle this.")
        return True
    return False

def download_progress(block_num, block_size, total_size):
    read_so_far = block_num * block_size
    if total_size > 0:
        percent = min(100, (read_so_far * 100) // total_size)
        sys.stdout.write(f"\rDownloading PostgreSQL binaries: {percent}% completed ({read_so_far // (1024*1024)}MB / {total_size // (1024*1024)}MB)")
        sys.stdout.flush()
    else:
        sys.stdout.write(f"\rDownloading: {read_so_far // (1024*1024)}MB downloaded")
        sys.stdout.flush()

def setup_postgres():
    if check_postgres_running():
        # Verify db exists
        create_database_if_not_exists()
        return

    # Check if pg_ctl exists in local .postgres
    pg_ctl_path = os.path.join(PG_DIR, "bin", "pg_ctl.exe")
    initdb_path = os.path.join(PG_DIR, "bin", "initdb.exe")
    createdb_path = os.path.join(PG_DIR, "bin", "createdb.exe")

    if not os.path.exists(pg_ctl_path):
        print(f"[PG] Downloading portable PostgreSQL binaries from {DOWNLOAD_URL}...")
        try:
            urllib.request.urlretrieve(DOWNLOAD_URL, ZIP_PATH, download_progress)
            print("\n[PG] Download complete. Extracting files...")
            
            # Extract to backend folder
            with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
                zip_ref.extractall(BACKEND_DIR)
                
            print(f"[PG] Extracted to {PG_DIR}")
            
            # Delete zip file
            if os.path.exists(ZIP_PATH):
                os.remove(ZIP_PATH)
        except Exception as e:
            print(f"\n[PG] Error setting up binaries: {e}")
            print("[PG] Falling back to SQLite if Postgres is unavailable.")
            return

    # Initialize data cluster if not present
    if not os.path.exists(DATA_DIR):
        print("[PG] Initializing database cluster...")
        os.makedirs(DATA_DIR, exist_ok=True)
        initdb_path = os.path.join(PG_DIR, "bin", "initdb.exe")
        # Run initdb
        cmd = [initdb_path, "-D", DATA_DIR, "-U", "postgres", "--locale=C", "-E", "UTF8"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[PG] initdb failed:\nStdout: {res.stdout}\nStderr: {res.stderr}")
            return
        print("[PG] Database cluster initialized successfully.")

    # Start PostgreSQL
    print("[PG] Starting local PostgreSQL server...")
    pg_ctl_path = os.path.join(PG_DIR, "bin", "pg_ctl.exe")
    # Start command in background
    cmd = [pg_ctl_path, "-D", DATA_DIR, "-l", os.path.join(PG_DIR, "pg.log"), "-o", f"-p {PORT}", "start"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[PG] Failed to start Postgres server:\nStdout: {res.stdout}\nStderr: {res.stderr}")
        return
    
    # Wait for server to accept connections
    print("[PG] Waiting for database server to start...")
    for _ in range(10):
        if is_port_open(PORT):
            break
        time.sleep(1)
        
    print("[PG] PostgreSQL started successfully.")
    create_database_if_not_exists()

def create_database_if_not_exists():
    createdb_path = os.path.join(PG_DIR, "bin", "createdb.exe")
    if not os.path.exists(createdb_path):
        print("[PG] Binaries not found, skipping db creation check.")
        return
        
    print(f"[PG] Ensuring database '{DB_NAME}' exists...")
    # Attempt to create database
    cmd = [createdb_path, "-U", "postgres", "-p", str(PORT), DB_NAME]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"[PG] Database '{DB_NAME}' created successfully.")
    else:
        if "already exists" in res.stderr.lower() or "already exists" in res.stdout.lower():
            print(f"[PG] Database '{DB_NAME}' already exists.")
        else:
            print(f"[PG] Warning: Could not verify/create database '{DB_NAME}':\n{res.stderr}")

if __name__ == "__main__":
    setup_postgres()
