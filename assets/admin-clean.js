/* admin-clean.js — v20260910
   BAGIAN 3: Dashboard bersih — hapus kartu "Pesanan terbaru" dari dashboard.
   Semua menu panel lain TIDAK diubah (hanya override adminDash).
   Dipanggil setelah app.js sehingga mengganti fungsi bawaan. */
(function () {
  'use strict';

  function adminWrapClean(html) {
    /* pakai adminWrap asli bila ada; fallback → #adminContent (id di shell) */
    if (typeof adminWrap === 'function') { adminWrap(html); return; }
    var el = document.getElementById('adminContent') || document.getElementById('adminBody');
    if (el) el.innerHTML = html;
  }

  window.adminDash = function () {
    var ordCount = (db.orders || []).length;
    var omzet = (db.orders || []).reduce(function (a, o) { return a + (o.price || 0); }, 0);
    var memberCount = (STORE.memberCount != null && STORE.memberCount !== '' && !isNaN(+STORE.memberCount))
      ? +STORE.memberCount : (db.users || []).length;
    var hiddenCount = (db.products || []).filter(function (p) { return p.hidden; }).length;

    var html =
      sectionTitle('📊 Dashboard', 'Ringkasan toko kamu saat ini.') +
      '\n  <div class="feature-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin:10px 0">\n' +
      '    <div class="feature-tile"><b style="font-size:22px">' + (db.products || []).length + '</b><small>Produk</small></div>\n' +
      '    <div class="feature-tile"><b style="font-size:22px">' + (db.cats || []).length + '</b><small>Kategori</small></div>\n' +
      '    <div class="feature-tile"><b style="font-size:22px">' + ordCount + '</b><small>Pesanan</small></div>\n' +
      '    <div class="feature-tile"><b style="font-size:18px">' + fmtRp(omzet) + '</b><small>Omzet</small></div>\n' +
      '    <div class="feature-tile"><b style="font-size:22px">' + memberCount + '</b><small>Member</small></div>\n' +
      '    <div class="feature-tile"><b style="font-size:22px">' + (db.reviews || []).length + '</b><small>Ulasan</small></div>\n' +
      '    <div class="feature-tile" style="cursor:pointer" onclick="adminNav(\'hidden\')"><b style="font-size:22px;color:#b58cff">' + hiddenCount + '</b><small>Tersembunyi</small></div>\n' +
      '  </div>\n' +
      '  <div class="admin-card">\n' +
      '    <div class="label">Aksi cepat</div>\n' +
      '    <div class="row">\n' +
      '      <button class="btn btn-sm btn-primary" onclick="adminNav(\'products\')">➕ Tambah Produk</button>\n' +
      '      <button class="btn btn-sm" onclick="adminNav(\'display\')">🎨 Atur Tampilan</button>\n' +
      '      <button class="btn btn-sm" onclick="adminNav(\'slider\')">🖼️ Kelola Slider</button>\n' +
      '      <button class="btn btn-sm" onclick="exportData()">⬇️ Backup Data</button>\n' +
      '      <button class="btn btn-sm" onclick="adminNav(\'hidden\')">🙈 Kelola Tersembunyi</button>\n' +
      '      <button class="btn btn-sm" onclick="smoothTo(\'shop\');modalHide(\'adminModal\')">👁️ Lihat Toko</button>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '  <div class="admin-card">\n' +
      '    <div class="label">Keamanan Owner</div>\n' +
      '    <div class="row">\n' +
      '      <button class="btn btn-sm btn-primary" onclick="openAPassModal(\'owner\')">🔑 Ubah Kata Sandi Owner</button>\n' +
      '      <button class="btn btn-sm" onclick="opKeamanan()">🔒 Keamanan &amp; Akses Owner</button>\n' +
      '    </div>\n' +
      '  </div>';

    adminWrapClean(html);
  };
})();
