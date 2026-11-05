# AGR002 Smart Irrigation — Shared API Contract

This document defines the formal request and response contract for the Smart Irrigation recommendation engine (`POST /api/recommend`). Both the Frontend and Backend services strictly adhere to this schema.

---

## 1. Endpoint Overview

- **Route:** `POST /api/recommend`
- **Content-Type:** `application/json`
- **Purpose:** Calculates real-time irrigation advice based on farm characteristics, crop stage, soil properties, and weather forecast data.

---

## 2. Request Contract (`recommend-request.json`)

The request payload accepts current farm registration, crop state, and irrigation hardware details.

### Schema Table

| Field Name | Type | Unit / Format | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `farm_name` | string | UTF-8 Text | Yes | Name of the farm or plot identifier | `"Bengaluru Green Fields"` |
| `latitude` | float | Decimal degrees | Yes | Geo latitude (-90.0 to 90.0) for weather lookup | `12.9716` |
| `longitude` | float | Decimal degrees | Yes | Geo longitude (-180.0 to 180.0) | `77.5946` |
| `crop` | string | Standard crop name | Yes | Crop cultivated (Rice, Wheat, Maize, Tomato, Sugarcane, Cotton, Ragi, Groundnut) | `"Tomato"` |
| `soil_type` | string | Soil classification | Yes | Soil type (Red Sandy Loam, Clay / Black Soil, Alluvial Loam, Sandy Soil) | `"Red Sandy Loam"` |
| `sowing_date` | string | ISO Date (`YYYY-MM-DD`)| Yes | Date when crop was sown/transplanted | `"2026-10-15"` |
| `farm_area_hectares`| float | Hectares ($ha$) | Yes | Total cultivated area in hectares ($1\text{ ha} = 10,000\text{ m}^2$) | `1.5` |
| `irrigation_method`| string | Choice string | Yes | Method used: `"Drip Irrigation"`, `"Sprinkler"`, `"Flood / Furrow"` | `"Drip Irrigation"` |
| `last_irrigation_date`| string | ISO Date (`YYYY-MM-DD`)| No | Most recent irrigation event | `"2026-11-02"` |
| `pump_flow_rate_lpm`| float | Litres per minute ($L/min$) | No | Flow capacity of the pump (used to compute motor run hours) | `120.0` |

---

## 3. Response Contract (`recommend-response.json`)

### Schema Table

| Field Name | Type | Unit / Format | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `irrigate_today` | boolean | Boolean (`true`/`false`)| High-level decision flag: whether irrigation is advised today | `true` |
| `irrigation_depth_mm` | float | Millimetres ($mm$) | Net water depth recommended for the root zone | `18.5` |
| `water_volume_litres` | float | Litres ($L$) | Total water required ($1\text{ mm} \times 1\text{ ha} = 10,000\text{ L}$) | `277500.0` |
| `estimated_pump_runtime_minutes` | integer | Minutes ($min$) | Required runtime for the specified pump flow rate (0 if not provided) | `231` |
| `current_growth_stage` | string | Text label | Growth stage determined by Days After Sowing (DAS) | `"Vegetative / Flowering"` |
| `current_kc` | float | Dimensionless ratio | FAO-56 Crop coefficient factor ($K_c$) applied | `0.85` |
| `next_irrigation_date` | string \| null | ISO Date (`YYYY-MM-DD`)| Projected next irrigation event based on water depletion rate | `"2026-11-08"` |
| `rain_warning` | string \| null | Text sentence | Alert if significant precipitation is expected within 48-72h | `"Light showers predicted on day 4..."` |
| `risk_status` | string | `"Low"`, `"Moderate"`, `"High"`, `"Critical"` | Moisture stress risk assessment | `"Moderate"` |
| `under_irrigation_risk` | string \| null | Choice string | Specific moisture stress assessment | `"Moderate"` |
| `under_irrigation_note` | string \| null | Text note | Guidance regarding delayed watering consequences | `"Soil moisture is approaching..."` |
| `over_irrigation_risk` | string \| null | Choice string | Waterlogging / aeration risk assessment | `"Low"` |
| `over_irrigation_note` | string \| null | Text note | Guidance regarding drainage capacity | `"Sandy loam allows good drainage..."` |
| `ml_adjustment_used` | boolean | Boolean (`true`/`false`)| Flag indicating if ML model fine-tuned the water balance | `false` |
| `weather_source` | string | Text label | Data origin: `"open-meteo"`, `"open-meteo-cache"`, or `"fallback"` | `"open-meteo"` |
| `explanation` | string | Text sentence | Simple, farmer-friendly explanation without complex jargon | `"Your tomato crop is currently..."` |
| `soil_moisture` | object \| null | Dictionary | Current moisture %, threshold %, and historical trend array | Object |
| `water_savings` | object \| null | Dictionary | Traditional flood vs. smart drip volumetric comparison | Object |
| `alerts` | array | List of objects | Priority notices (rain alerts, watering windows) | Array of alerts |
| `seven_day_schedule` | array | List of objects | Daily planned actions for the upcoming week | Array of 7 day items |
| `seven_day_weather` | array | List of objects | Forecasted weather metrics including ET0 and rain | Array of 7 weather items |

### Daily Schedule Item Object

| Field | Type | Unit | Description |
| :--- | :--- | :--- | :--- |
| `date` | string | `YYYY-MM-DD` | Calendar date |
| `day` | string | Short day name | e.g., `"Today"`, `"Fri"`, `"Sat"` |
| `irrigate` | boolean | `true`/`false` | Whether irrigation is scheduled for this day |
| `action` | string | Action name | `"Irrigate"`, `"Rest"`, `"Rain Pause"` |
| `recommended_depth_mm`| float | $mm$ | Depth for that day |
| `water_volume_litres` | float | $L$ | Volume in litres |
| `runtime_minutes` | integer | $min$ | Pump run duration |
| `rain_note` | string \| null | Text | Forecast precipitation summary for that day |

### Weather Forecast Item Object

| Field | Type | Unit | Description |
| :--- | :--- | :--- | :--- |
| `date` | string | `YYYY-MM-DD` | Calendar date |
| `day` | string | Short day name | e.g., `"Today"`, `"Fri"` |
| `temp_max_c` | float | Celsius (°C) | Maximum daily temperature |
| `temp_min_c` | float | Celsius (°C) | Minimum daily temperature |
| `humidity_pct` | integer | Percentage (%) | Relative humidity |
| `rainfall_mm` | float | Millimetres ($mm$) | Expected precipitation |
| `rain_probability_pct` | integer | Percentage (%) | Precipitation probability |
| `et0_mm` | float | Millimetres ($mm$) | Reference evapotranspiration ($ET_0$) |
| `condition` | string | Text description | e.g., `"Sunny"`, `"Rainy"`, `"Clear"` |

---

## 4. Contract Alignment Notes (Part 3)
- Added `irrigate` (boolean) and `rain_note` (string) to `ScheduleDayItem`.
- Added `rain_probability_pct` (int) to `WeatherDayItem` reflecting live Open-Meteo probability data.
- Added `weather_source`, `soil_moisture`, and `water_savings` metadata blocks for transparent frontend data attribution.
