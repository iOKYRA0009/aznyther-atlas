/* Generated from the audited public build. */
const CACHE="aznyther-b8d76311aef1", FILES=[".nojekyll","art/characters-portraits.webp","art/civilization-scenes.webp","art/draevor-illustrated.webp","art/fora-do-abismo-portraits.webp","art/karak-zul-illustrated.webp","art/orivara-illustrated.webp","art/orivara-reference.webp","art/serekh-illustrated.webp","art/underdark-illustrated.webp","assets/AtlasMap-79tT2xgX.js","assets/CodexView-YATwLmsh.js","assets/DestinationView-B--oX2_Q.js","assets/Globe-CeWnQhxM.js","assets/MapWorkspace-DThiOACc.js","assets/chevron-left-CKeR8JUY.js","assets/index-BsNKZ9SW.css","assets/index-DHaK_oxk.js","assets/react-vendor-DpiFcL0S.js","assets/three-Ba4ytiuO.js","compass.svg","fonts/OFL-cormorantgaramond.txt","fonts/OFL-dmsans.txt","fonts/atlas-font-0.ttf","fonts/atlas-font-1.ttf","fonts/atlas-font-2.ttf","fonts/atlas-font-3.ttf","fonts/atlas-font-4.ttf","fonts/atlas-font-5.ttf","fonts/atlas-font-6.ttf","fonts/atlas-font-7.ttf","fonts/atlas-font-8.ttf","fonts/fonts.css","index.html"];
const base=self.registration.scope;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.filter(f=>!f.startsWith('art/')).map(f=>new URL(f,base).href)))));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('aznyther-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('message',e=>{
 if(e.data==='ACTIVATE')self.skipWaiting();
 if(e.data==='CACHE_ALL')e.waitUntil((async()=>{try{const c=await caches.open(CACHE);for(const f of FILES){const url=new URL(f,base).href;if(!await c.match(url)){const r=await fetch(url,{cache:'reload'});if(!r.ok)throw Error();await c.put(url,r)}}await c.put(new URL('__offline_complete__',base),new Response('yes'));e.source?.postMessage({type:'OFFLINE_READY',version:"b8d76311aef1"})}catch{e.source?.postMessage({type:'OFFLINE_ERROR'})}})());
 if(e.data==='STATUS')e.waitUntil(caches.open(CACHE).then(async c=>e.source?.postMessage({type:await c.match(new URL('__offline_complete__',base))?'OFFLINE_READY':'OFFLINE_PARTIAL',version:"b8d76311aef1"})));
});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||!u.href.startsWith(base)||u.pathname.endsWith('sw.js')||u.pathname.endsWith('offline.json'))return;
 const documentRequest=e.request.mode==='navigate';
 e.respondWith((async()=>{const c=await caches.open(CACHE),key=documentRequest?new URL('index.html',base).href:e.request;
 if(!documentRequest&&!u.pathname.includes('/art/')){const cached=await c.match(key,{ignoreVary:true});if(cached)return cached}
 try{const r=await fetch(e.request);if(r.ok)await c.put(key,r.clone());return r}catch{const cached=await c.match(key,{ignoreVary:true});if(cached)return cached;return new Response('Este recurso ainda não foi salvo para uso offline.',{status:503})}})());
});
