import webpush from 'web-push';
import { fetchAllSubscriptions, pruneDeadSubscriptions, checkVapidKeysMatch } from '../send-push.js';
import { touchdownDelta } from './lib/nfl-touchdowns.mjs';
const dry=process.argv.includes('--dry-run');
if(!dry){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!checkVapidKeysMatch())throw new Error('Push configuration unavailable');
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:noreply@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
}
const state=new Map(),pending=new Map();
const endpoint=process.env.NFL_LIVE_ENDPOINT||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
const maxTicks=Number(process.env.MAX_TICKS||0);
for(let tick=1;;tick++){
 try{
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok)throw new Error(`Live feed HTTP ${response.status}`);
  const now=Date.now();
  for(const event of touchdownDelta(await response.json(),state,now))pending.set(event.key,event);
  for(const [key,event] of pending)if(now-event.ts>120000)pending.delete(key);
  if(pending.size){
   const events=[...pending.values()];
   if(dry){console.log(`Dry run: ${events.length} new TD(s), no devices contacted`);pending.clear();}
   else{
    const subs=await fetchAllSubscriptions(),dead=[];let failures=0,accepted=0;
    // One short payload per score, safely below Web Push's payload limit.
    for(const sub of subs){
     if(!sub.endpoint||!sub.p256dh||!sub.auth_key){failures++;continue;}
     try{for(const event of events)await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},JSON.stringify(event),{TTL:120,urgency:'high'});accepted++;}
     catch(e){if([404,410].includes(e.statusCode))dead.push(sub.id);else failures++;}
    }
    if(dead.length)await pruneDeadSubscriptions(dead);
    if(!failures)pending.clear(); // transient failures retry; worker dedup covers successful devices
    console.log(`TD batch: ${events.length} score(s), ${accepted} devices accepted, ${failures} pending retries`);
   }
  }
  if(tick===1)console.log('NFL TD push: baseline ready; watching for new touchdowns');
 }catch(e){console.warn(`NFL TD push: ${e.message}; retrying`);}
 if(maxTicks&&tick>=maxTicks)break;
 await new Promise(r=>setTimeout(r,25000));
}
