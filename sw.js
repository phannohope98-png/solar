// Retire the previous calculator worker without caching application data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('solar-')) await caches.delete(key);
  await self.clients.claim();
  await self.registration.unregister();
})()));
