import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Format for pg8000 connector
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    # SQLAlchemy requires postgresql+pg8000:// for pg8000 driver
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://")

# Default fallback to SQLite
FALLBACK_SQLITE_URL = "sqlite:///./placement_ai.db"

engine = None
SessionLocal = None

try:
    if DATABASE_URL:
        print(f"[DB] Attempting connection to PostgreSQL at: {DATABASE_URL.split('@')[-1]}")
        # Try creating PostgreSQL engine
        engine = create_engine(DATABASE_URL)
        # Test connection
        with engine.connect() as conn:
            pass
        print("[DB] Connected to PostgreSQL successfully.")
    else:
        raise ValueError("DATABASE_URL not found in env")
except Exception as e:
    print(f"[DB] PostgreSQL connection failed: {e}")
    print(f"[DB] Falling back to SQLite database: {FALLBACK_SQLITE_URL}")
    engine = create_engine(FALLBACK_SQLITE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
