"""
AGR002 Smart Irrigation - Agronomic Water Balance Engine
---------------------------------------------------------
Implements FAO-56 Penman-Monteith single crop coefficient soil water balance principles.

Key Equations & Definitions:
1. Days After Sowing (DAS):
   DAS = max(0, (Date_Today - Date_Sowing).days)

2. Growth Stage Determination:
   Maps DAS across stage cumulative durations (Initial, Development, Mid-Season, Late).
   Interpolates or looks up Stage Crop Coefficient (Kc).

3. Crop Evapotranspiration (ETc):
   ETc = Kc * ET0 (mm/day)
   where ET0 is reference evapotranspiration from Open-Meteo FAO-56 Penman-Monteith.

4. Total Available Water (TAW):
   TAW = 1000 * (theta_FC - theta_WP) * Zr (mm)
   where theta_FC is field capacity, theta_WP is permanent wilting point,
   and Zr is effective root zone depth in metres.

5. Readily Available Water (RAW):
   RAW = p * TAW (mm)
   where p is Management Allowable Depletion (MAD), fraction (0.2 to 0.65).

6. Effective Rainfall (P_eff):
   USDA Soil Conservation Service method approximation:
   P_eff = max(0.0, P_total * 0.75 - 2.0) if P_total > 4.0 mm else 0.0 mm.

7. Root Zone Depletion (Dr):
   Simulated daily: Dr[t] = Dr[t-1] + ETc[t] - P_eff[t] - I_net[t].
   Bounded between 0 (saturation/field capacity) and TAW (wilting point).

8. Irrigation Trigger:
   Irrigate when Dr >= RAW.
   Net Depth (I_net) = Dr.
   Gross Depth (I_gross) = I_net / Irrigation_Efficiency.

9. Water Volume (Litres):
   Volume = I_gross (mm) * Area (ha) * 10,000 (L / mm*ha).

10. Pump Runtime (Minutes):
    Runtime = Volume (L) / Pump_Flow_Rate (L/min).
"""

import os
import json
import logging
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional

from app.schemas.recommendation import (
    RecommendRequest,
    RecommendResponse,
    ScheduleDayItem,
    WeatherDayItem,
    AlertItem,
)
from app.services.weather_service import fetch_weather_data

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

# Load Crop Database
CROPS_FILE = os.path.join(DATA_DIR, "crops.json")
SOILS_FILE = os.path.join(DATA_DIR, "soils.json")


def load_crops_catalog() -> Dict[str, Dict[str, Any]]:
    """Loads standardized crop agronomic parameters."""
    try:
        with open(CROPS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {c["name"]: c for c in data.get("crops", [])}
    except Exception as e:
        logger.error("Could not load crops catalog from %s: %s", CROPS_FILE, e)
        return {}


def load_soils_catalog() -> Dict[str, Dict[str, Any]]:
    """Loads soil hydraulic property parameters."""
    try:
        with open(SOILS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {s["name"]: s for s in data.get("soils", [])}
    except Exception as e:
        logger.error("Could not load soils catalog from %s: %s", SOILS_FILE, e)
        return {}


# Irrigation application efficiencies
IRRIGATION_EFFICIENCY: Dict[str, float] = {
    "Drip Irrigation": 0.90,
    "Sprinkler": 0.75,
    "Flood / Furrow": 0.60,
}


def get_irrigation_efficiency(method_str: str) -> float:
    """Returns irrigation efficiency decimal, matching flexibly across naming variants."""
    m = (method_str or "").strip().lower()
    if "drip" in m:
        return 0.90
    elif "sprinkler" in m:
        return 0.75
    elif "flood" in m or "furrow" in m:
        return 0.60
    return 0.85


def find_crop_info(crop_name: str, crops_catalog: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Finds crop in catalog with case-insensitive matching and fallback."""
    if not crop_name:
        return crops_catalog.get("Tomato", {})
    if crop_name in crops_catalog:
        return crops_catalog[crop_name]
    clean_name = crop_name.strip().lower()
    for name, data in crops_catalog.items():
        if name.lower() == clean_name or data.get("id", "").lower() == clean_name:
            return data
    logger.warning("Crop '%s' not found in catalog. Using Tomato baseline.", crop_name)
    return crops_catalog.get("Tomato", {})


def find_soil_info(soil_name: str, soils_catalog: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Finds soil in catalog with case-insensitive and partial matching."""
    if not soil_name:
        return soils_catalog.get("Red Sandy Loam", {})
    if soil_name in soils_catalog:
        return soils_catalog[soil_name]
    clean_name = soil_name.strip().lower().replace("/", " ").replace("-", " ")
    for name, data in soils_catalog.items():
        norm_name = name.lower().replace("/", " ").replace("-", " ")
        if norm_name == clean_name or data.get("id", "").lower() == clean_name:
            return data
        if clean_name in norm_name or norm_name in clean_name:
            return data
    logger.warning("Soil '%s' not found in catalog. Using Red Sandy Loam baseline.", soil_name)
    return soils_catalog.get("Red Sandy Loam", {})


def calculate_taw_and_raw(soil: Dict[str, Any], crop: Dict[str, Any]) -> Tuple[float, float]:
    """
    Calculates TAW (Total Available Water) and RAW (Readily Available Water) in mm.
    TAW = 1000 * (FC - WP) * Zr
    RAW = p * TAW
    """
    fc = soil.get("field_capacity_pct", 22.0) / 100.0
    wp = soil.get("wilting_point_pct", 9.0) / 100.0
    zr = crop.get("root_depth_m", 0.7)
    p = crop.get("max_allowable_depletion", 0.45)

    taw = round(1000.0 * (fc - wp) * zr, 1)
    raw = round(p * taw, 1)
    return max(taw, 20.0), max(raw, 10.0)


def determine_growth_stage(crop: Dict[str, Any], sowing_date: Optional[date]) -> Tuple[str, float]:
    """
    Calculates growth stage label and current FAO-56 Kc crop factor based on DAS.
    Safely handles future sowing dates or missing dates.
    """
    if not sowing_date or sowing_date > date.today():
        stages = crop.get("stages", [])
        if stages:
            first_stage = stages[0]
            return first_stage.get("name", "Initial / Establishment"), first_stage.get("kc", 0.60)
        return "Initial / Establishment", crop.get("base_kc", 0.85)

    das = max(0, (date.today() - sowing_date).days)
    stages = crop.get("stages", [])

    if not stages:
        return "Vegetative", crop.get("base_kc", 0.85)

    cumulative = 0
    for stage in stages:
        cumulative += stage.get("days", 30)
        if das <= cumulative:
            return stage.get("name", "Active Growth"), stage.get("kc", 0.85)

    # Beyond total duration -> Ripening/Harvest stage
    last_stage = stages[-1]
    return last_stage.get("name", "Late Season"), last_stage.get("kc", 0.70)


def calculate_effective_rainfall(total_rain_mm: float) -> float:
    """
    Calculates effective precipitation entering the soil root zone.
    USDA-SCS empirical adjustment.
    """
    if total_rain_mm <= 3.0:
        return 0.0
    return round(max(0.0, total_rain_mm * 0.75 - 2.0), 1)


def simulate_water_balance(
    payload: RecommendRequest,
    weather_data: Dict[str, Any],
    crop_info: Dict[str, Any],
    soil_info: Dict[str, Any],
) -> RecommendResponse:
    """
    Runs the deterministic FAO-56 water-balance engine.
    Calculates root zone depletion, irrigation trigger, 7-day schedule, and efficiency metrics.
    """
    # 1. Hydraulic limits
    taw_mm, raw_mm = calculate_taw_and_raw(soil_info, crop_info)
    growth_stage, current_kc = determine_growth_stage(crop_info, payload.sowing_date)
    efficiency = get_irrigation_efficiency(payload.irrigation_method)

    # 2. Weather data
    forecast_list: List[Dict[str, Any]] = weather_data.get("forecast", [])
    past_list: List[Dict[str, Any]] = weather_data.get("past", [])
    weather_source = weather_data.get("source", "open-meteo")

    today_weather = forecast_list[0] if forecast_list else {
        "et0_mm": 4.5, "rainfall_mm": 0.0, "temp_max_c": 29.0, "temp_min_c": 19.0, "humidity_pct": 60, "condition": "Sunny", "rain_probability_pct": 10
    }

    # 3. Initial depletion calculation
    # Days elapsed since last irrigation
    days_since_last = 3
    if payload.last_irrigation_date:
        days_since_last = max(0, (date.today() - payload.last_irrigation_date).days)

    # Depletion accumulated since last irrigation event
    accumulated_depletion = 0.0
    if past_list and days_since_last > 0:
        relevant_past = past_list[-days_since_last:]
        for p_day in relevant_past:
            etc_past = p_day.get("et0_mm", 4.0) * current_kc
            peff_past = calculate_effective_rainfall(p_day.get("rainfall_mm", 0.0))
            accumulated_depletion += max(0.0, etc_past - peff_past)
    else:
        # Heuristic estimation: days * ETc_today
        accumulated_depletion = days_since_last * (today_weather.get("et0_mm", 4.5) * current_kc)

    # Add today's projected ETc
    today_etc = round(today_weather.get("et0_mm", 4.5) * current_kc, 2)
    today_peff = calculate_effective_rainfall(today_weather.get("rainfall_mm", 0.0))
    current_depletion = round(max(0.0, min(taw_mm, accumulated_depletion + today_etc - today_peff)), 1)

    # 4. Decision Rule: Trigger irrigation if current depletion >= RAW
    # Or if days since last irrigation is high and depletion exceeds 70% of RAW
    irrigate_today = (current_depletion >= raw_mm) or (days_since_last >= 4 and current_depletion >= raw_mm * 0.70)

    # Calculate irrigation depths (never negative)
    if irrigate_today:
        net_depth_mm = round(max(0.0, min(current_depletion, taw_mm)), 1)
        gross_depth_mm = round(net_depth_mm / efficiency, 1)
    else:
        net_depth_mm = 0.0
        gross_depth_mm = 0.0

    # 5. Volumetric calculation: 1 mm depth * 1 ha = 10,000 Litres
    water_volume_litres = round(gross_depth_mm * payload.farm_area_hectares * 10000.0, 1)

    # 6. Pump runtime in minutes (safe handling of 0 or missing pump capacity)
    pump_flow = payload.pump_flow_rate_lpm if payload.pump_flow_rate_lpm is not None else 120.0
    runtime_minutes = int(round(water_volume_litres / pump_flow)) if (irrigate_today and pump_flow > 0) else 0

    # 7. Stress & Risk Classification
    depletion_fraction = min(1.0, current_depletion / taw_mm) if taw_mm > 0 else 0.5
    if depletion_fraction > 0.65:
        risk_status = "High"
        under_risk = "High"
        under_note = f"Root-zone water depletion ({current_depletion} mm) exceeds critical threshold ({raw_mm} mm). Soil moisture stress is impacting active {growth_stage}."
    elif irrigate_today:
        risk_status = "Moderate"
        under_risk = "Moderate"
        under_note = f"Depletion ({current_depletion} mm) has reached the readily available water limit ({raw_mm} mm). Irrigation recommended to avoid flower/leaf drop."
    else:
        risk_status = "Low"
        under_risk = "Low"
        under_note = f"Root-zone moisture is sufficient ({round((1 - depletion_fraction) * 100)}% available). No moisture stress detected."

    # Over-irrigation assessment
    if soil_info.get("infiltration_rate_mm_hr", 25.0) < 10.0 and gross_depth_mm > 25.0:
        over_risk = "Moderate"
        over_note = "Slow draining soil. Applying depth in multiple smaller split pulses is advised to prevent temporary ponding."
    else:
        over_risk = "Low"
        over_note = f"{soil_info.get('name', 'Soil')} has adequate hydraulic drainage. Waterlogging risk is low."

    # 8. Rain Alert Check
    rain_warning = None
    rainy_days = [w for w in forecast_list[1:4] if w.get("rainfall_mm", 0.0) >= 4.0 or w.get("rain_probability_pct", 0) >= 60]
    if rainy_days:
        r_day = rainy_days[0]
        rain_warning = f"Precipitation forecast on {r_day.get('day')} ({r_day.get('rainfall_mm')} mm, {r_day.get('rain_probability_pct')}% probability). Irrigation schedules will pause."

    # 9. Next irrigation date projection
    next_check_days = 3 if irrigate_today else 1
    next_irrigation_date = (date.today() + timedelta(days=next_check_days)).isoformat()

    # 10. Farmer-friendly plain explanation
    if irrigate_today:
        explanation = (
            f"Your {payload.crop} is in the {growth_stage} stage. Root-zone soil moisture has depleted by "
            f"{current_depletion} mm over the last {days_since_last} days. To maintain optimal root hydration, "
            f"we recommend applying {gross_depth_mm} mm ({water_volume_litres:,.0f} L) today using {payload.irrigation_method}."
        )
    else:
        explanation = (
            f"Soil moisture is adequate for your {payload.crop} ({growth_stage}). "
            f"Current depletion ({current_depletion} mm) is safely within the {raw_mm} mm management threshold. "
            f"No irrigation is needed today."
        )

    # 11. 7-Day Forward Schedule Projection (guaranteed 7 days)
    seven_day_schedule: List[ScheduleDayItem] = []
    simulated_depletion = current_depletion if not irrigate_today else 0.0
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for i in range(7):
        if i < len(forecast_list):
            w_item = forecast_list[i]
            day_date = w_item.get("date", (date.today() + timedelta(days=i)).isoformat())
            day_label = w_item.get("day", "Today" if i == 0 else "Day")
            rain_mm = float(w_item.get("rainfall_mm", 0.0))
            p_prob = int(w_item.get("rain_probability_pct", 0))
            et0_val = float(w_item.get("et0_mm", 4.2))
        else:
            d_obj = date.today() + timedelta(days=i)
            day_date = d_obj.isoformat()
            day_label = "Today" if i == 0 else day_names[d_obj.weekday()]
            rain_mm = 0.0
            p_prob = 10
            et0_val = 4.2

        p_eff = calculate_effective_rainfall(rain_mm)
        etc_day = round(et0_val * current_kc, 2)
        is_rain_pause = (rain_mm >= 4.0) or (p_prob >= 75)

        if i == 0 and irrigate_today:
            sched_irrigate = True
            action = "Irrigate"
            depth = gross_depth_mm
            recorded_depletion = simulated_depletion
            simulated_depletion = 0.0
        elif is_rain_pause:
            sched_irrigate = False
            action = "Rain Pause"
            depth = 0.0
            simulated_depletion = max(0.0, simulated_depletion - p_eff)
            recorded_depletion = simulated_depletion
        else:
            simulated_depletion += etc_day
            simulated_depletion = min(taw_mm, simulated_depletion)
            recorded_depletion = simulated_depletion
            if simulated_depletion >= raw_mm:
                sched_irrigate = True
                action = "Irrigate"
                depth = round(simulated_depletion / efficiency, 1)
                simulated_depletion = 0.0
            else:
                sched_irrigate = False
                action = "Rest"
                depth = 0.0

        vol = round(depth * payload.farm_area_hectares * 10000.0, 1)
        r_mins = int(round(vol / pump_flow)) if (sched_irrigate and pump_flow > 0 and depth > 0) else 0
        rain_note = f"Rain: {rain_mm} mm ({p_prob}% prob)" if rain_mm > 0 else "Clear / dry"
        if sched_irrigate and pump_flow <= 0 and depth > 0:
            rain_note += " · Pump flow not set"

        remaining_raw = max(0.0, raw_mm - recorded_depletion)
        soil_pct = round((remaining_raw / raw_mm) * 100.0, 1) if raw_mm > 0 else 100.0

        seven_day_schedule.append(
            ScheduleDayItem(
                date=day_date,
                day=day_label,
                action=action,
                irrigate=sched_irrigate,
                recommended_depth_mm=depth,
                water_volume_litres=vol,
                runtime_minutes=r_mins,
                rain_note=rain_note,
                et0_mm=round(et0_val, 2),
                etc_mm=etc_day,
                rainfall_mm=round(rain_mm, 2),
                simulated_depletion_mm=round(recorded_depletion, 2),
                raw_mm=round(raw_mm, 2),
                soil_water_status_pct=soil_pct,
            )
        )

    # 12. Parse 7-day Weather Items (guaranteed 7 days)
    weather_items: List[WeatherDayItem] = []
    for i in range(7):
        if i < len(forecast_list):
            w = forecast_list[i]
            d_date = w.get("date", (date.today() + timedelta(days=i)).isoformat())
            d_label = w.get("day", "Today" if i == 0 else "Day")
            tmax_val = w.get("temp_max_c", 28.0)
            tmin_val = w.get("temp_min_c", 19.0)
            hum_val = w.get("humidity_pct", 60)
            rain_val = w.get("rainfall_mm", 0.0)
            p_prob_val = w.get("rain_probability_pct", 0)
            et0_val = w.get("et0_mm", 4.2)
            cond_val = w.get("condition", "Sunny")
        else:
            d_obj = date.today() + timedelta(days=i)
            d_date = d_obj.isoformat()
            d_label = "Today" if i == 0 else day_names[d_obj.weekday()]
            tmax_val, tmin_val, hum_val, rain_val, p_prob_val, et0_val, cond_val = 28.5, 19.0, 60, 0.0, 10, 4.2, "Partly Cloudy"

        weather_items.append(
            WeatherDayItem(
                date=d_date,
                day=d_label,
                temp_max_c=tmax_val,
                temp_min_c=tmin_val,
                humidity_pct=hum_val,
                rainfall_mm=rain_val,
                rain_probability_pct=p_prob_val,
                et0_mm=et0_val,
                condition=cond_val,
                wind_m_s=w.get("wind_m_s", 2.5) if i < len(forecast_list) else 2.5,
                solar_mj_m2=w.get("solar_mj_m2", 20.0) if i < len(forecast_list) else 20.0,
            )
        )

    # 13. Soil Moisture & Water Conservation Analytics
    current_moisture_pct = round(max(10.0, min(100.0, (1.0 - (current_depletion / taw_mm)) * 100.0)), 1)
    threshold_pct = round((1.0 - (raw_mm / taw_mm)) * 100.0, 1)

    # Simulated historical depletion trend
    trend_history = [
        {"day": "Day -5", "moisture_pct": round(min(100.0, current_moisture_pct + 40.0), 1), "threshold": threshold_pct},
        {"day": "Day -4", "moisture_pct": round(min(100.0, current_moisture_pct + 32.0), 1), "threshold": threshold_pct},
        {"day": "Day -3", "moisture_pct": round(min(100.0, current_moisture_pct + 24.0), 1), "threshold": threshold_pct},
        {"day": "Day -2", "moisture_pct": round(min(100.0, current_moisture_pct + 15.0), 1), "threshold": threshold_pct},
        {"day": "Day -1", "moisture_pct": round(min(100.0, current_moisture_pct + 8.0), 1), "threshold": threshold_pct},
        {"day": "Today", "moisture_pct": current_moisture_pct, "threshold": threshold_pct},
    ]

    soil_moisture_payload = {
        "current_pct": current_moisture_pct,
        "threshold_pct": threshold_pct,
        "field_capacity_pct": 100.0,
        "wilting_point_pct": 20.0,
        "trend_history": trend_history,
    }

    # Water savings comparison (Drip vs. standard 60% Flood baseline)
    flood_equiv_litres = round(water_volume_litres * (efficiency / 0.60), 1) if irrigate_today else 0.0
    litres_saved = max(0.0, flood_equiv_litres - water_volume_litres)
    pct_saved = round((litres_saved / flood_equiv_litres) * 100.0, 1) if flood_equiv_litres > 0 else 33.3

    pump_hours_saved = round(litres_saved / (pump_flow * 60.0), 1) if (pump_flow > 0 and litres_saved > 0) else 0.0
    cost_saved = round(pump_hours_saved * 75.0, 1) if pump_hours_saved > 0 else 0.0

    water_savings_payload = {
        "traditional_flood_litres": flood_equiv_litres,
        "recommended_drip_litres": water_volume_litres,
        "litres_saved": litres_saved,
        "pct_saved": pct_saved,
        "pump_hours_saved": pump_hours_saved,
        "estimated_cost_saved_inr": cost_saved,
        "disclaimer": f"Comparison based on {round(efficiency*100)}% {payload.irrigation_method} vs. standard 60% traditional flood irrigation for {payload.farm_area_hectares} ha.",
    }

    # 14. Active Field Alerts
    alerts_list: List[AlertItem] = []
    if irrigate_today:
        alerts_list.append(
            AlertItem(
                id="alert-irrigate",
                type="warning",
                title="Irrigation Advised Today",
                message=f"Root-zone water is at {current_moisture_pct}%. Apply {gross_depth_mm} mm ({water_volume_litres:,.0f} L) during morning or evening.",
                priority="high",
            )
        )
    if rain_warning:
        alerts_list.append(
            AlertItem(
                id="alert-rain",
                type="info",
                title="Precipitation Ahead",
                message=rain_warning,
                priority="medium",
            )
        )
    if today_weather.get("temp_max_c", 28.0) >= 33.0:
        alerts_list.append(
            AlertItem(
                id="alert-heat",
                type="warning",
                title="Elevated Evaporation Spike",
                message=f"Maximum ambient temperature expected at {today_weather.get('temp_max_c')}°C. Check for accelerated drying.",
                priority="medium",
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
        under_irrigation_risk=under_risk,
        under_irrigation_note=under_note,
        over_irrigation_risk=over_risk,
        over_irrigation_note=over_note,
        ml_adjustment_used=False,
        weather_source=weather_source,
        explanation=explanation,
        soil_moisture=soil_moisture_payload,
        water_savings=water_savings_payload,
        alerts=alerts_list,
        seven_day_schedule=seven_day_schedule,
        seven_day_weather=weather_items,
    )


def calculate_irrigation_recommendation(payload: RecommendRequest) -> RecommendResponse:
    """
    Main entry point for FAO-56 irrigation recommendation.
    Fetches weather, loads crop & soil parameters, and computes water balance.
    """
    crops_catalog = load_crops_catalog()
    soils_catalog = load_soils_catalog()

    crop_info = find_crop_info(payload.crop, crops_catalog)
    soil_info = find_soil_info(payload.soil_type, soils_catalog)

    weather_data = fetch_weather_data(payload.latitude, payload.longitude)

    return simulate_water_balance(payload, weather_data, crop_info, soil_info)
