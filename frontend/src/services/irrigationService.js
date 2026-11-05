import apiClient from './apiClient';

export const getRecommendationPayload = (farm) => ({
  farm_id: farm?.id,
  farm_name: farm?.farm_name,
  latitude: farm?.latitude,
  longitude: farm?.longitude,
  crop: farm?.crop,
  soil_type: farm?.soil_type,
  sowing_date: farm?.sowing_date,
  farm_area_hectares: farm?.farm_area_hectares,
  irrigation_method: farm?.irrigation_method,
  last_irrigation_date: farm?.last_irrigation_date,
  pump_flow_rate_lpm: farm?.pump_flow_rate_lpm,
});

export const createRecommendation = async (farm) => (
  await apiClient.post('/api/recommend', getRecommendationPayload(farm))
).data;
export const getRecommendationByFarm = async (farmId) => (await apiClient.get(`/api/recommend/${farmId}`)).data;

export default { createRecommendation, getRecommendationByFarm, getRecommendationPayload };
