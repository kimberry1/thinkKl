// ThinkKl Service Worker v1.0
const CACHE_NAME = 'thinkKl-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화: 구버전 캐시 삭제
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

// 요청 처리: Network First (온라인 우선, 실패 시 캐시)
self.addEventListener('fetch', function(event) {
  // Supabase API 요청은 캐시 안 함 (항상 네트워크)
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // 성공 응답은 캐시에 저장
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // 네트워크 실패 시 캐시에서 응답
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
  );
});
