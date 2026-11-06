"""AGR002 Database Backup Utility
--------------------------------
Creates consistent, verified backups of the SQLite database using the SQLite online
backup API. Executes an integrity check on the resulting snapshot and manages
rotation to prevent unbounded disk growth.

Usage:
    python backend/scripts/backup_db.py [--keep 5] [--dir backend/backups]
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import time
from pathlib import Path

# Add backend directory to path so app modules can be resolved
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import get_database_file_path


def perform_backup(
    db_path: Optional[Path] = None,
    backup_dir: Optional[Path] = None,
    keep_count: int = 5,
) -> Path:
    """Executes online SQLite backup, verifies integrity, and rotates old backups."""
    source_path = db_path or get_database_file_path()
    if not source_path:
        raise ValueError("Could not determine active SQLite database path.")

    # Ensure source database exists; if not, initialize with tables
    if not source_path.exists():
        from app.core.database import engine, Base
        Base.metadata.create_all(bind=engine)

    target_dir = backup_dir or (BACKEND_DIR / "backups")
    target_dir.mkdir(parents=True, exist_ok=True)

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_filename = f"irrigation_backup_{timestamp}.db"
    backup_path = target_dir / backup_filename

    # Execute atomic SQLite online backup
    src_conn = sqlite3.connect(str(source_path))
    try:
        dest_conn = sqlite3.connect(str(backup_path))
        try:
            src_conn.backup(dest_conn)
        finally:
            dest_conn.close()
    finally:
        src_conn.close()

    # Verify backup integrity
    verify_conn = sqlite3.connect(str(backup_path))
    try:
        result = verify_conn.execute("PRAGMA integrity_check;").fetchall()
        if not result or result[0][0] != "ok":
            raise RuntimeError(f"Integrity check failed on backup {backup_path}: {result}")
    finally:
        verify_conn.close()

    # Manage rotation
    existing_backups = sorted(
        target_dir.glob("irrigation_backup_*.db"),
        key=lambda p: p.stat().st_mtime,
    )
    if len(existing_backups) > keep_count:
        excess = len(existing_backups) - keep_count
        for old_file in existing_backups[:excess]:
            try:
                old_file.unlink()
            except Exception as e:
                print(f"[WARN] Could not remove old backup {old_file}: {e}", file=sys.stderr)

    return backup_path


def main() -> int:
    parser = argparse.ArgumentParser(description="AGR002 SQLite Database Backup CLI")
    parser.add_argument("--dir", type=str, default=None, help="Directory to store backups")
    parser.add_argument("--keep", type=int, default=5, help="Number of recent backups to retain")
    parser.add_argument("--db", type=str, default=None, help="Explicit path to source database")
    args = parser.parse_args()

    db_path = Path(args.db).resolve() if args.db else None
    backup_dir = Path(args.dir).resolve() if args.dir else None

    try:
        saved_path = perform_backup(db_path=db_path, backup_dir=backup_dir, keep_count=args.keep)
        size_bytes = saved_path.stat().st_size
        print(f"[SUCCESS] Database backup created: {saved_path} ({size_bytes} bytes, integrity verified)")
        return 0
    except Exception as exc:
        print(f"[ERROR] Database backup failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
