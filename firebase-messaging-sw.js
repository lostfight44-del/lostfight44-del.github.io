/* VikingGOLD – service worker
   1) Offline támogatás: a lapok és a fájlok a hálózatról töltődnek, de ha nincs net, a legutóbbi mentett változat jelenik meg.
   2) Telefonos push: megjeleníti a szerverről érkező értesítést, és kattintásra megnyitja a megfelelő oldalt.
   A fájl neve azért firebase-messaging-sw.js, mert a js/notify.js is ezt regisztrálja – így egyetlen service worker van. */
const VER = 'vg-v1';
const PAGES = VER + '-pages', STATIC = VER + '-static', LIBS = VER + '-libs';
const PRECACHE = ['/offline.html', '/assets/style.css', '/assets/logo.webp', '/assets/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(PRECACHE)).catch(() => { }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VER)).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

const put = (name, req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(name).then(c => c.put(req, copy)).catch(() => { }); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase könyvtárak (a verzió benne van az URL-ben, ezért biztonságosan gyorsítótárazhatók)
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(LIBS, req, r))));
    return;
  }
  if (url.origin !== location.origin) return;                       // minden más külső kérés (Firestore, betűtípus) marad a böngészőnél

  // Lapok: előbb a hálózat, offline esetén a mentett példány, végül az offline oldal
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => put(PAGES, req, r)).catch(() =>
        caches.match(req).then(hit => hit || caches.match('/offline.html')))
    );
    return;
  }

  // Képek, betűk, ikonok: előbb a mentett példány (frissítés a háttérben)
  if (/\.(?:png|webp|jpg|jpeg|svg|ico|woff2?)$/i.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => put(STATIC, req, r)).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // CSS / JS: előbb a hálózat (így a frissítés azonnal megjelenik), offline esetén a mentett példány
  if (/\.(?:css|js|webmanifest)$/i.test(url.pathname)) {
    e.respondWith(fetch(req).then(r => put(STATIC, req, r)).catch(() => caches.match(req)));
  }
});

/* ---------- push ---------- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { notification: { body: e.data.text() } }; } catch (y) { } }
  const n = d.notification || {}, x = d.data || {};
  const title = n.title || x.title || 'VikingGOLD';
  const opt = {
    body: n.body || x.body || '',
    icon: n.icon || '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: x.tag || n.tag || undefined,
    data: { link: x.link || (d.fcmOptions && d.fcmOptions.link) || n.click_action || '/tippek' }
  };
  e.waitUntil(self.registration.showNotification(title, opt));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '/';
  const target = new URL(link, self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url === target && 'focus' in c) return c.focus(); }
      for (const c of list) { if ('navigate' in c && 'focus' in c) return c.focus().then(w => w.navigate(target)); }
      return self.clients.openWindow(target);
    })
  );
});
