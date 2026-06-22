/* Service worker de Pitbulls SDR.
   Estrategia: la "cáscara" (HTML, ícono, manifest) se cachea para abrir rápido y
   offline; las llamadas al backend de Apps Script NO se cachean (datos siempre frescos).
   Para forzar actualización de la cáscara, subir la versión del CACHE. */
const CACHE = 'pitbulls-shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // Nunca cachear el backend → métricas/agenda/tareas siempre al día.
  if (url.hostname.indexOf('script.google') >= 0 || url.hostname.indexOf('googleusercontent') >= 0) return;
  // Cáscara: cache primero, red de respaldo (y refresca la copia en caché).
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var live = fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || live;
    })
  );
});
