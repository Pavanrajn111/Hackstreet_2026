# AGR002 Smart Irrigation — Machine Learning (ML) Subsystem

Welcome to the Machine Learning module for the **Smart Irrigation & Water Management** project.

> [!IMPORTANT]
> **No Pre-Trained Model is Included in MVP Foundation**
> Currently, the system uses a deterministic baseline (FAO-56 Penman-Monteith water-balance engine). The ML module is designed to provide fine-tuned adjustment coefficients or predictive soil moisture forecasts without breaking the system when a trained model is not present.
> Do **NOT** commit large weights files (`.pkl`, `.joblib`, `.pt`, `.onnx`) directly to GitHub. See `.gitignore`.

---

## 1. Role of the ML Teammate

As the ML engineer, your objective is to:
1. Train a model (e.g., Random Forest, XGBoost, or LightGBM) on regional agro-meteorological data (e.g., IMD, ERA5-Land, or simulated field trials).
2. Predict either:
   - **Target A:** Predicted Daily Crop Water Depletion ($ET_c$) in $mm$.
   - **Target B:** Soil Moisture Stress Factor ($K_s$) between $0.0$ (wilting point) and $1.0$ (field capacity).
3. Export the trained model and integrate it via `ml/model_interface.py`.

---

## 2. Model File & Loading Protocol

- **Target Directory:** Place serialized models in `ml/models/` (e.g., `ml/models/irrigation_model.joblib`).
- **Loading Pattern:** Ensure your loading logic handles missing files gracefully and falls back to deterministic rule-based output without throwing unhandled exceptions.
- **Example loading snippet:**
  ```python
  import joblib
  import os

  MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "irrigation_model.joblib")

  def load_model():
      if os.path.exists(MODEL_PATH):
          return joblib.load(MODEL_PATH)
      return None
  ```

---

## 3. Required Input Features & Units

Your model should accept the following standardized features:

| Feature Name | Data Type | Unit / Format | Description |
| :--- | :--- | :--- | :--- |
| `days_after_sowing` | `int` | Days | Number of days since crop sowing date |
| `temp_max` | `float` | °C | Maximum ambient temperature for the day |
| `temp_min` | `float` | °C | Minimum ambient temperature for the day |
| `humidity_pct` | `float` | % | Relative humidity percentage (0 - 100) |
| `rainfall_mm` | `float` | mm | Expected or observed rainfall depth |
| `soil_field_capacity` | `float` | % by vol | Soil water holding capacity |
| `soil_wilting_point` | `float` | % by vol | Permanent wilting point fraction |
| `crop_kc_baseline` | `float` | Dimensionless | Standard FAO-56 crop coefficient |
| `irrigation_efficiency`| `float` | Fraction (0.0 - 1.0)| Efficiency rating (e.g., 0.90 for drip, 0.65 for flood) |
| `last_irrigation_days_ago`| `int` | Days | Elapsed days since the last irrigation event |

---

## 4. Expected Output Format & Units

Your prediction function must return a standardized dictionary matching this schema:

```python
{
    "ml_adjustment_used": bool,           # Set to True when an actual model prediction was computed
    "predicted_depletion_mm": float,     # Estimated soil moisture depletion in mm (e.g. 18.2)
    "adjusted_irrigation_depth_mm": float,# Recommended water depth in mm
    "confidence_score": float,           # Confidence score between 0.0 and 1.0 (e.g. 0.88)
    "feature_importances": dict          # Key driving factors for farmer explainability
}
```

---

## 5. Example Input / Output

### Example Input
```json
{
  "days_after_sowing": 21,
  "temp_max": 29.5,
  "temp_min": 19.0,
  "humidity_pct": 58.0,
  "rainfall_mm": 0.0,
  "soil_field_capacity": 28.0,
  "soil_wilting_point": 12.0,
  "crop_kc_baseline": 0.85,
  "irrigation_efficiency": 0.90,
  "last_irrigation_days_ago": 3
}
```

### Example Output
```json
{
  "ml_adjustment_used": true,
  "predicted_depletion_mm": 18.4,
  "adjusted_irrigation_depth_mm": 18.5,
  "confidence_score": 0.91,
  "feature_importances": {
    "days_after_sowing": 0.35,
    "temp_max": 0.28,
    "last_irrigation_days_ago": 0.22,
    "humidity_pct": 0.15
  }
}
```

---

## 6. Dependencies & Installation

Dependencies for ML experimentation are isolated in `ml/requirements.txt`.
To set up your ML environment:
```powershell
python -m venv ml_env
.\ml_env\Scripts\Activate.ps1
pip install -r ml/requirements.txt
```
