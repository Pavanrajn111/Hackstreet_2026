export const getRecommendationWeather = (recommendation) => ({
  source: recommendation?.weather_source || 'unknown',
  forecast: Array.isArray(recommendation?.seven_day_weather)
    ? recommendation.seven_day_weather
    : [],
});

export const getWeatherStatus = (source) => {
  if (source === 'open-meteo') return 'live';
  if (source === 'open-meteo-cache' || source === 'open-meteo-stale-cache') return 'cached';
  if (source === 'fallback') return 'fallback';
  return 'unknown';
};

export default { getRecommendationWeather, getWeatherStatus };
