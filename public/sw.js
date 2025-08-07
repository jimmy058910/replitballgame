/**
 * Service Worker for Realm Rivalry
 * Provides offline capabilities and caching strategies
 */

const CACHE_NAME = 'realm-rivalry-v1.0.0';
const API_CACHE_NAME = 'realm-rivalry-api-v1.0.0';
const STATIC_CACHE_NAME = 'realm-rivalry-static-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-modern-2.svg',
  '/favicon.ico',
  // Add critical CSS and JS files
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/teams/my',
  '/api/season/current-cycle',
  '/api/server/time',
  '/api/notifications',
  '/api/matches/live',
];

// Network-first strategies for real-time data
const NETWORK_FIRST_APIS = [
  '/api/matches/live',
  '/api/notifications',
  '/api/server/time',
];

// Cache-first strategies for static data
const CACHE_FIRST_APIS = [
  '/api/teams/my',
  '/api/season/current-cycle',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE_NAME).then((cache) => {
        // Pre-cache critical API endpoints
        return Promise.all(
          CACHEABLE_APIS.map(url => 
            fetch(url)
              .then(response => response.ok ? cache.put(url, response) : null)
              .catch(err => console.log('Pre-cache failed for:', url, err))
          )
        );
      })
    ])
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Network-first strategy for real-time data
  if (NETWORK_FIRST_APIS.some(api => pathname.startsWith(api))) {
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        // Cache successful responses
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      }
      
      // If network fails, try cache
      const cachedResponse = await caches.match(request);
      return cachedResponse || createOfflineResponse(pathname);
      
    } catch (error) {
      console.log('Network failed for:', pathname, error);
      const cachedResponse = await caches.match(request);
      return cachedResponse || createOfflineResponse(pathname);
    }
  }
  
  // Cache-first strategy for static data
  if (CACHE_FIRST_APIS.some(api => pathname.startsWith(api))) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(API_CACHE_NAME).then(cache => {
              cache.put(request, response);
            });
          }
        })
        .catch(err => console.log('Background update failed:', err));
      
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      }
      
      return createOfflineResponse(pathname);
    } catch (error) {
      return createOfflineResponse(pathname);
    }
  }
  
  // Default: try network first, then cache
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
    
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse(pathname);
    
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse(pathname);
  }
}

async function handleStaticRequest(request) {
  // Cache-first strategy for static assets
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
    
    return response;
  } catch (error) {
    // Return offline fallback for HTML pages
    if (request.destination === 'document') {
      return caches.match('/') || new Response('Offline', { status: 200 });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

function createOfflineResponse(pathname) {
  // Create appropriate offline responses based on endpoint
  if (pathname.includes('/matches/live')) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (pathname.includes('/notifications')) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (pathname.includes('/server/time')) {
    return new Response(JSON.stringify({
      success: true,
      data: { currentTime: new Date().toISOString() }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Default offline response
  return new Response(JSON.stringify({
    error: 'Offline - Please check your connection'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/logo-modern-2.svg',
    badge: '/logo-modern-2.svg',
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'Open Game'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      syncData()
    );
  }
});

async function syncData() {
  try {
    // Sync critical data when connection is restored
    const responses = await Promise.all([
      fetch('/api/teams/my'),
      fetch('/api/notifications'),
      fetch('/api/matches/live')
    ]);
    
    const cache = await caches.open(API_CACHE_NAME);
    
    responses.forEach((response, index) => {
      if (response.ok) {
        const urls = ['/api/teams/my', '/api/notifications', '/api/matches/live'];
        cache.put(urls[index], response.clone());
      }
    });
    
    console.log('Background sync completed');
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}