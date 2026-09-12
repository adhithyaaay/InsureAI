import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

logger = logging.getLogger("insureai.database")
logging.basicConfig(level=logging.INFO)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/insureai"
)


def create_db_engine(db_url: str):
    """
    Creates an engine for PostgreSQL, or falls back gracefully to SQLite
    when PostgreSQL is not running locally without Docker.
    """
    if db_url.startswith("sqlite"):
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False}
        )
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        return engine

    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3} if "postgresql" in db_url else {}
        )
        # Test connection immediately
        with engine.connect() as conn:
            logger.info("Database connection established: %s", db_url.split("@")[-1] if "@" in db_url else db_url)
        return engine
    except Exception as exc:
        fallback_url = "sqlite:///./insureai.db"
        logger.warning(
            "Primary database connection (%s) unavailable: %s. "
            "Falling back to local SQLite (%s) for development and offline testing.",
            db_url.split("@")[-1] if "@" in db_url else db_url,
            exc,
            fallback_url
        )
        engine = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False}
        )
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        return engine


engine = create_db_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables and migrates any missing columns in the connected database."""
    import db_models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Auto-migration: check for newly added columns in documents table
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(engine)
        existing_cols = {col["name"] for col in inspector.get_columns("documents")}
        
        new_cols = [
            ("storage_path", "VARCHAR(500)"),
            ("mime_type", "VARCHAR(100)"),
            ("extracted_text", "TEXT"),
            ("extraction_method", "VARCHAR(50)"),
            ("structured_data_json", "TEXT"),
            ("consistency_checks_json", "TEXT"),
            ("discrepancy_count", "INTEGER DEFAULT 0"),
        ]

        with engine.begin() as conn:
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    logger.info(f"Migrating schema: adding column '{col_name}' to 'documents' table.")
                    conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}"))
    except Exception as exc:
        logger.warning(f"Schema auto-migration check notice: {exc}")

    logger.info("Database schema initialized successfully.")
