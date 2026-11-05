import React, { useState, useEffect } from 'react';
import { Calendar, Droplets, Info, CloudRain, Clock, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { getRecommendation, getFarms } from '../services/api';
import IrrigationSchedule from '../components/IrrigationSchedule';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import DemoBanner from '../components/DemoBanner';

export default function SchedulePage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [recommendation, setRecommendation] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const farms = await getFarms();
      const currentFarm = farms[0];
      const rec = await getRecommendation(currentFarm);
      setRecommendation(rec);
      setSchedule(rec.seven_day_schedule || []);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError('Could not load irrigation schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleModeChange = () => loadData();
    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    return () => window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
  }, []);

  if (loading) return <LoadingState message="Calculating 7-day irrigation plan..." />;
  if (error && schedule.length === 0) return <ErrorState message={error} onRetry={loadData} />;

  const totalWeeklyWater = schedule.reduce((sum, item) => sum + (item.water_volume_litres || 0), 0);
  const irrigationDaysCount = schedule.filter((item) => item.irrigate || item.action === 'Irrigate').length;
  const rainDaysCount = schedule.filter((item) => item.action === 'Rain Pause').length;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Simulation / Offline banner */}
      <DemoBanner isCached={recommendation?.is_cached} />

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 text-sky-800 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('weekly_plan')}</h2>
            <p className="text-xs text-slate-500">Planned water volumes and pump runtime</p>
          </div>
        </div>

        {/* Weekly Metric Box */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-3.5 py-2.5 text-right self-start sm:self-center">
          <span className="text-[11px] text-sky-700 block font-bold">Planned Weekly Total</span>
          <span className="text-lg font-black text-sky-950">
            {totalWeeklyWater.toLocaleString()} L
          </span>
          <span className="text-[10px] text-sky-600 block">
            {irrigationDaysCount} irrigation cycles • {rainDaysCount} rain pauses
          </span>
        </div>
      </div>

      {/* Main Schedule Component */}
      <IrrigationSchedule schedule={schedule} />

      {/* Rain Pause Explanatory Tip */}
      {rainDaysCount > 0 && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3 text-sky-950 text-xs">
          <CloudRain className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm mb-0.5">Automated Rain Pause Protection</span>
            <p className="text-slate-700 leading-relaxed">
              When rain of 4 mm or more is forecast, the engine pauses scheduled irrigation.
              This prevents waterlogged roots, nitrogen leaching, and unnecessary electric pump bills.
            </p>
          </div>
        </div>
      )}

      {/* Best Practice Tip for Farmers */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-950 text-xs">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-0.5">Irrigation Best Practice Tip</span>
          <p className="text-slate-700 leading-relaxed">
            Irrigate during early morning hours (6:00 AM – 9:00 AM) or late evening to minimize
            evaporative loss. During sunny mid-day periods, up to 30% of applied water can be lost to solar evapotranspiration.
          </p>
        </div>
      </div>
    </div>
  );
}
