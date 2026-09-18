// Service Worker untuk PWA
const CACHE_NAME = 'hasnan-app-v3';

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    // Memaksa browser segera memakai Service Worker baru jika ada update
    self.skipWaiting(); 
});

self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activate');
    // 🔥 KUNCI UTAMA: Agar langsung mengambil alih kontrol tanpa perlu hard refresh
    event.waitUntil(self.clients.claim());
});

// Menangkap sinyal internet untuk mode offline dasar
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});