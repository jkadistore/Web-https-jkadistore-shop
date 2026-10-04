/* JK ADISTORE — Service Worker v6 (jka-v15)
   Cache PWA + offline fallback + cache gambar super cepat
   v15: HTML/JS/CSS = network-first tanpa cache HTTP (perubahan deploy LANGSUNG
        terlihat tanpa refresh); gambar = cache-first (foto instan, 1 tahun). */
var CACHE = 'jka-v15-autoupdate';
var ASSETS = [
  './images/logo-owner.webp',
  './images/banner-1-topup.webp',
  './images/banner-2-premium.webp',
  './images/banner-3-brand.webp'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
  /* beri tahu semua tab: SW baru aktif */
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function (list) {
      list.forEach(function (c) { try { c.postMessage('jka-sw-updated'); } catch (err) {} });
    })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  var isImg = url.pathname.indexOf('/images/') === 0 || /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);

  if (isImg) {
    /* GAMBAR: cache-first + refresh di belakang (stale-while-revalidate).
       Foto produk kecil (±10KB) → tampil instan dari cache. */
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) {
          var cp = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp).catch(function () {}); });
          return r;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
    return;
  }

  /* HTML / JS / CSS / API: LANGSUNG ke jaringan — versi server selalu dipakai.
     (header no-cache dari worker memastikan tidak ada salinan basi) */
  e.respondWith(
    fetch(req).catch(function () {
      /* fallback offline: pakai cache kalau jaringan mati total */
      return caches.match(req).then(function (hit) {
        return hit || new Response('<h3>Koneksi offline. Coba lagi setelah internet aktif.</h3>', { status: 503, headers: { 'content-type': 'text/html' } });
      });
    })
  );
});
