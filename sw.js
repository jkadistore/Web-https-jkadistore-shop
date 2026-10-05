/* JK ADISTORE — SW self-destruct (one-time) */
self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return caches.delete(k); }));
    }).then(function(){
      return self.registration.unregister();
    }).then(function(){
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients){
      clients.forEach(function(c){ try { c.navigate(c.url); } catch(e){} });
    })
  );
});

/* Jangan intercept apapun — biarkan network normal */
self.addEventListener('fetch', function(e){ /* pass-through */ });
