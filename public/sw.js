const CACHE_NAME = 'utkal-skill-centre-v11'; // Increment version to v11
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/utkal-192.png',
  '/bigsan-512.png',
  '/gundulu-rath-crest.png',
  '/temple-pattern.png', // <--- ADD THIS LINE
  '/utkal-512.png'
];

// ... [Keep install and activate as they are] ...

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
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

          /* CRITICAL FIX: 
             If the code gets here, it means we are offline AND the file 
             (like the temple pattern) isn't in the cache. 
             We MUST return a valid Response object, not undefined.
          */
          return new Response('Offline resource not found', { status: 404 });
        });
      })
  );
});