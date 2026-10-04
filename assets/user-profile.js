/* ==================================================================
   JK ADISTORE — USER PROFILE MODULE (halaman profil mobile user)
   Baru: TIDAK mengubah app.js / owner-panel.js / tombol lama.
   Halaman: profile.html  (ungu gelap + putih + aksen kuning)
   Data  : localStorage jka_db_v3 (toko utama) + foto via
           app.jkadistore.shop (foto → URL) bila tersedia.
   ================================================================== */
(function () {
  'use strict';

  /* ---------- helper ---------- */
  function escU(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function toastU(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:999999;' +
      'background:#241848f2;color:#fff;font:600 12.5px system-ui,sans-serif;padding:9px 16px;' +
      'border-radius:999px;border:1px solid #FFD70088;box-shadow:0 6px 24px rgba(0,0,0,.45);max-width:88vw';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function getDB() { try { return JSON.parse(localStorage.getItem('jka_db_v3') || '{}'); } catch (e) { return {}; } }
  function setDB(d) { localStorage.setItem('jka_db_v3', JSON.stringify(d)); }
  function saveDB() { try { if (typeof save === 'function') save(); } catch (e) { } }

  function maskEmail(e) {
    e = String(e || '');
    var at = e.indexOf('@');
    if (at <= 1) return e;
    return e.slice(0, Math.min(4, at)) + '***' + e.slice(at);
  }
  function fmtRp(n) {
    n = Number(n || 0);
    return 'Rp ' + n.toLocaleString('id-ID');
  }
  function fmtJoin(iso) {
    try {
      var d = iso ? new Date(iso) : new Date();
      if (isNaN(d)) return 'Baru saja';
      return 'Sejak ' + d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch (e) { return '-'; }
  }
  function initials(name) {
    var p = String(name || 'U').trim().split(/\s+/);
    return ((p[0] || 'U')[0] + (p.length > 1 ? (p[1][0] || '') : '')).toUpperCase();
  }
  function avatarFallback(name, size) {
    try {
      var c = document.createElement('canvas');
      var s = size || 96;
      c.width = c.height = s;
      var x = c.getContext && c.getContext('2d');
      if (!x) return 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '"><rect width="100%" height="100%" fill="#3A2A7E"/><text x="50%" y="54%" text-anchor="middle" dy=".35em" fill="#FFD700" font-family="system-ui" font-weight="900" font-size="' + Math.floor(s / 2.6) + '">' + initials(name) + '</text></svg>'
      );
      x.fillStyle = '#3A2A7E';
      x.fillRect(0, 0, s, s);
      x.fillStyle = '#FFD700';
      x.font = '900 ' + Math.floor(s / 2.6) + 'px system-ui,sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(initials(name), s / 2, s / 2 + 2);
      return c.toDataURL('image/png');
    } catch (e) {
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" fill="#3A2A7E"/><text x="50%" y="54%" text-anchor="middle" dy=".35em" fill="#FFD700" font-family="system-ui" font-weight="900" font-size="36">U</text></svg>'
      );
    }
  }

  /* ---------- data user ---------- */
  function currentUser() {
    var d = getDB();
    var s = d.session;
    if (!s || !s.email) return null;
    // gabung dengan data user terdaftar (pass/poin/joined dsb.)
    var rec = (d.users || []).filter(function (u) { return (u.email || '').toLowerCase() === (s.email || '').toLowerCase(); })[0];
    return { session: s, rec: rec || { email: s.email, name: s.name || s.email, coins: s.coins || 0 } };
  }

  /* ---------- JEMBATAN OAuth (BARU - mencegah loop redirect) ----------
     Pengguna yang masuk lewat OAuth (Google/GitHub/Discord via /login) punya
     sesi SERVER (cookie) tetapi belum tentu punya sesi LOKAL (jka_db_v3).
     Bila sesi lokal kosong: tanya /api/auth/session -> bila valid, buatkan
     sesi lokal + data user minimal, lalu profil tetap bisa dibuka. */
  function tryServerSession() {
    return fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.success || !j.user || !j.user.email) throw new Error('tanpa user');
        var u = j.user;
        var d = getDB();
        var rec = (d.users || []).filter(function (x) { return (x.email || '').toLowerCase() === (u.email || '').toLowerCase(); })[0];
        if (!rec) {
          rec = { email: u.email, name: u.name || u.email, coins: Number(u.coins) || 0, wa: u.wa || '', avatar: u.avatar || '', joined: u.joined || new Date().toISOString(), id: u.id || ('srv_' + Date.now()), role: u.role || 'user', poin: Number(u.poin) || 0 };
          d.users = d.users || [];
          d.users.push(rec);
        } else {
          /* sinkronkan data server → lokal (saldo/poin/foto selalu ambil yang terbaru) */
          rec.name = rec.name || u.name || u.email;
          rec.wa = u.wa != null ? u.wa : (rec.wa || '');
          if (u.avatar) rec.avatar = u.avatar;
          if (u.joined) rec.joined = rec.joined || u.joined;
          if (u.poin != null && !rec.poin) rec.poin = Number(u.poin) || 0;
        }
        /* saldo: pertahankan yang paling besar (topup lokal vs server) */
        var coins = Math.max(Number(rec.coins) || 0, Number(u.coins) || 0);
        rec.coins = coins;
        d.session = { email: u.email, name: u.name || rec.name || u.email, coins: coins, id: rec.id, joined: rec.joined, avatar: rec.avatar || u.avatar || '', role: u.role || 'user' };
        setDB(d);
        return true;
      })
      .catch(function () { return false; });
  }

  /* ---------- render profil ---------- */
  var FOTO_UPLOAD_URL = 'https://app.jkadistore.shop'; // foto → URL (opsional)

  var _bridgeTried = false; // guard: cegah loop renderProfile <-> tryServerSession
  function renderProfile() {
    var cu = currentUser();
    if (!cu) { // coba jembatan OAuth dulu (BARU - cegah loop redirect)
      if (_bridgeTried) { location.replace('/login?next=%2Fprofile'); return; }
      _bridgeTried = true;
      tryServerSession().then(function (ok) {
        if (ok) renderProfile(); else location.replace('/login?next=%2Fprofile');
      });
      return;
    }
    var s = cu.session, rec = cu.rec;
    var orders = (getDB().orders || []).filter(function (o) { return (o.email || '').toLowerCase() === (s.email || '').toLowerCase(); });
    var purchases = orders.filter(function (o) { return o.type !== 'topup'; });
    var done = purchases.filter(function (o) { return /berhasil|selesai|sukses|lunas/i.test(String(o.status || '')); });
    var spent = purchases.reduce(function (a, o) { return a + (Number(o.price) || 0); }, 0);
    var poin = Number(rec.poin != null ? rec.poin : (rec.points != null ? rec.points : Math.floor(spent / 100)));
    var foto = rec.avatar || s.avatar || '';

    var html = ''
      /* --- KARTU PROFIL --- */
      + '<div class="up-card">'
      + '<div class="up-head">'
      + '<img id="upFoto" src="' + escU(foto || avatarFallback(s.name || s.email, 96)) + '" alt="foto">'
      + '<div class="up-id">'
      + '<b class="up-name">👤 ' + escU(s.name || rec.name || '-') + '</b>'
      + '<span class="up-status">🟢 Member Aktif · ' + escU(fmtJoin(rec.joined || rec.createdAt || s.joined)) + '</span>'
      + '</div></div>'

      /* --- DATA AKUN (baris kecil) --- */
      + '<div class="up-rows">'
      + upRow('📧 Email', escU(maskEmail(s.email)), '', '')
      + upRow('🔒 Sandi', '••••••••', '<button class="up-mini" onclick="upChangePass()">UBAH</button>', '')
      + upRow('📱 WhatsApp', escU(rec.wa || rec.phone || '— belum diisi'), '<button class="up-mini" onclick="upEditProfile()">ISI</button>', '')
      + upRow('💳 Saldo', '<b class="up-gold">' + fmtRp(s.coins != null ? s.coins : rec.coins) + '</b>', '<button class="up-mini up-gold-b" onclick="upGoTopup()">TOPUP</button>', '')
      + '<div class="up-pair">'
      + '<div class="up-pair-c"><span>📦 Pesanan</span><b>' + purchases.length + '</b></div>'
      + '<div class="up-pair-c"><span>✅ Selesai</span><b>' + done.length + '</b></div>'
      + '</div>'
      + upRow('💰 Total Belanja', fmtRp(spent), '', '')
      + upRow('⭐ Poin', '<b class="up-gold">' + poin + '</b>', '', '')
      + '</div>'

      /* --- TOMBOL AKSI --- */
      + '<div class="up-acts">'
      + '<button class="up-btn" onclick="upOrders()">📋 RIWAYAT PESANAN</button>'
      + '<button class="up-btn" onclick="upGoTopup()">💸 TOP UP SALDO</button>'
      + '</div>'
      + '<button class="up-btn up-wide" onclick="upEditProfile()">⚙️ EDIT PROFIL &amp; GANTI FOTO</button>'
      + '<button class="up-btn up-wide" onclick="upChangePass()">🔑 UBAH KATA SANDI</button>'
      + '<button class="up-btn up-wide up-red" onclick="upLogout()">🚪 KELUAR DARI AKUN</button>';

    html += '</div>'; /* tutup up-card */
    $('upBody').innerHTML = html;
  }

  function upRow(icon, label, btn, extra) {
    var name = String(icon);
    var val = String(label);
    var ic = name.split(' ').slice(0, 1).join(' ');
    var nm = name.split(' ').slice(1).join(' ');
    return '<div class="up-row' + (extra ? ' ' + extra : '') + '">'
      + '<span class="up-k">' + ic + ' <b>' + escU(nm) + '</b></span>'
      + '<span class="up-v">' + val + '</span>' + btn + '</div>';
  }

  /* ---------- modal kecil (di dalam profile.html) ---------- */
  function smallModal(title, bodyHTML, onOk, okLabel, danger, cancelLabel) {
    var wrap = document.createElement('div');
    wrap.className = 'up-modal';
    wrap.innerHTML = '<div class="up-modal-box">'
      + '<div class="up-modal-title">' + title + '</div>'
      + bodyHTML
      + '<div class="up-modal-acts">'
      + '<button class="up-btn" id="upMCancel">' + (cancelLabel || 'BATAL') + '</button>'
      + '<button class="up-btn ' + (danger ? 'up-red' : 'up-gold-b') + '" id="upMOk">' + (okLabel || 'SIMPAN') + '</button>'
      + '</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('#upMCancel').onclick = function () { wrap.remove(); };
    wrap.querySelector('#upMOk').onclick = function () { if (onOk(wrap)) wrap.remove(); };
    return wrap;
  }

  /* ---------- 1) RIWAYAT PESANAN ---------- */
  window.upOrders = function () {
    var cu = currentUser();
    var orders = (getDB().orders || []).filter(function (o) { return (o.email || '').toLowerCase() === (cu.session.email || '').toLowerCase(); });
    var rows = orders.length
      ? orders.slice(0, 20).map(function (o) {
        var ok = /berhasil|selesai|sukses|lunas/i.test(String(o.status || ''));
        return '<div class="up-ord"><span>' + escU(o.item) + '</span>'
          + '<b>' + fmtRp(o.price) + '</b>'
          + '<small>' + escU(o.time || '-') + ' · ' + (ok ? '<b style="color:#6dffb0">' + escU(o.status || 'Berhasil') + '</b>' : escU(o.status || 'Diproses')) + '</small></div>';
      }).join('')
      : '<div class="up-empty">Belum ada pesanan.</div>';
    smallModal('📋 Riwayat Pesanan', '<div class="up-list">' + rows + '</div>', function () { return true; }, 'TUTUP');
  };

  /* ---------- 2) EDIT PROFIL & GANTI FOTO ---------- */
  window.upEditProfile = function () {
    var cu = currentUser();
    var s = cu.session, rec = cu.rec;
    var body = '<div class="up-form">'
      + '<img id="upEditFoto" src="' + escU(rec.avatar || s.avatar || avatarFallback(s.name, 96)) + '" class="up-foto-edit">'
      + '<input type="file" id="upFotoFile" accept="image/*" class="up-input" style="display:none">'
      + '<div class="up-form-note">Ketuk foto untuk mengganti. Foto diunggah ke app.jkadistore.shop (Foto ke URL).</div>'
      + '<input class="up-input" id="upName" placeholder="Nama lengkap" value="' + escU(s.name || rec.name || '') + '" maxlength="40">'
      + '<input class="up-input" id="upWA" placeholder="No. WhatsApp (contoh: 08123456789)" value="' + escU(rec.wa || rec.phone || '') + '" inputmode="tel" maxlength="18">'
      + '</div>';
    smallModal('⚙️ Edit Profil & Ganti Foto', body, function (w) {
      var name = (w.querySelector('#upName') || {}).value || '';
      var wa = (w.querySelector('#upWA') || {}).value || '';
      if (!name.trim()) { toastU('Nama tidak boleh kosong.'); return false; }
      var btn = w.querySelector('#upMOk');
      if (btn) { btn.disabled = true; btn.textContent = 'MENYIMPAN…'; }
      var finish = function (avatarUrl) {
        fetch('/api/auth/profile', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), wa: wa.trim(), avatar: avatarUrl })
        }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
          if (res && res.success) {
            /* sinkron data lokal lalu render ulang */
            var d = getDB();
            var idx = (d.users || []).findIndex(function (u) { return (u.email || '').toLowerCase() === (s.email || '').toLowerCase(); });
            if (idx >= 0) {
              d.users[idx].name = name.trim();
              d.users[idx].wa = wa.trim();
              if (avatarUrl) d.users[idx].avatar = avatarUrl;
              d.users[idx].joined = d.users[idx].joined || new Date().toISOString();
            }
            if (d.session) { d.session.name = name.trim(); if (avatarUrl) d.session.avatar = avatarUrl; }
            setDB(d);
            saveDB();
            renderProfile();
            toastU('✅ Profil tersimpan');
            w.remove();
          } else {
            toastU('⚠️ ' + ((res && res.error) || 'Gagal menyimpan profil.'));
            if (btn) { btn.disabled = false; btn.textContent = 'SIMPAN'; }
          }
        }).catch(function () {
          toastU('⚠️ Gagal terhubung ke server.');
          if (btn) { btn.disabled = false; btn.textContent = 'SIMPAN'; }
        });
      };
      /* foto berubah? upload dulu ke layanan foto → URL */
      var img = w.querySelector('#upEditFoto');
      var file = w.querySelector('#upFotoFile');
      if (img && img.dataset.changed === '1' && file && file.files && file.files[0]) {
        toastU('⏳ Mengunggah foto…');
        uploadFoto(file.files[0]).then(finish).catch(function () {
          toastU('⚠️ Foto gagal diunggah — profil disimpan tanpa ganti foto.');
          finish(null);
        });
      } else {
        finish(null);
      }
      return false; /* modal ditutup manual setelah sukses */
    }, 'SIMPAN');
    // ganti foto: pilih file → upload ke app foto → simpan URL
    setTimeout(function () {
      var img = document.querySelector('.up-modal #upEditFoto');
      var file = document.querySelector('.up-modal #upFotoFile');
      if (img && file) {
        img.onclick = function () { file.click(); };
        file.onchange = function () {
          var f = file.files && file.files[0];
          if (!f) return;
          img.src = URL.createObjectURL(f);
          img.dataset.changed = '1';
        };
      }
    }, 30);
  };

  /* ---------- upload foto ke app foto (Foto ke URL) ---------- */
  function uploadFoto(file) {
    var fd = new FormData();
    fd.append('file', file);
    return fetch(FOTO_UPLOAD_URL + '/api/upload', {
      method: 'POST',
      body: fd
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var url = j && (j.url || j.data && j.data.url || j.link);
        if (!url) throw new Error('URL tidak diterima');
        return url;
      });
  }

  /* ---------- 3) UBAH KATA SANDI (server /api/auth/password) ----------
     Sandi diverifikasi & disimpan di server (PBKDF2). Setelah sukses:
     semua sesi perangkat dihapus → otomatis ke halaman login. */
  window.upChangePass = function () {
    var body = '<div class="up-form">'
      + '<input class="up-input" id="upOld" type="password" placeholder="Sandi Saat Ini" autocomplete="current-password">'
      + '<input class="up-input" id="upNew" type="password" placeholder="Sandi Baru (min. 6)" autocomplete="new-password">'
      + '<input class="up-input" id="upNew2" type="password" placeholder="Konfirmasi Sandi Baru" autocomplete="new-password">'
      + '</div>'
      + '<div class="up-form-note">Setelah disimpan, kamu keluar otomatis dari <b>semua perangkat</b> dan kembali ke halaman login.</div>';
    smallModal('🔑 Ubah Kata Sandi', body, function (w) {
      var old = (w.querySelector('#upOld') || {}).value || '';
      var nw = (w.querySelector('#upNew') || {}).value || '';
      var nw2 = (w.querySelector('#upNew2') || {}).value || '';
      if (!old) { toastU('⚠️ Sandi saat ini wajib diisi.'); return false; }
      if (nw.length < 6) { toastU('⚠️ Sandi baru minimal 6 karakter.'); return false; }
      if (nw !== nw2) { toastU('⚠️ Konfirmasi sandi tidak sama.'); return false; }
      var btn = w.querySelector('#upMOk');
      if (btn) { btn.disabled = true; btn.textContent = 'MENYIMPAN…'; }
      fetch('/api/auth/password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old: old, new: nw, confirm: nw2 })
      }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
        if (res && res.success) {
          toastU('✅ Sandi diganti — keluar dari semua perangkat…');
          setTimeout(function () { window.upLogout(true); }, 900);
        } else {
          toastU('⚠️ ' + ((res && res.error) || 'Gagal mengubah sandi.'));
          if (btn) { btn.disabled = false; btn.textContent = 'SIMPAN'; }
        }
      }).catch(function () {
        toastU('⚠️ Gagal terhubung ke server.');
        if (btn) { btn.disabled = false; btn.textContent = 'SIMPAN'; }
      });
      return false; /* modal ditutup manual setelah sukses */
    }, 'SIMPAN');
  };

  /* ---------- 2b) TOP UP SALDO (balik ke toko → buka modal topup) ---------- */
  window.upGoTopup = function () {
    try { localStorage.setItem('jk_open_topup', '1'); } catch (e) { }
    location.href = '/';
  };

  /* ---------- 4) KELUAR ---------- */
  window.upLogout = function (skipConfirm) {
    var go = function () {
      // hapus sesi lokal + cookie server → kembali ke halaman LOGIN
      try {
        var d = getDB();
        d.session = null;
        setDB(d);
        saveDB();
      } catch (e) { }
      fetch('/api/auth/logout', { method: 'GET', credentials: 'same-origin' }).catch(function () { });
      setTimeout(function () { location.replace('/login'); }, 250);
    };
    if (skipConfirm === true) { go(); }
    else {
      smallModal('Yakin ingin keluar?', '<div class="up-form-note">Sesi akan dihapus dan kamu kembali ke halaman login.</div>', go, 'YA', true, 'TIDAK');
    };
  };

  /* ---------- 5) tambah tombol "👤 Profil" di auth-bar (tanpa ubah tombol lama) ---------- */
  function findAuthBar() {
    // 1) cari link "Keluar" bawaan auth-bar → naik ke elemen bar-nya
    var out = document.querySelector('a[href="/api/auth/logout"]');
    if (out) {
      var b = out.parentElement;
      // naik sampai div level bar (parent yang fixed / bukan <a>)
      while (b && b !== document.body && b.tagName === 'A') b = b.parentElement;
      if (b && b !== document.body) return b;
    }
    // 2) fallback: div dengan style fixed di pojok kanan-bawah (2 format: dengan/tanpa spasi)
    var cands = document.querySelectorAll('div[style*="position:fixed;bottom:12px"], div[style*="position: fixed; bottom: 12px"], div[style*="position:fixed; bottom: 12px"], div[style*="position: fixed;bottom:12px"]');
    for (var i = 0; i < cands.length; i++) {
      if ((cands[i].textContent || '').indexOf('Keluar') >= 0) return cands[i];
    }
    return null;
  }
  function injectProfileLink() {
    if (document.getElementById('upBarLink')) return;
    var bar = findAuthBar();
    if (!bar) return;
    // pastikan user login (bar hanya ada bila login)
    var a = document.createElement('a');
    a.id = 'upBarLink';
    a.href = '/profile';
    a.textContent = '👤 Profil';
    a.style.cssText = 'color:#FFD700;text-decoration:none;font-weight:800;font-size:12px;white-space:nowrap';
    // sisip sebelum link "Keluar" agar urutan: Nama | 👤 Profil | Keluar
    var out = bar.querySelector('a[href="/api/auth/logout"]');
    if (out) bar.insertBefore(a, out); else bar.appendChild(a);
  }
  setInterval(injectProfileLink, 1500);
  setTimeout(injectProfileLink, 400);

  /* ---------- init ---------- */
  function boot() {
    // di halaman toko (index.html): bendera topup → buka modal topup bawaan
    if (document.body && document.getElementById('upBody')) {
      renderProfile();
      window.addEventListener('resize', debounce(renderProfile, 250));
      return;
    }
    // di index.html: jika pengguna menekan TOPUP dari profil → buka topup bawaan
    try {
      if (localStorage.getItem('jk_open_topup') === '1') {
        localStorage.removeItem('jk_open_topup');
        setTimeout(function () {
          try { openTopup(); } catch (e) {
            try {
              var b = document.querySelector('#userBtn');
              if (b) b.click();
            } catch (e2) { }
          }
        }, 700);
      }
    } catch (e) { }
  }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
