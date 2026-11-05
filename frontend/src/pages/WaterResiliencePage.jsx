import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Droplets, Loader2, RefreshCw, ShieldCheck, Sprout } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { getActiveFarmId, setActiveFarmId } from '../services/farmSelection';
import { generateWaterResiliencePlan } from '../services/waterResilienceService';

const farmKey = (farm) => String(farm?.id ?? farm?.farm_name ?? '');
const display = (value) => value === null || value === undefined || value === '' ? 'Unavailable' : value;
const numberOrUndefined = (value) => value === '' ? undefined : Number(value);
const formatNumber = (value, suffix = '') => typeof value === 'number' ? `${value.toLocaleString()}${suffix}` : 'Unavailable';

const initialForm = {
  crop: '', crop_stage: '', soil_type: '', farm_area_hectares: '',
  latitude: '', longitude: '', existing_irrigation_method: '',
  available_water_litres: '', shortage_severity: 'moderate', budget_limit_inr: '',
  max_community_search_radius_km: '15', user_constraints: '',
};

const toPayload = (form, farm) => {
  const payload = {
    ...(farm?.id !== undefined ? { farm_id: farm.id } : {}),
    crop: form.crop.trim() || undefined,
    crop_stage: form.crop_stage.trim() || undefined,
    soil_type: form.soil_type.trim() || undefined,
    farm_area_hectares: numberOrUndefined(form.farm_area_hectares),
    latitude: numberOrUndefined(form.latitude),
    longitude: numberOrUndefined(form.longitude),
    existing_irrigation_method: form.existing_irrigation_method.trim() || undefined,
    available_water_litres: numberOrUndefined(form.available_water_litres),
    shortage_severity: form.shortage_severity || undefined,
    budget_limit_inr: numberOrUndefined(form.budget_limit_inr),
    max_community_search_radius_km: Number(form.max_community_search_radius_km),
    user_constraints: form.user_constraints.split(',').map((item) => item.trim()).filter(Boolean),
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

const safeArray = (value) => Array.isArray(value) ? value : [];

export default function WaterResiliencePage() {
  const [farms, setFarms] = useState([]);
  const [farm, setFarm] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [farmError, setFarmError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    getFarms().then((available) => {
      if (!active) return;
      const selectedId = getActiveFarmId();
      const selected = available?.find((candidate) => farmKey(candidate) === String(selectedId)) || available?.[0] || null;
      setFarms(available || []);
      setFarm(selected);
      if (selected) {
        setForm((current) => ({
          ...current,
          crop: current.crop || selected.crop || '',
          soil_type: current.soil_type || selected.soil_type || '',
          farm_area_hectares: current.farm_area_hectares || selected.farm_area_hectares || '',
          latitude: current.latitude || selected.latitude || '',
          longitude: current.longitude || selected.longitude || '',
          existing_irrigation_method: current.existing_irrigation_method || selected.irrigation_method || '',
        }));
      }
    }).catch((loadError) => {
      if (active) setFarmError(loadError?.message || 'Could not load farms.');
    });
    return () => { active = false; };
  }, []);

  const changeForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const changeFarm = (event) => {
    const selected = farms.find((candidate) => farmKey(candidate) === event.target.value) || null;
    setFarm(selected);
    setActiveFarmId(selected?.id ?? selected?.farm_name ?? null);
    if (selected) {
      setForm((current) => ({
        ...current,
        crop: selected.crop || '',
        soil_type: selected.soil_type || '',
        farm_area_hectares: selected.farm_area_hectares || '',
        latitude: selected.latitude || '',
        longitude: selected.longitude || '',
        existing_irrigation_method: selected.irrigation_method || '',
      }));
    }
    setResult(null);
    setSuccess('');
  };

  const generatePlan = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (isMockMode()) {
      setError('Water resilience planning requires Live API mode. Switch off Demo Mode to request the backend planner.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      setResult(await generateWaterResiliencePlan(toPayload(form, farm)));
      setSuccess('Water resilience action plan generated.');
    } catch (requestError) {
      setError(requestError?.message || 'Could not generate the water resilience plan.');
    } finally {
      setLoading(false);
    }
  };

  const currentWater = result?.current_water_status || {};
  const baseline = result?.existing_irrigation_recommendation || {};
  const ml = result?.ml_insights || {};
  const completeness = result?.data_completeness || {};

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">WATER INTELLIGENCE / RESILIENCE</span>
          <h1>Plan for the next dry spell.</h1>
          <p>Turn the backend water-balance assessment into prioritized actions for this field.</p>
        </div>
        <div className="hybrid-icon"><ShieldCheck size={21} /></div>
      </div>

      {farmError && <div className="history-notice"><AlertCircle size={16} />{farmError}</div>}
      {error && <div className="history-notice resilience-error"><AlertCircle size={16} />{error}</div>}
      {success && <div className="resilience-success"><CheckCircle2 size={16} />{success}</div>}

      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Droplets size={21} /></div>
          <div><span className="workspace-eyebrow">ASSESSMENT INPUTS</span><h2>Describe the water situation.</h2><p>Farm values are prefilled only when returned by the farm service. All other fields remain yours to provide.</p></div>
        </div>
        <form className="hybrid-form" onSubmit={generatePlan}>
          <label>Registered farm<select value={farmKey(farm)} onChange={changeFarm}><option value="">Use provided inputs</option>{farms.map((candidate) => <option key={farmKey(candidate)} value={farmKey(candidate)}>{candidate.farm_name || `Farm ${candidate.id}`}</option>)}</select></label>
          <label>Crop<input name="crop" value={form.crop} onChange={changeForm} placeholder="e.g. Tomato" /></label>
          <label>Crop stage<input name="crop_stage" value={form.crop_stage} onChange={changeForm} placeholder="e.g. Mid-Season" /></label>
          <label>Soil type<input name="soil_type" value={form.soil_type} onChange={changeForm} placeholder="e.g. Red Sandy Loam" /></label>
          <label>Farm area <span>hectares</span><input name="farm_area_hectares" type="number" min="0.0001" step="any" value={form.farm_area_hectares} onChange={changeForm} /></label>
          <label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" value={form.latitude} onChange={changeForm} /></label>
          <label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" value={form.longitude} onChange={changeForm} /></label>
          <label>Current irrigation method<input name="existing_irrigation_method" value={form.existing_irrigation_method} onChange={changeForm} placeholder="e.g. Surface / Flood Irrigation" /></label>
          <label>Available water <span>litres</span><input name="available_water_litres" type="number" min="0" step="any" value={form.available_water_litres} onChange={changeForm} /></label>
          <label>Shortage severity<select name="shortage_severity" value={form.shortage_severity} onChange={changeForm}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option><option value="critical">Critical</option></select></label>
          <label>Budget limit <span>INR</span><input name="budget_limit_inr" type="number" min="0" step="any" value={form.budget_limit_inr} onChange={changeForm} /></label>
          <label>Community search radius <span>km</span><input name="max_community_search_radius_km" type="number" min="0.001" max="100" step="any" value={form.max_community_search_radius_km} onChange={changeForm} required /></label>
          <label className="resilience-wide-field">Constraints <span>comma-separated</span><input name="user_constraints" value={form.user_constraints} onChange={changeForm} placeholder="e.g. low_electricity, rocky_soil" /></label>
          <button type="submit" className="hybrid-submit auth-submit" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><RefreshCw size={16} /> Generate action plan</>}</button>
        </form>
      </section>

      {!result && !loading && <div className="hybrid-empty-result"><Sprout size={18} />Enter the known conditions and generate a plan to see water status, actions and supporting signals.</div>}
      {loading && <div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" />Assessing water resilience...</div>}

      {result && <div className="hybrid-results">
        <section className="resilience-summary-grid">
          <div className="hybrid-layout-card"><span className="workspace-eyebrow">WATER STATUS</span><strong className="resilience-number">{formatNumber(result.water_deficit_litres, ' L')}</strong><p>{display(result.water_surplus_or_deficit_status)}</p></div>
          <div className="hybrid-layout-card"><span className="workspace-eyebrow">CROP CONTEXT</span><strong>{display(result.crop)}</strong><p>{display(result.growth_stage)}</p></div>
          <div className="hybrid-layout-card"><span className="workspace-eyebrow">IRRIGATE TODAY</span><strong>{baseline.irrigate_today === true ? 'Yes' : baseline.irrigate_today === false ? 'No' : 'Unavailable'}</strong><p>{formatNumber(baseline.recommended_water_volume_litres, ' L')} recommended</p></div>
          <div className="hybrid-layout-card"><span className="workspace-eyebrow">ML SIGNAL</span><strong>{display(ml.ml_status)}</strong><p>{ml.ml_model_used ? 'Model signal integrated' : 'Not used as trained prediction'}</p></div>
        </section>

        <section className="hybrid-layout-card resilience-callout"><span className="workspace-eyebrow">AGRONOMIC SAFETY</span><h2>{display(result.stage_sensitivity_status)}</h2><p>{display(baseline.explanation)}</p></section>

        <section className="hybrid-layout-card"><div className="hybrid-result-summary"><div><span className="workspace-eyebrow">PRIORITIZED ROADMAP</span><h2>Recommended actions</h2></div><span className="hybrid-rank">{safeArray(result.recommended_actions).length} actions</span></div><div className="resilience-action-grid">{safeArray(result.recommended_actions).map((action) => <article className="resilience-action-card" key={action.action_id}><div className="community-card-topline"><span className="hybrid-rank">Priority {display(action.priority_level)}</span><span>{display(action.timeframe)}</span></div><h3>{display(action.title)}</h3><p className="resilience-category">{display(action.category)} · {display(action.agronomic_safety_rating)}</p><p>{display(action.description)}</p><div className="hybrid-detail-grid"><p><span>Water impact</span><strong>{formatNumber(action.water_saving_or_gain_litres, ' L')}</strong></p><p><span>Estimated cost</span><strong>{typeof action.estimated_cost_inr === 'number' ? `₹${action.estimated_cost_inr.toLocaleString()}` : 'Unavailable'}</strong></p></div><h4>Implementation steps</h4><ul>{safeArray(action.implementation_steps).map((step) => <li key={step}>{step}</li>)}</ul><p className="resilience-confirmation"><strong>Confirmation:</strong> {display(action.farmer_confirmation_required)}</p></article>)}</div></section>

        <div className="resilience-two-column">
          <section className="hybrid-layout-card"><span className="workspace-eyebrow">BASELINE WATER BALANCE</span><div className="hybrid-detail-grid"><p><span>Days after sowing</span><strong>{display(currentWater.days_after_sowing)}</strong></p><p><span>Crop coefficient (Kc)</span><strong>{display(currentWater.crop_coefficient_kc)}</strong></p><p><span>Recommended volume</span><strong>{formatNumber(currentWater.recommended_volume_litres, ' L')}</strong></p><p><span>Recommended depth</span><strong>{formatNumber(currentWater.recommended_depth_mm, ' mm')}</strong></p><p><span>On-farm water</span><strong>{formatNumber(currentWater.on_farm_available_water_litres, ' L')}</strong></p></div></section>
          <section className="hybrid-layout-card"><span className="workspace-eyebrow">MODEL TRANSPARENCY</span><h3>{display(ml.risk_category)} risk category</h3><p>{display(ml.explanation_note)}</p><div className="hybrid-detail-grid"><p><span>Under-irrigation risk</span><strong>{display(ml.under_irrigation_risk)}</strong></p><p><span>Over-irrigation risk</span><strong>{display(ml.over_irrigation_risk)}</strong></p><p><span>Farm profile loaded</span><strong>{completeness.farm_profile_loaded ? 'Yes' : 'No'}</strong></p><p><span>Community resources searched</span><strong>{display(completeness.community_resources_searched)}</strong></p></div></section>
        </div>

        <section className="hybrid-layout-card"><div className="hybrid-result-summary"><div><span className="workspace-eyebrow">ADAPTIVE OPTIONS</span><h2>Irrigation method options</h2></div></div><div className="resilience-option-grid">{safeArray(result.irrigation_method_options).map((option) => <article className="resilience-option-card" key={option.method}><div className="community-card-topline"><h3>{display(option.method)}</h3><span className="hybrid-rank">{display(option.suitability_score)}</span></div><p>{display(option.why_recommended)}</p><p><strong>Water impact:</strong> {display(option.estimated_water_impact?.summary || option.estimated_water_impact?.water_saving_litres || option.estimated_water_impact)}</p><ul>{safeArray(option.next_steps).map((step) => <li key={step}>{step}</li>)}</ul></article>)}</div></section>

        {safeArray(result.community_resource_matches).length > 0 && <section className="hybrid-layout-card"><span className="workspace-eyebrow">COMMUNITY SUPPORT</span><h2>Nearby opt-in water matches</h2><div className="resilience-option-grid">{safeArray(result.community_resource_matches).map((match) => <article className="resilience-option-card" key={match.resource_id}><div className="community-card-topline"><h3>{display(match.resource_type)}</h3><span className="hybrid-rank">{display(match.match_score)}</span></div><p>{display(match.match_explanation?.join(' '))}</p><div className="hybrid-detail-grid"><p><span>Distance</span><strong>{display(match.distance_km)} km</strong></p><p><span>Available</span><strong>{formatNumber(match.available_quantity_litres, ' L')}</strong></p><p><span>Compatibility</span><strong>{display(match.compatibility_tier)}</strong></p><p><span>Terms</span><strong>{display(match.cost_summary)}</strong></p></div></article>)}</div></section>}

        {safeArray(result.warnings).length > 0 && <section className="history-notice"><AlertCircle size={16} /><div>{result.warnings.map((warning) => <div key={warning}>{warning}</div>)}</div></section>}
        <section className="resilience-meta"><span>Engine: {display(result.source_metadata?.engine)}</span><span>ML status: {display(ml.ml_status)}</span><span>Completeness: {completeness.ml_signals_integrated ? 'ML signals integrated' : 'ML signals not integrated'}</span></section>
      </div>}
    </div>
  );
}
