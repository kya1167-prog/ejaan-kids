/* ==========================================================================
   Ejaan Kids — service worker
   --------------------------------------------------------------------------
   Caches the app shell so the whole thing works offline (including on a
   school trip with no signal). Pictures, the word library and the code are
   all local, so the app never needs the network to teach.

   Strategy:
     - app shell + local assets : cache-first (fast, works offline)
     - Google Fonts / HanziWriter CDN: stale-while-revalidate
     - everything else            : network only
   ========================================================================== */

var VERSION = 'ejaan-kids-v3.0.1';
var SHELL_CACHE = VERSION + '-shell';
var RUNTIME_CACHE = VERSION + '-runtime';

var SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/app.js',
  './assets/data/picture-library.js',
  './assets/data/artwork.js',
  './assets/data/illustrations.js',
  './assets/img/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      // addAll fails the whole install if one file is missing, so add them
      // individually and keep going.
      return Promise.all(SHELL_ASSETS.map(function (url) {
        return cache.add(url).catch(function (err) {
          console.warn('[sw] could not cache', url, err);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== SHELL_CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var isCDN = url.hostname === 'cdn.jsdelivr.net' ||
              url.hostname === 'fonts.googleapis.com' ||
              url.hostname === 'fonts.gstatic.com';

  if (!sameOrigin && !isCDN) return;

  if (isCDN) {
    // stale-while-revalidate
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var network = fetch(req).then(function (res) {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(function () { return cached; });
          return cached || network;
        });
      })
    );
    return;
  }

  // Navigations: serve the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match('./index.html').then(function (r) {
          return r || caches.match('./');
        });
      })
    );
    return;
  }

  // Everything else local: cache-first.
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
