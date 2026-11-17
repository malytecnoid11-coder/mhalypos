// Service Worker for Mhaly Shop PWA
const CACHE_NAME = 'mhaly-shop-v24-fresh';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/zxing.min.js',
    './js/recovered-data.js',
    './js/embedded-database.js',
    './js/data.js',
    './js/pos.js',
    './js/inventory.js',
    './js/warranty.js',
    './js/reports.js',
    './js/finance.js',
    './js/purchases.js',
    './js/sales-ledger.js',
    './js/app.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    // Force immediate activation of the new service worker
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('[SW] Cache addAll non-critical error:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting stale cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('/api/')) return;

    // NETWORK-FIRST for all HTML, JS, CSS, and versioned assets
    // This guarantees that code updates on the computer apply immediately on refresh!
    const url = event.request.url;
    const isCodeAsset = event.request.mode === 'navigate' ||
        event.request.destination === 'document' ||
        event.request.destination === 'script' ||
        event.request.destination === 'style' ||
        url.endsWith('.html') ||
        url.endsWith('.js') ||
        url.endsWith('.css') ||
        url.includes('?v=');

    if (isCodeAsset) {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                // If offline, serve from cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
        );
        return;
    }

    // Cache-First with Network fallback for static images, audio, etc.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            });
        })
    );
});
