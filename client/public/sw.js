const STATIC_CACHE = "voice-circle-assets-v2";
const NAVIGATION_CACHE = "voice-circle-navigation-v2";
const SAME_ORIGIN_ASSET = /\/(manus-storage|assets|icons|.*\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?|ico))($|\?)/i;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(NAVIGATION_CACHE).then(cache => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => ![STATIC_CACHE, NAVIGATION_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        void caches.open(NAVIGATION_CACHE).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match("/")))
    );
    return;
  }

  if (new URL(request.url).origin === self.location.origin && SAME_ORIGIN_ASSET.test(new URL(request.url).pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const refresh = fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || refresh;
      })
    );
  }
});
