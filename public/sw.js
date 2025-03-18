const CACHE_NAME = 'chess-game-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/chessgame.js',
    '/js/chess.js',
    '/js/socket.io.js',
    '/js/howler.min.js',
    '/sounds/move.mp3',
    '/sounds/capture.mp3',
    '/sounds/check.mp3',
    '/sounds/game-start.mp3',
    '/sounds/game-end.mp3',
    '/icons/icon.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(error => {
                console.error('Error caching static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip socket.io requests
    if (event.request.url.includes('/socket.io/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return cached version
                }

                // Clone the request because it's a one-time use
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then(response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because it's a one-time use
                        const responseToCache = response.clone();

                        // Add new resources to cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        // You might want to return a custom offline page here
                    });
            })
    );
});

// Handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Chess Game', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
}); 