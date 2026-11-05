import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplet,
  Clock,
  Waves,
  Sprout,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Sparkles,
  MapPin,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { getRecommendation, getFarms, loadDemoPreset } from '../services/api';
import StatusCard from '../components/StatusCard';
import WeatherPanel from '../components/WeatherPanel';
import RiskBadge from '../components/RiskBadge';
import RiskAssessmentCard from '../components/RiskAssessmentCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import VoiceReader from '../components/VoiceReader';
import ShareSummary from '../components/ShareSummary';
import AlertsList from '../components/AlertsList';
import DemoBanner from '../components/DemoBanner';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function DashboardPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farm, setFarm] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const farms = await getFarms();

      if (!farms || farms.length === 0) {
        setFarm(null);
        setRecommendation(null);
        return;
      }

      const activeFarm = farms[0];
      setFarm(activeFarm);
      const rec = await getRecommendation(activeFarm);
      setRecommendation(rec);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Could not retrieve irrigation advice. Showing cached data if available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleModeChange = () => loadData();
    const handleFarmUpdate = (e) => {
      setFarm(e.detail);
      loadData();
    };

    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    window.addEventListener('agr002_farm_updated', handleFarmUpdate);

    return () => {
      window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
      window.removeEventListener('agr002_farm_updated', handleFarmUpdate);
    };
  }, []);

  const handlePresetLoad = () => {
    loadDemoPreset();
    loadData();
  };

  if (loading) return <LoadingState message="Calculating irrigation recommendation..." />;

  // Empty State: when no farm is configured
  if (!farm && !loading) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
          <Sprout className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{t('empty_farm_title')}</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {t('empty_farm_desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/setup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all min-h-[48px]"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t('setup_farm_btn')}</span>
          </Link>
          <button
            type="button"
            onClick={handlePresetLoad}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl transition-all min-h-[48px] cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-amber-700" />
            <span>{t('load_demo_preset')}</span>
          </button>
        </div>
      </div>
    );
  }

  if (error && !recommendation) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const {
    irrigate_today,
    irrigation_depth_mm,
    water_volume_litres,
    estimated_pump_runtime_minutes,
    current_growth_stage,
    current_kc,
    risk_status,
    next_irrigation_date,
    rain_warning,
    explanation,
    seven_day_weather,
    is_demo_data,
    is_cached,
    under_irrigation_risk,
    under_irrigation_note,
    over_irrigation_risk,
    over_irrigation_note,
    alerts,
  } = recommendation;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Simulation / Offline Cached Pill Banner */}
      <DemoBanner isCached={is_cached} onLoadPreset={handlePresetLoad} />

      <section className="editorial-hero">
        <div className="editorial-hero-copy">
          <span className="eyebrow">01 / OBSERVE YOUR FIELD</span>
          <h1>Better water decisions<br /><em>start with attention.</em></h1>
          <p>One calm view of your soil, crop and weather signals, so the next irrigation decision is clear.</p>
        </div>
        <div className="editorial-hero-meta">
          <span className="live-dot" /> LIVE FIELD RECORD
          <strong>{farm?.district || 'Bengaluru Rural'}</strong>
        </div>
      </section>

      {/* Farm Quick Summary Strip */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
              {farm?.crop || 'Tomato'} • {farm?.farm_area_hectares || 1.5} ha
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {farm?.district || 'Bengaluru Rural'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            {farm?.farm_name || 'Bengaluru Green Fields'}
          </h2>
          <p className="text-xs text-slate-500">
            {farm?.irrigation_method || 'Drip Irrigation'} • {farm?.soil_type || 'Red Sandy Loam'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={loadData}
            title="Refresh Advice"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/setup"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2.5 rounded-xl transition-colors min-h-[44px]"
          >
            <span>Edit Farm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 1. MOST PROMINENT RECOMMENDATION CARD (Mobile-First, First Visible Item) */}
      <div
        className={`rounded-3xl p-5 sm:p-6 border shadow-sm transition-all ${
          irrigate_today
            ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white border-emerald-500'
            : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white border-slate-600'
        }`}
      >
        {/* Top Badges: Decision Label & Moisture Stress Risk */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
            {t('today_decision')}
          </span>
          <RiskBadge status={risk_status} />
        </div>

        {/* Big Decision Statement with Icon and Text */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shrink-0">
            {irrigate_today ? (
              <Droplet className="w-9 h-9 text-white fill-current animate-pulse" />
            ) : (
              <CheckCircle2 className="w-9 h-9 text-emerald-300" />
            )}
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {irrigate_today ? t('irrigate_yes') : t('irrigate_no')}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 opacity-95 mt-1">
              {irrigate_today
                ? `Recommended water: ${irrigation_depth_mm} mm via ${farm?.irrigation_method || 'Drip'}`
                : 'Soil moisture is optimal. No extra watering is needed.'}
            </p>
          </div>
        </div>

        {/* Prominent Water Amount & Estimated Pump Runtime */}
        {irrigate_today && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 mb-3">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl">
              <span className="text-[11px] font-semibold opacity-85 block">
                {t('water_volume')}
              </span>
              <span className="text-xl sm:text-2xl font-black">
                {water_volume_litres.toLocaleString()} L
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl">
              <span className="text-[11px] font-semibold opacity-85 block">
                {t('pump_runtime')}
              </span>
              <span className="text-xl sm:text-2xl font-black">
                {estimated_pump_runtime_minutes} mins
              </span>
            </div>
          </div>
        )}

        {/* Card Footer: Growth Stage, Next Check Date & Read Aloud Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-white/15 px-2.5 py-1 rounded-lg">
              {t('growth_stage')}: <strong>{current_growth_stage}</strong>
            </span>
            {next_irrigation_date && (
              <span className="bg-white/15 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {t('next_irrigation')}: <strong>{next_irrigation_date}</strong>
              </span>
            )}
          </div>

          {/* Web Speech API: Read Advice Aloud */}
          <VoiceReader textToRead={`${irrigate_today ? t('irrigate_yes') : t('irrigate_no')}. ${explanation}`} />
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard
          title={t('recommended_depth')}
          value={irrigate_today ? irrigation_depth_mm : 0}
          unit={t('mm_unit')}
          icon={Droplet}
          variant="water"
          subtitle={`Crop Factor Kc: ${current_kc}`}
        />
        <StatusCard
          title={t('water_volume')}
          value={irrigate_today ? (water_volume_litres / 1000).toFixed(1) : 0}
          unit="kL"
          icon={Waves}
          variant="water"
          subtitle={t('litres_unit')}
        />
        <StatusCard
          title={t('pump_runtime')}
          value={irrigate_today ? estimated_pump_runtime_minutes : 0}
          unit={t('minutes_unit')}
          icon={Clock}
          variant="primary"
          subtitle={`Flow: ${farm?.pump_flow_rate_lpm || 120} L/min`}
        />
        <StatusCard
          title={t('growth_stage')}
          value={current_growth_stage.split('/')[0]}
          icon={Sprout}
          variant="default"
          subtitle={`Crop: ${farm?.crop || 'Tomato'}`}
        />
      </div>

      {/* Field Recommendation Explanation */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">{t('explanation_title')}</h3>
          </div>
          <div className="flex items-center gap-2">
            {ml_adjustment_used ? (
              <span className="text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-0.5 rounded-full">
                ML Fine-Tuned
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                FAO-56 Baseline Engine
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-medium">
              Weather: {recommendation?.weather_source || 'open-meteo'}
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
          {explanation}
        </p>
      </div>

      {/* WhatsApp Shareable Summary */}
      <ShareSummary farm={farm} recommendation={recommendation} />

      {/* Over-irrigation & Under-irrigation Risk Evaluation */}
      <RiskAssessmentCard
        underRisk={under_irrigation_risk || 'Moderate'}
        underNote={under_irrigation_note}
        overRisk={over_irrigation_risk || 'Low'}
        overNote={over_irrigation_note}
      />

      {/* Active Alerts List */}
      <AlertsList alerts={alerts} />

      {/* 7-Day Weather Forecast */}
      <WeatherPanel
        weatherData={seven_day_weather}
        rainWarning={rain_warning}
        isDemo={is_demo_data}
      />

      {/* Interactive Analytics Charts (Soil Water, Water Saved, Power Saved) */}
      <AnalyticsCharts recommendation={recommendation} />

      {/* Navigation link to 7-Day Plan */}
      <div className="text-center pt-2">
        <Link
          to="/schedule"
          className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-5 py-3 rounded-2xl transition-all shadow-2xs min-h-[48px]"
        >
          <span>View Detailed 7-Day Irrigation Schedule</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
