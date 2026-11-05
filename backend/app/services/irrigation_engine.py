"""
AGR002 Smart Irrigation - Water Balance Engine Service
------------------------------------------------------
Calculates daily reference evapotranspiration (ET0), crop evapotranspiration (ETc),
and soil moisture depletion based on FAO-56 principles.

NOTICE:
This is a baseline calculation engine intended for hackathon demonstration.
It is NOT a peer-reviewed or field-certified agronomic prescription engine.
"""

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Tuple
from app.schemas.recommendation import RecommendRequest, RecommendResponse, ScheduleDayItem, WeatherDayItem


# Crop stage configuration lookup
CROP_DATABASE: Dict[str, Dict[str, Any]] = {
    "Tomato": {
        "duration_days": 110,
        "stages": [
            {"name": "Initial / Establishment", "days": 20, "kc": 0.60},
            {"name": "Vegetative / Flowering", "days": 35, "kc": 0.85},
            {"name": "Mid-Season / Yield Formation", "days": 40, "kc": 1.15},
            {"name": "Late / Ripening", "days": 15, "kc": 0.80},
        ],
        "root_depth_m": 0.6,
        "max_allowable_depletion": 0.40,
    },
    "Rice": {
        "duration_days": 130,
        "stages": [
            {"name": "Initial / Transplanting", "days": 25, "kc": 1.05},
            {"name": "Vegetative / Tillering", "days": 35, "kc": 1.10},
            {"name": "Mid-Season / Panicle", "days": 45, "kc": 1.25},
            {"name": "Late / Maturation", "days": 25, "kc": 0.95},
        ],
        "root_depth_m": 0.4,
        "max_allowable_depletion": 0.20,
    },
    "Maize": {
        "duration_days": 100,
        "stages": [
            {"name": "Initial / Emergence", "days": 20, "kc": 0.40},
            {"name": "Vegetative / Rapid Growth", "days": 30, "kc": 0.80},
            {"name": "Mid-Season / Tasseling & Silking", "days": 35, "kc": 1.20},
            {"name": "Late / Dent & Mature", "days": 15, "kc": 0.60},
        ],
        "root_depth_m": 0.8,
        "max_allowable_depletion": 0.50,
    },
    "Wheat": {
        "duration_days": 120,
        "stages": [
            {"name": "Initial / Crown Root", "days": 20, "kc": 0.40},
            {"name": "Vegetative / Tillering & Jointing", "days": 35, "kc": 0.75},
            {"name": "Mid-Season / Flowering & Grain Fill", "days": 45, "kc": 1.15},
            {"name": "Late / Ripening", "days": 20, "kc": 0.45},
        ],
        "root_depth_m": 0.7,
        "max_allowable_depletion": 0.55,
    },
    "Cotton": {
        "duration_days": 150,
        "stages": [
            {"name": "Initial / Emergence", "days": 30, "kc": 0.45},
            {"name": "Vegetative / Squaring", "days": 40, "kc": 0.75},
            {"name": "Mid-Season / Boll Development", "days": 55, "kc": 1.20},
            {"name": "Late / Boll Opening & Harvest", "days": 25, "kc": 0.65},
        ],
        "root_depth_m": 1.0,
        "max_allowable_depletion": 0.60,
    },
}

SOIL_DATABASE: Dict[str, Dict[str, Any]] = {
    "Red Sandy Loam": {
        "field_capacity_pct": 22.0,
        "wilting_point_pct": 9.0,
        "available_water_capacity_mm_per_m": 130.0,
        "infiltration_rate_mm_hr": 25.0,
    },
    "Clay / Black Soil": {
        "field_capacity_pct": 36.0,
        "wilting_point_pct": 18.0,
        "available_water_capacity_mm_per_m": 180.0,
        "infiltration_rate_mm_hr": 8.0,
    },
    "Alluvial Loam": {
        "field_capacity_pct": 28.0,
        "wilting_point_pct": 12.0,
        "available_water_capacity_mm_per_m": 160.0,
        "infiltration_rate_mm_hr": 18.0,
    },
    "Sandy Soil": {
        "field_capacity_pct": 14.0,
        "wilting_point_pct": 5.0,
        "available_water_capacity_mm_per_m": 90.0,
        "infiltration_rate_mm_hr": 45.0,
    },
}

IRRIGATION_EFFICIENCY: Dict[str, float] = {
    "Drip Irrigation": 0.90,
    "Sprinkler": 0.75,
    "Flood / Furrow": 0.60,
}


def determine_crop_stage(crop_name: str, sowing_date: date) -> Tuple[str, float]:
    """Calculates growth stage and crop coefficient (Kc) from sowing date."""
    crop_info = CROP_DATABASE.get(crop_name, CROP_DATABASE["Tomato"])
    days_elapsed = max(0, (date.today() - sowing_date).days)

    cumulative_days = 0
    for stage in crop_info["stages"]:
        cumulative_days += stage["days"]
        if days_elapsed <= cumulative_days:
            return stage["name"], stage["kc"]

    last_stage = crop_info["stages"][-1]
    return last_stage["name"], last_stage["kc"]


def generate_mock_weather_forecast(lat: float, lon: float) -> List[WeatherDayItem]:
    """
    Generates a 7-day weather forecast based on location.
    TODO [Backend Teammate]: Replace with real Open-Meteo or IMD API integration.
    """
    day_names = ["Today", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"]
    today = date.today()
    mock_temps = [
        (29.5, 19.0, 58, 0.0, 4.6, "Sunny"),
        (30.0, 19.5, 55, 0.0, 4.8, "Clear"),
        (28.5, 20.0, 68, 1.5, 4.1, "Partly Cloudy"),
        (27.0, 19.0, 74, 8.0, 3.4, "Rainy"),
        (26.5, 18.5, 80, 4.2, 3.2, "Scattered Showers"),
        (28.0, 19.0, 65, 0.0, 4.0, "Partly Cloudy"),
        (29.0, 19.5, 60, 0.0, 4.4, "Sunny"),
    ]

    forecast = []
    for idx, (tmax, tmin, hum, rain, et0, cond) in enumerate(mock_temps):
        day_date = today + timedelta(days=idx)
        forecast.append(
            WeatherDayItem(
                date=day_date.isoformat(),
                day=day_names[idx % len(day_names)],
                temp_max_c=tmax,
                temp_min_c=tmin,
                humidity_pct=hum,
                rainfall_mm=rain,
                et0_mm=et0,
                condition=cond,
            )
        )
    return forecast


def calculate_irrigation_recommendation(payload: RecommendRequest) -> RecommendResponse:
    """
    Executes baseline FAO-56 water-balance computation.
    """
    # 1. Growth stage and Kc factor
    growth_stage, current_kc = determine_crop_stage(payload.crop, payload.sowing_date)

    # 2. Weather forecast (7 days)
    weather_forecast = generate_mock_weather_forecast(payload.latitude, payload.longitude)
    today_weather = weather_forecast[0]

    # 3. Reference and crop evapotranspiration
    # ETc = ET0 * Kc
    etc_mm = round(today_weather.et0_mm * current_kc, 2)

    # 4. Soil water parameters
    soil_info = SOIL_DATABASE.get(payload.soil_type, SOIL_DATABASE["Red Sandy Loam"])
    crop_info = CROP_DATABASE.get(payload.crop, CROP_DATABASE["Tomato"])
    root_depth_m = crop_info.get("root_depth_m", 0.6)
    awc_mm = soil_info.get("available_water_capacity_mm_per_m", 130.0) * root_depth_m

    # 5. Days since last irrigation
    days_since_last = (
        max(1, (date.today() - payload.last_irrigation_date).days)
        if payload.last_irrigation_date
        else 3
    )

    # Accumulated depletion estimate
    accumulated_depletion_mm = round(etc_mm * days_since_last, 1)

    # Efficiency factor
    eff = IRRIGATION_EFFICIENCY.get(payload.irrigation_method, 0.85)

    # Decision rule: irrigate if depletion exceeds threshold (or 3+ days dry)
    depletion_threshold_mm = awc_mm * crop_info.get("max_allowable_depletion", 0.45)
    irrigate_today = accumulated_depletion_mm >= (depletion_threshold_mm * 0.75) or days_since_last >= 3

    # Recommended gross depth in mm
    net_depth_mm = min(accumulated_depletion_mm, awc_mm) if irrigate_today else 0.0
    gross_depth_mm = round(net_depth_mm / eff, 1) if irrigate_today else 0.0

    # Total volume in litres: 1 mm over 1 ha = 10,000 litres
    water_volume_litres = round(gross_depth_mm * payload.farm_area_hectares * 10000.0, 1)

    # Estimated pump runtime in minutes
    runtime_minutes = 0
    if irrigate_today and payload.pump_flow_rate_lpm and payload.pump_flow_rate_lpm > 0:
        runtime_minutes = int(round(water_volume_litres / payload.pump_flow_rate_lpm))

    # Next irrigation date projection
    next_irrigation_date = (date.today() + timedelta(days=3)).isoformat() if irrigate_today else (date.today() + timedelta(days=1)).isoformat()

    # Rain alert check
    rain_warning = None
    rainy_days = [w for w in weather_forecast[1:4] if w.rainfall_mm >= 5.0]
    if rainy_days:
        rain_warning = f"Showers predicted on {rainy_days[0].day} ({rainy_days[0].rainfall_mm} mm). Monitor soil conditions."

    # Risk status
    if accumulated_depletion_mm > depletion_threshold_mm:
        risk_status = "High"
    elif irrigate_today:
        risk_status = "Moderate"
    else:
        risk_status = "Low"

    # Explanation in simple farmer language
    if irrigate_today:
        explanation = (
            f"Your {payload.crop} is in the {growth_stage} stage. Soil moisture has depleted by approximately "
            f"{accumulated_depletion_mm} mm over the last {days_since_last} days. We recommend applying "
            f"{gross_depth_mm} mm ({water_volume_litres:,.0f} L) today using {payload.irrigation_method}."
        )
    else:
        explanation = (
            f"Soil moisture is sufficient for your {payload.crop} in {growth_stage}. "
            f"No irrigation is required today. Next scheduled check is on {next_irrigation_date}."
        )

    # 7-day schedule construction
    day_names = ["Today", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"]
    seven_day_schedule = []
    for i in range(7):
        sched_date = (date.today() + timedelta(days=i)).isoformat()
        day_label = day_names[i % 7]
        is_irrigation_day = (i == 0 and irrigate_today) or (i == 3) or (i == 6)
        is_rain_day = weather_forecast[i].rainfall_mm >= 5.0

        if is_rain_day:
            action = "Rain Pause"
            d_mm = 0.0
        elif is_irrigation_day:
            action = "Irrigate"
            d_mm = gross_depth_mm if i == 0 else 15.0
        else:
            action = "Rest"
            d_mm = 0.0

        vol = round(d_mm * payload.farm_area_hectares * 10000.0, 1)
        rt = int(round(vol / payload.pump_flow_rate_lpm)) if (payload.pump_flow_rate_lpm and payload.pump_flow_rate_lpm > 0 and d_mm > 0) else 0

        seven_day_schedule.append(
            ScheduleDayItem(
                date=sched_date,
                day=day_label,
                action=action,
                recommended_depth_mm=d_mm,
                water_volume_litres=vol,
                runtime_minutes=rt,
            )
        )

    return RecommendResponse(
        irrigate_today=irrigate_today,
        irrigation_depth_mm=gross_depth_mm,
        water_volume_litres=water_volume_litres,
        estimated_pump_runtime_minutes=runtime_minutes,
        current_growth_stage=growth_stage,
        current_kc=current_kc,
        next_irrigation_date=next_irrigation_date,
        rain_warning=rain_warning,
        risk_status=risk_status,
        ml_adjustment_used=False,
        explanation=explanation,
        seven_day_schedule=seven_day_schedule,
        seven_day_weather=weather_forecast,
    )
