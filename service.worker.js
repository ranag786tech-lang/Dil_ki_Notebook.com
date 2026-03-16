const CACHE_NAME = 'dil-ki-notebook-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Amiri&display=swap',
  'https://fonts.googleapis.com/css2?family=Lateef&display=swap'
];

// انسٹالیشن - کیچ میں فائلیں محفوظ کریں
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('کیچ کھل گیا');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// ایکٹیویشن - پرانی کیچ صاف کریں
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// فیچ درخواست - آف لائن سپورٹ
self.addEventListener('fetch', event => {
  // HTML پیجز کے لیے خاص طریقہ (نیٹ ورک فرسٹ)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // باقی سب کے لیے (کیچ فرسٹ)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // کیچ میں ملا
        }
        
        // کیچ میں نہیں ملا تو نیٹ ورک سے لاؤ
        return fetch(event.request).then(
          response => {
            // درست جواب نہیں ملا
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // نیا جواب کیچ میں محفوظ کریں
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// آف لائن ہونے پر پیغام
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// پس منظر میں سنک (بیک گراؤنڈ سنک) - جب انٹرنیٹ آئے تو نوٹس محفوظ کریں
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

// نوٹس سنک کرنے کا فنکشن
async function syncNotes() {
  try {
    const cache = await caches.open('notes-to-sync');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.log('سنک نہیں ہو سکا، بعد میں کوشش کریں');
      }
    }
  } catch (error) {
    console.log('سنک میں خرابی:', error);
  }
}
