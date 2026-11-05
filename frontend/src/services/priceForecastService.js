import apiClient from './apiClient';

export const listPriceForecasts = async () => (await apiClient.get('/api/ml/price-forecasts')).data;
export const getPriceForecast = async (commodity) => (
  await apiClient.get(`/api/ml/price-forecasts/${encodeURIComponent(commodity)}`)
).data;

export default { listPriceForecasts, getPriceForecast };
