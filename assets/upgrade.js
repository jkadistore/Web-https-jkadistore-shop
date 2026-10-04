/* ==================================================================
   JK ADISTORE — UPGRADE MODULE (v4)
   Dimuat SETELAH app.js & shield.js. Override & extend fitur:
   1) Sertifikat: pasang logo resmi (certLogo) dinamis dari STORE
   2) Sistem Pembayaran: pilihan metode (Koin/Transfer Bank/E-Wallet/QRIS)
      + arah WhatsApp kirim bukti + QRIS image
   3) Download QRIS nyata ke perangkat
   4) Download Berkas/Database admin (file nyata terunduh)
   5) PWA: manifest + service worker + install prompt + ikon toko
   ================================================================== */
(function () {
  'use strict';

  /* ---------- Konfigurasi aset ---------- */
  var QRIS_URL = 'assets/img/qris.jpg?v=qris2026b';
  var QRIS_REMOTE = 'https://cdn.corenexis.com/f/kuOrIZwGtfJ.jpg';
  var LOGO_URL = 'assets/img/logo.png';
  /* Nomor WhatsApp toko untuk kirim bukti pembayaran */
  function waNumber() {
    try {
      var s = (window.STORE && STORE.contactInfo && STORE.contactInfo.phone) || '';
      s = String(s).replace(/[^\d]/g, '');
      if (s.indexOf('0') === 0) s = '62' + s.slice(1);
      if (s.indexOf('62') !== 0 && s.length >= 9) s = '62' + s;
      return s || '628991232005';
    } catch (e) { return '628991232005'; }
  }

  /* ---------- Helper lokal (tidak ganggu app.js) ---------- */
  var $u = function (id) { return document.getElementById(id); };
  function toastU(msg) { try { toast(msg); } catch (e) { var t = $u('toast'); if (t) { t.innerHTML = msg; t.classList.add('show'); clearTimeout(t._tu); t._tu = setTimeout(function () { t.classList.remove('show'); }, 2400); } } }
  function fmtU(n) { try { return fmtRp(n); } catch (e) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); } }
  function escU(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ==================================================================
     6) OPTIMASI GAMBAR PRODUK (URL-based) — anti-lag + tetap tajam
     ------------------------------------------------------------------
     • optImg(url, w): route URL eksternal ke wsrv.nl (CDN gambar gratis,
       resize + kompres ke WebP). Foto 2000px 2MB → 400px ~9KB. Tajam,
       tidak pecah, loading cepat walau 240+ produk.
     • URL lokal/relatif (assets/...) & data: dilewatkan apa adanya.
     • Blur-up placeholder + fade-in halus, decoding async.
     • Patch productCardHTML & openDetail agar semua <img> produk
       otomatis dioptimasi tanpa mengubah app.js.
     ================================================================== */
  var IMG_PROXY = 'https://wsrv.nl/';
  /* Ukuran output: kartu ~185-380px tampil, retina 2x → 400px cukup tajam.
     Detail modal butuh lebih besar (800px) untuk zoom jelas. */
  var CARD_W = 400, DETAIL_W = 800;

  function isLocalImg(u) {
    if (!u) return true;
    u = String(u);
    if (u.indexOf('data:') === 0) return true;
    if (u.indexOf('blob:') === 0) return true;
    /* Punya protokol http(s):// atau // ? → eksternal. Sisanya lokal/relatif. */
    if (/^(https?:)?\/\//i.test(u)) return false;
    return true;  /* path relatif: assets/..., ./..., /..., dll */
  }
  /* picsum.photos & wsrv sudah optimal — tetap pakai apa adanya tapi
     pastikan ukuran kecil agar tidak lag. */
  function isAlreadyOpt(u) {
    u = String(u);
    return u.indexOf(IMG_PROXY) === 0 || u.indexOf('picsum.photos') !== -1;
  }

  function optImg(url, width) {
    try {
      if (!url) return '';
      url = String(url).trim();
      if (!url) return '';
      if (isLocalImg(url)) return url;           // aset lokal / data URI
      if (isAlreadyOpt(url)) return url;          // sudah dioptimasi
      /* Normalisasi: buang protokol (wsrv butuh tanpa //), encode. */
      var clean = url.replace(/^https?:\/\//, '');
      var params =
        '?url=' + encodeURIComponent(clean) +
        '&w=' + (width || CARD_W) +
        '&output=webp' +     // format paling efisien (didukung semua browser modern)
        '&q=82' +            // kualitas tinggi — tajam, tidak pecah
        '&we=1' +            // encode ulang efisien
        '&il';               // interlace progressive — render bertahap halus
      return IMG_PROXY + params;
    } catch (e) { return url; }
  }

  /* ---------- Blur-up wrapper: kartu produk ---------- */
  /* Ganti <img src=X loading=lazy onerror=...> hasil productCardHTML
     menjadi struktur optimized. Kita patch fungsi asli. */
  var _origCardHTML = window.productCardHTML;
  function patchedCardHTML(p) {
    var html;
    try { html = _origCardHTML(p); } catch (e) { return ''; }
    if (!html) return '';
    try {
      /* Bungkus src gambar produk: ganti src asli → optImg(card),
         tambah decoding=async & class lazy. onerror fallback tetap.
         onload → tandai loaded (fade-in dari blur). */
      var optSrc = optImg(p && p.img, CARD_W);
      html = html
        .replace(/(<img[^>]*?)\ssrc="/i, '$1 data-optsrc="' + escU(optSrc) + '" src="' + escU(optSrc) + '" onload="this.classList.add(\'jka-img-loaded\')" ')
        .replace(/(<img[^>]*?)\sloading="lazy"/i, '$1 loading="lazy" decoding="async" class="jka-lazyimg"');
      /* Tambah class untuk blur-up: bungkus imgbox. */
      html = html.replace('class="card-imgbox"', 'class="card-imgbox jka-imgbox-opt"');
    } catch (e) {}
    return html;
  }
  /* Patch seketika setelah app.js siap */
  function applyCardPatch() {
    if (window.productCardHTML) {
      _origCardHTML = window.productCardHTML;
      window.productCardHTML = patchedCardHTML;
    }
  }

  /* ---------- Detail modal: gambar besar tetap dioptimasi ---------- */
  var _origOpenDetail = window.openDetail;
  function patchedOpenDetail(id) {
    try { _origOpenDetail(id); } catch (e) { return; }
    /* Setelah modal terisi, ganti src dImg → versi besar optimized. */
    setTimeout(function () {
      try {
        var p = (window.db && db.products) ? db.products.filter(function (x) { return x.id == id; })[0] : null;
        if (!p || !p.img) return;
        var dImg = $u('dImg');
        if (dImg) {
          var big = optImg(p.img, DETAIL_W);
          dImg.setAttribute('data-optsrc', big);
          dImg.decoding = 'async';
          /* Load halus: preload lalu swap. */
          var pre = new Image();
          pre.onload = function () { dImg.src = big; };
          pre.onerror = function () { /* biarkan src asli */ };
          pre.src = big;
        }
      } catch (e) {}
    }, 30);
  }

  /* ---------- Lazy enhancement via IntersectionObserver ---------- */
  var _imgObserver = null;
  function setupImgObserver() {
    try {
      if (!('IntersectionObserver' in window)) return;
      _imgObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var img = en.target;
          /* Sudah ada src optimized → tandai loaded (fade-in). */
          if (img.classList) {
            img.classList.add('jka-img-loaded');
          }
          _imgObserver.unobserve(img);
        });
      }, { rootMargin: '120px 0px', threshold: 0.01 });
    } catch (e) {}
  }
  /* Observe semua gambar produk baru setiap render. */
  function observeProductImgs() {
    try {
      if (!_imgObserver) setupImgObserver();
      if (!_imgObserver) return;
      var imgs = document.querySelectorAll('#productGrid .jka-lazyimg:not(.jka-img-obs)');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].classList.add('jka-img-obs');
        _imgObserver.observe(imgs[i]);
      }
    } catch (e) {}
  }
  /* Hook renderProducts & loadMore agar observer jalan ulang. */
  var _origRender = window.renderProducts;
  var _origLoadMore = window.loadMore;
  function applyRenderHooks() {
    if (window.renderProducts) {
      _origRender = window.renderProducts;
      window.renderProducts = function (q) {
        _origRender(q);
        setTimeout(observeProductImgs, 40);
      };
    }
    if (window.loadMore) {
      _origLoadMore = window.loadMore;
      window.loadMore = function () {
        _origLoadMore();
        setTimeout(observeProductImgs, 40);
      };
    }
  }

  /* ---------- Definisi metode pembayaran ---------- */
  var PAY_METHODS = [
    { id: 'coin', icon: '💰', name: 'Saldo / Koin', sub: 'Potong saldo otomatis', type: 'coin' },
    { id: 'bank', icon: '🏦', name: 'Transfer Bank', sub: 'BCA / Mandiri / BRI / BNI', type: 'bank' },
    { id: 'ewallet', icon: '💳', name: 'E-Wallet', sub: 'DANA, GoPay, OVO, ShopeePay', type: 'ewallet' },
    { id: 'qris', icon: '📱', name: 'QRIS', sub: 'Scan & bayar semua app', type: 'qris' }
  ];

  var BANK_ACCOUNTS = [
    { bank: 'BCA', number: '8210345678', name: 'JK ADISTORE' },
    { bank: 'Mandiri', number: '1350098765432', name: 'JK ADISTORE' },
    { bank: 'BRI', number: '032101050555100', name: 'JK ADISTORE' },
    { bank: 'BNI', number: '0987654321', name: 'JK ADISTORE' }
  ];
  var EWALLETS = [
    { app: 'DANA', number: '0812-3456-7890', name: 'JK ADISTORE' },
    { app: 'GoPay', number: '0812-3456-7890', name: 'JK ADISTORE' },
    { app: 'OVO', number: '0812-3456-7890', name: 'JK ADISTORE' },
    { app: 'ShopeePay', number: '0812-3456-7890', name: 'JK ADISTORE' }
  ];

  /* ---------- State pembayaran ---------- */
  var payCtx = { amount: 0, item: '', qty: 1, productId: null, selectedMethod: null, mode: '' };

  /* ==================================================================
     1) SERTIFIKAT — pasang certLogo dari STORE saat applyStore
     ================================================================== */
  var _origApplyStore = window.applyStore;
  // Jika logo toko masih placeholder (picsum/seed), pakai logo resmi lokal
  function resolveLogo() {
    if (STORE && STORE.logo && !/picsum|placeholder|seed\//i.test(STORE.logo)) return STORE.logo;
    return LOGO_URL;
  }
  function patchedApplyStore() {
    if (_origApplyStore) _origApplyStore();
    try {
      var logoSrc = resolveLogo();
      var cl = $u('certLogo');
      var cvl = document.querySelector('.cert-verify-logo');
      if (cl) cl.src = logoSrc;
      if (cvl) cvl.src = logoSrc;
    } catch (e) {}
  }
  window.applyStore = patchedApplyStore;

  /* ==================================================================
     2) PEMBAYARAN — render grid metode
     ================================================================== */
  function renderMethodGrid(containerId, onPick) {
    var box = $u(containerId);
    if (!box) return;
    var html = '';
    PAY_METHODS.forEach(function (m) {
      var disabled = '';
      if (m.type === 'coin' && payCtx.mode === 'topup') disabled = ' style="opacity:.4;pointer-events:none"';
      html += '<button class="pay-method-item" data-mid="' + m.id + '"' + disabled + ' onclick="' + onPick + '(\'' + m.id + '\')">' +
        '<span class="pmi-icon">' + m.icon + '</span>' +
        '<span class="pmi-meta"><span>' + escU(m.name) + '</span><span class="pmi-sub">' + escU(m.sub) + '</span></span>' +
        '</button>';
    });
    box.innerHTML = html;
  }

  function findMethod(id) { return PAY_METHODS.filter(function (m) { return m.id === id; })[0]; }

  function buildMethodDetail(methodId, amount, item) {
    var m = findMethod(methodId);
    if (!m) return '';
    var h = '';
    if (m.type === 'coin') {
      var bal = (db.session && db.session.coins) || 0;
      h += '<div class="pdb-title">💰 Bayar pakai Saldo</div>';
      h += '<div class="pdb-row"><span>Saldo sekarang</span><b>' + fmtU(bal) + '</b></div>';
      h += '<div class="pdb-row"><span>Total bayar</span><b>' + fmtU(amount) + '</b></div>';
      if (bal < amount) {
        h += '<div style="color:var(--err);font-weight:800;margin-top:6px">⚠ Saldo tidak cukup. Pilih metode lain atau top up dulu.</div>';
      } else {
        h += '<div style="color:var(--ok);font-weight:800;margin-top:6px">Saldo cukup. Klik tombol di bawah untuk konfirmasi.</div>';
      }
    } else if (m.type === 'bank') {
      h += '<div class="pdb-title">🏦 Transfer ke salah satu rekening</div>';
      BANK_ACCOUNTS.forEach(function (b) {
        h += '<div class="pdb-row"><span>' + escU(b.bank) + '</span><b>' + escU(b.number) + '</b></div>';
      });
      h += '<div class="pdb-row" style="border-top:1px solid var(--stroke);margin-top:6px;padding-top:6px"><span>Atas nama</span><b>JK ADISTORE</b></div>';
      h += '<div class="pdb-row"><span>Total transfer</span><b>' + fmtU(amount) + '</b></div>';
      h += '<div style="margin-top:8px;color:#96a0cb">Setelah transfer, kirim bukti ke WhatsApp kami. Pesanan diproses setelah bukti diverifikasi.</div>';
    } else if (m.type === 'ewallet') {
      h += '<div class="pdb-title">💳 Transfer ke E-Wallet</div>';
      EWALLETS.forEach(function (w) {
        h += '<div class="pdb-row"><span>' + escU(w.app) + '</span><b>' + escU(w.number) + '</b></div>';
      });
      h += '<div class="pdb-row" style="border-top:1px solid var(--stroke);margin-top:6px;padding-top:6px"><span>Atas nama</span><b>JK ADISTORE</b></div>';
      h += '<div class="pdb-row"><span>Total transfer</span><b>' + fmtU(amount) + '</b></div>';
      h += '<div style="margin-top:8px;color:#96a0cb">Kirim bukti transfer via WhatsApp setelah bayar.</div>';
    } else if (m.type === 'qris') {
      h += '<div class="pdb-title">📱 Scan QRIS untuk bayar</div>';
      h += '<div class="qris-inline"><img src="' + QRIS_URL + '" alt="QRIS" onerror="this.src=\'' + QRIS_REMOTE + '\'"><small>Scan dengan DANA / GoPay / OVO / ShopeePay / m-banking</small></div>';
      h += '<div class="pdb-row" style="margin-top:8px"><span>Total bayar</span><b>' + fmtU(amount) + '</b></div>';
      h += '<button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="downloadQRIS()">⬇ Simpan QRIS ke HP</button>';
    }
    return h;
  }

  /* ---------- Tombol confirm validasi ---------- */
  function updateConfirmBtn(btnId, methodId, amount) {
    var btn = $u(btnId);
    if (!btn) return;
    var m = findMethod(methodId);
    var ok = !!m;
    if (m && m.type === 'coin') {
      var bal = (db.session && db.session.coins) || 0;
      ok = bal >= amount;
    }
    btn.disabled = !ok;
    if (m && m.type === 'coin' && payCtx.mode === 'topup') ok = false, btn.disabled = true;
  }

  /* ---------- Pilih metode di PAYMENT modal (beli produk) ---------- */
  window.pickPayMethod = function (id) {
    payCtx.selectedMethod = id;
    document.querySelectorAll('#payMethodGrid .pay-method-item').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-mid') === id); });
    var det = $u('payMethodDetail');
    det.innerHTML = buildMethodDetail(id, payCtx.amount, payCtx.item);
    det.style.display = 'block';
    var btn = $u('payConfirmBtn');
    var m = findMethod(id);
    if (m && m.type === 'coin') btn.textContent = '✅ Bayar pakai Saldo & Proses';
    else btn.textContent = '📤 Bayar & Kirim Bukti via WhatsApp';
    updateConfirmBtn('payConfirmBtn', id, payCtx.amount);
  };

  /* ---------- Pilih metode di TOPUP modal ---------- */
  window.pickTopupMethod = function (id) {
    payCtx.selectedMethod = id;
    document.querySelectorAll('#topupMethodGrid .pay-method-item').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-mid') === id); });
    var amt = +($u('topupAmount') && $u('topupAmount').value) || 0;
    var det = $u('topupMethodDetail');
    det.innerHTML = buildMethodDetail(id, amt, 'Top Up Saldo ' + fmtU(amt));
    det.style.display = 'block';
    var btn = $u('topupConfirmBtn');
    var m = findMethod(id);
    btn.textContent = (m && m.type === 'qris') ? '✅ Saya sudah scan QRIS → Saldo masuk' : '📤 Bayar & Kirim Bukti via WhatsApp';
    // untuk topup: coin tidak relevan, semua metode valid (saldo masuk setelah konfirmasi WA)
    btn.disabled = !m || m.type === 'coin';
  };

  /* ==================================================================
     2b) OVERRIDE buyProduct — tampilkan modal pilihan metode
     ================================================================== */
  window.buyProduct = function (pid) {
    if (!db.session) { try { toast('Silakan masuk / daftar dulu'); modalShow('authModal'); } catch (e) {} return; }
    var p = db.products.filter(function (x) { return x.id == pid; })[0];
    if (!p) return;
    if (+p.stok <= 0) { try { toast('Stok habis. Hubungi toko via kontak ya 🙏'); } catch (e) {} return; }
    var qty = Math.max(1, parseInt(($u('dQty') && $u('dQty').value) || 1));
    var price = p.price, pkgName = '';
    var pkgIdx = $u('dName') && $u('dName').dataset.pkgIdx;
    if (pkgIdx !== undefined && pkgIdx !== '' && p.priceList && p.priceList[+pkgIdx]) {
      price = p.priceList[+pkgIdx].price; pkgName = ' (' + p.priceList[+pkgIdx].name + ')';
    }
    var total = price * qty;
    payCtx = { amount: total, item: qty + 'x ' + p.name + pkgName, qty: qty, productId: pid, selectedMethod: null, mode: 'buy', productObj: p };
    // summary
    $u('paymentSummary').innerHTML =
      '<div class="ps-item"><span>Produk</span><span>' + escU(payCtx.item) + '</span></div>' +
      '<div class="ps-item"><span>Jumlah</span><span>' + qty + '</span></div>' +
      '<div class="ps-total"><span>Total</span><span>' + fmtU(total) + '</span></div>';
    renderMethodGrid('payMethodGrid', 'pickPayMethod');
    $u('payMethodDetail').style.display = 'none';
    $u('payMethodDetail').innerHTML = '';
    $u('payConfirmBtn').disabled = true;
    $u('payConfirmBtn').textContent = 'Pilih metode pembayaran dulu';
    try { modalHide('detailModal'); } catch (e) {}
    try { modalShow('paymentModal'); } catch (e) { $u('paymentModal').classList.add('show'); }
  };

  /* ---------- Konfirmasi pembayaran produk ---------- */
  window.confirmPayment = function () {
    var m = findMethod(payCtx.selectedMethod);
    if (!m) { toastU('Pilih metode pembayaran dulu'); return; }
    if (!db.session) { toastU('Silakan login dulu'); return; }
    var p = payCtx.productObj;
    if (!p) return;
    var total = payCtx.amount;
    var qty = payCtx.qty;

    if (m.type === 'coin') {
      var bal = (db.session && db.session.coins) || 0;
      if (bal < total) { toastU('Saldo tidak cukup. Pilih metode lain.'); return; }
      // potong saldo & catat order sukses
      db.session.coins -= total;
      p.stok = Math.max(0, +p.stok - qty);
      p.sold = (p.sold || 0) + qty;
      db.orders.unshift({
        id: (window.uid ? uid() : Date.now()),
        email: db.session.email, name: db.session.name,
        item: payCtx.item, price: total,
        time: new Date().toLocaleString('id-ID'),
        status: 'Berhasil (Saldo)', method: 'Saldo/Koin'
      });
      try { _logSecurity('PURCHASE', db.session.email + ' ' + fmtU(total)); _notifyOwner('PURCHASE', db.session.email + ' bought ' + payCtx.item + ' ' + fmtU(total)); } catch (e) {}
      save(); try { renderProducts(); renderNav(); } catch (e) {}
      try { modalHide('paymentModal'); } catch (e) {}
      toastU('✅ Pesanan berhasil! Saldo: ' + fmtU(db.session.coins));
      return;
    }

    // Metode non-coin: catat order "Menunggu Bukti" lalu arahkan ke WhatsApp
    db.orders.unshift({
      id: (window.uid ? uid() : Date.now()),
      email: db.session.email, name: db.session.name,
      item: payCtx.item, price: total,
      time: new Date().toLocaleString('id-ID'),
      status: 'Menunggu Bukti', method: m.name
    });
    try { _notifyOwner('PAYMENT_PENDING', db.session.email + ' ' + payCtx.item + ' ' + fmtU(total) + ' via ' + m.name); } catch (e) {}
    save();
    try { modalHide('paymentModal'); } catch (e) {}

    // Bangun pesan WhatsApp
    var msg = '*PEMBAYARAN JK ADISTORE*\n\n' +
      'Nama: ' + db.session.name + '\n' +
      'Email: ' + db.session.email + '\n' +
      'Pesanan: ' + payCtx.item + '\n' +
      'Total: ' + fmtU(total) + '\n' +
      'Metode: ' + m.name + '\n\n' +
      'Halo Admin, saya sudah bayar dengan metode *' + m.name + '*. Berikut saya kirimkan bukti pembayaran. Mohon diproses ya 🙏';
    var wa = 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(msg);
    toastU('📤 Mengarahkan ke WhatsApp untuk kirim bukti...');
    setTimeout(function () { window.open(wa, '_blank'); }, 400);
  };

  /* ==================================================================
     2c) OVERRIDE doTopUp — pilihan metode + QRIS + arah WA
     ================================================================== */
  var _origOpenTopup = window.openTopup;
  window.openTopup = function () {
    if (!db.session) { try { openAuth(); } catch (e) {} return; }
    payCtx = { amount: 0, item: '', qty: 1, productId: null, selectedMethod: null, mode: 'topup' };
    try { modalShow('topupModal'); } catch (e) { $u('topupModal').classList.add('show'); }
    // render method grid (exclude coin for topup)
    renderMethodGrid('topupMethodGrid', 'pickTopupMethod');
    $u('topupMethodDetail').style.display = 'none';
    $u('topupMethodDetail').innerHTML = '';
    $u('topupConfirmBtn').disabled = true;
    $u('topupConfirmBtn').textContent = 'Pilih metode pembayaran dulu';
  };

  window.doTopUp = function () {
    if (!db.session) { try { modalShow('authModal'); } catch (e) {} return; }
    var amt = +($u('topupAmount') && $u('topupAmount').value) || 0;
    var m = findMethod(payCtx.selectedMethod);
    if (!m) { toastU('Pilih metode pembayaran dulu'); return; }
    if (m.type === 'coin') { toastU('Pilih metode lain untuk top up'); return; }

    // Untuk QRIS & e-wallet & bank: arahkan WA kirim bukti, lalu saldo masuk setelah verifikasi
    var msg = '*TOP UP SALDO JK ADISTORE*\n\n' +
      'Nama: ' + db.session.name + '\n' +
      'Email: ' + db.session.email + '\n' +
      'Nominal: ' + fmtU(amt) + '\n' +
      'Metode: ' + m.name + '\n\n' +
      'Halo Admin, saya mau top up saldo sebesar *' + fmtU(amt) + '* via *' + m.name + '*. Saya sudah bayar, ini buktinya. Mohon saldo saya ditambahkan ya 🙏';
    var wa = 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(msg);

    // catat order topup pending
    db.orders.unshift({
      id: (window.uid ? uid() : Date.now()),
      email: db.session.email, name: db.session.name,
      item: 'Top Up Saldo ' + fmtU(amt), price: amt,
      time: new Date().toLocaleString('id-ID'),
      status: 'Topup - Menunggu Bukti', type: 'topup', method: m.name
    });
    try { _notifyOwner('TOPUP_PENDING', db.session.email + ' topup ' + fmtU(amt) + ' via ' + m.name); } catch (e) {}
    save();
    try { modalHide('topupModal'); } catch (e) {}
    toastU('📤 Mengarahkan ke WhatsApp... Saldo masuk setelah bukti diverifikasi.');
    setTimeout(function () { window.open(wa, '_blank'); }, 400);
  };

  /* ==================================================================
     3) DOWNLOAD QRIS NYATA ke perangkat
     ================================================================== */
  window.downloadQRIS = function () {
    try {
      var url = QRIS_URL;
      var fname = 'QRIS-Pembayaran-JKADISTORE.jpg';
      // Fetch sebagai blob agar benar-benar tersimpan ke penyimpanan HP
      fetch(url).then(function (r) { return r.blob(); }).then(function (blob) {
        var a = document.createElement('a');
        var objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(objUrl); }, 4000);
        toastU('✅ QRIS tersimpan ke HP Anda!');
      }).catch(function () {
        // fallback: buka tab untuk long-press save (mobile)
        window.open(url, '_blank');
        toastU('Tahan gambar & pilih "Simpan gambar"');
      });
    } catch (e) {
      window.open(QRIS_URL, '_blank');
    }
  };

  /* ==================================================================
     4) DOWNLOAD BERKAS / DATABASE ADMIN (file nyata terunduh)
     ================================================================== */
  // Helper download blob yang reliable (cross-browser, mobile friendly)
  function realDownload(filename, blob, mime) {
    if (!(blob instanceof Blob)) blob = new Blob([blob], { type: mime || 'application/octet-stream' });
    var objUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.rel = 'noopener';
    // iOS Safari fallback
    a.style.display = 'none';
    document.body.appendChild(a);
    var dispatched = false;
    try {
      a.click();
      dispatched = true;
    } catch (e) {}
    if (!dispatched) {
      // fallback: navigasi langsung
      var ev = document.createEvent('MouseEvents');
      ev.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      a.dispatchEvent(ev);
    }
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    }, 5000);
  }

  // Override exportData agar file benar2 terunduh
  window.exportData = function () {
    try {
      var data = { db: db, version: 4, exportedAt: new Date().toISOString() };
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var fname = 'jkadistore-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      realDownload(fname, blob, 'application/json');
      try { toast('⬇ Backup terdownload'); } catch (e) { toastU('⬇ Backup terdownload'); }
    } catch (e) {
      toastU('❌ Gagal export: ' + e.message);
    }
  };

  // Download Berkas: ekspor database sebagai HTML/JSON lengkap untuk upload Cloudflare
  window.downloadBerkas = function () {
    try {
      var ts = new Date().toISOString();
      var data = { db: db, version: 4, exportedAt: ts, storeName: (STORE && STORE.name) || 'JK ADISTORE' };
      var json = JSON.stringify(data, null, 2);
      // 1) JSON backup
      realDownload('jkadistore-database-' + ts.slice(0, 10) + '.json', new Blob([json], { type: 'application/json' }), 'application/json');

      // 2) Berkas HTML ringkasan (bisa di-upload ke Cloudflare Pages)
      var html = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Backup Database ' + escU(data.storeName) + '</title><style>body{font-family:system-ui,Arial,sans-serif;background:#0d1530;color:#e8ecff;padding:24px;line-height:1.6}' +
        'h1{color:#00f0ff}h2{color:#ffd166;border-bottom:1px solid #2a3560;padding-bottom:6px}pre{background:#04061a;border:1px solid #2a3560;padding:14px;border-radius:10px;overflow:auto;font-size:12px;color:#b8c2e8}' +
        '.meta{color:#8f9ac0;font-size:13px}.box{background:#131c38;border:1px solid #2a3560;border-radius:12px;padding:16px;margin:14px 0}</style></head><body>' +
        '<h1>📂 Backup Database ' + escU(data.storeName) + '</h1>' +
        '<div class="meta">Diekspor: ' + escU(ts) + ' &middot; Versi: 4</div>' +
        '<div class="box"><h2>Ringkasan</h2>' +
        '<b>Produk:</b> ' + (db.products ? db.products.length : 0) + ' &middot; ' +
        '<b>Pesanan:</b> ' + (db.orders ? db.orders.length : 0) + ' &middot; ' +
        '<b>Member:</b> ' + (db.users ? db.users.length : 0) + ' &middot; ' +
        '<b>Ulasan:</b> ' + (db.reviews ? db.reviews.length : 0) + '</div>' +
        '<div class="box"><h2>Data JSON Lengkap</h2><pre>' + escU(json) + '</pre></div>' +
        '<div class="meta">File ini berisi seluruh database toko. Simpan & upload ke Cloudflare Pages sebagai cadangan.</div>' +
        '</body></html>';
      setTimeout(function () {
        realDownload('jkadistore-berkas-' + ts.slice(0, 10) + '.html', new Blob([html], { type: 'text/html' }), 'text/html');
      }, 600);

      try { toast('⬇ Berkas database terdownload (JSON + HTML)'); } catch (e) { toastU('⬇ Berkas database terdownload'); }
    } catch (e) {
      toastU('❌ Gagal download berkas: ' + e.message);
    }
  };

  /* ---------- Override adminData: tambah tombol Download Berkas ---------- */
  var _origAdminData = window.adminData;
  window.adminData = function () {
    if (_origAdminData) _origAdminData();
    try {
      var box = $u('adminContent');
      if (!box) return;
      // Inject tombol Download Berkas di card Backup
      var btn = document.createElement('div');
      btn.className = 'admin-card';
      btn.style.marginTop = '12px';
      btn.innerHTML = '<div class="label">📦 Download Berkas / Database (untuk upload Cloudflare)</div>' +
        '<p class="muted" style="font-size:12px;line-height:1.6;margin-bottom:10px">Unduh seluruh data toko dalam bentuk file nyata (JSON + HTML). File tersimpan ke perangkat Anda dan siap di-upload ke Cloudflare Pages.</p>' +
        '<div class="row">' +
        '<button class="btn btn-primary" onclick="downloadBerkas()">📦 Download Berkas (JSON+HTML)</button>' +
        '<button class="btn" onclick="exportData()">⬇ Export JSON saja</button>' +
        '</div>';
      box.appendChild(btn);
    } catch (e) {}
  };

  /* ==================================================================
     5) PWA — manifest inline + service worker + install prompt
     ================================================================== */
  // Link manifest.json (file-based) + meta tags PWA + register service worker di root scope
  function setupPWA() {
    try {
      // Manifest fisik (prioritas — reliable saat di-deploy ke Cloudflare Pages)
      if (!document.querySelector('link[rel="manifest"]')) {
        var link = document.createElement('link');
        link.rel = 'manifest';
        link.href = 'manifest.json';
        document.head.appendChild(link);
      }

      // Apple PWA meta
      var metas = [
        ['apple-mobile-web-app-capable', 'yes'],
        ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
        ['apple-mobile-web-app-title', (window.STORE && STORE.name) || 'JK ADISTORE'],
        ['mobile-web-app-capable', 'yes']
      ];
      metas.forEach(function (p) {
        if (!document.querySelector('meta[name="' + p[0] + '"]')) {
          var m = document.createElement('meta');
          m.name = p[0]; m.content = p[1]; document.head.appendChild(m);
        }
      });
      // Apple touch icon (ikon toko di layar utama — pakai file dedicated 180x180)
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        var ati = document.createElement('link');
        ati.rel = 'apple-touch-icon';
        ati.href = 'assets/img/apple-touch-icon.png';
        ati.setAttribute('sizes', '180x180');
        document.head.appendChild(ati);
      }
      // Favicon (ikon toko — pakai icon 192)
      if (!document.querySelector('link[rel="icon"]')) {
        var fav = document.createElement('link');
        fav.rel = 'icon'; fav.type = 'image/png';
        fav.href = 'assets/img/icon-192.png';
        document.head.appendChild(fav);
      }
    } catch (e) {}

    // Register service worker di root scope (mengontrol seluruh site)
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js?v=20260907').catch(function (err) {
          console.warn('SW register gagal:', err && err.message);
        });
      }
    } catch (e) {}
  }

  /* ---------- Install prompt PWA ---------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    if (window.matchMedia('(display-mode: standalone)').matches) return; // sudah terinstall
    if (sessionStorage.getItem('jka_pwa_dismissed') === '1') return;
    if ($u('pwaInstallBanner')) return;
    var b = document.createElement('div');
    b.id = 'pwaInstallBanner';
    b.innerHTML =
      '<span class="pwa-ic">📲</span>' +
      '<span class="pwa-txt"><b>Pasang JK ADISTORE</b>Install sebagai aplikasi di HP Anda — akses cepat dari layar utama.</span>' +
      '<span class="pwa-btns"><button class="pwa-yes" id="pwaYes">Pasang</button><button class="pwa-no" id="pwaNo">Nanti</button></span>';
    document.body.appendChild(b);
    setTimeout(function () { b.classList.add('show'); }, 800);
    $u('pwaYes').addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; b.classList.remove('show'); });
      } else {
        toastU('📌 Menu browser → "Tambahkan ke Layar Utama" / "Install App"');
      }
      b.classList.remove('show');
    });
    $u('pwaNo').addEventListener('click', function () {
      sessionStorage.setItem('jka_pwa_dismissed', '1');
      b.classList.remove('show');
    });
  }

  window.addEventListener('appinstalled', function () {
    var b = $u('pwaInstallBanner'); if (b) b.classList.remove('show');
    toastU('🎉 Aplikasi JK ADISTORE terpasang!');
  });

  /* ==================================================================
     INIT — jalankan setelah DOM & app.js siap
     ================================================================== */
  function initUpgrade() {
    setupPWA();
    /* Patch optimasi gambar produk (anti-lag, tetap tajam) */
    applyCardPatch();
    applyRenderHooks();
    if (window.openDetail) { _origOpenDetail = window.openDetail; window.openDetail = patchedOpenDetail; }
    setupImgObserver();
    // re-apply store untuk set certLogo
    setTimeout(function () { try { patchedApplyStore(); } catch (e) {} }, 50);
    /* Paksa render ulang produk agar patch optimasi gambar langsung aktif
       di tampilan awal (app.js render duluan sebelum patch terpasang). */
    setTimeout(function () {
      try {
        if (window.renderProducts) { window.renderProducts(); observeProductImgs(); }
      } catch (e) {}
    }, 120);
    // observe gambar produk yang sudah ter-render
    setTimeout(observeProductImgs, 300);
    // topup modal: ketika nominal berubah, refresh detail
    var ta = $u('topupAmount');
    if (ta) {
      ta.addEventListener('change', function () {
        if (payCtx.selectedMethod) window.pickTopupMethod(payCtx.selectedMethod);
      });
    }
    // Tampilkan banner install untuk iOS (tidak support beforeinstallprompt) — petunjuk
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches) {
      if (!sessionStorage.getItem('jka_pwa_dismissed') && !sessionStorage.getItem('jka_ios_hint')) {
        sessionStorage.setItem('jka_ios_hint', '1');
        setTimeout(function () {
          toastU('📲 iOS: Share → "Tambahkan ke Layar Utama" untuk jadi aplikasi');
        }, 2500);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUpgrade);
  } else {
    initUpgrade();
  }

  // Console marker
  try { console.log('%c⚡ JK ADISTORE UPGRADE v4 aktif', 'color:#00f0ff;font-weight:900'); } catch (e) {}
})();
