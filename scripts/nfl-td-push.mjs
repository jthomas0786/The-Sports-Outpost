import webpush from 'web-push';
import { fetchAllSubscriptions, pruneDeadSubscriptions, checkVapidKeysMatch } from '../send-push.js';
import { touchdownDelta } from './lib/nfl-touchdowns.mjs';
import { nflWatchlistEventDelta } from './lib/nfl-watchlist-events.mjs';
const dry=process.argv.includes('--dry-run');
if(!dry){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!checkVapidKeysMatch())throw new Error('Push configuration unavailable');
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:noreply@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
}
const tdState=new Map(),watchState=new Map(),pending=new Map();
const endpoint=process.env.NFL_LIVE_ENDPOINT||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
const maxTicks=Number(process.env.MAX_TICKS||0);
const supabaseBase=String(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/+$/,'');
let watchlists=new Map(),watchlistsAt=0;
async function fetchNflWatchlists(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!supabaseBase||!key)return new Map();
 const url=`${supabaseBase}/rest/v1/nfl_watchlist?select=user_id,player_id`;
 const r=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!r.ok)throw new Error(`NFL watchlist fetch HTTP ${r.status}`);
 const map=new Map();
 for(const row of await r.json()){
  if(!row?.user_id||row?.player_id==null)continue;
  if(!map.has(row.user_id))map.set(row.user_id,new Set());
  map.get(row.user_id).add(String(row.player_id));
 }
 return map;
}
async function ensureWatchlists(now){
 if(now-watchlistsAt<60000)return watchlists;
 try{watchlists=await fetchNflWatchlists();watchlistsAt=now;}
 catch(e){console.warn(`NFL watchlist refresh: ${e.message}`);}
 return watchlists;
}
function shouldSend(sub,event){
 if(event.kind!=='watchlist')return true;
 return !!sub.user_id&&watchlists.get(sub.user_id)?.has(String(event.playerId));
}
for(let tick=1;;tick++){
 try{
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok)throw new Error(`Live feed HTTP ${response.status}`);
  const now=Date.now(),doc=await response.json();
  for(const event of touchdownDelta(doc,tdState,now))pending.set(event.key,{...event,kind:event.kind||'touchdown'});
  for(const event of nflWatchlistEventDelta(doc,watchState,now))pending.set(event.key,event);
  for(const [key,event] of pending)if(now-event.ts>120000)pending.delete(key);
  if(pending.size){
   const events=[...pending.values()];
   if(dry){
    const td=events.filter(e=>e.kind!=='watchlist').length,watch=events.length-td;
    console.log(`Dry run: ${td} TD + ${watch} watchlist event(s), no devices contacted`);pending.clear();
   }else{
    await ensureWatchlists(now);
    const subs=await fetchAllSubscriptions(),dead=[];let failures=0,accepted=0,watchAccepted=0;
    for(const sub of subs){
     if(!sub.endpoint||!sub.p256dh||!sub.auth_key){failures++;continue;}
     const target={endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}};
     try{
      for(const event of events){
       if(!shouldSend(sub,event))continue;
       await webpush.sendNotification(target,JSON.stringify(event),{TTL:120,urgency:'high'});
       accepted++;if(event.kind==='watchlist')watchAccepted++;
      }
     }catch(e){if([404,410].includes(e.statusCode))dead.push(sub.id);else failures++;}
    }
    if(dead.length)await pruneDeadSubscriptions(dead);
    if(!failures)pending.clear();
    console.log(`NFL push batch: ${events.length} event(s), ${accepted} deliveries (${watchAccepted} watchlist), ${failures} pending retries`);
   }
  }
  if(tick===1)console.log('NFL push: baseline ready; watching touchdowns + watched-player stat events');
 }catch(e){console.warn(`NFL push: ${e.message}; retrying`);}
 if(maxTicks&&tick>=maxTicks)break;
 await new Promise(r=>setTimeout(r,25000));
}
