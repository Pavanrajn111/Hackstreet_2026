import apiClient from './apiClient';

export const predictCropSuitability = async (payload) => (await apiClient.post('/api/ml/crop-suitability', payload)).data;
export const createCropPlan = async (payload) => (await apiClient.post('/api/ml/crop-planner', payload)).data;

export default { predictCropSuitability, createCropPlan };
