/* Service worker: precachea todo el build y lo sirve cache-first, para que la
 * app abra al instante y funcione sin señal.
 *
 * El plugin de vite.config.ts reemplaza el marcador de abajo con la lista de
 * archivos del build y un hash de su contenido. Cualquier cambio (incluido
 * lista-precios.csv) cambia el hash → el navegador instala la versión nueva y
 * se usa en la próxima apertura.
 */
const { version, urls } = self.__PRECACHE__;
const CACHE_PREFIX = 'presupuestos-';
const CACHE = `${CACHE_PREFIX}${version}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `reload` saltea la caché HTTP: evita precachear un CSV viejo.
      await cache.addAll(urls.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});

async function respond(request) {
  const cache = await caches.open(CACHE);
  const isNavigation = request.mode === 'navigate';
  const cached = await cache.match(request, { ignoreSearch: isNavigation });
  if (cached) return cached;
  try {
    return await fetch(request);
  } catch (error) {
    // Sin red: cualquier navegación dentro del scope abre la app.
    if (isNavigation) {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw error;
  }
}
