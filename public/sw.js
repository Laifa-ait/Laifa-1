const CACHE_NAME = 'olmart-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Bypass caching completely in development, preview frames, or localhost to avoid stale asset and blank screen errors
  const url = event.request.url;
  if (
    url.includes('-dev-') || 
    url.includes('-pre-') || 
    url.includes('localhost') || 
    url.includes('127.0.0.1') || 
    url.includes('.run.app')
  ) {
    return;
  }

  if (event.request.method !== 'GET') return;
  // Stale-While-Revalidate strategy for navigation and static assets
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
