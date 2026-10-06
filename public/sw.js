// Constrade+ service worker.
// Strategy:
//   - App shell navigations: network-first, cached copy as offline fallback.
//   - Static build assets (/_next/static, /icons, favicons): cache-first.
//   - API and cross-origin requests: never cached — market data and account
//     information must always be live and must never leak between sessions.

const VERSION = "cc-pwa-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.svg",
];

const STATIC_PATHS = /^\/(_next\/static|icons)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests; never intercept API or auth traffic.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first so clients always see fresh state, with a
  // cached shell or the offline page as fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline")),
        ),
    );
    return;
  }

  // Static assets: cache-first (hashed filenames are immutable).
  if (STATIC_PATHS.test(url.pathname) || url.pathname === "/favicon.svg" || url.pathname === "/favicon.ico" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(RUNTIME_CACHE)
                .then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
