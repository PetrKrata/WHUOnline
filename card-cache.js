'use strict';
window.WHUCardCache=(()=>{
 let busy=0,readyTask=null;const inFlight=new Map();let cacheName='';
 const status=()=>document.getElementById('cacheStatus');
 function allowed(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.underworldsdb.com'||!u.pathname.startsWith('/cards/'))throw Error('Nepodporovaný zdroj obrázku.');return u.href;}
 function timeout(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
 function ready(){if(readyTask)return readyTask;readyTask=(async()=>{
  if(!window.isSecureContext||!('serviceWorker' in navigator)||!('caches' in window)||location.protocol==='file:')throw Error('Test ukládání otevři na GitHub Pages přes HTTPS, nikoli dvojklikem na soubor.');
  const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});cacheName='whu-card-images-v1:'+reg.scope;
  await timeout(new Promise(resolve=>{
   const check=()=>{const controller=navigator.serviceWorker.controller;if(controller&&new URL(controller.scriptURL).pathname===new URL('sw.js',reg.scope).pathname){navigator.serviceWorker.removeEventListener('controllerchange',check);resolve();}};
   navigator.serviceWorker.addEventListener('controllerchange',check);check();
  }),20000,'Mezipaměť není aktivní. Obnov stránku a zkus import znovu.');
  await caches.open(cacheName);return cacheName;
 })().catch(e=>{readyTask=null;throw e;});return readyTask;}
 function verifyImage(url){return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.src='';reject(Error('Vypršel čas načítání obrázku.'));},20000);img.onload=()=>{clearTimeout(timer);img.naturalWidth?resolve():reject(Error('Prázdný obrázek.'));};img.onerror=()=>{clearTimeout(timer);reject(Error('Obrázek není dostupný.'));};img.src=url;});}
 async function getOne(url){url=allowed(url);if(inFlight.has(url)){await inFlight.get(url);return 'cached';}
 const job=(async()=>{const cache=await caches.open(await ready());let hit=await cache.match(url);
  if(hit){try{await verifyImage(url);return 'cached';}catch{await cache.delete(url);}}
  const response=await timeout(fetch(url,{mode:'no-cors',credentials:'omit',cache:'reload'}),25000,'Server obrázek neposkytl včas.');
  if(response.type!=='opaque'&&!response.ok)throw Error('Chyba stažení obrázku.');
  await cache.put(url,response);
  try{await verifyImage(url);}catch(e){await cache.delete(url);throw e;}
  return 'downloaded';
 })();inFlight.set(url,job);try{return await job;}finally{inFlight.delete(url);}}
 async function preload(cards,onProgress){await ready();busy++;document.getElementById('clearCardCache').disabled=true;
 const unique=[...new Map(cards.map(c=>[allowed(c.image),c])).values()];const result={total:unique.length,done:0,cached:0,downloaded:0,failed:[]};let cursor=0;
 try{await Promise.all(Array.from({length:Math.min(3,unique.length)},async()=>{while(cursor<unique.length){const card=unique[cursor++];try{const kind=await getOne(card.image);result[kind]++;}catch(e){result.failed.push({id:card.id,message:e.message});}result.done++;onProgress({...result});}}));return result;
 }finally{busy--;document.getElementById('clearCardCache').disabled=busy>0;await refresh();}}
 async function refresh(){try{const cache=await caches.open(await ready());const keys=await cache.keys();status().textContent=`V mezipaměti prohlížeče: ${keys.length} obrázků karet. Zde se sdílejí mezi oběma balíčky.`;}catch(e){status().textContent=e.message;}}
 async function clear(){if(busy)return;if(!confirm('Vymazat stažené obrázky karet z tohoto prohlížeče? Balíčky a partie zůstanou zachované.'))return;
 try{await ready();if(busy)return;await caches.delete(cacheName);await refresh();}catch(e){status().textContent=e.message;}}
 document.getElementById('clearCardCache').onclick=clear;document.getElementById('refreshCardCache').onclick=refresh;
 return {ready,preload,refresh,clear};
})();
window.WHUCardCache.refresh();
