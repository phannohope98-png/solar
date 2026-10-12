// Remove only the retired solar calculator's worker and cache.
(async () => {
  if (!location.hostname.endsWith('.github.io')) return;
  try {
    if ('serviceWorker' in navigator) {
      const scope = new URL('./', location.href).href;
      for (const registration of await navigator.serviceWorker.getRegistrations()) {
        if (registration.scope === scope) await registration.unregister();
      }
    }
    if ('caches' in window) for (const key of await caches.keys()) if (key.startsWith('solar-')) await caches.delete(key);
  } catch (error) { console.warn('Calculator cache cleanup:', error); }
})();
