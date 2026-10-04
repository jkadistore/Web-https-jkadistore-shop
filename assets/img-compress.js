/* ==================================================================
   JK ADISTORE — IMG COMPRESS v1.0 (2026-09-07)
   Kompres otomatis SEMUA foto (base64) di data toko:
   1. Foto yang baru di-upload via Panel (pilih foto) -> langsung
      dikompres sebelum disimpan.
   2. Foto LAMA yang sudah ada di data -> di-scan & dikompres
      otomatis saat owner membuka situs (1x per sesi/perubahan).
   Hasil: data toko jadi kecil (Deploy Ulang tidak gagal "terlalu
   besar") + situs ringan/tidak lelet. Kompresi: max 640px,
   format WebP/JPEG. GIF animasi & foto kecil TIDAK diubah.
   Dimuat SETELAH app.js + store-sync.js.
   ================================================================== */
(function () {
  'use strict';

  var KEY = 'jka_db_v3';
  var MIN_BYTES = 12 * 1024;     /* hanya proses dataURL > 12KB */
  var MAX_DIM = 640;             /* sisi terpanjang maks (px) */
  var Q1 = 0.82, Q2 = 0.72;      /* kualitas pass 1 / pass 2 */
  var RETRY_BYTES = 90 * 1024;   /* jika hasil > 90KB -> ulang lebih kecil */
  var BIG_HINT = 200 * 1024;     /* localStorage > 200KB & ada foto -> scan */

  var cache = {};       /* dataURL lama -> dataURL baru (null = biarkan) */
  var scanning = false;
  var scanTimer = null;

  function log() { try { console.log('[img-compress]', arguments); } catch (e) {} }
  function duo(h, l) { return String.fromCharCode(h, l); }
  var E_CAM = duo(0xD83D, 0xDCF7);          /* kamera */
  var E_OK = String.fromCharCode(9989);     /* check */

  function isOld(s) {
    return typeof s === 'string' && s.length > MIN_BYTES &&
      s.indexOf('data:image/') === 0 && s.indexOf('data:image/gif') !== 0;
  }
  function kb(n) { return Math.round(n / 1024) + 'KB'; }

  function toImage(url) {
    return new Promise(function (res, rej) {
      var i = new Image();
      i.onload = function () { res(i); };
      i.onerror = function () { rej(new Error('img load')); };
      i.src = url;
    });
  }
  function readBlob(b) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result)); };
      fr.onerror = function () { res(null); };
      fr.readAsDataURL(b);
    });
  }

  /* render ke canvas -> pilih tipe (webp/jpeg) dgn ukuran terkecil */
  function render(img, dim, q) {
    var w = img.naturalWidth || img.width || 0;
    var h = img.naturalHeight || img.height || 0;
    if (!w || !h) return Promise.resolve(null);
    var sc = Math.min(1, dim / Math.max(w, h));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * sc));
    cv.height = Math.max(1, Math.round(h * sc));
    var cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = true;
    try { cx.imageSmoothingQuality = 'high'; } catch (e) {}
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    var best = null;
    var chain = Promise.resolve();
    ['image/webp', 'image/jpeg'].forEach(function (t) {
      chain = chain.then(function () {
        return new Promise(function (res) {
          if (!cv.toBlob) {
            try {
              var s = cv.toDataURL(t, q);
              if (s && (!best || s.length < best.len)) best = { url: s, len: s.length };
            } catch (e) {}
            return res();
          }
          try {
            cv.toBlob(function (b) {
              if (b && (!best || b.size < best.size)) best = { blob: b, size: b.size };
              res();
            }, t, q);
          } catch (e) { res(); }
        });
      });
    });
    return chain.then(function () {
      if (!best) return null;
      if (best.url) return best.url;
      return readBlob(best.blob);
    });
  }

  function compress(url) {
    if (cache[url] !== undefined) return Promise.resolve(cache[url]);
    var p = toImage(url)
      .then(function (img) { return render(img, MAX_DIM, Q1); })
      .then(function (out) {
        if (out && out.length > RETRY_BYTES) {
          /* masih besar -> pass 2: 480px, kualitas lebih rendah */
          return toImage(url)
            .then(function (img) { return render(img, 480, Q2); })
            .then(function (small) { return (small && small.length < out.length) ? small : out; });
        }
        return out;
      })
      .then(function (out) {
        /* hanya pakai jika benar2 lebih kecil (>=10% hemat) */
        if (out && out.length < url.length * 0.9) { cache[url] = out; return out; }
        cache[url] = null;
        return null;
      })
      .catch(function () { cache[url] = null; return null; });
    return p;
  }

  /* ---------- 1) hook upload: chooseFile -> kompres dulu ---------- */
  function installUploadHook() {
    if (window.__jkImgComprHook) return;
    window.__jkImgComprHook = true;
    var orig = window.chooseFile;
    if (typeof orig !== 'function') return;
    window.chooseFile = function (cb, accept) {
      orig(function (dataUrl) {
        if (!isOld(dataUrl)) return cb(dataUrl);
        compress(dataUrl).then(function (out) {
          if (out) {
            log('upload', kb(dataUrl.length), '->', kb(out.length));
            try { if (typeof toast === 'function') toast(E_CAM + ' Foto dikompres otomatis: ' + kb(dataUrl.length) + ' \u2192 ' + kb(out.length)); } catch (e) {}
            cb(out);
          } else cb(dataUrl);
        });
      }, accept);
    };
  }

  /* ---------- 2) scan & kompres foto LAMA di data ---------- */
  function getFresh() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function collect(o, seen, out) {
    if (!o || typeof o !== 'object') return;
    if (seen.indexOf(o) >= 0) return;
    seen.push(o);
    if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) collect(o[i], seen, out); return; }
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var v = o[k];
      if (isOld(v)) { if (out.indexOf(v) < 0) out.push(v); }
      else if (v && typeof v === 'object') collect(v, seen, out);
    }
  }
  function replaceIn(o, seen) {
    if (!o || typeof o !== 'object') return false;
    if (seen.indexOf(o) >= 0) return false;
    seen.push(o);
    var changed = false;
    if (Array.isArray(o)) {
      for (var i = 0; i < o.length; i++) {
        if (typeof o[i] === 'string' && cache[o[i]]) { o[i] = cache[o[i]]; changed = true; }
        else if (o[i] && typeof o[i] === 'object') changed = replaceIn(o[i], seen) || changed;
      }
      return changed;
    }
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var v = o[k];
      if (typeof v === 'string' && cache[v]) { o[k] = cache[v]; changed = true; }
      else if (v && typeof v === 'object') changed = replaceIn(v, seen) || changed;
    }
    return changed;
  }
  function isOwnerNow() {
    try { if (typeof isOwner === 'function' && isOwner()) return true; } catch (e) {}
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      return !!(d && d.session && d.session.role === 'owner');
    } catch (e) { return false; }
  }

  function scan(reason) {
    if (scanning) return;
    if (!isOwnerNow()) return;
    var d = getFresh();
    if (!d) return;
    var urls = [];
    collect(d, [], urls);
    if (!urls.length) { log('scan(' + reason + '): tidak ada foto besar'); return; }
    scanning = true;
    log('scan(' + reason + '):', urls.length, 'foto besar — mulai kompres...');
    var i = 0;
    (function next() {
      if (i >= urls.length) return finish(d);
      var u = urls[i++];
      compress(u).then(next);
    })();

    function finish(base) {
      scanning = false;
      /* parse ULANG data terbaru (owner mungkin sempat mengedit) */
      var fresh = getFresh();
      if (!fresh) return;
      if (!replaceIn(fresh, [])) return log('scan selesai — tidak ada perubahan');
      var before = 0, after = 0;
      try { before = JSON.stringify(base).length; } catch (e) {}
      try { after = JSON.stringify(fresh).length; } catch (e) {}
      try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) { return log('gagal tulis (skip)'); }
      /* perbarui db global + render ulang bila aman */
      try {
        if (typeof db !== 'undefined') db = fresh;
        if (typeof STORE !== 'undefined' && fresh.store) STORE = fresh.store;
        if (!document.querySelector('.modal.show') && typeof renderAll === 'function') renderAll();
      } catch (e) {}
      log('SELESAI:', urls.length, 'foto dikompres. Data toko', kb(before), '->', kb(after));
      try {
        if (typeof toast === 'function') {
          toast(E_OK + ' ' + urls.length + ' foto dikompres otomatis. Data toko: ' + kb(before) + ' \u2192 ' + kb(after) + ' (tersimpan & terkirim ke server)');
        }
      } catch (e) {}
    }
  }

  /* ---------- 3) hook localStorage: restore/import data -> scan ulang ---------- */
  function installStorageHook() {
    try {
      var prev = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        var ret = prev.apply(this, arguments);
        if (k === KEY && !scanning) {
          try {
            var s = String(v || '');
            if (s.length > BIG_HINT && s.indexOf('data:image/') >= 0) {
              clearTimeout(scanTimer);
              scanTimer = setTimeout(function () { scan('restore/import'); }, 3000);
            }
          } catch (e) {}
        }
        return ret;
      };
    } catch (e) {}
  }

  function boot() {
    installUploadHook();
    installStorageHook();
    setTimeout(function () { scan('boot'); }, 2500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
