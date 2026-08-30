'use strict';

/* ============================================================
 * Our Time — Service Worker
 * Cache-first for static assets, network-first for navigation.
 * ============================================================ */

var CACHE_NAME = 'our-time-v1';

/** Core assets to precache on install */
var PRECACHE_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-512-maskable.png'
];

/* ---- Install ---- precache core assets */
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(function () {
                /* Activate the new worker immediately */
                return self.skipWaiting();
            })
    );
});

/* ---- Activate ---- delete old versioned caches */
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (cacheNames) {
                return Promise.all(
                    cacheNames
                        .filter(function (name) {
                            return name !== CACHE_NAME;
                        })
                        .map(function (name) {
                            return caches.delete(name);
                        })
                );
            })
            .then(function () {
                /* Take control of all open clients */
                return self.clients.claim();
            })
    );
});

/* ---- Fetch ---- routing strategies */
self.addEventListener('fetch', function (event) {
    var request = event.request;
    var url = new URL(request.url);

    /* Only handle http/https — let blob:, data:, etc. pass through */
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
    }

    /* Navigation: network-first with cache fallback */
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    /* Cache a fresh copy */
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(request, clone);
                    });
                    return response;
                })
                .catch(function () {
                    return caches.match('./index.html');
                })
        );
        return;
    }

    /* Google Fonts: stale-while-revalidate */
    if (url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.open(CACHE_NAME).then(function (cache) {
                return cache.match(request).then(function (cached) {
                    var fetchPromise = fetch(request)
                        .then(function (networkResponse) {
                            cache.put(request, networkResponse.clone());
                            return networkResponse;
                        })
                        .catch(function () {
                            return cached;
                        });
                    return cached || fetchPromise;
                });
            })
        );
        return;
    }

    /* Same-origin static assets: cache-first */
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then(function (cached) {
                if (cached) {
                    /* Update cache in background (stale-while-revalidate) */
                    fetch(request).then(function (response) {
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(request, response);
                        });
                    }).catch(function () { /* offline, cache is fine */ });
                    return cached;
                }
                return fetch(request).then(function (response) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(request, clone);
                    });
                    return response;
                });
            })
        );
        return;
    }
    /* Cross-origin (non-font): pass through */
});

/* ---- Message handling ---- allow main thread to trigger update */
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
