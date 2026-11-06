export const ACTIVE_FARM_STORAGE_KEY = 'agr002_active_farm_id';

export const getActiveFarmId = () => {
  const storedId = localStorage.getItem(ACTIVE_FARM_STORAGE_KEY);
  return storedId || null;
};

export const setActiveFarmId = (farmId) => {
  if (farmId === null || farmId === undefined) {
    localStorage.removeItem(ACTIVE_FARM_STORAGE_KEY);
  } else {
    localStorage.setItem(ACTIVE_FARM_STORAGE_KEY, String(farmId));
  }
  window.dispatchEvent(new CustomEvent('agr002_active_farm_changed', { detail: { farmId } }));
};
