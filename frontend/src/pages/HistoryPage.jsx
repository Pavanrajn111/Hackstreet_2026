import React, { useState, useEffect } from 'react';
import {
  History,
  Droplets,
  CheckCircle,
  Clock,
  Plus,
  Calendar,
  X,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { getHistory, recordIrrigation, getFarms } from '../services/api';
import LoadingState from '../components/LoadingState';

export default function HistoryPage() {
  const { t } = useI18n();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [farm, setFarm] = useState(null);

  // New Log Form State
  const [logForm, setLogForm] = useState({
    irrigation_date: new Date().toISOString().split('T')[0],
    depth_applied_mm: 18.0,
    volume_applied_litres: 270000,
    pump_runtime_minutes: 225,
    was_recommended: true,
    notes: 'Scheduled drip cycle completed.',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const farms = await getFarms();
      const currentFarm = farms && farms.length > 0 ? farms[0] : null;
      setFarm(currentFarm);
      const historyData = await getHistory(currentFarm?.id);
      setHistoryList(historyData);
    } catch (err) {
      console.error('Failed to load history:', err);
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

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      const area = farm?.farm_area_hectares || 1.5;
      const calculatedVolume = Math.round(logForm.depth_applied_mm * area * 10000);
      const pumpRate = farm?.pump_flow_rate_lpm || 120;
      const calculatedRuntime = Math.round(calculatedVolume / pumpRate);

      const entry = await recordIrrigation({
        ...logForm,
        crop: farm?.crop || 'Tomato',
        volume_applied_litres: calculatedVolume,
        pump_runtime_minutes: calculatedRuntime,
        water_saved_litres: Math.round(calculatedVolume * 0.35),
      });

      setHistoryList((prev) => [entry, ...prev]);
      setShowLogModal(false);
    } catch (err) {
      console.error('Failed to log irrigation:', err);
    }
  };

  if (loading) return <LoadingState message="Fetching irrigation records..." />;

  const totalWaterApplied = historyList.reduce(
    (sum, item) => sum + (item.volume_applied_litres || 0),
    0
  );
  const totalWaterSaved = historyList.reduce(
    (sum, item) => sum + (item.water_saved_litres || 0),
    0
  );

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('history_title')}</h2>
            <p className="text-xs text-slate-500">Water accounting, compliance & logs</p>
          </div>
        </div>

        {/* Quick Log Button */}
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('log_irrigation_btn')}</span>
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl">
          <span className="text-[11px] font-bold text-purple-700 block uppercase tracking-wider">
            {t('logged_total')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-purple-950">
            {totalWaterApplied.toLocaleString()} L
          </span>
          <span className="text-[10px] text-purple-600 block mt-0.5">
            {historyList.length} recorded events
          </span>
        </div>

        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <span className="text-[11px] font-bold text-emerald-700 block uppercase tracking-wider flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            {t('water_saved_total')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-950">
            {totalWaterSaved.toLocaleString()} L
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">
            vs. flood irrigation baseline
          </span>
        </div>
      </div>

      {/* History Log List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {historyList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {t('history_empty')}
          </div>
        ) : (
          historyList.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 border border-sky-100">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {item.irrigation_date}
                    </span>
                    {item.was_recommended ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Recommended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        Manual Run
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.notes}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 text-right">
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    {item.depth_applied_mm} mm
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {(item.volume_applied_litres || 0).toLocaleString()} L
                  </span>
                </div>
                {item.pump_runtime_minutes && (
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.pump_runtime_minutes} mins</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-purple-600" />
                Record Irrigation Event
              </h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Irrigation Date
                </label>
                <input
                  type="date"
                  required
                  value={logForm.irrigation_date}
                  onChange={(e) => setLogForm({ ...logForm, irrigation_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Depth Applied (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={logForm.depth_applied_mm}
                  onChange={(e) => setLogForm({ ...logForm, depth_applied_mm: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  Approx {Math.round((logForm.depth_applied_mm || 0) * (farm?.farm_area_hectares || 1.5) * 10000).toLocaleString()} Litres for your {farm?.farm_area_hectares || 1.5} ha
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="e.g. Morning drip run"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
