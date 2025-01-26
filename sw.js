const CACHE_NAME = 'mpd-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './main.css',
  './logger.js',
  './text-reader.js',
  './main.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

const handleError = (error) => {
  console.error('SW Error:', error);
  return new Response('Offline content not available', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  });
};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(handleError)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .catch(handleError)
  );
});

self.addEventListener('fetch', (e) => {
  // API užklausos
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(e.request, clone))
                .catch((err) => console.error('Cache put error:', err));
            }
            return response;
          })
          .catch(() => cached || handleError(new Error('API unreachable')));

        return cached || fetchPromise;
      })
    );
  }
  
  // .md failai
  else if (e.request.url.endsWith('.md')) {
    e.respondWith(
      caches.match(e.request)
        .then((response) => response || fetch(e.request))
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(handleError)
    );
  }
  
  // Statiniai resursai
  else {
    e.respondWith(
      caches.match(e.request)
        .then((response) => response || fetch(e.request))
        .catch(handleError)
    );
  }
});
