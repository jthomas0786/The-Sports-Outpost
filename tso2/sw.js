/* TSO 2.0 background web push. Isolated from legacy sw.js. */
'use strict';
const CACHE='tso2-push-seen-v1';
const ICON='/brand/production/tso2-app-icon-192.png';
const BADGE='/brand/production/tso2-app-icon-192.png';
const HR_SNAPSHOT='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/latest-hr.json';
const cacheKey=key=>new URL('/__tso2-push-seen?key='+encodeURIComponent(key),self.location.origin).href;
const alreadySeen=async key=>Boolean(await (await caches.open(CACHE)).match(cacheKey(key)));
const remember=async key=>{
  const cache=await caches.open(CACHE);
  await cache.put(cacheKey(key),new Response('1'));
  const keys=await cache.keys();
  if(keys.length>200)await Promise.all(keys.slice(0,keys.length-200).map(k=>cache.delete(k)));
};
const target=path=>{
  try{
    const u=new URL(String(path||'/#live'),self.location.origin);
    return u.origin===self.location.origin?u.href:new URL('/#live',self.location.origin).href;
  }catch{return new URL('/#live',self.location.origin).href;}
};
const safeText=(value,max=230)=>String(value??'').slice(0,max);
function description(item){
  const sport=safeText(item.sport||'').toLowerCase(),kind=safeText(item.kind||'').toLowerCase();
  if(sport==='nhl'&&kind==='plj')return {title:safeText(item.title||'NHL · Puck Line Alert'),body:safeText(item.body||'NHL game alert'),url:'/#gameedge'};
  if(sport==='nfl'&&kind==='watchlist'){
    const score=[item.away,item.awayScore,item.home,item.homeScore].filter(x=>x!=null).join(' ');
    return {title:'⭐ '+safeText(item.playerName||'NFL player'),body:safeText([item.text,item.totals,score].filter(Boolean).join(' · ')),url:'/#live'};
  }
  if(sport==='nfl')return {title:'🏈 '+safeText(item.scorer||'NFL')+' — TOUCHDOWN',body:safeText([item.text,item.away,item.awayScore,'·',item.home,item.homeScore].filter(x=>x!=null).join(' ')),url:'/#live'};
  if(sport==='mlb'||item.batter||item.homeRun)return {title:'⚾ '+safeText(item.batter||'MLB')+' — HOME RUN',body:safeText([item.battingTeam,item.opponent,item.inning?'Inning '+item.inning:''].filter(Boolean).join(' · ')),url:'/#live'};
  return {title:safeText(item.title||'The Sports Outpost'),body:safeText(item.body||'A new sports alert is available.'),url:target(item.url||'/#live')};
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let events=[];
  try{if(event.data){const p=event.data.json();events=Array.isArray(p)?p:[p];}}catch{}
  if(!events.length){
    try{
      const res=await fetch(HR_SNAPSHOT+'?t='+Date.now(),{cache:'no-store'});
      if(res.ok){const data=await res.json();events=Array.isArray(data.homeRuns)?data.homeRuns:[];}
    }catch{}
  }
  // Apple Web Push requires user-visible notification even after an empty push.
  if(!events.length)events=[{key:'fallback:'+Math.floor(Date.now()/60000),title:'The Sports Outpost',body:'A sports update is available.',url:'/#live'}];
  for(const event of events.slice(-5)){
    if(!event||typeof event!=='object')continue;
    if(event.ts&&Number.isFinite(Number(event.ts))&&Math.abs(Date.now()-Number(event.ts))>15*60*1000)continue;
    const content=description(event);
    const key=safeText(event.key||[content.title,content.body].join(':'),300);
    if(await alreadySeen(key))continue;
    await self.registration.showNotification(content.title,{
      body:content.body,icon:ICON,badge:BADGE,tag:key,
      data:{url:target(event.url||content.url)},renotify:false
    });
    await remember(key);
  }
})()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const url=target(event.notification.data?.url);
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const windowClient of windows){
      if(new URL(windowClient.url).origin===self.location.origin){
        if('navigate' in windowClient)try{await windowClient.navigate(url);}catch{}
        if('focus' in windowClient){await windowClient.focus();return;}
      }
    }
    if(self.clients.openWindow)await self.clients.openWindow(url);
  })());
});
self.addEventListener('pushsubscriptionchange',event=>event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const windowClient of windows)windowClient.postMessage({type:'tso2-push-subscription-changed'});
})()));
