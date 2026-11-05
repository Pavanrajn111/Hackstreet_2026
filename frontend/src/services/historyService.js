import apiClient from './apiClient';

export const listHistory = async (params = {}) => (await apiClient.get('/api/history', { params })).data;
export const listFarmHistory = async (farmId, params = {}) => (
  await apiClient.get(`/api/history/${farmId}`, { params })
).data;
export const recordHistory = async (payload) => (await apiClient.post('/api/history', payload)).data;

export default { listHistory, listFarmHistory, recordHistory };
