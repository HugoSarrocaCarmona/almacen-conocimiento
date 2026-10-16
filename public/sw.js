// Service worker de Almacén de conocimiento.
// Guarda una copia de la app para poder abrirla sin conexión.
// No toca tus datos: esos viven en IndexedDB, no aquí.

const BUILD_ID = '__BUILD_ID__'; // se sustituye al compilar
const CACHE = `almacen-app-${BUILD_ID}`;
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/apple-touch-icon.png'];

// Lee index.html y añade los archivos JS y CSS que enlaza.
async function assetsFromIndex() {
  try {
    const res = await fetch('./index.html', { cache: 'no-store' });
    const html = await res.text();
    const urls = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
    return [...new Set(urls)];
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      const assets = await assetsFromIndex();
      await Promise.all(assets.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('almacen-app-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: primero la red (para recibir actualizaciones); sin conexión, la copia.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          const cached = (await caches.match('./index.html')) || (await caches.match('./'));
          return cached || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
      })(),
    );
    return;
  }

  // Archivos de la app (llevan una huella en el nombre): primero la copia.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const res = await fetch(request);
      if (res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, res.clone());
      }
      return res;
    })(),
  );
});
