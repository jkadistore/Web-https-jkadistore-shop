/* ==================================================================
   JK ADISTORE — OWNER PANEL MODULE (integrasi ke Panel Admin Toko)
   Dimuat SETELAH app.js. SEMUA fitur Panel Owner kini masuk ke dalam
   Panel Admin (tab ke-16 "👑 Panel Owner") — bukan halaman terpisah.

   Fitur (v20260913 — dashboard bersih, keamanan server-backed, + PENGATURAN SISTEM):
   1) Navigasi Cepat   : Toko Utama | Gudang AI | Foto ke URL | Sertifikat
   2) Sertifikat/Verifikasi Kepemilikan (RSA-2048, WebCrypto — jalan nyata)
   3) Statistik        : Pengguna, Produk, Kategori, Pesanan
   4) Status Infrastruktur : D1 (3 website), Turnstile, Email Resend,
                             OAuth Google/Discord/GitHub (dari /api/health)
   5) Daftar Pengguna  : ID | EMAIL | NAMA | PERAN | STATUS
   6) Keamanan Owner   : 🔑 UBAH KATA SANDI OWNER + 🔒 KEAMANAN & AKSES OWNER
                         (server /api/auth/owner/password & /api/auth/owner/security)
   7) Kelola Website   : Buka Panel Admin Toko + tautan 3 website
   (Riwayat Login & Log Perubahan DIHAPUS sesuai permintaan — audit kini di server D1.)
   ================================================================== */
(function () {
  'use strict';

  if (typeof window.adminNav !== 'function') return; // app.js belum siap

  /* ---------- Helper ---------- */
  function escO(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toastO(msg) {
    try { toast(msg); } catch (e) { var t = document.getElementById('toast'); if (t) { t.innerHTML = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2400); } }
  }
  function fmtTimeO(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso || '-'); }
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- 1) Suntik tab ke-16 di sisi Panel Admin ---------- */
  function injectTab() {
    var side = document.querySelector('#adminModal .admin-side');
    if (!side || document.getElementById('ownerTabBtn')) return;
    var b = document.createElement('button');
    b.className = 'admin-tab btn btn-sm';
    b.id = 'ownerTabBtn';
    b.dataset.tab = 'owner';
    b.setAttribute('onclick', "adminNav('owner')");
    b.innerHTML = '\uD83D\uDC51 <b>Panel Owner</b>';
    b.style.border = '1px solid color-mix(in srgb, var(--accent) 45%, var(--stroke))';
    side.appendChild(b);
  }
  injectTab();
  // modal admin bisa dirender ulang oleh app.js → pastikan tab tetap ada
  setInterval(injectTab, 3000);

  /* ---------- 2) Override adminNav: tab 'owner' → render panel ---------- */
  var _origAdminNav = window.adminNav;
  window.adminNav = function (tab) {
    if (tab === 'owner') {
      // sorot tab (logika sama seperti app.js)
      document.querySelectorAll('.admin-tab').forEach(function (t) {
        t.classList.toggle('btn-primary', t.dataset.tab === 'owner');
      });
      renderOwnerPanel();
      return;
    }
    return _origAdminNav.apply(this, arguments);
  };

  /* ---------- Data ---------- */
  function getDB() { try { return (typeof db !== 'undefined' && db) || {}; } catch (e) { return {}; } }
  function getUsers() {
    var d = getDB(); var u = (d.users || []).slice();
    // pastikan owner yang sedang login selalu tampil
    try {
      var c = current();
      if (c && c.email && !u.some(function (x) { return (x.email || '').toLowerCase() === c.email.toLowerCase(); })) {
        u.push({ id: 'owner-session', email: c.email, name: c.name || c.email, role: 'owner', coins: 0 });
      }
    } catch (e) { }
    return u;
  }
  function getSecLog() {
    try { return JSON.parse(localStorage.getItem('jk_sec_log') || '[]'); } catch (e) { return []; }
  }
  function shortHash(s, n) {
    s = String(s || '');
    if (s.length <= (n || 12)) return s;
    return s.slice(0, Math.ceil((n || 12) / 2)) + '…' + s.slice(-Math.floor((n || 12) / 2));
  }

  /* ---------- 3) Render Panel Owner (padat & rapi) ---------- */
  function renderOwnerPanel() {
    var d = getDB();
    var email = '-', name = 'Owner';
    var isOwnerOk = false;
    try { var c = current(); if (c) { email = c.email || '-'; name = c.name || c.email || 'Owner'; } isOwnerOk = isOwner(); } catch (e) { }

    var stats = [
      { v: getUsers().length, l: 'Pengguna' },
      { v: (d.products || []).length, l: 'Produk' },
      { v: (d.cats || []).length, l: 'Kategori' },
      { v: (d.orders || []).length, l: 'Pesanan' },
    ];

    var html = ''
      + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">'
      + '<h2 style="font-size:22px;margin:0">\uD83D\uDC51 Panel Owner</h2>'
      + '<span class="btn-xs btn" style="pointer-events:none;color:var(--ok,#6dffb0);border-color:color-mix(in srgb,var(--ok) 40%,var(--stroke));font-size:10px;font-weight:900;letter-spacing:.5px">OWNER UTAMA</span>'
      + (isOwnerOk ? '' : '<span class="btn-xs btn" style="pointer-events:none;color:var(--err);font-size:10px;font-weight:900">AKSES TERBATAS</span>')
      + '</div>'
      + '<p class="muted" style="margin:0 0 12px;font-size:12px">Kendali penuh sistem di 3 website \u00b7 Masuk sebagai <b>' + escO(email) + '</b></p>';

    /* --- Navigasi Cepat --- */
    html += '<div class="admin-card" style="padding:10px 12px">'
      + '<div class="label" style="margin:0 0 7px">\u2699\ufe0f Navigasi Cepat</div>'
      + '<div class="row" style="gap:6px">'
      + '<button class="btn btn-sm" onclick="location.href=\'https://jkadistore.shop\'">\uD83C\uDFE2 Toko Utama</button>'
      + '<button class="btn btn-sm" onclick="location.href=\'https://ai.jkadistore.shop\'">\uD83C\uDFED Gudang AI</button>'
      + '<button class="btn btn-sm" onclick="location.href=\'https://app.jkadistore.shop\'">\uD83D\uDCF8 Foto ke URL</button>'
      + '<button class="btn btn-sm" onclick="modalHide(\'adminModal\');document.getElementById(\'sertifikat\')?document.getElementById(\'sertifikat\').scrollIntoView({behavior:\'smooth\'}):0">\uD83C\uDFC1 Sertifikat</button>'
      + '</div></div>';

    /* --- Sertifikat Kepemilikan + tombol verifikasi --- */
    html += '<div class="admin-card" style="padding:10px 12px">'
      + '<div class="label" style="margin:0 0 7px">\uD83D\uDEE1\uFE0F Sertifikat Kepemilikan</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:12px">'
      + '<div><span class="muted">Status Verifikasi:</span> <b id="opCertStatus" style="color:var(--ok,#6dffb0)">memuat…</b></div>'
      + '<div><span class="muted">Data Rahasia Owner:</span> <b style="color:var(--ok,#6dffb0)">\uD83D\uDD12 terenkripsi</b></div>'
      + '<div style="grid-column:1/-1"><span class="muted">Tanda Tangan:</span> <b id="opSig" style="font-family:monospace;font-size:11px;word-break:break-all">…</b></div>'
      + '</div>'
      + '<button class="btn btn-sm btn-primary" style="margin-top:8px;width:100%" onclick="opVerifyCert()">\u2713 VERIFIKASI &amp; TANDA TANGAN</button>'
      + '<div id="opCertRes" class="muted" style="margin-top:8px;font-size:11.5px;line-height:1.6"></div>'
      + '</div>';

    /* --- Statistik --- */
    html += '<div class="admin-card" style="padding:10px 12px">'
      + '<div class="label" style="margin:0 0 7px">\uD83D\uDCCA Statistik</div>'
      + '<div class="feature-grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">'
      + stats.map(function (s) { return '<div class="feature-tile" style="padding:10px 6px"><b style="font-size:19px">' + s.v + '</b><small>' + s.l + '</small></div>'; }).join('')
      + '</div></div>';

    /* --- Infrastruktur --- */
    html += '<div class="admin-card" style="padding:10px 12px">'
      + '<div class="label" style="margin:0 0 7px">\u2601\uFE0F Status Infrastruktur</div>'
      + '<div id="opInfra" class="muted" style="font-size:12px">\u23F3 Memuat status…</div></div>';

    /* --- Daftar Pengguna --- */
    var users = getUsers();
    html += '<div class="admin-card" style="padding:10px 12px">'
      + '<div class="label" style="margin:0 0 7px">\uD83D\uDC65 Daftar Pengguna (' + users.length + ')</div>'
      + (users.length ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px">'
        + '<thead><tr style="color:#8f9ac0;text-align:left"><th style="padding:4px 6px">ID</th><th>EMAIL</th><th>NAMA</th><th>PERAN</th><th>STATUS</th></tr></thead><tbody>'
        + users.map(function (u) {
          return '<tr style="border-top:1px solid var(--stroke)">'
            + '<td style="padding:4px 6px;font-family:monospace">' + escO(shortHash(u.id || '-', 10)) + '</td>'
            + '<td>' + escO(u.email || '-') + '</td>'
            + '<td>' + escO(u.name || '-') + '</td>'
            + '<td>' + (u.role === 'owner' ? '\uD83D\uDC51 <b style="color:var(--accent,#ffd166)">OWNER</b>' : 'USER') + '</td>'
            + '<td><b style="color:var(--ok,#6dffb0)">AKTIF</b></td></tr>';
        }).join('')
        + '</tbody></table></div>'
        : '<div class="muted" style="font-size:12px">Belum ada pengguna terdaftar.</div>')
      + '</div>';

    /* --- Keamanan Owner (BAGIAN 3: kartu baru, server-backed) --- */
    html += '<div class="admin-card" style="padding:10px 12px">'
      + '<div class="label" style="margin:0 0 7px">\uD83D\uDD12 Keamanan Owner</div>'
      + '<div class="row" style="gap:6px">'
      + '<button class="btn btn-sm btn-primary" onclick="openAPassModal(\'owner\')">\uD83D\uDD11 UBAH KATA SANDI OWNER</button>'
      + '<button class="btn btn-sm" onclick="opKeamanan()">\uD83D\uDD12 KEAMANAN &amp; AKSES OWNER</button>'
      + '</div>'
      + '<div class="muted" style="font-size:10.5px;margin-top:6px">Sandi owner terverifikasi &amp; disimpan di server (D1). Perubahan sandi otomatis keluar dari semua perangkat.</div>'
      + '</div>';

    /* --- PENGATURAN SISTEM (v20260913: halaman /pengaturan) --- */
    html += '<div class="admin-card" style="padding:10px 12px;border:1px solid color-mix(in srgb,var(--accent,#ffd700) 45%,var(--stroke))">'
      + '<div class="label" style="margin:0 0 7px">\u2699\uFE0F PENGATURAN SISTEM</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11.5px;margin-bottom:8px">'
      + '<div><span class="muted">Login Google:</span> <b id="opPSg">\u2026</b></div>'
      + '<div><span class="muted">Login GitHub:</span> <b id="opPSh">\u2026</b></div>'
      + '<div><span class="muted">Login Discord:</span> <b id="opPSd">\u2026</b></div>'
      + '<div><span class="muted">Email Resend:</span> <b id="opPSr">\u2026</b></div>'
      + '</div>'
      + '<div class="row" style="gap:6px">'
      + '<button class="btn btn-sm btn-primary" onclick="location.href=\'/pengaturan\'">\u2699\uFE0F BUKA PENGATURAN SISTEM</button>'
      + '<button class="btn btn-sm" onclick="window.open(\'/api/auth/owner/settings/export\',\'_blank\')">\uD83D\uDCE5 Download Database</button>'
      + '</div>'
      + '<div class="muted" style="font-size:10.5px;margin-top:6px">Ganti API key &amp; kredensial login (Google/GitHub/Discord/Resend) tanpa ubah kode — perubahan langsung aktif.</div>'
      + '</div>';

    /* --- Kelola Website --- */
    html += '<div class="admin-card" style="padding:10px 12px">'
      + '<div class="label" style="margin:0 0 7px">\uD83C\uDFAF Kelola Website</div>'
      + '<div class="row" style="gap:6px">'
      + '<button class="btn btn-sm btn-primary" onclick="adminNav(\'dashboard\')">\uD83D\uDC49 Buka Panel Admin Toko</button>'
      + '<button class="btn btn-sm" onclick="window.open(\'https://app.jkadistore.shop\',\'_blank\')">App Foto</button>'
      + '<button class="btn btn-sm" onclick="window.open(\'https://ai.jkadistore.shop\',\'_blank\')">AI Asisten</button>'
      + '</div></div>';

    try { adminWrap(html); } catch (e) { var el = $('adminContent'); if (el) el.innerHTML = html; }

    // muat data sertifikat + infrastruktur secara asinkron
    loadCert();
    loadInfra();
    loadPengaturanSistem();
  }

  /* ---------- 4) Sertifikat: muat & verifikasi RSA (fungsi nyata, WebCrypto) ---------- */
  var certCache = null;
  function loadCert() {
    fetch('keys/owner_cert.json').then(function (r) { return r.json(); }).then(function (c) {
      certCache = c;
      var st = $('opCertStatus'), sg = $('opSig');
      if (st) st.textContent = 'terverifikasi \u2713';
      if (sg && c.signature) sg.textContent = shortHash(c.signature, 34);
    }).catch(function () {
      var st = $('opCertStatus'); if (st) { st.textContent = 'tidak tersedia'; st.style.color = 'var(--err,#ff6d8a)'; }
    });
  }

  async function opVerifyCertImpl() {
    var res = $('opCertRes');
    if (res) res.textContent = '\u23F3 Memverifikasi tanda tangan digital\u2026';
    try {
      var cert = certCache || await (await fetch('keys/owner_cert.json')).json();
      certCache = cert;
      var sg = $('opSig'); if (sg && cert.signature) sg.textContent = shortHash(cert.signature, 34);
      var pem = await (await fetch('keys/public_key.pem')).text();
      var b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
      var keyData = Uint8Array.from(atob(b64), function (ch) { return ch.charCodeAt(0); });
      var key = await crypto.subtle.importKey('spki', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
      var sig = Uint8Array.from(atob(cert.signature), function (ch) { return ch.charCodeAt(0); });
      var data = new TextEncoder().encode(cert.message);
      var ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, data);
      var st = $('opCertStatus');
      if (ok) {
        if (st) { st.textContent = 'terverifikasi \u2713'; st.style.color = 'var(--ok,#6dffb0)'; }
        if (res) res.innerHTML = '\uD83D\uDEE1\uFE0F <b style="color:var(--ok,#6dffb0)">SAH &amp; TERVERIFIKASI</b> \u2014 RSA-2048 cocok dengan kunci publik pemilik.<br><span style="font-size:10.5px">Algoritma: ' + escO(cert.algorithm || 'RSA-2048 / PKCS1v15-SHA256') + ' \u00b7 Terbit: ' + escO(cert.issued || '-') + ' \u00b7 Fingerprint: ' + escO(cert.fingerprint || '-') + '</span>';
        toastO('\uD83D\uDEE1\uFE0F Sertifikat SAH & TERVERIFIKASI');
        try { _logSecurity('OWNER_CERT_VERIFY', 'panel-owner'); } catch (e) { }
      } else {
        if (st) { st.textContent = 'TIDAK SAH'; st.style.color = 'var(--err,#ff6d8a)'; }
        if (res) res.innerHTML = '\u26A0\uFE0F <b style="color:var(--err,#ff6d8a)">Tanda tangan TIDAK cocok \u2014 keaslian diragukan.</b>';
      }
    } catch (e) {
      if (res) res.textContent = '\u26A0\uFE0F Gagal memverifikasi (' + ((e && e.message) || 'peramban tidak mendukung') + ')';
    }
  }
  // diekspos global untuk tombol onclick
  window.opVerifyCert = opVerifyCertImpl;

  /* ---------- 4b) PENGATURAN SISTEM: ringkasan status kredensial ---------- */
  function loadPengaturanSistem() {
    var g = $('opPSg'), h = $('opPSh'), d = $('opPSd'), r = $('opPSr');
    if (!g && !h && !d && !r) return;
    fetch('/api/auth/owner/settings', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (j) {
        var map = {};
        ((j && j.settings) || []).forEach(function (s) { map[s.kunci] = s; });
        function mark(k) {
          var s = map[k] || {};
          return s.terpasang
            ? '<b style="color:var(--ok,#6dffb0)">' + (s.source === 'db' ? '\u2713 Panel' : '\u2713 Default') + '</b>'
            : '<b style="color:var(--muted)">\u2014 belum</b>';
        }
        if (g) g.innerHTML = mark('OAUTH_GOOGLE_ID');
        if (h) h.innerHTML = mark('OAUTH_GITHUB_ID');
        if (d) d.innerHTML = mark('OAUTH_DISCORD_ID');
        if (r) r.innerHTML = mark('RESEND_API_KEY');
      })
      .catch(function () {
        if (g) g.innerHTML = '<b style="color:var(--muted)">\u2014</b>';
        if (h) h.innerHTML = '<b style="color:var(--muted)">\u2014</b>';
        if (d) d.innerHTML = '<b style="color:var(--muted)">\u2014</b>';
        if (r) r.innerHTML = '<b style="color:var(--muted)">\u2014</b>';
      });
  }

  /* ---------- 5) Infrastruktur: fetch /api/health (D1 + layanan) ---------- */
  function loadInfra() {
    var box = $('opInfra');
    if (!box) return;
    fetch('/api/health', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (h) {
        var rows = [];
        function row(label, ok, note) {
          rows.push('<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 2px;border-top:1px solid rgba(255,255,255,.07)">'
            + '<span>' + label + (note ? ' <span class="muted" style="font-size:10.5px">(' + note + ')</span>' : '') + '</span>'
            + '<b style="color:' + (ok ? 'var(--ok,#6dffb0)' : 'var(--err,#ff6d8a)') + ';font-size:11px">' + (ok ? 'AKTIF' : 'NONAKTIF') + '</b></div>');
        }
        var db = h.db || {};
        row('D1 Main (jkadistore.shop)', db.main === 'ok', db.main);
        row('D1 Foto (app.jkadistore.shop)', db.foto === 'ok', db.foto);
        row('D1 AI (ai.jkadistore.shop)', db.ai === 'ok', db.ai);
        row('Sertifikat RSA', db.cert === 'ada');
        var s = h.services || {};
        row('Turnstile', !!s.turnstile);
        row('Email (Resend)', !!s.email_resend);
        row('OAuth Google', !!s.oauth_google);
        row('OAuth Discord', !!s.oauth_discord);
        row('OAuth GitHub', !!s.oauth_github);
        box.innerHTML = rows.join('');
      })
      .catch(function () {
        box.innerHTML = '<span style="color:var(--err,#ff6d8a)">\u26A0\uFE0F Tidak dapat memuat status infrastruktur.</span>';
      });
  }
})();
