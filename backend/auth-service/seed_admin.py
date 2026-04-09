"""
Seed script: Creates the initial admin user if one does not already exist.
Run once after the database is initialised:

    cd backend/auth-service
    python seed_admin.py

The credentials are printed to stdout on first creation so you can log in.
"""

import os
import sys
import uuid
from pathlib import Path

# Allow imports from the same package without installing it
sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from database import engine, SessionLocal, Base
from models import User, UserRole
from auth import hash_password

# ---------------------------------------------------------------------------
# Seed configuration — override with environment variables in production
# ---------------------------------------------------------------------------

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@company.com")
ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME", "System Administrator")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@12345")


def seed_admin() -> None:
    """
    Create the initial admin user if no admin account exists yet.

    Prints the generated credentials to stdout so the operator can log in
    immediately. If an admin already exists the script exits without making
    any changes.
    """
    # Ensure tables exist (idempotent)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_admin = (
            db.query(User)
            .filter(User.role == UserRole.admin)
            .first()
        )

        if existing_admin:
            print(
                "[seed_admin] An admin account already exists "
                f"(email: {existing_admin.email}). No changes made."
            )
            return

        admin_id = uuid.uuid4()
        admin = User(
            id=admin_id,
            email=ADMIN_EMAIL,
            full_name=ADMIN_FULL_NAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("=" * 60)
        print("[seed_admin] Admin user created successfully.")
        print(f"  ID       : {admin.id}")
        print(f"  Email    : {admin.email}")
        print(f"  Password : {ADMIN_PASSWORD}")
        print("=" * 60)
        print(
            "IMPORTANT: Change this password immediately after first login.\n"
            "You can set a custom password by exporting ADMIN_PASSWORD before\n"
            "running this script:\n\n"
            "  ADMIN_PASSWORD='MyStr0ng!Pass' python seed_admin.py"
        )
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
