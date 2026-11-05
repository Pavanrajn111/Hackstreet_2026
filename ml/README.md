# AGR002 Smart Irrigation — Machine Learning (ML) Subsystem

The ML module provides optional irrigation guidance and ET0 forecasts. The FAO-56
water-balance engine remains the deterministic baseline and continues to serve
recommendations when the model bundle is missing or inference fails.

## Model bundle

The trained bundle contains irrigation classifier, amount, over-irrigation and
under-irrigation models, plus seven ET0 forecast models. Put the extracted model
files and `features.json` in `ml/models/` or `ml/models/models/`. The interface
recognizes either layout. Model weights are intentionally excluded from Git;
provide the bundle separately in environments that enable ML inference.

## Irrigation model input contract

The trained pipelines expect these fields, in this order:

| Feature | Type / unit |
| --- | --- |
| `crop` | Categorical crop label |
| `soil` | Categorical soil label |
| `stage` | `initial`, `middle`, or `late` |
| `kc` | Crop coefficient |
| `depletion_mm` | Root-zone water depletion, mm |
| `taw_mm` | Total available water, mm |
| `days_since_irrigation` | Days |
| `et0` | Reference evapotranspiration, mm/day |
| `tmax`, `tmin`, `tmean` | Temperature, °C |
| `rainfall` | Precipitation, mm |
| `humidity` | Relative humidity, percent |
| `wind` | Wind speed, m/s |
| `solar` | Solar radiation, MJ/m²/day |
| `latitude`, `longitude` | Decimal degrees |

Categorical values must remain strings so the serialized sklearn pipelines can
apply the training-time one-hot encoding.

## Inference output

`predict_irrigation_adjustment()` returns `ml_adjustment_used`, `irrigate_now`,
`irrigation_probability`, `irrigation_amount_mm`, over- and under-irrigation
risks, a risk category, and up to seven `et0_forecast_mm` values. If the bundle
is absent or unusable, it returns `ml_adjustment_used: false`; the backend keeps
the FAO-56 recommendation.

## Dependencies

Install the runtime dependencies from the repository root:

```powershell
pip install -r ml/requirements.txt
```
