const CACHE_NAME = 'hireforjob-v4';
const STATIC_CACHE = 'hireforjob-static-v4';
const DYNAMIC_CACHE = 'hireforjob-dynamic-v4';
const IMAGE_CACHE = 'hireforjob-images-v4';

const PRECACHE_ASSETS = [
  '/',
  '/favicon.png',
  '/logo.png',
  '/offline.html',
  '/manifest.json',
];

// Auth-sensitive paths that must NEVER be cached
const NO_CACHE_PATHS = ['/login', '/signup', '/verify-email', '/auth/callback', '/update-password', '/forgot-password', '/select-role', '/profile-setup'];

// Max items in dynamic/image caches to prevent unbounded growth
const DYNAMIC_CACHE_LIMIT = 50;
const IMAGE_CACHE_LIMIT = 80;

function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => trimCache(cacheName, maxItems));
      }
    });
  });
}

function isNoCachePath(url) {
  return NO_CACHE_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));
}

// Install — precache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate — purge old caches (including v3)
self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — multi-strategy routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache auth/OAuth paths
  if (url.pathname.startsWith('/~oauth')) return;

  // Never cache Supabase API or edge function calls
  if (url.hostname.includes('supabase')) return;

  // Never cache auth-sensitive app routes
  if (isNoCachePath(url)) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Strategy 1: Navigation → Network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Strategy 2: Static assets (JS/CSS) → Cache-first, network fallback
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/) || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Strategy 3: Images → Cache-first with limit
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, clone);
                trimCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
              });
            }
            return response;
          }).catch(() => new Response('', { status: 404 }))
      )
    );
    return;
  }

  // Strategy 4: Everything else → Network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
            trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Hire for Job', body: 'You have a new notification', url: '/' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Use defaults
  }

  const options = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'View' }],
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Click handler for push notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
