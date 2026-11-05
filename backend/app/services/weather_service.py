"""
AGR002 Smart Irrigation - Open-Meteo Weather Service
-----------------------------------------------------
Connects to Open-Meteo (open-access agro-meteorological API).
Retrieves:
  - 7-day future forecast (temperature, rain sum, rain probability, ET0, wind, solar radiation)
  - 7-day past observed weather for accurate water-depletion back-calculation
Includes a transparent in-memory and disk cache (TTL 3600s) with clear attribution.
"""

import os
import json
import time
import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
import httpx

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "../cache")
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_FILE = os.path.join(CACHE_DIR, "weather_cache.json")
CACHE_TTL_SECONDS = 3600  # 1 hour cache duration

# In-memory fast cache
_MEMORY_CACHE: Dict[str, Dict[str, Any]] = {}

# WMO Weather Interpretation Codes (WW)
WMO_CODE_MAP = {
    0: "Sunny / Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    80: "Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail",
}


def _cache_key(lat: float, lon: float) -> str:
    return f"{round(lat, 2)}_{round(lon, 2)}"


def _load_from_cache(key: str) -> Optional[Tuple[Dict[str, Any], str]]:
    """Loads weather from in-memory or disk cache if fresh."""
    now = time.time()

    # 1. Check memory cache
    if key in _MEMORY_CACHE:
        entry = _MEMORY_CACHE[key]
        if now - entry["timestamp"] < CACHE_TTL_SECONDS:
            return entry["data"], "open-meteo-cache"

    # 2. Check disk cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                disk_data = json.load(f)
                if key in disk_data:
                    entry = disk_data[key]
                    if now - entry.get("timestamp", 0) < CACHE_TTL_SECONDS:
                        _MEMORY_CACHE[key] = entry
                        return entry["data"], "open-meteo-cache"
        except Exception as e:
            logger.warning("Could not read weather cache file: %s", e)

    return None


def _save_to_cache(key: str, data: Dict[str, Any]) -> None:
    """Saves weather to memory and disk cache."""
    now = time.time()
    entry = {"timestamp": now, "cached_at": datetime.utcnow().isoformat(), "data": data}
    _MEMORY_CACHE[key] = entry

    try:
        disk_data = {}
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                disk_data = json.load(f)
        disk_data[key] = entry
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(disk_data, f, indent=2)
    except Exception as e:
        logger.warning("Could not write weather cache file: %s", e)


def fetch_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches real-time weather from Open-Meteo including 7-day past observed
    and 7-day future forecast.
    Falls back to valid cache or documented baseline on network failure.
    """
    key = _cache_key(lat, lon)

    # 1. Try fresh cache
    cached = _load_from_cache(key)
    if cached:
        data, source = cached
        return {**data, "source": source}

    # 2. Live API Request to Open-Meteo
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "et0_fao_evapotranspiration",
            "wind_speed_10m_max",
            "shortwave_radiation_sum",
        ],
        "hourly": ["relative_humidity_2m"],
        "past_days": 7,
        "forecast_days": 7,
        "timezone": "auto",
    }

    try:
        response = httpx.get(url, params=params, timeout=8.0)
        if response.status_code == 200:
            raw = response.json()
            parsed = _parse_open_meteo_response(raw)
            _save_to_cache(key, parsed)
            return {**parsed, "source": "open-meteo"}
        else:
            logger.error("Open-Meteo responded with status %s: %s", response.status_code, response.text)
    except Exception as exc:
        logger.warning("Failed to reach Open-Meteo API (%s). Attempting stale cache fallback.", exc)

    # 3. Fallback: Check stale cache if network failed
    if key in _MEMORY_CACHE:
        entry = _MEMORY_CACHE[key]
        return {**entry["data"], "source": "open-meteo-stale-cache"}

    # 4. Ultimate fallback: Documented local baseline
    logger.info("Using deterministic offline baseline weather for lat=%.4f, lon=%.4f", lat, lon)
    return _generate_offline_baseline_weather(lat, lon)


def _parse_open_meteo_response(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Parses Open-Meteo daily arrays into structured past and future lists."""
    daily = raw.get("daily", {})
    hourly = raw.get("hourly", {})

    times: List[str] = daily.get("time", [])
    weather_codes: List[int] = daily.get("weather_code", [])
    tmax: List[float] = daily.get("temperature_2m_max", [])
    tmin: List[float] = daily.get("temperature_2m_min", [])
    precip: List[float] = daily.get("precipitation_sum", [])
    precip_prob: List[int] = daily.get("precipitation_probability_max", [])
    et0: List[float] = daily.get("et0_fao_evapotranspiration", [])

    # Calculate daily mean humidity from hourly readings (24 readings per day)
    hourly_humidity = hourly.get("relative_humidity_2m", [])
    daily_humidity = []
    chunk_size = 24
    for i in range(0, len(hourly_humidity), chunk_size):
        chunk = hourly_humidity[i : i + chunk_size]
        avg_hum = int(round(sum(chunk) / len(chunk))) if chunk else 60
        daily_humidity.append(avg_hum)

    today_str = date.today().isoformat()
    today_index = 0
    for idx, t in enumerate(times):
        if t == today_str:
            today_index = idx
            break

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    # 7-day Future Forecast (starting from today)
    forecast_items = []
    for i in range(today_index, min(today_index + 7, len(times))):
        dt = date.fromisoformat(times[i])
        day_label = "Today" if i == today_index else day_names[dt.weekday()]
        w_code = weather_codes[i] if i < len(weather_codes) else 0
        cond = WMO_CODE_MAP.get(w_code, "Partly Cloudy")
        p_prob = precip_prob[i] if i < len(precip_prob) and precip_prob[i] is not None else (70 if (precip[i] or 0) > 2.0 else 10)

        forecast_items.append({
            "date": times[i],
            "day": day_label,
            "temp_max_c": round(tmax[i], 1) if i < len(tmax) and tmax[i] is not None else 28.0,
            "temp_min_c": round(tmin[i], 1) if i < len(tmin) and tmin[i] is not None else 19.0,
            "humidity_pct": daily_humidity[i] if i < len(daily_humidity) else 60,
            "rainfall_mm": round(precip[i], 1) if i < len(precip) and precip[i] is not None else 0.0,
            "rain_probability_pct": p_prob,
            "et0_mm": round(et0[i], 2) if i < len(et0) and et0[i] is not None else 4.2,
            "condition": cond,
        })

    # Past observed weather (prior to today)
    past_items = []
    for i in range(0, today_index):
        past_items.append({
            "date": times[i],
            "rainfall_mm": round(precip[i], 1) if i < len(precip) and precip[i] is not None else 0.0,
            "et0_mm": round(et0[i], 2) if i < len(et0) and et0[i] is not None else 4.0,
        })

    return {
        "forecast": forecast_items,
        "past": past_items,
    }


def _generate_offline_baseline_weather(lat: float, lon: float) -> Dict[str, Any]:
    """Generates clearly marked deterministic baseline weather when offline."""
    day_names = ["Today", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"]
    today = date.today()
    mock_temps = [
        (29.5, 19.0, 58, 0.0, 5, 4.6, "Sunny"),
        (30.0, 19.5, 55, 0.0, 10, 4.8, "Clear"),
        (28.5, 20.0, 68, 1.5, 35, 4.1, "Partly Cloudy"),
        (27.0, 19.0, 74, 8.0, 75, 3.4, "Rainy"),
        (26.5, 18.5, 80, 4.2, 80, 3.2, "Scattered Showers"),
        (28.0, 19.0, 65, 0.0, 20, 4.0, "Partly Cloudy"),
        (29.0, 19.5, 60, 0.0, 15, 4.4, "Sunny"),
    ]

    forecast = []
    for idx, (tmax, tmin, hum, rain, prob, et0, cond) in enumerate(mock_temps):
        d_date = today + timedelta(days=idx)
        forecast.append({
            "date": d_date.isoformat(),
            "day": day_names[idx % 7],
            "temp_max_c": tmax,
            "temp_min_c": tmin,
            "humidity_pct": hum,
            "rainfall_mm": rain,
            "rain_probability_pct": prob,
            "et0_mm": et0,
            "condition": cond,
        })

    return {
        "forecast": forecast,
        "past": [],
        "source": "offline-baseline",
    }
