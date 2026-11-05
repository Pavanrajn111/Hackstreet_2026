import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, FlaskConical, Leaf, RefreshCw, Sprout, Waves } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { listFarms } from '../services/farmService';
import { recommendHybridCrops } from '../services/hybridService';
import { getActiveFarmId } from '../services/farmSelection';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const EMPTY_FORM = {
  main_crop_age_years: 8,
  water_availability: 'Adequate',
  available_sunlight: 'Partial Shade',
};

const displayValue = (value, suffix = '') => (
  value === null || value === undefined || value === '' ? 'Unavailable' : `${value}${suffix}`
);

function CandidateCard({ candidate, ranked }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={`hybrid-candidate ${ranked ? 'is-ranked' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {ranked && <span className="hybrid-rank">BEST MATCH</span>}
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{candidate.compatibility_tier}</span>
          </div>
          <h3 className="text-xl font-black text-slate-950 mt-2">{candidate.crop_name}</h3>
          <p className="text-xs text-slate-500 mt-1">{candidate.crop_id} · {candidate.canopy_layer}</p>
        </div>
        <div className="text-right shrink-0">
          <strong className="text-2xl font-black text-emerald-800">{displayValue(candidate.compatibility_score)}</strong>
          <span className="block text-[10px] uppercase tracking-wider text-slate-500">Compatibility</span>
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-6 mt-4">{candidate.suitability_explanation}</p>
      <button type="button" className="hybrid-expand" onClick={() => setExpanded((current) => !current)}>
        {expanded ? 'Hide details' : 'View compatibility details'} {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {expanded && (
        <div className="hybrid-detail-grid">
          <p><span>Shade tolerance</span><strong>{displayValue(candidate.shade_tolerance)}</strong></p>
          <p><span>Root separation</span><strong>{displayValue(candidate.root_depth_separation)}</strong></p>
          <p><span>Water relationship</span><strong>{displayValue(candidate.water_synergy_and_competition)}</strong></p>
          <p><span>Nutrient interaction</span><strong>{displayValue(candidate.nutrient_interaction)}</strong></p>
          <p><span>Planting season</span><strong>{displayValue(candidate.recommended_planting_season)}</strong></p>
          <p><span>Usable land</span><strong>{displayValue(candidate.usable_land_area_pct, '%')}</strong></p>
          <p><span>Plant density</span><strong>{displayValue(candidate.estimated_plant_density_per_ha, ' / ha')}</strong></p>
          <p><span>Estimated yield</span><strong>{candidate.estimated_yield_per_ha_kg ? Object.entries(candidate.estimated_yield_per_ha_kg).map(([key, value]) => `${key}: ${value} kg`).join(', ') : 'Unavailable'}</strong></p>
          <p><span>Risks and limitations</span><strong>{displayValue(candidate.risks_and_limitations)}</strong></p>
          <p><span>Data source</span><strong>{displayValue(candidate.data_source)}</strong></p>
          {candidate.ml_suitability_probability !== null && candidate.ml_suitability_probability !== undefined && <p><span>ML suitability probability</span><strong>{candidate.ml_suitability_probability}%</strong></p>}
          {candidate.forecast_npv_15yr !== null && candidate.forecast_npv_15yr !== undefined && <p><span>Forecast NPV (15 yr)</span><strong>{candidate.forecast_npv_15yr}</strong></p>}
          {candidate.market_growth_rate !== null && candidate.market_growth_rate !== undefined && <p><span>Market growth rate</span><strong>{candidate.market_growth_rate}%</strong></p>}
          {candidate.price_forecast_trend && <p><span>Price forecast trend</span><strong>{candidate.price_forecast_trend}</strong></p>}
        </div>
      )}
    </article>
  );
}

export default function HybridRecommendationsPage() {
  const [farms, setFarms] = useState([]);
  const [farmKey, setFarmKey] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [farmError, setFarmError] = useState('');
  const requestSequence = useRef(0);

  const selectedFarm = useMemo(
    () => farms.find((farm) => String(farm.id ?? farm.farm_name) === String(farmKey)) || null,
    [farms, farmKey]
  );

  const loadFarms = async () => {
    setLoading(true);
    setFarmError('');
    try {
      const available = isMockMode() ? await getFarms() : await listFarms();
      const nextFarms = Array.isArray(available) ? available : [];
      setFarms(nextFarms);
      const activeId = getActiveFarmId();
      const active = nextFarms.find((farm) => String(farm.id ?? farm.farm_name) === String(activeId)) || nextFarms[0];
      if (active) {
        setFarmKey(String(active.id ?? active.farm_name));
        setForm((current) => ({
          ...current,
          main_crop: active.crop || '',
          farm_area_hectares: active.farm_area_hectares || '',
          soil_type: active.soil_type || 'Red Sandy Loam',
          irrigation_method: active.irrigation_method || 'Drip Irrigation',
        }));
      }
    } catch (loadError) {
      setFarmError(loadError?.message || 'Could not load farms for hybrid recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
    const refresh = () => loadFarms();
    window.addEventListener('agr002_active_farm_changed', refresh);
    window.addEventListener('agr002_farm_updated', refresh);
    window.addEventListener('agr002_mock_mode_changed', refresh);
    return () => {
      window.removeEventListener('agr002_active_farm_changed', refresh);
      window.removeEventListener('agr002_farm_updated', refresh);
      window.removeEventListener('agr002_mock_mode_changed', refresh);
    };
  }, []);

  const selectFarm = (event) => {
    const nextKey = event.target.value;
    const farm = farms.find((candidate) => String(candidate.id ?? candidate.farm_name) === nextKey);
    setFarmKey(nextKey);
    setResult(null);
    setError('');
    setForm((current) => ({
      ...current,
      main_crop: farm?.crop || '',
      farm_area_hectares: farm?.farm_area_hectares || '',
      soil_type: farm?.soil_type || 'Red Sandy Loam',
      irrigation_method: farm?.irrigation_method || 'Drip Irrigation',
    }));
  };

  const updateForm = (event) => {
    const { name, value, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'number' && value !== '' ? Number(value) : value }));
  };

  const generateRecommendations = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.main_crop?.trim() || !form.farm_area_hectares || Number(form.farm_area_hectares) <= 0) {
      setError('Main crop and a positive farm area are required.');
      return;
    }
    if (isMockMode()) {
      setError('Hybrid recommendations require Live API mode. Switch off Demo Mode to request backend recommendations.');
      return;
    }

    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const payload = {
        ...(selectedFarm?.id !== undefined ? { farm_id: selectedFarm.id } : {}),
        main_crop: form.main_crop.trim(),
        farm_area_hectares: Number(form.farm_area_hectares),
        soil_type: form.soil_type || undefined,
        main_crop_age_years: form.main_crop_age_years === '' ? undefined : Number(form.main_crop_age_years),
        irrigation_method: form.irrigation_method || undefined,
        water_availability: form.water_availability || undefined,
        available_sunlight: form.available_sunlight || undefined,
      };
      const response = await recommendHybridCrops(payload);
      if (requestId === requestSequence.current) setResult(response);
    } catch (requestError) {
      if (requestId === requestSequence.current) setError(requestError?.message || 'Could not generate hybrid recommendations.');
    } finally {
      if (requestId === requestSequence.current) setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading farm conditions..." />;
  if (farmError) return <ErrorState message={farmError} onRetry={loadFarms} />;

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">HYBRID INTELLIGENCE / 01</span>
          <h1>Find the right companions.</h1>
          <p>Evaluate compatible intercrops against the conditions already recorded for your field.</p>
        </div>
        <button type="button" className="outline-action" onClick={loadFarms}><RefreshCw size={15} /> Refresh farms</button>
      </div>

      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><FlaskConical size={20} /></div>
          <div><span className="workspace-eyebrow">BACKEND-DRIVEN RECOMMENDATION</span><h2>Set the field context.</h2><p>Only the inputs supported by the recommendation contract are sent.</p></div>
        </div>
        <form onSubmit={generateRecommendations} className="hybrid-form">
          <label>Farm<select value={farmKey} onChange={selectFarm}><option value="">Direct field input</option>{farms.map((farm) => <option key={farm.id ?? farm.farm_name} value={farm.id ?? farm.farm_name}>{farm.farm_name || 'Unnamed farm'}</option>)}</select></label>
          <label>Main crop<input name="main_crop" value={form.main_crop || ''} onChange={updateForm} placeholder="e.g. Coconut" required /></label>
          <label>Farm area (hectares)<input name="farm_area_hectares" type="number" min="0.01" step="0.01" value={form.farm_area_hectares || ''} onChange={updateForm} required /></label>
          <label>Soil type<input name="soil_type" value={form.soil_type || ''} onChange={updateForm} placeholder="Red Sandy Loam" /></label>
          <label>Main crop age (years)<input name="main_crop_age_years" type="number" min="0" max="100" value={form.main_crop_age_years} onChange={updateForm} /></label>
          <label>Irrigation method<select name="irrigation_method" value={form.irrigation_method || ''} onChange={updateForm}><option>Drip Irrigation</option><option>Sprinkler</option><option>Flood Irrigation</option><option>Rainfed</option></select></label>
          <label>Water availability<select name="water_availability" value={form.water_availability} onChange={updateForm}><option>Adequate</option><option>Scarce</option><option>Abundant</option></select></label>
          <label>Available sunlight<select name="available_sunlight" value={form.available_sunlight} onChange={updateForm}><option>Partial Shade</option><option>Full Sun</option><option>Full Shade</option></select></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={submitting}><Waves size={16} />{submitting ? 'Generating...' : 'Generate recommendations'}</button>
        </form>
      </section>

      {error && <div className="history-notice"><AlertCircle size={16} />{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}

      {!result && !error && <div className="empty-workspace hybrid-empty"><Sprout size={34} /><span className="workspace-eyebrow">READY WHEN YOU ARE</span><h2>Start with a field record.</h2><p>Generate a recommendation to see compatible crops, agronomic reasoning, and backend-provided suitability scores.</p></div>}

      {result && (
        <section className="hybrid-results">
          <div className="hybrid-result-summary">
            <div><span className="workspace-eyebrow">RECOMMENDATION SET</span><h2>{result.main_crop} companions.</h2><p>{displayValue(result.usable_intercrop_area_hectares, ' ha')} usable intercrop area from {displayValue(result.farm_area_hectares, ' ha')} recorded farm area.</p></div>
            <div className="hybrid-result-stat"><strong>{result.recommendations?.length || 0}</strong><span>ranked candidates</span></div>
          </div>
          {result.recommendations?.length ? <div className="hybrid-candidate-grid">{result.recommendations.map((candidate, index) => <CandidateCard key={`${candidate.crop_id}-${index}`} candidate={candidate} ranked={index === 0} />)}</div> : <div className="hybrid-empty-result">No candidate crops were returned for this field context.</div>}
          <div className="hybrid-principles"><Leaf size={18} /><div><span className="workspace-eyebrow">AGRONOMIC PRINCIPLES</span><p>{displayValue(result.agronomic_principles)}</p><small>Sources: {result.data_sources?.length ? result.data_sources.join(', ') : 'Unavailable'}</small></div></div>
        </section>
      )}
    </div>
  );
}
