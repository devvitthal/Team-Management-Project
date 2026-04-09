"""Database configuration and session management."""

import os
from pathlib import Path
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Load .env from the backend root when running locally (no-op on Lambda)
try:
    from dotenv import load_dotenv, find_dotenv
    _env_file = str(Path(__file__).resolve().parent.parent / ".env")
    load_dotenv(dotenv_path=_env_file, override=True)
except ImportError:
    pass

POSTGRES_URL = (
    f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}"
    f":{quote_plus(os.getenv('POSTGRES_PASS', 'postgres'))}"
    f"@{os.getenv('POSTGRES_HOST', 'localhost')}"
    f":{os.getenv('POSTGRES_PORT', '5432')}"
    f"/{os.getenv('POSTGRES_NAME', 'workshop_db')}"
)

engine = create_engine(POSTGRES_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
