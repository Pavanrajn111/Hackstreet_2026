import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Droplets, FlaskConical, Leaf, RefreshCw, Ruler, Sprout, Waves } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { listFarms } from '../services/farmService';
import { calculateHybridIrrigation, generateFarmLayout, getCultivationGuide, recommendHybridCrops } from '../services/hybridService';
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

function LayoutResult({ layout }) {
  const formatObject = (value) => value && typeof value === 'object'
    ? Object.entries(value).map(([key, entry]) => `${key.replaceAll('_', ' ')}: ${entry}`).join(' · ')
    : displayValue(value);

  return (
    <section className="hybrid-results">
      <div className="hybrid-result-summary">
        <div>
          <span className="workspace-eyebrow">GENERATED FARM LAYOUT</span>
          <h2>{layout.main_crop} + {layout.intercrop}.</h2>
          <p>{displayValue(layout.planting_pattern_summary)}</p>
        </div>
        <div className="hybrid-result-stat"><strong>{displayValue(layout.usable_cultivated_area_sqm, ' m²')}</strong><span>usable cultivated area</span></div>
      </div>
      <div className="hybrid-layout-stats">
        <div><span>Total farm area</span><strong>{displayValue(layout.total_farm_area_sqm, ' m²')}</strong></div>
        <div><span>Main crop allocation</span><strong>{displayValue(layout.main_crop_allocated_area_sqm, ' m²')}</strong></div>
        <div><span>Intercrop allocation</span><strong>{displayValue(layout.intercrop_allocated_area_sqm, ' m²')}</strong></div>
        <div><span>Plant counts</span><strong>{displayValue(layout.main_crop_plant_count)} / {displayValue(layout.intercrop_plant_count)}</strong><small>Main / intercrop</small></div>
      </div>
      <div className="hybrid-layout-grid">
        <article className="hybrid-layout-card"><Ruler size={17} /><div><span className="workspace-eyebrow">SPACING</span><h3>Crop-wise spacing</h3><p><strong>{layout.main_crop}</strong> · {formatObject(layout.main_crop_spacing)}</p><p><strong>{layout.intercrop}</strong> · {formatObject(layout.intercrop_spacing)}</p></div></article>
        <article className="hybrid-layout-card"><Sprout size={17} /><div><span className="workspace-eyebrow">ARRANGEMENT</span><h3>Row arrangement</h3><p>{formatObject(layout.row_arrangement)}</p><p>{displayValue(layout.irrigation_line_layout)}</p></div></article>
      </div>
      <div className="hybrid-calendar">
        <div><span className="workspace-eyebrow">PLANTING CALENDAR</span><h3>Plan milestones.</h3></div>
        {layout.planting_calendar?.length ? layout.planting_calendar.map((entry, index) => <div key={`${entry.stage || entry.date || index}`} className="hybrid-calendar-row"><strong>{entry.stage || entry.activity || entry.date || `Step ${index + 1}`}</strong><span>{Object.entries(entry).filter(([key]) => !['stage', 'activity', 'date'].includes(key)).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' · ') || entry.date || 'Details unavailable'}</span></div>) : <p className="text-sm text-slate-500">No planting calendar was returned.</p>}
      </div>
      <div className="hybrid-limitations"><AlertCircle size={17} /><div><span className="workspace-eyebrow">LIMITATIONS</span>{layout.limitations?.length ? <ul>{layout.limitations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>No limitations were returned.</p>}</div></div>
    </section>
  );
}

function GuideResult({ guide }) {
  const formatStructuredValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Unavailable';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      return Object.entries(value).map(([key, entry]) => `${key.replaceAll('_', ' ')}: ${Array.isArray(entry) ? entry.join(', ') : entry}`).join(' · ');
    }
    return String(value);
  };

  return (
    <section className="hybrid-results hybrid-guide-results">
      <div className="hybrid-result-summary">
        <div>
          <span className="workspace-eyebrow">CULTIVATION GUIDE</span>
          <h2>{guide.crop_name}.</h2>
          <p>{guide.botanical_name} · {displayValue(guide.season)} · {displayValue(guide.duration_days, ' days')}</p>
        </div>
        <div className="hybrid-result-stat"><strong>{guide.stages?.length || 0}</strong><span>growth stages</span></div>
      </div>
      <div className="hybrid-guide-overview">
        <article><span className="workspace-eyebrow">CLIMATE</span><p>{formatStructuredValue(guide.climate)}</p></article>
        <article><span className="workspace-eyebrow">SOIL</span><p>{formatStructuredValue(guide.soil)}</p></article>
        <article><span className="workspace-eyebrow">EXPECTED YIELD</span><p>{formatStructuredValue(guide.yield_potential)}</p></article>
      </div>
      <div className="hybrid-stages">
        <div><span className="workspace-eyebrow">CULTIVATION STAGES</span><h3>From preparation to harvest.</h3></div>
        {guide.stages?.length ? guide.stages.map((stage) => (
          <article className="hybrid-stage" key={stage.stage_number}>
            <span className="hybrid-stage-number">{stage.stage_number}</span>
            <div><h4>{stage.stage_name}</h4><p>{stage.description}</p></div>
          </article>
        )) : <p className="text-sm text-slate-500">No cultivation stages were returned.</p>}
      </div>
      <div className="hybrid-principles"><Leaf size={18} /><div><span className="workspace-eyebrow">DATA SOURCE</span><p>{displayValue(guide.data_source)}</p><small>Displayed only from the backend cultivation guide response.</small></div></div>
    </section>
  );
}

function IrrigationResult({ irrigation }) {
  const displayNumber = (value, suffix = '') => value === null || value === undefined ? 'Unavailable' : `${value}${suffix}`;

  return (
    <section className="hybrid-results hybrid-irrigation-results">
      <div className="hybrid-result-summary">
        <div>
          <span className="workspace-eyebrow">HYBRID IRRIGATION RESULT</span>
          <h2>{irrigation.main_crop} + {irrigation.intercrop}.</h2>
          <p>{irrigation.irrigate_today ? 'Irrigation is indicated today.' : 'No irrigation is indicated today.'} {displayNumber(irrigation.water_competition_risk)}</p>
        </div>
        <div className="hybrid-result-stat"><strong>{displayNumber(irrigation.total_water_volume_litres, ' L')}</strong><span>total water volume</span></div>
      </div>
      <div className="hybrid-layout-stats">
        <div><span>Combined daily ETc</span><strong>{displayNumber(irrigation.combined_daily_etc_mm, ' mm')}</strong></div>
        <div><span>Main crop ETc</span><strong>{displayNumber(irrigation.main_crop_etc_mm, ' mm')}</strong></div>
        <div><span>Intercrop ETc</span><strong>{displayNumber(irrigation.intercrop_etc_mm, ' mm')}</strong></div>
        <div><span>Recommended depth</span><strong>{displayNumber(irrigation.recommended_depth_mm, ' mm')}</strong></div>
      </div>
      <div className="hybrid-layout-grid">
        <article className="hybrid-layout-card"><Droplets size={17} /><div><span className="workspace-eyebrow">PUMP WINDOW</span><h3>{displayNumber(irrigation.estimated_pump_runtime_minutes, ' minutes')}</h3><p>Weighted Kc: {displayNumber(irrigation.weighted_kc)}</p></div></article>
        <article className="hybrid-layout-card"><Sprout size={17} /><div><span className="workspace-eyebrow">SHARED SCHEDULE</span><h3>{irrigation.shared_schedule_advisable ? 'Advisable' : 'Not advisable'}</h3><p>{displayNumber(irrigation.shared_schedule_reasoning)}</p></div></article>
      </div>
      <div className="hybrid-calendar">
        <div><span className="workspace-eyebrow">SEVEN-DAY IRRIGATION SCHEDULE</span><h3>Projected water windows.</h3></div>
        {irrigation.seven_day_schedule?.length ? irrigation.seven_day_schedule.map((day) => (
          <div className="hybrid-calendar-row" key={`${day.date}-${day.day}`}>
            <strong>{day.day} · {day.date}</strong>
            <span>{day.action} · {displayNumber(day.water_volume_litres, ' L')} · {displayNumber(day.runtime_minutes, ' min')} · {displayNumber(day.notes)}</span>
          </div>
        )) : <p className="text-sm text-slate-500">No schedule was returned.</p>}
      </div>
      <div className="hybrid-principles"><Droplets size={18} /><div><span className="workspace-eyebrow">METHODOLOGY</span><p>{displayNumber(irrigation.methodology)}</p><small>Main crop depth: {displayNumber(irrigation.seven_day_schedule?.[0]?.main_crop_depth_mm, ' mm')} · Intercrop depth: {displayNumber(irrigation.seven_day_schedule?.[0]?.intercrop_depth_mm, ' mm')}</small></div></div>
    </section>
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
  const [layoutForm, setLayoutForm] = useState({
    intercrop: '',
    farm_length_m: '',
    farm_width_m: '',
    planting_system: 'Multi-Tier Intercropping',
    custom_unusable_area_pct: 10,
  });
  const [layoutResult, setLayoutResult] = useState(null);
  const [layoutSubmitting, setLayoutSubmitting] = useState(false);
  const [layoutError, setLayoutError] = useState('');
  const [guideCrop, setGuideCrop] = useState('');
  const [guideResult, setGuideResult] = useState(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState('');
  const [irrigationForm, setIrrigationForm] = useState({
    main_crop: '',
    intercrop: '',
    farm_area_hectares: '',
    latitude: '',
    longitude: '',
    soil_type: '',
    irrigation_method: '',
    pump_flow_rate_lpm: '',
  });
  const [irrigationResult, setIrrigationResult] = useState(null);
  const [irrigationLoading, setIrrigationLoading] = useState(false);
  const [irrigationError, setIrrigationError] = useState('');
  const requestSequence = useRef(0);
  const layoutRequestSequence = useRef(0);

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
        setIrrigationForm((current) => ({
          ...current,
          main_crop: active.crop || '',
          farm_area_hectares: active.farm_area_hectares || '',
          latitude: active.latitude ?? '',
          longitude: active.longitude ?? '',
          soil_type: active.soil_type || '',
          irrigation_method: active.irrigation_method || '',
          pump_flow_rate_lpm: active.pump_flow_rate_lpm ?? '',
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
    setIrrigationForm((current) => ({
      ...current,
      main_crop: farm?.crop || '',
      farm_area_hectares: farm?.farm_area_hectares || '',
      latitude: farm?.latitude ?? '',
      longitude: farm?.longitude ?? '',
      soil_type: farm?.soil_type || '',
      irrigation_method: farm?.irrigation_method || '',
      pump_flow_rate_lpm: farm?.pump_flow_rate_lpm ?? '',
    }));
  };

  const updateForm = (event) => {
    const { name, value, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'number' && value !== '' ? Number(value) : value }));
  };

  const updateLayoutForm = (event) => {
    const { name, value, type } = event.target;
    setLayoutForm((current) => ({ ...current, [name]: type === 'number' && value !== '' ? Number(value) : value }));
  };

  const updateIrrigationForm = (event) => {
    const { name, value, type } = event.target;
    setIrrigationForm((current) => ({ ...current, [name]: type === 'number' && value !== '' ? Number(value) : value }));
  };

  const generateLayout = async (event) => {
    event.preventDefault();
    if (layoutSubmitting) return;
    if (!form.main_crop?.trim() || !form.farm_area_hectares || Number(form.farm_area_hectares) <= 0 || !layoutForm.intercrop?.trim()) {
      setLayoutError('Main crop, intercrop, and a positive farm area are required.');
      return;
    }
    if (isMockMode()) {
      setLayoutError('Farm layouts require Live API mode. Switch off Demo Mode to request the backend layout.');
      return;
    }
    const requestId = layoutRequestSequence.current + 1;
    layoutRequestSequence.current = requestId;
    setLayoutSubmitting(true);
    setLayoutError('');
    setLayoutResult(null);
    try {
      const payload = {
        ...(selectedFarm?.id !== undefined ? { farm_id: selectedFarm.id } : {}),
        farm_area_hectares: Number(form.farm_area_hectares),
        main_crop: form.main_crop.trim(),
        intercrop: layoutForm.intercrop.trim(),
        farm_length_m: layoutForm.farm_length_m === '' ? undefined : Number(layoutForm.farm_length_m),
        farm_width_m: layoutForm.farm_width_m === '' ? undefined : Number(layoutForm.farm_width_m),
        planting_system: layoutForm.planting_system || undefined,
        custom_unusable_area_pct: layoutForm.custom_unusable_area_pct === '' ? undefined : Number(layoutForm.custom_unusable_area_pct),
      };

      const loadGuide = async (event) => {
        event.preventDefault();
        if (guideLoading) return;
        if (!guideCrop.trim()) {
          setGuideError('Select or enter a crop before loading its guide.');
          return;
        }
        if (isMockMode()) {
          setGuideError('Cultivation guides require Live API mode. Switch off Demo Mode to request the backend guide.');
          return;
        }
        setGuideLoading(true);
        setGuideError('');
        setGuideResult(null);
        try {
          setGuideResult(await getCultivationGuide(guideCrop.trim()));
        } catch (requestError) {
          setGuideError(requestError?.message || 'Could not load the cultivation guide.');
        } finally {
          setGuideLoading(false);
        }
      };

      const generateIrrigation = async (event) => {
        event.preventDefault();
        if (irrigationLoading) return;
        const required = ['main_crop', 'intercrop', 'farm_area_hectares', 'latitude', 'longitude'];
        if (required.some((field) => irrigationForm[field] === '' || irrigationForm[field] === null || irrigationForm[field] === undefined)) {
          setIrrigationError('Main crop, intercrop, farm area, latitude, and longitude are required.');
          return;
        }
        if (Number(irrigationForm.farm_area_hectares) <= 0 || Number(irrigationForm.latitude) < -90 || Number(irrigationForm.latitude) > 90 || Number(irrigationForm.longitude) < -180 || Number(irrigationForm.longitude) > 180) {
          setIrrigationError('Enter a positive farm area and coordinates within the supported ranges.');
          return;
        }
        if (isMockMode()) {
          setIrrigationError('Hybrid irrigation requires Live API mode. Switch off Demo Mode to request the backend calculation.');
          return;
        }
        setIrrigationLoading(true);
        setIrrigationError('');
        setIrrigationResult(null);
        try {
          const payload = {
            ...(selectedFarm?.id !== undefined ? { farm_id: selectedFarm.id } : {}),
            farm_area_hectares: Number(irrigationForm.farm_area_hectares),
            main_crop: irrigationForm.main_crop.trim(),
            intercrop: irrigationForm.intercrop.trim(),
            latitude: Number(irrigationForm.latitude),
            longitude: Number(irrigationForm.longitude),
            soil_type: irrigationForm.soil_type || undefined,
            irrigation_method: irrigationForm.irrigation_method || undefined,
            pump_flow_rate_lpm: irrigationForm.pump_flow_rate_lpm === '' ? undefined : Number(irrigationForm.pump_flow_rate_lpm),
          };
          setIrrigationResult(await calculateHybridIrrigation(payload));
        } catch (requestError) {
          setIrrigationError(requestError?.message || 'Could not calculate hybrid irrigation.');
        } finally {
          setIrrigationLoading(false);
        }
      };
      const response = await generateFarmLayout(payload);
      if (requestId === layoutRequestSequence.current) {
        setLayoutResult(response);
        setIrrigationForm((current) => ({ ...current, intercrop: current.intercrop || response.intercrop }));
      }
    } catch (requestError) {
      if (requestId === layoutRequestSequence.current) setLayoutError(requestError?.message || 'Could not generate the farm layout.');
    } finally {
      if (requestId === layoutRequestSequence.current) setLayoutSubmitting(false);
    }
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
      if (requestId === requestSequence.current) {
        setResult(response);
        const firstCandidate = response?.recommendations?.[0];
        if (firstCandidate) setIrrigationForm((current) => ({ ...current, intercrop: current.intercrop || firstCandidate.crop_id }));
      }
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

      <section className="hybrid-input-panel hybrid-layout-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Ruler size={20} /></div>
          <div><span className="workspace-eyebrow">FARM LAYOUT / 02</span><h2>Plan the planting pattern.</h2><p>Generate allocation, spacing, row arrangement, and planting milestones from the backend layout engine.</p></div>
        </div>
        <form onSubmit={generateLayout} className="hybrid-form">
          <label>Main crop<input value={form.main_crop || ''} readOnly aria-label="Main crop for layout" /></label>
          <label>Intercrop<input name="intercrop" list="hybrid-crop-options" value={layoutForm.intercrop} onChange={updateLayoutForm} placeholder="e.g. Turmeric" required /><datalist id="hybrid-crop-options">{result?.recommendations?.map((candidate) => <option key={candidate.crop_id} value={candidate.crop_name} />)}</datalist></label>
          <label>Farm area (hectares)<input value={form.farm_area_hectares || ''} readOnly aria-label="Farm area for layout" /></label>
          <label>Planting system<select name="planting_system" value={layoutForm.planting_system} onChange={updateLayoutForm}><option>Multi-Tier Intercropping</option><option>Multi-Row Intercropping</option><option>Alley Cropping</option></select></label>
          <label>Farm length (metres)<input name="farm_length_m" type="number" min="0.01" step="0.01" value={layoutForm.farm_length_m} onChange={updateLayoutForm} placeholder="Optional" /></label>
          <label>Farm width (metres)<input name="farm_width_m" type="number" min="0.01" step="0.01" value={layoutForm.farm_width_m} onChange={updateLayoutForm} placeholder="Optional" /></label>
          <label>Unusable area (%)<input name="custom_unusable_area_pct" type="number" min="0" max="50" step="0.1" value={layoutForm.custom_unusable_area_pct} onChange={updateLayoutForm} /></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={layoutSubmitting}><Ruler size={16} />{layoutSubmitting ? 'Generating layout...' : 'Generate farm layout'}</button>
        </form>
      </section>

      {layoutError && <div className="history-notice"><AlertCircle size={16} />{layoutError}<button type="button" onClick={() => setLayoutError('')} aria-label="Dismiss layout error">Dismiss</button></div>}
      {!layoutResult && !layoutError && <div className="hybrid-empty-result">Choose an intercrop to generate a backend layout. No crop positions are shown until the service returns them.</div>}
      {layoutResult && <LayoutResult layout={layoutResult} />}

      <section className="hybrid-input-panel hybrid-guide-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Leaf size={20} /></div>
          <div><span className="workspace-eyebrow">CULTIVATION / 03</span><h2>Grow with a clear sequence.</h2><p>Load the backend guide for a selected farm crop or a returned intercrop candidate.</p></div>
        </div>
        <form onSubmit={loadGuide} className="hybrid-guide-form">
          <label>Crop guide<input list="hybrid-guide-crops" value={guideCrop} onChange={(event) => { setGuideCrop(event.target.value); setGuideResult(null); setGuideError(''); }} placeholder="Select or enter a crop" required /><datalist id="hybrid-guide-crops">{selectedFarm?.crop && <option value={selectedFarm.crop}>{selectedFarm.crop} (farm crop)</option>}{result?.recommendations?.map((candidate) => <option key={candidate.crop_id} value={candidate.crop_id}>{candidate.crop_name}</option>)}{layoutResult?.intercrop && !result?.recommendations?.some((candidate) => candidate.crop_id === layoutResult.intercrop) && <option value={layoutResult.intercrop}>{layoutResult.intercrop} (layout intercrop)</option>}</datalist></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={guideLoading}><Leaf size={16} />{guideLoading ? 'Loading guide...' : 'Load cultivation guide'}</button>
        </form>
      </section>

      {guideError && <div className="history-notice"><AlertCircle size={16} />{guideError}<button type="button" onClick={() => setGuideError('')} aria-label="Dismiss guide error">Dismiss</button></div>}
      {!guideResult && !guideError && <div className="hybrid-empty-result">Select a crop to view its backend cultivation guide.</div>}
      {guideResult && <GuideResult guide={guideResult} />}

      <section className="hybrid-input-panel hybrid-irrigation-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Droplets size={20} /></div>
          <div><span className="workspace-eyebrow">HYBRID IRRIGATION / 04</span><h2>Balance both root zones.</h2><p>Calculate a shared water balance and seven-day schedule from the backend irrigation engine.</p></div>
        </div>
        <form onSubmit={generateIrrigation} className="hybrid-form">
          <label>Main crop<input name="main_crop" value={irrigationForm.main_crop} onChange={updateIrrigationForm} placeholder="Required" required /></label>
          <label>Intercrop<input name="intercrop" list="hybrid-irrigation-crops" value={irrigationForm.intercrop} onChange={updateIrrigationForm} placeholder="Required" required /><datalist id="hybrid-irrigation-crops">{result?.recommendations?.map((candidate) => <option key={candidate.crop_id} value={candidate.crop_id}>{candidate.crop_name}</option>)}{layoutResult?.intercrop && <option value={layoutResult.intercrop} />}</datalist></label>
          <label>Farm area (hectares)<input name="farm_area_hectares" type="number" min="0.01" step="0.01" value={irrigationForm.farm_area_hectares} onChange={updateIrrigationForm} required /></label>
          <label>Soil type<input name="soil_type" value={irrigationForm.soil_type} onChange={updateIrrigationForm} placeholder="Optional" /></label>
          <label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" value={irrigationForm.latitude} onChange={updateIrrigationForm} required /></label>
          <label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" value={irrigationForm.longitude} onChange={updateIrrigationForm} required /></label>
          <label>Irrigation method<select name="irrigation_method" value={irrigationForm.irrigation_method} onChange={updateIrrigationForm}><option value="">Use backend default</option><option>Drip Irrigation</option><option>Sprinkler</option><option>Flood Irrigation</option><option>Rainfed</option></select></label>
          <label>Pump flow (L/min)<input name="pump_flow_rate_lpm" type="number" min="0" step="0.1" value={irrigationForm.pump_flow_rate_lpm} onChange={updateIrrigationForm} placeholder="Optional" /></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={irrigationLoading}><Droplets size={16} />{irrigationLoading ? 'Calculating...' : 'Generate hybrid irrigation'}</button>
        </form>
      </section>

      {irrigationError && <div className="history-notice"><AlertCircle size={16} />{irrigationError}<button type="button" onClick={() => setIrrigationError('')} aria-label="Dismiss irrigation error">Dismiss</button></div>}
      {!irrigationResult && !irrigationError && <div className="hybrid-empty-result">Enter both crops and the farm location to calculate hybrid irrigation.</div>}
      {irrigationResult && <IrrigationResult irrigation={irrigationResult} />}
    </div>
  );
}
