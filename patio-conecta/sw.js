/* Patio Conecta · Service Worker
   V4 - No cachea la pantalla principal.
   Objetivo: la app instalada siempre consulta el HTML actualizado,
   permitiendo que el modo app redirija directamente a Patio Conecta.
*/

const CACHE_NAME = 'patio-conecta-v4';

const STATIC_ASSETS = [
  './manifest.webmanifest',
  './icons/icon-32.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // MUY IMPORTANTE:
  // Para navegación/HTML siempre ir primero a Internet.
  // Así no vuelve a aparecer una versión vieja de /patio-conecta/.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Solo recursos estáticos locales pueden usar caché.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .catch(() => {});

          return response;
        });
      })
    );
  }
});
