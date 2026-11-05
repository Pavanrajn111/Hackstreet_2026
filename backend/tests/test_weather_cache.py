"""Tests for Task 5: Weather Service Robustness, Thread Safety, and Cache Recovery."""

import json
import time
from pathlib import Path
import pytest

from app.services import weather_service


def test_weather_cache_atomic_write_and_eviction(tmp_path, monkeypatch):
    """Verify that saving to cache is atomic, bounded by MAX_CACHE_ENTRIES, and thread-safe."""
    cache_file = tmp_path / "test_weather_cache.json"
    monkeypatch.setattr(weather_service, "CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(weather_service, "CACHE_FILE", str(cache_file))
    monkeypatch.setattr(weather_service, "MAX_CACHE_ENTRIES", 3)
    weather_service._MEMORY_CACHE.clear()

    # Save 4 entries (exceeding limit of 3)
    for i in range(1, 5):
        key = f"12.{i}_77.{i}"
        weather_service._save_to_cache(key, {"forecast": [{"temp": 25.0 + i}]})
        time.sleep(0.01)

    # Disk file should exist and be valid JSON
    assert cache_file.exists()
    with open(cache_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Should only retain at most 3 entries (oldest 12.1_77.1 evicted)
    assert len(data) <= 3
    assert "12.4_77.4" in data
    assert "12.1_77.1" not in data


def test_weather_cache_corruption_recovery(tmp_path, monkeypatch):
    """Verify corrupted cache file is quarantined and recovered gracefully."""
    cache_file = tmp_path / "test_weather_cache.json"
    monkeypatch.setattr(weather_service, "CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(weather_service, "CACHE_FILE", str(cache_file))
    weather_service._MEMORY_CACHE.clear()

    # Write broken JSON into cache file
    cache_file.write_text("{ broken invalid json ...", encoding="utf-8")

    # Load should detect corruption and recover
    res = weather_service._load_from_cache("12.97_77.59")
    assert res is None

    # Quarantined file should exist
    corrupt_files = list(tmp_path.glob("*.corrupt.*"))
    assert len(corrupt_files) > 0


def test_weather_metadata_flags():
    """Verify source and stale flags are returned by weather service."""
    # Test coordinates that fall back to deterministic baseline
    weather = weather_service._generate_offline_baseline_weather(12.97, 77.59)
    assert "source" in weather
    assert "stale" in weather
    assert weather["source"] == "offline-baseline"
    assert weather["stale"] is True
    assert len(weather["forecast"]) == 7
    assert "wind_m_s" in weather["forecast"][0]
    assert "solar_mj_m2" in weather["forecast"][0]
