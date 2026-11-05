import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Box, ChevronDown, ChevronUp, Droplets, Eye, EyeOff, FlaskConical, Leaf, RefreshCw, Ruler, RotateCcw, Sprout, TrendingUp, Waves, ZoomIn, ZoomOut } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { listFarms } from '../services/farmService';
import { calculateHybridIrrigation, compareHybridProfit, estimateHybridProfit, generateFarmLayout, getCultivationGuide, getHybridPlan, listHybridPlans, listValueAddedProducts, recommendHybridCrops, saveHybridPlan } from '../services/hybridService';
import { getActiveFarmId } from '../services/farmSelection';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
const FarmLayout3D = lazy(() => import('../components/FarmLayout3D'));

const EMPTY_FORM = {
  main_crop_age_years: 8,
  water_availability: 'Adequate',
  available_sunlight: 'Partial Shade',
};

const updateComparisonForm = (event) => {
  const { name, value, type } = event.target;
  setComparisonForm((current) => ({ ...current, [name]: type === 'number' && value !== '' ? Number(value) : value }));
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
  const [view, setView] = useState('2d');
  const [showMain, setShowMain] = useState(true);
  const [showIntercrop, setShowIntercrop] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const formatObject = (value) => value && typeof value === 'object'
    ? Object.entries(value).map(([key, entry]) => `${key.replaceAll('_', ' ')}: ${entry}`).join(' · ')
    : displayValue(value);
  const numericSpacing = (value, fallback) => {
    const numbers = String(value || '').match(/\d+(?:\.\d+)?/g);
    return numbers?.length ? Number(numbers[0]) : fallback;
  };
  const mainRowSpacing = numericSpacing(layout.main_crop_spacing?.row_spacing_m, 7.5);
  const plantSpacing = numericSpacing(layout.main_crop_spacing?.plant_spacing_m, 7.5);
  const buffer = numericSpacing(layout.row_arrangement?.buffer_zone_m || layout.intercrop_spacing?.buffer_from_main_m, 1.5);
  const mainRows = Math.max(3, Math.min(7, Math.round(32 / mainRowSpacing)));
  const plantsPerRow = Math.max(4, Math.min(12, Math.round(62 / plantSpacing)));
  const field = { x: 70, y: 58, width: 860, height: 444 };
  const mainAllocation = Number(layout.main_crop_allocated_area_sqm) || 0;
  const intercropAllocation = Number(layout.intercrop_allocated_area_sqm) || 0;
  const allocationRatio = mainAllocation + intercropAllocation > 0 ? mainAllocation / (mainAllocation + intercropAllocation) : 0.7;
  const rowGap = field.height / (mainRows + 1);
  const cropShortName = (crop) => String(crop || '').split(' ').map((word) => word[0]).join('').slice(0, 3).toUpperCase();
  const mainSymbol = (x, y, index) => <g key={`main-${index}`} className="layout-plant layout-main-plant" onMouseEnter={() => setSelectedCrop('main')} onClick={() => setSelectedCrop('main')}><ellipse cx={x} cy={y + 13} rx="17" ry="5" fill="#9a713e" opacity=".34" /><path d={`M ${x} ${y + 12} C ${x - 3} ${y + 3}, ${x - 3} ${y - 7}, ${x} ${y - 15}`} stroke="#6b4a2d" strokeWidth="4" fill="none" /><circle cx={x - 8} cy={y - 12} r="12" fill="#2f6539" /><circle cx={x + 7} cy={y - 10} r="13" fill="#3f7b43" /><circle cx={x} cy={y - 20} r="11" fill="#548d4b" /></g>;
  const intercropSymbol = (x, y, index) => <g key={`inter-${index}`} className="layout-plant layout-intercrop-plant" onMouseEnter={() => setSelectedCrop('intercrop')} onClick={() => setSelectedCrop('intercrop')}><ellipse cx={x} cy={y + 8} rx="11" ry="4" fill="#9a713e" opacity=".3" /><path d={`M ${x} ${y + 8} C ${x - 2} ${y}, ${x + 3} ${y - 6}, ${x} ${y - 15}`} stroke="#3d6c38" strokeWidth="2.5" fill="none" /><path d={`M ${x} ${y - 5} Q ${x - 10} ${y - 12} ${x - 11} ${y - 3} Q ${x - 4} ${y + 1} ${x} ${y - 5} M ${x + 1} ${y - 9} Q ${x + 10} ${y - 16} ${x + 11} ${y - 7} Q ${x + 5} ${y - 3} ${x + 1} ${y - 9}`} fill="#6b9b48" /></g>;
  const schematicPlants = [];
  for (let row = 1; row <= mainRows; row += 1) {
    const y = field.y + rowGap * row;
    if (showMain) for (let plant = 0; plant < plantsPerRow; plant += 1) schematicPlants.push(mainSymbol(field.x + 45 + plant * ((field.width - 90) / (plantsPerRow - 1)), y, `${row}-${plant}`));
    if (showIntercrop) {
      const intercropY = y + rowGap / 2;
      for (let plant = 0; plant < plantsPerRow * 2 - 1; plant += 1) schematicPlants.push(intercropSymbol(field.x + 45 + plant * ((field.width - 90) / (plantsPerRow * 2 - 2)), intercropY, `${row}-${plant}`));
    }
  }
  const selectedDetails = selectedCrop === 'main'
    ? { name: layout.main_crop, count: layout.main_crop_plant_count, area: layout.main_crop_allocated_area_sqm, spacing: layout.main_crop_spacing, role: 'Main crop' }
    : selectedCrop === 'intercrop'
      ? { name: layout.intercrop, count: layout.intercrop_plant_count, area: layout.intercrop_allocated_area_sqm, spacing: layout.intercrop_spacing, role: 'Intercrop' }
      : null;

  return (
    <section className="hybrid-results">
      <div className="hybrid-result-summary">
        <div><span className="workspace-eyebrow">GENERATED FARM LAYOUT</span><h2>{layout.main_crop} + {layout.intercrop}.</h2><p>{displayValue(layout.planting_pattern_summary)}</p></div>
        <div className="hybrid-result-stat"><strong>{displayValue(layout.usable_cultivated_area_sqm, ' m²')}</strong><span>usable cultivated area</span></div>
      </div>
      <div className="hybrid-layout-visual-card">
        <div className="hybrid-layout-visual-toolbar">
          <div><span className="workspace-eyebrow">SCHEMATIC FIELD VIEW</span><p>Representative arrangement based on returned spacing and row data. It is not a geographic boundary or exact plant map.</p></div>
          <div className="layout-view-switcher" role="group" aria-label="Farm layout view"><button type="button" className={view === '2d' ? 'is-active' : ''} onClick={() => setView('2d')}><Ruler size={14} />2D plan</button><button type="button" className={view === '3d' ? 'is-active' : ''} onClick={() => setView('3d')}><Box size={14} />3D isometric</button></div>
        </div>
        <div className="layout-visual-controls"><button type="button" onClick={() => setShowMain((value) => !value)} className={showMain ? 'is-on' : ''}>{showMain ? <Eye size={14} /> : <EyeOff size={14} />} {cropShortName(layout.main_crop)}</button><button type="button" onClick={() => setShowIntercrop((value) => !value)} className={showIntercrop ? 'is-on' : ''}>{showIntercrop ? <Eye size={14} /> : <EyeOff size={14} />} {cropShortName(layout.intercrop)}</button>{view === '2d' && <span className="layout-zoom-controls"><button type="button" onClick={() => setZoom((value) => Math.max(.85, value - .1))} aria-label="Zoom out"><ZoomOut size={14} /></button><strong>{Math.round(zoom * 100)}%</strong><button type="button" onClick={() => setZoom((value) => Math.min(1.25, value + .1))} aria-label="Zoom in"><ZoomIn size={14} /></button></span>}{view === '3d' && <button type="button" className="layout-reset-button" onClick={() => setResetToken((value) => value + 1)}><RotateCcw size={14} /> Reset view</button>}</div>
        <div className={`layout-viewport layout-view-${view}`}>{view === '2d' ? <svg className="layout-svg" viewBox="0 0 1000 560" role="img" aria-label={`Top-down schematic of ${layout.main_crop} and ${layout.intercrop} planting`}><g transform={`scale(${zoom}) translate(${(1 - zoom) * 500 / zoom}, ${(1 - zoom) * 280 / zoom})`}><rect x={field.x} y={field.y} width={field.width} height={field.height} rx="22" fill="#b28a52" opacity=".55" /><path d={`M ${field.x + field.width * allocationRatio} ${field.y} V ${field.y + field.height}`} stroke="#e8d2a4" strokeDasharray="7 7" opacity=".7" />{Array.from({ length: mainRows }, (_, index) => <line key={`row-${index}`} x1={field.x + 24} x2={field.x + field.width - 24} y1={field.y + rowGap * (index + 1)} y2={field.y + rowGap * (index + 1)} stroke="#7ea163" strokeDasharray="3 8" opacity=".55" />)}{showIntercrop && <path d={`M ${field.x + 20} ${field.y + field.height - 25} H ${field.x + field.width - 20}`} stroke="#6b9b48" strokeWidth="5" opacity=".65" />}{showMain && schematicPlants.filter((plant) => plant.key?.startsWith('main-'))}{showIntercrop && schematicPlants.filter((plant) => plant.key?.startsWith('inter-'))}<rect x={field.x} y={field.y} width={field.width} height={field.height} rx="22" fill="none" stroke="#315a2b" strokeWidth="4" />{layout.irrigation_line_layout && <g className="layout-irrigation"><path d={`M ${field.x + 18} ${field.y + 18} H ${field.x + field.width - 18}`} stroke="#4b8aa3" strokeWidth="3" strokeDasharray="8 7" /><text x="84" y="42" fill="#326b83" fontSize="13">Irrigation layout returned</text></g>}</g></svg> : <Suspense fallback={<div className="layout-webgl-fallback">Loading the 3D farm renderer...</div>}><FarmLayout3D layout={layout} showMain={showMain} showIntercrop={showIntercrop} selectedCrop={selectedCrop} onSelectCrop={setSelectedCrop} resetToken={resetToken} /></Suspense>}</div>
        <div className="layout-legend"><span><i className="layout-legend-main" />{layout.main_crop}</span><span><i className="layout-legend-inter" />{layout.intercrop}</span>{layout.irrigation_line_layout && <span><i className="layout-legend-water" />Irrigation lines</span>}<span><i className="layout-legend-boundary" />Field boundary</span></div>
        {selectedDetails && <div className="layout-selected-details"><div><span className="workspace-eyebrow">SELECTED CROP</span><h3>{selectedDetails.name}</h3></div><div><span>Role</span><strong>{selectedDetails.role}</strong></div><div><span>Plant count</span><strong>{displayValue(selectedDetails.count)}</strong></div><div><span>Allocated area</span><strong>{displayValue(selectedDetails.area, ' m²')}</strong></div><div><span>Spacing</span><strong>{formatObject(selectedDetails.spacing)}</strong></div></div>}
      </div>
      <div className="hybrid-layout-stats"><div><span>Total farm area</span><strong>{displayValue(layout.total_farm_area_sqm, ' m²')}</strong></div><div><span>Main crop allocation</span><strong>{displayValue(layout.main_crop_allocated_area_sqm, ' m²')}</strong></div><div><span>Intercrop allocation</span><strong>{displayValue(layout.intercrop_allocated_area_sqm, ' m²')}</strong></div><div><span>Plant counts</span><strong>{displayValue(layout.main_crop_plant_count)} / {displayValue(layout.intercrop_plant_count)}</strong><small>Main / intercrop</small></div></div>
      <div className="hybrid-layout-grid"><article className="hybrid-layout-card"><Ruler size={17} /><div><span className="workspace-eyebrow">SPACING</span><h3>Crop-wise spacing</h3><p><strong>{layout.main_crop}</strong> · {formatObject(layout.main_crop_spacing)}</p><p><strong>{layout.intercrop}</strong> · {formatObject(layout.intercrop_spacing)}</p></div></article><article className="hybrid-layout-card"><Sprout size={17} /><div><span className="workspace-eyebrow">ARRANGEMENT</span><h3>Row arrangement</h3><p>{formatObject(layout.row_arrangement)}</p><p>{displayValue(layout.irrigation_line_layout)}</p></div></article></div>
      <div className="hybrid-calendar"><div><span className="workspace-eyebrow">PLANTING CALENDAR</span><h3>Plan milestones.</h3></div>{layout.planting_calendar?.length ? layout.planting_calendar.map((entry, index) => <div key={`${entry.stage || entry.date || index}`} className="hybrid-calendar-row"><strong>{entry.stage || entry.activity || entry.date || `Step ${index + 1}`}</strong><span>{Object.entries(entry).filter(([key]) => !['stage', 'activity', 'date'].includes(key)).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' · ') || entry.date || 'Details unavailable'}</span></div>) : <p className="text-sm text-slate-500">No planting calendar was returned.</p>}</div>
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

function ProfitResult({ profit }) {
  const money = (value) => value === null || value === undefined ? 'Unavailable' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const number = (value, suffix = '') => value === null || value === undefined ? 'Unavailable' : `${value}${suffix}`;

  return (
    <section className="hybrid-results hybrid-profit-results">
      <div className="hybrid-result-summary">
        <div>
          <span className="workspace-eyebrow">PROFIT ESTIMATE</span>
          <h2>{profit.main_crop}{profit.intercrop ? ` + ${profit.intercrop}` : ''} economics.</h2>
          <p>{number(profit.farm_area_hectares, ' ha')} · backend scenario estimates</p>
        </div>
        <div className="hybrid-result-stat"><strong>{money(profit.scenarios?.expected_realistic?.net_profit_inr)}</strong><span>expected net profit</span></div>
      </div>
      <div className="hybrid-layout-stats">
        <div><span>Initial investment</span><strong>{money(profit.initial_capital_investment_inr)}</strong></div>
        <div><span>Expected revenue</span><strong>{money(profit.scenarios?.expected_realistic?.total_gross_revenue_inr)}</strong></div>
        <div><span>Profit / hectare</span><strong>{money(profit.scenarios?.expected_realistic?.profit_per_hectare_inr)}</strong></div>
        <div><span>Expected ROI</span><strong>{number(profit.scenarios?.expected_realistic?.roi_pct, '%')}</strong></div>
      </div>
      <div className="hybrid-profit-scenarios">
        {Object.entries(profit.scenarios || {}).map(([key, scenario]) => (
          <article key={key} className={key === 'expected_realistic' ? 'is-expected' : ''}>
            <span className="workspace-eyebrow">{scenario.scenario_name}</span>
            <strong>{money(scenario.net_profit_inr)}</strong>
            <p>Revenue {money(scenario.total_gross_revenue_inr)} · Expenses {money(scenario.total_operating_expenses_inr)}</p>
            <p>{number(scenario.profit_per_acre_inr, ' / acre')} · {number(scenario.roi_pct, '% ROI')} · {number(scenario.break_even_months, ' months to break even')}</p>
            <div className="hybrid-financial-lines">
              <span>Main crop revenue <b>{money(scenario.main_crop_revenue_inr)}</b></span>
              <span>Intercrop revenue <b>{money(scenario.intercrop_revenue_inr)}</b></span>
            </div>
          </article>
        ))}
      </div>
      <div className="hybrid-profit-grid">
        <article className="hybrid-layout-card"><TrendingUp size={17} /><div><span className="workspace-eyebrow">OPERATING EXPENSES</span><h3>Cost breakdown.</h3>{Object.entries(profit.operating_expenses_breakdown || {}).map(([key, value]) => <p key={key}>{key.replaceAll('_', ' ')} <strong>{money(value)}</strong></p>)}</div></article>
        <article className="hybrid-layout-card"><Leaf size={17} /><div><span className="workspace-eyebrow">MONOCULTURE COMPARISON</span><h3>Incremental gain.</h3><p>Monoculture net profit <strong>{money(profit.hybrid_gain_vs_monoculture?.monoculture_net_profit_inr)}</strong></p><p>Hybrid net profit <strong>{money(profit.hybrid_gain_vs_monoculture?.hybrid_net_profit_inr)}</strong></p><p>Additional profit <strong>{money(profit.hybrid_gain_vs_monoculture?.additional_net_profit_inr)}</strong></p><p>Income increase <strong>{number(profit.hybrid_gain_vs_monoculture?.percentage_income_increase, '%')}</strong></p></div></article>
      </div>
      <div className="hybrid-principles"><TrendingUp size={18} /><div><span className="workspace-eyebrow">ASSUMPTIONS</span>{profit.financial_assumptions?.length ? <ul>{profit.financial_assumptions.map((assumption, index) => <li key={`${assumption}-${index}`}>{assumption}</li>)}</ul> : <p>No assumptions were returned.</p>}<small>{profit.hybrid_gain_vs_monoculture?.summary || 'Comparison summary unavailable.'}</small></div></div>
    </section>
  );
}

function ProductResults({ products }) {
  const money = (value) => value === null || value === undefined ? 'Unavailable' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const value = (item, suffix = '') => item === null || item === undefined || item === '' ? 'Unavailable' : `${item}${suffix}`;

  return (
    <section className="hybrid-results hybrid-product-results">
      <div className="hybrid-result-summary">
        <div>
          <span className="workspace-eyebrow">VALUE-ADDED PRODUCTS</span>
          <h2>More ways to use the harvest.</h2>
          <p>{products.length} backend product opportunities returned for the selected crop.</p>
        </div>
        <div className="hybrid-result-stat"><strong>{products.length}</strong><span>product options</span></div>
      </div>
      <div className="hybrid-product-grid">
        {products.map((product) => (
          <article className="hybrid-product-card" key={product.product_id}>
            <div className="flex items-start justify-between gap-3">
              <div><span className="workspace-eyebrow">{product.processing_stage}</span><h3>{product.product_name}</h3><p>{product.product_id} · {product.crop_id}</p></div>
              <strong className="hybrid-product-margin">{value(product.gross_margin_pct, '%')}<small>margin</small></strong>
            </div>
            <div className="hybrid-product-lines">
              <p><span>Processing scale</span><strong>{value(product.processing_scale)}</strong></p>
              <p><span>Processing method</span><strong>{value(product.processing_method)}</strong></p>
              <p><span>Raw input</span><strong>{value(product.raw_input_kg, ' kg')}</strong></p>
              <p><span>Output product</span><strong>{value(product.output_product_kg, ' kg')}</strong></p>
              <p><span>Recovery rate</span><strong>{value(product.recovery_rate_pct, '%')}</strong></p>
              <p><span>Farmgate price</span><strong>{money(product.typical_farmgate_price_per_kg_inr)} / kg</strong></p>
              <p><span>Selling price</span><strong>{money(product.typical_selling_price_per_kg_inr)} / kg</strong></p>
              <p><span>Processing cost</span><strong>{money(product.processing_cost_per_kg_input_inr)} / input kg</strong></p>
              <p><span>Packaging cost</span><strong>{money(product.packaging_cost_per_kg_output_inr)} / output kg</strong></p>
              <p><span>Equipment</span><strong>{value(product.equipment_required)}</strong></p>
              <p><span>Licences</span><strong>{value(product.licenses_required)}</strong></p>
            </div>
            <div className="hybrid-product-limitations"><span>Limitations</span><p>{value(product.limitations)}</p></div>
          </article>
        ))}
      </div>
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
  const [profitForm, setProfitForm] = useState({
    main_crop: '',
    intercrop: '',
    farm_area_hectares: '',
    custom_main_yield_kg: '',
    custom_main_price_per_kg: '',
    custom_inter_yield_kg: '',
    custom_inter_price_per_kg: '',
    custom_additional_investment_inr: '',
  });
  const [profitResult, setProfitResult] = useState(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [profitError, setProfitError] = useState('');
  const [comparisonForm, setComparisonForm] = useState({
    main_crop: '',
    intercrop: '',
    farm_area_hectares: '',
    custom_main_yield_kg: '',
    custom_main_price_per_kg: '',
    custom_inter_yield_kg: '',
    custom_inter_price_per_kg: '',
    custom_additional_investment_inr: '',
  });
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [productCrop, setProductCrop] = useState('');
  const [productResults, setProductResults] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const [planForm, setPlanForm] = useState({ plan_name: '', main_crop: '', intercrop: '', farm_area_hectares: '', plant_count_summary: '', net_profit_expected_inr: '', roi_pct: '', notes: '' });
  const [savedPlans, setSavedPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSuccess, setPlanSuccess] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDetailsLoading, setPlanDetailsLoading] = useState(false);
  const [planDetailsError, setPlanDetailsError] = useState('');
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
        setProfitForm((current) => ({
          ...current,
          main_crop: active.crop || '',
          farm_area_hectares: active.farm_area_hectares || '',
        }));
        setComparisonForm((current) => ({
          ...current,
          main_crop: active.crop || '',
          farm_area_hectares: active.farm_area_hectares || '',
        }));
        setProductCrop(active.crop || '');
        setPlanForm((current) => ({ ...current, main_crop: active.crop || '', farm_area_hectares: active.farm_area_hectares || '' }));
      }
    } catch (loadError) {
      setFarmError(loadError?.message || 'Could not load farms for hybrid recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
    const refresh = () => {
      loadFarms();
      loadSavedPlans();
    };
    window.addEventListener('agr002_active_farm_changed', refresh);
    window.addEventListener('agr002_farm_updated', refresh);
    window.addEventListener('agr002_mock_mode_changed', refresh);
    return () => {
      window.removeEventListener('agr002_active_farm_changed', refresh);
      window.removeEventListener('agr002_farm_updated', refresh);
      window.removeEventListener('agr002_mock_mode_changed', refresh);
    };
  }, []);

  const loadSavedPlans = async () => {
    if (isMockMode()) {
      setSavedPlans([]);
      setPlansError('');
      return;
    }
    setPlansLoading(true);
    setPlansError('');
    try {
      const plans = await listHybridPlans();
      setSavedPlans(Array.isArray(plans) ? plans : []);
    } catch (plansLoadError) {
      setPlansError(plansLoadError?.message || 'Could not load saved farming plans.');
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    loadSavedPlans();
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
    setProfitForm((current) => ({ ...current, main_crop: farm?.crop || '', farm_area_hectares: farm?.farm_area_hectares || '' }));
    setComparisonForm((current) => ({ ...current, main_crop: farm?.crop || '', farm_area_hectares: farm?.farm_area_hectares || '' }));
    setProductCrop(farm?.crop || '');
    setPlanForm((current) => ({ ...current, main_crop: farm?.crop || '', farm_area_hectares: farm?.farm_area_hectares || '' }));
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

  const updateProfitForm = (event) => {
    const { name, value, type } = event.target;
    setProfitForm((current) => ({ ...current, [name]: type === 'number' && value !== '' ? Number(value) : value }));
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
      const response = await generateFarmLayout(payload);
      if (requestId === layoutRequestSequence.current) {
        setLayoutResult(response);
        setIrrigationForm((current) => ({ ...current, intercrop: current.intercrop || response.intercrop }));
        setProfitForm((current) => ({ ...current, intercrop: current.intercrop || response.intercrop }));
        setComparisonForm((current) => ({ ...current, intercrop: current.intercrop || response.intercrop }));
        setPlanForm((current) => ({
          ...current,
          main_crop: current.main_crop || response.main_crop || '',
          intercrop: current.intercrop || response.intercrop || '',
          farm_area_hectares: current.farm_area_hectares || form.farm_area_hectares || '',
          plant_count_summary: `${response.main_crop_plant_count ?? 'Unavailable'} main / ${response.intercrop_plant_count ?? 'Unavailable'} intercrop plants`,
        }));
      }
    } catch (requestError) {
      if (requestId === layoutRequestSequence.current) setLayoutError(requestError?.message || 'Could not generate the farm layout.');
    } finally {
      if (requestId === layoutRequestSequence.current) setLayoutSubmitting(false);
    }
  };

  const generateProfit = async (event) => {
    event.preventDefault();
    if (profitLoading) return;
    if (!profitForm.main_crop?.trim() || !profitForm.farm_area_hectares || Number(profitForm.farm_area_hectares) <= 0) {
      setProfitError('Main crop and a positive farm area are required.');
      return;
    }
    if (isMockMode()) {
      setProfitError('Profit estimates require Live API mode. Switch off Demo Mode to request the backend calculation.');
      return;
    }
    setProfitLoading(true);
    setProfitError('');
    setProfitResult(null);
    try {
      const optionalFields = ['custom_main_yield_kg', 'custom_main_price_per_kg', 'custom_inter_yield_kg', 'custom_inter_price_per_kg', 'custom_additional_investment_inr'];
      const payload = {
        farm_area_hectares: Number(profitForm.farm_area_hectares),
        main_crop: profitForm.main_crop.trim(),
        intercrop: profitForm.intercrop?.trim() || undefined,
      };
      optionalFields.forEach((field) => {
        if (profitForm[field] !== '' && profitForm[field] !== undefined && profitForm[field] !== null) payload[field] = Number(profitForm[field]);
      });
      const response = await estimateHybridProfit(payload);
      setProfitResult(response);
      const expected = response.scenarios?.expected_realistic;
      setPlanForm((current) => ({
        ...current,
        main_crop: current.main_crop || response.main_crop || '',
        intercrop: current.intercrop || response.intercrop || '',
        farm_area_hectares: current.farm_area_hectares || response.farm_area_hectares || '',
        net_profit_expected_inr: expected?.net_profit_inr ?? '',
        roi_pct: expected?.roi_pct ?? '',
      }));
    } catch (requestError) {
      setProfitError(requestError?.message || 'Could not calculate the profit estimate.');
    } finally {
      setProfitLoading(false);
    }
  };

  const generateComparison = async (event) => {
    event.preventDefault();
    if (comparisonLoading) return;
    if (!comparisonForm.main_crop?.trim() || !comparisonForm.intercrop?.trim() || !comparisonForm.farm_area_hectares || Number(comparisonForm.farm_area_hectares) <= 0) {
      setComparisonError('Main crop, intercrop, and a positive farm area are required for comparison.');
      return;
    }
    if (isMockMode()) {
      setComparisonError('Profit comparison requires Live API mode. Switch off Demo Mode to request the backend comparison.');
      return;
    }
    setComparisonLoading(true);
    setComparisonError('');
    setComparisonResult(null);
    try {
      const optionalFields = ['custom_main_yield_kg', 'custom_main_price_per_kg', 'custom_inter_yield_kg', 'custom_inter_price_per_kg', 'custom_additional_investment_inr'];
      const payload = {
        farm_area_hectares: Number(comparisonForm.farm_area_hectares),
        main_crop: comparisonForm.main_crop.trim(),
        intercrop: comparisonForm.intercrop.trim(),
      };

      optionalFields.forEach((field) => {
        if (comparisonForm[field] !== '' && comparisonForm[field] !== undefined && comparisonForm[field] !== null) payload[field] = Number(comparisonForm[field]);
      });
      setComparisonResult(await compareHybridProfit(payload));
    } catch (requestError) {
      setComparisonError(requestError?.message || 'Could not compare hybrid profit.');
    } finally {
      setComparisonLoading(false);
    }
  };

  const loadProducts = async (event) => {
    event.preventDefault();
    if (productLoading) return;
    if (!productCrop.trim()) {
      setProductError('Select or enter a crop before loading product recommendations.');
      return;
    }
    if (isMockMode()) {
      setProductError('Product recommendations require Live API mode. Switch off Demo Mode to request backend products.');
      return;
    }
    setProductLoading(true);
    setProductError('');
    setProductResults(null);
    try {
      const products = await listValueAddedProducts(productCrop.trim());
      setProductResults(Array.isArray(products) ? products : []);
    } catch (requestError) {
      setProductError(requestError?.message || 'Could not load crop product recommendations.');
    } finally {
      setProductLoading(false);
    }
  };

  const updatePlanForm = (event) => {
    const { name, value, type } = event.target;
    setPlanForm((current) => ({ ...current, [name]: type === 'number' && value !== '' ? Number(value) : value }));
  };

  const savePlan = async (event) => {
    event.preventDefault();
    if (savingPlan) return;
    if (!planForm.plan_name.trim() || !planForm.main_crop.trim() || !planForm.intercrop.trim() || !planForm.farm_area_hectares || Number(planForm.farm_area_hectares) <= 0) {
      setPlansError('Plan name, main crop, intercrop, and a positive farm area are required.');
      setPlanSuccess('');
      return;
    }
    if (isMockMode()) {
      setPlansError('Saved farming plans require Live API mode. Switch off Demo Mode to save a backend plan.');
      setPlanSuccess('');
      return;
    }
    setSavingPlan(true);
    setPlansError('');
    setPlanSuccess('');
    try {
      const payload = {
        ...(selectedFarm?.id !== undefined ? { farm_id: selectedFarm.id } : {}),
        plan_name: planForm.plan_name.trim(),
        main_crop: planForm.main_crop.trim(),
        intercrop: planForm.intercrop.trim(),
        farm_area_hectares: Number(planForm.farm_area_hectares),
        plant_count_summary: planForm.plant_count_summary.trim() || undefined,
        net_profit_expected_inr: planForm.net_profit_expected_inr === '' ? undefined : Number(planForm.net_profit_expected_inr),
        roi_pct: planForm.roi_pct === '' ? undefined : Number(planForm.roi_pct),
        notes: planForm.notes.trim() || undefined,
      };
      const saved = await saveHybridPlan(payload);
      setSavedPlans((current) => [saved, ...current]);
      setPlanSuccess(`Saved "${saved.plan_name || payload.plan_name}".`);
      setPlanForm((current) => ({ ...current, plan_name: '', notes: '' }));
    } catch (saveError) {
      setPlansError(saveError?.message || 'Could not save this farming plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const loadPlanDetails = async (plan) => {
    setPlanDetailsError('');
    setSelectedPlan(plan);
    if (plan?.id === undefined) return;
    setPlanDetailsLoading(true);
    try {
      setSelectedPlan(await getHybridPlan(plan.id));
    } catch (detailsError) {
      setPlanDetailsError(detailsError?.message || 'Could not load plan details.');
    } finally {
      setPlanDetailsLoading(false);
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
        if (firstCandidate) {
          setIrrigationForm((current) => ({ ...current, intercrop: current.intercrop || firstCandidate.crop_id }));
          setProfitForm((current) => ({ ...current, intercrop: current.intercrop || firstCandidate.crop_id }));
          setComparisonForm((current) => ({ ...current, intercrop: current.intercrop || firstCandidate.crop_id }));
          setPlanForm((current) => ({ ...current, main_crop: current.main_crop || response.main_crop || '', intercrop: current.intercrop || firstCandidate.crop_id, farm_area_hectares: current.farm_area_hectares || response.farm_area_hectares || '' }));
        }
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

      <section className="hybrid-input-panel hybrid-profit-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><TrendingUp size={20} /></div>
          <div><span className="workspace-eyebrow">PROFIT / 05</span><h2>Understand the upside.</h2><p>Compare backend-generated conservative, expected, and optimistic financial scenarios.</p></div>
        </div>
        <form onSubmit={generateProfit} className="hybrid-form">
          <label>Main crop<input name="main_crop" value={profitForm.main_crop} onChange={updateProfitForm} placeholder="Required" required /></label>
          <label>Intercrop<input name="intercrop" list="hybrid-profit-crops" value={profitForm.intercrop} onChange={updateProfitForm} placeholder="Optional" /><datalist id="hybrid-profit-crops">{result?.recommendations?.map((candidate) => <option key={candidate.crop_id} value={candidate.crop_id}>{candidate.crop_name}</option>)}{layoutResult?.intercrop && <option value={layoutResult.intercrop} />}</datalist></label>
          <label>Farm area (hectares)<input name="farm_area_hectares" type="number" min="0.01" step="0.01" value={profitForm.farm_area_hectares} onChange={updateProfitForm} required /></label>
          <label>Main yield (kg)<input name="custom_main_yield_kg" type="number" min="0" step="0.01" value={profitForm.custom_main_yield_kg} onChange={updateProfitForm} placeholder="Backend default" /></label>
          <label>Main price (₹/kg)<input name="custom_main_price_per_kg" type="number" min="0" step="0.01" value={profitForm.custom_main_price_per_kg} onChange={updateProfitForm} placeholder="Backend default" /></label>
          <label>Intercrop yield (kg)<input name="custom_inter_yield_kg" type="number" min="0" step="0.01" value={profitForm.custom_inter_yield_kg} onChange={updateProfitForm} placeholder="Backend default" /></label>
          <label>Intercrop price (₹/kg)<input name="custom_inter_price_per_kg" type="number" min="0" step="0.01" value={profitForm.custom_inter_price_per_kg} onChange={updateProfitForm} placeholder="Backend default" /></label>
          <label>Additional investment (₹)<input name="custom_additional_investment_inr" type="number" min="0" step="0.01" value={profitForm.custom_additional_investment_inr} onChange={updateProfitForm} placeholder="Backend default" /></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={profitLoading}><TrendingUp size={16} />{profitLoading ? 'Calculating...' : 'Generate profit estimate'}</button>
        </form>
      </section>

      {profitError && <div className="history-notice"><AlertCircle size={16} />{profitError}<button type="button" onClick={() => setProfitError('')} aria-label="Dismiss profit error">Dismiss</button></div>}
      {!profitResult && !profitError && <div className="hybrid-empty-result">Enter a main crop and farm area to compare hybrid farming scenarios.</div>}
      {profitResult && <ProfitResult profit={profitResult} />}

      <section className="hybrid-input-panel hybrid-comparison-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><TrendingUp size={20} /></div>
          <div><span className="workspace-eyebrow">COMPARISON / 06</span><h2>Compare one hybrid combination.</h2><p>The backend compares this main crop and intercrop against the main crop grown alone.</p></div>
        </div>
        <form onSubmit={generateComparison} className="hybrid-form">
          <label>Main crop<input name="main_crop" value={comparisonForm.main_crop} onChange={updateComparisonForm} placeholder="Required" required /></label>
          <label>Intercrop<input name="intercrop" list="hybrid-comparison-crops" value={comparisonForm.intercrop} onChange={updateComparisonForm} placeholder="Required" required /><datalist id="hybrid-comparison-crops">{result?.recommendations?.map((candidate) => <option key={candidate.crop_id} value={candidate.crop_id}>{candidate.crop_name}</option>)}{layoutResult?.intercrop && <option value={layoutResult.intercrop} />}</datalist></label>
          <label>Farm area (hectares)<input name="farm_area_hectares" type="number" min="0.01" step="0.01" value={comparisonForm.farm_area_hectares} onChange={updateComparisonForm} required /></label>
          <label>Main yield (kg)<input name="custom_main_yield_kg" type="number" min="0" step="0.01" value={comparisonForm.custom_main_yield_kg} onChange={updateComparisonForm} placeholder="Backend default" /></label>
          <label>Main price (₹/kg)<input name="custom_main_price_per_kg" type="number" min="0" step="0.01" value={comparisonForm.custom_main_price_per_kg} onChange={updateComparisonForm} placeholder="Backend default" /></label>
          <label>Intercrop yield (kg)<input name="custom_inter_yield_kg" type="number" min="0" step="0.01" value={comparisonForm.custom_inter_yield_kg} onChange={updateComparisonForm} placeholder="Backend default" /></label>
          <label>Intercrop price (₹/kg)<input name="custom_inter_price_per_kg" type="number" min="0" step="0.01" value={comparisonForm.custom_inter_price_per_kg} onChange={updateComparisonForm} placeholder="Backend default" /></label>
          <label>Additional investment (₹)<input name="custom_additional_investment_inr" type="number" min="0" step="0.01" value={comparisonForm.custom_additional_investment_inr} onChange={updateComparisonForm} placeholder="Backend default" /></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={comparisonLoading}><TrendingUp size={16} />{comparisonLoading ? 'Comparing...' : 'Compare profitability'}</button>
        </form>
      </section>

      {comparisonError && <div className="history-notice"><AlertCircle size={16} />{comparisonError}<button type="button" onClick={() => setComparisonError('')} aria-label="Dismiss comparison error">Dismiss</button></div>}
      {!comparisonResult && !comparisonError && <div className="hybrid-empty-result">Choose a main crop and intercrop to compare the hybrid combination with monoculture.</div>}
      {comparisonResult && <ProfitResult profit={comparisonResult} />}

      <section className="hybrid-input-panel hybrid-product-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Leaf size={20} /></div>
          <div><span className="workspace-eyebrow">PRODUCTS / 07</span><h2>Explore value-added paths.</h2><p>Load product opportunities returned for a farm crop or a hybrid recommendation.</p></div>
        </div>
        <form onSubmit={loadProducts} className="hybrid-guide-form">
          <label>Crop products<input list="hybrid-product-crops" value={productCrop} onChange={(event) => { setProductCrop(event.target.value); setProductResults(null); setProductError(''); }} placeholder="Select or enter a crop" required /><datalist id="hybrid-product-crops">{selectedFarm?.crop && <option value={selectedFarm.crop}>{selectedFarm.crop} (farm crop)</option>}{result?.recommendations?.map((candidate) => <option key={candidate.crop_id} value={candidate.crop_id}>{candidate.crop_name}</option>)}{layoutResult?.intercrop && <option value={layoutResult.intercrop} />}</datalist></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={productLoading}><Leaf size={16} />{productLoading ? 'Loading products...' : 'Load product recommendations'}</button>
        </form>
      </section>

      {productError && <div className="history-notice"><AlertCircle size={16} />{productError}<button type="button" onClick={() => setProductError('')} aria-label="Dismiss product error">Dismiss</button></div>}
      {!productResults && !productError && <div className="hybrid-empty-result">Select a crop to view backend-provided value-added product opportunities.</div>}
      {productResults && (productResults.length ? <ProductResults products={productResults} /> : <div className="hybrid-empty-result">No product opportunities were returned for this crop.</div>)}

      <section className="hybrid-input-panel hybrid-plans-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Sprout size={20} /></div>
          <div><span className="workspace-eyebrow">PLANS / 08</span><h2>Keep the field plan.</h2><p>Save a complete hybrid combination and the backend-supported financial or layout details for later review.</p></div>
        </div>
        <form onSubmit={savePlan} className="hybrid-form">
          <label>Plan name<input name="plan_name" value={planForm.plan_name} onChange={updatePlanForm} placeholder="Required" maxLength="120" required /></label>
          <label>Main crop<input name="main_crop" value={planForm.main_crop} onChange={updatePlanForm} placeholder="Required" required /></label>
          <label>Intercrop<input name="intercrop" list="hybrid-plan-crops" value={planForm.intercrop} onChange={updatePlanForm} placeholder="Required" required /><datalist id="hybrid-plan-crops">{result?.recommendations?.map((candidate) => <option key={candidate.crop_id} value={candidate.crop_id}>{candidate.crop_name}</option>)}{layoutResult?.intercrop && <option value={layoutResult.intercrop} />}</datalist></label>
          <label>Farm area (hectares)<input name="farm_area_hectares" type="number" min="0.01" step="0.01" value={planForm.farm_area_hectares} onChange={updatePlanForm} required /></label>
          <label>Plant count summary<input name="plant_count_summary" value={planForm.plant_count_summary} onChange={updatePlanForm} placeholder="Optional; use generated layout data" /></label>
          <label>Expected net profit (₹)<input name="net_profit_expected_inr" type="number" min="0" step="0.01" value={planForm.net_profit_expected_inr} onChange={updatePlanForm} placeholder="Optional; use returned estimate" /></label>
          <label>Expected ROI (%)<input name="roi_pct" type="number" step="0.1" value={planForm.roi_pct} onChange={updatePlanForm} placeholder="Optional; use returned estimate" /></label>
          <label>Notes<input name="notes" value={planForm.notes} onChange={updatePlanForm} placeholder="Optional" /></label>
          <button type="submit" className="auth-submit hybrid-submit" disabled={savingPlan}><Sprout size={16} />{savingPlan ? 'Saving plan...' : 'Save farming plan'}</button>
        </form>
      </section>

      {plansError && <div className="history-notice"><AlertCircle size={16} />{plansError}<button type="button" onClick={() => setPlansError('')} aria-label="Dismiss plan error">Dismiss</button></div>}
      {planSuccess && <div className="history-notice hybrid-success-notice"><Sprout size={16} />{planSuccess}</div>}

      <section className="hybrid-saved-plans">
        <div className="hybrid-result-summary"><div><span className="workspace-eyebrow">SAVED PLANS</span><h2>Return to a field decision.</h2><p>Plans are listed from the backend record store; no ownership or privacy claim is made.</p></div><button type="button" className="outline-action" onClick={loadSavedPlans} disabled={plansLoading}><RefreshCw size={15} />{plansLoading ? 'Refreshing...' : 'Refresh plans'}</button></div>
        {isMockMode() ? <div className="hybrid-empty-result">Saved plans require Live API mode.</div> : plansLoading ? <LoadingState message="Loading saved plans..." /> : savedPlans.length ? <div className="hybrid-saved-plan-grid">{savedPlans.map((plan) => <article className="hybrid-saved-plan" key={plan.id}><div><span className="workspace-eyebrow">{plan.created_at ? new Date(plan.created_at).toLocaleDateString() : 'DATE UNAVAILABLE'}</span><h3>{plan.plan_name || 'Unnamed plan'}</h3><p>{plan.main_crop || 'Main crop unavailable'} + {plan.intercrop || 'Intercrop unavailable'}</p></div><div className="hybrid-saved-plan-meta"><span>{plan.farm_area_hectares ?? 'Unavailable'} ha</span>{plan.roi_pct !== null && plan.roi_pct !== undefined && <span>{plan.roi_pct}% ROI</span>}</div><button type="button" className="hybrid-expand" onClick={() => loadPlanDetails(plan)}>View details <ChevronDown size={15} /></button></article>)}</div> : <div className="hybrid-empty-result">No saved plans were returned.</div>}
      </section>

      {selectedPlan && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-xl"><div className="flex items-start justify-between gap-3 mb-4"><div><span className="workspace-eyebrow">SAVED PLAN DETAILS</span><h3 className="text-lg font-bold text-slate-900 mt-1">{selectedPlan.plan_name || 'Unnamed plan'}</h3></div><button type="button" onClick={() => setSelectedPlan(null)} aria-label="Close plan details">×</button></div>{planDetailsLoading ? <LoadingState message="Loading plan details..." /> : planDetailsError ? <div className="history-notice">{planDetailsError}</div> : <div className="hybrid-detail-grid"><p><span>Main crop</span><strong>{selectedPlan.main_crop || 'Unavailable'}</strong></p><p><span>Intercrop</span><strong>{selectedPlan.intercrop || 'Unavailable'}</strong></p><p><span>Farm area</span><strong>{selectedPlan.farm_area_hectares ?? 'Unavailable'} ha</strong></p><p><span>Farm association</span><strong>{selectedPlan.farm_id ?? 'Not associated'}</strong></p><p><span>Plant counts</span><strong>{selectedPlan.plant_count_summary || 'Unavailable'}</strong></p><p><span>Expected net profit</span><strong>{selectedPlan.net_profit_expected_inr ?? 'Unavailable'}</strong></p><p><span>ROI</span><strong>{selectedPlan.roi_pct ?? 'Unavailable'}{selectedPlan.roi_pct === null || selectedPlan.roi_pct === undefined ? '' : '%'}</strong></p><p><span>Created</span><strong>{selectedPlan.created_at ? new Date(selectedPlan.created_at).toLocaleString() : 'Unavailable'}</strong></p>{selectedPlan.notes && <p><span>Notes</span><strong>{selectedPlan.notes}</strong></p>}</div>}</div></div>}
    </div>
  );
}
