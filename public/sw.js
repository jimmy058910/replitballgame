/**
 * Service Worker for Realm Rivalry PWA
 * Provides offline capabilities and caching strategies
 */

const CACHE_NAME = 'realm-rivalry-v1';
const STATIC_CACHE_NAME = 'realm-rivalry-static-v1';
const DYNAMIC_CACHE_NAME = 'realm-rivalry-dynamic-v1';

// URLs to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-192.png',
  '/logo-512.png',
  // Add other static assets
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
  '/api/teams/my',
  '/api/season/current-cycle',
  '/api/leagues/*/standings',
  '/api/teams/*/players',
  '/api/teams/*/finances',
];

// API endpoints that should never be cached
const NEVER_CACHE_APIS = [
  '/api/matches/live',
  '/api/notifications',
  '/api/server/time',
  '/api/auth/*',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated successfully');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - handle network requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'document') {
    event.respondWith(handlePageRequest(request));
    return;
  }

  // Handle other assets (CSS, JS, images)
  event.respondWith(handleAssetRequest(request));
});

/**
 * Handle API requests with caching strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Never cache certain endpoints
  if (NEVER_CACHE_APIS.some(pattern => matchPattern(pathname, pattern))) {
    return fetch(request);
  }

  // Cache-first strategy for certain endpoints
  if (CACHEABLE_APIS.some(pattern => matchPattern(pathname, pattern))) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached response and update in background
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {
        // Network failed, but we have cache
      });
      
      return cachedResponse;
    }
  }

  // Network-first strategy for other API requests
  try {
    const response = await fetch(request);
    
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try to serve from cache
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ error: 'Network unavailable, please try again later' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle page requests
 */
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try to serve from cache
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return caches.match('/');
  }
}

/**
 * Handle asset requests
 */
async function handleAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Failed to fetch asset:', request.url);
    throw error;
  }
}

/**
 * Match URL pattern with wildcards
 */
function matchPattern(pathname, pattern) {
  const regexPattern = pattern.replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(pathname);
}

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/icons/open-96.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-96.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const url = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Handle background sync
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Background sync logic
 */
async function doBackgroundSync() {
  try {
    // Sync any pending data
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Loaded');