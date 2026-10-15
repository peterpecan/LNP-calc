import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function buildOffline(directory) {
  const files=[];
  async function walk(url,prefix=''){for(const entry of await readdir(url,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;if(entry.isDirectory())await walk(new URL(entry.name+'/',url),prefix+entry.name+'/');else if(entry.name!=='sw.js'&&/\.(html|js|css|svg|png|txt|webmanifest)$/.test(entry.name))files.push(prefix+entry.name);}}
  await walk(directory);
  files.sort();const hash=createHash('sha256');for(const f of files)hash.update(await readFile(new URL(f,directory)));
  const version=hash.digest('hex').slice(0,12);
  const worker=`// Generated from app assets; caches are isolated by registration scope.
const PREFIX='lnp-studio-'+new URL(self.registration.scope).pathname+'-';
const CACHE=PREFIX+'${version}';
const ASSETS=${JSON.stringify(['./',...files])};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{try{const response=await fetch(req);if(response.ok){if(req.mode!=='navigate')await cache.put(req,response.clone());return response;}return (await cache.match(req,{ignoreSearch:true}))||response;}catch{return (await cache.match(req,{ignoreSearch:true}))||(req.mode==='navigate'?await cache.match(new URL('index.html',self.registration.scope)):null)||new Response('Unavailable offline',{status:503});}}));
});
`;
  await writeFile(new URL('sw.js',directory),worker);
  return version;
}
