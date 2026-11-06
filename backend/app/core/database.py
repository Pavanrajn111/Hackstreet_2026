"""AGR002 Database Engine and Session Management
----------------------------------------------
Features:
1. Resilient path resolution: SQLite paths are always resolved relative to the
   backend/ directory regardless of where the process is launched.
2. Production SQLite pragmas: WAL mode for concurrent reads/writes, 5000ms busy timeout,
   and enforced foreign keys.
3. Lightweight migrations: verifies existing tables and automatically adds any missing
   columns defined in SQLAlchemy models without data loss.
4. Health check and backup introspection for /health endpoints.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

# Backend directory root: Path(__file__).resolve().parent.parent.parent
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent


def resolve_database_url(raw_url: str) -> str:
    """Resolves relative SQLite database URLs relative to the backend/ root."""
    url = make_url(raw_url)
    if url.get_backend_name() != "sqlite":
        return raw_url

    database_path = url.database
    if not database_path or database_path == ":memory:" or database_path.startswith("file:"):
        return raw_url

    path = Path(database_path).expanduser()
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return url.set(database=path.resolve().as_posix()).render_as_string(hide_password=False)


RESOLVED_DATABASE_URL = resolve_database_url(settings.DATABASE_URL)

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
        raise RuntimeError(f"Cannot create SQLite database directory '{parent}': {exc}") from exc
    return True


is_sqlite = _ensure_sqlite_directory(RESOLVED_DATABASE_URL)
connect_args = {"check_same_thread": False, "timeout": 30} if is_sqlite else {}

engine = create_engine(RESOLVED_DATABASE_URL, connect_args=connect_args)


if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA busy_timeout=30000;")
            cursor.execute("PRAGMA foreign_keys=ON;")
        finally:
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


def check_db_health() -> Tuple[bool, str]:
    """Execute 'SELECT 1' to verify database availability and responsiveness."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "database_responsive"
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return False, str(exc)


def get_database_file_path() -> Optional[Path]:
    """Returns the filesystem path to the active SQLite database file if applicable."""
    if not RESOLVED_DATABASE_URL.startswith("sqlite:///"):
        return None
    raw_path = RESOLVED_DATABASE_URL[len("sqlite:///") :]
    return Path(raw_path)


def get_last_backup_info() -> Dict[str, Any]:
    """Scans backend/backups for recent backup metadata."""
    backup_dir = BACKEND_DIR / "backups"
    if not backup_dir.exists():
        return {"backups_available": 0, "latest_backup": None}

    backups = sorted(
        backup_dir.glob("*.db"),
        key=lambda p: p.stat().st_mtime if p.exists() else 0,
        reverse=True,
    )
    if not backups:
        return {"backups_available": 0, "latest_backup": None}

    latest = backups[0]
    return {
        "backups_available": len(backups),
        "latest_backup": latest.name,
        "latest_backup_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(latest.stat().st_mtime)),
        "latest_backup_size_bytes": latest.stat().st_size,
    }


def run_lightweight_migrations(target_engine, target_base) -> None:
    """Verifies existing tables and adds any missing columns declared on models."""
    if not RESOLVED_DATABASE_URL.startswith("sqlite"):
        return

    # First ensure all tables exist
    target_base.metadata.create_all(bind=target_engine)

    try:
        with target_engine.connect() as conn:
            for table_name, table in target_base.metadata.tables.items():
                cursor = conn.connection.cursor()
                cursor.execute(f"PRAGMA table_info({table_name});")
                existing_cols = {row[1] for row in cursor.fetchall()}
                cursor.close()

                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(target_engine.dialect)
                        alter_stmt = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type};"
                        logger.info("Migrating table %s: %s", table_name, alter_stmt)
                        conn.execute(text(alter_stmt))
            conn.commit()
    except Exception as exc:
        logger.exception("Lightweight database migration failed.")
        raise RuntimeError("Database schema migration failed.") from exc
