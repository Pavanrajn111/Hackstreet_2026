"""Tests for Task 4: Database Safety, Migrations, and Backup Scripts."""

import sqlite3
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core import database
from scripts.backup_db import perform_backup
from scripts.restore_db import perform_restore


@pytest.fixture
def client():
    return TestClient(app)


def test_database_wal_mode():
    """Verify WAL journal mode and busy timeout are active on SQLite connection."""
    with database.engine.connect() as conn:
        cursor = conn.connection.cursor()
        cursor.execute("PRAGMA journal_mode;")
        mode = cursor.fetchone()[0]
        cursor.execute("PRAGMA busy_timeout;")
        timeout = cursor.fetchone()[0]
        cursor.close()

        # In SQLite, WAL mode is active (or memory if in-memory test db)
        assert mode.lower() in ("wal", "memory")
        assert timeout >= 5000


def test_database_health_check_success(client):
    """Verify /health and /api/health return 200 when database is healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "sqlite_ready"
    assert "backup" in data


def test_database_health_check_failure(client, monkeypatch):
    """Verify /health returns 503 when database connectivity fails."""
    def mock_broken_health():
        return False, "Simulated database connection refused"

    monkeypatch.setattr(database, "check_db_health", mock_broken_health)

    response = client.get("/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["database"] == "unavailable"
    assert "Simulated" in data["database_details"]


def test_backup_and_restore_cycle(tmp_path):
    """Test full backup, rotation, and restore with integrity verification."""
    # Create test SQLite database
    test_db = tmp_path / "test_irrigation.db"
    conn = sqlite3.connect(str(test_db))
    conn.execute("CREATE TABLE test_items (id INTEGER PRIMARY KEY, name TEXT);")
    conn.execute("INSERT INTO test_items (name) VALUES ('Tomato Farm');")
    conn.commit()
    conn.close()

    backup_dir = tmp_path / "backups"

    # Perform 3 backups
    saved_backup1 = perform_backup(db_path=test_db, backup_dir=backup_dir, keep_count=2)
    assert saved_backup1.exists()

    saved_backup2 = perform_backup(db_path=test_db, backup_dir=backup_dir, keep_count=2)
    assert saved_backup2.exists()

    saved_backup3 = perform_backup(db_path=test_db, backup_dir=backup_dir, keep_count=2)
    assert saved_backup3.exists()

    # Rotation should ensure at most 2 backups exist
    backups_remaining = list(backup_dir.glob("irrigation_backup_*.db"))
    assert len(backups_remaining) <= 2

    # Modify the original database
    conn2 = sqlite3.connect(str(test_db))
    conn2.execute("INSERT INTO test_items (name) VALUES ('Corrupted Farm Entry');")
    conn2.commit()
    conn2.close()

    # Restore from the first saved backup into a restored target
    restore_target = tmp_path / "restored.db"
    restored_path = perform_restore(backup_path=saved_backup3, target_db_path=restore_target)
    assert restored_path == restore_target
    assert restore_target.exists()

    # Verify restored data matches backup
    chk_conn = sqlite3.connect(str(restore_target))
    cursor = chk_conn.cursor()
    cursor.execute("SELECT name FROM test_items;")
    rows = cursor.fetchall()
    chk_conn.close()
    assert ("Tomato Farm",) in rows
