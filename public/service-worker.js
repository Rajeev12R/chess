const CACHE_NAME = "chess-pwa-v1";
const ASSETS = [
  "/",
  "/index",
  "/js/chessgame.js",
  "/icons/icon.png",
  "/icons/icon.png",
  "https://cdn.socket.io/4.8.1/socket.io.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap"
];

// Install the service worker and cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Serve cached assets when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});