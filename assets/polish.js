/* ============================================================
   JK ADISTORE — polish.js
   Perbaikan kerapian: ikon gambar WebP HD (tanpa emoji),
   kategori produk rapi, grid HP 3 kolom / Desktop 4 kolom.
   Struktur, warna, identitas JK ADISTORE TETAP.
   ============================================================ */
(function () {
  'use strict';
  var IC = 'assets/img/icons/';
  var BAN = 'assets/img/banners/';
  var $id = function (i) { return document.getElementById(i); };

  /* ---------- PETA IKON ---------- */
  var CAT_ICON = {
    'Top Up Game': IC + 'topup-game.webp',
    'Voucher & E-Wallet': IC + 'voucher-ewallet.webp',
    'Aplikasi Premium': IC + 'aplikasi-premium.webp',
    'Akun Khusus': IC + 'shield.webp',
    'Akun MLBB': IC + 'mlbb.webp',
    'Akun Mobile Legends': IC + 'mlbb.webp',
    'Alat Bantu / AI': IC + 'ai.webp',
    'Jasa Digital': IC + 'produk.webp',
    'VPS & Hosting': IC + 'vps-hosting.webp',
    'Domain': IC + 'domain.webp',
    'Lisensi Software': IC + 'key.webp',
    'Voucher Streaming': IC + 'aplikasi-premium.webp',
    'Bot & WhatsApp': IC + 'whatsapp.webp',
    'AI Tools & Token': IC + 'ai.webp',
    'Pulsa & Data': IC + 'voucher-ewallet.webp',
    'PLN & Token': IC + 'voucher-ewallet.webp',
    'PPOB & Tagihan': IC + 'voucher-ewallet.webp',
    'Voucher Crypto': IC + 'voucher-ewallet.webp',
    'Aset Desain': IC + 'produk.webp',
    'E-Book & Course': IC + 'produk.webp',
    'Layanan SMM': IC + 'chart.webp',
    'Sertifikat Digital': IC + 'shield.webp',
    'VPN Premium': IC + 'shield.webp',
    'Layanan Game & Joki': IC + 'topup-game.webp',
    'Scrip & Tools Game': IC + 'topup-game.webp'
  };
  var KW_ICON = [
    [/mobile legends|mlbb|magic chess/i, IC + 'mlbb.webp'],
    [/free fire|ff diamond/i, IC + 'freefire.webp'],
    [/roblox|robux/i, IC + 'roblox.webp'],
    [/whatsapp|wa /i, IC + 'whatsapp.webp'],
    [/instagram|ig /i, IC + 'instagram.webp'],
    [/pubg/i, IC + 'topup-game.webp'],
    [/genshin/i, IC + 'topup-game.webp'],
    [/valorant/i, IC + 'topup-game.webp'],
    [/steam/i, IC + 'topup-game.webp'],
    [/vpn|nordvpn|expressvpn/i, IC + 'shield.webp'],
    [/vps|hosting|server|cloud/i, IC + 'vps-hosting.webp'],
    [/domain/i, IC + 'domain.webp'],
    [/spotify|youtube|netflix|disney|vidio|wetv|iqiyi|crunchyroll|hbo|canva|capcut|telegram premium|adobe|microsoft|zoom|duolingo|grammarly|picsart|alight|bstation/i, IC + 'aplikasi-premium.webp'],
    [/chatgpt|claude|midjourney|openai|gemini|perplexity|ai|bot|tools/i, IC + 'ai.webp'],
    [/dana|ovo|gopay|shopeepay|linkaja|grab|pulsa|token|pln|pdam|bpjs|indihome|tagihan|voucher|google play|razer|binance|crypto/i, IC + 'voucher-ewallet.webp'],
    [/akun|warlit|joki|rank|rw /i, IC + 'mlbb.webp'],
    [/smm|follower|like|views|subscriber/i, IC + 'chart.webp'],
    [/scrip|script|scrape|sender|responder/i, IC + 'topup-game.webp'],
    [/domain|\.com|\.id|\.net/i, IC + 'domain.webp'],
    [/lisensi|license|windows|office|winrar|idm|smadav|fl studio|sublime|jetbrains/i, IC + 'key.webp'],
    [/jasa|desain|logo|banner|edit|seo|admin|website|mockup|template|font|vector|lottie|e-book|ebook|course/i, IC + 'produk.webp']
  ];

  function iconFor(name, cat) {
    if (cat && CAT_ICON[cat]) return CAT_ICON[cat];
    for (var i = 0; i < KW_ICON.length; i++) {
      if (KW_ICON[i][0].test(name)) return KW_ICON[i][1];
    }
    return IC + 'produk.webp';
  }
  function icImg(src, cls) {
    return '<img class="jk-ic' + (cls ? ' ' + cls : '') + '" src="' + src + '" alt="" loading="lazy">';
  }

  /* ---------- 1) REBUILD HEADING + KATEGORI PRODUK ---------- */
  function buildCategoryGrid() {
    var shop = $id('shop');
    if (!shop) return;
    var head = shop.querySelector('.sh-head');
    if (!head) return;

    /* Judul: "Kategori Produk" (menggantikan "Pilih Game Dulu" / "Pilih Produk Favoritmu") */
    var h2 = head.querySelector('h2');
    if (h2) {
      h2.id = 'jkShopTitle';
      h2.innerHTML = '<img class="jk-cat-title-ic" src="' + IC + 'produk.webp" alt="">Kategori Produk';
    }

    /* Sisipkan grid kategori sebelum chips filter lama */
    if (!$id('jkCatGrid')) {
      var wrap = document.createElement('div');
      wrap.id = 'jkCatWrap';
      wrap.className = 'jk-cat-section';
      var cats = ['Semua'].concat(
        (typeof db !== 'undefined' && db.cats ? db.cats : Object.keys(CAT_ICON)).slice()
      );
      var gridHTML = '<div class="jk-cat-sub">Pilih kategori untuk melihat produk tersedia</div>' +
        '<div class="jk-cat-grid" id="jkCatGrid">';
      cats.forEach(function (c) {
        var ic = c === 'Semua' ? IC + 'produk.webp' : (CAT_ICON[c] || iconFor(c, ''));
        var label = c === 'Semua' ? 'Semua Produk' : c;
        gridHTML += '<div class="jk-cat-card' + (c === 'Semua' ? ' active' : '') + '" data-cat="' + String(c).replace(/"/g, '&quot;') + '">' +
          '<img class="jk-cat-ic" src="' + ic + '" alt="" loading="lazy">' +
          '<span class="jk-cat-name">' + label + '</span></div>';
      });
      gridHTML += '</div>';
      wrap.innerHTML = gridHTML;
      var chips = $id('catChips');
      if (chips && chips.parentNode) {
        chips.parentNode.insertBefore(wrap, chips);
      } else {
        head.after(wrap);
      }
      wrap.addEventListener('click', function (e) {
        var card = e.target.closest('.jk-cat-card');
        if (!card) return;
        var cat = card.getAttribute('data-cat');
        if (typeof setCat === 'function') setCat(cat);
        wrap.querySelectorAll('.jk-cat-card').forEach(function (el) {
          el.classList.toggle('active', el === card);
        });
      });
    } else {
      /* refresh status aktif */
      var active = typeof selectedCat !== 'undefined' ? selectedCat : 'Semua';
      document.querySelectorAll('.jk-cat-card').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-cat') === active);
      });
    }

    /* Judul dinamis saat kategori dipilih tetap profesional (tanpa "Pilih Game Dulu") */
    var t = $id('jkShopTitle');
    if (t) {
      var sc = (typeof selectedCat !== 'undefined' && selectedCat) ? selectedCat : 'Semua';
      var icon = sc === 'Semua' ? IC + 'produk.webp' : (CAT_ICON[sc] || iconFor(sc, ''));
      t.innerHTML = '<img class="jk-cat-title-ic" src="' + icon + '" alt="">' +
        (sc === 'Semua' ? 'Kategori Produk' : sc);
    }
  }

  /* ---------- 2) OVERRIDE HEADING GAMES.JS (hapus "Pilih Game Dulu") ---------- */
  function patchGamesHeading() {
    try {
      var h = document.querySelector('#shop .sh-head h2');
      if (h && !h.id) buildCategoryGrid();
    } catch (e) {}
    /* games.js lama memanggil setGameHeading → judul "Pilih Game Dulu".
       Kunci: override setGameHeading dengan versi tanpa emoji & tetap rapi. */
    try {
      window.setGameHeading = function () { buildCategoryGrid(); };
    } catch (e) {}
  }

  /* ---------- 3) FITUR LAYANAN PREMIUM → IKON GAMBAR ---------- */
  function patchFeatures() {
    if (typeof iconFrom === 'undefined') return;
    window.iconFrom = function (name) {
      return icImg(iconFor(name, ''), 'lg');
    };
    var fg = $id('featureGrid');
    if (fg) {
      /* re-render dengan ikon gambar */
      try {
        var list = (typeof STORE !== 'undefined' && STORE.featuredList) || [];
        fg.innerHTML = list.map(function (f) {
          return '<div class="feature-tile"><div class="ic">' + icImg(iconFor(f, ''), '') + '</div><b>' + String(f).replace(/[^\x20-\x7E\xA0-\u024F]/g, '') + '</b><small>Ready stock</small></div>';
        }).join('');
      } catch (e) {}
    }
    /* worldList: hapus emoji di awal label */
    try {
      if (typeof STORE !== 'undefined' && STORE.worldList) {
        STORE.worldList = STORE.worldList.map(function (w) {
          return String(w).replace(/^[\u2190-\u21FF\u2300-\u23FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\uD83C-\uDFFF\u200D]+\s*/, '');
        });
      }
    } catch (e) {}
    /* marquee tanpa ✦ */
    var mt = $id('marqueeTrack');
    if (mt) {
      mt.querySelectorAll('span').forEach(function (s) {
        s.textContent = s.textContent.replace(/^[^\x20-\x7E\xA0-\u024F]+\s*/, '');
      });
    }
  }

  /* ---------- 4) TOMBOL & HEADING HTML: EMOJI → IKON GAMBAR ---------- */
  var BTN_ICON = [
    { re: /(?:🛍|📦|🏪).*?produk|lihat produk|lihat semua produk/i, ic: 'produk.webp' },
    { re: /tanya ai|assistai|ai/i, ic: 'ai.webp' },
    { re: /kontak|chat/i, ic: 'kontak.webp' },
    { re: /top up|topup|saldo/i, ic: 'topup.webp' },
    { re: /ulasan|rating|testi/i, ic: 'star-filled.webp' },
    { re: /masuk|daftar|login|register/i, ic: 'lock.webp' },
    { re: /panel|admin|pengaturan|settings/i, ic: 'gear.webp' },
    { re: /profil|akun saya/i, ic: 'user.webp' },
    { re: /cari|search/i, ic: 'search.webp' },
    { re: /beli|order|pesan/i, ic: 'produk.webp' },
    { re: /detail|lihat/i, ic: 'arrow-right.webp' },
    { re: /tampilkan|load|lebih/i, ic: 'arrow-down.webp' },
    { re: /reset/i, ic: 'refresh2.webp' },
    { re: /hapus|delete|remove|batal|cancel/i, ic: 'close.webp' },
    { re: /tutup|close|keluar|logout|keluar akun/i, ic: 'close.webp' },
    { re: /simpan|save|tambah|add|edit|ubah/i, ic: 'pencil.webp' },
    { re: /verifikasi|aman|sah|resmi|terverifikasi/i, ic: 'shield.webp' },
    { re: /unduh|download|pasang|instal/i, ic: 'download.webp' },
    { re: /beranda|utama|home/i, ic: 'domain.webp' }
  ];

  function btnIcon(text) {
    var t = String(text).toLowerCase();
    for (var i = 0; i < BTN_ICON.length; i++) {
      if (BTN_ICON[i].re.test(t)) return IC + BTN_ICON[i].ic;
    }
    return null;
  }

  /* Emoji & simbol teks yang harus hilang dari tampilan */
  var EMOJI_RE = /[\u203C\u2049\u20E3\u2122\u2139\u2194-\u21AA\u231A-\u23FA\u24C2\u25AA-\u25FE\u2600-\u27BF\u2934\u2935\u2B00-\u2BFF\u3030\u303D\u3297\u3299\uFE0F\u{1F000}-\u{1FAFF}\u{200D}]/u;

  function stripEmoji(s) {
    return String(s).replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim();
  }

  function replaceButtonIcons() {
    document.querySelectorAll('button, .btn, a.btn, .chip').forEach(function (el) {
      if (el.dataset.jkIcDone) return;
      var txt = el.textContent || '';
      if (!txt.trim()) return;
      var m = txt.match(EMOJI_RE);
      if (!m) return;
      var clean = stripEmoji(txt);
      if (!clean) return;
      var icon = btnIcon(clean) || IC + 'produk.webp';
      /* pertahankan onclick/atribut, hanya ganti isi teks */
      el.dataset.jkIcDone = '1';
      var hadIcon = false;
      el.childNodes.forEach(function (n) {
        if (n.nodeType === 3 && EMOJI_RE.test(n.textContent)) {
          hadIcon = true;
        }
      });
      if (hadIcon || m) {
        el.innerHTML = icImg(icon, 'sm') + '<span>' + clean.replace(/</g, '&lt;') + '</span>';
      }
    });
  }

  function replaceHeadingIcons() {
    document.querySelectorAll('.sh-head h2, .mhead h2, h2, h3.jk-title').forEach(function (el) {
      if (el.dataset.jkHDone) return;
      var t = el.textContent || '';
      if (!EMOJI_RE.test(t)) return;
      var clean = stripEmoji(t);
      if (!clean) return;
      el.dataset.jkHDone = '1';
      var icon = btnIcon(clean) || IC + 'produk.webp';
      el.innerHTML = icImg(icon) + '<span>' + clean.replace(/</g, '&lt;') + '</span>';
    });
  }

  /* Ikon pada tombol besar hero */
  function patchHeroButtons() {
    var btns = document.querySelectorAll('#heroBtns .btn, .hero-actions .btn, #home .btn');
    btns.forEach(function (b) {
      var t = b.textContent || '';
      if (!EMOJI_RE.test(t)) return;
      var clean = stripEmoji(t);
      var ic = btnIcon(clean) || IC + 'produk.webp';
      b.innerHTML = icImg(ic, 'sm') + '<span>' + clean + '</span>';
    });
  }

  /* ---------- 5) NAV SOSIAL & LINKHUB ---------- */
  function patchSocials() {
    /* social bubbles: ikon gambar */
    document.querySelectorAll('.social-bubble').forEach(function (a) {
      var nm = (a.getAttribute('title') || a.textContent || '').toLowerCase();
      var ic = /whatsapp/.test(nm) ? 'whatsapp.webp' : /instagram/.test(nm) ? 'instagram.webp' : /youtube/.test(nm) ? 'aplikasi-premium.webp' : /tiktok|music/.test(nm) ? 'aplikasi-premium.webp' : /facebook/.test(nm) ? 'domain.webp' : /telegram/.test(nm) ? 'kontak.webp' : /email|mail/.test(nm) ? 'kontak.webp' : /kontak|link/.test(nm) ? 'kontak.webp' : 'domain.webp';
      a.innerHTML = icImg(IC + ic);
    });
    /* linkhub rows */
    document.querySelectorAll('.linkhub-row').forEach(function (r) {
      var ic = r.querySelector('.linkhub-row-ic');
      var nm = (r.textContent || '').toLowerCase();
      if (ic) {
        var src = /whatsapp/.test(nm) ? 'whatsapp.webp' : /instagram/.test(nm) ? 'instagram.webp' : /youtube/.test(nm) ? 'aplikasi-premium.webp' : /tiktok/.test(nm) ? 'aplikasi-premium.webp' : /website|utama/.test(nm) ? 'domain.webp' : 'kontak.webp';
        ic.innerHTML = icImg(IC + src);
      }
      var go = r.querySelector('.linkhub-row-go');
      if (go && EMOJI_RE.test(go.textContent || '')) go.innerHTML = icImg(IC + 'arrow-right.webp', 'tiny');
    });
    var hubIc = document.querySelector('.linkhub-ic');
    if (hubIc && EMOJI_RE.test(hubIc.textContent || '')) hubIc.innerHTML = icImg(IC + 'domain.webp');
  }

  /* ---------- 6) RATING BINTANG GAMBAR ---------- */
  function patchStars() {
    document.querySelectorAll('.stars').forEach(function (el) {
      if (el.dataset.jkStar) return;
      var stars = (el.textContent.match(/★/g) || []).length;
      if (!stars && !EMOJI_RE.test(el.textContent || '')) return;
      el.dataset.jkStar = '1';
      var html = '';
      for (var i = 0; i < 5; i++) {
        html += icImg(IC + (i < stars ? 'star-filled.webp' : 'star-empty.webp'), 'tiny');
      }
      el.innerHTML = html;
    });
  }

  /* ---------- 7) BANNER SLIDER ---------- */
  function patchSlider() {
    /* Slider arrow jadi gambar */
    document.querySelectorAll('.slider-arrow').forEach(function (b) {
      if (b.dataset.jkArr) return;
      b.dataset.jkArr = '1';
      var left = (b.getAttribute('aria-label') || '').indexOf('prev') === 0 || b.style.left.indexOf('12px') === 0;
      b.innerHTML = icImg(IC + (left ? 'chev-left.webp' : 'chev-right.webp'), 'tiny');
    });
    /* Caption slide profesional */
    document.querySelectorAll('.slide-caption').forEach(function (c) {
      var t = c.textContent || '';
      if (!t.trim() || c.dataset.jkCap) return;
      c.dataset.jkCap = '1';
      var clean = stripEmoji(t);
      if (!clean) return;
      var first = clean.split(/[\u2022|·]/)[0].trim();
      c.innerHTML = '<span class="jk-slide-eyebrow">JK ADISTORE</span>' +
        '<div class="jk-slide-title">' + first.replace(/</g, '&lt;') + '</div>' +
        '<div class="jk-slide-sub">Proses cepat, aman, dan terpercaya sejak 2023.</div>';
    });
  }

  /* Banner default → gambar produk sendiri (WebP HD) */
  function patchDefaultSlides() {
    try {
      if (typeof STORE === 'undefined' || !db) return;
      var defImgs = [BAN + 'banner1.webp', BAN + 'banner2.webp', BAN + 'banner3.webp'];
      var caps = ['Top Up Game Termurah', 'Voucher & Aplikasi Premium', 'Semua Kebutuhan Digital'];
      var need = !db.slides || !db.slides.length || /picsum/.test(db.slides[0] && db.slides[0].img);
      if (need) {
        db.slides = defImgs.map(function (im, i) {
          return { img: im, cap: caps[i], link: '' };
        });
        try { localStorage.setItem('jka_db_v3', JSON.stringify(db)); } catch (e) {}
        if (typeof renderSlider === 'function') { renderSlider(); if (typeof resetSliderTimer === 'function') resetSliderTimer(); }
      }
      /* gambar hero logo/avatar lokal bila masih picsum */
      ['logo', 'avatar'].forEach(function (k) {
        if (STORE[k] && /picsum/.test(STORE[k])) {
          STORE[k] = 'assets/img/logo.png';
        }
      });
      if (STORE.ownerPhoto && /picsum/.test(STORE.ownerPhoto)) STORE.ownerPhoto = 'assets/img/logo.png';
    } catch (e) {}
  }

  /* ---------- 8) TOPUP/DETAIL MODAL: IKON & JUDUL ---------- */
  function patchModals() {
    /* close-x jadi gambar */
    document.querySelectorAll('.close-x').forEach(function (b) {
      if (b.dataset.jkCx) return;
      b.dataset.jkCx = '1';
      b.innerHTML = icImg(IC + 'close.webp', 'tiny');
    });
    /* label Pilih Paket tetap, tombol paket tanpa emoji */
    document.querySelectorAll('.pl-item').forEach(function (p) {
      var t = p.textContent || '';
      if (EMOJI_RE.test(t)) {
        p.querySelector('.pl-name').textContent = stripEmoji(p.querySelector('.pl-name').textContent);
      }
    });
    /* tombol aksi umum di modal */
    replaceButtonIcons();
  }

  /* ---------- 9) STAT HERO & WIDGET LAIN ---------- */
  function patchMisc() {
    /* Ganti teks emoji sisa di elemen stat/label umum */
    document.querySelectorAll('.stat-chip small, .muted, .label, .jk-slide-sub').forEach(function (el) {
      var t = el.textContent || '';
      if (EMOJI_RE.test(t)) el.textContent = stripEmoji(t);
    });
    /* hero tagline */
    var ht = $id('heroTagline');
    if (ht && EMOJI_RE.test(ht.textContent || '')) ht.textContent = stripEmoji(ht.textContent);
    /* clock-block emoji */
    document.querySelectorAll('.clock-block, .brand-row').forEach(function (el) {
      var t = el.textContent || '';
      if (EMOJI_RE.test(t)) {
        el.childNodes.forEach(function (n) {
          if (n.nodeType === 3 && EMOJI_RE.test(n.textContent)) n.textContent = stripEmoji(n.textContent);
        });
      }
    });
    /* gambar produk error fallback */
    document.querySelectorAll('.card-imgbox img').forEach(function (img) {
      img.loading = 'lazy';
      img.onerror = function () { this.onerror = null; this.src = IC + 'produk.webp'; };
    });
  }

  /* ---------- 10) SWEEP: HAPUS SEMUA EMOJI TERSISA ---------- */
  function sweepAll() {
    /* Node teks umum (bukan script/style/textarea) */
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tn = p.nodeName;
        if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'TEXTAREA' || tn === 'INPUT') return NodeFilter.FILTER_REJECT;
        return EMOJI_RE.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var t = stripEmoji(n.textContent);
      if (t) n.textContent = t;
      else if (n.parentNode) n.parentNode.removeChild(n);
    });
    /* placeholder input */
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function (i) {
      if (EMOJI_RE.test(i.placeholder)) i.placeholder = stripEmoji(i.placeholder);
    });
    /* title dokumen */
    if (EMOJI_RE.test(document.title)) document.title = stripEmoji(document.title);
  }

  /* ---------- OBSERVER: TANGKAP RENDER DINAMIS (produk/chips/modal/topup) ---------- */
  var mo = null;
  function startObserver() {
    if (!window.MutationObserver) return;
    mo = new MutationObserver(function (muts) {
      var check = false;
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length) { check = true; break; }
      }
      if (!check) return;
      /* debounce ringan */
      clearTimeout(startObserver._t);
      startObserver._t = setTimeout(function () {
        try { patchModals(); replaceButtonIcons(); replaceHeadingIcons(); patchStars(); patchSlider(); patchMisc(); sweepAll(); } catch (e) {}
      }, 60);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- BOOT ---------- */
  function runAll() {
    try {
      patchDefaultSlides();
      buildCategoryGrid();
      patchGamesHeading();
      patchFeatures();
      patchHeroButtons();
      patchSocials();
      patchStars();
      patchSlider();
      patchModals();
      replaceButtonIcons();
      replaceHeadingIcons();
      patchMisc();
      sweepAll();
      startObserver();
    } catch (e) { /* fail-safe: jangan ganggu fungsi asli */ }
  }

  /* Jalankan setelah app.js & games.js selesai render awal */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(runAll, 250); });
  } else {
    setTimeout(runAll, 250);
  }
  /* Re-run saat window load penuh (data sync selesai) */
  window.addEventListener('load', function () { setTimeout(runAll, 500); });
  /* Publikasikan untuk re-render manual */
  window.jkPolish = { run: runAll, buildCategoryGrid: buildCategoryGrid, iconFor: iconFor, icImg: icImg };
  /* Sweep emoji yang muncul belakangan (akun user, async render) */
  var sweepCount = 0;
  var sweepTimer = setInterval(function () {
    try { sweepAll(); sweepCount++; } catch (e) {}
    if (sweepCount >= 12) clearInterval(sweepTimer);
  }, 2000);
})();
