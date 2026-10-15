// Generated from app assets; caches are isolated by registration scope.
const PREFIX='lnp-studio-'+new URL(self.registration.scope).pathname+'-';
const CACHE=PREFIX+'3e5bb387b092';
const ASSETS=["./","app.js","calculator.js","excel.js","icon-192.png","icon-512.png","icon.svg","index.html","library.css","lipid-library.js","manifest.webmanifest","session.js","stocks.js","transfer.js","vendor/EXCELJS-LICENSE.txt","vendor/QRCODE-LICENSE.txt","vendor/README.txt","vendor/lnp-vendor.js","workflow.css","workspace.css"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{try{const response=await fetch(req);if(response.ok){if(req.mode!=='navigate')await cache.put(req,response.clone());return response;}return (await cache.match(req,{ignoreSearch:true}))||response;}catch{return (await cache.match(req,{ignoreSearch:true}))||(req.mode==='navigate'?await cache.match(new URL('index.html',self.registration.scope)):null)||new Response('Unavailable offline',{status:503});}}));
});
