"""
Setup script: Creates the workshop_db PostgreSQL database if it does not exist.
Run once before starting backend services: python create_db.py
"""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")
except ImportError:
    pass

import psycopg2
from psycopg2 import sql

def create_database() -> None:
    """Create the workshop_db database if it does not already exist."""
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASS", "postgres")
    dbname = os.getenv("POSTGRES_NAME", "workshop_db")

    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname="postgres",
    )
    conn.autocommit = True

    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
        if not cur.fetchone():
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(dbname)))
            print(f"Database '{dbname}' created successfully.")
        else:
            print(f"Database '{dbname}' already exists.")
        cur.close()
    finally:
        conn.close()


if __name__ == "__main__":
    create_database()
