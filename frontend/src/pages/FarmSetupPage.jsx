import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  Save,
  MapPin,
  Droplets,
  CheckCircle2,
  Navigation,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { getFarms, saveFarm, getCrops, getSoils, loadDemoPreset } from '../services/api';
import { defaultFarm, karnatakaDistricts, irrigationMethods } from '../data/mockFarm';
import LoadingState from '../components/LoadingState';

export default function FarmSetupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [crops, setCrops] = useState([]);
  const [soils, setSoils] = useState([]);
  const [formData, setFormData] = useState(defaultFarm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(null); // null | 'detecting' | 'success' | 'error'
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cropsData, soilsData, farms] = await Promise.all([
          getCrops(),
          getSoils(),
          getFarms(),
        ]);
        setCrops(cropsData);
        setSoils(soilsData);
        if (farms && farms.length > 0) {
          setFormData(farms[0]);
        }
      } catch (err) {
        console.error('Error loading setup options:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Browser Geolocation integration
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: parseFloat(position.coords.latitude.toFixed(4)),
          longitude: parseFloat(position.coords.longitude.toFixed(4)),
        }));
        setGpsStatus('success');
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
        setGpsStatus('error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Quick Demo Preset Load
  const handleLoadDemo = () => {
    const preset = loadDemoPreset();
    setFormData(preset);
    setValidationErrors({});
    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/');
    }, 800);
  };

  const validate = () => {
    const errors = {};
    if (!formData.farm_name || formData.farm_name.trim().length === 0) {
      errors.farm_name = 'Please provide a name for your farm.';
    }
    if (formData.latitude === undefined || formData.latitude === '' || isNaN(formData.latitude)) {
      errors.latitude = 'Latitude is required (-90 to +90).';
    } else if (formData.latitude < -90 || formData.latitude > 90) {
      errors.latitude = 'Latitude must be between -90 and 90.';
    }
    if (formData.longitude === undefined || formData.longitude === '' || isNaN(formData.longitude)) {
      errors.longitude = 'Longitude is required (-180 to +180).';
    } else if (formData.longitude < -180 || formData.longitude > 180) {
      errors.longitude = 'Longitude must be between -180 and 180.';
    }
    if (!formData.farm_area_hectares || formData.farm_area_hectares <= 0) {
      errors.farm_area_hectares = 'Area must be greater than 0 hectares.';
    }
    if (!formData.sowing_date) {
      errors.sowing_date = 'Please select the sowing date.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      await saveFarm(formData);
      setSavedSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 900);
    } catch (err) {
      console.error('Failed to save farm:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading farm parameters..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Title & Preset Action */}
      <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-14px bg-[#173F2A] text-white flex items-center justify-center shadow-sm shrink-0">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('farm_details')}</h2>
            <p className="text-xs text-slate-500">Configure your crop, soil, and field equipment</p>
          </div>
        </div>

        {/* Load Preset Button */}
        <button
          type="button"
          onClick={handleLoadDemo}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#DDE9D4] hover:bg-[#D4E3C9] text-[#173F2A] border border-[#173F2A]/15 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer self-start sm:self-center min-h-[44px]"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>{t('load_demo_preset')}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-emerald-950 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{t('saved_success')}</span>
        </div>
      )}

      {/* Main Farm Registration Form */}
      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-7 space-y-5">
        {/* Farm Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {t('farm_name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="farm_name"
            required
            value={formData.farm_name || ''}
            onChange={handleChange}
            placeholder={t('farm_name_placeholder')}
            className={`w-full px-3.5 py-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[48px] ${
              validationErrors.farm_name ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
            }`}
          />
          {validationErrors.farm_name && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {validationErrors.farm_name}
            </p>
          )}
        </div>

        {/* Location Section */}
        <div className="p-4.5 bg-white/50 backdrop-blur-md border border-[#173F2A]/10 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                {t('location_heading')}
              </span>
              <p className="text-[11px] text-slate-500">
                Used to retrieve local weather and evapotranspiration
              </p>
            </div>

            {/* Geolocation Button */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsStatus === 'detecting'}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer min-h-[44px]"
            >
              <Navigation className={`w-3.5 h-3.5 text-emerald-600 ${gpsStatus === 'detecting' ? 'animate-spin' : ''}`} />
              <span>
                {gpsStatus === 'detecting' ? t('gps_detecting') : t('use_gps')}
              </span>
            </button>
          </div>

          {/* GPS Status Feedback */}
          {gpsStatus === 'success' && (
            <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {t('gps_success')}
            </p>
          )}
          {gpsStatus === 'error' && (
            <p className="text-xs text-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {t('gps_denied')}
            </p>
          )}

          {/* District Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('district')}
            </label>
            <select
              name="district"
              value={formData.district || 'Bengaluru Rural'}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
            >
              {karnatakaDistricts.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Latitude & Longitude inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {t('latitude')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                required
                value={formData.latitude ?? ''}
                onChange={handleChange}
                placeholder="12.9716"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {validationErrors.latitude && (
                <span className="text-[10px] text-red-600 block mt-0.5">{validationErrors.latitude}</span>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {t('longitude')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                required
                value={formData.longitude ?? ''}
                onChange={handleChange}
                placeholder="77.5946"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {validationErrors.longitude && (
                <span className="text-[10px] text-red-600 block mt-0.5">{validationErrors.longitude}</span>
              )}
            </div>
          </div>

          {/* Lightweight Map Pin Visual Placeholder */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  {formData.district || 'Karnataka, India'}
                </span>
                <span className="text-[10px] text-emerald-800">
                  Coords: {formData.latitude || '12.9716'}° N, {formData.longitude || '77.5946'}° E
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-white text-emerald-800 px-2 py-1 rounded-md border border-emerald-200 font-semibold">
              Pin Captured
            </span>
          </div>
        </div>

        {/* Crop Selection (Visual Cards) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {t('crop_name')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {crops.map((c) => {
              const isSelected = formData.crop === c.name;
              return (
                <button
                  type="button"
                  key={c.id || c.name}
                  onClick={() => setFormData((prev) => ({ ...prev, crop: c.name }))}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[68px] ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 text-emerald-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{c.icon || '🌱'}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{c.name}</span>
                    <span className="text-[10px] text-slate-500">{c.duration_days} days cycle</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Area & Sowing Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('area_ha')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              name="farm_area_hectares"
              required
              value={formData.farm_area_hectares ?? 1.5}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
            />
            {validationErrors.farm_area_hectares && (
              <span className="text-xs text-red-600 block mt-0.5">{validationErrors.farm_area_hectares}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('sowing_date')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="sowing_date"
              required
              value={formData.sowing_date || '2026-10-15'}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
            />
            {validationErrors.sowing_date && (
              <span className="text-xs text-red-600 block mt-0.5">{validationErrors.sowing_date}</span>
            )}
          </div>
        </div>

        {/* Soil Type Selection (Visual Cards with Descriptions) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {t('soil_type')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {soils.map((s) => {
              const isSelected = formData.soil_type === s.name;
              return (
                <div
                  key={s.id || s.name}
                  onClick={() => setFormData((prev) => ({ ...prev, soil_type: s.name }))}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{s.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-700" />}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Irrigation Method Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {t('irrigation_type')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {irrigationMethods.map((m) => {
              const isSelected = formData.irrigation_method === m.name;
              return (
                <button
                  type="button"
                  key={m.id || m.name}
                  onClick={() => setFormData((prev) => ({ ...prev, irrigation_method: m.name }))}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[76px] ${
                    isSelected
                      ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500 text-sky-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700">
                      {m.efficiency}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {m.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pump Flow Rate & Last Irrigation Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('pump_rate')}
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <input
              type="number"
              step="10"
              min="0"
              name="pump_flow_rate_lpm"
              value={formData.pump_flow_rate_lpm ?? 120}
              onChange={handleChange}
              placeholder="e.g. 120"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
            />
            <p className="mt-1 text-[10px] text-slate-500">{t('pump_rate_hint')}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('last_irrigation')}
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <input
              type="date"
              name="last_irrigation_date"
              value={formData.last_irrigation_date || '2026-11-02'}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        {/* Submit Button (Large touch target for phones) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full h-13 bg-[#173F2A] hover:bg-[#1F5237] active:scale-[0.99] text-white font-semibold rounded-full shadow-lg shadow-[#173F2A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? t('saving') : t('save_profile')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
