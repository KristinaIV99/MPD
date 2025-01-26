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

// Klaidų valdymas
const handleError = (error) => {
  console.error('SW Error:', error);
  return new Response('Offline content not available', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  });
};

// Įdiegimas
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(handleError)
  );
  self.skipWaiting();
});

// Aktyvavimas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .catch(handleError)
  );
});

// Dinaminis caching ir fetch
self.addEventListener('fetch', e => {
  // Skirtinga strategija skirtingiems resursams
  if (e.request.url.includes('/api/')) {
    // API užklausoms - Network First
    e.respondWith(
		caches.match(e.request).then(cached => {
			const fetchPromise = fetch(e.request).then(response => {
				if (response.ok) {
					const clone = response.clone();
					caches.open(CACHE_NAME)
						.then(cache => cache.put(e.request, clone))
						.catch(err => console.error('Cache put error:', err));
				}
				return response;
			}).catch(() => cached || handleError(new Error('API unreachable'))); // Kritinis pataisymas
	
			return cached || fetchPromise;
		})
	);
}
  } else if (e.request.url.endsWith('.md')) {
    // MD failams - Cache First
    e.respondWith(
      caches.match(e.request)
        .then(response => response || fetch(e.request))
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(handleError)
    );
  } else {
    // Statiniams failams - Cache First
    e.respondWith(
      caches.match(e.request)
        .then(response => response || fetch(e.request))
        .catch(handleError)
    );
  }
});
