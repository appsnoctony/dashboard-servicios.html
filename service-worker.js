const CACHE_NAME = 'dashboard-v1';

// Solo archivos propios. OJO: no incluyo './' porque tu sitio no tiene
// index.html en la raíz — si se precachea una URL que da 404, el
// service worker entero falla al instalarse.
const ASSETS = [
  './dashboard.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar todo lo que no sea tu propio dominio (GitHub Pages).
  // Así el login de MSAL (login.microsoftonline.com), Microsoft Graph
  // y SharePoint NUNCA se cachean ni se interceptan.
  if (url.origin !== self.location.origin) return;

  if (event.request.method !== 'GET') return;

  // La página: red primero, caché como respaldo offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Iconos y manifest: caché primero
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return res;
      });
    })
  );
});