import apiClient from './apiClient';

export const recommendHybridCrops = async (payload) => (await apiClient.post('/api/hybrid/recommendations', payload)).data;
export const generateFarmLayout = async (payload) => (await apiClient.post('/api/hybrid/layout', payload)).data;
export const getCultivationGuide = async (cropId) => (await apiClient.get(`/api/hybrid/crops/${encodeURIComponent(cropId)}/guide`)).data;
export const calculateHybridIrrigation = async (payload) => (await apiClient.post('/api/hybrid/irrigation', payload)).data;
export const estimateHybridProfit = async (payload) => (await apiClient.post('/api/hybrid/profit-estimate', payload)).data;
export const compareHybridProfit = async (payload) => (await apiClient.post('/api/hybrid/profit-comparison', payload)).data;
export const listValueAddedProducts = async (cropId) => (await apiClient.get(`/api/hybrid/crops/${encodeURIComponent(cropId)}/products`)).data;
export const compareProductProfit = async (payload) => (await apiClient.post('/api/hybrid/product-profit', payload)).data;
export const saveHybridPlan = async (payload) => (await apiClient.post('/api/hybrid/plans', payload)).data;
export const listHybridPlans = async (params = {}) => (await apiClient.get('/api/hybrid/plans', { params })).data;
export const getHybridPlan = async (planId) => (await apiClient.get(`/api/hybrid/plans/${planId}`)).data;

export default {
  recommendHybridCrops,
  generateFarmLayout,
  getCultivationGuide,
  calculateHybridIrrigation,
  estimateHybridProfit,
  compareHybridProfit,
  listValueAddedProducts,
  compareProductProfit,
  saveHybridPlan,
  listHybridPlans,
  getHybridPlan,
};
