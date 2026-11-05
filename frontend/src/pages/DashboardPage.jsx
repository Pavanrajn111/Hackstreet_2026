import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, Droplets, MapPin, RefreshCw, Sprout, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { getFarms, getRecommendation, loadDemoPreset } from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import DemoBanner from '../components/DemoBanner';
import WeatherPanel from '../components/WeatherPanel';
import AnalyticsCharts from '../components/AnalyticsCharts';
import RiskAssessmentCard from '../components/RiskAssessmentCard';
import AlertsList from '../components/AlertsList';
import ShareSummary from '../components/ShareSummary';
import VoiceReader from '../components/VoiceReader';
import { getActiveFarmId } from '../services/farmSelection';

export default function DashboardPage() {
  const { t } = useI18n();
  const [farm, setFarm] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const farms = await getFarms();
      const selectedId = getActiveFarmId();
      const activeFarm = farms?.find((candidate) => String(candidate.id ?? candidate.farm_name) === String(selectedId)) || farms?.[0];
      setFarm(activeFarm);
      if (activeFarm) setRecommendation(await getRecommendation(activeFarm));
      else setRecommendation(null);
    } catch (loadError) {
      console.error('Error fetching dashboard:', loadError);
      setError('Could not retrieve field intelligence. Try again or load the demo record.');
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

  if (loading) return <LoadingState message="Reading field signals..." />;
  if (error && !recommendation) return <ErrorState message={error} onRetry={loadData} />;
  if (!farm || !recommendation) {
    return (
      <div className="empty-workspace">
        <Sprout size={34} />
        <span className="workspace-eyebrow">YOUR FIRST FIELD RECORD</span>
        <h1>Begin with the field.</h1>
        <p>Set up your farm to turn soil, crop and weather into a clear daily decision.</p>
        <div>
          <Link className="auth-submit empty-action" to="/app/setup">Set up your farm <ArrowRight size={16} /></Link>
          <button className="outline-action" onClick={() => { loadDemoPreset(); loadData(); }}>Load demo record</button>
        </div>
      </div>
    );
  }

  const {
    irrigate_today: irrigateToday,
    irrigation_depth_mm: irrigationDepth,
    water_volume_litres: waterVolume,
    estimated_pump_runtime_minutes: pumpRuntime,
    current_growth_stage: growthStage,
    current_kc: cropCoefficient,
    risk_status: riskStatus,
    next_irrigation_date: nextIrrigationDate,
    rain_warning: rainWarning,
    explanation,
    seven_day_weather: weather,
    is_demo_data: isDemoData,
    is_cached: isCached,
    under_irrigation_risk: underRisk,
    under_irrigation_note: underNote,
    over_irrigation_risk: overRisk,
    over_irrigation_note: overNote,
    alerts,
  } = recommendation;

  const decisionText = irrigateToday ? 'Irrigate today.' : 'Let the field breathe.';
  const summary = irrigateToday
    ? `Apply ${irrigationDepth} mm through ${farm.irrigation_method || 'drip irrigation'}.`
    : 'Soil moisture is within a healthy range. No extra watering is needed today.';

  return (
    <div className="workspace-page dashboard-workspace">
      <DemoBanner isCached={isCached} onLoadPreset={() => { loadDemoPreset(); loadData(); }} />
      <div className="workspace-topline">
        <span className="workspace-eyebrow">FIELD RECORD / 01</span>
        <button className="refresh-action" onClick={loadData}><RefreshCw size={14} /> Refresh signals</button>
      </div>

      <section className="dashboard-intro">
        <div>
          <h1>{farm.farm_name || 'Your field'}<span><MapPin size={15} /> {farm.district || 'Field location'}</span></h1>
          <p>{farm.crop || 'Crop'} / {farm.farm_area_hectares || 1.5} ha / {farm.soil_type || 'Soil profile'}</p>
        </div>
        <Link to="/app/setup" className="outline-action">Edit field record <ArrowRight size={14} /></Link>
      </section>

      <section className={`decision-panel ${irrigateToday ? 'is-ready' : 'is-resting'}`}>
        <div className="decision-copy">
          <span className="workspace-eyebrow">{irrigateToday ? 'TODAY / WATER WINDOW OPEN' : 'TODAY / WATER WINDOW CLOSED'}</span>
          <h2>{decisionText}</h2>
          <p>{summary}</p>
          <div className="decision-tags">
            <span><Sprout size={14} /> {growthStage}</span>
            <span><CalendarDays size={14} /> {t('next_irrigation')}: {nextIrrigationDate || 'tomorrow'}</span>
            {riskStatus && <span>{t('risk_status')}: {riskStatus}</span>}
          </div>
        </div>
        <div className="decision-action">
          <div className="decision-symbol">{irrigateToday ? <Droplets size={31} /> : <Check size={31} />}</div>
          <VoiceReader textToRead={`${decisionText} ${explanation || summary}`} />
        </div>
      </section>

      {irrigateToday && (
        <section className="measure-row">
          <div><span>RECOMMENDED DEPTH</span><strong>{irrigationDepth}<small> mm</small></strong><p>Crop coefficient {cropCoefficient}</p></div>
          <div><span>WATER VOLUME</span><strong>{(waterVolume / 1000).toFixed(1)}<small> kL</small></strong><p><Waves size={13} /> Delivered to the root zone</p></div>
          <div><span>PUMP WINDOW</span><strong>{pumpRuntime}<small> min</small></strong><p><Clock3 size={13} /> At {farm.pump_flow_rate_lpm || 120} L/min</p></div>
        </section>
      )}

      <div className="dashboard-section-heading">
        <div><span className="workspace-eyebrow">THE FIELD, TOGETHER</span><h2>Signals worth acting on.</h2></div>
        <Link to="/app/intelligence">Open intelligence <ArrowRight size={15} /></Link>
      </div>

      {explanation && (
        <section className="dashboard-explanation">
          <span className="workspace-eyebrow">{t('explanation_title')}</span>
          <p>{explanation}</p>
        </section>
      )}
      <ShareSummary farm={farm} recommendation={recommendation} />
      <RiskAssessmentCard
        underRisk={underRisk || 'Moderate'}
        underNote={underNote}
        overRisk={overRisk || 'Low'}
        overNote={overNote}
      />
      <AlertsList alerts={alerts} />
      <WeatherPanel weatherData={weather || []} rainWarning={rainWarning} isDemo={isDemoData} />
      <AnalyticsCharts recommendation={recommendation} />

      <div className="dashboard-section-heading dashboard-schedule-link">
        <div><span className="workspace-eyebrow">PLAN AHEAD</span><h2>Water with intention.</h2></div>
        <Link to="/app/schedule">Open seven-day schedule <ArrowRight size={15} /></Link>
      </div>
    </div>
  );
}
