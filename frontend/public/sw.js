// Offline Service Worker with Stale-While-Revalidate caching for AGR002 Smart Irrigation
const CACHE_NAME = 'agr002-v2';
const API_CACHE_NAME = 'agr002-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const CATALOG_PATHS = [
  '/api/crops',
  '/api/soils',
  '/api/v1/crops',
  '/api/v1/soils'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Never cache mutating requests (POST, PUT, DELETE, PATCH)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Stale-While-Revalidate for static agronomic catalogs and last recommendations
  const isCatalog = CATALOG_PATHS.some((p) => url.pathname.endsWith(p) || url.pathname === p);
  const isRecommendation = url.pathname.includes('/recommend');

  if (isCatalog || isRecommendation) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Shell assets & static frontend bundle caching
  if (!url.pathname.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
              }
              return networkResponse;
            })
            .catch(() => cachedResponse)
        );
      })
    );
  }
});
