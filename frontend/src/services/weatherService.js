export const getRecommendationWeather = (recommendation) => ({
  source: recommendation?.weather_source || 'unknown',
  forecast: Array.isArray(recommendation?.seven_day_weather)
    ? recommendation.seven_day_weather
    : [],
});

export const getWeatherStatus = (source) => {
  if (source === 'open-meteo') return 'live';
  if (source === 'open-meteo-cache') return 'cached';
  if (source === 'open-meteo-stale-cache') return 'stale-cached';
  if (source === 'offline-baseline') return 'offline-baseline';
  if (source === 'fallback') return 'fallback';
  return 'unknown';
};

export default { getRecommendationWeather, getWeatherStatus };
