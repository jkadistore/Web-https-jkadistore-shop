/* ==================================================================
   JK ADISTORE — TOP UP & CHECKOUT FLOW v1.0 (2026-09-25)
   Flow 7 langkah gaya tokogame — branding JK ADISTORE tetap.
   DIMUAT PALING AKHIR (setelah admin-clean.js) — override
   openDetail/buyProduct khusus produk game (Top Up Game &
   Layanan Game & Joki). Kategori lain → flow lama, tampilan
   utama situs TIDAK berubah.

   1) Header produk: logo game, nama, harga mulai, ⚡Proses Instan, ⭐rating
   2) User ID (+Zone ID) → validasi otomatis via API cek nickname.
      Salah → warning + TIDAK BISA lanjut. Benar → nickname muncul.
   3) Paket collapsible drop-down (kecil→besar 2 kolom, + paket spesial)
   4) Pilih paket → highlight + harga final di bagian bayar + auto-scroll
   5) Kode diskon opsional → Terapkan → harga berubah otomatis
   6) Metode pembayaran bergrup + logo + harga minimal per kategori
   7) No. WhatsApp → pesan otomatis → "Beli Sekarang" buka WhatsApp
   ================================================================== */
(function () {
  'use strict';

  /* ============ 1. KONFIG ============ */

  var NICK_API = 'https://api.isan.eu.org/nickname/';

  /* Game dengan API cek nickname live (api.isan.eu.org, CORS *) */
  var GAME_DEFS = {
    mlbb: { api: 'ml', idLabel: 'User ID', zone: true, zoneLabel: 'Zone ID (Server)',
            idHint: 'Contoh: 1007909047 (angka, 6-10 digit)', zoneHint: 'Contoh: 13044 (angka, 4-5 digit)',
            idPattern: /^\d{6,10}$/, zonePattern: /^\d{3,5}$/ },
    ff:   { api: 'ff', idLabel: 'User ID', zone: false,
            idHint: 'Contoh: 225009777 (angka, 5-12 digit)',
            idPattern: /^\d{5,12}$/ },
    codm: { api: 'cod', idLabel: 'User ID (Open ID)', zone: false,
            idHint: 'Contoh: 6810008615871702 (angka, 10-20 digit)',
            idPattern: /^\d{10,20}$/ },
    aov:  { api: 'aov', idLabel: 'User ID / Open ID', zone: false,
            idHint: 'Contoh: 124590895269021 (angka, 8-20 digit)',
            idPattern: /^\d{8,20}$/ },
    sus:  { api: 'sus', idLabel: 'User ID', zone: false,
            idHint: 'Contoh: 15916600 (angka, 5-12 digit)',
            idPattern: /^\d{5,12}$/ },
    valo: { api: 'valo', idLabel: 'Riot ID', zone: false,
            idHint: 'Format: Nama#TAG — contoh: yuyun#123',
            idPattern: /^[A-Za-z0-9_.-]{3,24}#[A-Za-z0-9]{2,6}$/ },
    gi:   { api: 'gi', idLabel: 'UID Genshin Impact', zone: false,
            idHint: '9 digit angka — contoh: 900001019',
            idPattern: /^\d{9}$/ }
  };

  /* Game tanpa API cek → validasi format + konfirmasi manual via WA */
  var NOAPI_DEFS = {
    pubg:  { idLabel: 'User ID PUBG Mobile', idHint: 'Contoh: 5203897610 (angka, 5-15 digit)', idPattern: /^\d{5,15}$/ },
    hok:   { idLabel: 'User ID Honor of Kings', idHint: 'Contoh: 86000123456 (angka, 8-15 digit)', idPattern: /^\d{8,15}$/ },
    steam: { idLabel: 'Username / Email Steam', idHint: 'Contoh: namaakun atau email@anda.com', idPattern: /^.{3,64}$/ },
    '8bp': { idLabel: '8 Ball Pool ID', idHint: 'Contoh: 3512345678 (angka, 6-12 digit)', idPattern: /^\d{6,12}$/ },
    tj:    { idLabel: 'User ID Tom & Jerry Chase', idHint: 'Contoh: 12345678 (angka / username)', idPattern: /^.{3,40}$/ },
    wuwa:  { idLabel: 'User ID Wuthering Waves', idHint: 'Contoh: 100000001 (angka, 6-12 digit)', idPattern: /^\d{6,12}$/ },
    other: { idLabel: 'User ID / Username', idHint: 'Masukkan User ID / Username akun game kamu', idPattern: /^.{3,40}$/ }
  };
  var NO_API_GAMES = ['pubg', 'hok', 'steam', '8bp', 'tj', 'wuwa', 'other'];

  /* ===== PATCH LG: 594 game dari LapakGaming (data form di assets/lg-forms.js) ===== */
  var LG_API_SLUGS = {
    'mobile-legends': 'mlbb', 'free-fire': 'ff', 'call-of-duty-mobile': 'codm',
    'arena-of-valor': 'aov', 'super-sus': 'sus', 'valorant': 'valo', 'genshin-impact': 'gi'
  };
  function lgFormsData() {
    try { return (typeof window.LG_FORMS === 'object' && window.LG_FORMS) ? window.LG_FORMS : null; } catch (e) { return null; }
  }
  function lgDef(prod, family) {
    var LGF = lgFormsData();
    if (prod && prod.slug && LGF && LGF[prod.slug]) {
      var L = LGF[prod.slug];
      var fam = LG_API_SLUGS[prod.slug] || null;
      var base = fam ? GAME_DEFS[fam] : null;
      var f = L.f || [];
      var uid = null, zone = null, extras = [];
      for (var li = 0; li < f.length; li++) {
        if (f[li].k === 'user_id') uid = f[li];
        else if (f[li].k === 'additional_id' && f[li].ty !== 'option') zone = f[li];
        else extras.push(f[li]);
      }
      var d = {
        idLabel: (uid && uid.p) || (base && base.idLabel) || 'User ID',
        idHint: L.n || (base && base.idHint) || ((uid && uid.p) || 'Masukkan User ID akun kamu'),
        idPattern: null, zone: false, zoneLabel: '', zoneHint: '', zonePattern: /^\d{1,10}$/,
        lgTitle: L.t || '', lgNotes: L.n || '', lgExtras: extras, lg: true,
        lgUidText: (uid && uid.ty === 'text') ? 'text' : 'numeric'
      };
      if (uid && uid.v) { try { d.idPattern = new RegExp(uid.v); } catch (eReg) {} }
      if (!d.idPattern && base && base.idPattern) d.idPattern = base.idPattern;
      if (!d.idPattern) d.idPattern = (uid && uid.ty === 'tel') ? /^\d{3,20}$/ : /^.{3,64}$/;
      if (!uid && !extras.length) {
        d.idLabel = 'Email / Username';
        d.idHint = 'Masukkan email / username kamu (untuk konfirmasi pengiriman kode)';
        d.idPattern = /^.{3,64}$/;
        d.lgUidText = 'text';
      }
      if (zone) {
        d.zone = true;
        d.zoneLabel = zone.p || 'Zone ID';
        d.zoneHint = (base && base.zoneHint) || '';
        d.zonePattern = (base && base.zonePattern) || /^\d{1,10}$/;
      } else if (base && base.zone && !extras.length) {
        d.zone = true; d.zoneLabel = base.zoneLabel || 'Zone ID'; d.zoneHint = base.zoneHint || ''; d.zonePattern = base.zonePattern;
      }
      for (var zi = 0; zi < extras.length; zi++) {
        if (extras[zi].k === 'additional_id' && extras[zi].ty === 'option') { d.lgZoneFrom = 'tpX' + zi; break; }
      }
      if (base && base.api) d.api = base.api;
      return d;
    }
    if (prod && prod.cat === 'Layanan Game & Joki') return GAME_DEFS.mlbb;
    return GAME_DEFS[family] || NOAPI_DEFS[family] || NOAPI_DEFS.other;
  }

  /* Kode diskon toko */
  var DISCOUNTS = {
    'JK5':   { type: 'percent', value: 5,  min: 50000,  note: 'Diskon member 5% — min. belanja Rp 50.000' },
    'JK10':  { type: 'percent', value: 10, min: 100000, note: 'Diskon member 10% — min. belanja Rp 100.000' },
    'JKA20': { type: 'percent', value: 20, min: 150000, note: 'Diskon spesial 20% — min. belanja Rp 150.000' }
  };

  /* Grup metode pembayaran + harga minimal per kategori */
  var PAY_GROUPS = [
    { id: 'ewallet', name: 'E-Wallet', icon: '📱', min: 0, methods: [
      { id: 'qris',      name: 'QRIS',      sub: 'Semua e-wallet & m-banking', logo: 'QRIS', logoBg: '#0066b2', hot: true },
      { id: 'shopeepay', name: 'ShopeePay', sub: 'Saldo ShopeePay',            logo: 'SPAY', logoBg: '#ee2737' },
      { id: 'ovo',       name: 'OVO',       sub: 'Saldo OVO',                  logo: 'OVO',  logoBg: '#4c2a86' },
      { id: 'dana',      name: 'DANA',      sub: 'Saldo DANA',                 logo: 'DANA', logoBg: '#108ee9' },
      { id: 'linkaja',   name: 'LinkAja!',  sub: 'Saldo LinkAja',              logo: 'LINK', logoBg: '#e31f26', logoTextDark: true },
      { id: 'gopay',     name: 'GoPay',     sub: 'Saldo GoPay',                logo: 'GPAY', logoBg: '#00aed6' }
    ] },
    { id: 'crypto', name: 'Crypto', icon: '🪙', min: 250000, methods: [
      { id: 'btc',  name: 'Bitcoin (BTC)',  sub: 'Kirim BTC ke alamat toko', logo: '₿',    logoBg: '#f7931a' },
      { id: 'usdt', name: 'USDT (TRC20)',   sub: 'Stablecoin USDT',          logo: 'USDT', logoBg: '#26a17b' },
      { id: 'ltc',  name: 'Litecoin (LTC)', sub: 'Kirim LTC ke alamat toko', logo: 'Ł',    logoBg: '#345d9d' }
    ] },
    { id: 'pulsa', name: 'Pulsa', icon: '📶', min: 20000, methods: [
      { id: 'axis',      name: 'AXIS',      sub: 'Pulsa AXIS',      logo: 'AXIS', logoBg: '#7d00ff' },
      { id: 'xl',        name: 'XL',        sub: 'Pulsa XL',        logo: 'XL',   logoBg: '#1f3ea8' },
      { id: 'indosat',   name: 'Indosat',   sub: 'Pulsa IM3',       logo: 'IM3',  logoBg: '#f5b60d', logoTextDark: true },
      { id: 'smartfren', name: 'Smartfren', sub: 'Pulsa Smartfren', logo: 'SF',   logoBg: '#ed1650' },
      { id: 'telkomsel', name: 'Telkomsel', sub: 'Pulsa Tsel',      logo: 'TSEL', logoBg: '#e31f26' },
      { id: 'tri',       name: 'Tri',       sub: 'Pulsa Tri',       logo: '3',    logoBg: '#c9c9c9', logoTextDark: true }
    ] },
    { id: 'va', name: 'Virtual Account', icon: '🏦', min: 10000, methods: [
      { id: 'bca',     name: 'BCA',     sub: 'Virtual Account', logo: 'BCA',  logoBg: '#0d5c88' },
      { id: 'bri',     name: 'BRI',     sub: 'Virtual Account', logo: 'BRI',  logoBg: '#00529c' },
      { id: 'mandiri', name: 'Mandiri', sub: 'Virtual Account', logo: 'MAND', logoBg: '#0a3d91' },
      { id: 'bni',     name: 'BNI',     sub: 'Virtual Account', logo: 'BNI',  logoBg: '#f37021', logoTextDark: true }
    ] },
    { id: 'retail', name: 'Retail', icon: '🏪', min: 10000, methods: [
      { id: 'indomaret', name: 'Indomaret', sub: 'Bayar di kasir', logo: 'IDM',  logoBg: '#e31f26' },
      { id: 'alfamart',  name: 'Alfamart',  sub: 'Bayar di kasir', logo: 'ALFA', logoBg: '#e31f26', logoTextDark: true }
    ] }
  ];

  /* ============ 2. HELPER ============ */

  function esc2(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function rp(n) {
    try { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); } catch (e) { return 'Rp ' + n; }
  }
  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function dbGet() {
    try { if (typeof db !== 'undefined' && db && db.products) return db; } catch (e) {}
    try {
      var raw = localStorage.getItem('jka_db_v3');
      if (raw) { var d = JSON.parse(raw); if (d && d.products) return d; }
    } catch (e) {}
    return null;
  }
  function storeCfg() {
    var d = dbGet();
    return (d && d.store) || { name: 'JK ADISTORE', ratingVal: 4.48 };
  }
  function storeWa() {
    try {
      var d = dbGet();
      var soc = d && d.socials;
      if (soc && soc.length) {
        for (var i = 0; i < soc.length; i++) {
          var u = String(soc[i].url || '');
          if (u.indexOf('wa.me/') !== -1 || u.indexOf('whatsapp') !== -1) {
            var m = u.match(/(\d{8,16})/);
            if (m) return m[1];
          }
        }
      }
    } catch (e) {}
    return '628991232005';
  }
  function toast2(msg) {
    try { if (typeof toast === 'function') { toast(msg); return; } } catch (e) {}
    try { console.log('[topup] ' + msg); } catch (e) {}
  }
  function fmtSold(n) {
    n = +n || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'jt+';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'rb+';
    return String(n);
  }
  function decSafe(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  /* ============ 3. KLASIFIKASI PRODUK ============ */

  function isGameProduct(p) {
    if (!p) return false;
    return p.cat === 'Top Up Game' || p.cat === 'Layanan Game & Joki';
  }

  function gameFamily(p) {
    if (!p) return 'other';
    if (p.cat === 'Layanan Game & Joki') return 'mlbb';
    var n = (p.name || '').toLowerCase();
    if (/mobile legends|mlbb|weekly diamond pass/.test(n)) return 'mlbb';
    if (/free fire/.test(n)) return 'ff';
    if (/pubg/.test(n)) return 'pubg';
    if (/call of duty|codm/.test(n)) return 'codm';
    if (/super sus/.test(n)) return 'sus';
    if (/valorant/.test(n)) return 'valo';
    if (/genshin/.test(n)) return 'gi';
    if (/arena of valor|aov/.test(n)) return 'aov';
    if (/honor of kings/.test(n)) return 'hok';
    if (/steam/.test(n)) return 'steam';
    if (/8 ball/.test(n)) return '8bp';
    if (/tom & jerry|tom jerry/.test(n)) return 'tj';
    if (/wuthering/.test(n)) return 'wuwa';
    return 'other';
  }

  function familyLabel(f) {
    var map = {
      mlbb: 'Diamond', ff: 'Diamond', aov: 'Diamond', tj: 'Diamond',
      pubg: 'UC', codm: 'CP', sus: 'Golden Star', valo: 'Points (VP)',
      gi: 'Genesis Crystals', hok: 'Tokens', '8bp': 'Koin', wuwa: 'Lunites',
      steam: 'Saldo', other: 'Paket'
    };
    return map[f] || 'Paket';
  }

  function parseAmount(name) {
    if (!name) return null;
    var s = String(name).replace(/\./g, '');
    var m = s.match(/(\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    var v = parseFloat(m[1]);
    return isNaN(v) ? null : v;
  }

  /* ============ 4. PAKET PER GAME ============ */

  /* Kumpulkan paket untuk family game.
     - Produk Layanan (RW MLBB, RANK VS BOT): paket = priceList produk itu sendiri.
     - Master priceList >= 2 paket menang atas singles (dedupe by amount).
     - Singles (tanpa priceList) = 1 produk 1 paket. */
  function familyPackages(family, prod) {
    var d = dbGet();
    if (!d) return { master: null, items: [] };

    if (prod && prod.cat === 'Layanan Game & Joki') {
      var layananItems = [];
      var pl = (prod.priceList && prod.priceList.length) ? prod.priceList : [{ name: prod.name, price: prod.price }];
      pl.forEach(function (it, idx) {
        layananItems.push({ name: it.name, price: it.price, ref: prod.id, refIdx: idx, amount: parseAmount(it.name) });
      });
      return { master: prod, items: layananItems };
    }

    var tops;
    if (prod && prod.slug) {
      /* LG: satu produk = satu game, priceList = SEMUA denominasi game itu */
      tops = d.products.filter(function (p) { return p.id === prod.id && p.slug === prod.slug; });
    } else {
      tops = d.products.filter(function (p) {
        return p.cat === 'Top Up Game' && gameFamily(p) === family;
      });
    }
    var master = null, items = [];

    tops.forEach(function (p) {
      if (p.priceList && p.priceList.length >= 2) master = p;
    });
    if (master) {
      var LGFm = lgFormsData();
      var catOf = null;
      if (master.slug && LGFm && LGFm[master.slug] && LGFm[master.slug].cats) {
        catOf = [];
        (LGFm[master.slug].cats || []).forEach(function (c) {
          for (var q = 0; q < (c[1] || 0); q++) catOf.push(c[0]);
        });
      }
      master.priceList.forEach(function (it, idx) {
        items.push({ name: it.name, price: it.price, ref: master.id, refIdx: idx, amount: parseAmount(it.name), lgcat: catOf ? (catOf[idx] || null) : null });
      });
      return { master: master, items: items };
    }

    tops.forEach(function (p) {
      items.push({ name: p.name, price: p.price, ref: p.id, refIdx: null, amount: parseAmount(p.name) });
    });
    return { master: null, items: items };
  }

  /* Kelompokkan: diamonds (amount ada, ascending) + specials (Weekly Pass dsb.) */
  function groupPackages(family, items) {
    /* LG: kelompokkan paket per kategori asal LapakGaming (exact) */
    var lgMap = {}, lgOrder = [], hasLg = false;
    items.forEach(function (it) {
      if (it.lgcat) {
        hasLg = true;
        if (!lgMap[it.lgcat]) { lgMap[it.lgcat] = []; lgOrder.push(it.lgcat); }
        lgMap[it.lgcat].push(it);
      }
    });
    if (hasLg) {
      var groups = [];
      lgOrder.forEach(function (cn) {
        var its = lgMap[cn].slice();
        var anyAmt = its.some(function (x) { return x.amount != null; });
        if (anyAmt) its.sort(function (a, b) { return (a.amount != null ? a.amount : 1e15) - (b.amount != null ? b.amount : 1e15); });
        else its.sort(function (a, b) { return a.price - b.price; });
        var gname = (!cn || cn === 'default') ? 'Paket Top Up' : (cn.length > 44 ? cn.slice(0, 44) + '…' : cn);
        groups.push({ id: 'g' + groups.length, name: gname, icon: groups.length === 0 ? '💎' : '🎁', desc: its.length + ' paket — kecil → besar', items: its });
      });
      var rest = items.filter(function (it) { return !it.lgcat; });
      if (rest.length) {
        rest.sort(function (a, b) { return a.price - b.price; });
        groups.push({ id: 'gx', name: 'Paket Lainnya', icon: '🎁', desc: 'Paket spesial & lainnya', items: rest });
      }
      return groups;
    }
    var diamonds = [], specials = [];
    items.forEach(function (it) {
      (it.amount != null ? diamonds : specials).push(it);
    });
    diamonds.sort(function (a, b) { return a.amount - b.amount; });
    specials.sort(function (a, b) { return a.price - b.price; });

    var groups = [];
    if (diamonds.length) {
      groups.push({
        id: 'd',
        name: familyLabel(family),
        icon: '💎',
        desc: 'Paket top up — kecil → besar',
        items: diamonds
      });
    }
    if (specials.length) {
      groups.push({
        id: 's',
        name: 'Paket Spesial & Lainnya',
        icon: '🎁',
        desc: 'Weekly Pass, Welkin Moon, layanan rank & lainnya',
        items: specials
      });
    }
    return groups;
  }

  /* ============ 5. STATE ============ */

  var state = {
    prod: null, family: 'other', def: null,
    items: [], master: null, groups: [],
    uid: '', zone: '', nick: null, nickOk: false,
    pkg: null, payGroup: null, payMethod: null,
    discCode: '', discAmt: 0,
    wa: '', finalPrice: 0
  };

  /* ============ 6. FETCH NICKNAME ============ */

  function fetchNick(game, uid, zone, cb) {
    var done = false;
    var timer = setTimeout(function () {
      if (done) return; done = true;
      cb({ ok: false, reason: 'timeout' });
    }, 12000);

    var url = NICK_API + game + '?id=' + encodeURIComponent(uid) + (zone ? '&server=' + encodeURIComponent(zone) : '') + '&decode=false';
    try {
      fetch(url, { mode: 'cors', cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (done) return; done = true; clearTimeout(timer);
          if (j && j.success === true) {
            cb({ ok: true, name: decSafe(j.name || ''), game: j.game || '', region: j.country || j.server || '' });
          } else {
            cb({ ok: false, reason: (j && (j.message || j.error)) || 'not-found' });
          }
        })
        .catch(function () {
          if (done) return; done = true; clearTimeout(timer);
          cb({ ok: false, reason: 'network' });
        });
    } catch (e) {
      if (done) return; done = true; clearTimeout(timer);
      cb({ ok: false, reason: 'network' });
    }
  }

  /* ============ 7. RENDER FLOW ============ */

  function renderFlow() {
    var s = state;
    var prod = s.prod;
    var cfg = storeCfg();
    var def = s.def;
    var zoneNeeded = !!(def && def.zone);

    var img = prod.img ? prod.img : 'assets/img/logo.png';
    var rating = cfg.ratingVal || 4.48;
    var soldTotal = 0;
    try {
      var d = dbGet();
      soldTotal = d.products.filter(function (p) { return isGameProduct(p); }).reduce(function (a, p) { return a + (+p.sold || 0); }, 0);
    } catch (e) {}

    var prices = s.items.map(function (it) { return it.price; });
    var minP = prices.length ? Math.min.apply(null, prices) : (prod.price || 0);
    var maxP = prices.length ? Math.max.apply(null, prices) : (prod.price || 0);
    var fromTxt = (prices.length > 1)
      ? ('Mulai <b>' + rp(minP) + '</b> — ' + rp(maxP))
      : ('Mulai <b>' + rp(minP) + '</b>');

    var h = '';
    h += '<div class="tp-bar">';
    h +=   '<button class="tp-back" id="tpBack" type="button">← Kembali</button>';
    h +=   '<div class="tp-barname">' + esc2(cfg.name || 'JK ADISTORE') + '<small>TOP UP &amp; CHECKOUT</small></div>';
    h +=   '<div class="tp-barpill">⚡ Proses Instan</div>';
    h += '</div>';
    h += '<div class="tp-wrap">';

    /* -- header produk -- */
    h += '<div class="tp-head">';
    h +=   '<img class="tp-logo" id="tpLogo" src="' + esc2(img) + '" alt="' + esc2(prod.name) + '" onerror="this.onerror=null;this.style.display=\'none\';this.parentNode.querySelector(\'.tp-logo-fb\').style.display=\'flex\';">';
    h +=   '<div class="tp-logo-fb">🎮</div>';
    h +=   '<div class="tp-hmain">';
    h +=     '<h1 class="tp-hname">' + esc2(prod.name) + '</h1>';
    h +=     '<div class="tp-badges">';
    h +=       '<span class="tp-pill fast">⚡ Proses Instan</span>';
    h +=       '<span class="tp-pill rate">⭐ ' + esc2(String(rating)) + '</span>';
    h +=       '<span class="tp-pill">🔥 ' + fmtSold(soldTotal) + ' terjual</span>';
    h +=       '<span class="tp-pill">✅ ' + esc2(cfg.name || 'JK ADISTORE') + '</span>';
    h +=     '</div>';
    h +=     '<div class="tp-from">' + fromTxt + '</div>';
    h +=   '</div>';
    h += '</div>';

    /* -- langkah 1: user id -- */
    h += '<div class="tp-card" id="tpStep1">';
    h +=   '<div class="tp-shead"><span class="tp-snum">1</span>';
    h +=     '<div><div class="tp-stitle">' + esc2(def.lgTitle || 'Masukkan User ID') + '</div>';
    h +=       '<div class="tp-ssub">' + esc2(def.idLabel || 'User ID') + (zoneNeeded ? ' + ' + esc2(def.zoneLabel || 'Zone ID') : '') + (def.lgExtras && def.lgExtras.length ? ' + ' + def.lgExtras.map(function (x) { return esc2(x.p || x.k); }).join(' + ') : '') + '</div></div></div>';
    h +=   '<div class="tp-frow' + ((zoneNeeded || (def.lgExtras && def.lgExtras.length)) ? '' : ' one') + '">';
    h +=     '<div class="tp-f"><label>' + esc2(def.idLabel || 'User ID') + '</label>';
    h +=       '<input class="input" id="tpUid" type="text" inputmode="' + (def.lgUidText || (s.family === 'valo' ? 'text' : 'numeric')) + '" placeholder="' + esc2(def.idHint || '') + '" autocomplete="off">';
    h +=       '<div class="tp-hint">' + esc2(def.idHint || '') + '</div>';
    h +=     '</div>';
    if (zoneNeeded) {
    h +=   '<div class="tp-f"><label>' + esc2(def.zoneLabel || 'Zone ID') + '</label>';
    h +=   '<input class="input" id="tpZone" type="text" inputmode="numeric" placeholder="' + esc2(def.zoneHint || '') + '" autocomplete="off">';
    h +=   '<div class="tp-hint">' + esc2(def.zoneHint || '') + '</div>';
    h +=   '</div>';
    }
    if (def.lgExtras && def.lgExtras.length) {
      def.lgExtras.forEach(function (x, xi) {
        var fid = 'tpX' + xi;
    h +=   '<div class="tp-f"><label>' + esc2(x.p || x.k) + '</label>';
        if (x.ty === 'option' && x.o && x.o.length) {
    h +=   '<select class="input" id="' + fid + '">';
          x.o.forEach(function (op) {
            var oval = (op instanceof Array) ? op[0] : op;
            var onm = (op instanceof Array) ? (op[1] || op[0]) : op;
    h +=   '<option value="' + esc2(String(oval)) + '"' + (String(oval) === '' ? ' disabled selected' : '') + '>' + esc2(String(onm)) + '</option>';
          });
    h +=   '</select>';
        } else {
    h +=   '<input class="input" id="' + fid + '" type="text" placeholder="' + esc2(x.p || '') + '" autocomplete="off">';
        }
    h +=   '<div class="tp-hint">' + esc2(x.p || '') + '</div>';
    h +=   '</div>';
      });
    }
    h +=   '</div>';
    h +=   '<button class="btn tp-checkbtn" id="tpCek" type="button">🔎 Cek User ID</button>';
    h +=   '<div class="tp-nick" id="tpNick"></div>';
    h +=   '<div class="tp-locknote" id="tpLockNote">👉 Sudah bisa lihat &amp; pilih paket di bawah — cek User ID dulu biar transaksi aman ✅</div>';
    h += '</div>';

    /* -- langkah 2: paket -- */
    h += '<div class="tp-card" id="tpStep2">';
    h +=   '<div class="tp-shead"><span class="tp-snum">2</span>';
    h +=     '<div><div class="tp-stitle">Pilih Paket</div>';
    h +=       '<div class="tp-ssub" id="tpPkgCount"></div></div></div>';
    h +=   '<div class="tp-groups" id="tpGroups"></div>';
    h += '</div>';

    /* -- langkah 3: diskon + pembayaran -- */
    h += '<div class="tp-card" id="tpStep3" style="display:none">';
    h +=   '<div class="tp-shead"><span class="tp-snum">3</span>';
    h +=     '<div><div class="tp-stitle">Pilih Pembayaran</div>';
    h +=       '<div class="tp-ssub">Kode diskon (opsional) + metode pembayaran</div></div></div>';
    h +=   '<div class="tp-discrow" id="tpDiscRow">';
    h +=     '<input class="input" id="tpDisc" type="text" placeholder="Kode diskon (opsional) — JK5 / JK10 / JKA20" autocomplete="off" style="text-transform:uppercase">';
    h +=     '<button class="btn" id="tpDiscBtn" type="button">Terapkan</button>';
    h +=   '</div>';
    h +=   '<div class="tp-disc-ok" id="tpDiscOk"></div>';
    h +=   '<div id="tpDiscNote"></div>';
    h +=   '<div class="tp-payg" id="tpPayG"></div>';
    h += '</div>';

    /* -- langkah 4: WA + ringkasan + beli -- */
    h += '<div class="tp-card" id="tpStep4" style="display:none">';
    h +=   '<div class="tp-shead"><span class="tp-snum">4</span>';
    h +=     '<div><div class="tp-stitle">Konfirmasi &amp; Beli</div>';
    h +=       '<div class="tp-ssub">Masukkan nomor WhatsApp, cek ringkasan, lalu beli</div></div></div>';
    h +=   '<div class="tp-wrow">';
    h +=     '<input class="input" id="tpWa" type="tel" placeholder="No. WhatsApp kamu (contoh: 081234567890)" autocomplete="off">';
    h +=   '</div>';
    h +=   '<div class="tp-sum" id="tpSum"></div>';
    h +=   '<div class="tp-buyrow">';
    h +=     '<button class="btn tp-buy" id="tpBuy" type="button" disabled>🛒 Beli Sekarang</button>';
    h +=   '</div>';
    h +=   '<div class="tp-note">🔒 ID &amp; nickname yang sudah dicek tidak bisa diganti setelah pembayaran.<br>⛔ Pesanan diproses setelah pembayaran dikonfirmasi admin.<br>📱 Pastikan nomor WhatsApp aktif agar bisa dihubungi admin.</div>';
    h += '</div>';

    h += '</div>';

    /* -- sticky bar mobile -- */
    h += '<div class="tp-mbar" id="tpMbar">';
    h +=   '<div class="tp-mtotal"><small>TOTAL</small><b id="tpMTotal">' + rp(0) + '</b></div>';
    h +=   '<button class="btn tp-buy" id="tpMBuy" type="button" disabled>🛒 Beli</button>';
    h += '</div>';

    var host = document.createElement('div');
    host.id = 'jkaTpOv';
    host.innerHTML = h;
    document.body.appendChild(host);

    renderGroups();
    renderPayGroups();
    renderSum();
    bindFlow();
  }

  /* ============ 8. RENDER PAKET & PEMBAYARAN ============ */

  function renderGroups() {
    var wrap = $('tpGroups');
    var cnt = $('tpPkgCount');
    if (cnt) {
      var total = state.groups.reduce(function (a, g) { return a + g.items.length; }, 0);
      cnt.textContent = total + ' paket tersedia — kecil → besar';
    }
    if (!wrap) return;
    var html = '';
    state.groups.forEach(function (g, gi) {
      var first = gi === 0;
      html += '<div class="tp-g' + (first ? ' open' : '') + '">';
      html +=   '<button class="tp-ghead" type="button" data-act="gtoggle">';
      html +=     '<span class="tp-gic">' + g.icon + '</span>';
      html +=     '<span class="tp-gname">' + esc2(g.name) + '<small>' + esc2(g.desc) + '</small></span>';
      html +=     '<span class="tp-gcount">' + g.items.length + ' paket</span>';
      html +=     '<span class="tp-gchev">▼</span>';
      html +=   '</button>';
      html +=   '<div class="tp-gbody"><div class="tp-grid">';
      g.items.forEach(function (it, ii) {
        var hot = (it.amount != null && it.amount >= 500) ? '<span class="tp-pkg-hot">BEST</span>' : '';
        var act = (state.pkg && state.pkg._gi === gi && state.pkg._ii === ii) ? ' active' : '';
        html += '<button class="tp-pkg' + act + '" type="button" data-gi="' + gi + '" data-ii="' + ii + '">';
        html +=   hot;
        html +=   '<span class="tp-pkg-name">' + esc2(it.name) + '</span>';
        html +=   '<span class="tp-pkg-price">' + rp(it.price) + '</span>';
        html +=   '<span class="tp-check">✓</span>';
        html += '</button>';
      });
      html +=   '</div></div>';
      html += '</div>';
    });
    wrap.innerHTML = html;
  }

  function selectPkgBtn(btn) {
    var gi = +btn.getAttribute('data-gi');
    var ii = +btn.getAttribute('data-ii');
    var g = state.groups[gi];
    if (!g) return;
    var it = g.items[ii];

    if (!state.nickOk) {
      toast2('🔒 Cek dulu User ID kamu (langkah 1) — paket belum bisa dipilih');
      var s1 = $('tpStep1');
      if (s1) {
        s1.classList.remove('tp-shake');
        void s1.offsetWidth;
        s1.classList.add('tp-shake');
        autoScroll(s1);
      }
      return;
    }

    state.pkg = { name: it.name, price: it.price, ref: it.ref, refIdx: it.refIdx, amount: it.amount, _gi: gi, _ii: ii };
    qsa('.tp-pkg').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    qsa('.tp-gbody').forEach(function (b) { b.style.display = ''; });

    renderPayGroups();
    var s3 = $('tpStep3');
    if (s3) s3.style.display = '';
    renderSum();
    autoScroll(s3);
    toast2('✅ ' + it.name + ' — ' + rp(it.price));
  }

  function renderPayGroups() {
    var wrap = $('tpPayG');
    if (!wrap) return;
    var html = '';
    PAY_GROUPS.forEach(function (g) {
      html += '<div class="tp-pg">';
      html +=   '<div class="tp-pghead"><span>' + g.icon + '</span> ' + esc2(g.name);
      if (g.min > 0) html += '<span class="tp-pgmin">Min. ' + rp(g.min) + '</span>';
      html +=   '</div>';
      html +=   '<div class="tp-pms">';
      g.methods.forEach(function (m) {
        var dis = state.pkg && state.pkg.price < g.min;
        var act = state.payMethod && state.payMethod.id === m.id && state.payGroup && state.payGroup.id === g.id;
        var hot = m.hot ? ' <span class="tp-qris-hot">POPULER</span>' : '';
        html += '<button class="tp-pm' + (act ? ' active' : '') + (dis ? ' disabled' : '') + '" type="button" data-g="' + g.id + '" data-m="' + m.id + '"' + (dis ? ' title="Minimal transaksi ' + esc2(rp(g.min)) + '"' : '') + '>';
        html +=   '<span class="tp-pmlogo' + (m.logoTextDark ? ' dark' : '') + '" style="background:' + m.logoBg + '">' + esc2(m.logo) + '</span>';
        html +=   '<span class="tp-pmname">' + esc2(m.name) + hot + '<small>' + esc2(m.sub) + '</small></span>';
        html +=   '<span class="tp-check">✓</span>';
        html += '</button>';
      });
      html +=   '</div>';
      html += '</div>';
    });
    wrap.innerHTML = html;
  }

  function selectPay(el) {
    var gid = el.getAttribute('data-g');
    var mid = el.getAttribute('data-m');
    var gDef = null, mDef = null;
    PAY_GROUPS.forEach(function (x) { if (x.id === gid) gDef = x; });
    if (!gDef) return;
    gDef.methods.forEach(function (x) { if (x.id === mid) mDef = x; });
    if (!mDef) return;

    if (!state.pkg) {
      toast2('👉 Pilih paket top up dulu (langkah 2)');
      autoScroll($('tpStep2'));
      return;
    }
    if (state.pkg.price < gDef.min) {
      toast2('⛔ ' + mDef.name + ' hanya untuk transaksi minimal ' + rp(gDef.min));
      return;
    }
    state.payGroup = gDef;
    state.payMethod = mDef;
    qsa('.tp-pm').forEach(function (b) { b.classList.remove('active'); });
    el.classList.add('active');
    var s4 = $('tpStep4');
    if (s4) s4.style.display = '';
    renderSum();
    autoScroll(s4);
  }

  /* ============ 9. DISKON & RINGKASAN ============ */

  function renderSum() {
    var s = state;
    var sumEl = $('tpSum');
    if (!sumEl) return;

    var total = s.pkg ? Math.max(1000, s.pkg.price - s.discAmt) : 0;
    s.finalPrice = total;

    var rows = [];
    rows.push(['Produk', s.prod ? s.prod.name : '-']);
    rows.push(['User ID', s.uid ? (s.uid + (s.zone ? ' (' + s.zone + ')' : '')) : '-']);
    var nickTxt = '-';
    if (s.nick && s.nick.name) nickTxt = s.nick.name + (s.nick.region ? ' · ' + s.nick.region : '');
    else if (s.nickOk && s.uid) nickTxt = '(akun ' + s.uid + ')';
    rows.push(['Nickname', nickTxt]);
    rows.push(['Paket', s.pkg ? (s.pkg.name + ' — ' + rp(s.pkg.price)) : '-']);
    rows.push(['Diskon', s.discAmt > 0 ? ('-' + rp(s.discAmt) + ' (' + s.discCode + ')') : '-']);
    rows.push(['Metode', s.payMethod ? (s.payMethod.name + (s.payMethod.sub ? ' · ' + s.payMethod.sub : '')) : '-']);

    var html = '';
    rows.forEach(function (r) {
      var cls = (r[0] === 'Diskon' && s.discAmt > 0) ? ' disc' : '';
      html += '<div class="tp-sumrow' + cls + '"><span>' + esc2(r[0]) + '</span><b>' + esc2(r[1]) + '</b></div>';
    });
    if (s.discAmt > 0) {
      html += '<div class="tp-sumrow disc"><span>Hemat</span><b>' + rp(s.discAmt) + ' dengan kode ' + esc2(s.discCode) + '</b></div>';
    }
    html += '<div class="tp-sumrow total"><span>Total Bayar</span><b>' + rp(total) + '</b></div>';
    sumEl.innerHTML = html;

    var buy = $('tpBuy'), mbuy = $('tpMBuy'), mt = $('tpMTotal'), mbar = $('tpMbar');
    var ready = !!(s.pkg && s.payMethod && s.nickOk);
    if (buy) buy.disabled = !ready;
    if (mbuy) mbuy.disabled = !ready;
    if (mt) mt.textContent = rp(total);
    if (mbar) {
      if (s.pkg) mbar.classList.add('on');
      else mbar.classList.remove('on');
    }
  }

  function applyDisc() {
    var input = $('tpDisc');
    if (!input) return;
    var code = String(input.value || '').trim().toUpperCase();
    if (!code) { toast2('Masukkan kode diskon dulu'); return; }
    var d = DISCOUNTS[code];
    if (!d) {
      toast2('❌ Kode diskon tidak dikenali — coba JK5 / JK10 / JKA20');
      markInvalid(input);
      return;
    }
    if (!state.pkg) {
      toast2('👉 Pilih paket dulu sebelum menerapkan kode diskon');
      autoScroll($('tpStep2'));
      return;
    }
    if (state.pkg.price < d.min) {
      toast2('⛔ Kode ' + code + ' berlaku untuk transaksi minimal ' + rp(d.min));
      markInvalid(input);
      return;
    }
    var amt = Math.min(Math.round(state.pkg.price * d.value / 100), 50000);
    state.discCode = code;
    state.discAmt = amt;

    var okBox = $('tpDiscOk');
    if (okBox) {
      okBox.innerHTML = '🏷️ <b>' + esc2(code) + '</b> diterapkan — hemat <b>' + rp(amt) + '</b>' +
        ' <button class="btn" id="tpDiscRemove" type="button" style="margin-left:auto;padding:6px 12px;min-height:36px;font-size:12px">Hapus</button>';
      okBox.classList.add('show');
      var rm = $('tpDiscRemove');
      if (rm) rm.onclick = removeDisc;
    }
    renderSum();
    toast2('🏷️ Diskon ' + code + ' diterapkan — harga berubah otomatis');
  }

  function removeDisc() {
    state.discCode = '';
    state.discAmt = 0;
    var okBox = $('tpDiscOk');
    if (okBox) { okBox.classList.remove('show'); okBox.innerHTML = ''; }
    var input = $('tpDisc');
    if (input) input.value = '';
    renderSum();
    toast2('🗑️ Diskon dihapus');
  }

  /* ============ 10. CEK ID / NICKNAME ============ */

  function doCek() {
    var s = state;
    var def = s.def;
    var uidEl = $('tpUid');
    var zoneEl = def && def.zone ? $('tpZone') : null;
    var cekBtn = $('tpCek');

    var uid = uidEl ? String(uidEl.value || '').trim() : '';
    var zone = zoneEl ? String(zoneEl.value || '').trim() : '';

    /* reset state validasi */
    s.uid = uid; s.zone = zone;
    s.nick = null; s.nickOk = false;
    s.pkg = null; s.payGroup = null; s.payMethod = null;
    s.discCode = ''; s.discAmt = 0;
    clearPkgHi();
    clearPayHi();
    hideStep('tpStep3'); hideStep('tpStep4');
    var okBox = $('tpDiscOk');
    if (okBox) { okBox.classList.remove('show'); okBox.innerHTML = ''; }
    renderSum();

    if (uidEl) uidEl.classList.remove('tp-valid', 'tp-invalid');
    if (zoneEl) zoneEl.classList.remove('tp-valid', 'tp-invalid');

    if (!uid) {
      showNick('warn', '⚠️', 'Masukkan User ID dulu', 'ID wajib diisi &amp; terverifikasi sebelum pilih paket.');
      shakeEl(uidEl);
      return;
    }
    if (!def.idPattern.test(uid)) {
      showNick('err', '❌', 'Format User ID salah', esc2(def.idHint || 'Periksa kembali format ID.'));
      markInvalid(uidEl);
      shakeEl(uidEl);
      return;
    }
    if (def.zone) {
      if (!zone) {
        showNick('err', '❌', 'Zone ID wajib diisi', esc2(def.zoneHint || ''));
        markInvalid(zoneEl);
        shakeEl(zoneEl);
        return;
      }
      if (!def.zonePattern.test(zone)) {
        showNick('err', '❌', 'Format Zone ID salah', esc2(def.zoneHint || ''));
        markInvalid(zoneEl);
        shakeEl(zoneEl);
        return;
      }
      markValid(zoneEl);
    }
    markValid(uidEl);

    if (def.lgExtras && def.lgExtras.length) {
      for (var xi = 0; xi < def.lgExtras.length; xi++) {
        var xEl = $('tpX' + xi);
        if (!xEl) continue;
        var xv = String(xEl.value || '').trim();
        if (!xv) {
          showNick('err', '❌', esc2(def.lgExtras[xi].p || 'Kolom') + ' wajib diisi', 'Lengkapi semua kolom di atas dulu ya.');
          markInvalid(xEl);
          shakeEl(xEl);
          return;
        }
        markValid(xEl);
      }
    }

    /* game tanpa API cek → validasi format + konfirmasi via WA */
    if (!def.api) {
      s.nickOk = true;
      s.nick = { name: '(akun ' + uid + ')', region: '', game: '' };
      showNick('ok', '✅', 'User ID diterima: <b>' + esc2(uid) + '</b>', '🔒 Pastikan ID benar — ID tidak bisa diganti setelah pembayaran. Admin akan konfirmasi ulang via WhatsApp.');
      unlockPkg();
      renderSum();
      return;
    }

    /* game dengan API live */
    showNick('busy', '⏳', 'Memeriksa ID <b>' + esc2(uid) + (zone ? ' / ' + esc2(zone) : '') + '</b> ke server game…', 'Harap tunggu sebentar.');
    if (cekBtn) { cekBtn.disabled = true; cekBtn.textContent = '⏳ Memeriksa…'; }
    var zoneSend = zone;
    if (def.lgZoneFrom) { var zsEl = $(def.lgZoneFrom); if (zsEl) zoneSend = String(zsEl.value || '').trim(); }
    fetchNick(def.api, uid, zoneSend, function (res) {
      if (cekBtn) { cekBtn.disabled = false; cekBtn.textContent = '🔎 Cek User ID'; }
      if (!res.ok && s.prod && s.prod.slug) {
        /* game LG tanpa API nickname tersedia → konfirmasi manual via WA */
        s.nickOk = true;
        s.nick = { name: '(akun ' + uid + ')', region: '', game: '' };
        showNick('warn', '⚠️', 'User ID diterima: <b>' + esc2(uid) + '</b>', 'ID tidak bisa diverifikasi otomatis untuk game ini — pastikan ID benar. Admin akan konfirmasi ulang via WhatsApp.');
        unlockPkg();
        renderSum();
        return;
      }
      if (!res.ok) {
        var msgs = {
          'not-found': 'ID tidak ditemukan — periksa lagi User ID kamu.',
          'Not found': 'ID tidak ditemukan — periksa lagi User ID kamu.',
          'Bad request': 'Format ID tidak dikenali server game — periksa formatnya.',
          'timeout': 'Server game sibuk — coba lagi beberapa saat.',
          'network': 'Koneksi ke server game gagal — coba lagi.'
        };
        var msg = msgs[res.reason] || ('Gagal cek ID (' + esc2(String(res.reason)) + ') — coba lagi.');
        showNick('err', '❌', msg, 'ID belum valid — belum bisa memilih paket. Perbaiki ID lalu cek ulang.');
        lockPkg();
        toast2('❌ ID belum valid — perbaiki dulu sebelum pilih paket');
      } else {
        s.nickOk = true;
        s.nick = { name: res.name, region: res.region, game: res.game };
        showNick('ok', '✅', 'Nickname: <b>' + esc2(res.name) + '</b>' + (res.region ? ' · Region: <b>' + esc2(res.region) + '</b>' : ''), '🔒 Pastikan nickname ini benar — ID tidak bisa diganti setelah pembayaran.');
        unlockPkg();
        renderSum();
        toast2('👤 Nickname ditemukan: ' + res.name);
      }
    });
  }

  function showNick(type, ic, html, small) {
    var el = $('tpNick');
    if (!el) return;
    el.className = 'tp-nick ' + type + ' show';
    el.innerHTML = '<span class="tp-nickic">' + ic + '</span><span>' + html + (small ? '<small>' + small + '</small>' : '') + '</span>';
  }

  function markInvalid(el) { if (el) { el.classList.remove('tp-valid'); el.classList.add('tp-invalid'); } }
  function markValid(el) { if (el) { el.classList.remove('tp-invalid'); el.classList.add('tp-valid'); } }
  function clearPkgHi() { qsa('.tp-pkg').forEach(function (b) { b.classList.remove('active'); }); }
  function clearPayHi() { qsa('.tp-pm').forEach(function (b) { b.classList.remove('active'); }); }
  function hideStep(id) { var el = $(id); if (el) el.style.display = 'none'; }

  function lockPkg() {
    var ln = $('tpLockNote');
    if (ln) { ln.style.display = 'flex'; ln.innerHTML = '👉 Lihat dulu daftar paketnya di bawah — ID terverifikasi dulu untuk membuka pembayaran.'; }
    hideStep('tpStep3'); hideStep('tpStep4');
    state.pkg = null; state.payGroup = null; state.payMethod = null;
    renderSum();
  }

  function unlockPkg() {
    var ln = $('tpLockNote');
    if (ln) ln.style.display = 'none';
    var s2 = $('tpStep2');
    if (s2) s2.style.display = '';
    var cekBtn = $('tpCek');
    if (cekBtn) cekBtn.textContent = '✅ ID Valid — Silakan Pilih Paket di Bawah ⬇️';
    var s2b = $('tpStep2');
    if (s2b) autoScroll(s2b);
    renderSum();
  }

  /* ============ 11. BELI VIA WHATSAPP ============ */

  function doBuy() {
    var s = state;
    if (!s.pkg || !s.payMethod || !s.nickOk) {
      toast2('Lengkapi langkah 1-3 dulu ya (ID valid → paket → metode)');
      return;
    }
    var waEl = $('tpWa');
    var wa = waEl ? String(waEl.value || '').replace(/[\s-]/g, '') : '';
    if (!/^(0|62)\d{8,13}$/.test(wa)) {
      toast2('📱 Masukkan no. WhatsApp yang valid (contoh: 081234567890)');
      if (waEl) {
        waEl.classList.remove('tp-invalid');
        void waEl.offsetWidth;
        waEl.classList.add('tp-invalid');
        waEl.focus();
      }
      return;
    }

    var lines = [
      '*PESANAN TOP UP — JK ADISTORE*',
      '',
      '🛍️ Produk: ' + s.prod.name,
      '🆔 User ID: ' + s.uid + (s.zone ? ' (' + s.zone + ')' : ''),
      '👤 Nickname: ' + (s.nick && s.nick.name ? s.nick.name : s.uid),
      '💎 Paket: ' + s.pkg.name,
      '💰 Harga Paket: ' + rp(s.pkg.price)
    ];
    if (s.discAmt > 0) {
      lines.push('🏷️ Diskon: -' + rp(s.discAmt) + ' (' + s.discCode + ')');
    }
    lines.push('💳 Metode Pembayaran: ' + s.payMethod.name + (s.payMethod.sub ? ' (' + s.payMethod.sub + ')' : ''));
    lines.push('💵 TOTAL BAYAR: ' + rp(s.finalPrice));
    lines.push('');
    lines.push('📱 WA Pembeli: ' + wa);
    lines.push('_Mohon konfirmasi &amp; proses pesanan ini. Terima kasih!_');

    try {
      var dX = state.def || {};
      if (dX.lgExtras && dX.lgExtras.length) {
        dX.lgExtras.forEach(function (x, xi) {
          var xEl2 = $('tpX' + xi);
          if (xEl2 && String(xEl2.value || '').trim()) lines.push('▪ ' + (x.p || x.k) + ': ' + String(xEl2.value).trim());
        });
      }
    } catch (eXL) {}
    var msg = lines.join('\n').replace(/\n{3,}/g, '\n\n');

    var url = 'https://wa.me/' + storeWa() + '?text=' + encodeURIComponent(msg);
    var win = null;
    try { win = window.open(url, '_blank'); } catch (e) {}
    if (!win) { try { location.href = url; } catch (e) {} }

    try {
      if (typeof _notifyOwner === 'function') {
        _notifyOwner('PURCHASE', s.prod.name + ' · ' + s.pkg.name + ' · ' + rp(s.finalPrice) + ' · WA:' + wa);
      }
    } catch (e) {}
    toast2('✅ Pesanan dikirim ke WhatsApp toko — selesaikan chat untuk pembayaran');
    setTimeout(hideOv, 900);
  }

  /* ============ 12. BIND, OVERLAY, OVERRIDE ============ */

  function bindFlow() {
    var back = $('tpBack');
    if (back) back.onclick = function () { hideOv(); };
    var cek = $('tpCek');
    if (cek) cek.onclick = function () { doCek(); };
    var dbtn = $('tpDiscBtn');
    if (dbtn) dbtn.onclick = function () { applyDisc(); };
    var buy = $('tpBuy');
    if (buy) buy.onclick = function () { doBuy(); };
    var mbuy = $('tpMBuy');
    if (mbuy) mbuy.onclick = function () { doBuy(); };
    var waEl = $('tpWa');
    if (waEl) waEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') doBuy(); });

    /* delegasi: klik grup/paket/metode via container */
    var groups = $('tpGroups');
    if (groups) groups.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== groups && t.classList) {
        if (t.classList.contains('tp-ghead')) { t.parentNode.classList.toggle('open'); return; }
        if (t.classList.contains('tp-pkg')) { selectPkgBtn(t); return; }
        t = t.parentNode;
      }
    });
    var payg = $('tpPayG');
    if (payg) payg.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== payg && t.classList) {
        if (t.classList.contains('tp-pm')) {
          if (t.classList.contains('disabled')) {
            var gid = t.getAttribute('data-g');
            var gDef = null;
            PAY_GROUPS.forEach(function (x) { if (x.id === gid) gDef = x; });
            toast2('⛔ ' + (gDef ? gDef.name : 'Metode ini') + ' hanya untuk transaksi minimal ' + (gDef ? rp(gDef.min) : ''));
            return;
          }
          selectPay(t);
          return;
        }
        t = t.parentNode;
      }
    });

    ['tpUid', 'tpZone', 'tpDisc', 'tpWa'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () { this.classList.remove('tp-invalid'); });
    });
    ['tpUid', 'tpZone'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') doCek(); });
    });
    var discEl = $('tpDisc');
    if (discEl) discEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') applyDisc(); });
  }

  function showOv() {
    var ov = $('jkaTpOv');
    if (ov) ov.classList.add('show');
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function hideOv() {
    var ov = $('jkaTpOv');
    if (ov) ov.classList.remove('show');
    try { document.body.style.overflow = ''; } catch (e) {}
    if (ov) setTimeout(function () { try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {} }, 250);
  }

  function autoScroll(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
  }

  function shakeEl(el) {
    if (!el) return;
    el.classList.remove('tp-shake');
    void el.offsetWidth;
    el.classList.add('tp-shake');
  }

  /* ============ 13. ENTRY & OVERRIDE openDetail / buyProduct ============ */

  /* --- anti data-race: cari produk di data TERBARU (global db / localStorage) --- */
  function findProd(pid) {
    var d = dbGet();
    if (!d || !d.products) return null;
    for (var i = 0; i < d.products.length; i++) {
      if (d.products[i].id === pid) return d.products[i];
    }
    return null;
  }

  /* tunggu data siap: event 'jka:storedata' dari store-sync.js + jaring pengaman terbatas */
  var PEND_PID = null, PEND_MODE = 'detail', PEND_TRIES = 0, PEND_TIMER = null;

  function pendClear() {
    PEND_PID = null;
    if (PEND_TIMER) { clearTimeout(PEND_TIMER); PEND_TIMER = null; }
  }

  function pendResolve() {
    if (!PEND_PID) return;
    if (PEND_TIMER) { clearTimeout(PEND_TIMER); PEND_TIMER = null; }
    var prod = findProd(PEND_PID);
    if (prod) {
      var pid = PEND_PID, mode = PEND_MODE;
      pendClear();
      if (isGameProduct(prod)) { openTopupFlowNow(prod); return; }
      if (mode === 'buy' && buyProductOrig) { try { buyProductOrig(pid); } catch (e) {} return; }
      if (openDetailOrig) { try { openDetailOrig(pid); } catch (e) {} }
      return;
    }
    PEND_TRIES++;
    if (PEND_TRIES > 60) {
      toast2('❌ Data produk belum siap — muat ulang halaman lalu coba lagi');
      pendClear();
      return;
    }
    PEND_TIMER = setTimeout(pendResolve, 300); /* pengaman bila event tak terkirim */
  }

  document.addEventListener('jka:storedata', function () {
    if (PEND_PID) pendResolve();
  });

  function openTopupFlow(pid, mode) {
    var prod = findProd(pid);
    if (prod) {
      if (!isGameProduct(prod)) return false; /* produk non-game → alur lama */
      openTopupFlowNow(prod);
      return true;
    }
    /* data belum siap (store-sync masih merge dari server) → tunggu event jka:storedata */
    if (PEND_PID === pid) return true; /* sedang menunggu produk yang sama */
    pendClear();
    PEND_PID = pid;
    PEND_MODE = mode || 'detail';
    PEND_TRIES = 0;
    toast2('⏳ Memuat data produk…');
    PEND_TIMER = setTimeout(pendResolve, 300); /* cek awal; selanjutnya via event */
    return true;
  }

  function openTopupFlowNow(prod) {
    var old = $('jkaTpOv');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    state.prod = prod;
    state.family = prod.slug ? ('lg:' + prod.slug) : gameFamily(prod);
    state.def = lgDef(prod, state.family);

    var pk = familyPackages(state.family, prod);
    state.items = pk.items;
    state.master = pk.master;
    state.groups = groupPackages(state.family, state.items);

    state.uid = ''; state.zone = ''; state.nick = null; state.nickOk = false;
    state.pkg = null; state.payGroup = null; state.payMethod = null;
    state.discCode = ''; state.discAmt = 0; state.wa = ''; state.finalPrice = 0;

    renderFlow();
    showOv();
    return true;
  }

  var openDetailOrig = null;
  var buyProductOrig = null;

  function patchedOpenDetail(pid) {
    if (openTopupFlow(pid)) return;
    if (openDetailOrig) { try { openDetailOrig(pid); } catch (e) {} }
  }
  function patchedBuyProduct(pid) {
    if (openTopupFlow(pid, 'buy')) return;
    if (buyProductOrig) { try { buyProductOrig(pid); } catch (e) {} }
  }

  function installOverrides() {
    try {
      openDetailOrig = window.openDetail;
      buyProductOrig = window.buyProduct;
      window.openDetail = patchedOpenDetail;
      window.buyProduct = patchedBuyProduct;
      try { console.log('%c⚡ JK ADISTORE TOPUP FLOW v2 LG-595 PKG-FIRST aktif', 'color:#ff00bb;font-weight:900'); } catch (e) {}
    } catch (e) {
      try { console.warn('[topup] override gagal', e); } catch (e2) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installOverrides);
  } else {
    installOverrides();
  }
})();
