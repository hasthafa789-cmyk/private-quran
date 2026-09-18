// Service Worker untuk PWA
const CACHE_NAME = 'hasnan-app-v3';

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    self.skipWaiting(); 
});

self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(self.clients.claim());
});

// Menangkap sinyal internet, KECUALI untuk Firestore
self.addEventListener('fetch', event => {
    // 🔥 PENGECUALIAN: Jangan ganggu jalur komunikasi Firestore (channel / long-polling)
    if (event.request.url.includes('firestore.googleapis.com')) {
        return; // Biarkan koneksi Firestore berjalan langsung ke internet
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});