import React, { useEffect, useState } from 'react';
import { AlertCircle, BrainCircuit, CheckCircle2, Leaf, Loader2, Sprout } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { getActiveFarmId } from '../services/farmSelection';
import { predictCropSuitability } from '../services/cropPlannerService';

const fields = [
  { name: 'n', label: 'Nitrogen', unit: 'kg/ha or index', min: 0, max: 300, step: 0.1 },
  { name: 'p', label: 'Phosphorus', unit: 'kg/ha or index', min: 0, max: 200, step: 0.1 },
  { name: 'k', label: 'Potassium', unit: 'kg/ha or index', min: 0, max: 250, step: 0.1 },
  { name: 'temperature', label: 'Average temperature', unit: '°C', min: -10, max: 60, step: 0.1 },
  { name: 'humidity', label: 'Relative humidity', unit: '%', min: 0, max: 100, step: 0.1 },
  { name: 'ph', label: 'Soil pH', unit: 'pH', min: 2, max: 12, step: 0.1 },
  { name: 'rainfall', label: 'Rainfall', unit: 'mm', min: 0, max: 5000, step: 0.1 },
];

const initialForm = fields.reduce((values, field) => ({ ...values, [field.name]: '' }), { top_k: '5' });

const displayValue = (value, suffix = '') => (
  value === null || value === undefined || value === '' ? 'Unavailable' : `${value}${suffix}`
);

export default function CropSuitabilityPage() {
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
        if (active) setActiveFarm(selected || null);
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
      setError('Crop suitability prediction requires Live API mode. Switch off Demo Mode to run the backend ML model.');
      return;
    }

    const payload = { top_k: Number(form.top_k) };
    for (const field of fields) {
      if (form[field.name] === '') continue;
      const value = Number(form[field.name]);
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        setError(`${field.label} must be between ${field.min} and ${field.max} ${field.unit}.`);
        return;
      }
      payload[field.name] = value;
    }

    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await predictCropSuitability(payload));
    } catch (requestError) {
      setError(requestError?.message || 'The crop suitability model could not complete the prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">CROP PLANNING / ML</span>
          <h1>Find the crop that fits.</h1>
          <p>Use measured soil and climate values to request a live suitability prediction.</p>
        </div>
        <div className="hybrid-icon"><BrainCircuit size={21} /></div>
      </div>

      {farmError && <div className="history-notice"><AlertCircle size={16} />{farmError}</div>}
      {activeFarm && (
        <div className="history-notice">
          <Sprout size={16} />
          <span>Active farm: <strong>{activeFarm.farm_name || activeFarm.crop || 'Selected farm'}</strong>. No suitability inputs were prefilled because this farm record does not contain model measurements.</span>
        </div>
      )}

      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Leaf size={21} /></div>
          <div>
            <span className="workspace-eyebrow">MODEL INPUTS</span>
            <h2>Measured conditions</h2>
            <p>Every field is optional in the backend schema. Leave a field blank to use the backend model default.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="hybrid-form">
          <div className="hybrid-form-grid">
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}
                <span>{field.unit} · {field.min}–{field.max}</span>
                <input
                  type="number"
                  name={field.name}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </label>
            ))}
            <label>
              Ranked crops
              <span>top_k · 1–22</span>
              <select name="top_k" value={form.top_k} onChange={handleChange}>
                {Array.from({ length: 22 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} crops</option>)}
              </select>
            </label>
          </div>
          <button type="submit" className="hybrid-submit auth-submit" disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Predicting...</> : <><BrainCircuit size={16} /> Generate prediction</>}
          </button>
        </form>
      </section>

      {error && <div className="history-notice"><AlertCircle size={16} />{error}</div>}

      {!result && !loading && !error && (
        <div className="empty-workspace hybrid-empty">
          <Sprout size={34} />
          <span className="workspace-eyebrow">READY WHEN YOU ARE</span>
          <h2>Start with measured field conditions.</h2>
          <p>The live backend will return the predicted crop, confidence, ranked alternatives, and model metadata.</p>
        </div>
      )}

      {loading && <div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" /> Running Random Forest inference...</div>}

      {result && (
        <section className="hybrid-results">
          <div className="hybrid-result-summary">
            <div>
              <span className="workspace-eyebrow">LIVE ML RESULT</span>
              <h2>{result.recommended_crop || 'Prediction unavailable'}</h2>
              <p>Backend-reported recommended crop. Confidence is shown separately from each ranking probability.</p>
            </div>
            <div className="hybrid-result-stat">
              <span>CONFIDENCE</span>
              <strong>{displayValue(result.confidence_pct, '%')}</strong>
            </div>
          </div>

          <div className="hybrid-metric-grid">
            <article><span>Recommended crop</span><strong>{result.recommended_crop || 'Unavailable'}</strong></article>
            <article><span>Confidence</span><strong>{displayValue(result.confidence)}</strong></article>
            <article><span>Model version</span><strong>{result.model_version || 'Unavailable'}</strong></article>
          </div>

          <div className="hybrid-product-grid">
            {(result.top_predictions || []).map((prediction) => (
              <article className={`hybrid-product-card ${prediction.rank === 1 ? 'is-highlighted' : ''}`} key={`${prediction.rank}-${prediction.crop}`}>
                <div className="hybrid-product-card-heading">
                  <span className="workspace-eyebrow">RANK {prediction.rank}</span>
                  {prediction.rank === 1 && <CheckCircle2 size={17} />}
                </div>
                <h3>{prediction.crop || 'Unavailable'}</h3>
                <p>Probability: {displayValue(prediction.probability_pct, '%')}</p>
              </article>
            ))}
          </div>

          <div className="hybrid-detail-grid">
            <p><span>Model inputs</span><strong>{Object.entries(result.input_features || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Unavailable'}</strong></p>
            <p><span>Returned probabilities</span><strong>{Object.keys(result.all_probabilities || {}).length || 0} crops</strong></p>
          </div>
          {Object.keys(result.all_probabilities || {}).length > 0 && (
            <details className="hybrid-stages">
              <summary>View all returned crop probabilities</summary>
              <div className="hybrid-detail-grid">
                {Object.entries(result.all_probabilities).map(([crop, probability]) => (
                  <p key={crop}><span>{crop}</span><strong>{displayValue(probability)}</strong></p>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
