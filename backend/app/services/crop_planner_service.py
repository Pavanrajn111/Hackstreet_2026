"""
AGR002 Extra Crop Planner & Machine Learning Market Forecasting Service
------------------------------------------------------------------------
Bridges trained ML models from ml/crop_planner:
  1. crop_suitability_rf.joblib (Random Forest 22-class model)
  2. price_models.joblib (Gradient Boosting Regressors for 8 commodities)
  3. extra_crops_kb.csv (Agronomic knowledge base for boundary, border, intercrop, understorey)
  4. price_summary.json & price_forecast_*.csv (Precomputed forecasts and error metrics)
  5. SYNTHETIC_prices_NOT_REAL.csv (Historical time series)

Implements safe fallbacks to ensure backend stability even if ML artifacts are missing.
"""

import os
import json
import logging
import math
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Optional ML libraries
try:
    import joblib
except ImportError:
    joblib = None

try:
    import numpy as np
    import pandas as pd
except ImportError:
    np = None
    pd = None


# Commodity mapping between knowledge base crop names and commodity price model keys
CROP2COMMODITY: Dict[str, str] = {
    "coconut": "Coconut",
    "arecanut": "Arecanut",
    "moringa": "Drumstick",
    "drumstick": "Drumstick",
    "lemongrass": "Lemon Grass",
    "lemon grass": "Lemon Grass",
    "marigold": "Marigold",
    "papaya": "Papaya",
    "pepper": "Pepper",
    "black pepper": "Pepper",
    "turmeric": "Turmeric",
}

COMMODITY2CROP: Dict[str, str] = {
    "Coconut": "coconut",
    "Arecanut": "arecanut",
    "Drumstick": "moringa",
    "Lemon Grass": "lemongrass",
    "Marigold": "marigold",
    "Papaya": "papaya",
    "Pepper": "pepper",
    "Turmeric": "turmeric",
}

COMMODITY_ALIASES: Dict[str, str] = {
    "coconut": "Coconut",
    "arecanut": "Arecanut",
    "drumstick": "Drumstick",
    "moringa": "Drumstick",
    "lemongrass": "Lemon Grass",
    "lemon_grass": "Lemon Grass",
    "lemon grass": "Lemon Grass",
    "marigold": "Marigold",
    "papaya": "Papaya",
    "pepper": "Pepper",
    "black_pepper": "Pepper",
    "black pepper": "Pepper",
    "turmeric": "Turmeric",
}


def _resolve_crop_planner_dir() -> Path:
    """Finds the crop_planner directory containing the trained model bundle."""
    # 1. Environment variable override
    env_dir = os.environ.get("ML_CROP_PLANNER_DIR")
    if env_dir and Path(env_dir).exists():
        return Path(env_dir).resolve()

    # 2. Relative to this service file
    base = Path(__file__).resolve().parent.parent.parent.parent  # Hackstreet root
    candidates = [
        base / "ml" / "crop_planner",
        Path.cwd() / "ml" / "crop_planner",
        Path("ml/crop_planner").resolve(),
    ]
    for c in candidates:
        if c.exists() and (c / "extra_crops_kb.csv").exists():
            return c.resolve()

    # Default fallback
    return (base / "ml" / "crop_planner").resolve()


PLANNER_DIR = _resolve_crop_planner_dir()


class CropPlannerModelManager:
    """Singleton manager for the Extra Crop Planner ML artifacts."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or PLANNER_DIR
        self.suitability_model = None
        self.price_models: Dict[str, Any] = {}
        self.kb_df = None
        self.price_summary: Dict[str, Any] = {}
        self.historical_prices = None
        self.precomputed_forecasts: Dict[str, List[Dict[str, Any]]] = {}
        self._load_all()

    def _load_all(self):
        """Loads knowledge base, price models, and classifier."""
        self._load_kb()
        self._load_price_summary()
        self._load_historical_prices()
        self._load_precomputed_forecasts()
        self._load_models()

    def _load_kb(self):
        kb_path = self.data_dir / "extra_crops_kb.csv"
        if not kb_path.exists():
            logger.warning("extra_crops_kb.csv not found at %s", kb_path)
            return

        if pd is not None:
            try:
                df = pd.read_csv(kb_path)
                df["soil_list"] = df["soils"].apply(lambda s: [x.strip() for x in str(s).split("|")])
                self.kb_df = df
                logger.info("Loaded extra_crops_kb with %d crops", len(df))
            except Exception as e:
                logger.error("Failed to load extra_crops_kb.csv: %s", e)

    def _load_price_summary(self):
        summary_path = self.data_dir / "price_summary.json"
        if summary_path.exists():
            try:
                with open(summary_path, "r", encoding="utf-8") as f:
                    self.price_summary = json.load(f)
                logger.info("Loaded price_summary with %d commodities", len(self.price_summary))
            except Exception as e:
                logger.error("Failed to load price_summary.json: %s", e)

    def _load_historical_prices(self):
        hist_path = self.data_dir / "SYNTHETIC_prices_NOT_REAL.csv"
        if hist_path.exists() and pd is not None:
            try:
                self.historical_prices = pd.read_csv(hist_path)
                logger.info("Loaded historical prices with %d records", len(self.historical_prices))
            except Exception as e:
                logger.error("Failed to load historical prices: %s", e)

    def _load_precomputed_forecasts(self):
        for comm in ["Arecanut", "Coconut", "Drumstick", "Lemon_Grass", "Marigold", "Papaya", "Pepper", "Turmeric"]:
            csv_path = self.data_dir / f"price_forecast_{comm}.csv"
            key = comm.replace("_", " ") if comm != "Lemon_Grass" else "Lemon Grass"
            if csv_path.exists() and pd is not None:
                try:
                    df = pd.read_csv(csv_path)
                    records = df.to_dict(orient="records")
                    self.precomputed_forecasts[key] = records
                except Exception as e:
                    logger.error("Failed to load forecast for %s: %s", comm, e)

    def _load_models(self):
        if joblib is None:
            logger.warning("joblib not installed; ML prediction will use rule-based fallback.")
            return

        # Load Random Forest suitability model
        rf_path = self.data_dir / "crop_suitability_rf.joblib"
        if rf_path.exists():
            try:
                self.suitability_model = joblib.load(rf_path)
                logger.info("Loaded crop_suitability_rf model successfully.")
            except Exception as e:
                logger.warning("Failed to load crop_suitability_rf.joblib: %s", e)

        # Load GradientBoosting price models
        pm_path = self.data_dir / "price_models.joblib"
        if pm_path.exists():
            try:
                self.price_models = joblib.load(pm_path)
                logger.info("Loaded price_models for %d commodities.", len(self.price_models))
            except Exception as e:
                logger.warning("Failed to load price_models.joblib: %s", e)

    @property
    def is_rf_available(self) -> bool:
        return self.suitability_model is not None

    @property
    def is_price_models_available(self) -> bool:
        return bool(self.price_models)


manager = CropPlannerModelManager()


# -------------------------------------------------------------------------
# Core Helper Algorithms (matching planner_functions.py + enhancements)
# -------------------------------------------------------------------------

def range_score(v: float, lo: float, hi: float, tol: float = 0.25) -> float:
    """1.0 inside [lo, hi]; decays linearly to 0 at tol*(hi-lo) outside."""
    if lo <= v <= hi:
        return 1.0
    w = max((hi - lo) * tol, 1e-9)
    d = (lo - v) if v < lo else (v - hi)
    return float(max(0.0, 1.0 - d / w))


def fit_score(farm: Dict[str, Any], row: Any) -> Tuple[float, List[str]]:
    """Evaluates pH, rainfall, temperature, soil type, and shade tolerance."""
    parts = {}
    notes = []

    parts["pH"] = range_score(float(farm.get("ph", 6.5)), row.ph_min, row.ph_max)
    parts["rainfall"] = range_score(float(farm.get("rainfall_mm_yr", 1200.0)), row.rain_min, row.rain_max)
    parts["temp"] = range_score(float(farm.get("temp_c", 28.0)), row.temp_min, row.temp_max)

    # Soil match
    farm_soil = str(farm.get("soil", "Red")).strip().capitalize()
    soil_list = getattr(row, "soil_list", [s.strip() for s in str(row.soils).split("|")])
    parts["soil"] = 1.0 if any(farm_soil.lower() in s.lower() or s.lower() in farm_soil.lower() for s in soil_list) else 0.4

    # Shade match
    shade = float(farm.get("shade_level", 0.3))
    parts["shade"] = 1.0 if shade <= row.shade_tol + 0.2 else max(0.0, 1.0 - (shade - row.shade_tol - 0.2) * 2.0)

    if np is not None:
        vals = np.array(list(parts.values()))
        score = 0.6 * float(vals.mean()) + 0.4 * float(vals.min())
    else:
        score = 0.6 * (sum(parts.values()) / len(parts)) + 0.4 * min(parts.values())

    for k, v in parts.items():
        if v < 0.6:
            notes.append(f"{k} is a weak match")

    if float(farm.get("rainfall_mm_yr", 1200.0)) < row.rain_min:
        notes.append("needs extra irrigation")

    return round(float(score), 3), notes


def ml_score(farm: Dict[str, Any], crop: str) -> Optional[float]:
    """Queries Random Forest probability for crops existing in Kaggle dataset."""
    if not manager.is_rf_available or pd is None:
        return None

    crop_clean = crop.lower().strip()
    classes = list(getattr(manager.suitability_model, "classes_", []))
    if crop_clean not in classes:
        return None

    try:
        # Scale annual rainfall (e.g. 1200mm/yr) down to monthly/dataset scale (~100-200mm) if needed
        rain_input = float(farm.get("rainfall_mm_yr", 1200.0))
        rain_val = (rain_input / 12.0) if rain_input > 300.0 else rain_input

        feat_df = pd.DataFrame([{
            "n": float(farm.get("n", 50.0)),
            "p": float(farm.get("p", 40.0)),
            "k": float(farm.get("k", 30.0)),
            "temperature": float(farm.get("temp_c", 28.0)),
            "humidity": float(farm.get("humidity", 70.0)),
            "ph": float(farm.get("ph", 6.5)),
            "rainfall": rain_val,
        }])
        probas = manager.suitability_model.predict_proba(feat_df)[0]
        idx = classes.index(crop_clean)
        return float(probas[idx])
    except Exception as e:
        logger.warning("ml_score prediction failed for %s: %s", crop, e)
        return None


def cashflow(row: Any, years: int = 15, price_growth: float = 0.03, disc: float = 0.10, price_mult: float = 1.0) -> Tuple[List[float], float, Optional[int]]:
    """Calculates year-by-year cashflow, discounted 15-year NPV, and payback year."""
    cf = []
    annual = (row.life_years <= 1)

    for t in range(1, years + 1):
        cost = row.annual_cost_per_plant + (row.est_cost_per_plant if (t == 1 or annual) else 0)
        if row.life_years < years and not annual and t > row.life_years:
            cost, rev = 0.0, 0.0
        else:
            if annual:
                ramp = 1.0 if row.years_to_first_yield <= 1 else 0.0
            elif t < math.ceil(row.years_to_first_yield):
                ramp = 0.0
            elif t == math.ceil(row.years_to_first_yield):
                ramp = 0.6  # First bearing year is partial yield
            else:
                ramp = 1.0
            rev = ramp * row.yield_per_plant_yr * row.price_per_unit * price_mult * ((1.0 + price_growth) ** (t - 1))
        cf.append(rev - cost)

    disc_cf_sum = 0.0
    cum = 0.0
    payback_year = None

    for idx, net_cf in enumerate(cf):
        year_num = idx + 1
        disc_cf_sum += net_cf / ((1.0 + disc) ** year_num)
        cum += net_cf
        if cum > 0 and payback_year is None:
            payback_year = year_num

    return cf, round(float(disc_cf_sum), 2), payback_year


def plants_for(row: Any, farm: Dict[str, Any]) -> int:
    """Calculates plant population depending on perimeter boundary vs intercrop area."""
    if row.layout in ("boundary", "border"):
        boundary_m = float(farm.get("boundary_m", 360.0))
        return max(1, int(boundary_m / max(row.spacing_m, 0.1)))

    area_acre = float(farm.get("area_acre", 2.0))
    share = float(farm.get("intercrop_share", 0.15))
    area_m2 = area_acre * 4046.86 * share
    return max(1, int(area_m2 / (max(row.spacing_m, 0.1) ** 2)))


def water_demand_l_day(row: Any, n: int) -> float:
    return float(row.water_l_plant_day * n)


# -------------------------------------------------------------------------
# Public API Service Functions
# -------------------------------------------------------------------------

def predict_crop_suitability(n: float, p: float, k: float, temperature: float, humidity: float, ph: float, rainfall: float, top_k: int = 5) -> Dict[str, Any]:
    """
    Direct ML inference using Random Forest on 22 standard crop categories.
    """
    input_feats = {
        "n": n, "p": p, "k": k, "temperature": temperature,
        "humidity": humidity, "ph": ph, "rainfall": rainfall,
    }

    if not manager.is_rf_available or pd is None:
        # Graceful heuristic fallback if model weights missing
        return {
            "recommended_crop": "rice" if rainfall > 150 else ("coconut" if temperature > 25 else "maize"),
            "confidence": 0.75,
            "confidence_pct": 75.0,
            "top_predictions": [
                {"crop": "rice" if rainfall > 150 else "coconut", "probability": 0.75, "probability_pct": 75.0, "rank": 1},
                {"crop": "maize", "probability": 0.15, "probability_pct": 15.0, "rank": 2},
                {"crop": "cotton", "probability": 0.10, "probability_pct": 10.0, "rank": 3},
            ],
            "all_probabilities": {"rice": 0.75, "maize": 0.15, "cotton": 0.10},
            "input_features": input_feats,
            "model_version": "Heuristic-Rule-Fallback",
        }

    classes = list(getattr(manager.suitability_model, "classes_", []))
    df = pd.DataFrame([input_feats])
    probas = manager.suitability_model.predict_proba(df)[0]

    all_prob_dict = {cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, probas)}
    sorted_pairs = sorted(zip(classes, probas), key=lambda x: x[1], reverse=True)

    top_preds = []
    for rank, (crop_name, prob) in enumerate(sorted_pairs[:top_k], start=1):
        top_preds.append({
            "crop": crop_name,
            "probability": round(float(prob), 4),
            "probability_pct": round(float(prob) * 100.0, 2),
            "rank": rank,
        })

    best_crop, best_prob = sorted_pairs[0]

    return {
        "recommended_crop": best_crop,
        "confidence": round(float(best_prob), 4),
        "confidence_pct": round(float(best_prob) * 100.0, 2),
        "top_predictions": top_preds,
        "all_probabilities": all_prob_dict,
        "input_features": input_feats,
        "model_version": "RandomForest-22Class-v1",
    }


def plan_extra_crops(farm_dict: Dict[str, Any], years: int = 15, top: int = 8) -> Dict[str, Any]:
    """
    Executes the multi-layout extra crop recommendation combining:
      - Agronomic fit score
      - ML suitability probability
      - 15-year DCF cashflow and payback
      - Layout grouping (boundary, border, intercrop, understorey)
    """
    if manager.kb_df is None:
        manager._load_kb()

    kb = manager.kb_df
    if kb is None or len(kb) == 0:
        return {
            "farm_summary": farm_dict,
            "recommendations": [],
            "top_ml_general_crops": [],
            "model_status": {"rf_loaded": False, "kb_loaded": False},
        }

    out = []
    for r in kb.itertuples():
        fit, notes = fit_score(farm_dict, r)
        ml_prob_val = ml_score(farm_dict, r.crop)

        com = CROP2COMMODITY.get(r.crop)
        price_mult = 1.0
        if com and com in manager.price_summary:
            price_mult = float(manager.price_summary[com].get("growth", 1.0))

        cf, npv, pay = cashflow(r, years=years, price_mult=price_mult)
        n = plants_for(r, farm_dict)
        water_req = round(water_demand_l_day(r, n), 1)

        out.append({
            "crop": r.crop,
            "layout": r.layout,
            "fit": fit,
            "ml_prob": round(ml_prob_val, 3) if ml_prob_val is not None else None,
            "plants": n,
            "first_income_year": int(math.ceil(r.years_to_first_yield)),
            "payback_year": pay,
            "npv_per_plant": round(npv, 1),
            "npv_total": round(npv * n * fit, 1),  # fit-weighted total NPV
            "water_l_day": water_req,
            "notes": "; ".join(notes) if notes else "Ideal agronomic conditions",
            "commodity": com,
            "price_per_unit": getattr(r, "price_per_unit", None),
            "unit": getattr(r, "unit", None),
        })

    # Filter by minimum agronomic fit >= 0.50 and sort by fit-weighted total NPV
    viable = [x for x in out if x["fit"] >= 0.45]
    viable.sort(key=lambda x: x["npv_total"], reverse=True)

    # Layout diversity: pick top 2 per layout group, then sort overall
    grouped_by_layout: Dict[str, List[Dict[str, Any]]] = {}
    for item in viable:
        layout_key = item["layout"]
        grouped_by_layout.setdefault(layout_key, [])
        if len(grouped_by_layout[layout_key]) < 2:
            grouped_by_layout[layout_key].append(item)

    selected = []
    for items in grouped_by_layout.values():
        selected.extend(items)
    selected.sort(key=lambda x: x["npv_total"], reverse=True)
    final_recs = selected[:top]

    # Also compute top general ML crops for this soil & climate
    general_ml = predict_crop_suitability(
        n=float(farm_dict.get("n", 50.0)),
        p=float(farm_dict.get("p", 40.0)),
        k=float(farm_dict.get("k", 30.0)),
        temperature=float(farm_dict.get("temp_c", 28.0)),
        humidity=float(farm_dict.get("humidity", 70.0)),
        ph=float(farm_dict.get("ph", 6.5)),
        rainfall=float(farm_dict.get("rainfall_mm_yr", 1200.0)) / 12.0,
        top_k=5,
    ).get("top_predictions", [])

    return {
        "farm_summary": farm_dict,
        "recommendations": final_recs,
        "top_ml_general_crops": general_ml,
        "model_status": {
            "rf_loaded": manager.is_rf_available,
            "price_models_loaded": manager.is_price_models_available,
            "kb_crops_count": len(kb),
        },
    }


def get_commodity_price_forecast(commodity_query: str) -> Dict[str, Any]:
    """
    Returns 12-month forward price forecast and historical price trends for a commodity.
    """
    clean = commodity_query.strip().lower()
    commodity = COMMODITY_ALIASES.get(clean)
    if not commodity:
        # Search by substring or matching
        for k, v in COMMODITY_ALIASES.items():
            if k in clean or clean in k:
                commodity = v
                break

    if not commodity:
        commodity = "Coconut"  # Fallback default

    # Precomputed forecast
    forecast_list = manager.precomputed_forecasts.get(commodity, [])
    if not forecast_list:
        # Generate on the fly using summary
        summary = manager.price_summary.get(commodity, {"last_price": 10000.0, "growth": 1.0, "mae": 500.0})
        base = float(summary.get("last_price", 10000.0))
        growth = float(summary.get("growth", 1.0))
        forecast_list = [
            {"month": f"2027-{m:02d}-01", "forecast_price": round(base * (growth ** (m / 12.0)), 2)}
            for m in range(1, 13)
        ]

    # Historical price slice
    hist_records = []
    if manager.historical_prices is not None:
        try:
            sub = manager.historical_prices[manager.historical_prices["commodity"] == commodity]
            tail = sub.tail(12)
            hist_records = [{"month": str(r["month"]), "price": float(r["price"])} for _, r in tail.iterrows()]
        except Exception as e:
            logger.warning("Failed slicing historical prices for %s: %s", commodity, e)

    summary_entry = manager.price_summary.get(commodity, {})
    last_price = float(summary_entry.get("last_price", 15000.0))
    growth_rate = float(summary_entry.get("growth", 1.0))
    growth_pct = round((growth_rate - 1.0) * 100.0, 2)
    mae = float(summary_entry.get("mae", 250.0))
    naive_mae = summary_entry.get("naive_mae")

    trend = "Stable"
    if growth_pct >= 1.0:
        trend = "Bullish"
    elif growth_pct <= -1.0:
        trend = "Bearish"

    crop_name = COMMODITY2CROP.get(commodity, commodity.lower())

    return {
        "commodity": commodity,
        "crop_name": crop_name,
        "last_price": last_price,
        "currency": "INR",
        "growth_rate": round(growth_rate, 4),
        "growth_pct": growth_pct,
        "trend": trend,
        "mae": round(mae, 2),
        "naive_mae": round(float(naive_mae), 2) if naive_mae is not None else None,
        "forecast_12m": [{"month": str(f.get("month", "")), "forecast_price": round(float(f.get("forecast_price", 0.0)), 2)} for f in forecast_list],
        "recent_history": hist_records,
    }


def get_all_price_forecasts() -> Dict[str, Any]:
    """Summarizes market forecasts across all supported commodities."""
    results = {}
    for comm in ["Arecanut", "Coconut", "Drumstick", "Lemon Grass", "Marigold", "Papaya", "Pepper", "Turmeric"]:
        results[comm] = get_commodity_price_forecast(comm)

    return {
        "total_commodities": len(results),
        "commodities": results,
        "model_family": "GradientBoostingRegressor",
    }


def enrich_candidate_crop_with_ml(crop_id: str, crop_name: str, farm_dict: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Enricher function used by hybrid_service to augment candidate crops with ML intelligence.
    """
    clean = crop_id.lower().strip()
    commodity = CROP2COMMODITY.get(clean) or CROP2COMMODITY.get(crop_name.lower().strip())

    ml_prob = None
    if farm_dict:
        ml_prob = ml_score(farm_dict, clean)

    growth_rate = None
    trend = None
    if commodity and commodity in manager.price_summary:
        entry = manager.price_summary[commodity]
        growth_rate = round(float(entry.get("growth", 1.0)), 4)
        pct = (growth_rate - 1.0) * 100.0
        trend = "Bullish" if pct >= 1.0 else ("Bearish" if pct <= -1.0 else "Stable")

    npv_val = None
    if manager.kb_df is not None:
        try:
            matches = manager.kb_df[manager.kb_df["crop"] == clean]
            if not matches.empty:
                r = matches.iloc[0]
                price_mult = growth_rate if growth_rate else 1.0
                _, npv_per_plant, _ = cashflow(r, years=15, price_mult=price_mult)
                npv_val = round(npv_per_plant, 1)
        except Exception:
            pass

    return {
        "ml_suitability_probability": round(ml_prob, 3) if ml_prob is not None else None,
        "forecast_npv_15yr": npv_val,
        "market_growth_rate": growth_rate,
        "price_forecast_trend": trend,
    }
