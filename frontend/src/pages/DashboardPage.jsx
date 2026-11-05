import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, Droplets, MapPin, RefreshCw, Sprout, Waves, Compass, Activity, LocateFixed, Loader2, AlertTriangle } from 'lucide-react';
import { detectBrowserLocation, getUserLocation, subscribeToLocationChanges } from '../services/locationService';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { getFarms, getRecommendation, loadDemoPreset, updateSavedFarm } from '../services/api';
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
import { isMockMode } from '../services/api';

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

  if (loading) return <LoadingState message="Reading field telemetry..." />;
  if (error && !recommendation) return <ErrorState message={error} onRetry={loadData} />;
  if (!farm || !recommendation) {
    return (
      <div className="empty-workspace animate-arrive">
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
    is_demo_data: isDemoData,
    is_cached: isCached,
    under_irrigation_risk: underRisk,
    under_irrigation_note: underNote,
    over_irrigation_risk: overRisk,
    over_irrigation_note: overNote,
    alerts,
  } = recommendation;
  const weatherDetails = getRecommendationWeather(recommendation);
  const weatherStatus = getWeatherStatus(weatherDetails.source);
  const displayValue = (value, suffix = '') => (
    value === null || value === undefined || value === '' ? 'Unavailable' : `${value}${suffix}`
  );

  const decisionText = irrigateToday ? 'Irrigate today.' : 'Let the field breathe.';
  const summary = irrigateToday
    ? `Apply ${displayValue(irrigationDepth, ' mm')} through ${farm.irrigation_method || 'the recorded irrigation method'}.`
    : 'Soil moisture is within a healthy range. No extra watering is needed today.';

  return (
    <div className="workspace-page dashboard-workspace">
      {/* Hackathon Judge Walkthrough Guide Bar */}
      <div className="mb-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 text-white rounded-2xl p-4 border border-emerald-800/60 shadow-lg animate-arrive">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block radar-dot"></span>
            <span className="text-xs font-black tracking-wider uppercase text-emerald-300">AGR002 Judge Pitch Walkthrough</span>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/60 bg-slate-800/50 transition-all cursor-pointer"
            onClick={() => setWalkthroughOpen(!walkthroughOpen)}
          >
            {walkthroughOpen ? 'Collapse Flow' : 'Expand Flow'}
          </button>
        </div>
        {walkthroughOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <p className="text-xs text-slate-300 mb-2.5">
              Follow this 4-step live presentation flow to demonstrate the complete problem-solution pipeline to the jury:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              <Link
                to="/app"
                className="bg-slate-800/90 hover:bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <div>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">Live Dashboard <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Current field moisture, FAO-56 deficit & instant verdict</div>
                </div>
              </Link>
              <Link
                to="/app/schedule"
                className="bg-slate-800/90 hover:bg-emerald-950/80 border border-slate-700/70 hover:border-emerald-500/80 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">Irrigation Schedule <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">7-day daily water depth (mm) & pump runtime calendar</div>
                </div>
              </Link>
              <Link
                to="/app/intelligence/hybrid"
                className="bg-slate-800/90 hover:bg-emerald-950/80 border border-slate-700/70 hover:border-emerald-500/80 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">3D Farm Twin <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Three.js canopy stratification & multi-angle camera views</div>
                </div>
              </Link>
              <Link
                to="/app/intelligence/market"
                className="bg-slate-800/90 hover:bg-emerald-950/80 border border-slate-700/70 hover:border-emerald-500/80 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">Yield & Market AI <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ML yield prediction & APMC mandi price regressors</div>
                </div>
              </Link>
              <Link
                to="/app/community-water"
                className="bg-slate-800/90 hover:bg-emerald-950/80 border border-slate-700/70 hover:border-emerald-500/80 rounded-xl p-2.5 transition-all text-left flex items-start gap-2 group"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">5</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">Community Water <ArrowRight size={12} /></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Neighborhood borehole sharing & aquifer resilience</div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>

      <DemoBanner isCached={isCached} onLoadPreset={() => { loadDemoPreset(); loadData(); }} />

      {/* Hyper-Local GPS Field Location Detector */}
      <div className="mb-4 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-arrive stagger-1">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${userLoc?.isGps ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
            <MapPin size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {userLoc?.isGps ? `GPS Field: ${userLoc.placeName}` : (farm?.district ? `Field Location: ${farm.district}` : 'Field Location')}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${userLoc?.isGps ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                {userLoc?.isGps ? 'GPS Connected' : 'Default Coordinates'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Coordinates: <span className="font-mono text-slate-700">{userLoc?.latitude ?? farm?.latitude ?? 12.9716}°N, {userLoc?.longitude ?? farm?.longitude ?? 77.5946}°E</span>
              {' · '}Weather & satellite telemetry synced to this exact location
            </div>
          </div>
        </div>

        {confirmingGps ? (
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <span className="text-xs text-amber-900 font-semibold">Update field coords?</span>
            <button
              type="button"
              onClick={executeGpsDetection}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
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
            className="self-stretch sm:self-auto shrink-0 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            {detectingGps ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
            <span>{userLoc?.isGps ? 'Update GPS Location' : 'Detect My Field GPS'}</span>
          </button>
        )}
      </div>

      {gpsSuccess && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-arrive">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <span>{gpsSuccess}</span>
        </div>
      )}

      {gpsError && (
        <div className="mb-3 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-arrive">
          <AlertTriangle size={14} className="text-rose-600 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      <div className="workspace-topline animate-arrive stagger-1">
        <span className="workspace-eyebrow">FIELD STATUS & SATELLITE TELEMETRY</span>
        <button className="refresh-action" onClick={loadData}><RefreshCw size={14} /> Refresh telemetry</button>
      </div>

      <section className="dashboard-intro animate-arrive stagger-1 hover-elevate">
        <div>
          <h1>{farm.farm_name || 'Your field'}<span><MapPin size={15} /> {farm.district || 'Field location'}</span></h1>
          <p>{farm.crop || 'Crop'} / {farm.farm_area_hectares || 1.5} ha / {farm.soil_type || 'Soil profile'}</p>
        </div>
        <Link to="/app/setup" className="outline-action">Edit field record <ArrowRight size={14} /></Link>
      </section>

      {/* Primary Decision Card with Breathing Glow & Quantitative Guidance */}
      <section className={`decision-panel animate-arrive stagger-2 hover-elevate ${irrigateToday ? 'is-ready' : 'is-resting'}`}>
        <div className="decision-copy">
          <span className="workspace-eyebrow">{irrigateToday ? 'TODAY / WATER WINDOW OPEN' : 'TODAY / WATER WINDOW CLOSED'}</span>
          <h2>{decisionText}</h2>
          <p>{summary}</p>

          {/* Quantitative Engineering Prescription */}
          {irrigateToday ? (
            <div className="text-xs font-mono font-semibold text-emerald-950 bg-emerald-100/80 border border-emerald-300/80 px-3 py-1.5 rounded-lg inline-block mt-1">
              Prescription: Apply {displayValue(irrigationDepth, ' mm')} ({waterVolume ? `${(waterVolume / 1000).toFixed(1)} kL` : 'Volume pending'}) · Run pump {displayValue(pumpRuntime, ' min')} {farm.pump_flow_rate_lpm ? `@ ${farm.pump_flow_rate_lpm} LPM` : ''}
            </div>
          ) : (
            <div className="text-xs font-mono font-semibold text-sky-950 bg-sky-100/80 border border-sky-300/80 px-3 py-1.5 rounded-lg inline-block mt-1">
              Prescription: Root-zone moisture in safety range · Next evaluation: {displayValue(nextIrrigationDate)}
            </div>
          )}

          <div className="decision-tags mt-2">
            <span><Sprout size={14} /> {growthStage}</span>
            <span><CalendarDays size={14} /> {t('next_irrigation')}: {displayValue(nextIrrigationDate)}</span>
            {riskStatus && <span>{t('risk_status')}: {riskStatus}</span>}
          </div>
        </div>
        <div className="decision-action">
          <div className={`decision-symbol ${irrigateToday ? 'pulse-glow-emerald' : 'pulse-glow-sky'}`}>
            {irrigateToday ? <Droplets size={31} /> : <Check size={31} />}
          </div>
          <VoiceReader textToRead={`${decisionText} ${explanation || summary}`} />
        </div>
      </section>

      {irrigateToday && (
        <section className="measure-row animate-arrive stagger-3 hover-elevate">
          <div>
            <span>RECOMMENDED DEPTH</span>
            <strong>{displayValue(irrigationDepth)}<small>{irrigationDepth === null || irrigationDepth === undefined ? '' : ' mm'}</small></strong>
            <p>Crop coefficient Kc: {displayValue(cropCoefficient)}</p>
          </div>
          <div>
            <span>WATER VOLUME</span>
            <strong>{waterVolume === null || waterVolume === undefined ? 'Unavailable' : (waterVolume / 1000).toFixed(1)}<small>{waterVolume === null || waterVolume === undefined ? '' : ' kL'}</small></strong>
            <p><Waves size={13} /> Delivered to the root zone</p>
          </div>
          <div>
            <span>PUMP WINDOW</span>
            <strong>{displayValue(pumpRuntime)}<small>{pumpRuntime === null || pumpRuntime === undefined ? '' : ' min'}</small></strong>
            <p><Clock3 size={13} /> {farm.pump_flow_rate_lpm ? `At ${farm.pump_flow_rate_lpm} L/min` : 'Flow rate unconfigured'}</p>
          </div>
        </section>
      )}

      <div className="dashboard-section-heading animate-arrive stagger-3">
        <div>
          <span className="workspace-eyebrow">AGRONOMIC STRESS & ROOT-ZONE DIAGNOSTICS</span>
          <h2>Signals verified by science.</h2>
        </div>
        <Link to="/app/intelligence">Open all intelligence <ArrowRight size={15} /></Link>
      </div>

      {explanation && (
        <section className="dashboard-explanation animate-arrive stagger-3 hover-elevate">
          <span className="workspace-eyebrow">{t('explanation_title')}</span>
          <p>{explanation}</p>
        </section>
      )}

      <div className="animate-arrive stagger-4 space-y-4">
        <ShareSummary farm={farm} recommendation={recommendation} />
        <RiskAssessmentCard
          underRisk={underRisk || 'Moderate'}
          underNote={underNote}
          overRisk={overRisk || 'Low'}
          overNote={overNote}
        />
        <AlertsList alerts={alerts} />
        <WeatherPanel weatherData={weatherDetails.forecast} rainWarning={rainWarning} isDemo={isDemoData} weatherSource={weatherStatus} />
        <IrrigationSchedule schedule={recommendation.seven_day_schedule || []} />
      </div>

      <div className="animate-arrive stagger-5">
        <AnalyticsCharts recommendation={recommendation} />
      </div>

      <div className="dashboard-section-heading dashboard-schedule-link animate-arrive stagger-5">
        <div>
          <span className="workspace-eyebrow">7-DAY PREDICTIVE FAO-56 SCHEDULE</span>
          <h2>Plan water with evidence.</h2>
        </div>
        <Link to="/app/schedule">Open seven-day schedule <ArrowRight size={15} /></Link>
      </div>
    </div>
  );
}
