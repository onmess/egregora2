// v3 — network-first para HTML/JS: atualizações do site chegam na hora,
// e o cache só é usado quando estiver offline.
const CACHE_NAME = 'egregora-v7';
const PRECACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE).catch(err => console.log('Precache parcial:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => n !== CACHE_NAME ? caches.delete(n) : null))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppFile = url.origin === location.origin &&
    (event.request.mode === 'navigate' ||
     url.pathname.endsWith('.html') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('manifest.json'));

  if (isAppFile) {
    // REDE PRIMEIRO: pega sempre a versão mais nova; cache só se offline
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Fontes, imagens etc.: cache primeiro (mais rápido)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'error') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});
