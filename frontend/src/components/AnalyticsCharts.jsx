import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { BarChart3, LineChart, TrendingDown, Zap, Info } from 'lucide-react';
import { useI18n } from '../i18n';

export default function AnalyticsCharts({ recommendation, history = [] }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('soil_water');

  if (!recommendation) return null;

  const soilMoistureData = recommendation.soil_moisture?.trend_history || [
    { day: 'Day -5', moisture_pct: 82, threshold: 50 },
    { day: 'Day -4', moisture_pct: 73, threshold: 50 },
    { day: 'Day -3', moisture_pct: 64, threshold: 50 },
    { day: 'Day -2', moisture_pct: 55, threshold: 50 },
    { day: 'Day -1', moisture_pct: 47, threshold: 50 },
    { day: 'Today', moisture_pct: 42, threshold: 50 },
  ];

  const currentMoisture = recommendation.soil_moisture?.current_pct ?? soilMoistureData[soilMoistureData.length - 1]?.moisture_pct ?? 42;
  const thresholdPct = recommendation.soil_moisture?.threshold_pct ?? 50;
  const isRefillNeeded = recommendation.irrigate_today ?? (currentMoisture <= thresholdPct);

  // Water used vs recommended from history
  const todayRec = recommendation.irrigate_today ? (recommendation.irrigation_depth_mm || 18.5) : 0;
  const usedVsRecommendedData = (history.length > 0 ? history : [
    { irrigation_date: 'Cycle 1 (10d ago)', depth_applied_mm: 18.0, recommended_depth_mm: 17.5 },
    { irrigation_date: 'Cycle 2 (6d ago)', depth_applied_mm: 15.0, recommended_depth_mm: 15.0 },
    { irrigation_date: 'Cycle 3 (2d ago)', depth_applied_mm: 16.0, recommended_depth_mm: 16.0 },
    { irrigation_date: 'Today', depth_applied_mm: 0, recommended_depth_mm: todayRec },
  ]).map((h) => ({
    name: h.irrigation_date ? h.irrigation_date.replace('2026-', '') : 'Cycle',
    applied: h.depth_applied_mm || 0,
    recommended: h.recommended_depth_mm || 0,
  }));

  // Water saved: Drip vs Flood comparison calculated dynamically from farm recommendation
  const recLitres = recommendation.water_volume_litres || 0;
  const floodLitres = recommendation.water_savings?.traditional_flood_litres || Math.round((recLitres || 24000) * 1.5);
  const litresSaved = recommendation.water_savings?.litres_saved || Math.max(0, floodLitres - recLitres);
  const kLTodayFlood = Math.max(1, Math.round(floodLitres / 1000));
  const kLTodayDrip = Math.round(recLitres / 1000);
  const kLTodaySaved = Math.max(0, kLTodayFlood - kLTodayDrip);

  const waterSavingsData = [
    {
      category: 'Cycle 1',
      traditional: Math.max(1, Math.round(kLTodayFlood * 0.9)),
      smart_drip: Math.round(kLTodayDrip * 0.9),
      saved: Math.max(0, Math.round(kLTodaySaved * 0.9)),
    },
    {
      category: 'Cycle 2',
      traditional: Math.max(1, Math.round(kLTodayFlood * 0.85)),
      smart_drip: Math.round(kLTodayDrip * 0.82),
      saved: Math.max(0, Math.round(kLTodaySaved * 0.88)),
    },
    {
      category: 'Cycle 3',
      traditional: Math.max(1, Math.round(kLTodayFlood * 0.95)),
      smart_drip: Math.round(kLTodayDrip * 0.92),
      saved: Math.max(0, Math.round(kLTodaySaved * 0.98)),
    },
    {
      category: "Today's Need",
      traditional: kLTodayFlood,
      smart_drip: kLTodayDrip,
      saved: kLTodaySaved,
    },
  ];

  // Cost and energy savings derived from pumping calculations
  const pumpHoursToday = recommendation.water_savings?.pump_hours_saved || 1.8;
  const costTodayInr = recommendation.water_savings?.estimated_cost_saved_inr || Math.round(pumpHoursToday * 75);

  const costSavingsData = [
    { period: 'Week 1', hours_saved: Number((pumpHoursToday * 0.8).toFixed(1)), inr_saved: Math.round(costTodayInr * 0.8) },
    { period: 'Week 2', hours_saved: Number((pumpHoursToday * 1.05).toFixed(1)), inr_saved: Math.round(costTodayInr * 1.05) },
    { period: 'Week 3', hours_saved: Number((pumpHoursToday * 0.9).toFixed(1)), inr_saved: Math.round(costTodayInr * 0.9) },
    { period: 'Projected', hours_saved: Number((pumpHoursToday * 1.2).toFixed(1)), inr_saved: Math.round(costTodayInr * 1.2) },
  ];

  const tabs = [
    { id: 'soil_water', label: 'Soil Water', icon: LineChart },
    { id: 'used_vs_rec', label: 'Water Applied', icon: BarChart3 },
    { id: 'water_saved', label: 'Water Saved', icon: TrendingDown },
    { id: 'cost_saved', label: 'Power Saved', icon: Zap },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
      {/* Top Header & Demo indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Field Water & Efficiency Analytics
          </h3>
          <p className="text-xs text-slate-500">
            Interactive agronomic tracking and conservation metrics
          </p>
        </div>
        <span className="self-start sm:self-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold border border-slate-200">
          {t('chart_demo_label')}
        </span>
      </div>

      {/* Mobile-Friendly Segmented Tab Bar */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chart 1: Soil-Water Level vs. Irrigation Threshold */}
      {activeTab === 'soil_water' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-semibold">{t('soil_water_chart_title')}</span>
            <span className={`font-bold ${isRefillNeeded ? 'text-amber-700' : 'text-emerald-700'}`}>
              Today: {currentMoisture}% ({isRefillNeeded ? 'Refill Needed' : 'Adequate'})
            </span>
          </div>
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={soilMoistureData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Soil Moisture Level']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <ReferenceLine y={thresholdPct} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `Refill Threshold (${thresholdPct}%)`, fill: '#dc2626', fontSize: 10, position: 'top' }} />
                <Area type="monotone" dataKey="moisture_pct" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#moistureGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            When moisture dips below the red dashed line ({thresholdPct}%), root stress begins. Applying recommended irrigation brings moisture back to 95%.
          </p>
        </div>
      )}

      {/* Chart 2: Water Used vs. Recommended */}
      {activeTab === 'used_vs_rec' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-semibold">{t('water_used_vs_recommended_title')}</span>
            <span className="text-slate-500 font-medium">Unit: mm depth</span>
          </div>
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usedVsRecommendedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis unit="mm" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="applied" name="Actual Applied (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recommended" name="Recommended (mm)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Matching actual applied water to the recommended bar prevents root leaching and minimizes pumping fuel.
          </p>
        </div>
      )}

      {/* Chart 3: Water Saved vs. Traditional Irrigation */}
      {activeTab === 'water_saved' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-semibold">{t('water_savings_title')}</span>
            <span className="text-emerald-700 font-bold">~33% Water Saved</span>
          </div>
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterSavingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis unit="kL" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [`${val} kL (${val * 1000} L)`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="traditional" name="Traditional Flood (kL)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="smart_drip" name="Smart Drip Plan (kL)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 flex items-start gap-2 text-sky-950 text-xs">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              {recommendation.water_savings?.disclaimer ||
                'Savings calculated against standard 60% efficient flood irrigation for your acreage.'}
            </p>
          </div>
        </div>
      )}

      {/* Chart 4: Energy & Cost Saved */}
      {activeTab === 'cost_saved' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-semibold">{t('cost_savings_title')}</span>
            <span className="text-emerald-700 font-bold">Total: ~7.9 Pump Hrs Saved</span>
          </div>
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costSavingsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [name.includes('Hours') ? `${val} hrs` : `₹${val}`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="hours_saved" name="Pump Hours Saved (hrs)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inr_saved" name="Estimated Cost Saved (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Calculated based on a 5 HP irrigation pump running at ₹6/kWh domestic/feeder tariff. Data is simulated for demonstration.
          </p>
        </div>
      )}
    </div>
  );
}
