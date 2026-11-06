import React from 'react';
import { CloudRain, Sun, Cloud, CloudSun, Droplet, Gauge, Thermometer, Wind } from 'lucide-react';
import { useI18n } from '../i18n';

export default function WeatherPanel({ weatherData = [], rainWarning = null, isDemo = true, weatherSource = 'unknown' }) {
  const { t } = useI18n();
  const currentWeather = weatherData[0];

  const getWeatherIcon = (condition) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('rain') || c.includes('shower')) return <CloudRain className="w-5 h-5 text-sky-500" />;
    if (c.includes('cloud') && !c.includes('partly')) return <Cloud className="w-5 h-5 text-slate-400" />;
    if (c.includes('partly')) return <CloudSun className="w-5 h-5 text-amber-500" />;
    return <Sun className="w-5 h-5 text-amber-500" />;
  };

  // Check if rain is expected in upcoming 3 days
  const upcomingRain = weatherData.slice(0, 4).some((d) => (d.rainfall_mm || 0) >= 4.0 || (d.rain_probability_pct || 0) >= 60);
  const sourceLabels = {
    live: 'Live weather',
    cached: 'Cached weather',
    'stale-cached': 'Stale cached weather',
    'offline-baseline': 'Offline baseline',
    fallback: 'Fallback weather',
  };
  const value = (item, suffix = '') => (
    item === null || item === undefined || item === '' ? 'Unavailable' : `${item}${suffix}`
  );
  const formatDate = (date) => {
    if (!date) return 'Date unavailable';
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {t('weather_forecast')}
          </h3>
          <p className="text-xs text-slate-500">Local rainfall, temperatures & evapotranspiration</p>
        </div>
        {!isDemo && sourceLabels[weatherSource] && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold border border-slate-200">
            {sourceLabels[weatherSource]}
          </span>
        )}
        {isDemo && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold border border-slate-200">
            {t('demo_pill')}
          </span>
        )}
      </div>

      {!currentWeather ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <Cloud className="w-7 h-7 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">Weather data unavailable.</p>
          <p className="text-[11px] text-slate-500 mt-1">This recommendation did not include a weather forecast.</p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="weather-current-stat"><Thermometer size={15} /><span>Temperature</span><strong>{value(currentWeather.temp_max_c, '°')}</strong><small>High / {value(currentWeather.temp_min_c, '°')} low</small></div>
        <div className="weather-current-stat"><Wind size={15} /><span>Humidity</span><strong>{value(currentWeather.humidity_pct, '%')}</strong><small>{currentWeather.condition || 'Condition unavailable'}</small></div>
        <div className="weather-current-stat"><Droplet size={15} /><span>Rainfall</span><strong>{value(currentWeather.rainfall_mm, ' mm')}</strong><small>{value(currentWeather.rain_probability_pct, '%')} probability</small></div>
        <div className="weather-current-stat"><Gauge size={15} /><span>ET0</span><strong>{value(currentWeather.et0_mm, ' mm')}</strong><small>Evapotranspiration</small></div>
      </div>

      {upcomingRain && (
        <div className="p-3.5 bg-sky-50 border border-sky-300 rounded-xl flex items-start gap-2.5 text-sky-950 text-xs shadow-xs">
          <CloudRain className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm mb-0.5 text-sky-900">
              {t('rain_alert')}
            </span>
            <span className="text-sky-800">{rainWarning || 'Rain is present in the returned forecast. Follow the recommendation schedule and rain pause guidance.'}</span>
          </div>
        </div>
      )}

      {rainWarning && !upcomingRain && (
        <div className="p-3.5 bg-sky-50 border border-sky-300 rounded-xl flex items-start gap-2.5 text-sky-950 text-xs">
          <CloudRain className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <span className="text-sky-800">{rainWarning}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div>
          <h4 className="text-xs font-bold text-slate-800">Seven-day forecast</h4>
          <p className="text-[11px] text-slate-500">Returned with this farm recommendation</p>
        </div>
        <span className="text-[10px] text-slate-500">{weatherData.length} day{weatherData.length === 1 ? '' : 's'}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar -mx-1 px-1">
        {weatherData.map((day, index) => (
          <div
            key={day.date || index}
            className={`flex-1 min-w-[84px] p-3 rounded-2xl border flex flex-col items-center text-center transition-all ${
              index === 0
                ? 'bg-[#DDE9D4]/80 border-[#426930]/40 font-semibold text-[#10251B] shadow-xs'
                : 'bg-white/70 border-[#173F2A]/10 text-[#173F2A]/80 hover:bg-white'
            }`}
          >
            <span className="text-xs font-bold opacity-80">{day.day || formatDate(day.date)}</span>
            <span className="text-[10px] text-slate-500">{formatDate(day.date)}</span>
            <div className="my-1.5">{getWeatherIcon(day.condition)}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-extrabold">{value(day.temp_max_c, '°')}</span>
              <span className="text-[10px] text-slate-400">{value(day.temp_min_c, '°')}</span>
            </div>
            <span className="text-[10px] text-slate-500 truncate max-w-full" title={day.condition || undefined}>
              {day.condition || 'Condition unavailable'}
            </span>

            {typeof day.rainfall_mm === 'number' ? (
              <span className="mt-1 text-[10px] text-sky-600 font-bold flex items-center gap-0.5">
                <Droplet className="w-2.5 h-2.5 fill-current" />
                {day.rainfall_mm}mm
              </span>
            ) : (
              <span className="mt-1 text-[10px] text-slate-400">Rainfall unavailable</span>
            )}

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
      </>
      )}
    </div>
  );
}
