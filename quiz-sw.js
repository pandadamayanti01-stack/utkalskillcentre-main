const CACHE_NAME = 'quiz-odisha-v2';
const ASSETS = [
  '/',
  '/profile',
  '/leaderboard',
  '/categories',
  '/gk',
  '/current-events',
  '/favicon.ico',
  '/favicon-48.png',
  '/gundulu-pointing-nobg.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[Quiz SW] Cache warm-up warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or backend API queries
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.includes('hot-update')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Intercept navigation requests to support clean client-side SPA routing offline
      if (event.request.mode === 'navigate') {
        return caches.match('/').then(fallback => {
          return fallback || fetch(event.request);
        });
      }

      return fetch(event.request).catch(() => {
        // Fallback to offline shell
        if (url.pathname === '/gk' || url.pathname === '/current-events') {
          return caches.match('/');
        }
      });
    })
  );
});
