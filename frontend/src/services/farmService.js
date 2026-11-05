import apiClient from './apiClient';

const QUEUE_KEY = 'offline_farm_queue';

export const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const enqueueOfflineFarmMutation = (mutation) => {
  const queue = getOfflineQueue();
  const entry = {
    id: `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    ...mutation,
  };
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

export const replayOfflineFarmQueue = async () => {
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return { replayed: 0, failed: 0 };

  const remaining = [];
  let replayed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (item.action === 'create') {
        await apiClient.post('/api/farms', item.payload);
        replayed += 1;
      } else if (item.action === 'update' && item.farmId) {
        await apiClient.put(`/api/farms/${item.farmId}`, item.payload);
        replayed += 1;
      } else if (item.action === 'delete' && item.farmId) {
        await apiClient.delete(`/api/farms/${item.farmId}`);
        replayed += 1;
      }
    } catch (err) {
      console.warn('Could not replay offline mutation:', item, err);
      // Keep in queue only if still network error; discard if 4xx permanent error
      if (err?.code === 'NETWORK_ERROR' || err?.code === 'TIMEOUT' || !err?.response) {
        remaining.push(item);
      }
      failed += 1;
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { replayed, failed, remaining: remaining.length };
};

export const listFarms = async () => (await apiClient.get('/api/farms')).data;
export const getFarm = async (farmId) => (await apiClient.get(`/api/farms/${farmId}`)).data;
export const createFarm = async (farm) => (await apiClient.post('/api/farms', farm)).data;
export const updateFarm = async (farmId, farm) => (await apiClient.put(`/api/farms/${farmId}`, farm)).data;
export const deleteFarm = async (farmId) => {
  await apiClient.delete(`/api/farms/${farmId}`);
};

export default {
  listFarms,
  getFarm,
  createFarm,
  updateFarm,
  deleteFarm,
  getOfflineQueue,
  enqueueOfflineFarmMutation,
  replayOfflineFarmQueue,
  clearOfflineQueue,
};
