const CACHE_NAME = 'pixel-productivity-v3'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
]

// Vite fingerprints every build asset, so each release produces a brand new
// set of filenames. Nothing ever evicted the previous set, so the cache grew
// by a full build's worth on every deploy — on a phone, that is megabytes of
// dead chunks after a few releases. Keep a few builds' worth and drop the
// oldest.
const MAX_CACHED_ASSETS = 40

/**
 * Evict the oldest hashed build assets once there are too many.
 *
 * Only `/assets/` entries are candidates. The app shell, the icons and the
 * sprite frames are un-hashed and stay valid forever, so they are never
 * evicted — dropping the shell would take the offline app with it.
 */
async function pruneAssetCache() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    const assets = keys.filter((request) => {
      try {
        return new URL(request.url).pathname.startsWith('/assets/')
      } catch (e) {
        return false
      }
    })
    if (assets.length <= MAX_CACHED_ASSETS) return
    // `cache.keys()` returns requests in insertion order, so the head of the
    // list is the oldest.
    const excess = assets.length - MAX_CACHED_ASSETS
    for (const request of assets.slice(0, excess)) {
      await cache.delete(request)
    }
  } catch (e) {
    /* pruning is best effort */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k)
        })
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Network-First strategy for navigation requests (index.html)
  // This ensures fresh content from the server for Firebase updates
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy of the fresh response
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request)
        .then((response) => {
          // If valid response, optionally cache static chunks
          if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone)
            })
            pruneAssetCache()
          }
          return response
        })
        .catch(() => {
          // Only a navigation can be answered with the app shell. Handing
          // index.html back for a failed script or stylesheet request makes
          // the browser reject it on the MIME type, which surfaces as a
          // blank page instead of a clear offline error.
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
          return new Response('', { status: 504, statusText: 'Offline' })
        })
    })
  )
})
