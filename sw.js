'use strict';
// Cache belongs to this repository path, not to other sites on the same github.io origin.
const CARD_CACHE='whu-card-images-v1:'+self.registration.scope;
function allowed(url){return url.protocol==='https:'&&url.hostname==='www.underworldsdb.com'&&url.pathname.startsWith('/cards/');}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.destination!=='image'||request.mode!=='no-cors'||!allowed(new URL(request.url)))return;
 // Only imports write cache entries. Merely browsing a card does not fill the cache.
 event.respondWith((async()=>{const cache=await caches.open(CARD_CACHE);return (await cache.match(request.url))||fetch(request);})());
});
