import apiClient from './apiClient';

export const generateWaterResiliencePlan = async (payload) => (
  await apiClient.post('/api/water-shortage/action-plan', payload)
).data;

export default { generateWaterResiliencePlan };
