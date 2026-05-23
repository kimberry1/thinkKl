// noonchi Service Worker v2.0
const CACHE_NAME = 'noonchi-v2';
const BASE = '/noonchi';
const OFFLINE_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(OFFLINE_ASSETS);
    }).catch(function(e){
      console.warn('[SW] 캐시 실패:', e);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  if (url.includes('supabase.co') ||
      url.includes('googleapis.com') ||
      url.includes('kakao.com') ||
      url.includes('iamport.kr')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match(BASE + '/index.html');
        });
      })
  );
});

// ── 푸시 알림 수신 ──
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  var title = data.title || 'noonchi';
  var options = {
    body: data.body || '',
    icon: BASE + '/icon-192.png',
    badge: BASE + '/icon-192.png',
    data: { url: data.url || (BASE + '/') },
    vibrate: [200, 100, 200],
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 알림 클릭 시 앱 열기 ──
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : (BASE + '/');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url === targetUrl && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
