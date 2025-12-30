const CACHE_NAME = "offline-cache-v1";
const OFFLINE_PAGE = "/offline.html"; // make sure this exists in /public

// Install: cache the offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_PAGE))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches if needed
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch: serve offline page when navigation fails
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_PAGE)
      )
    );
  }
});
