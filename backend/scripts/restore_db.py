"""AGR002 Database Restore Utility
---------------------------------
Safely restores the SQLite database from a verified backup snapshot.
Validates the integrity of the backup before applying, takes an automatic safety
pre-restore snapshot of the current state, and verifies the restored database.

Usage:
    python backend/scripts/restore_db.py [--file path/to/backup.db] [--db target.db]
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import time
from pathlib import Path
from typing import Optional

# Add backend directory to path so app modules can be resolved
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import get_database_file_path


def perform_restore(
    backup_path: Optional[Path] = None,
    target_db_path: Optional[Path] = None,
) -> Path:
    """Restores SQLite database from a verified backup file."""
    dest_path = target_db_path or get_database_file_path()
    if not dest_path:
        raise ValueError("Could not determine target SQLite database path.")

    # Locate backup to restore
    if backup_path is None:
        backup_dir = BACKEND_DIR / "backups"
        if not backup_dir.exists():
            raise FileNotFoundError("Backups directory does not exist and no --file was specified.")
        candidates = sorted(
            backup_dir.glob("*.db"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            raise FileNotFoundError("No backups found in backups directory.")
        src_path = candidates[0]
    else:
        src_path = Path(backup_path).resolve()
        if not src_path.exists():
            raise FileNotFoundError(f"Backup file not found at {src_path}")

    # 1. Verify backup file integrity BEFORE applying
    verify_conn = sqlite3.connect(str(src_path))
    try:
        res = verify_conn.execute("PRAGMA integrity_check;").fetchall()
        if not res or res[0][0] != "ok":
            raise RuntimeError(f"Integrity check failed for source backup {src_path}: {res}")
    finally:
        verify_conn.close()

    # 2. Create safety pre-restore backup if destination already exists
    if dest_path.exists() and dest_path.stat().st_size > 0:
        pre_restore_snapshot = dest_path.with_name(f"{dest_path.name}.pre_restore_{time.strftime('%Y%m%d_%H%M%S')}")
        src_live = sqlite3.connect(str(dest_path))
        try:
            dest_snap = sqlite3.connect(str(pre_restore_snapshot))
            try:
                src_live.backup(dest_snap)
            finally:
                dest_snap.close()
        finally:
            src_live.close()
        print(f"[INFO] Created pre-restore safety snapshot: {pre_restore_snapshot}")

    # 3. Restore using SQLite backup API
    src_conn = sqlite3.connect(str(src_path))
    try:
        dest_conn = sqlite3.connect(str(dest_path))
        try:
            src_conn.backup(dest_conn)
        finally:
            dest_conn.close()
    finally:
        src_conn.close()

    # 4. Verify restored destination integrity
    final_conn = sqlite3.connect(str(dest_path))
    try:
        final_res = final_conn.execute("PRAGMA integrity_check;").fetchall()
        if not final_res or final_res[0][0] != "ok":
            raise RuntimeError(f"Restored database failed integrity check: {final_res}")
    finally:
        final_conn.close()

    return dest_path


def main() -> int:
    parser = argparse.ArgumentParser(description="AGR002 SQLite Database Restore CLI")
    parser.add_argument("--file", type=str, default=None, help="Explicit path to backup .db file")
    parser.add_argument("--db", type=str, default=None, help="Explicit path to target destination database")
    args = parser.parse_args()

    backup_path = Path(args.file).resolve() if args.file else None
    target_path = Path(args.db).resolve() if args.db else None

    try:
        restored = perform_restore(backup_path=backup_path, target_db_path=target_path)
        print(f"[SUCCESS] Database successfully restored to: {restored} (integrity verified)")
        return 0
    except Exception as exc:
        print(f"[ERROR] Database restore failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
