import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Droplet,
  PauseCircle,
  CloudRain,
  Clock,
  CalendarDays,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';

export default function IrrigationSchedule({ schedule = [] }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('volume'); // 'volume' | 'depletion' | 'demand'

  const chartData = schedule.map((item) => {
    const isIrrigate = item.irrigate || item.action === 'Irrigate';
    const isRainPause = item.action === 'Rain Pause';
    let barColor = '#64748b'; // default slate for Rest
    if (isRainPause) barColor = '#0284c7'; // sky blue
    else if (isIrrigate) barColor = '#10b981'; // emerald green

    return {
      name: item.day,
      date: item.date ? item.date.replace('2026-', '') : '',
      volume: Number(item.water_volume_litres) || 0,
      depth: Number(item.recommended_depth_mm) || 0,
      etc: Number(item.etc_mm) || 0,
      et0: Number(item.et0_mm) || 0,
      rain: Number(item.rainfall_mm) || 0,
      depletion: Number(item.simulated_depletion_mm) || 0,
      raw: Number(item.raw_mm) || 15.0,
      soilPct: Number(item.soil_water_status_pct) ?? 100,
      action: item.action,
      irrigate: isIrrigate,
      barColor,
    };
  });

  const rawThreshold = chartData[0]?.raw || 15.0;

  const getStatusBadge = (item) => {
    if (item.action === 'Rain Pause') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-900 bg-sky-100 border border-sky-300 px-2.5 py-1 rounded-full">
          <CloudRain className="w-3.5 h-3.5 text-sky-600" />
          Rain Pause
        </span>
      );
    }
    if (item.irrigate || item.action === 'Irrigate') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
          <Droplet className="w-3.5 h-3.5 text-emerald-700 fill-current" />
          Irrigate: YES
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-full">
        <PauseCircle className="w-3.5 h-3.5 text-slate-400" />
        Rest / Conserve
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
      {/* Header & Graph Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-700" />
            {t('weekly_plan')}
          </h3>
          <p className="text-xs text-slate-500">
            Daily water requirements, soil depletion tracking and planned runtime
          </p>
        </div>

        {schedule.length > 0 && (
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'volume'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('volume')}
            >
              Water Volume
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'depletion'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('depletion')}
            >
              Soil Depletion
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'demand'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('demand')}
            >
              ETc vs Rain
            </button>
          </div>
        )}
      </div>

      {schedule.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <CalendarDays className="w-7 h-7 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No irrigation schedule returned.</p>
          <p className="text-[11px] text-slate-500 mt-1">The recommendation does not include scheduled events for this farm.</p>
        </div>
      ) : (
        <>
          {/* Active Chart Display */}
          <div className="h-52 w-full pt-1">
            {activeTab === 'volume' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis unit="L" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val.toLocaleString()} L (${item.payload.depth} mm)`,
                      item.payload.action === 'Rain Pause'
                        ? 'Rain Pause (0 L)'
                        : item.payload.irrigate
                        ? 'Irrigation Volume'
                        : 'Rest Day (0 L)',
                    ]}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.barColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'depletion' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="depletionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis unit="mm" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} mm (Moisture: ${item.payload.soilPct}%)`,
                      'Root-zone Depletion',
                    ]}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <ReferenceLine
                    y={rawThreshold}
                    label={{ value: 'Refill Trigger (RAW)', fill: '#ef4444', fontSize: 10, position: 'top' }}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                  />
                  <Area
                    type="monotone"
                    dataKey="depletion"
                    stroke="#d97706"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#depletionGrad)"
                    name="Soil Depletion"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'demand' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis unit="mm" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val, name) => [`${val} mm`, name === 'etc' ? 'Crop Water Demand (ETc)' : 'Forecast Rainfall']}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="etc" name="Crop Demand (ETc)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rain" name="Forecast Rain" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Legend / Stat Strip */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Irrigate Day
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> Rain Pause
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> Rest / Buffer
              </span>
            </div>
            <div className="flex items-center gap-1 font-medium text-slate-700">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>Trigger Depth: {rawThreshold} mm</span>
            </div>
          </div>

          {/* 7-Day Vertical Card List */}
          <div className="divide-y divide-slate-100">
            {schedule.map((item, index) => (
              <div
                key={item.date || index}
                className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                  index === 0 ? 'bg-emerald-50/70 -mx-4 px-4 rounded-xl border border-emerald-200 font-semibold' : ''
                }`}
              >
                {/* Left: Date, Day & Recommended Yes/No */}
                <div className="flex items-center gap-3">
                  <div className="w-14 text-center shrink-0">
                    <span className="text-xs font-extrabold text-slate-800 block">
                      {item.day}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.date ? item.date.replace('2026-', '') : ''}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {getStatusBadge(item)}
                      {item.recommended_depth_mm > 0 && (
                        <span className="text-xs font-bold text-slate-800">
                          {item.recommended_depth_mm} mm
                        </span>
                      )}
                      {item.soil_water_status_pct !== null && item.soil_water_status_pct !== undefined && (
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          Soil: {item.soil_water_status_pct}%
                        </span>
                      )}
                    </div>
                    {item.rain_note && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-slate-400" />
                        {item.rain_note}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Water Amount & Pump Time */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-14 sm:pl-0 pt-1 sm:pt-0">
                  <div className="text-right">
                    {item.water_volume_litres > 0 ? (
                      <>
                        <span className="text-xs font-extrabold text-sky-950 block">
                          {item.water_volume_litres.toLocaleString()} L
                        </span>
                        {item.runtime_minutes > 0 ? (
                          <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.runtime_minutes} mins
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">
                            Flow unconfigured
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">0 Litres</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
