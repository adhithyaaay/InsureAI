import os
import sys

# Set stdout encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import init_db, SessionLocal
import db_models
from auth import hash_password


def seed_underwriter(
    name: str = "Lead Underwriter",
    email: str = "underwriter@insureai.com",
    password: str = None
):
    """
    Controlled administrative provisioning for underwriter accounts.
    Never exposes public registration for UNDERWRITER role.
    """
    init_db()
    session = SessionLocal()

    if password is None:
        password = os.getenv("UNDERWRITER_DEFAULT_PASSWORD", "Underwriter@123")

    try:
        existing = session.query(db_models.User).filter_by(email=email).first()
        if existing:
            print(f"Underwriter account already exists: {email} (ID: {existing.id}, Role: {existing.role})")
            return existing

        underwriter = db_models.User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="UNDERWRITER"
        )
        session.add(underwriter)
        session.commit()
        session.refresh(underwriter)
        print(f"Successfully provisioned Underwriter account:")
        print(f"  ID:    {underwriter.id}")
        print(f"  Name:  {underwriter.name}")
        print(f"  Email: {underwriter.email}")
        print(f"  Role:  {underwriter.role}")
        return underwriter
    finally:
        session.close()


if __name__ == "__main__":
    seed_underwriter()
