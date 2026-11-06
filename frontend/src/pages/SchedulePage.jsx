import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, CloudRain, Database, Droplets, Info, Loader2, RefreshCw, Sprout } from 'lucide-react';
import { useI18n } from '../i18n';
import { getFarms, getRecommendation, isMockMode } from '../services/api';
import { createRecommendation, getRecommendationByFarm } from '../services/irrigationService';
import { getActiveFarmId, setActiveFarmId } from '../services/farmSelection';
import IrrigationSchedule from '../components/IrrigationSchedule';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import DemoBanner from '../components/DemoBanner';

const farmKey = (farm) => String(farm?.id ?? farm?.farm_name ?? '');

export default function SchedulePage() {
  const { t } = useI18n();
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState(null);

  const loadFarms = async () => {
    try {
      const availableFarms = await getFarms();
      const activeId = getActiveFarmId();
      const selected = availableFarms?.find((candidate) => farmKey(candidate) === String(activeId)) || availableFarms?.[0] || null;
      setFarms(availableFarms || []);
      setFarm(selected);
      setSelectedFarmId(farmKey(selected));
      return selected;
    } catch (loadError) {
      throw loadError;
    }
  };

  const generateRecommendation = async (farmToUse) => {
    if (!farmToUse) {
      setError('Set up or select a farm before generating an irrigation recommendation.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      let nextRecommendation;
      if (isMockMode()) {
        nextRecommendation = await getRecommendation(farmToUse);
      } else if (farmToUse.id !== undefined) {
        nextRecommendation = await getRecommendationByFarm(farmToUse.id);
      } else {
        nextRecommendation = await createRecommendation(farmToUse);
      }
      setRecommendation(nextRecommendation);
    } catch (requestError) {
      setRecommendation(null);
      setError(requestError?.message || 'Could not generate an irrigation recommendation.');
    } finally {
      setGenerating(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const selected = await loadFarms();
      await generateRecommendation(selected);
    } catch (loadError) {
      setError(loadError?.message || 'Could not load irrigation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('agr002_mock_mode_changed', handleRefresh);
    window.addEventListener('agr002_farm_updated', handleRefresh);
    window.addEventListener('agr002_active_farm_changed', handleRefresh);
    return () => {
      window.removeEventListener('agr002_mock_mode_changed', handleRefresh);
      window.removeEventListener('agr002_farm_updated', handleRefresh);
      window.removeEventListener('agr002_active_farm_changed', handleRefresh);
    };
  }, []);

  const handleFarmChange = (event) => {
    const nextId = event.target.value;
    const nextFarm = farms.find((candidate) => farmKey(candidate) === nextId);
    setSelectedFarmId(nextId);
    setActiveFarmId(nextFarm?.id ?? nextFarm?.farm_name ?? null);
    setFarm(nextFarm || null);
    setRecommendation(null);
    if (nextFarm) generateRecommendation(nextFarm);
  };

  if (loading) return <LoadingState message="Loading irrigation intelligence..." />;
  if (error && !recommendation) {
    return (
      <div className="workspace-page">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  const schedule = recommendation?.seven_day_schedule || [];
  const totalWeeklyWater = schedule.reduce((sum, item) => sum + (Number(item.water_volume_litres) || 0), 0);
  const irrigationDaysCount = schedule.filter((item) => item.irrigate || item.action === 'Irrigate').length;
  const rainDaysCount = schedule.filter((item) => item.action === 'Rain Pause').length;
  const mlUsed = recommendation?.ml_adjustment_used === true;
  const waterSavings = recommendation?.water_savings;

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">IRRIGATION INTELLIGENCE / LIVE ENGINE</span>
          <h1>Water with evidence.</h1>
          <p>Generate a farm-specific recommendation from the backend water-balance engine.</p>
        </div>
        <button type="button" className="outline-action" onClick={loadData} disabled={loading || generating}><RefreshCw size={15} /> Refresh</button>
      </div>

      <DemoBanner isCached={recommendation?.is_cached} />

      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading">
          <div className="hybrid-icon"><Sprout size={21} /></div>
          <div>
            <span className="workspace-eyebrow">ACTIVE FARM</span>
            <h2>Select a field to calculate.</h2>
            <p>The request uses the farm record fields required by the recommendation API.</p>
          </div>
        </div>
        <div className="hybrid-form">
          <label>
            Farm
            <span>Registered farm</span>
            <select value={selectedFarmId} onChange={handleFarmChange} disabled={generating}>
              {farms.map((candidate) => <option key={farmKey(candidate)} value={farmKey(candidate)}>{candidate.farm_name || candidate.crop || 'Unnamed farm'}</option>)}
            </select>
          </label>
          <div className="hybrid-detail-grid">
            <p><span>Crop</span><strong>{farm?.crop || 'Unavailable'}</strong></p>
            <p><span>Soil</span><strong>{farm?.soil_type || 'Unavailable'}</strong></p>
            <p><span>Area</span><strong>{farm?.farm_area_hectares ?? 'Unavailable'} ha</strong></p>
            <p><span>Method</span><strong>{farm?.irrigation_method || 'Unavailable'}</strong></p>
          </div>
          <button type="button" className="hybrid-submit auth-submit" onClick={() => generateRecommendation(farm)} disabled={generating || !farm}>
            {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Droplets size={16} /> Generate recommendation</>}
          </button>
        </div>
      </section>

      {error && <div className="history-notice"><AlertCircle size={16} />{error}</div>}

      {!recommendation && !error && <div className="empty-workspace hybrid-empty"><Droplets size={34} /><span className="workspace-eyebrow">NO RESULT YET</span><h2>Generate a field recommendation.</h2><p>The response will include the current decision, water requirement, weather context and seven-day schedule.</p></div>}
      {generating && <div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" /> Calculating root-zone water balance...</div>}

      {recommendation && (
        <>
          <div className={`history-notice ${mlUsed ? 'hybrid-success-notice' : ''}`}>
            {mlUsed ? <CheckCircle2 size={16} /> : <Database size={16} />}
            <span>
              {mlUsed
                ? 'ML adjustment was applied to this irrigation recommendation.'
                : 'No ML adjustment was applied. This result is based on the backend rule-based FAO-56 water-balance engine.'}
            </span>
          </div>

          <section className="hybrid-results">
            <div className="hybrid-result-summary">
              <div>
                <span className="workspace-eyebrow">{recommendation.irrigate_today ? 'WATER WINDOW OPEN' : 'WATER WINDOW CLOSED'}</span>
                <h2>{recommendation.irrigate_today ? 'Irrigate today.' : 'Let the field breathe.'}</h2>
                <p>{recommendation.explanation || 'No explanation was returned by the backend.'}</p>
              </div>
              <div className="hybrid-result-stat"><span>WATER DEPTH</span><strong>{recommendation.irrigation_depth_mm ?? 'Unavailable'} mm</strong></div>
            </div>

            <div className="hybrid-layout-stats">
              <div><span>Water volume</span><strong>{recommendation.water_volume_litres ?? 'Unavailable'} L</strong></div>
              <div><span>Pump runtime</span><strong>{recommendation.estimated_pump_runtime_minutes ?? 'Unavailable'} min</strong></div>
              <div><span>Growth stage</span><strong>{recommendation.current_growth_stage || 'Unavailable'}</strong></div>
              <div><span>Crop coefficient</span><strong>{recommendation.current_kc ?? 'Unavailable'}</strong></div>
            </div>

            <div className="hybrid-detail-grid">
              <p><span>Next irrigation date</span><strong>{recommendation.next_irrigation_date || 'Unavailable'}</strong></p>
              <p><span>Risk status</span><strong>{recommendation.risk_status || 'Unavailable'}</strong></p>
              <p><span>Under-irrigation risk</span><strong>{recommendation.under_irrigation_risk || 'Unavailable'}</strong></p>
              <p><span>Over-irrigation risk</span><strong>{recommendation.over_irrigation_risk || 'Unavailable'}</strong></p>
              <p><span>Weather source</span><strong>{recommendation.weather_source || 'Unavailable'}</strong></p>
              <p><span>Soil moisture</span><strong>{recommendation.soil_moisture?.current_moisture_pct ?? recommendation.soil_moisture?.current_pct ?? 'Unavailable'}%</strong></p>
            </div>

            {waterSavings && (
              <div className="hybrid-layout-grid">
                <article className="hybrid-layout-card"><Droplets size={18} /><div><span className="workspace-eyebrow">WATER SAVINGS</span><h3>{waterSavings.litres_saved ?? 'Unavailable'} L saved</h3><p>{waterSavings.pct_saved ?? 'Unavailable'}% compared with the backend-provided baseline.</p></div></article>
                <article className="hybrid-layout-card"><ClockIcon /><div><span className="workspace-eyebrow">COST CONTEXT</span><h3>{waterSavings.estimated_cost_saved_inr ?? 'Unavailable'} INR</h3><p>{waterSavings.disclaimer || 'No savings disclaimer returned.'}</p></div></article>
              </div>
            )}

            <IrrigationSchedule schedule={schedule} />
            <div className="hybrid-detail-grid">
              <p><span>Weekly scheduled water</span><strong>{totalWeeklyWater.toLocaleString()} L</strong></p>
              <p><span>Scheduled irrigation cycles</span><strong>{irrigationDaysCount}</strong></p>
              <p><span>Rain pauses</span><strong>{rainDaysCount}</strong></p>
            </div>
          </section>

          {recommendation.rain_warning && <div className="history-notice"><CloudRain size={16} />{recommendation.rain_warning}</div>}
          {recommendation.alerts?.length > 0 && <div className="hybrid-limitations"><Info size={18} /><div><span className="workspace-eyebrow">BACKEND ALERTS</span>{recommendation.alerts.map((alert) => <p key={alert.id}><strong>{alert.title}:</strong> {alert.message}</p>)}</div></div>}
        </>
      )}
    </div>
  );
}

function ClockIcon() {
  return <Calendar size={18} />;
}
