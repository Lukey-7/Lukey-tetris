// Lukey-Arcade Offline Cache Service Worker
const CACHE_NAME = 'lukey-arcade-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './space.html',
  './popup.html',
  './space_popup.html',
  './css/style.css',
  './js/audio.js',
  './js/storage.js',
  './js/engine.js',
  './js/ui.js',
  './js/space_sprites.js',
  './js/space_pixel.js',
  './js/space_audio.js',
  './js/space_engine.js',
  './js/space_ui.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached asset or fetch from network and update cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
