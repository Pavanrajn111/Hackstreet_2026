import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Droplet,
  PauseCircle,
  CloudRain,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from 'lucide-react';
import { useI18n } from '../i18n';

export default function IrrigationSchedule({ schedule = [] }) {
  const { t } = useI18n();

  const chartData = schedule.map((item) => ({
    name: item.day,
    volume: item.water_volume_litres || 0,
    depth: item.recommended_depth_mm || 0,
    irrigate: item.irrigate,
  }));

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
        Irrigate: NO
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-700" />
            {t('weekly_plan')}
          </h3>
          <p className="text-xs text-slate-500">
            Daily water requirements and planned pump runtime
          </p>
        </div>
      </div>

      {/* Visual Volume Distribution Chart */}
      <div className="h-44 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis unit="L" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val) => [`${val.toLocaleString()} L`, 'Water Volume']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Bar dataKey="volume" fill="#0284c7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 7-Day Vertical Card List (Mobile-Optimized) */}
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
                    {item.runtime_minutes > 0 && (
                      <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.runtime_minutes} mins
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
    </div>
  );
}
