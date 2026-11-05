// Offline support + reminder notifications.
const CACHE = 'luta-v2';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './store.js', './photos.js', './firebase-config.js',
  './luta.jpg', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App files: network first so updates show up straight away, cache when offline.
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))),
    );
    return;
  }

  // Versioned Firebase SDK files and fonts never change: cache first.
  if (url.hostname === 'www.gstatic.com' || url.hostname.startsWith('fonts.')) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })),
    );
  }
});

// Messages are sent by .github/workflows/reminders.yml as FCM "data" messages.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { data: { body: event.data?.text() } }; }
  const msg = { ...(payload.notification || {}), ...(payload.data || {}) };
  event.waitUntil(self.registration.showNotification(msg.title || 'Luta 🐾', {
    body: msg.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: msg.tag || undefined,
    data: { url: msg.url || './' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => c.url.startsWith(self.registration.scope));
      if (open) { open.navigate(target).catch(() => {}); return open.focus(); }
      return self.clients.openWindow(target);
    }),
  );
});
