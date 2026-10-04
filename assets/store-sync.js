/* ==================================================================
   JK ADISTORE — STORE SYNC v1.0 (2026-09-06)
   Bagian 0: Samakan database Panel Owner ↔ Cloudflare D1.

   Cara kerja:
   1. OWNER: setiap kali data toko berubah (save() menulis localStorage
      'jka_db_v3'), script ini OTOMATIS mengirim data terbaru ke D1
      via POST /api/store/save (debounce 1.2s). Panel & D1 SELALU sama.
   2. OWNER (browser lain): saat buka situs, data TERBARU dari D1
      ditarik via GET /api/store/latest lalu digabung ke db lokal.
   3. PENGUNJUNG: data TERPUBLIKASI (versi yang sudah di-Deploy Ulang)
      ditarik via GET /api/store/data lalu digabung (field publik saja:
      products/cats/reviews/socials/slides/store). Data yang belum
      di-deploy TIDAK tampil ke pengunjung — sesuai aturan sistem.

   Dimuat SETELAH app.js (bisa akses let db global + save/renderAll).
   ================================================================== */
(function () {
  'use strict';

  var KEY = 'jka_db_v3';
  var PUSH_DEBOUNCE = 1200;
  var pushTimer = null;
  var booting = true;   /* cegah push saat merge data dari server */

  function log() { try { console.log('[store-sync]', arguments); } catch (e) {} }

  function sessionRole() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      return (d && d.session && d.session.role) || null;
    } catch (e) { return null; }
  }

  function isOwnerNow() {
    try { if (typeof isOwner === 'function' && isOwner()) return true; } catch (e) {}
    var r = sessionRole();
    return r === 'owner';
  }

  /* ---------- field yang di-push / di-merge ---------- */
  function pickPublic(dbObj) {
    if (!dbObj || typeof dbObj !== 'object') return null;
    return {
      products: dbObj.products,
      cats: dbObj.cats,
      reviews: dbObj.reviews,
      socials: dbObj.socials,
      slides: dbObj.slides,
      store: dbObj.store
    };
  }

  function sameJson(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  /* ---------- PUSH: owner → D1 (setiap perubahan) ---------- */
  function pushNow() {
    if (!isOwnerNow()) return;
    var dbObj = null;
    try { dbObj = (typeof db !== 'undefined' && db) || JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { dbObj = null; }
    if (!dbObj) return;
    var body = JSON.stringify({ store: dbObj });
    fetch('/api/store/save', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: body
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.success) log('push OK versi', j.versi);
    }).catch(function (e) { log('push gagal (non-fatal)', e && e.message); });
  }

  function schedulePush() {
    if (booting) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, PUSH_DEBOUNCE);
  }

  /* hook: setiap save() menulis 'jka_db_v3' → push ke D1 */
  try {
    var origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      var ret = origSetItem.apply(this, arguments);
      if (k === KEY) {
        try { schedulePush(); } catch (e) {}
      }
      return ret;
    };
  } catch (e) {}

  /* ---------- MERGE: data dari server → db lokal ---------- */
  function mergeIntoDb(remote) {
    if (!remote || typeof remote !== 'object') return false;
    var changed = false;
    try {
      var dbObj = (typeof db !== 'undefined' && db) || JSON.parse(localStorage.getItem(KEY) || '{}');
      ['products', 'cats', 'reviews', 'socials', 'slides'].forEach(function (f) {
        if (remote[f] && Array.isArray(remote[f])) {
          if (!sameJson(dbObj[f], remote[f])) { dbObj[f] = remote[f]; changed = true; }
        }
      });
      if (remote.store && typeof remote.store === 'object') {
        if (!sameJson(dbObj.store, remote.store)) {
          dbObj.store = Object.assign({}, dbObj.store, remote.store);
          changed = true;
        }
      }
      if (!changed) return false;
      /* tulis ulang db global + localStorage + render ulang */
      if (typeof db !== 'undefined') {
        db = dbObj;   /* reassign global lexical binding dari app.js */
      }
      localStorage.setItem(KEY, JSON.stringify(dbObj));
      if (typeof STORE !== 'undefined' && dbObj.store) { try { STORE = dbObj.store; } catch (e) {} }
      try { if (typeof save === 'function') save(); } catch (e) {}
      try { if (typeof applyStore === 'function') applyStore(); } catch (e) {}
      try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
      return true;
    } catch (e) { log('merge error', e && e.message); return false; }
  }

  /* ---------- BOOT: tarik data sesuai role ---------- */
  function boot() {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var role = (j && j.user && j.user.role) || null;
        var url = role === 'owner' ? '/api/store/latest' : '/api/store/data';
        return fetch(url, { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; });
      })
      .then(function (j) {
        var remote = (j && j.success && j.store) ? j.store : null;
        if (remote) {
          var applied = mergeIntoDb(remote);
          log(roleLabel(), 'merge', applied ? 'APPLIED' : 'no-change', 'versi', j && j.versi);
        } else {
          log(roleLabel(), 'belum ada data server (belum pernah deploy)');
        }
        booting = false;
        /* owner: push kondisi sekarang bila lebih baru dari server */
        if (isOwnerNow()) setTimeout(pushNow, 1500);
      })
      .catch(function (e) {
        booting = false;
        log('boot gagal (non-fatal)', e && e.message);
      });
  }

  function roleLabel() { return isOwnerNow() ? 'owner' : 'pengunjung'; }

  /* mulai setelah DOM siap (app.js sudah jalan & render pertama selesai) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 600); });
  } else {
    setTimeout(boot, 600);
  }
})();
