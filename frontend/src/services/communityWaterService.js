import apiClient from './apiClient';

export const registerWaterResource = async (payload) => (await apiClient.post('/api/community-water/resources', payload)).data;
export const listWaterResources = async (params = {}) => (await apiClient.get('/api/community-water/resources', { params })).data;
export const getWaterResource = async (resourceId, params = {}) => (await apiClient.get(`/api/community-water/resources/${resourceId}`, { params })).data;
export const updateWaterResource = async (resourceId, payload) => (await apiClient.patch(`/api/community-water/resources/${resourceId}`, payload)).data;
export const deleteWaterResource = async (resourceId) => (await apiClient.delete(`/api/community-water/resources/${resourceId}`)).data;
export const createWaterRequest = async (payload) => (await apiClient.post('/api/community-water/requests', payload)).data;
export const listWaterRequests = async (params = {}) => (await apiClient.get('/api/community-water/requests', { params })).data;
export const getWaterRequest = async (requestId) => (await apiClient.get(`/api/community-water/requests/${requestId}`)).data;
export const updateWaterRequestStatus = async (requestId, payload) => (
  await apiClient.patch(`/api/community-water/requests/${requestId}/status`, payload)
).data;

export default {
  registerWaterResource,
  listWaterResources,
  getWaterResource,
  updateWaterResource,
  deleteWaterResource,
  createWaterRequest,
  listWaterRequests,
  getWaterRequest,
  updateWaterRequestStatus,
};
