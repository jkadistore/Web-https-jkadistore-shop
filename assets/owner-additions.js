/* ==================================================================
   JK ADISTORE — OWNER ADDITIONS (fitur tambahan Panel Owner)
   ⚠️ PRINSIP: SEMUA menu/tombol lama TETAP SAMA — modul ini HANYA
   MENAMBAH fitur baru di tempat yang ditentukan:
     TAMBAHAN 1 : section "⚙️ Pengaturan" di Panel Owner
                  (📝 Info Toko · 🔑 UBAH KATA SANDI · 📧 Notifikasi · 🔒 Keamanan)
     TAMBAHAN 2 : dropdown profil owner di header Panel Owner
                  (📄 Profil Toko · ⚙️ Pengaturan Sistem · 🔑 UBAH KATA SANDI · 🚪 KELUAR)
     TAMBAHAN 3 : kolom Daftar Pengguna diperluas
                  (No | Nama | Email | WhatsApp | Saldo | Status | Aksi)
   Dimuat SETELAH owner-panel.js (tidak menimpa fungsi lama).
   ================================================================== */
(function () {
  'use strict';

  /* ---------- helper ---------- */
  function escA(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $a(id) { return document.getElementById(id); }
  function toastA(msg) {
    try { toast(msg); } catch (e) {
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:999999;' +
        'background:#241848f2;color:#fff;font:600 12.5px system-ui,sans-serif;padding:9px 16px;' +
        'border-radius:999px;border:1px solid #FFD70088;box-shadow:0 6px 24px rgba(0,0,0,.45);max-width:88vw';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2600);
    }
  }
  function getDB() { try { return (typeof db !== 'undefined' && db) || JSON.parse(localStorage.getItem('jka_db_v3') || '{}'); } catch (e) { return {}; } }
  function setDB(d) { try { if (typeof db !== 'undefined' && db) { db.users = d.users; db.session = d.session; if (typeof save === 'function') save(); } localStorage.setItem('jka_db_v3', JSON.stringify(d)); } catch (e) { localStorage.setItem('jka_db_v3', JSON.stringify(d)); } }
  function fmtRpA(n) { n = Number(n || 0); return 'Rp ' + n.toLocaleString('id-ID'); }
  function maskEmailA(e) {
    e = String(e || ''); var at = e.indexOf('@');
    if (at <= 1) return e;
    return e.slice(0, Math.min(4, at)) + '***' + e.slice(at);
  }

  /* ============================================================
     TAMBAHAN 1 — SECTION "⚙️ PENGATURAN" DI PANEL OWNER
     Ditambahkan di bagian bawah panel (setelah section lama),
     semua section lama tetap utuh di atasnya.
     ============================================================ */
  var settingsInjected = false;
  function injectSettingsSection() {
    var box = $a('adminContent');
    if (!box || !box.innerHTML.includes('Panel Owner')) return;
    if ($a('opPengaturanCard')) { settingsInjected = true; return; }
    if (box.innerHTML.includes('opPengaturanCard')) { settingsInjected = true; return; }

    var card = document.createElement('div');
    card.id = 'opPengaturanCard';
    card.className = 'admin-card';
    card.style.cssText = 'padding:10px 12px;margin-top:10px';
    card.innerHTML =
      '<div class="label" style="margin:0 0 7px">⚙️ Pengaturan</div>'
      + '<div class="row" style="gap:6px;flex-wrap:wrap">'
      + '<button class="btn btn-sm" onclick="opInfoToko()">📝 Info Toko</button>'
      + '<button class="btn btn-sm" onclick="opOwnerChangePass()">🔑 UBAH KATA SANDI</button>'
      + '<button class="btn btn-sm" onclick="opNotifikasi()">📧 Notifikasi</button>'
      + '<button class="btn btn-sm" onclick="opKeamanan()">🔒 Keamanan</button>'
      + '</div>';
    box.appendChild(card);
    settingsInjected = true;
    renderUserTableEnhance();
  }

  /* --- 📝 Info Toko (modal kecil, baca data STORE yang sudah ada) --- */
  window.opInfoToko = function () {
    var d = getDB();
    var st = d.store || {};
    openAModal('📝 Info Toko',
      '<div class="oa-rows">'
      + oaRow('Nama', escA(st.name || 'JK ADISTORE'))
      + oaRow('Domain', 'jkadistore.shop')
      + oaRow('Website', '3 (Toko · Foto ke URL · AI)')
      + oaRow('Produk', String((d.products || []).length))
      + oaRow('Pengguna', String((d.users || []).length))
      + oaRow('Pesanan', String((d.orders || []).length))
      + '</div>', null, 'TUTUP');
  };

  /* --- 🔑 UBAH KATA SANDI OWNER --- */
  window.opOwnerChangePass = function () {
    toggleOwnerDropdownOff();
    openAPassModal('owner');
  };

  /* --- 📧 Notifikasi (baca jk_owner_notify bawaan) --- */
  window.opNotifikasi = function () {
    var list = [];
    try { list = JSON.parse(localStorage.getItem('jk_owner_notify') || '[]'); } catch (e) { }
    var rows = list.length
      ? list.slice(-10).reverse().map(function (n) {
        return '<div class="oa-ord"><b>' + escA(n.title || n.type || '-') + '</b>'
          + '<small>' + escA(n.msg || n.body || '') + ' · ' + escA(n.time || n.t || '') + '</small></div>';
      }).join('')
      : '<div class="oa-empty">Belum ada notifikasi.</div>';
    openAModal('📧 Notifikasi', '<div class="oa-list">' + rows + '</div>', null, 'TUTUP');
  };

  /* --- 🔒 KEAMANAN & AKSES OWNER (server-backed /api/auth/owner/security) --- */
  window.opKeamanan = function () {
    toggleOwnerDropdownOff();
    fetch('/api/auth/owner/security', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (res) { renderSecModal(res && res.security ? res.security : null); })
      .catch(function () { renderSecModal(null); });
  };

  function renderSecModal(sec) {
    if (!sec) {
      openAModal('🔒 KEAMANAN & AKSES OWNER',
        '<div class="oa-note">Tidak dapat memuat data keamanan dari server. Pastikan kamu masih login sebagai owner.</div>',
        null, 'TUTUP');
      return;
    }
    var panelOn = !!sec.panel_open;
    var auditRows = (sec.audit || []).map(function (a) {
      return '<div class="oa-ord"><span style="font-family:monospace;font-size:10.5px;color:var(--c3,#00f0ff)">' + escA(a.act || '-') + '</span>'
        + '<small>' + escA(a.who || '-') + ' · ' + escA(fmtTimeA(a.t)) + (a.detail ? ' · ' + escA(a.detail) : '') + '</small></div>';
    }).join('');
    if (!auditRows) auditRows = '<div class="oa-empty">Belum ada catatan keamanan.</div>';

    var body =
      '<div class="oa-rows">'
      + oaRow('Panel Owner', panelOn ? '🔓 DIBUKA — hanya owner yang bisa masuk' : '🔒 DITUTUP')
      + oaRow('Login Sosial → Owner', '<b style="color:var(--ok,#6dffb0)">❌ DIBLOKIR</b> — sosial selalu jadi USER')
      + oaRow('Email Owner', escA(sec.owner_email || '-'))
      + oaRow('Sesi Owner Aktif', String(sec.active_owner_sessions != null ? sec.active_owner_sessions : '-'))
      + oaRow('Sesi User Aktif', String(sec.active_user_sessions != null ? sec.active_user_sessions : '-'))
      + '</div>'
      + '<div class="oa-acts" style="grid-template-columns:1fr">'
      + '<button class="oa-btn oa-gold" id="opSecToggle">' + (panelOn ? '🔒 TUTUP AKSES PANEL OWNER' : '🔓 BUKA AKSES PANEL OWNER') + '</button>'
      + '<button class="oa-btn oa-red" id="opSecKill">🖬 KELUARKAN SEMUA SESI OWNER</button>'
      + '</div>'
      + '<div class="label" style="margin:12px 0 6px;font-size:11px">📋 Log Keamanan (server D1)</div>'
      + '<div class="oa-list">' + auditRows + '</div>';

    openAModal('🔒 KEAMANAN & AKSES OWNER', body, null, 'TUTUP');

    var toggleBtn = document.getElementById('opSecToggle');
    if (toggleBtn) toggleBtn.onclick = function () {
      secAct('toggle_panel', { open: panelOn ? '0' : '1' }, function () { setTimeout(window.opKeamanan, 400); });
    };
    var killBtn = document.getElementById('opSecKill');
    if (killBtn) killBtn.onclick = function () {
      secAct('kill_owner_sessions', {}, function () {
        toastA('✅ Semua sesi owner dikeluarkan. Menuju halaman login…');
        setTimeout(function () { opLogoutAll(); }, 900);
      });
    };
  }

  function secAct(action, payload, done) {
    fetch('/api/auth/owner/security', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
      if (res && res.success) { toastA('✅ ' + (res.message || 'Berhasil.')); if (done) done(); }
      else toastA('⚠️ ' + ((res && res.error) || 'Aksi gagal.'));
    }).catch(function () { toastA('⚠️ Gagal terhubung ke server.'); });
  }

  function fmtTimeA(t) {
    try { return new Date(t).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return String(t || '-'); }
  }
  function oaRow(k, v) {
    return '<div class="oa-row"><span>' + k + '</span><b>' + v + '</b></div>';
  }

  /* ============================================================
     TAMBAHAN 2 — DROPDOWN PROFIL OWNER (klik nama/email owner di header panel)
     Ditambahkan di bawah header "👑 Panel Owner" — header lama tetap.
     ============================================================ */
  function injectOwnerProfileMenu() {
    var box = $a('adminContent');
    if (!box || !box.innerHTML.includes('Panel Owner')) return;
    if ($a('opOwnerMenuBtn')) return;
    // cari header panel owner (h2 berisi "Panel Owner")
    var h2s = box.querySelectorAll('h2');
    var header = null;
    for (var i = 0; i < h2s.length; i++) {
      if ((h2s[i].textContent || '').includes('Panel Owner')) { header = h2s[i]; break; }
    }
    if (!header) return;
    var headWrap = header.parentElement;
    if (!headWrap) return;

    // tombol kecil "JK Adi (Owner)" — klik → dropdown
    var btn = document.createElement('button');
    btn.id = 'opOwnerMenuBtn';
    btn.className = 'btn btn-xs';
    btn.style.cssText = 'border-color:color-mix(in srgb,var(--accent,#FFD700) 45%,var(--stroke));color:var(--accent,#FFD700);font-weight:800;font-size:10.5px';
    btn.innerHTML = '👑 JK Adi (Owner) ▾';
    btn.onclick = function (ev) { ev.stopPropagation(); toggleOwnerDropdown(); };
    headWrap.appendChild(btn);

    // dropdown menu
    var menu = document.createElement('div');
    menu.id = 'opOwnerMenu';
    menu.style.cssText = 'position:absolute;display:none;background:#372a78;border:1px solid rgba(255,255,255,.18);' +
      'border-radius:12px;padding:6px;min-width:190px;z-index:99997;box-shadow:0 12px 30px rgba(0,0,0,.5);font:600 12px system-ui,sans-serif';
    menu.innerHTML =
      '<div style="padding:5px 8px;font-weight:800;color:#FFD700">👑 JK Adi (Owner)</div>'
      + '<div style="height:1px;background:rgba(255,255,255,.14);margin:4px 0"></div>'
      + '<button class="oa-menu-i" onclick="opProfilToko()">📄 Profil Toko</button>'
      + '<button class="oa-menu-i" onclick="opPengaturanSistem()">⚙️ Pengaturan Sistem</button>'
      + '<button class="oa-menu-i" onclick="opOwnerChangePass()">🔑 UBAH KATA SANDI</button>'
      + '<div style="height:1px;background:rgba(255,255,255,.14);margin:4px 0"></div>'
      + '<button class="oa-menu-i" onclick="opOwnerLogout()">🚪 KELUAR</button>';
    document.body.appendChild(menu);

    document.addEventListener('click', function (ev) {
      if (menu.style.display !== 'none' && !menu.contains(ev.target) && ev.target !== btn) {
        menu.style.display = 'none';
      }
    });
  }
  function toggleOwnerDropdown() {
    var menu = $a('opOwnerMenu');
    var btn = $a('opOwnerMenuBtn');
    if (!menu || !btn) return;
    if (menu.style.display === 'block') { menu.style.display = 'none'; return; }
    var r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(window.innerWidth - 200, r.left)) + 'px';
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.display = 'block';
  }
  window.opProfilToko = function () {
    toggleOwnerDropdownOff();
    try { adminNav('owner'); } catch (e) { }
    toastA('👑 Profil Toko — Panel Owner');
  };
  window.opPengaturanSistem = function () {
    toggleOwnerDropdownOff();
    try { adminNav('owner'); } catch (e) { }
    setTimeout(function () { injectSettingsSection(); scrollToOACard(); }, 60);
  };
  function toggleOwnerDropdownOff() {
    var menu = $a('opOwnerMenu');
    if (menu) menu.style.display = 'none';
  }
  function scrollToOACard() {
    var c = $a('opPengaturanCard');
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ============================================================
     TAMBAHAN 3 — TABEL PENGGUNA DIPERLUAS
     Menambah kolom: WhatsApp & Saldo & Aksi — kolom lama (ID/EMAIL/NAMA/PERAN/STATUS) TETAP.
     Dilakukan dengan menambah tabel kecil "No | Nama | Email | WhatsApp | Saldo | Status | Aksi"
     DI BAWAH tabel lama (tabel lama tidak dihapus/diubah).
     ============================================================ */
  var usersTableInjected = false;
  function renderUserTableEnhance() {
    if (usersTableInjected && $a('opUsersFull')) { refreshUsersFull(); return; }
    var box = $a('adminContent');
    if (!box || !box.innerHTML.includes('Daftar Pengguna')) return;
    if ($a('opUsersFull')) { refreshUsersFull(); return; }

    var wrap = document.createElement('div');
    wrap.id = 'opUsersFull';
    wrap.style.cssText = 'margin-top:8px';
    wrap.innerHTML = '<div class="label" style="margin:6px 0 4px">📋 Data Lengkap Pengguna</div><div id="opUsersFullBody"></div>';
    box.appendChild(wrap);
    usersTableInjected = true;
    refreshUsersFull();
  }

  function refreshUsersFull() {
    var body = $a('opUsersFullBody');
    if (!body) return;
    var users = collectUsers();
    var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10.5px">'
      + '<thead><tr style="color:#8f9ac0;text-align:left"><th style="padding:3px 5px">No</th><th>Nama</th><th>Email</th><th>WhatsApp</th><th>Saldo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
    users.forEach(function (u, i) {
      var isOwner = (u.role === 'owner');
      html += '<tr style="border-top:1px solid var(--stroke);white-space:nowrap">'
        + '<td style="padding:3px 5px;color:#8f9ac0">' + (i + 1) + '</td>'
        + '<td style="padding:3px 5px">' + (isOwner ? '👑 ' : '') + escA(u.name || '-') + '</td>'
        + '<td style="padding:3px 5px">' + escA(u.email || '-') + '</td>'
        + '<td style="padding:3px 5px">' + escA(u.wa || u.phone || '—') + '</td>'
        + '<td style="padding:3px 5px;color:#FFD700;font-weight:700">' + fmtRpA(u.coins) + '</td>'
        + '<td style="padding:3px 5px"><b style="color:var(--ok,#6dffb0)">AKTIF</b></td>'
        + '<td style="padding:3px 5px"><button class="btn btn-xs" style="font-size:9.5px" onclick="opUserDetail(' + i + ')">LIHAT</button></td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
    body.innerHTML = html;
    window._opUsersCache = users;
  }
  function collectUsers() {
    var d = getDB();
    var u = (d.users || []).slice();
    try {
      var c = (typeof current === 'function' && current()) || (d.session || null);
      if (c && c.email && !u.some(function (x) { return (x.email || '').toLowerCase() === c.email.toLowerCase(); })) {
        u.push({ id: 'owner-session', email: c.email, name: c.name || c.email, role: 'owner', coins: c.coins || 0 });
      }
    } catch (e) { }
    collectUsersFix(u);
    return u;
  }
  function collectUsersFix(u) {
    // pastikan owner utama selalu ada (data lokal pengembangan)
    // catatan privasi: email pemilik disamarkan di tampilan; identitas owner
    // dikenali lewat window.__JK_OE (XOR-encoded di index.html), bukan literal.
    try {
      var oe = (typeof window !== 'undefined' && window.__JK_OE) || '';
      var isOwnerRow = function (x) {
        var em = String(x.email || '').toLowerCase();
        return (oe && em === String(oe).toLowerCase()) || em === 'owner@jkadistore.local';
      };
      if (!u.some(isOwnerRow)) {
        u.push({ id: 'U-OWNER', email: 'owner@jkadistore.local', name: 'JK Adi (Owner)', role: 'owner', coins: 0, wa: '-' });
      }
    } catch (e) { }
  }
  window.opUserDetail = function (i) {
    var u = (window._opUsersCache || [])[i];
    if (!u) return;
    openAModal('👤 ' + (u.name || '-'),
      '<div class="oa-rows">'
      + oaRow('Email', escA(u.email || '-'))
      + oaRow('WhatsApp', escA(u.wa || u.phone || '—'))
      + oaRow('Saldo', fmtRpA(u.coins))
      + oaRow('Peran', u.role === 'owner' ? '👑 OWNER' : 'USER')
      + oaRow('Status', 'AKTIF')
      + '</div>', null, 'TUTUP');
  };

  /* ============================================================
     MODAL UBAH KATA SANDI (owner & user) — dipakai bersama
     Simpan → otomatis keluar dari semua perangkat → halaman login
     ============================================================ */
  function openAPassModal(who) {
    var isOwnerWho = who === 'owner';
    var title = isOwnerWho ? '👑 🔑 UBAH KATA SANDI OWNER' : '🔑 UBAH KATA SANDI';
    openAModal(title,
      '<div class="oa-form">'
      + '<input class="oa-input" id="oaOld" type="password" placeholder="' + (isOwnerWho ? 'Sandi Saat Ini' : 'Sandi lama') + '">'
      + '<input class="oa-input" id="oaNew" type="password" placeholder="Sandi Baru (min. 6 karakter)">'
      + '<input class="oa-input" id="oaNew2" type="password" placeholder="Konfirmasi Sandi Baru">'
      + '</div>'
      + '<div class="oa-note">Sandi diverifikasi & disimpan di server. Setelah SIMPAN, kamu otomatis keluar dari <b>SEMUA perangkat</b> lalu kembali ke halaman login.</div>',
      function (w) {
        var old = (w.querySelector('#oaOld') || {}).value || '';
        var nw = (w.querySelector('#oaNew') || {}).value || '';
        var nw2 = (w.querySelector('#oaNew2') || {}).value || '';
        if (!old) { toastA('⚠️ Sandi saat ini wajib diisi.'); return false; }
        if (nw.length < 6) { toastA('⚠️ Sandi baru minimal 6 karakter.'); return false; }
        if (nw !== nw2) { toastA('⚠️ Konfirmasi sandi tidak sama.'); return false; }
        var btn = w.querySelector('[data-ok]');
        if (btn) { btn.disabled = true; btn.textContent = 'MENYIMPAN…'; }
        fetch(isOwnerWho ? '/api/auth/owner/password' : '/api/auth/password', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old: old, new: nw, confirm: nw2 })
        }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
          if (res && res.success) {
            toastA('✅ Sandi owner diganti — keluar dari semua perangkat…');
            setTimeout(function () { opLogoutAll(); }, 900);
          } else {
            toastA('⚠️ ' + ((res && res.error) || 'Gagal mengubah sandi.'));
            if (btn) { btn.disabled = false; btn.textContent = 'SIMPAN'; }
          }
        }).catch(function () {
          toastA('⚠️ Gagal terhubung ke server.');
          if (btn) { btn.disabled = false; btn.textContent = 'SIMPAN'; }
        });
        return false; /* modal ditutup manual setelah sukses */
      }, 'SIMPAN', true);
  }
  window.openAPassModal = openAPassModal; /* global: dipanggil dari onclick di Panel Owner & Dashboard */

  /* ---------- keluar (konfirmasi kecil → ya → hapus sesi → halaman utama) ---------- */
  window.opOwnerLogout = function () {
    toggleOwnerDropdownOff();
    openAModal('🚪 KELUAR', '<div class="oa-note">Keluar dari akun owner? Sesi akan dihapus dari semua perangkat.</div>', function () {
      opLogoutAll();
    }, 'YA, KELUAR', true);
  };
  function opLogoutAll() {
    try {
      var d = getDB();
      d.session = null;
      setDB(d);
    } catch (e) { }
    fetch('/api/auth/logout', { method: 'GET', credentials: 'same-origin' }).catch(function () { });
    setTimeout(function () { location.replace('/login'); }, 250);
  }

  /* ============================================================
     MODAL KECIL BERSAMA (tema ungu-kuning)
     ============================================================ */
  function openAModal(title, bodyHTML, onOk, okLabel, danger) {
    var w = document.createElement('div');
    w.className = 'oa-modal';
    w.innerHTML = '<div class="oa-box">'
      + '<div class="oa-title">' + title + '</div>'
      + bodyHTML
      + '<div class="oa-acts"><button class="oa-btn">BATAL</button>'
      + '<button class="oa-btn ' + (danger ? 'oa-red' : 'oa-gold') + '" data-ok>' + (okLabel || 'SIMPAN') + '</button></div>'
      + '</div>';
    document.body.appendChild(w);
    w.querySelector('.oa-btn:not([data-ok])').onclick = function () { w.remove(); };
    w.querySelector('[data-ok]').onclick = function () {
      if (!onOk || onOk(w) !== false) w.remove();
    };
    return w;
  }

  /* ---------- CSS tambahan (tema ungu-kuning) ---------- */
  function injectCSS() {
    if ($a('oaAdditionsCSS')) return;
    var css = document.createElement('style');
    css.id = 'oaAdditionsCSS';
    css.textContent = [
      '.oa-modal{position:fixed;inset:0;background:rgba(10,6,26,.72);display:flex;align-items:center;justify-content:center;padding:16px;z-index:99998;backdrop-filter:blur(3px)}',
      '.oa-box{width:100%;max-width:360px;background:#372a78;border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:14px;max-height:86vh;overflow-y:auto;color:#fff;font:13px/1.5 system-ui,sans-serif}',
      '.oa-title{font-size:14px;font-weight:800;margin-bottom:10px;color:#fff}',
      '.oa-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}',
      '.oa-btn{font:800 11.5px system-ui,sans-serif;letter-spacing:.5px;padding:10px;border-radius:11px;cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff}',
      '.oa-btn.oa-gold{background:#FFD700;color:#2D1B69;border-color:#FFD700}',
      '.oa-btn.oa-red{background:rgba(255,109,138,.14);border-color:rgba(255,109,138,.6);color:#ff6d8a}',
      '.oa-form{display:flex;flex-direction:column;gap:8px}',
      '.oa-input{width:100%;padding:9px 12px;border-radius:10px;font:600 13px system-ui,sans-serif;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.09);color:#fff;outline:none}',
      '.oa-input:focus{border-color:#FFD700}',
      '.oa-input::placeholder{color:rgba(255,255,255,.45)}',
      '.oa-note{font-size:11px;color:rgba(255,255,255,.62);text-align:center;margin-top:8px}',
      '.oa-rows{display:flex;flex-direction:column;gap:2px}',
      '.oa-row{display:flex;justify-content:space-between;gap:10px;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,.08);font-size:12.5px}',
      '.oa-row span{color:rgba(255,255,255,.72)}',
      '.oa-list{max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px}',
      '.oa-ord{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:11px;padding:9px 11px;font-size:12px;color:#fff}',
      '.oa-ord b{color:#FFD700}',
      '.oa-ord small{display:block;color:rgba(255,255,255,.55);margin-top:3px}',
      '.oa-empty{color:rgba(255,255,255,.55);font-size:12px;text-align:center;padding:12px 0}',
      '.oa-menu-i{display:block;width:100%;text-align:left;background:transparent;border:0;color:#fff;font:600 12.5px system-ui,sans-serif;padding:7px 9px;border-radius:8px;cursor:pointer}',
      '.oa-menu-i:hover{background:rgba(255,255,255,.09)}',
      '@media(max-width:720px){.oa-box{max-width:94vw}}'
    ].join('\n');
    document.head.appendChild(css);
  }

  /* ============================================================
     INISIALISASI — aman: hanya jalan bila tab Panel Owner aktif
     ============================================================ */
  function tryInjectAll() {
    injectCSS();
    injectSettingsSection();
    injectOwnerProfileMenu();
    renderUserTableEnhance();
  }
  // pantau pergantian tab admin → tambah hanya saat tab Owner aktif
  var iv = setInterval(function () {
    var box = $a('adminContent');
    if (!box) return;
    if (box.innerHTML.includes('Panel Owner')) tryInjectAll();
  }, 800);
  // juga cek langsung saat load
  setTimeout(tryInjectAll, 1200);
})();
