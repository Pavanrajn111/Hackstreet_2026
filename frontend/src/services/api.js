import { defaultFarm, sampleCrops, sampleSoils } from '../data/mockFarm';
import { mockRecommendation, mockHistory } from '../data/mockRecommendation';
import apiClient from './apiClient';

// Keys for local persistence
const STORAGE_KEYS = {
  USE_MOCK: 'agr002_use_mock',
  SAVED_FARM: 'agr002_saved_farm',
  CACHED_REC: 'agr002_cached_recommendation',
  CACHED_TIME: 'agr002_cached_time',
  HISTORY: 'agr002_local_history',
};

// Initial mode determination
const getInitialMockMode = () => {
  const saved = localStorage.getItem(STORAGE_KEYS.USE_MOCK);
  if (saved !== null) {
    return saved === 'true';
  }
  return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
};

let useMockData = getInitialMockMode();

export const isMockMode = () => useMockData;

export const setMockMode = (enabled) => {
  useMockData = Boolean(enabled);
  localStorage.setItem(STORAGE_KEYS.USE_MOCK, String(useMockData));
  window.dispatchEvent(
    new CustomEvent('agr002_mock_mode_changed', { detail: { useMockData } })
  );
};

/**
 * Load Demo Preset (Bengaluru Tomato Farm)
 */
export const loadDemoPreset = () => {
  localStorage.setItem(STORAGE_KEYS.SAVED_FARM, JSON.stringify(defaultFarm));
  localStorage.setItem(STORAGE_KEYS.CACHED_REC, JSON.stringify(mockRecommendation));
  localStorage.setItem(STORAGE_KEYS.CACHED_TIME, new Date().toISOString());
  window.dispatchEvent(new CustomEvent('agr002_farm_updated', { detail: defaultFarm }));
  return defaultFarm;
};

/**
 * Get irrigation recommendation for given farm parameters
 */
export const getRecommendation = async (farmPayload = null) => {
  const farmToUse = farmPayload || (await getFarms())[0] || defaultFarm;

  if (useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const result = {
      ...mockRecommendation,
      is_demo_data: true,
      is_cached: false,
    };
    localStorage.setItem(STORAGE_KEYS.CACHED_REC, JSON.stringify(result));
    localStorage.setItem(STORAGE_KEYS.CACHED_TIME, new Date().toISOString());
    return result;
  }

  try {
    const response = await apiClient.post('/api/recommend', farmToUse);
    const data = {
      ...response.data,
      is_demo_data: false,
      is_cached: false,
    };
    // Cache successful response locally
    localStorage.setItem(STORAGE_KEYS.CACHED_REC, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.CACHED_TIME, new Date().toISOString());
    return data;
  } catch (error) {
    console.warn('Backend /api/recommend unavailable. Attempting offline cache:', error.message);

    // Retrieve offline cached recommendation
    const cached = localStorage.getItem(STORAGE_KEYS.CACHED_REC);
    const cachedTime = localStorage.getItem(STORAGE_KEYS.CACHED_TIME);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          is_cached: true,
          cached_at: cachedTime,
        };
      } catch (e) {
        // Fallback to mock
      }
    }

    return {
      ...mockRecommendation,
      is_demo_data: true,
      is_cached: true,
    };
  }
};

/**
 * Get supported crop classifications
 */
export const getCrops = async () => {
  if (useMockData) {
    return sampleCrops;
  }
  try {
    const response = await apiClient.get('/api/crops');
    return response.data;
  } catch (error) {
    console.warn('Backend /api/crops failed, using local crop list:', error.message);
    return sampleCrops;
  }
};

/**
 * Get supported soil classifications
 */
export const getSoils = async () => {
  if (useMockData) {
    return sampleSoils;
  }
  try {
    const response = await apiClient.get('/api/soils');
    return response.data;
  } catch (error) {
    console.warn('Backend /api/soils failed, using local soil list:', error.message);
    return sampleSoils;
  }
};

/**
 * Get saved farms list (from local storage or backend)
 */
export const getFarms = async () => {
  const saved = localStorage.getItem(STORAGE_KEYS.SAVED_FARM);

  if (useMockData) {
    return saved ? [JSON.parse(saved)] : [defaultFarm];
  }

  try {
    const response = await apiClient.get('/api/farms');
    if (response.data && response.data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SAVED_FARM, JSON.stringify(response.data[0]));
      return response.data;
    }
  } catch (error) {
    console.warn('Backend /api/farms failed, loading offline farm:', error.message);
  }

  return saved ? [JSON.parse(saved)] : [defaultFarm];
};

/**
 * Save farm profile (locally and to backend when available)
 */
export const saveFarm = async (farmData) => {
  localStorage.setItem(STORAGE_KEYS.SAVED_FARM, JSON.stringify(farmData));
  window.dispatchEvent(new CustomEvent('agr002_farm_updated', { detail: farmData }));

  if (useMockData) {
    return { ...farmData, id: 1, created_at: new Date().toISOString() };
  }

  try {
    const response = await apiClient.post('/api/farms', farmData);
    return response.data;
  } catch (error) {
    console.warn('Backend save failed; farm stored in local device storage:', error.message);
    return { ...farmData, id: 1, created_at: new Date().toISOString(), offline_saved: true };
  }
};

/**
 * Get historical irrigation records
 */
export const getHistory = async (farmId = null) => {
  const localLogs = localStorage.getItem(STORAGE_KEYS.HISTORY);
  let parsedLocal = localLogs ? JSON.parse(localLogs) : [];

  if (useMockData) {
    return [...parsedLocal, ...mockHistory];
  }

  try {
    const url = farmId ? `/api/history?farm_id=${farmId}` : '/api/history';
    const response = await apiClient.get(url);
    if (response.data && response.data.length > 0) {
      return [...parsedLocal, ...response.data];
    }
  } catch (error) {
    console.warn('Backend /api/history failed, using local logs:', error.message);
  }

  return [...parsedLocal, ...mockHistory];
};

/**
 * Record a manual or scheduled irrigation event
 */
export const recordIrrigation = async (logData) => {
  const localLogs = localStorage.getItem(STORAGE_KEYS.HISTORY);
  const logs = localLogs ? JSON.parse(localLogs) : [];
  const newEntry = {
    ...logData,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };
  logs.unshift(newEntry);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(logs));

  if (!useMockData) {
    try {
      await apiClient.post('/api/history', logData);
    } catch (e) {
      console.warn('Backend history POST failed, stored locally:', e.message);
    }
  }

  return newEntry;
};

export default apiClient;
