const CACHE_NAME = 'utkal-skill-centre-v12'; // Incremented to force update for all students
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/utkal-192.png',
  '/bigsan-512.png',
  '/gundulu-rath-crest.png',
  '/temple-pattern.png',
  '/utkal-512.png'
];

// Install event - Cache new assets and force update
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch to prevent one missing file from breaking the whole cache
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(asset => cache.add(asset))
      );
    })
  );
});

// Activate event - Clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Take control of all pages immediately
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Optionally update cache here for dynamic assets if needed
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          // If found in cache, return it
          if (cachedResponse) return cachedResponse;

          // If it's a navigation request (page reload), return the index
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Offline resource not found', { status: 404 });
        });
      })
  );
});