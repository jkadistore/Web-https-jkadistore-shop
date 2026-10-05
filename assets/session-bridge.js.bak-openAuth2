/* ==================================================================
   JK ADISTORE — SESSION BRIDGE (v1)
   BAGIAN 1: Login/register SEKALI di gerbang (halaman /login).
   Modul ini menyambungkan sesi SERVER (cookie jka_session) dengan
   sesi SPA lokal (localStorage jka_db_v3) sehingga:
   - Tidak ada tombol "Masuk/Daftar" di dalam situs setelah login
   - Tidak ada login ulang / registrasi ulang di dalam situs
   - Profil otomatis tersedia (klik nama → /profile)
   Dimuat SETELAH app.js (menimpa openAuth/openProfile/logout/isOwner
   dengan versi gerbang). Semua fungsi lain app.js TIDAK diubah.
   ================================================================== */
(function () {
  'use strict';

  /* ---------- helper ---------- */
  function $b(id) { return document.getElementById(id); }
  function toastB(msg) {
    try { toast(msg); } catch (e) {
      var t = $b('toast');
      if (t) { t.innerHTML = msg; t.classList.add('show'); clearTimeout(t._tb); t._tb = setTimeout(function () { t.classList.remove('show'); }, 2600); }
    }
  }
  function getDB() {
    try { return (typeof db !== 'undefined' && db) || JSON.parse(localStorage.getItem('jka_db_v3') || '{}'); }
    catch (e) { return {}; }
  }
  function saveDB(d) {
    try { localStorage.setItem('jka_db_v3', JSON.stringify(d)); } catch (e) {}
    try { if (typeof db !== 'undefined' && db) { db.users = d.users; db.session = d.session; if (typeof save === 'function') save(); } } catch (e) {}
  }

  /* ================================================================
     1) isOwner() — HANYA berdasarkan role (bukan email!).
     Memperbaiki bug: dulu login sosial dengan email owner otomatis
     menjadi owner. Sekarang: owner hanya dari login owner dengan
     password terverifikasi / role di database.
     ================================================================ */
  try {
    if (typeof isOwner === 'function') {
      window.isOwner = function () {
        try {
          var s = (typeof current === 'function' && current()) || (getDB().session) || null;
          return !!(s && s.role === 'owner' && s._ot && String(s._ot).indexOf('JK') === 0);
        } catch (e) { return false; }
      };
    }
  } catch (e) {}

  /* ================================================================
     1b) NEUTRALISASI __JK_CHK_E — owner HANYA via role + token (_ot JK*)
     dari sesi server. const isOwner di app.js memanggil window.__JK_CHK_E
     (cek email owner) sebagai fallback — dipanggil karena const isOwner
     menutupi (shadow) window.isOwner, override di atas tidak sampai ke
     sana. Dengan __JK_CHK_E selalu false, login sosial dengan email
     owner TIDAK lagi dianggap owner. Sisa cek role==='owner' hanya
     terpenuhi lewat login owner terverifikasi server.
     (Dipakai juga oleh _sendRecoveryCode — aman: worker /api/auth/email/
     sudah memblokir owner, dan fungsi recovery di-bridge ke /login.)
     ================================================================ */
  try { window.__JK_CHK_E = function () { return false; }; } catch (e) {}
  /* __JK_CHK_P (cek password owner lokal) — jalur login lokal legacy sudah
     mati (authLogin diarahkan ke /login), dinetralkan untuk defense-in-depth. */
  try { window.__JK_CHK_P = function () { return false; }; } catch (e) {}

  /* ================================================================
     1c) buyProduct() — dulu bila belum login membuka authModal DI DALAM
     situs (kasus klik cepat sebelum bridge selesai). Sekarang: belum
     login → gerbang /login?next=. buyProduct adalah deklarasi function
     top-level (properti window) — override ini berlaku untuk semua
     pemanggilan, termasuk dari dalam app.js.
     ================================================================ */
  try {
    if (typeof buyProduct === 'function') {
      var __origBuy = window.buyProduct;
      window.buyProduct = function (pid) {
        try {
          var s = (typeof current === 'function' && current()) || getDB().session || null;
          if (!s) {
            toast('Silakan masuk / daftar dulu — mengarahkan ke gerbang…');
            location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search || '/');
            return;
          }
        } catch (e) {}
        if (typeof __origBuy === 'function') return __origBuy.apply(this, arguments);
      };
    }
  } catch (e) {}

  /* ================================================================
     2) openAuth() — dulu membuka authModal di dalam situs.
     Sekarang: pengguna BELUM login → gerbang /login.
     ================================================================ */
  try {
    if (typeof openAuth === 'function') {
      window.openAuth = function () {
        location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search || '/');
      };
    }
  } catch (e) {}

  /* ================================================================
     3) openProfile() — klik nama (kanan atas) → halaman profil sendiri
     ================================================================ */
  try {
    if (typeof openProfile === 'function') {
      window.openProfile = function () {
        location.href = '/profile';
      };
    }
  } catch (e) {}

  /* ================================================================
     4) logout() — keluar dari sesi SERVER + lokal → gerbang /login
     ================================================================ */
  try {
    if (typeof logout === 'function') {
      window.logout = function () {
        var d = getDB();
        d.session = null;
        saveDB(d);
        fetch('/api/auth/logout', { method: 'GET', credentials: 'same-origin' }).catch(function () {});
        setTimeout(function () { location.replace('/login'); }, 200);
      };
    }
  } catch (e) {}

  /* ================================================================
     5) authSwitch/authLogin/authRegister — tombol "Masuk/Daftar" di
     dalam authModal (tidak lagi dipakai, tapi tetap aman bila
     terpanggil) → arahkan ke gerbang.
     ================================================================ */
  ['authSwitch', 'authRegister', 'showRecovery', 'sendRecovery', 'resetPassword'].forEach(function (fn) {
    try {
      if (typeof window[fn] === 'function') {
        window[fn] = function () { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search || '/'); };
      }
    } catch (e) {}
  });

  /* ================================================================
     6) JEMBATAN SESI: /api/auth/session → jka_db_v3.db.session
     Inti perbaikan BAGIAN 1 — dijalankan di setiap halaman SPA.
     ================================================================ */
  var bridged = false;
  function bridgeSession() {
    if (bridged) return;
    bridged = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.success || !data.user) {
          /* tidak ada sesi server → jika ada sesi lokal (mis. owner login
             lama), biarkan; kalau tidak, gate sudah mengarahkan ke /login */
          return;
        }
        var u = data.user;
        var d = getDB();
        d.users = d.users || [];
        var rec = null;
        var idx = -1;
        for (var i = 0; i < d.users.length; i++) {
          if ((d.users[i].email || '').toLowerCase() === String(u.email).toLowerCase()) { rec = d.users[i]; idx = i; break; }
        }
        var isOwner = !!(u.role === 'owner');
        if (!rec) {
          /* profil otomatis dibuat pada login/daftar pertama */
          rec = {
            id: u.id || ('srv_' + Date.now()),
            email: u.email,
            name: u.name || u.email,
            pass: '',
            coins: Number(u.coins) || 0,
            poin: Number(u.poin) || 0,
            wa: u.wa || '',
            avatar: u.avatar || '',
            joined: u.joined || new Date().toISOString(),
            role: u.role || 'user'
          };
          d.users.push(rec);
        } else {
          /* sinkronkan profil dari server (nama/WA/foto/poin terbaru) */
          rec.name = u.name || rec.name;
          rec.wa = (u.wa != null && u.wa !== '') ? u.wa : (rec.wa || '');
          rec.avatar = (u.avatar != null && u.avatar !== '') ? u.avatar : (rec.avatar || '');
          rec.poin = Number(u.poin) || rec.poin || 0;
          rec.joined = rec.joined || u.joined || new Date().toISOString();
          rec.role = u.role || rec.role || 'user';
          d.users[idx] = rec;
        }
        /* sesi SPA = data user (COINS LOKAL DIPERTAHANKAN bila lebih tinggi
           — saldo topup lokal tidak boleh hilang karena bridge) */
        d.session = {
          id: rec.id,
          email: rec.email,
          name: rec.name,
          pass: rec.pass || '',
          coins: isOwner ? 999999999 : Math.max(Number(u.coins) || 0, Number(rec.coins) || 0),
          poin: rec.poin,
          wa: rec.wa,
          avatar: rec.avatar,
          joined: rec.joined,
          role: u.role || 'user',
          _ot: u.ot || (isOwner ? undefined : undefined),
          _sig: undefined
        };
        if (u.ot) d.session._ot = u.ot;
        saveDB(d);
        /* render ulang navbar agar nama muncul di kanan atas */
        try { if (typeof renderNav === 'function') renderNav(); } catch (e) {}
        try { if (typeof renderLinkHub === 'function') renderLinkHub(); } catch (e) {}
      })
      .catch(function () {});
  }

  /* jalankan bridge segera bila app.js sudah siap, atau setelah DOM */
  function boot() { bridgeSession(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  /* juga saat hash-nav/di-load ulang via PWA */
  window.addEventListener('load', function () { bridged = false; bridgeSession(); });

  /* ================================================================
     7) Klik tombol nama (userBtn) saat SUDAH login → /profile.
     app.js renderNav sudah mengarahkan onclick=openProfile (kami sudah
     menimpanya → /profile). userBtn bila BELUM login → openAuth → /login.
     ================================================================ */

  /* ================================================================
     8) Topup-flag dari halaman profil (dari modul user-profile lama)
     ================================================================ */
  try {
    if (localStorage.getItem('jk_open_topup') === '1') {
      localStorage.removeItem('jk_open_topup');
      setTimeout(function () { try { if (typeof openTopup === 'function') openTopup(); } catch (e) {} }, 600);
    }
  } catch (e) {}
})();
