/* Offline cache for the web version of EngCalc */
const CACHE = 'engcalc-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/engine.js', 'js/model.js', 'js/ui.js', 'js/icons.js', 'js/app.js',
  'img/logo.svg', 'img/icon-192.png', 'img/icon-512.png', 'img/icon-maskable-512.png', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('index.html'))));
});
