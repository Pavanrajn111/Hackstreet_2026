# AGR002 / Hackstreet — Repository Audit, Fixes, and Verification Report

This document records the complete inspection, diagnosis, fixes, test additions, and verification across the AGR002 Smart Irrigation and Hybrid Farming Platform codebase.

---

## 1. Summary of Changes by Task Group

### Task 1: Model Loading, Interface, and Dependencies
- **Files Modified/Created:**
  - `backend/app/services/ml_bridge.py` *(created)*: Centralized bridge connecting FastAPI backend to the `ml/` subsystem. Resolves directory paths relative to `__file__` (independent of CWD), respects `settings.ML_MODEL_ENABLED` to avoid loading when disabled, manages a singleton `MLModelManager`, and exposes `get_ml_status()` and `predict_irrigation_adjustment()`.
  - `backend/app/core/config.py`: Added `ML_MODEL_DIR: str = "../ml/models"` while preserving `ML_MODEL_PATH` for backwards compatibility.
  - `backend/requirements.txt`: Aligned dependency constraints (`scikit-learn>=1.6.0,<=1.6.1`, `pandas>=2.0.0,<3.0.0`, `numpy>=1.24.0,<2.3.0`, `joblib>=1.3.0`).
  - `ml/requirements.txt`: Aligned runtime dependencies with backend (`numpy>=1.24.0,<2.3.0`, `pandas>=2.0.0,<3.0.0`, `scikit-learn==1.6.1`, `joblib>=1.3.0`, `xgboost>=1.7.6,<3.0.0`).
  - `ml/model_interface.py`: Replaced aggressive missing model warning logs with a single INFO-level missing artifact summary. Optimized `_predict_with_booster` to prioritize standard `.predict_proba()` and `.predict()` methods before falling back to raw Booster DMatrix. Created `_LazyManagerProxy` so importing `ml.model_interface` does not prematurely trigger eager loading.
  - `backend/app/api/routes/recommend.py`: Replaced fragile `sys.path.append("../../../../ml")` hack with clean import from `app.services.ml_bridge`.
  - `backend/app/services/water_resilience_service.py`: Replaced direct `from ml.model_interface import ...` with `app.services.ml_bridge`.
  - `backend/app/api/api_v1.py` & `backend/app/main.py`: Exposed `GET /api/ml/status` and `GET /api/v1/ml/status`, and included `ml` status block in `/health`, `/api/health`, and `/api/v1/health`.
  - `backend/tests/test_ml_integration.py` *(created)*: Added test coverage for `test_ml_status_endpoint`, `test_health_endpoints_include_ml`, `test_ml_disabled_clean_fallback`, `test_ml_enabled_without_artifacts`, and `test_ml_bridge_import_safety`.

### Task 2: Irrigation Feature Pipeline and Risk Calibration
- **Files Modified/Created:**
  - `ml/model_interface.py`: Fixed the ET0 day offset bug (previously line 364 used `(date.today().month - 1 + day_index) % 12` which incremented months instead of days). Updated to compute `forecast_date = date.today() + timedelta(days=day_index)` and calculate sine/cosine month angles from the actual forecast date. Added support for per-day real weather via `features["daily_weather"]`.
  - `backend/app/services/weather_service.py`: Updated `_parse_open_meteo_response` to extract `wind_speed_10m_max` (converted from km/h to m/s) and `shortwave_radiation_sum` (MJ/m²), passing real solar and wind into forecast items and offline baseline.
  - `backend/app/schemas/recommendation.py`: Added `wind_m_s: Optional[float] = None` and `solar_mj_m2: Optional[float] = None` to `WeatherDayItem`.
  - `backend/app/services/irrigation_engine.py`: Passed `wind_m_s` and `solar_mj_m2` when constructing `WeatherDayItem` in the 7-day weather forecast.
  - `backend/app/services/ml_bridge.py`: Added shared feature extraction helper `build_irrigation_features(payload, recommendation)` with categorical normalizers (`normalise_crop_name`, `normalise_soil_name`, `normalise_stage_name`), unit conversion, and 7-day daily weather packaging.
  - `backend/app/api/routes/recommend.py`: Replaced local `_build_ml_features` with `build_irrigation_features` from `ml_bridge`.
  - `backend/app/services/water_resilience_service.py`: Updated `_fetch_ml_signals` to use `build_irrigation_features(rec_req, engine_rec)` and eliminated fabricated fallback risk numbers (`0.35` / `0.05`), returning `None` (JSON `null`) for `under_irrigation_risk` and `over_irrigation_risk` when ML is disabled or in fallback mode.
  - `backend/tests/test_ml_integration.py`: Added tests `test_et0_day_offsets`, `test_weather_feature_mapping`, and `test_ml_fallback_risk_values`.

### Task 3: Crop Planner and Price Model Alignment
- **Files Modified/Created:**
  - `backend/app/services/crop_planner_service.py`:
    - Defined shared constant `MIN_VIABILITY_FIT: float = 0.5`.
    - Added shared rainfall scaling helper `scale_rainfall_for_ml(rainfall_input: float)` to convert annual rainfall (> 300 mm/year) to monthly equivalents across all functions (`ml_score`, `predict_crop_suitability`, `plan_extra_crops`).
    - Aligned viability threshold in `plan_extra_crops` from `0.45` to `MIN_VIABILITY_FIT` (0.50), matching `planner_functions.py`.
    - Enriched price forecast functions to expose `beats_naive`, `confidence`, and `data_source: "synthetic"`.
  - `ml/crop_planner/price_summary.json`: Added `beats_naive` (`false` for Arecanut and Coconut due to MAE > naive baseline, `true` for others) and `confidence` (`low` vs `high`).
  - `backend/app/schemas/crop_planner.py`: Added `beats_naive: Optional[bool]`, `confidence: Optional[str]`, and `data_source: str = "synthetic"` to `CommodityPriceForecastResponse` and `AllPriceForecastsResponse`.
  - `frontend/src/pages/MarketIntelligencePage.jsx`: Added rendering of `detail.data_source` and `detail.confidence` (including high MAE note when `beats_naive === false`).
  - `backend/tests/test_crop_planner.py`: Added tests `test_rainfall_scaling_consistency`, `test_price_summary_beats_naive`, and `test_viability_threshold_constant`.

### Task 4: Database Safety, Migrations, and Backup Scripts
- **Files Modified/Created:**
  - `backend/app/core/database.py`:
    - Implemented `resolve_database_url` so relative SQLite URLs (e.g. `sqlite:///./irrigation.db`) are always resolved relative to the `backend/` directory regardless of CWD.
    - Added SQLAlchemy engine listener for `PRAGMA journal_mode=WAL;`, `PRAGMA busy_timeout=5000;`, and `PRAGMA foreign_keys=ON;`.
    - Implemented `run_lightweight_migrations(engine, Base)` to verify tables and automatically add missing columns via `ALTER TABLE ... ADD COLUMN` without data loss.
    - Added `check_db_health()` running `SELECT 1` and `get_last_backup_info()` for health reporting.
  - `backend/app/main.py` & `backend/app/api/api_v1.py`:
    - Replaced raw `create_all` with `run_lightweight_migrations(engine, Base)`.
    - Updated `/health`, `/api/health`, and `/api/v1/health` to return 503 Service Unavailable if the database connectivity check fails, including backup metadata and error details.
  - `backend/scripts/backup_db.py` *(created)*: Standalone CLI and module utility using SQLite's online backup API (`src.backup(dest)`), `PRAGMA integrity_check`, and automatic rotation keeping the latest N backups.
  - `backend/scripts/restore_db.py` *(created)*: Standalone CLI and module utility verifying backup integrity prior to restore, creating an automatic pre-restore safety snapshot of the live database, restoring via SQLite backup API, and re-verifying restored database integrity.
  - `docs/DEPLOYMENT.md`: Documented database configuration, WAL mode, backup execution, and safe restore procedures.
  - `backend/tests/test_database_ops.py` *(created)*: Added tests `test_database_wal_mode`, `test_database_health_check_success`, `test_database_health_check_failure`, and `test_backup_and_restore_cycle`.

### Task 5: Weather Service Robustness and Cache Management
- **Files Modified/Created:**
  - `backend/app/services/weather_service.py`:
    - Implemented lazy cache directory creation with graceful memory-only fallback if the filesystem is read-only.
    - Added `threading.Lock()` (`_CACHE_LOCK`) and atomic file replacement (`tempfile.NamedTemporaryFile` + `os.replace`) to prevent file corruption during concurrent requests.
    - Added automatic corrupt cache recovery via quarantine (`.corrupt.<timestamp>`).
    - Implemented LRU/timestamp-based cache eviction keeping at most `MAX_CACHE_ENTRIES = 100`.
    - Added `source` and `stale` metadata to all weather returns (`open-meteo`, `open-meteo-cache`, `open-meteo-stale-cache`, `offline-baseline`).
  - `backend/tests/test_weather_cache.py` *(created)*: Added tests `test_weather_cache_atomic_write_and_eviction`, `test_weather_cache_corruption_recovery`, and `test_weather_metadata_flags`.

### Task 6: Frontend Offline Resilience and Service Worker Sync
- **Files Modified/Created:**
  - `frontend/public/sw.js`: Updated service worker with safe stale-while-revalidate caching for static catalogs (`/api/crops`, `/api/soils`, `/api/v1/crops`, `/api/v1/soils`) and recommendations (`/recommend`), while strictly bypassing and never caching mutating requests (POST, PUT, DELETE).
  - `frontend/src/services/farmService.js`: Added offline mutation queue helpers (`getOfflineQueue`, `enqueueOfflineFarmMutation`, `replayOfflineFarmQueue`, `clearOfflineQueue`).
  - `frontend/src/pages/MyFarmsPage.jsx`:
    - Enqueued offline mutations on network failure for farm creation, edit, and deletion.
    - Added `window.addEventListener('online')` to automatically replay offline farm mutations upon reconnection and refresh the active field list.
    - Added `isPendingSync` detection and rendered `<span className="pending-sync-badge">Pending Sync</span>` on queued farms.
  - `frontend/src/index.css`: Added styles for `.pending-sync-badge`.

### Task 7: Automation Script Portability, UTC Timestamps, and Regression Suite
- **Files Modified/Created:**
  - `aquagrow.ps1`: Replaced hardcoded path `C:\Users\Admin\Documents\Lakshya` with dynamic `$PSScriptRoot` resolution, making the startup script 100% portable on any machine.
  - `backend/app/api/routes/recommend.py`: Replaced deprecated `datetime.utcnow()` with `datetime.now(timezone.utc)`.
  - `backend/app/models/farm.py`: Replaced deprecated `default=datetime.utcnow` with `default=lambda: datetime.now(timezone.utc)`.
  - `backend/app/models/community_water.py`: Replaced `datetime.utcnow` with `lambda: datetime.now(timezone.utc)`.
  - `backend/app/services/community_water_service.py`: Replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` and implemented `_is_available_now` to handle offset-naive vs offset-aware SQLite datetime comparisons safely.
  - `backend/app/services/weather_service.py`: Updated cache timestamp to `datetime.now(timezone.utc).isoformat()`.
  - `backend/tests/test_adaptive_and_community.py`: Updated tests to use `datetime.now(timezone.utc)`.

### Task 8: Frontend Dashboard, Navigation, Arrival Animations, and Judge Pitch Flow
- **Files Modified/Created:**
  - `frontend/src/index.css`: Added keyframe arrival animations (`cardArrive`, `radarPing`, `ringBreath`), smooth cubic-bezier stagger delays (`.stagger-1` through `.stagger-5`), glowing indicator rings (`.pulse-glow-emerald`, `.pulse-glow-sky`), micro-interaction card elevation (`.hover-elevate`), and telemetry radar indicator (`.radar-dot`).
  - `frontend/src/components/AppShell.jsx`: Redesigned header bar with streamlined navigation hierarchy (Overview, Smart Hydrology, 3D Hybrid Farming, ML Market, Community Water, and More Tools), integrated an Active Farm Switcher dropdown pill with instantaneous farm switching, and added live FAO-56 telemetry status indicator.
  - `frontend/src/pages/DashboardPage.jsx`: Added collapsible "AGR002 Judge Pitch Walkthrough" bar providing 4 quick interactive demo steps for judges (1. Live Telemetry, 2. Agronomic Decision, 3. 7-Day Hydrology, 4. 3D Intercropping Plan); added staggered card entrance animations; enhanced primary decision hero card with a glowing status badge, quantitative prescription formula, and clarified technical headings.
  - `frontend/src/components/FarmLayout3D.jsx` & `frontend/src/pages/HybridRecommendationsPage.jsx`: Added 3D camera quick-presets (`Isometric 3D`, `Top-Down Plan`, `Canopy Eye-Level`) with instant camera position snapping for multi-layer vertical canopy demonstration.
  - `frontend/src/components/IrrigationSchedule.jsx`: Resolved empty/flatline weekly irrigation plan graph by rendering daily crop demand liters and dynamic Y-axis domain scaling when scheduled pulse volume is zero.
  - `frontend/package.json`: Fixed build script from restricted memory `--max-semi-space-size=16` to standard `vite build`.

---

## 2. Missing Trained Irrigation Bundle Report

A thorough inspection of `ml/models` confirmed the following findings:

1. **Target Directory:**
   `ml/models` (or `ml/models/models/`)
2. **Features Manifest:**
   `ml/models/models/features.json` is present and contains the 17 expected feature names.
3. **Missing Artifacts (11 `.joblib` files):**
   - `irrigation_classifier.joblib` — XGBoost / Scikit-learn binary classifier for irrigation necessity
   - `irrigation_amount.joblib` — XGBoost / Scikit-learn regressor for recommended irrigation depth (mm)
   - `over_irrigation.joblib` — Classifier for over-irrigation risk
   - `under_irrigation.joblib` — Classifier for under-irrigation / crop stress risk
   - `et0_day_1.joblib` through `et0_day_7.joblib` (7 models) — 7-day forward reference evapotranspiration regressors
4. **Required Runtime Dependencies:**
   - `python >= 3.10`
   - `scikit-learn == 1.6.1`
   - `numpy >= 1.24.0, < 2.3.0`
   - `pandas >= 2.0.0, < 3.0.0`
   - `joblib >= 1.3.0`
   - `xgboost >= 1.7.6, < 3.0.0`
5. **Detection Verification:**
   - `GET /api/ml/status` dynamically checks `ml/models/` and accurately reports `loaded: false` and lists all 11 missing files in `models_missing`.
   - Logging reports missing files once at `INFO` level without warning spam.
6. **Deterministic Fallback Behavior:**
   - The FAO-56 Penman-Monteith single-coefficient agronomic calculation operates as the complete source of truth.
   - When ML models are absent or disabled (`ML_MODEL_ENABLED: false`), the recommendation endpoints safely return `ml_adjustment_used: false` with deterministic water balance and schedule calculations.
   - Fallback responses set `over_irrigation_risk: null` and `under_irrigation_risk: null`, preventing fake risk numbers.

---

### Task 8: Analytics Charts, 3D Camera Controls, and GPS Location Service
- **Files Modified/Created:**
  - `frontend/src/services/locationService.js` *(created)*: Device geolocation wrapper with Nominatim reverse-geocoding, offline district fallbacks, localStorage caching, and cross-component event subscription.
  - `frontend/src/components/AnalyticsCharts.jsx`: Dynamic FAO-56 soil moisture trend binding, dynamic `currentMoisture` header status, dynamic threshold ReferenceLine, and dynamic Water Saved / Energy Saved tabs.
  - `frontend/src/components/FarmLayout3D.jsx`: Multi-camera angle support (`isometric`, `topdown`, `canopy`).
  - `frontend/src/pages/HybridRecommendationsPage.jsx`: Interactive camera preset buttons with active indicator.
  - `frontend/src/pages/MyFarmsPage.jsx` & `frontend/src/pages/CommunityWaterPage.jsx`: Direct "Detect My Field GPS" integration.
  - `backend/app/services/irrigation_engine.py`: Dynamic FAO-56 moisture back-calculation using actual historical weather ETc and rainfall.

### Task 9: Final UI Architecture, Navigation Restructuring & Judge Demo Experience
- **Files Modified:**
  - `frontend/src/components/AppShell.jsx`:
    - Reorganized primary navigation into five clear destinations: `Live Dashboard` (`/app`), `Irrigation Schedule` (`/app/schedule`), `3D Farm Twin` (`/app/intelligence/hybrid`), `Yield & Market AI` (`/app/intelligence/market`), and `Community Water` (`/app/community-water`).
    - Grouped secondary capabilities under categorized **Extended Tools** dropdown:
      - *Crop Intelligence*: `Zonal Field Planner` (`/app/intelligence/crop-planner`), `Crop Suitability AI` (`/app/intelligence/crop-suitability`).
      - *Water Intelligence*: `Dynamic Stress Regulator` (`/app/intelligence/adaptive-irrigation`), `Water Resilience Matrix` (`/app/intelligence/water-resilience`).
      - *Records & Monitoring*: `Water Audit & History` (`/app/history`), `Farm Registry & Records` (`/app/farms`).
    - Combined farm switcher and GPS detector into unified **Active Field & GPS** compact header control, eliminating overflow on laptop screens.
  - `frontend/src/pages/LandingPage.jsx`:
    - Added **Interactive Farm Water & Cost Savings Simulator** with acreage slider (1–25 acres), crop selector (Tomato, Maize, Sugarcane, Cotton), transparent baseline vs. smart FAO-56 calculation, and **Test With Your Field →** CTA transferring state into `/app`.
    - Added floating live telemetry badges to Hero section (`FAO-56 ET₀ Engine`, `Dual-Kc Root Zone Physics`, `GPS Weather Lock`).
    - Added interactive **Five Unified Agronomic Pillars** tabbed feature showcase with live mock previews and direct links.
    - Added viewport-triggered animated impact counters with honest technical capability statements.
  - `frontend/src/pages/DashboardPage.jsx`:
    - Updated top judge walkthrough banner to the 5 primary pillars with clear, concise descriptions.
    - Added confirmation workflow and visual feedback (`Locked`, `Failed`, `Loading`) for GPS field location updates.
  - `frontend/src/index.css`:
    - Added reusable animation keyframes: `floatSubtle`, `counterGlow`, `gradientShimmer`, `tab-pane-transition`, and strict `prefers-reduced-motion` compliance.
  - `frontend/package.json`:
    - Tuned build script to `--max-old-space-size=768 --max-semi-space-size=16` to guarantee clean production builds on low-RAM systems.

---

## 3. Test and Build Verification Results (Final)

### Backend Test Suite
```bash
backend\.venv\Scripts\python.exe -m pytest backend/tests -q
```
**Result:**
- **73 passed**, 1 harmless starlette deprecation warning in **11.29s**.
- Zero test failures, zero regressions across all test modules.

### Frontend Production Build
```bash
npm --prefix frontend run build
```
**Result:**
- Vite v5.4.21 production build completed in **21.77s**.
- **2847 modules transformed**, zero build errors.
- Output artifacts generated cleanly in `frontend/dist/`.
