import apiClient from './apiClient';

export const listFarms = async () => (await apiClient.get('/api/farms')).data;
export const getFarm = async (farmId) => (await apiClient.get(`/api/farms/${farmId}`)).data;
export const createFarm = async (farm) => (await apiClient.post('/api/farms', farm)).data;
export const updateFarm = async (farmId, farm) => (await apiClient.put(`/api/farms/${farmId}`, farm)).data;
export const deleteFarm = async (farmId) => {
  await apiClient.delete(`/api/farms/${farmId}`);
};

export default { listFarms, getFarm, createFarm, updateFarm, deleteFarm };
