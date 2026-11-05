import React from 'react';
import { CloudRain, Sun, Cloud, CloudSun, AlertTriangle, Droplet } from 'lucide-react';
import { useI18n } from '../i18n';

export default function WeatherPanel({ weatherData = [], rainWarning = null, isDemo = true, weatherSource = 'unknown' }) {
  const { t } = useI18n();

  const getWeatherIcon = (condition) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('rain') || c.includes('shower')) return <CloudRain className="w-5 h-5 text-sky-500" />;
    if (c.includes('cloud') && !c.includes('partly')) return <Cloud className="w-5 h-5 text-slate-400" />;
    if (c.includes('partly')) return <CloudSun className="w-5 h-5 text-amber-500" />;
    return <Sun className="w-5 h-5 text-amber-500" />;
  };

  // Check if rain is expected in upcoming 3 days
  const upcomingRain = weatherData.slice(0, 4).some((d) => (d.rainfall_mm || 0) >= 4.0 || (d.rain_probability_pct || 0) >= 60);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {t('weather_forecast')}
          </h3>
          <p className="text-xs text-slate-500">Local rainfall, temperatures & evapotranspiration</p>
        </div>
        {!isDemo && weatherSource !== 'unknown' && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold border border-slate-200">
            {weatherSource} weather
          </span>
        )}
        {isDemo && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold border border-slate-200">
            {t('demo_pill')}
          </span>
        )}
      </div>

      {/* Prominent Rain Warning Banner as required */}
      {upcomingRain && (
        <div className="p-3.5 bg-sky-50 border border-sky-300 rounded-xl flex items-start gap-2.5 text-sky-950 text-xs shadow-xs">
          <CloudRain className="w-5 h-5 text-sky-600 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <span className="font-bold block text-sm mb-0.5 text-sky-900">
              {t('rain_alert')}
            </span>
            <span className="text-sky-800">{rainWarning || 'Significant precipitation predicted within the next 72 hours. Check your field moisture before running pumps.'}</span>
          </div>
        </div>
      )}

      {/* Horizontal Weather Strip (Phone-First, smooth scroll) */}
      <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar -mx-1 px-1">
        {weatherData.map((day, index) => (
          <div
            key={day.date || index}
            className={`flex-1 min-w-[82px] p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
              index === 0
                ? 'bg-emerald-50/80 border-emerald-300 font-semibold text-emerald-950 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span className="text-xs font-bold opacity-80">{day.day}</span>
            <div className="my-1.5">{getWeatherIcon(day.condition)}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-extrabold">{Math.round(day.temp_max_c)}°</span>
              <span className="text-[10px] text-slate-400">{Math.round(day.temp_min_c)}°</span>
            </div>
            <span className="mt-1 text-[10px] text-slate-500">
              {typeof day.humidity_pct === 'number' ? `${day.humidity_pct}% humidity` : 'Humidity unavailable'}
            </span>
            <span className="text-[10px] text-slate-500">
              {typeof day.et0_mm === 'number' ? `${day.et0_mm} mm ET0` : 'ET0 unavailable'}
            </span>
            <span className="text-[10px] text-slate-500 truncate max-w-full" title={day.condition || undefined}>
              {day.condition || 'Condition unavailable'}
            </span>

            {/* Rainfall mm */}
            {day.rainfall_mm > 0 ? (
              <span className="mt-1 text-[10px] text-sky-600 font-bold flex items-center gap-0.5">
                <Droplet className="w-2.5 h-2.5 fill-current" />
                {day.rainfall_mm}mm
              </span>
            ) : (
              <span className="mt-1 text-[10px] text-slate-400">0 mm</span>
            )}

            {/* Rain Probability % */}
            {typeof day.rain_probability_pct === 'number' && (
              <span
                className={`text-[9px] mt-0.5 font-semibold px-1 py-0.2 rounded ${
                  day.rain_probability_pct >= 50
                    ? 'text-sky-800 bg-sky-100 font-bold'
                    : 'text-slate-400'
                }`}
              >
                {day.rain_probability_pct}% rain
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
