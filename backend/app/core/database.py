import logging
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


def _ensure_sqlite_directory(database_url: str) -> bool:
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite":
        return False

    database_path = url.database
    if not database_path or database_path == ":memory:" or database_path.startswith("file:"):
        return True

    parent = Path(database_path).expanduser().parent
    try:
        parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise RuntimeError(
            f"Cannot create SQLite database directory '{parent}': {exc}"
        ) from exc
    return True


is_sqlite = _ensure_sqlite_directory(settings.DATABASE_URL)
connect_args = {"check_same_thread": False, "timeout": 30} if is_sqlite else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)


if is_sqlite:
    @event.listens_for(engine, "connect")
    def _configure_sqlite_connection(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency injection helper for FastAPI database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
