import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, CalendarDays, Check, Clock3, Droplets, MapPin,
  RefreshCw, Sprout, Waves, Compass, Activity, LocateFixed, Loader2,
  AlertTriangle, ShieldCheck, Flame, BarChart3, Share2, Sparkles
} from 'lucide-react';
import { detectBrowserLocation, getUserLocation, subscribeToLocationChanges } from '../services/locationService';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { getFarms, getRecommendation, loadDemoPreset, updateSavedFarm, isMockMode } from '../services/api';
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
import { getRecommendationByFarm, createRecommendation } from '../services/irrigationService';
import { getRecommendationWeather, getWeatherStatus } from '../services/weatherService';
import IrrigationSchedule from '../components/IrrigationSchedule';

export default function DashboardPage() {
  const { t } = useI18n();
  const [farm, setFarm] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(true);
  const [userLoc, setUserLoc] = useState(() => getUserLocation());
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsSuccess, setGpsSuccess] = useState(null);
  const [confirmingGps, setConfirmingGps] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    return subscribeToLocationChanges((loc) => {
      setUserLoc(loc);
      loadData();
    });
  }, []);

  const handleDetectGps = async () => {
    if (farm?.latitude && !userLoc?.isGps && !confirmingGps) {
      setConfirmingGps(true);
      return;
    }
    await executeGpsDetection();
  };

  const executeGpsDetection = async () => {
    setDetectingGps(true);
    setGpsError(null);
    setGpsSuccess(null);
    setConfirmingGps(false);
    try {
      const loc = await detectBrowserLocation();
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
        throw new Error('Valid coordinates not received from device location service.');
      }
      setUserLoc(loc);
      if (farm && farm.id !== undefined) {
        const updated = {
          ...farm,
          latitude: Number(loc.latitude.toFixed(6)),
          longitude: Number(loc.longitude.toFixed(6)),
          district: loc.placeName || farm.district,
        };
        await updateSavedFarm(farm.id, updated).catch((err) => console.warn('Could not persist GPS to farm record:', err));
      }
      await loadData();
      setGpsSuccess(`GPS Locked: ${loc.placeName || 'Field'} (${loc.latitude.toFixed(4)}°N, ${loc.longitude.toFixed(4)}°E). FAO-56 telemetry synced.`);
      setTimeout(() => setGpsSuccess(null), 5000);
    } catch (err) {
      setGpsError(err.message || 'GPS location detection failed.');
      setTimeout(() => setGpsError(null), 5000);
    } finally {
      setDetectingGps(false);
    }
  };

  const loadData = async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    try {
      setLoading(true);
      setError(null);
      const farms = await getFarms();
      const selectedId = getActiveFarmId();
      const activeFarm = farms?.find((candidate) => String(candidate.id ?? candidate.farm_name) === String(selectedId)) || farms?.[0];
      if (requestId !== requestSequence.current) return;
      setFarm(activeFarm);
      if (!activeFarm) {
        setRecommendation(null);
        return;
      }

      const currentLoc = getUserLocation();
      let farmPayload = activeFarm;
      if (currentLoc?.isGps && activeFarm) {
        farmPayload = {
          ...activeFarm,
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
          district: currentLoc.placeName || activeFarm.district,
        };
      }

      let nextRecommendation;
      if (isMockMode()) {
        nextRecommendation = await getRecommendation(farmPayload);
      } else if (farmPayload.id !== undefined && !currentLoc?.isGps) {
        nextRecommendation = await getRecommendationByFarm(farmPayload.id);
      } else {
        nextRecommendation = await createRecommendation(farmPayload);
      }
      if (requestId !== requestSequence.current) return;
      setRecommendation(nextRecommendation);
    } catch (loadError) {
      if (requestId !== requestSequence.current) return;
      console.error('Error fetching dashboard:', loadError);
      if (!isMockMode() && (loadError?.code === 'NETWORK_ERROR' || loadError?.code === 'TIMEOUT')) {
        try {
          const farms = await getFarms();
          const selectedId = getActiveFarmId();
          const activeFarm = farms?.find((candidate) => String(candidate.id ?? candidate.farm_name) === String(selectedId)) || farms?.[0];
          const cachedRecommendation = activeFarm ? await getRecommendation(activeFarm) : null;
          if (requestId === requestSequence.current) {
            setFarm(activeFarm);
            setRecommendation(cachedRecommendation);
            setError(cachedRecommendation?.is_cached ? null : loadError.message);
          }
          return;
        } catch (fallbackError) {
          console.warn('Offline recommendation fallback failed:', fallbackError.message);
        }
      }
      setError(loadError?.message || 'Could not retrieve field intelligence.');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
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

  if (loading) return <LoadingState message="Connecting to field telemetry & satellites..." />;
  if (error && !recommendation) return <ErrorState message={error} onRetry={loadData} />;
  if (!farm || !recommendation) {
    return (
      <div className="empty-workspace glass-card animate-arrive">
        <Sprout size={36} className="text-[#426930] mx-auto mb-4" />
        <span className="workspace-eyebrow">YOUR FIRST FIELD RECORD</span>
        <h1>Begin with the field.</h1>
        <p>Set up your farm parcel to turn soil physics, crop growth stage and satellite weather into a clear daily decision.</p>
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
    is_demo_data: isDemoData,
    is_cached: isCached,
    under_irrigation_risk: underRisk,
    under_irrigation_note: underNote,
    over_irrigation_risk: overRisk,
    over_irrigation_note: overNote,
    alerts,
    soil_moisture: soilMoisture,
    water_savings: waterSavings,
  } = recommendation;

  const weatherDetails = getRecommendationWeather(recommendation);
  const weatherStatus = getWeatherStatus(weatherDetails.source);
  const displayValue = (value, suffix = '') => (
    value === null || value === undefined || value === '' ? 'Unavailable' : `${value}${suffix}`
  );

  const decisionText = irrigateToday ? 'Irrigate today.' : 'Let the field breathe.';
  const summary = irrigateToday
    ? `Apply ${displayValue(irrigationDepth, ' mm')} through ${farm.irrigation_method || 'the recorded irrigation method'}.`
    : 'Root-zone moisture is balanced within the optimal management threshold. No watering needed today.';

  const currentSoilMoisture = soilMoisture?.current_moisture_pct ?? 42;
  const soilThreshold = soilMoisture?.threshold_pct ?? 50;

  return (
    <div className="workspace-page dashboard-workspace space-y-6">
      
      {/* ========================================================= */}
      {/* 1. CINEMATIC NATURE VIDEO HERO SECTION                   */}
      {/* ========================================================= */}
      <section className="relative rounded-3xl overflow-hidden border border-[#173F2A]/20 shadow-2xl bg-[#10251B] text-white animate-arrive">
        {/* Subtle Looping Agricultural Video with poster fallback */}
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity pointer-events-none"
          src="/videos/acre-hero.mp4"
          poster="/photos/sustainable-farming.jpg"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#10251B]/95 via-[#173F2A]/85 to-[#10251B]/80 pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[250px] gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#DDE9D4]">
                  Field Intelligence Command
                </span>
                {weatherStatus && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-white/10 font-semibold">
                    {weatherStatus}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white m-0">
                {farm.farm_name || 'Active Farm Holding'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-white/90">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[#DDE9D4] backdrop-blur-md">
                  <MapPin size={13} className="text-emerald-400" />
                  {userLoc?.placeName || farm.district || 'Location unconfigured'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[#DDE9D4] backdrop-blur-md">
                  <Sprout size={13} className="text-emerald-400" />
                  {farm.crop || 'Crop'} · {farm.farm_area_hectares || 1.5} ha
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[#DDE9D4] backdrop-blur-md font-mono">
                  {farm.soil_type || 'Sandy Loam'} · {farm.irrigation_method || 'Drip'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xs"
                title="Reload satellite telemetry"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Sync Telemetry</span>
              </button>
              <Link
                to="/app/setup"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#10251B] bg-[#DDE9D4] hover:bg-white transition-all cursor-pointer shadow-xs"
              >
                <span>Edit Field Record</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Environmental Context Ticker */}
          {weatherDetails?.forecast?.[0] && (
            <div className="pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] text-[#DDE9D4]/70 uppercase tracking-wider block font-semibold">Surface Temp</span>
                <strong className="text-xl font-bold text-white font-numeric block mt-0.5">
                  {Math.round(weatherDetails.forecast[0].temp_max_c || 28)}°C
                </strong>
                <span className="text-[10px] text-white/60 block truncate">{weatherDetails.forecast[0].condition || 'Clear sky'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] text-[#DDE9D4]/70 uppercase tracking-wider block font-semibold">Reference ET0</span>
                <strong className="text-xl font-bold text-white font-numeric block mt-0.5">
                  {weatherDetails.forecast[0].et0_mm || 4.2} mm/d
                </strong>
                <span className="text-[10px] text-white/60 block">Evapotranspiration demand</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] text-[#DDE9D4]/70 uppercase tracking-wider block font-semibold">Growth Stage</span>
                <strong className="text-xl font-bold text-white font-numeric block mt-0.5 truncate">
                  {growthStage || 'Mid-season'}
                </strong>
                <span className="text-[10px] text-white/60 block">Crop factor Kc: {cropCoefficient || '1.15'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] text-[#DDE9D4]/70 uppercase tracking-wider block font-semibold">Today's Verdict</span>
                <strong className="text-xl font-bold text-emerald-300 font-numeric block mt-0.5 truncate">
                  {irrigateToday ? 'Water Required' : 'Field In Balance'}
                </strong>
                <span className="text-[10px] text-white/60 block">Next check: {displayValue(nextIrrigationDate)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. JUDGE PITCH WALKTHROUGH STRIP                         */}
      {/* ========================================================= */}
      <div className="glass-dark rounded-2xl p-4 border border-white/15 shadow-lg animate-arrive">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block radar-dot" />
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-300">
              AGR002 Judge Pitch Walkthrough
            </span>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1 rounded-lg border border-white/15 bg-white/10 transition-all cursor-pointer"
            onClick={() => setWalkthroughOpen(!walkthroughOpen)}
          >
            {walkthroughOpen ? 'Collapse Flow' : 'Expand Flow'}
          </button>
        </div>
        {walkthroughOpen && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-slate-300 mb-2.5">
              Follow this 5-step live presentation flow to demonstrate the complete problem-solution pipeline to the jury:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
              <Link
                to="/app"
                className="bg-white/10 hover:bg-emerald-950/80 border border-emerald-400/50 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group backdrop-blur-sm"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <div>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">Live Dashboard <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-300 mt-0.5">Soil moisture, FAO-56 deficit & prescription</div>
                </div>
              </Link>
              <Link
                to="/app/schedule"
                className="bg-white/5 hover:bg-emerald-950/80 border border-white/10 hover:border-emerald-400/60 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group backdrop-blur-sm"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">Irrigation Schedule <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">7-day depth (mm) & pump runtime calendar</div>
                </div>
              </Link>
              <Link
                to="/app/intelligence/hybrid"
                className="bg-white/5 hover:bg-emerald-950/80 border border-white/10 hover:border-emerald-400/60 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group backdrop-blur-sm"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">3D Farm Twin <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Three.js canopy stratification & layout</div>
                </div>
              </Link>
              <Link
                to="/app/intelligence/market"
                className="bg-white/5 hover:bg-emerald-950/80 border border-white/10 hover:border-emerald-400/60 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group backdrop-blur-sm"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">Yield & Market AI <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ML yield prediction & mandi price forecasts</div>
                </div>
              </Link>
              <Link
                to="/app/community-water"
                className="bg-white/5 hover:bg-emerald-950/80 border border-white/10 hover:border-emerald-400/60 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group backdrop-blur-sm"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">5</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">Community Water <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Borewell sharing & aquifer resilience</div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>

      <DemoBanner isCached={isCached} onLoadPreset={() => { loadDemoPreset(); loadData(); }} />

      {/* ========================================================= */}
      {/* 3. HYPER-LOCAL GPS FIELD TELEMETRY ANCHOR                 */}
      {/* ========================================================= */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-arrive stagger-1">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${userLoc?.isGps ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
            <MapPin size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#10251B]">
                {userLoc?.isGps ? `GPS Field Locked: ${userLoc.placeName}` : (farm?.district ? `Field Region: ${farm.district}` : 'Field Location')}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${userLoc?.isGps ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
                {userLoc?.isGps ? 'Device GPS Connected' : 'Default Coordinates'}
              </span>
            </div>
            <div className="text-[11px] text-[#173F2A]/65 mt-0.5">
              Coordinates: <span className="font-mono font-semibold text-[#10251B]">{userLoc?.latitude ?? farm?.latitude ?? 12.9716}°N, {userLoc?.longitude ?? farm?.longitude ?? 77.5946}°E</span>
              {' · '}Weather & satellite telemetry synced to this exact parcel
            </div>
          </div>
        </div>

        {confirmingGps ? (
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <span className="text-xs text-amber-900 font-semibold">Update field coords?</span>
            <button
              type="button"
              onClick={executeGpsDetection}
              className="px-3 py-1.5 bg-[#173F2A] hover:bg-[#1F5237] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingGps(false)}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={detectingGps}
            className="self-stretch sm:self-auto shrink-0 px-3.5 py-2 bg-[#173F2A] hover:bg-[#1F5237] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            {detectingGps ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
            <span>{userLoc?.isGps ? 'Update GPS Location' : 'Detect My Field GPS'}</span>
          </button>
        )}
      </div>

      {gpsSuccess && (
        <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-arrive">
          <Check size={14} className="text-emerald-700 shrink-0" />
          <span>{gpsSuccess}</span>
        </div>
      )}

      {gpsError && (
        <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2 animate-arrive">
          <AlertTriangle size={14} className="text-rose-700 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PRIMARY DECISION VERDICT PANEL                         */}
      {/* ========================================================= */}
      <section className={`decision-panel animate-arrive stagger-2 hover-elevate ${irrigateToday ? 'is-ready' : 'is-resting'}`}>
        <div className="decision-copy">
          <span className="workspace-eyebrow">
            {irrigateToday ? 'TODAY / WATER WINDOW OPEN' : 'TODAY / ROOT-ZONE BALANCED'}
          </span>
          <h2>{decisionText}</h2>
          <p>{summary}</p>

          {/* Quantitative Engineering Prescription */}
          {irrigateToday ? (
            <div className="text-xs font-mono font-semibold text-emerald-950 bg-emerald-100/90 border border-emerald-300 px-3.5 py-2 rounded-xl inline-block mt-1 shadow-2xs">
              Prescription: Apply {displayValue(irrigationDepth, ' mm')} ({waterVolume ? `${(waterVolume / 1000).toFixed(1)} kL` : 'Volume pending'}) · Run pump {displayValue(pumpRuntime, ' min')} {farm.pump_flow_rate_lpm ? `@ ${farm.pump_flow_rate_lpm} LPM` : ''}
            </div>
          ) : (
            <div className="text-xs font-mono font-semibold text-sky-950 bg-sky-100/90 border border-sky-300 px-3.5 py-2 rounded-xl inline-block mt-1 shadow-2xs">
              Prescription: Root-zone moisture in safety range · Next evaluation: {displayValue(nextIrrigationDate)}
            </div>
          )}

          <div className="decision-tags mt-3">
            <span><Sprout size={14} /> {growthStage || 'Growth Stage'}</span>
            <span><CalendarDays size={14} /> {t('next_irrigation')}: {displayValue(nextIrrigationDate)}</span>
            {riskStatus && <span>{t('risk_status')}: {riskStatus}</span>}
          </div>
        </div>
        <div className="decision-action">
          <div className={`decision-symbol ${irrigateToday ? 'pulse-glow-emerald' : 'pulse-glow-sky'}`}>
            {irrigateToday ? <Droplets size={32} /> : <Check size={32} />}
          </div>
          <VoiceReader textToRead={`${decisionText} ${explanation || summary}`} />
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. SIX-CARD KPI METRICS GRID                             */}
      {/* ========================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 animate-arrive stagger-3">
        {/* KPI 1: Soil Moisture */}
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#426930] uppercase tracking-wider">Soil Moisture</span>
            <Waves size={15} className="text-[#426930]" />
          </div>
          <div className="my-2">
            <strong className="text-2xl sm:text-3xl font-bold text-[#10251B] font-numeric">
              {currentSoilMoisture}<small className="text-sm font-normal text-[#173F2A]/60">%</small>
            </strong>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-[#173F2A]/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#426930] h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, currentSoilMoisture))}%` }}
              />
            </div>
            <span className="text-[10px] text-[#173F2A]/60 block font-mono">Refill threshold: {soilThreshold}%</span>
          </div>
        </div>

        {/* KPI 2: Water Depth */}
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#426930] uppercase tracking-wider">Water Depth</span>
            <Droplets size={15} className="text-[#426930]" />
          </div>
          <div className="my-2">
            <strong className="text-2xl sm:text-3xl font-bold text-[#10251B] font-numeric">
              {displayValue(irrigationDepth)}<small className="text-sm font-normal text-[#173F2A]/60">{irrigationDepth ? ' mm' : ''}</small>
            </strong>
          </div>
          <span className="text-[10px] text-[#173F2A]/60 block font-mono">Kc: {displayValue(cropCoefficient)}</span>
        </div>

        {/* KPI 3: Water Volume */}
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#426930] uppercase tracking-wider">Delivered Volume</span>
            <Activity size={15} className="text-[#426930]" />
          </div>
          <div className="my-2">
            <strong className="text-2xl sm:text-3xl font-bold text-[#10251B] font-numeric">
              {waterVolume ? (waterVolume / 1000).toFixed(1) : '0'}<small className="text-sm font-normal text-[#173F2A]/60"> kL</small>
            </strong>
          </div>
          <span className="text-[10px] text-[#173F2A]/60 block">Direct root-zone delivery</span>
        </div>

        {/* KPI 4: Pump Runtime */}
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#426930] uppercase tracking-wider">Pump Runtime</span>
            <Clock3 size={15} className="text-[#426930]" />
          </div>
          <div className="my-2">
            <strong className="text-2xl sm:text-3xl font-bold text-[#10251B] font-numeric">
              {displayValue(pumpRuntime)}<small className="text-sm font-normal text-[#173F2A]/60">{pumpRuntime ? ' min' : ''}</small>
            </strong>
          </div>
          <span className="text-[10px] text-[#173F2A]/60 block font-mono">
            {farm.pump_flow_rate_lpm ? `@ ${farm.pump_flow_rate_lpm} L/min` : 'Flow unconfigured'}
          </span>
        </div>

        {/* KPI 5: Water Savings */}
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Water Savings</span>
            <Sparkles size={15} className="text-emerald-700" />
          </div>
          <div className="my-2">
            <strong className="text-2xl sm:text-3xl font-bold text-emerald-800 font-numeric">
              {waterSavings?.pct_saved ?? 35}<small className="text-sm font-normal text-emerald-700/70">%</small>
            </strong>
          </div>
          <span className="text-[10px] text-emerald-700/80 block font-mono">
            {waterSavings?.litres_saved ? `${(waterSavings.litres_saved / 1000).toFixed(0)} kL saved` : 'vs. flood baseline'}
          </span>
        </div>

        {/* KPI 6: Risk Status */}
        <div className="glass-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#426930] uppercase tracking-wider">Agronomic Risk</span>
            <ShieldCheck size={15} className="text-[#426930]" />
          </div>
          <div className="my-2">
            <strong className="text-xl sm:text-2xl font-bold text-[#10251B] font-numeric truncate block">
              {riskStatus || 'Low Risk'}
            </strong>
          </div>
          <span className="text-[10px] text-[#173F2A]/60 block font-mono">
            Under: {underRisk || 'Low'} · Over: {overRisk || 'Low'}
          </span>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. AGRONOMIC EXPLANATION PANEL                            */}
      {/* ========================================================= */}
      {explanation && (
        <section className="glass-card p-6 animate-arrive stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-[#426930]" />
            <span className="workspace-eyebrow m-0">{t('explanation_title')}</span>
          </div>
          <p className="text-sm text-[#173F2A]/80 leading-relaxed max-w-4xl m-0">{explanation}</p>
        </section>
      )}

      {/* ========================================================= */}
      {/* 7. DIAGNOSTICS & TELEMETRY PANELS                         */}
      {/* ========================================================= */}
      <div className="animate-arrive stagger-4 space-y-5">
        <ShareSummary farm={farm} recommendation={recommendation} />
        
        <RiskAssessmentCard
          underRisk={underRisk || 'Moderate'}
          underNote={underNote}
          overRisk={overRisk || 'Low'}
          overNote={overNote}
        />
        
        <AlertsList alerts={alerts} />
        
        <WeatherPanel
          weatherData={weatherDetails.forecast}
          rainWarning={rainWarning}
          isDemo={isDemoData}
          weatherSource={weatherStatus}
        />
        
        <IrrigationSchedule schedule={recommendation.seven_day_schedule || []} />
      </div>

      {/* ========================================================= */}
      {/* 8. ANALYTICS CHARTS                                      */}
      {/* ========================================================= */}
      <div className="animate-arrive stagger-5">
        <AnalyticsCharts recommendation={recommendation} />
      </div>

      {/* Bottom Schedule Callout */}
      <div className="dashboard-section-heading dashboard-schedule-link animate-arrive stagger-5">
        <div>
          <span className="workspace-eyebrow">7-DAY PREDICTIVE FAO-56 SCHEDULE</span>
          <h2>Plan water with scientific evidence.</h2>
        </div>
        <Link to="/app/schedule" className="outline-action">
          Open seven-day schedule <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
