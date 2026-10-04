/* JK ADISTORE — PILIH GAME v1 (depan = grid game, klik = topup SEMUA paket) */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function dbP() { try { return (typeof db !== 'undefined' && db && db.products) ? db.products : []; } catch (e) { return []; } }
  function isLg(p) { return p && p.cat === 'Top Up Game' && p.slug; }
  function lgList() { return dbP().filter(isLg); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function rp(n) { try { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); } catch (e) { return 'Rp ' + (n || 0); } }

  var H2_GAME = 'Kategori Produk';
  var H2_PROD = 'Pilih Produk Favoritmu';
  function setGameHeading(game) {
    try {
      var h = document.querySelector('#shop .sh-head h2');
      if (h) h.textContent = game ? H2_GAME : H2_PROD;
    } catch (e) {}
  }

  function gameCardHTML(p) {
    var n = (p.priceList && p.priceList.length) || 1;
    var min = p.price;
    try { p.priceList.forEach(function (it) { if (it.price < min) min = it.price; }); } catch (e) {}
    return '<div class="card fadeUp" style="cursor:pointer" onclick="buyProduct(\'' + esc(p.id) + '\')">' +
      '<div class="card-imgbox">' +
      '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'assets/img/logo.png\'">' +
      '<span class="cat-badge">Top Up Game</span>' +
      '</div>' +
      '<div class="p-body">' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<div class="smart-desc">' + n + ' paket tersedia — semua nominal</div>' +
      '<div class="price-row"><span class="price">Mulai ' + rp(min) + '</span></div>' +
      '<div><span class="stock-label">Stok tersedia</span></div>' +
      '<div class="p-actions">' +
      '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();openDetail(\'' + esc(p.id) + '\')">Detail</button>' +
          '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();buyProduct(\'' + esc(p.id) + '\')">Top Up</button>' +
      '</div></div></div>';
  }

  function gameView() {
    var q = $('searchInput') ? String($('searchInput').value || '').trim().toLowerCase() : '';
    if (q) return false;
    return selectedCat === 'Semua' || selectedCat === 'Top Up Game';
  }

  var _renderProducts = window.renderProducts;
  window.renderProducts = function (q) {
    q = (q === undefined || q === null) ? '' : q;
    if (gameView()) {
      var list = lgList();
      var grid = $('productGrid');
      if (!grid) return;
      if (!list.length) {
        grid.innerHTML = '<div class="muted" style="padding:25px;grid-column:1/-1;text-align:center">Data game masih dimuat — tunggu sebentar / muat ulang halaman </div>';
        $('loadMoreWrap').innerHTML = '';
        setGameHeading(true);
        return;
      }
      var view = list.slice(0, visibleCount);
      grid.innerHTML = view.map(gameCardHTML).join('');
      var more = list.length - view.length;
      $('loadMoreWrap').innerHTML = more > 0 ? '<button class="btn" onclick="loadMore()">Tampilkan lebih banyak (' + more + ' lagi)</button>' : '';
      setGameHeading(true);
      return;
    }
    setGameHeading(false);
    return _renderProducts(q);
  };

  var _loadMore = window.loadMore;
  window.loadMore = function () {
    if (gameView()) {
      var list = lgList();
      var prev = visibleCount;
      visibleCount += 24;
      var add = list.slice(prev, visibleCount);
      if (add.length) $('productGrid').insertAdjacentHTML('beforeend', add.map(gameCardHTML).join(''));
      var more = list.length - Math.min(visibleCount, list.length);
      $('loadMoreWrap').innerHTML = more > 0 ? '<button class="btn" onclick="loadMore()">Tampilkan lebih banyak (' + more + ' lagi)</button>' : '';
      return;
    }
    return _loadMore();
  };

  function boot() {
    try { window.renderProducts(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  try { console.log('%cJK ADISTORE PILIH GAME v1 aktif (' + lgList().length + ' game)', 'color:#00f0ff;font-weight:900'); } catch (e) {}
})();
