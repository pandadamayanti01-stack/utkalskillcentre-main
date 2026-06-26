const CACHE_NAME = 'utkal-skill-centre-v12'; // Incremented to force update for all students
const TEXTBOOK_CACHE_NAME = 'utkal-textbooks-cache';
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
          if (cacheName !== CACHE_NAME && cacheName !== TEXTBOOK_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - Custom strategies for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache-First strategy for heavy textbooks/chapters and GLB models hosted on Firebase Storage
  if (url.hostname === 'firebasestorage.googleapis.com') {
    event.respondWith(
      caches.open(TEXTBOOK_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return new Response('Offline resource not cached', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // Network-first, fallback to cache for standard assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Offline resource not found', { status: 404 });
        });
      })
  );
});