import React, { useState, useEffect, useRef } from 'react';
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
  Filter,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { getHistory, recordIrrigation, getFarms, isMockMode } from '../services/api';
import { listFarmHistory, listHistory, recordHistory } from '../services/historyService';
import { getActiveFarmId } from '../services/farmSelection';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function HistoryPage() {
  const { t } = useI18n();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [farm, setFarm] = useState(null);
  const [farms, setFarms] = useState([]);
  const [farmFilter, setFarmFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const requestSequence = useRef(0);

  // New Log Form State
  const [logForm, setLogForm] = useState({
    irrigation_date: new Date().toISOString().split('T')[0],
    depth_applied_mm: 18.0,
    volume_applied_litres: 270000,
    pump_runtime_minutes: 225,
    was_recommended: true,
    notes: 'Scheduled drip cycle completed.',
  });

  const getDateRange = () => {
    if (dateFilter === 'custom') {
      return { start_date: customStart || undefined, end_date: customEnd || undefined };
    }
    if (dateFilter === 'all') return {};
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (Number(dateFilter) - 1));
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    };
  };

  const loadData = async () => {
    const currentRequest = requestSequence.current + 1;
    requestSequence.current = currentRequest;
    try {
      setLoading(true);
      setError('');
      const farmsData = await getFarms();
      if (currentRequest !== requestSequence.current) return;
      const availableFarms = Array.isArray(farmsData) ? farmsData : [];
      setFarms(availableFarms);
      const activeId = getActiveFarmId();
      const activeFarm = availableFarms.find((candidate) => String(candidate.id ?? candidate.farm_name) === String(activeId))
        || availableFarms[0]
        || null;
      const selectedFarm = farmFilter === 'all'
        ? null
        : availableFarms.find((candidate) => String(candidate.id ?? candidate.farm_name) === String(farmFilter));
      const currentFarm = selectedFarm || activeFarm;
      setFarm(currentFarm);
      const params = { ...getDateRange(), limit: 500, offset: 0 };
      let historyData;
      if (isMockMode()) {
        historyData = await getHistory(selectedFarm?.id || null);
        historyData = historyData.filter((item) => {
          const date = item.irrigation_date;
          return (!params.start_date || date >= params.start_date) && (!params.end_date || date <= params.end_date);
        });
      } else if (selectedFarm?.id !== undefined) {
        historyData = await listFarmHistory(selectedFarm.id, params);
      } else if (farmFilter === 'all') {
        historyData = await listHistory(params);
      } else {
        historyData = [];
      }
      if (currentRequest !== requestSequence.current) return;
      setHistoryList(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      if (currentRequest !== requestSequence + 1) return;
      const canUseOfflineFallback = err?.code === 'NETWORK_ERROR' || err?.code === 'TIMEOUT';
      if (canUseOfflineFallback) {
        try {
          const fallback = await getHistory(farmFilter === 'all' ? null : Number(farmFilter));
          setHistoryList(Array.isArray(fallback) ? fallback : []);
          setError('Showing locally cached history.');
        } catch (fallbackError) {
          setError('Could not load irrigation history.');
        }
      } else {
        setError(err?.message || 'Could not load irrigation history.');
      }
    } finally {
      if (currentRequest === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleModeChange = () => loadData();
    const handleFarmChange = () => loadData();
    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    window.addEventListener('agr002_active_farm_changed', handleFarmChange);
    window.addEventListener('agr002_farm_updated', handleFarmChange);
    return () => {
      window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
      window.removeEventListener('agr002_active_farm_changed', handleFarmChange);
      window.removeEventListener('agr002_farm_updated', handleFarmChange);
    };
  }, [farmFilter, dateFilter, customStart, customEnd]);

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      const area = farm?.farm_area_hectares || 1.5;
      const calculatedVolume = Math.round(logForm.depth_applied_mm * area * 10000);
      const pumpRate = farm?.pump_flow_rate_lpm || 120;
      const calculatedRuntime = Math.round(calculatedVolume / pumpRate);

      const payload = {
        ...logForm,
        farm_id: farm?.id,
        crop: farm?.crop || 'Tomato',
        volume_applied_litres: calculatedVolume,
        pump_runtime_minutes: calculatedRuntime,
        water_saved_litres: Math.round(calculatedVolume * 0.35),
      };
      const entry = isMockMode() ? await recordIrrigation(payload) : await recordHistory(payload);

      setHistoryList((prev) => [entry, ...prev]);
      setShowLogModal(false);
    } catch (err) {
      console.error('Failed to log irrigation:', err);
    }
  };

  if (loading) return <LoadingState message="Fetching irrigation records..." />;
  if (error && historyList.length === 0 && !error.includes('cached')) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const totalWaterApplied = historyList.reduce((sum, item) => sum + (Number(item.volume_applied_litres) || 0), 0);
  const averageWaterApplied = historyList.length ? totalWaterApplied / historyList.length : null;
  const totalWaterSaved = historyList.reduce((sum, item) => sum + (Number(item.water_saved_litres) || 0), 0);
  const historyChart = historyList.slice().reverse().map((item) => ({
    date: item.irrigation_date || 'Unknown',
    litres: Number(item.volume_applied_litres) || 0,
  }));
  const farmNameById = Object.fromEntries(farms.map((item) => [item.id, item.farm_name]));

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header Bar */}
      <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-14px bg-[#173F2A] text-white flex items-center justify-center shadow-sm shrink-0">
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
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#173F2A] hover:bg-[#1F5237] text-white rounded-full text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('log_irrigation_btn')}</span>
        </button>
      </div>

      {error && <div className="history-notice"><Filter className="w-4 h-4" />{error}</div>}

      <section className="history-filters">
        <label>
          Farm
          <select value={farmFilter} onChange={(event) => setFarmFilter(event.target.value)}>
            <option value="all">All farms</option>
            {farms.map((item) => <option key={item.id ?? item.farm_name} value={item.id ?? item.farm_name}>{item.farm_name || 'Unnamed farm'}</option>)}
          </select>
        </label>
        <label>
          Date range
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All available</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        {dateFilter === 'custom' && (
          <>
            <label>From<input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label>
            <label>To<input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label>
          </>
        )}
      </section>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl">
          <span className="text-[11px] font-bold text-purple-700 block uppercase tracking-wider">
            {t('logged_total')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-purple-950">
            {historyList.length ? `${totalWaterApplied.toLocaleString()} L` : 'Unavailable'}
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
            {historyList.length ? `${totalWaterSaved.toLocaleString()} L` : 'Unavailable'}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">
            vs. flood irrigation baseline
          </span>
        </div>
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl">
          <span className="text-[11px] font-bold text-sky-700 block uppercase tracking-wider">Average water</span>
          <span className="text-xl sm:text-2xl font-black text-sky-950">{averageWaterApplied === null ? 'Unavailable' : `${Math.round(averageWaterApplied).toLocaleString()} L`}</span>
          <span className="text-[10px] text-sky-600 block mt-0.5">Per recorded event</span>
        </div>
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
          <span className="text-[11px] font-bold text-amber-700 block uppercase tracking-wider">Events</span>
          <span className="text-xl sm:text-2xl font-black text-amber-950">{historyList.length || 'Unavailable'}</span>
          <span className="text-[10px] text-amber-600 block mt-0.5">Returned records</span>
        </div>
      </div>

      {historyChart.length > 0 && (
        <section className="history-chart-card">
          <div>
            <span className="workspace-eyebrow">WATER OVER TIME</span>
            <h3>Recorded usage.</h3>
            <p>Only irrigation records returned by the selected filter.</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyChart} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eee8" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis unit=" L" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} L`, 'Water used']} />
                <Line type="monotone" dataKey="litres" stroke="#537b47" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* History Log List */}
      <div className="glass-card divide-y divide-[#173F2A]/10 overflow-hidden">
        {historyList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {t('history_empty')}
          </div>
        ) : (
          historyList.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedRecord(item)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#173F2A]/[0.03] transition-colors w-full text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DDE9D4] text-[#173F2A] flex items-center justify-center shrink-0 mt-0.5 border border-[#173F2A]/10">
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
                  <p className="text-xs text-slate-500 mt-1">{farmNameById[item.farm_id] || (item.farm_id ? `Farm #${item.farm_id}` : 'Farm not linked')} · {item.crop || 'Crop unavailable'}{item.notes ? ` · ${item.notes}` : ''}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 text-right">
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    {item.depth_applied_mm === null || item.depth_applied_mm === undefined ? 'Unavailable' : `${item.depth_applied_mm} mm`}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {item.volume_applied_litres === null || item.volume_applied_litres === undefined ? 'Unavailable' : `${item.volume_applied_litres.toLocaleString()} L`}
                  </span>
                </div>
                {item.pump_runtime_minutes !== null && item.pump_runtime_minutes !== undefined && (
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.pump_runtime_minutes} mins</span>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-[#10251B]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal p-6 w-full max-w-md">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="workspace-eyebrow">IRRIGATION RECORD</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedRecord.irrigation_date || 'Date unavailable'}</h3>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} aria-label="Close record details"><X size={18} /></button>
            </div>
            <div className="history-detail-grid">
              <p><span>Farm</span><strong>{farmNameById[selectedRecord.farm_id] || (selectedRecord.farm_id ? `Farm #${selectedRecord.farm_id}` : 'Not linked')}</strong></p>
              <p><span>Crop</span><strong>{selectedRecord.crop || 'Unavailable'}</strong></p>
              <p><span>Depth</span><strong>{selectedRecord.depth_applied_mm ?? 'Unavailable'}{selectedRecord.depth_applied_mm === null || selectedRecord.depth_applied_mm === undefined ? '' : ' mm'}</strong></p>
              <p><span>Water volume</span><strong>{selectedRecord.volume_applied_litres ?? 'Unavailable'}{selectedRecord.volume_applied_litres === null || selectedRecord.volume_applied_litres === undefined ? '' : ' L'}</strong></p>
              <p><span>Pump runtime</span><strong>{selectedRecord.pump_runtime_minutes ?? 'Unavailable'}{selectedRecord.pump_runtime_minutes === null || selectedRecord.pump_runtime_minutes === undefined ? '' : ' minutes'}</strong></p>
              <p><span>Status</span><strong>{selectedRecord.was_recommended === true ? 'Recommended' : selectedRecord.was_recommended === false ? 'Manual run' : 'Unavailable'}</strong></p>
              <p><span>Risk information</span><strong>Not included in irrigation log response</strong></p>
            </div>
            {selectedRecord.notes && <p className="text-xs text-slate-500 mt-4">{selectedRecord.notes}</p>}
          </div>
        </div>
      )}

      {/* Manual Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#426930]" />
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#426930] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#426930] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#426930] focus:outline-none"
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
                  className="flex-1 py-2.5 rounded-full bg-[#173F2A] hover:bg-[#1F5237] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
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
