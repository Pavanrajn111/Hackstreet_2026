import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, Droplets, Info, Loader2, RefreshCw, Sprout } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { getActiveFarmId, setActiveFarmId } from '../services/farmSelection';
import { compareAdaptiveIrrigationMethods, evaluateAdaptiveIrrigationOptions } from '../services/irrigationService';

const farmKey = (farm) => String(farm?.id ?? farm?.farm_name ?? '');
const numberOrUndefined = (value) => (value === '' ? undefined : Number(value));

const optionLists = {
  crop_stage: ['Initial', 'Development', 'Mid-Season', 'Late'],
  water_source: ['Borewell', 'Canal', 'Farm Pond', 'Open Well', 'Rainfed'],
  water_availability: ['Abundant', 'Adequate', 'Moderate', 'Scarce', 'Critical'],
  water_quality: ['freshwater', 'Slightly Saline', 'Turbid'],
  terrain_slope: ['Flat (0-2%)', 'Gentle (2-5%)', 'Steep (>5%)', 'Undulating'],
  pump_electricity_availability: ['Reliable Grid 6+ hrs', 'Unreliable 2-4 hrs', 'Solar Powered', 'Diesel Pump', 'Gravity'],
  labor_availability: ['High', 'Moderate', 'Low / Scarce'],
};

const methods = ['Drip Irrigation', 'Sprinkler Irrigation', 'Surface / Flood Irrigation', 'Improved Existing System', 'Better Irrigation Scheduling', 'Field Zoning', 'Leak Detection & Repair', 'Mulching & Soil Moisture Conservation'];

const display = (value) => value === null || value === undefined || value === '' ? 'Unavailable' : value;
const percent = (value) => typeof value === 'number' ? `${value.toFixed(1)}%` : 'Unavailable';

export default function AdaptiveIrrigationPage() {
  const [farms, setFarms] = useState([]);
  const [farm, setFarm] = useState(null);
  const [form, setForm] = useState({
    crop: '', crop_stage: '', soil_type: '', farm_area_hectares: '',
    existing_irrigation_method: '', water_source: '', water_availability: '',
    water_quality: 'freshwater', terrain_slope: 'Flat (0-2%)',
    pump_electricity_availability: '', labor_availability: 'Moderate',
    budget_limit_inr: '', comparison_methods: ['Drip Irrigation', 'Sprinkler Irrigation'],
  });
  const [optionsResult, setOptionsResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState('');
  const [compareError, setCompareError] = useState('');
  const [farmError, setFarmError] = useState('');

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
          existing_irrigation_method: current.existing_irrigation_method || selected.irrigation_method || '',
        }));
      }
    }).catch((loadError) => {
      if (active) setFarmError(loadError?.message || 'Could not load farms.');
    });
    return () => { active = false; };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFarmChange = (event) => {
    const selected = farms.find((candidate) => farmKey(candidate) === event.target.value);
    setFarm(selected || null);
    setActiveFarmId(selected?.id ?? selected?.farm_name ?? null);
    if (selected) {
      setForm((current) => ({
        ...current,
        crop: selected.crop || '',
        soil_type: selected.soil_type || '',
        farm_area_hectares: selected.farm_area_hectares || '',
        existing_irrigation_method: selected.irrigation_method || '',
      }));
    }
    setOptionsResult(null);
    setCompareResult(null);
  };

  const buildOptionsPayload = () => {
    const payload = {
      ...(farm?.id !== undefined ? { farm_id: farm.id } : {}),
      crop: form.crop.trim() || undefined,
      crop_stage: form.crop_stage || undefined,
      soil_type: form.soil_type.trim() || undefined,
      farm_area_hectares: numberOrUndefined(form.farm_area_hectares),
      existing_irrigation_method: form.existing_irrigation_method || undefined,
      water_source: form.water_source || undefined,
      water_availability: form.water_availability || undefined,
      water_quality: form.water_quality || undefined,
      terrain_slope: form.terrain_slope || undefined,
      pump_electricity_availability: form.pump_electricity_availability || undefined,
      labor_availability: form.labor_availability || undefined,
      budget_limit_inr: numberOrUndefined(form.budget_limit_inr),
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  };

  const generateOptions = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (isMockMode()) {
      setError('Adaptive irrigation advice requires Live API mode. Switch off Demo Mode to request the backend advisor.');
      return;
    }
    setLoading(true);
    setError('');
    setOptionsResult(null);
    try {
      setOptionsResult(await evaluateAdaptiveIrrigationOptions(buildOptionsPayload()));
    } catch (requestError) {
      setError(requestError?.message || 'Could not evaluate adaptive irrigation options.');
    } finally {
      setLoading(false);
    }
  };

  const toggleComparisonMethod = (method) => {
    setForm((current) => ({
      ...current,
      comparison_methods: current.comparison_methods.includes(method)
        ? current.comparison_methods.filter((item) => item !== method)
        : [...current.comparison_methods, method],
    }));
  };

  const compareMethods = async () => {
    if (compareLoading) return;
    if (!form.comparison_methods.length) {
      setCompareError('Select at least one alternative method to compare.');
      return;
    }
    if (isMockMode()) {
      setCompareError('Adaptive irrigation comparisons require Live API mode.');
      return;
    }
    setCompareLoading(true);
    setCompareError('');
    setCompareResult(null);
    try {
      const payload = {
        ...(farm?.id !== undefined ? { farm_id: farm.id } : {}),
        current_method: form.existing_irrigation_method || 'Surface / Flood Irrigation',
        comparison_methods: form.comparison_methods,
        farm_area_hectares: numberOrUndefined(form.farm_area_hectares),
        crop: form.crop.trim() || undefined,
        soil_type: form.soil_type.trim() || undefined,
      };
      setCompareResult(await compareAdaptiveIrrigationMethods(Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))));
    } catch (requestError) {
      setCompareError(requestError?.message || 'Could not compare irrigation methods.');
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">IRRIGATION INTELLIGENCE / ADAPTIVE</span>
          <h1>Make the system fit the field.</h1>
          <p>Evaluate practical irrigation upgrades using the backend’s transparent multi-factor advisor.</p>
        </div>
        <div className="hybrid-icon"><Droplets size={21} /></div>
      </div>

      {farmError && <div className="history-notice"><AlertCircle size={16} />{farmError}</div>}
      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading"><div className="hybrid-icon"><Sprout size={21} /></div><div><span className="workspace-eyebrow">ADVISOR INPUTS</span><h2>Describe the field.</h2><p>Farm values are prefilled only when present in the selected farm record.</p></div></div>
        <form onSubmit={generateOptions} className="hybrid-form">
          <div className="hybrid-form-grid">
            <label>Farm<span>Optional registered context</span><select value={farmKey(farm)} onChange={handleFarmChange}><option value="">No selected farm</option>{farms.map((candidate) => <option key={farmKey(candidate)} value={farmKey(candidate)}>{candidate.farm_name || candidate.crop || 'Unnamed farm'}</option>)}</select></label>
            <label>Crop<span>Optional if farm ID is supplied</span><input name="crop" value={form.crop} onChange={handleChange} placeholder="Tomato" /></label>
            <label>Soil type<span>Optional if farm ID is supplied</span><input name="soil_type" value={form.soil_type} onChange={handleChange} placeholder="Red Sandy Loam" /></label>
            <label>Farm area<span>hectares</span><input type="number" name="farm_area_hectares" min="0.01" max="10000" step="0.01" value={form.farm_area_hectares} onChange={handleChange} placeholder="1.5" /></label>
            {['crop_stage', 'water_source', 'water_availability', 'water_quality', 'terrain_slope', 'pump_electricity_availability', 'labor_availability'].map((name) => <label key={name}>{name.replaceAll('_', ' ')}<span>Optional advisor input</span><select name={name} value={form[name]} onChange={handleChange}><option value="">Use backend default</option>{optionLists[name].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}
            <label>Existing irrigation method<span>Current system</span><input name="existing_irrigation_method" value={form.existing_irrigation_method} onChange={handleChange} placeholder="Surface / Flood Irrigation" /></label>
            <label>Budget limit<span>INR · optional</span><input type="number" name="budget_limit_inr" min="0" step="1" value={form.budget_limit_inr} onChange={handleChange} placeholder="60000" /></label>
          </div>
          <button type="submit" className="hybrid-submit auth-submit" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" /> Evaluating...</> : <><Droplets size={16} /> Evaluate adaptive options</>}</button>
        </form>
      </section>

      {error && <div className="history-notice"><AlertCircle size={16} />{error}</div>}
      {!optionsResult && !loading && !error && <div className="empty-workspace hybrid-empty"><Droplets size={34} /><span className="workspace-eyebrow">READY WHEN YOU ARE</span><h2>Start with the field context.</h2><p>The advisor will return ranked methods, limitations, water impact, inputs and next steps.</p></div>}
      {loading && <div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" /> Evaluating practical irrigation options...</div>}

      {optionsResult && <section className="hybrid-results">
        <div className="hybrid-result-summary"><div><span className="workspace-eyebrow">ADAPTIVE ADVISOR RESULT</span><h2>{optionsResult.recommended_option || 'Recommendation unavailable'}</h2><p>{optionsResult.ranking_method || 'Ranking method unavailable.'}</p></div><div className="hybrid-result-stat"><span>DATA COMPLETENESS</span><strong>{percent((optionsResult.data_completeness?.score || 0) * 100)}</strong></div></div>
        <div className="hybrid-layout-stats"><div><span>Crop</span><strong>{display(optionsResult.crop)}</strong></div><div><span>Area</span><strong>{display(optionsResult.farm_area_hectares)} ha</strong></div><div><span>Current method</span><strong>{display(optionsResult.current_method)}</strong></div><div><span>Options evaluated</span><strong>{optionsResult.options?.length ?? 0}</strong></div></div>
        {optionsResult.warnings?.length > 0 && <div className="history-notice"><AlertCircle size={16} /><span>{optionsResult.warnings.join(' ')}</span></div>}
        {optionsResult.missing_information?.length > 0 && <div className="hybrid-limitations"><Info size={18} /><div><span className="workspace-eyebrow">MISSING INFORMATION</span>{optionsResult.missing_information.map((item) => <p key={item}>{item}</p>)}</div></div>}
        <div className="hybrid-candidate-grid">{(optionsResult.options || []).map((option) => <article className={`hybrid-candidate ${option.method === optionsResult.recommended_option ? 'is-ranked' : ''}`} key={option.method}><span className="hybrid-rank">{option.category}</span><h3>{option.method}</h3><p>{option.why_recommended}</p><div className="hybrid-detail-grid"><p><span>Suitability</span><strong>{display(option.suitability_score)}/100</strong></p><p><span>Data completeness</span><strong>{percent((option.confidence_or_data_completeness || 0) * 100)}</strong></p><p><span>Water impact</span><strong>{display(option.estimated_water_impact?.water_saving_vs_flood_pct)}% saving</strong></p></div><p className="text-sm text-slate-700 mt-3">{option.score_explanation?.join(' ')}</p><details className="mt-3"><summary className="hybrid-expand">View requirements and limitations</summary><p className="text-sm text-slate-700 mt-2"><strong>Inputs:</strong> {option.required_inputs?.join('; ') || 'Unavailable'}</p><p className="text-sm text-slate-700 mt-2"><strong>Installation:</strong> {option.installation_requirements?.join('; ') || 'Unavailable'}</p><p className="text-sm text-slate-700 mt-2"><strong>Maintenance:</strong> {option.maintenance_requirements?.join('; ') || 'Unavailable'}</p><p className="text-sm text-slate-700 mt-2"><strong>Limitations:</strong> {option.limitations?.join('; ') || 'Unavailable'}</p></details></article>)}</div>
        <div className="hybrid-principles"><Database size={18} /><div><span className="workspace-eyebrow">SOURCE METADATA</span><p>{optionsResult.source_metadata?.engine || 'Unavailable'}</p><small>{optionsResult.source_metadata?.standards?.join(' · ') || 'Standards unavailable'}</small></div></div>
      </section>}

      <section className="hybrid-input-panel adaptive-compare-panel">
        <div className="hybrid-panel-heading"><div className="hybrid-icon"><RefreshCw size={21} /></div><div><span className="workspace-eyebrow">METHOD COMPARISON</span><h2>Compare alternatives.</h2><p>Choose one or more valid backend method names.</p></div></div>
        <div className="adaptive-method-list">{methods.map((method) => <label key={method}><input type="checkbox" checked={form.comparison_methods.includes(method)} onChange={() => toggleComparisonMethod(method)} />{method}</label>)}</div>
        <button type="button" className="hybrid-submit auth-submit" onClick={compareMethods} disabled={compareLoading}>{compareLoading ? <><Loader2 size={16} className="animate-spin" /> Comparing...</> : 'Compare methods'}</button>
        {compareError && <div className="history-notice"><AlertCircle size={16} />{compareError}</div>}
        {compareResult && <div className="hybrid-results"><div className="hybrid-result-summary"><div><span className="workspace-eyebrow">COMPARISON RESULT</span><h2>{compareResult.overall_verdict}</h2><p>{compareResult.crop} · {compareResult.soil_type} · {compareResult.farm_area_hectares} ha</p></div><div className="hybrid-result-stat"><span>DATA COMPLETENESS</span><strong>{display(compareResult.data_completeness_pct)}%</strong></div></div><div className="hybrid-candidate-grid">{[compareResult.current_method_assessment, ...(compareResult.alternative_comparisons || [])].filter(Boolean).map((item) => <article className="hybrid-candidate" key={item.method}><span className="hybrid-rank">{item.method === compareResult.current_method_assessment?.method ? 'CURRENT' : 'ALTERNATIVE'}</span><h3>{item.method}</h3><p>{item.recommendation_summary}</p><div className="hybrid-detail-grid"><p><span>Suitability</span><strong>{display(item.suitability_score)}/100</strong></p><p><span>Efficiency</span><strong>{display(item.application_efficiency_pct)}%</strong></p><p><span>Water saving</span><strong>{display(item.water_saving_vs_current_pct)}%</strong></p><p><span>Capital cost</span><strong>{item.estimated_capital_cost_inr === null || item.estimated_capital_cost_inr === undefined ? 'Unavailable' : `₹${item.estimated_capital_cost_inr.toLocaleString()}`}</strong></p></div><p className="text-sm text-slate-700 mt-3"><strong>Advantages:</strong> {item.key_advantages?.join('; ') || 'Unavailable'}</p><p className="text-sm text-slate-700 mt-2"><strong>Limitations:</strong> {item.critical_limitations?.join('; ') || 'Unavailable'}</p></article>)}</div>{compareResult.key_tradeoffs?.length > 0 && <div className="hybrid-limitations"><Info size={18} /><div><span className="workspace-eyebrow">KEY TRADE-OFFS</span>{compareResult.key_tradeoffs.map((item) => <p key={item}>{item}</p>)}</div></div>}</div>}
      </section>
    </div>
  );
}
