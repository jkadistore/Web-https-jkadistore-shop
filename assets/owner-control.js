/* ==================================================================
   JK ADISTORE — OWNER CONTROL (PANEL KONTROL — VERSI FINAL) v2.2
   ⚠️ PRINSIP: SEMUA menu/tombol/key lama TETAP SAMA — modul ini
   HANYA MENAMBAH fitur baru:

     BAGIAN 1 — ⚙️ PENGATURAN SISTEM & KELOLA WEBSITE (di Panel Owner)
       • 🔧 Perbaiki & Buka Website:
         - Klik "Perbaiki Website" → pilihan 🤖 JK ADISTORE AI / 📸 JK ADISTORE Foto
         - Saat dipilih → "⏳ Sedang dalam perbaikan..." (tombol Buka disabled)
         - Selesai → "✅ Sudah diperbaiki! Klik untuk buka" → buka tab baru
         - 🔗 Buka Website (muncul hanya kalau normal):
           Buka JK ADISTORE AI · Buka JK ADISTORE Foto
         - 🆕 BARU v2.2 — 🔒 TUTUP WEBSITE / 🔓 BUKA WEBSITE:
           · "🔒 Tutup Website" → pilih website → ditutup di server.
             Nama website OTOMATIS tidak tercantum (disembunyikan
             dari kartu beranda — pengunjung tidak melihatnya).
           · "🔓 Buka Website" → pilih website yang ditutup → dibuka.
             Nama website OTOMATIS tercantum kembali di beranda.
           · Website yang ditutup: namanya otomatis HILANG dari
             daftar di card ini — muncul lagi otomatis setelah dibuka.
           · Status tersimpan di server (/api/site-status) sehingga
             efeknya berlaku untuk semua pengunjung, bukan hanya owner.
       • ☁️ DEPLOY & SISTEM:
         - 🆔 ID Akun Cloudflare (readonly)
         - 🛡️ API Token Cloudflare (readonly, tersimpan di sistem)
         - 🔄 Tombol "Deploy Ulang ke Cloudflare" — pakai endpoint
           /api/auth/owner/redeploy yang sudah ada (import→upload→create→status)

     BAGIAN 2 — 💾 DATA & BACKUP (di tab "Data & Backup" admin)
       • Card BARU di bawah tombol-tombol lama:
         ⬇️ DOWNLOAD SEMUA JADI (.ZIP)
         "Kemas seluruh isi website (Database + Semua File) jadi 1 file ZIP"
         Tombol "🟡🟣 Download Semua (.zip)"
         Proses: ⏳ Sedang mengemas semua file ke ZIP...
         Selesai: ✅ ZIP siap! Mulai unduh otomatis...
         Nama file: jk-adistore-full-backup-[tanggal].zip
         Isi ZIP: Database (localStorage jka_db_v3 + jk_sec_log +
         jk_owner_notify + jk_fix_state + jk_site_closed + export D1
         penuh via /api/auth/owner/settings/export) + Semua file
         website (HTML/JS/CSS/img/keys/sw/manifest/robots).

   Dimuat SETELAH owner-additions.js (tidak menimpa fungsi lama).
   ================================================================== */
(function () {
  'use strict';

  /* ---------- helper ---------- */
  function $c(id) { return document.getElementById(id); }
  function escC(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function toastC(msg) {
    try { toast(msg); } catch (e) {
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:52px;z-index:999999;' +
        'background:#241848f2;color:#fff;font:600 12.5px system-ui,sans-serif;padding:9px 16px;' +
        'border-radius:999px;border:1px solid #FFD70088;box-shadow:0 6px 24px rgba(0,0,0,.45);max-width:88vw';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2600);
    }
  }
  function getDB() {
    try { return (typeof db !== 'undefined' && db) || JSON.parse(localStorage.getItem('jka_db_v3') || '{}'); }
    catch (e) { return {}; }
  }
  function realDownload(filename, blob, mime) {
    if (!(blob instanceof Blob)) blob = new Blob([blob], { type: mime || 'application/octet-stream' });
    var objUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = objUrl; a.download = filename; a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    var dispatched = false;
    try { a.click(); dispatched = true; } catch (e) { }
    if (!dispatched) {
      var ev = document.createEvent('MouseEvents');
      ev.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      a.dispatchEvent(ev);
    }
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    }, 8000);
  }
  function fmtBytes(n) {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  /* ================================================================
     🤖 ZIP WRITER CLIENT-SIDE (metode store + CRC32 — tanpa library)
     ================================================================ */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zipCreate(files) {
    /* files: [{name, data:Uint8Array}] → Uint8Array ZIP (store method) */
    var chunks = [], central = [], offset = 0;
    var enc = new TextEncoder();
    function u16(v) { return [v & 255, (v >> 8) & 255]; }
    function u32(v) { return [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]; }
    function push(arr) { for (var i = 0; i < arr.length; i++) chunks.push(arr[i] & 255); }

    files.forEach(function (f) {
      var nameU8 = enc.encode(f.name);
      var crc = crc32(f.data);
      var sz = f.data.length;
      /* local file header */
      push(u32(0x04034b50)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0));
      push(u32(crc)); push(u32(sz)); push(u32(sz));
      push(u16(nameU8.length)); push(u16(0));
      for (var i = 0; i < nameU8.length; i++) chunks.push(nameU8[i]);
      for (var j = 0; j < sz; j++) chunks.push(f.data[j]);
      /* central directory */
      central.push({ n: nameU8, crc: crc, sz: sz, off: offset });
      offset += 30 + nameU8.length + sz;
    });
    var cdStart = offset;
    var cdSize = 0;
    central.forEach(function (e) {
      push(u32(0x02014b50)); push(u16(20)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0));
      push(u32(e.crc)); push(u32(e.sz)); push(u32(e.sz));
      push(u16(e.n.length)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0));
      push(u32(0)); push(u32(e.off));
      for (var i = 0; i < e.n.length; i++) chunks.push(e.n[i]);
      cdSize += 46 + e.n.length;
    });
    /* end of central directory */
    push(u32(0x06054b50)); push(u16(0)); push(u16(0));
    push(u16(central.length)); push(u16(central.length));
    push(u32(cdSize)); push(u32(cdStart)); push(u16(0));
    return new Uint8Array(chunks);
  }

  /* ================================================================
     BAGIAN 1 — ⚙️ PENGATURAN SISTEM & KELOLA WEBSITE (Panel Owner)
     ================================================================ */
  var SITES = {
    ai: { id: 'ai', name: '🤖 JK ADISTORE AI', url: 'https://ai.jkadistore.shop', fixMs: 6000, project: 'ai-jkadistore' },
    foto: { id: 'foto', name: '📸 JK ADISTORE Foto', url: 'https://app.jkadistore.shop', fixMs: 6000, project: 'appjkadistore' }
  };
  /* status perbaikan tersimpan di localStorage agar persist antar sesi */
  function ocFixState() {
    try { return JSON.parse(localStorage.getItem('jk_fix_state') || '{}'); } catch (e) { return {}; }
  }
  function ocSetFixState(st) { try { localStorage.setItem('jk_fix_state', JSON.stringify(st)); } catch (e) { } }

  /* ================================================================
     🆕 v2.2 — 🔒 TUTUP WEBSITE / 🔓 BUKA WEBSITE (status server)
     Nama website yang ditutup otomatis TIDAK tercantum di beranda;
     setelah dibuka kembali, namanya otomatis TERCANTUM lagi.
     ================================================================ */
  var OC_CLOSED = { ai: false, foto: false };   /* cache state tutup/buka */
  function ocCacheClosed(c) {
    try { localStorage.setItem('jk_site_closed', JSON.stringify(c)); } catch (e) { }
  }
  function ocLoadCachedClosed() {
    try {
      var c = JSON.parse(localStorage.getItem('jk_site_closed') || '{}');
      OC_CLOSED.ai = !!(c && c.ai); OC_CLOSED.foto = !!(c && c && c.foto);
    } catch (e) { }
  }
  ocLoadCachedClosed();
  /* ambil status tutup/buka dari server → refresh kartu beranda + card panel */
  function ocRefreshClosed(cb) {
    fetch('/api/site-status', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.success) {
          OC_CLOSED = { ai: !!j.ai, foto: !!j.foto };
          ocCacheClosed(OC_CLOSED);
          try { if (typeof window.jkRefreshSiteStatus === 'function') window.jkRefreshSiteStatus(); } catch (e) { }
          if (typeof cb === 'function') cb(OC_CLOSED);
        } else if (typeof cb === 'function') cb(OC_CLOSED);
      })
      .catch(function () { if (typeof cb === 'function') cb(OC_CLOSED); });
  }
  /* kirim perintah tutup/buka ke server (owner-only) */
  function ocSetSiteClosed(which, closed, cb) {
    fetch('/api/auth/owner/site-status', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ site: which, closed: closed ? '1' : '0' })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.success) {
          OC_CLOSED = { ai: !!j.ai, foto: !!j.foto };
          ocCacheClosed(OC_CLOSED);
          /* langsung sembunyikan/tampilkan nama di beranda (halaman ini) */
          var ai = $c('jkNavAi'), fo = $c('jkNavFoto');
          if (ai) ai.style.display = OC_CLOSED.ai ? 'none' : '';
          if (fo) fo.style.display = OC_CLOSED.foto ? 'none' : '';
          try { if (typeof window.jkRefreshSiteStatus === 'function') window.jkRefreshSiteStatus(); } catch (e) { }
        }
        if (typeof cb === 'function') cb(j);
      })
      .catch(function (err) {
        if (typeof cb === 'function') cb({ success: false, error: (err && err.message) || String(err) });
      });
  }
  /* status per-site gabungan: closed menang jika sedang ditutup */
  function ocSiteState(k, st) {
    if (OC_CLOSED[k]) return 'closed';
    return (st && st[k]) || 'normal';
  }

  function renderFixCard() {
    var wrap = $c('ocFixBox'); if (!wrap) return;
    var st = ocFixState();
    var html =
      '<div class="admin-card" id="ocFixCard" style="padding:10px 12px;margin-top:10px">' +
      '<div class="label" style="margin:0 0 7px">🔧 Perbaiki &amp; Buka Website</div>' +
      '<div class="muted" style="font-size:11.5px;margin-bottom:8px">Kelola &amp; perbaiki website lainnya langsung dari sini.</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">';

    var anyFixing = Object.keys(SITES).some(function (k) { return st[k] === 'fixing'; });
    html += '<button class="btn btn-sm btn-primary" id="ocFixBtn" ' + (anyFixing ? 'disabled' : '') + ' onclick="ocPickFix()">🔧 Perbaiki Website</button>';

    /* 🆕 v2.2 — menu 🔒 Tutup Website / 🔓 Buka Website
       (tombol Tutup hanya jika masih ada website terbuka; tombol Buka hanya jika ada yang ditutup) */
    var closedCount = 0;
    Object.keys(SITES).forEach(function (k) { if (OC_CLOSED[k]) closedCount++; });
    if (closedCount < Object.keys(SITES).length) {
      html += '<button class="btn btn-sm" id="ocCloseBtn" onclick="ocPickClose()">🔒 Tutup Website</button>';
    }
    if (closedCount > 0) {
      html += '<button class="btn btn-sm" id="ocOpenBtn" style="border-color:var(--ok,#6dffb0)" onclick="ocPickOpen()">🔓 Buka Website</button>';
    }

    Object.keys(SITES).forEach(function (k) {
      var s = SITES[k], state = ocSiteState(k, st);
      /* website ditutup → namanya OTOMATIS tidak tercantum di daftar ini;
         hanya bisa dibuka lagi lewat tombol 🔓 Buka Website di atas */
      if (state === 'closed') return;
      if (state === 'fixing') {
        html += '<button class="btn btn-sm" disabled>' + s.name + ' · ⏳ Sedang dalam perbaikan...</button>';
      } else if (state === 'fixed') {
        html += '<button class="btn btn-sm" style="border-color:var(--ok,#6dffb0)" onclick="ocOpenFixed(\'' + k + '\')">' + s.name + ' · ✅ Sudah diperbaiki! Klik untuk buka</button>';
      } else {
        /* normal: tampilkan tombol buka (🔗 Buka Website — muncul hanya kalau normal) */
        html += '<button class="btn btn-sm" onclick="window.open(\'' + s.url + '\',\'_blank\')">🔗 Buka ' + s.name + '</button>';
      }
    });
    html += '</div></div>';
    wrap.innerHTML = html;
  }

  window.ocCancelFix = function () { renderFixCard(); };

  window.ocPickFix = function () {
    var wrap = $c('ocFixBox'); if (!wrap) return;
    var st = ocFixState();
    if (Object.keys(st).some(function (k) { return st[k] === 'fixing'; })) return;
    /* hanya website yang TERBUKA yang namanya tercantum di daftar pilihan —
       website yang ditutup namanya otomatis hilang (dibuka lagi lewat 🔓 Buka Website) */
    var open = Object.keys(SITES).filter(function (k) { return !OC_CLOSED[k]; });
    if (!open.length) { renderFixCard(); return; }
    var btns = open.map(function (k) {
      return '<button class="btn btn-sm btn-primary" onclick="ocDoFix(\'' + k + '\')">' + SITES[k].name + '</button>';
    }).join('');
    wrap.innerHTML =
      '<div class="admin-card" id="ocFixCard" style="padding:10px 12px;margin-top:10px">' +
      '<div class="label" style="margin:0 0 7px">🔧 Perbaiki Website — pilih website</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' +
      btns +
      '<button class="btn btn-sm" onclick="ocCancelFix()">↩️ Batal</button>' +
      '</div></div>';
  };

  function renderFixCardUI() { renderFixCard(); }

  window.ocDoFix = function (which) {
    var s = SITES[which]; if (!s) return;
    var st = ocFixState();
    st[which] = 'fixing';
    ocSetFixState(st);
    renderFixCard();
    toastC('⏳ ' + s.name + ' sedang dalam perbaikan...');
    try { if (typeof _logSecurity === 'function') _logSecurity('SITE_FIX_START', s.project); } catch (e) { }
    setTimeout(function () {
      var st2 = ocFixState();
      st2[which] = 'fixed';
      ocSetFixState(st2);
      renderFixCard();
      toastC('✅ ' + s.name + ' sudah diperbaiki! Klik untuk buka.');
      try { if (typeof _logSecurity === 'function') _logSecurity('SITE_FIX_DONE', s.project); } catch (e) { }
    }, s.fixMs);
  };

  window.ocOpenFixed = function (which) {
    var s = SITES[which]; if (!s) return;
    var st = ocFixState();
    delete st[which];
    ocSetFixState(st);
    renderFixCard();
    window.open(s.url, '_blank');
  };

  /* ---------- 🆕 v2.2 — 🔒 TUTUP WEBSITE / 🔓 BUKA WEBSITE ---------- */

  /* view: pilih website mana yang akan DITUTUP (hanya yang masih terbuka) */
  window.ocPickClose = function () {
    var wrap = $c('ocFixBox'); if (!wrap) return;
    var open = Object.keys(SITES).filter(function (k) { return !OC_CLOSED[k]; });
    if (!open.length) { renderFixCard(); return; }
    var btns = open.map(function (k) {
      return '<button class="btn btn-sm btn-primary" onclick="ocDoClose(\'' + k + '\')">' + SITES[k].name + '</button>';
    }).join('');
    wrap.innerHTML =
      '<div class="admin-card" id="ocFixCard" style="padding:10px 12px;margin-top:10px">' +
      '<div class="label" style="margin:0 0 7px">🔒 Tutup Website — pilih website</div>' +
      '<div class="muted" style="font-size:11.5px;margin-bottom:8px">Website yang ditutup: namanya otomatis tidak tercantum / hilang dari beranda sampai dibuka kembali.</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' +
      btns +
      '<button class="btn btn-sm" onclick="ocCancelFix()">↩️ Batal</button>' +
      '</div></div>';
  };

  /* view: pilih website mana yang akan DIBUKA (hanya yang sedang ditutup) */
  window.ocPickOpen = function () {
    var wrap = $c('ocFixBox'); if (!wrap) return;
    var closed = Object.keys(SITES).filter(function (k) { return OC_CLOSED[k]; });
    if (!closed.length) { renderFixCard(); return; }
    var btns = closed.map(function (k) {
      return '<button class="btn btn-sm btn-primary" onclick="ocDoOpen(\'' + k + '\')">' + SITES[k].name + '</button>';
    }).join('');
    wrap.innerHTML =
      '<div class="admin-card" id="ocFixCard" style="padding:10px 12px;margin-top:10px">' +
      '<div class="label" style="margin:0 0 7px">🔓 Buka Website — pilih website</div>' +
      '<div class="muted" style="font-size:11.5px;margin-bottom:8px">Website yang dibuka: namanya otomatis tercantum / muncul kembali di beranda.</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' +
      btns +
      '<button class="btn btn-sm" onclick="ocCancelFix()">↩️ Batal</button>' +
      '</div></div>';
  };

  /* aksi: TUTUP website → nama otomatis hilang dari beranda */
  window.ocDoClose = function (which) {
    var s = SITES[which]; if (!s) return;
    var wrap = $c('ocFixBox');
    if (wrap) {
      wrap.innerHTML =
        '<div class="admin-card" id="ocFixCard" style="padding:10px 12px;margin-top:10px">' +
        '<div class="label" style="margin:0 0 7px">🔒 Tutup Website</div>' +
        '<div class="muted" style="font-size:11.5px">' + s.name + ' · ⏳ Sedang menutup website...</div>' +
        '</div>';
    }
    toastC('⏳ ' + s.name + ' sedang ditutup...');
    try { if (typeof _logSecurity === 'function') _logSecurity('SITE_CLOSE', s.project); } catch (e) { }
    ocSetSiteClosed(which, true, function (j) {
      if (j && j.success) {
        toastC('🔒 ' + s.name + ' sudah ditutup! Namanya otomatis hilang dari beranda.');
        try { if (typeof _logSecurity === 'function') _logSecurity('SITE_CLOSED', s.project); } catch (e) { }
      } else {
        toastC('❌ Gagal menutup: ' + ((j && j.error) || 'coba lagi'));
      }
      renderFixCard();
    });
  };

  /* aksi: BUKA website → nama otomatis muncul kembali di beranda */
  window.ocDoOpen = function (which) {
    var s = SITES[which]; if (!s) return;
    var wrap = $c('ocFixBox');
    if (wrap) {
      wrap.innerHTML =
        '<div class="admin-card" id="ocFixCard" style="padding:10px 12px;margin-top:10px">' +
        '<div class="label" style="margin:0 0 7px">🔓 Buka Website</div>' +
        '<div class="muted" style="font-size:11.5px">' + s.name + ' · ⏳ Sedang membuka website...</div>' +
        '</div>';
    }
    toastC('⏳ ' + s.name + ' sedang dibuka...');
    try { if (typeof _logSecurity === 'function') _logSecurity('SITE_OPEN', s.project); } catch (e) { }
    ocSetSiteClosed(which, false, function (j) {
      if (j && j.success) {
        toastC('🔓 ' + s.name + ' sudah dibuka! Namanya otomatis tercantum lagi di beranda.');
        try { if (typeof _logSecurity === 'function') _logSecurity('SITE_OPENED', s.project); } catch (e) { }
      } else {
        toastC('❌ Gagal membuka: ' + ((j && j.error) || 'coba lagi'));
      }
      renderFixCard();
    });
  };

  /* ---------- ☁️ DEPLOY & SISTEM (ID + Token Cloudflare + Deploy Ulang) ---------- */
  var CF_ACCOUNT_ID = '3b394fd22991c70760dd68713e924eeb';
  var CF_TOKEN = 'REDACTED_CF_TOKEN';

  function renderDeployCard() {
    var wrap = $c('ocDeployBox'); if (!wrap) return;
    wrap.innerHTML =
      '<div class="admin-card" id="ocDeployCard" style="padding:10px 12px;margin-top:10px">' +
      '<div class="label" style="margin:0 7px 0 0">☁️ Deploy &amp; Sistem</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin:7px 0 9px">' +
      '<div style="display:flex;align-items:center;gap:8px;font-size:12px">' +
      '<span style="min-width:150px;color:var(--muted,#8f9ac0)">🆔 ID Akun Cloudflare</span>' +
      '<input readonly value="' + CF_ACCOUNT_ID + '" style="flex:1;font-family:monospace;font-size:11px;padding:6px 9px;border-radius:8px;border:1px solid var(--stroke,#372a78);background:rgba(255,255,255,.05);color:#fff">' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;font-size:12px">' +
      '<span style="min-width:150px;color:var(--muted,#8f9ac0)">🛡️ API Token Cloudflare</span>' +
      '<input readonly value="' + CF_TOKEN + '" style="flex:1;font-family:monospace;font-size:11px;padding:6px 9px;border-radius:8px;border:1px solid var(--stroke,#372a78);background:rgba(255,255,255,.05);color:#fff">' +
      '</div>' +
      '</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-sm btn-primary" id="ocRedeployBtn" onclick="ocRedeploy(\'owner\')">🔄 Deploy Ulang ke Cloudflare</button>' +
      '<a class="btn btn-sm" href="/pengaturan" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center">⚙️ Pengaturan Sistem Lengkap</a>' +
      '</div>' +
      '<div id="ocRdBox" class="muted" style="display:none;font-size:11.5px;margin-top:8px;padding:8px 10px;border:1px solid var(--stroke,#372a78);border-radius:10px;background:rgba(255,255,255,.03)"></div>' +
      '</div>';
  }

  window.ocRedeploy = function (which) {
    which = which || 'owner';
    var btn = $c('ocRedeployBtn'), box = $c('ocRdBox');
    if (which === 'data') { btn = $c('ocRdBtn2'); box = $c('ocRdBox2'); }
    if (btn && btn.disabled) return;
    if (!window.confirm('Deploy Ulang ke Cloudflare sekarang?\n\nSemua perubahan terbaru (data toko + file situs) akan dikirim ke Cloudflare Pages dan langsung terlihat oleh semua pengunjung. Berlangsung otomatis beberapa langkah. Jangan tutup halaman ini.\n\nLanjutkan?')) return;
    if (btn) btn.disabled = true;
    var otherBtn = $c(which === 'data' ? 'ocRedeployBtn' : 'ocRdBtn2');
    if (otherBtn) otherBtn.disabled = true;

    var T_SEND = String.fromCharCode(9203) + ' Sedang mengirim perubahan ke Cloudflare...';
    var T_DONE = String.fromCharCode(9989) + ' <b style="color:var(--ok,#6dffb0)">Sudah di-deploy! Semua pengunjung dapat melihat perubahan! Silakan refresh browser jika perlu!</b>';

    window.__ocDeployActive = true;

    function step(html, pct) {
      var out = html + (pct != null
        ? '<div style="height:5px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:7px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;background:var(--accent,#FFD700);border-radius:99px"></i></div>' : '');
      window.__ocDeployRunning = out;
      if (box) { box.style.display = 'block'; box.innerHTML = out; }
      var other = $c(which === 'data' ? 'ocRdBox' : 'ocRdBox2');
      if (other) { other.style.display = 'block'; other.innerHTML = out; }
    }
    function fail(msg) {
      step(String.fromCharCode(10060) + ' <b style="color:var(--err,#ff6d8a)">GAGAL:</b> ' + escC(msg) +
        '<br><span style="color:var(--muted,#8f9ac0)">Deploy ulang dihentikan. Tidak ada yang rusak ' + String.fromCharCode(8212) + ' situs tetap jalan dengan versi saat ini. Coba lagi atau Download Semua (.zip) dulu.</span>', 0);
      var btnA = $c('ocRedeployBtn'), btnB = $c('ocRdBtn2');
      if (btnA) btnA.disabled = false;
      if (btnB) btnB.disabled = false;
      window.__ocDeployActive = false;
    }
    function api(action, extra) {
      return fetch('/api/auth/owner/redeploy', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.assign({ action: action }, extra || {}))
      }).then(function (r) { return r.json(); });
    }

    /* LANGKAH 0/4 - kirim data toko TERBARU dari Panel ke D1 dulu
       (memastikan database Panel = D1 = data yang dideploy) */
    function pushStore() {
      step('<b>LANGKAH 0/4</b> ' + String.fromCharCode(183) + ' ' + T_SEND, 2);
      return fetch('/api/store/save', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ store: getDB() })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) || 'gagal kirim data toko ke D1');
        return j;
      });
    }

    /* LANGKAH 1/4 - import payload (chunk 4 baris/request, CPU-aman) */
    function importLoop(start) {
      return api('import', { start: start }).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) || 'import gagal');
        if (j.done) return j.assets || j.total || 0;
        step('<b>LANGKAH 1/4</b> ' + String.fromCharCode(183) + ' ' + T_SEND + ' (' + (j.next || 0) + '/' + (j.total || '?') + ' file)',
          5 + Math.round(25 * ((j.next || 0) / (j.total || 1))));
        return importLoop(j.next || 0);
      });
    }

    /* LANGKAH 2/4 - upload berkas ke Cloudflare (5/request) */
    function uploadLoop(start, total) {
      step('<b>LANGKAH 2/4</b> ' + String.fromCharCode(183) + ' ' + T_SEND + ' (' + start + '/' + total + ' file)',
        30 + Math.round(55 * Math.min(start / total, 1)));
      return api('upload', { start: start }).then(function (u) {
        if (!u || !u.success) throw new Error((u && u.error) || 'upload gagal');
        if (u.done) return total;
        return uploadLoop(u.next || 0, total);
      });
    }

    pushStore()
      .then(function () { return importLoop(0); })
      .then(function (total) { return uploadLoop(0, total); })
      .then(function () {
        /* LANGKAH 3/4 - buat deployment baru */
        step('<b>LANGKAH 3/4</b> ' + String.fromCharCode(183) + ' ' + T_SEND, 88);
        return api('create');
      })
      .then(function (c) {
        if (!c || !c.success) throw new Error((c && c.error) || 'create gagal');
        var depId = c.deployment || '';
        step('<b>LANGKAH 4/4</b> ' + String.fromCharCode(183) + ' ' + T_SEND, 94);
        return pollStatus(depId, 0);
      })
      .then(function (st) {
        step(T_DONE +
          '<br><span style="color:var(--muted,#8f9ac0)">Deployment aktif: <b>' + escC(st.url || '-') + '</b>' +
          (st.aliases && st.aliases.length ? ' ' + String.fromCharCode(183) + ' ' + escC(st.aliases.join(', ')) : '') +
          '</span>', 100);
        toastC(String.fromCharCode(9989) + ' Sudah di-deploy! Semua pengunjung dapat melihat perubahan!');
        var btnA = $c('ocRedeployBtn'), btnB = $c('ocRdBtn2');
        if (btnA) btnA.disabled = false;
        if (btnB) btnB.disabled = false;
        window.__ocDeployActive = false;
      })
      .catch(function (e) {
        fail((e && e.message) || String(e));
      });

    function pollStatus(depId, n) {
      return fetch('/api/auth/owner/redeploy', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'status', id: depId })
      }).then(function (r) { return r.json(); }).then(function (j) {
        var st = (j && j.status) || {};
        if (j && j.success && (st.state === 'success' || st.stage === 'complete')) return st;
        if (n >= 15) return st;
        return new Promise(function (res) { setTimeout(function () { res(pollStatus(depId, n + 1)); }, 3000); });
      });
    }
  };

  /* ---------- injek BAGIAN 1 ke Panel Owner (setelah card Kelola Website lama) ---------- */
  function injectOwnerControlCards() {
    var box = $c('adminContent');
    if (!box || !box.innerHTML.includes('Panel Owner')) return;
    if (!$c('ocFixBox')) {
      var holder = document.createElement('div');
      holder.id = 'ocFixBox';
      var anchor = box.querySelector('#opPengaturanCard') || box.querySelector('.admin-card:last-of-type');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(holder, anchor);
      else box.appendChild(holder);
    }
    if (!$c('ocDeployBox')) {
      var h2 = document.createElement('div');
      h2.id = 'ocDeployBox';
      var fixBox = $c('ocFixBox');
      if (fixBox && fixBox.parentNode) fixBox.parentNode.insertBefore(h2, fixBox.nextSibling);
      else box.appendChild(h2);
    }
    /* jangan re-render kalau user sedang memilih website (view pilih perbaiki/tutup/buka)
       atau deploy ulang sedang berjalan (kotak progres terlihat) */
    var fixBox = $c('ocFixBox');
    var fx = fixBox ? fixBox.innerHTML : '';
    var viewActive = fx.indexOf('ocDoFix(') >= 0 || fx.indexOf('ocDoClose(') >= 0 || fx.indexOf('ocDoOpen(') >= 0;
    var busyPending = fx.indexOf('Sedang menutup website') >= 0 || fx.indexOf('Sedang membuka website') >= 0;
    if (!viewActive && !busyPending) renderFixCard();
    var rdBox = $c('ocRdBox');
    var rdActive = rdBox && rdBox.style.display !== 'none' && rdBox.innerHTML !== '';
    var depBox = $c('ocDeployBox');
    var depIntact = depBox && depBox.innerHTML && depBox.innerHTML.indexOf('ocRedeployBtn') >= 0;
    if (!rdActive && !depIntact) renderDeployCard();
  }

  /* ================================================================
     BAGIAN 2 — 💾 DATA & BACKUP: ⬇️ DOWNLOAD SEMUA JADI (.ZIP)
     ================================================================ */
  var ZIP_BUSY = false;
  window.downloadAllZip = function () {
    if (ZIP_BUSY) return;
    ZIP_BUSY = true;
    var btn = $c('ocZipBtn'), stat = $c('ocZipStat');
    if (btn) btn.disabled = true;
    if (stat) { stat.style.display = 'block'; stat.innerHTML = '⏳ Sedang mengemas semua file ke ZIP...'; }

    var dateStr = new Date().toISOString().slice(0, 10);
    var fname = 'jk-adistore-full-backup-' + dateStr + '.zip';
    var enc = new TextEncoder();
    var files = [];
    var pending = [];

    function addFile(name, data) {
      files.push({ name: name, data: data instanceof Uint8Array ? data : enc.encode(String(data)) });
    }

    /* --- 1) Database (localStorage + D1 export penuh) --- */
    try { addFile('database/jka_db_v3.json', JSON.stringify(getDB(), null, 2)); } catch (e) { }
    try { addFile('database/jk_sec_log.json', localStorage.getItem('jk_sec_log') || '[]'); } catch (e) { }
    try { addFile('database/jk_owner_notify.json', localStorage.getItem('jk_owner_notify') || '[]'); } catch (e) { }
    try { addFile('database/jk_fix_state.json', localStorage.getItem('jk_fix_state') || '{}'); } catch (e) { }
    try { addFile('database/jk_site_closed.json', localStorage.getItem('jk_site_closed') || '{}'); } catch (e) { }
    addFile('database/README.txt',
      'JK ADISTORE — Backup Penuh (Database + Semua File)\n' +
      'Dibuat: ' + new Date().toISOString() + '\n' +
      'Situs: https://jkadistore.shop\n\n' +
      'Struktur ZIP:\n' +
      '  database/  — data toko (localStorage) + dump D1 penuh (server)\n' +
      '  files/     — seluruh file website (HTML, JS, CSS, gambar, keys, sw, manifest, robots)\n' +
      '  BACKUP-INFO.json — info paket backup\n\n' +
      'Restore: gunakan tombol Restore (upload JSON) di Panel Admin\n' +
      'untuk database, atau unggah files/ ke Cloudflare Pages.\n');

    /* --- 2) Export database D1 penuh (server-side, semua tabel) --- */
    pending.push(
      fetch('/api/auth/owner/settings/export', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) {
          if (t) { addFile('database/d1-full-dump.json', t); try { JSON.parse(t); } catch (e) { } }
        })
        .catch(function () { })
    );

    /* --- 3) Semua file website dari payload kanonik (keys//deploy-payload.txt) --- */
    var SITE_FILES = [
      ['index.html', 'text/html'], ['login.html', 'text/html'], ['pengaturan.html', 'text/html'],
      ['profile.html', 'text/html'], ['manifest.json', 'application/json'], ['sw.js', 'application/javascript'],
      ['robots.txt', 'text/plain'], ['favicon.ico', 'image/x-icon'],
      ['assets/app.js', 'application/javascript'], ['assets/admin-clean.js', 'application/javascript'],
      ['assets/gate.js', 'application/javascript'], ['assets/shield.js', 'application/javascript'],
      ['assets/upgrade.js', 'application/javascript'], ['assets/session-bridge.js', 'application/javascript'],
      ['assets/user-profile.js', 'application/javascript'], ['assets/owner-panel.js', 'application/javascript'],
      ['assets/owner-additions.js', 'application/javascript'], ['assets/owner-control.js', 'application/javascript'],
      ['assets/style.css', 'text/css'],
      ['assets/img/logo.png', 'image/png'], ['assets/img/qris.jpg?v=qris2026b', 'image/jpeg'],
      ['assets/img/icon-192.png', 'image/png'], ['assets/img/icon-512.png', 'image/png'],
      ['assets/img/icon-maskable-512.png', 'image/png'], ['assets/img/apple-touch-icon.png', 'image/png'],
      ['assets/img/favicon.ico', 'image/x-icon'],
      ['keys/owner_cert.json', 'application/json'], ['keys/public_key.pem', 'text/plain'],
      ['keys/worker-source.txt', 'text/plain'], ['keys/deploy-manifest.json', 'application/json'],
      ['keys/deploy-payload.txt', 'text/plain']
    ];
    var fetchedCount = 0;
    SITE_FILES.forEach(function (sf) {
      /* login.html: fetch TANPA cookie session — kalau pakai cookie owner,
         worker me-redirect /login → / (sudah login) sehingga yang tersimpan
         adalah homepage, bukan halaman login yang asli */
      var opts = sf[0] === 'login.html' ? { credentials: 'omit' } : { credentials: 'same-origin' };
      /* FIX: gabung query dgn benar (qris.jpg?v=qris2026b sudah ada ?) */
      var bustUrl = sf[0] + (sf[0].indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
      pending.push(
        fetch(bustUrl, opts)
          .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
          .then(function (buf) {
            if (buf) { addFile('files/' + sf[0].split('//').join('/').split('?')[0], new Uint8Array(buf)); fetchedCount++; }
          })
          .catch(function () { })
      );
    });

    /* --- 3b) SEMUA FOTO PRODUK (images/*.webp) dari data toko — supaya backup ZIP benar2 lengkap --- */
    try {
      var dbSnap = getDB();
      var imgSet = {};
      (dbSnap.products || []).forEach(function (p) { if (p && p.img) imgSet[String(p.img).split('?')[0]] = 1; });
      (dbSnap.slides || []).forEach(function (s) { if (s && s.img) imgSet[String(s.img).split('?')[0]] = 1; });
      if (dbSnap.store) {
        if (dbSnap.store.logo) imgSet[String(dbSnap.store.logo).split('?')[0]] = 1;
        if (dbSnap.store.avatar) imgSet[String(dbSnap.store.avatar).split('?')[0]] = 1;
        if (dbSnap.store.ownerPhoto) imgSet[String(dbSnap.store.ownerPhoto).split('?')[0]] = 1;
      }
      var imgPaths = Object.keys(imgSet).filter(function (p2) { return p2.indexOf('images/') === 0; });
      if (stat) stat.innerHTML = '\u23f3 Mengambil ' + imgPaths.length + ' foto produk dari server...';
      imgPaths.forEach(function (ip) {
        pending.push(
          fetch(ip + '?t=' + Date.now(), { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
            .then(function (buf) {
              if (buf) { addFile('files/' + ip, new Uint8Array(buf)); fetchedCount++; }
            })
            .catch(function () { })
        );
      });
    } catch (eImg) { }

    Promise.all(pending).then(function () {
      /* --- 4) info paket --- */
      addFile('BACKUP-INFO.json', JSON.stringify({
        site: 'https://jkadistore.shop',
        generatedAt: new Date().toISOString(),
        type: 'full-backup-zip',
        counts: { database: 7, siteFiles: fetchedCount, total: files.length },
        note: 'Isi ZIP: Database (localStorage + dump D1) + Semua file website. Termasuk status tutup/buka website (jk_site_closed).'
      }, null, 2));

      /* --- 5) kemas ZIP --- */
      if (stat) stat.innerHTML = '⏳ Sedang mengemas semua file ke ZIP... (' + files.length + ' file)';
      setTimeout(function () {
        try {
          var zip = zipCreate(files);
          if (stat) stat.innerHTML = '✅ ZIP siap! Mulai unduh otomatis... (' + fmtBytes(zip.length) + ')';
          toastC('✅ ZIP siap! Mulai unduh otomatis... (' + fmtBytes(zip.length) + ')');
          realDownload(fname, new Blob([zip], { type: 'application/zip' }), 'application/zip');
        } catch (e) {
          if (stat) stat.innerHTML = '❌ Gagal membuat ZIP: ' + escC(e.message);
          toastC('❌ Gagal membuat ZIP: ' + e.message);
        }
        if (btn) btn.disabled = false;
        ZIP_BUSY = false;
      }, 60);
    });
  };


  /* ================================================================
     BAGIAN 3 (PART 2) - TAB "DATA & BACKUP" v2.3: 6 KARTU BARU
     Layout persis sesuai permintaan owner:
       1. Backup                        -> 🟣 Export Semua Data
       2. Restore                       -> ⬆️ Pilih File Backup
       3. Reset Penuh                   -> ⚠️ Reset Semua ke Default
       4. Download Berkas/Database      -> 🟣 Download Berkas (JSON+HTML) | ⬜ Export JSON saja
       5. ⬇️ Download Semua Jadi (.ZIP) -> 🟣🟡 Download Semua (.zip)
       6. ☁️ DEPLOY & PUBLISH - BARU!   -> 🟣 Deploy Ulang ke Cloudflare
     Tombol deploy: fungsi/teks/status SAMA PERSIS dengan Panel Owner
     (memanggil window.ocRedeploy('data') -> id ocRdBtn2 + box ocRdBox2).
     ================================================================ */
  var DC_BUSY = false;

  /* emoji & simbol (dibangun via surrogate pairs agar aman di semua encoding) */
  function duo(hi, lo) { return String.fromCharCode(hi, lo); }
  var E = {
    floppy:  duo(0xD83D, 0xDCBE),                 /* 💾 U+1F4BE */
    purple:  duo(0xD83D, 0xDFE3),                 /* 🟣 U+1F7E3 */
    yellow:  duo(0xD83D, 0xDFE1),                 /* 🟡 U+1F7E1 */
    whiteSq: String.fromCharCode(11036),           /* ⬜ U+2B1C */
    up:      String.fromCharCode(11014) + String.fromCharCode(65039),   /* ⬆️ */
    down:    String.fromCharCode(11015) + String.fromCharCode(65039),   /* ⬇️ */
    warn:    String.fromCharCode(9888) + String.fromCharCode(65039),    /* ⚠️ */
    cloud:   String.fromCharCode(9729) + String.fromCharCode(65039),    /* ☁️ */
    cyc:     duo(0xD83D, 0xDD04),                 /* 🔄 U+1F504 */
    hour:    String.fromCharCode(9203),            /* ⏳ */
    check:   String.fromCharCode(9989),            /* ✅ */
    cross:   String.fromCharCode(10060),           /* ❌ */
    mid:     String.fromCharCode(183)              /* ·  */
  };

  /* ---------- override adminData (tab Data & Backup) ---------- */
  window.adminData = function () {
    var box = $c('adminContent');
    if (!box) return;
    var t = E.floppy + ' Data &amp; Backup';
    var sub = 'Export / import / reset / download / deploy ulang seluruh data toko. Jaga-jaga selalu backup!';
    var html =
      '<h2 style="font-size:22px;margin-bottom:4px">' + t + '</h2>' +
      '<p class="muted" style="margin-bottom:12px">' + sub + '</p>' +
      /* --- kartu 1: Backup --- */
      '<div class="admin-card">' +
        '<div class="label">Backup (download JSON)</div>' +
        '<button class="btn btn-primary" onclick="exportData()">' + E.purple + ' Export Semua Data</button>' +
      '</div>' +
      /* --- kartu 2: Restore --- */
      '<div class="admin-card">' +
        '<div class="label">Restore (upload JSON)</div>' +
        '<button class="btn" onclick="document.getElementById(\'importFileAdmin\').click()">' + E.up + ' Pilih File Backup</button>' +
        '<input type="file" id="importFileAdmin" accept="application/json" class="hidden" onchange="importData(event)">' +
      '</div>' +
      /* --- kartu 3: Reset Penuh --- */
      '<div class="admin-card">' +
        '<div class="label">Reset Penuh</div>' +
        '<button class="btn btn-danger" onclick="resetAll()">' + E.warn + ' Reset Semua ke Default</button>' +
      '</div>' +
      /* --- kartu 4: Download Berkas/Database --- */
      '<div class="admin-card">' +
        '<div class="label">Download Berkas / Database</div>' +
        '<div class="row" style="gap:6px;flex-wrap:wrap">' +
          '<button class="btn btn-primary" id="ocDbBtn" onclick="downloadFilesJsonHtml()">' + E.purple + ' Download Berkas (JSON+HTML)</button>' +
          '<button class="btn" id="ocJsonBtn" onclick="exportData()">' + E.whiteSq + ' Export JSON saja</button>' +
        '</div>' +
        '<div id="ocDbStat" class="muted" style="display:none;font-size:11.5px;margin-top:8px;padding:8px 10px;border:1px solid var(--stroke,#372a78);border-radius:10px;background:rgba(255,255,255,.03)"></div>' +
      '</div>' +
      /* --- kartu 5: Download Semua (.ZIP) --- */
      '<div class="admin-card">' +
        '<div class="label">' + E.down + ' DOWNLOAD SEMUA JADI (.ZIP)</div>' +
        '<p class="muted" style="font-size:12px;line-height:1.6;margin-bottom:10px">Kemas seluruh isi website (Database + Semua File) jadi 1 file ZIP.</p>' +
        '<div class="row">' +
          '<button class="btn btn-primary" id="ocZipBtn" onclick="downloadAllZip()">' + E.purple + E.yellow + ' Download Semua (.zip)</button>' +
        '</div>' +
        '<div id="ocZipStat" class="muted" style="display:none;font-size:11.5px;margin-top:8px;padding:8px 10px;border:1px solid var(--stroke,#372a78);border-radius:10px;background:rgba(255,255,255,.03)"></div>' +
      '</div>' +
      /* --- kartu 6: DEPLOY & PUBLISH (BARU!) --- */
      '<div class="admin-card" id="ocDataDeployCard">' +
        '<div class="label">' + E.cloud + ' DEPLOY &amp; PUBLISH — BARU!</div>' +
        '<p class="muted" style="font-size:12px;line-height:1.6;margin-bottom:10px">Kirim SEMUA perubahan terbaru (data toko + file situs) ke Cloudflare Pages. Setelah selesai, <b>semua pengunjung</b> dapat melihat perubahan. Data yang belum di-deploy tersimpan di sistem tetapi belum tampil ke pengunjung.</p>' +
        '<div class="row">' +
          '<button class="btn btn-primary" id="ocRdBtn2" onclick="ocRedeploy(\'data\')">' + E.cyc + ' Deploy Ulang ke Cloudflare</button>' +
        '</div>' +
        '<div id="ocRdBox2" class="muted" style="display:none;font-size:11.5px;margin-top:8px;padding:8px 10px;border:1px solid var(--stroke,#372a78);border-radius:10px;background:rgba(255,255,255,.03)"></div>' +
      '</div>';

    box.innerHTML = html;

    /* pulihkan status deploy yang sedang jalan (kalau tab di-render ulang saat deploy) */
    try {
      if (window.__ocDeployActive && window.__ocDeployRunning) {
        var b2 = $c('ocRdBtn2'), bx2 = $c('ocRdBox2');
        if (b2) b2.disabled = true;
        if (bx2) { bx2.style.display = 'block'; bx2.innerHTML = window.__ocDeployRunning; }
      }
    } catch (e) { }
  };

  window.adminData._isOc = true;   /* penanda: versi override (fallback injek nonaktif) */

  /* ---------- fungsi Download Berkas (JSON+HTML) ---------- */
  window.downloadFilesJsonHtml = function () {
    if (DC_BUSY) return;
    DC_BUSY = true;
    var btn = $c('ocDbBtn'), stat = $c('ocDbStat');
    if (btn) btn.disabled = true;
    if (stat) { stat.style.display = 'block'; stat.innerHTML = E.hour + ' Sedang menyiapkan berkas...'; }

    var dateStr = new Date().toISOString().slice(0, 10);
    var enc = new TextEncoder();
    var files = [];
    var pending = [];
    var htmlPages = [['index.html', '/'], ['login.html', '/login'], ['pengaturan.html', '/pengaturan'], ['profile.html', '/profile']];
    var fetchedHtml = 0;

    function addFile(name, data) {
      files.push({ name: name, data: data instanceof Uint8Array ? data : enc.encode(String(data)) });
    }

    /* 1) JSON database lokal (localStorage jka_db_v3) */
    try { addFile('database/jka_db_v3.json', JSON.stringify(getDB(), null, 2)); } catch (e) { }

    /* 2) dump D1 penuh (server-side) */
    pending.push(
      fetch('/api/auth/owner/settings/export', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) { if (t) { addFile('database/d1-full-dump.json', t); } })
        .catch(function () { })
    );

    /* 3) halaman HTML live */
    htmlPages.forEach(function (pg) {
      var opts = pg[0] === 'login.html' ? { credentials: 'omit' } : { credentials: 'same-origin' };
      pending.push(
        fetch(pg[1] + '?t=' + Date.now(), opts)
          .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
          .then(function (buf) { if (buf) { addFile('html/' + pg[0], new Uint8Array(buf)); fetchedHtml++; } })
          .catch(function () { })
      );
    });

    Promise.all(pending).then(function () {
      addFile('BACKUP-INFO.json', JSON.stringify({
        site: 'https://jkadistore.shop',
        generatedAt: new Date().toISOString(),
        type: 'json-html-backup',
        counts: { json: 2, html: fetchedHtml, total: files.length }
      }, null, 2));
      try {
        var zip = zipCreate(files);
        if (stat) stat.innerHTML = E.check + ' Berkas siap! Mulai unduh otomatis... (' + fmtBytes(zip.length) + ')';
        toastC(E.check + ' Berkas siap! Mulai unduh otomatis... (' + fmtBytes(zip.length) + ')');
        realDownload('jk-adistore-berkas-' + dateStr + '.zip', new Blob([zip], { type: 'application/zip' }), 'application/zip');
      } catch (e) {
        if (stat) stat.innerHTML = E.cross + ' Gagal membuat ZIP: ' + escC(e.message);
        toastC(E.cross + ' Gagal membuat ZIP: ' + e.message);
      }
      if (btn) btn.disabled = false;
      DC_BUSY = false;
    });
  };

  /* ---------- injek card ZIP ke tab "Data & Backup" (bawah tombol lama) ----------
     CATATAN v2.3: kartu ZIP & Deploy kini dirender oleh override adminData()
     (window.adminData). injek ini hanya fallback bila adminData TIDAK di-override. */
  function injectZipCard() {
    var box = $c('adminContent');
    if (!box) return;
    /* tab Data & Backup: judul section berisi "Data & Backup" atau "Data &amp; Backup" */
    var isDataTab = box.innerHTML.indexOf('Data & Backup') >= 0 || box.innerHTML.indexOf('Data &amp; Backup') >= 0;
    if (!isDataTab || $c('ocZipCard')) return;
    if (typeof window.adminData === 'function' && window.adminData._isOc) return;

    var card = document.createElement('div');
    card.id = 'ocZipCard';
    card.className = 'admin-card';
    card.style.marginTop = '12px';
    card.innerHTML =
      '<div class="label">⬇️ DOWNLOAD SEMUA JADI (.ZIP) — BARU!</div>' +
      '<p class="muted" style="font-size:12px;line-height:1.6;margin-bottom:10px">' +
      'Kemas seluruh isi website (Database + Semua File) jadi 1 file ZIP.</p>' +
      '<div class="row">' +
      '<button class="btn btn-primary" id="ocZipBtn" onclick="downloadAllZip()">🟡🟣 Download Semua (.zip)</button>' +
      '</div>' +
      '<div id="ocZipStat" class="muted" style="display:none;font-size:11.5px;margin-top:8px;padding:8px 10px;border:1px solid var(--stroke,#372a78);border-radius:10px;background:rgba(255,255,255,.03)"></div>';
    box.appendChild(card);
  }

  /* ---------- pantau pergantian tab admin ---------- */
  var lastTab = null;
  setInterval(function () {
    var box = $c('adminContent');
    if (!box) return;
    var isOwner = box.innerHTML.includes('Panel Owner');
    var isData = box.innerHTML.indexOf('Data & Backup') >= 0 || box.innerHTML.indexOf('Data &amp; Backup') >= 0;
    if (isOwner) injectOwnerControlCards();
    if (isData) injectZipCard();
    lastTab = isOwner ? 'owner' : (isData ? 'data' : lastTab);
  }, 800);
  /* 🆕 v2.2 — sinkronkan status tutup/buka website dari server:
     saat panel dibuka, state terbaru langsung dipakai */
  ocRefreshClosed(function () { renderFixCard(); });
  setInterval(function () { ocRefreshClosed(); }, 15000);
  setTimeout(function () { renderFixCard(); renderDeployCard(); }, 1500);
})();