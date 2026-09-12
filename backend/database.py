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
    """Initializes tables in the connected database."""
    import db_models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")
