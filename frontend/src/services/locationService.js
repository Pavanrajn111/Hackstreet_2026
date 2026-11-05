/**
 * Location Service for AGR002 Smart Irrigation
 * Handles device GPS detection, reverse geocoding, and persistent field location context.
 */

const LOCATION_STORAGE_KEY = 'agr002_user_location';
const LOCATION_EVENT_KEY = 'agr002_location_changed';

// Known agricultural districts in Southern India for quick local fallback
const KNOWN_DISTRICTS = [
  { name: 'Bengaluru Urban', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { name: 'Mandya', lat: 12.5226, lon: 76.8976, state: 'Karnataka' },
  { name: 'Mysuru', lat: 12.2958, lon: 76.6394, state: 'Karnataka' },
  { name: 'Hassan', lat: 13.0033, lon: 76.1004, state: 'Karnataka' },
  { name: 'Tumakuru', lat: 13.3409, lon: 77.1006, state: 'Karnataka' },
  { name: 'Kolar', lat: 13.1367, lon: 78.1292, state: 'Karnataka' },
  { name: 'Coimbatore', lat: 11.0168, lon: 76.9558, state: 'Tamil Nadu' },
  { name: 'Wayanad', lat: 11.6854, lon: 76.1320, state: 'Kerala' },
];

function findNearestDistrict(lat, lon) {
  let closest = KNOWN_DISTRICTS[0];
  let minDistance = Infinity;

  for (const d of KNOWN_DISTRICTS) {
    const dist = Math.hypot(d.lat - lat, d.lon - lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = d;
    }
  }

  // If within ~100km, return known district name
  if (minDistance < 1.0) {
    return `${closest.name}, ${closest.state}`;
  }
  return `Field (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;
}

/**
 * Reverse geocodes coordinates to a human-readable district/place name.
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: { 'User-Agent': 'AGR002-SmartIrrigation/1.0' },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const place = addr.village || addr.town || addr.city || addr.county || addr.state_district || addr.district;
      const state = addr.state;
      if (place && state) return `${place}, ${state}`;
      if (place) return place;
    }
  } catch {
    // Graceful offline / timeout fallback
  }

  return findNearestDistrict(latitude, longitude);
}

/**
 * Detects device coordinates using Browser Geolocation API.
 */
export function detectBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(4));
        const longitude = Number(position.coords.longitude.toFixed(4));
        const accuracy = Math.round(position.coords.accuracy || 0);

        const placeName = await reverseGeocode(latitude, longitude);

        const locData = {
          latitude,
          longitude,
          placeName,
          accuracy,
          detectedAt: new Date().toISOString(),
          isGps: true,
        };

        saveUserLocation(locData);
        resolve(locData);
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 300000,
      }
    );
  });
}

/**
 * Retrieves the stored user location from localStorage, or null.
 */
export function getUserLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves user location to localStorage and notifies listeners.
 */
export function saveUserLocation(location) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LOCATION_EVENT_KEY, { detail: location }));
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Subscribes to location changes across the application.
 */
export function subscribeToLocationChanges(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => callback(event.detail);
  window.addEventListener(LOCATION_EVENT_KEY, handler);
  return () => window.removeEventListener(LOCATION_EVENT_KEY, handler);
}
