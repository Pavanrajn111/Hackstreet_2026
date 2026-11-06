import React, { useEffect, useState } from 'react';
import { AlertCircle, BrainCircuit, CheckCircle2, Leaf, Loader2, Sprout } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { getActiveFarmId } from '../services/farmSelection';
import { createCropPlan } from '../services/cropPlannerService';

const fields = [
  { name: 'ph', label: 'Soil pH', unit: 'pH', min: 3, max: 10, step: 0.1, placeholder: '6.5' },
  { name: 'rainfall_mm_yr', label: 'Annual rainfall', unit: 'mm/year', min: 100, max: 6000, step: 1, placeholder: '1200' },
  { name: 'temp_c', label: 'Average temperature', unit: '°C', min: 5, max: 50, step: 0.1, placeholder: '28' },
  { name: 'humidity', label: 'Relative humidity', unit: '%', min: 10, max: 100, step: 0.1, placeholder: '70' },
  { name: 'n', label: 'Nitrogen', unit: 'soil value', min: 0, max: 300, step: 0.1, placeholder: '50' },
  { name: 'p', label: 'Phosphorus', unit: 'soil value', min: 0, max: 200, step: 0.1, placeholder: '40' },
  { name: 'k', label: 'Potassium', unit: 'soil value', min: 0, max: 250, step: 0.1, placeholder: '30' },
  { name: 'shade_level', label: 'Shade level', unit: '0 open · 1 dense shade', min: 0, max: 1, step: 0.01, placeholder: '0.3' },
  { name: 'boundary_m', label: 'Boundary length', unit: 'metres', min: 0.01, max: 50000, step: 0.1, placeholder: '360' },
  { name: 'area_acre', label: 'Farm area', unit: 'acres', min: 0.01, max: 10000, step: 0.01, placeholder: '2' },
  { name: 'intercrop_share', label: 'Intercrop share', unit: 'fraction 0–1', min: 0.0001, max: 1, step: 0.01, placeholder: '0.15' },
];

const initialForm = fields.reduce((values, field) => ({ ...values, [field.name]: '' }), {
  soil: '',
  years: '15',
  top: '8',
});

const formatNumber = (value, digits = 1) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : 'Unavailable'
);

const formatPercent = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'Unavailable'
);

export default function CropPlannerPage() {
  const [form, setForm] = useState(initialForm);
  const [activeFarm, setActiveFarm] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [farmError, setFarmError] = useState('');

  useEffect(() => {
    let active = true;
    const loadActiveFarm = async () => {
      try {
        const farms = await getFarms();
        const selectedId = getActiveFarmId();
        const selected = farms?.find((farm) => String(farm.id ?? farm.farm_name) === String(selectedId)) || farms?.[0];
        if (active) {
          setActiveFarm(selected || null);
          if (selected?.soil_type) {
            setForm((current) => ({ ...current, soil: current.soil || selected.soil_type }));
          }
        }
      } catch (loadError) {
        if (active) setFarmError(loadError?.message || 'Active farm details are unavailable.');
      }
    };
    loadActiveFarm();
    return () => { active = false; };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (isMockMode()) {
      setError('Intelligent crop planning requires Live API mode. Switch off Demo Mode to run the backend planner.');
      return;
    }

    const payload = {};
    for (const field of fields) {
      if (form[field.name] === '') continue;
      const value = Number(form[field.name]);
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        setError(`${field.label} must be between ${field.min} and ${field.max} ${field.unit}.`);
        return;
      }
      payload[field.name] = value;
    }
    if (form.soil.trim()) payload.soil = form.soil.trim();
    const years = Number(form.years);
    const top = Number(form.top);
    if (!Number.isInteger(years) || years < 1 || years > 40) {
      setError('Projection horizon must be a whole number between 1 and 40 years.');
      return;
    }
    if (!Number.isInteger(top) || top < 1 || top > 20) {
      setError('Recommendations must be a whole number between 1 and 20.');
      return;
    }
    payload.years = years;
    payload.top = top;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await createCropPlan(payload));
    } catch (requestError) {
      setError(requestError?.message || 'The crop planner could not complete the request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">CROP PLANNING / INTELLIGENCE</span>
          <h1>Plan beyond one crop.</h1>
          <p>Combine agronomic fit, crop layout, water demand and financial outputs from the live planner.</p>
        </div>
        <div className="hybrid-icon"><BrainCircuit size={21} /></div>
      </div>

      {farmError && <div className="history-notice"><AlertCircle size={16} />{farmError}</div>}
      {activeFarm && (
        <div className="history-notice">
          <Sprout size={16} />
          <span>Active farm: <strong>{activeFarm.farm_name || activeFarm.crop || 'Selected farm'}</strong>{activeFarm.soil_type ? ` · Soil: ${activeFarm.soil_type}` : ''}. Other planner values remain editable.</span>
        </div>
      )}

      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Leaf size={21} /></div>
          <div>
            <span className="workspace-eyebrow">PLANNER INPUTS</span>
            <h2>Farm conditions</h2>
            <p>Fields use the backend planner schema. Blank numeric fields use the backend defaults.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="hybrid-form">
          <div className="hybrid-form-grid">
            <label>
              Soil type
              <span>optional text</span>
              <input name="soil" value={form.soil} onChange={handleChange} placeholder="Red" />
            </label>
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}
                <span>{field.unit} · {field.min}–{field.max}</span>
                <input type="number" name={field.name} min={field.min} max={field.max} step={field.step} value={form[field.name]} onChange={handleChange} placeholder={field.placeholder} />
              </label>
            ))}
            <label>
              Projection horizon
              <span>years · 1–40</span>
              <input type="number" name="years" min="1" max="40" step="1" value={form.years} onChange={handleChange} />
            </label>
            <label>
              Recommendations
              <span>top · 1–20</span>
              <input type="number" name="top" min="1" max="20" step="1" value={form.top} onChange={handleChange} />
            </label>
          </div>
          <button type="submit" className="hybrid-submit auth-submit" disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Planning...</> : <><BrainCircuit size={16} /> Generate crop plan</>}
          </button>
        </form>
      </section>

      {error && <div className="history-notice"><AlertCircle size={16} />{error}</div>}
      {!result && !loading && !error && (
        <div className="empty-workspace hybrid-empty">
          <Sprout size={34} />
          <span className="workspace-eyebrow">READY WHEN YOU ARE</span>
          <h2>Start with your farm conditions.</h2>
          <p>The backend will return ranked crop opportunities, layout roles, plant counts, water demand and model status.</p>
        </div>
      )}
      {loading && <div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" /> Building your crop plan...</div>}

      {result && (
        <section className="hybrid-results">
          <div className="hybrid-result-summary">
            <div>
              <span className="workspace-eyebrow">LIVE PLANNER RESULT</span>
              <h2>{result.recommendations?.[0]?.crop || 'Plan returned'}</h2>
              <p>Recommendations are ordered by the backend planner’s selected output. No additional scores are calculated in the frontend.</p>
            </div>
            <div className="hybrid-result-stat">
              <span>RECOMMENDATIONS</span>
              <strong>{result.recommendations?.length ?? 0}</strong>
            </div>
          </div>

          <div className="hybrid-layout-stats">
            <div><span>Recommended crops</span><strong>{result.recommendations?.length ?? 0}</strong></div>
            <div><span>ML general crops</span><strong>{result.top_ml_general_crops?.length ?? 0}</strong></div>
            <div><span>Knowledge base</span><strong>{result.model_status?.kb_crops_count ?? 'Unavailable'}</strong></div>
            <div><span>RF model</span><strong>{result.model_status?.rf_loaded === true ? 'Loaded' : result.model_status?.rf_loaded === false ? 'Fallback' : 'Unavailable'}</strong></div>
          </div>

          {result.model_status && (
            <div className={`history-notice ${result.model_status.rf_loaded === false ? '' : 'hybrid-success-notice'}`}>
              {result.model_status.rf_loaded === false ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>
                {result.model_status.rf_loaded === false
                  ? 'The backend reports that the Random Forest model is not loaded; treat ML probabilities as unavailable or fallback output.'
                  : 'Model status reported by the backend.'}
                {result.model_status.price_models_loaded === false ? ' Price models are not loaded.' : ''}
              </span>
            </div>
          )}

          {result.recommendations?.length > 0 ? (
            <div className="hybrid-candidate-grid">
              {result.recommendations.map((recommendation) => (
                <article className="hybrid-candidate" key={`${recommendation.crop}-${recommendation.layout}`}>
                  <span className="hybrid-rank">{recommendation.layout || 'LAYOUT UNAVAILABLE'}</span>
                  <h3>{recommendation.crop || 'Crop unavailable'}</h3>
                  <p>{recommendation.notes || 'No backend notes returned.'}</p>
                  <div className="hybrid-detail-grid">
                    <p><span>Fit</span><strong>{formatPercent(recommendation.fit)}</strong></p>
                    <p><span>ML probability</span><strong>{formatPercent(recommendation.ml_prob)}</strong></p>
                    <p><span>Plants</span><strong>{recommendation.plants ?? 'Unavailable'}</strong></p>
                    <p><span>First income year</span><strong>{recommendation.first_income_year ?? 'Unavailable'}</strong></p>
                    <p><span>Payback year</span><strong>{recommendation.payback_year ?? 'Unavailable'}</strong></p>
                    <p><span>NPV per plant</span><strong>{formatNumber(recommendation.npv_per_plant)}</strong></p>
                    <p><span>Total NPV</span><strong>{formatNumber(recommendation.npv_total)}</strong></p>
                    <p><span>Water demand</span><strong>{formatNumber(recommendation.water_l_day)} L/day</strong></p>
                    {recommendation.commodity && <p><span>Commodity</span><strong>{recommendation.commodity}</strong></p>}
                    {recommendation.price_per_unit !== null && recommendation.price_per_unit !== undefined && <p><span>Price per unit</span><strong>{formatNumber(recommendation.price_per_unit)} {recommendation.unit || ''}</strong></p>}
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="hybrid-empty-result">No planner recommendations were returned for these conditions.</div>}

          {result.top_ml_general_crops?.length > 0 && (
            <div className="hybrid-stages">
              <span className="workspace-eyebrow">GENERAL ML RANKING</span>
              <h3>Top model crops</h3>
              {result.top_ml_general_crops.map((crop) => (
                <div className="hybrid-stage" key={`${crop.rank}-${crop.crop}`}>
                  <span className="hybrid-stage-number">{crop.rank}</span>
                  <div><h4>{crop.crop || 'Crop unavailable'}</h4><p>Probability: {formatPercent(crop.probability)} · {formatNumber(crop.probability_pct, 2)}%</p></div>
                </div>
              ))}
            </div>
          )}

          <div className="hybrid-detail-grid">
            <p><span>Farm summary</span><strong>{Object.entries(result.farm_summary || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Unavailable'}</strong></p>
          </div>
        </section>
      )}
    </div>
  );
}
