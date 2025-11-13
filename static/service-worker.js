self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("algovis-v1").then(cache => {
      return cache.addAll([
        "/",
        "/static/style.css",
        "/static/script.js",
        "/static/icon-192.png",
        "/static/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => {
      return resp || fetch(e.request);
    })
  );
});
