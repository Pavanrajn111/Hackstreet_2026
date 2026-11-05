import apiClient from './apiClient';

export const createRecommendation = async (farm) => (await apiClient.post('/api/recommend', farm)).data;
export const getRecommendationByFarm = async (farmId) => (await apiClient.get(`/api/recommend/${farmId}`)).data;

export default { createRecommendation, getRecommendationByFarm };
