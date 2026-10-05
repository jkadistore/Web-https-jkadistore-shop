/* JK ADISTORE — Auto Version & Cache Manager */
(function(){
  var BUILD = '20261005-0730'; // ganti manual atau otomatis
  window.JK_BUILD = BUILD;

  // 1) Auto-refresh kalau versi beda
  try {
    var prev = localStorage.getItem('jk_build');
    if (prev && prev !== BUILD) {
      localStorage.setItem('jk_build', BUILD);
      // Unregister service worker lama
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs){
          regs.forEach(function(r){ r.update(); });
        });
      }
      // Clear cache lama (kecuali session login)
      if ('caches' in window) {
        caches.keys().then(function(names){
          names.forEach(function(n){ caches.delete(n); });
        });
      }
      // Reload sekali dengan flag biar gak loop
      if (!sessionStorage.getItem('jk_reloaded_' + BUILD)) {
        sessionStorage.setItem('jk_reloaded_' + BUILD, '1');
        setTimeout(function(){ location.reload(true); }, 300);
      }
    } else {
      localStorage.setItem('jk_build', BUILD);
    }
  } catch(e){}

  // 2) Force refresh saat halaman kembali dari bfcache (back button)
  window.addEventListener('pageshow', function(e){
    if (e.persisted) {
      try {
        if (localStorage.getItem('jk_build') !== BUILD) location.reload();
      } catch(ex){}
    }
  });
})();
