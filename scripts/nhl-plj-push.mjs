import fs from 'node:fs/promises';
import webpush from 'web-push';
import {normalizeScoreboard,mergeSummary} from '../sports/nhl/data.js';
import {buildPuckLineJesusModel} from '../sports/nhl/puck-line-jesus.js';
import {preserveTrackedPuckLines} from '../sports/nhl/plj-line-lock-v929.js';
import {pruneDeadSubscriptions,checkVapidKeysMatch} from '../send-push.js';

const API='https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';
const HISTORY_PATH='slates/nhl-plj-history.json';
const DRY=process.argv.includes('--dry-run');
const TEST=process.argv.includes('--test');
const POLL_MS=Number(process.env.POLL_MS||20000);
const MAX_TICKS=Number(process.env.MAX_TICKS||0);
const SUPABASE_URL=String(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/+$/,'');
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const sent=new Set(),summaryCache=new Map(),statusCache=new Map();

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJSON(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`HTTP ${r.status} ${url}`);return r.json();}
function alertCopy(x){
 const fav=x.line?.puckLine?.favoriteAbbr||x.side?.favorite?.abbr||'Favorite';
 const score=`${x.game.away?.abbr||'AWAY'} ${x.game.away?.score??'—'} · ${x.game.home?.abbr||'HOME'} ${x.game.home?.score??'—'}`;
 const clock=x.game.status==='post'?'FINAL':`P${x.game.period||'—'} ${x.game.clock||x.game.detail||''}`.trim();
 if(x.code==='PLJ_WATCH')return {title:'⚡ Puck Line Jesus Watch',body:`${fav} -1.5 is up one · ${score} · ${clock}. Empty-net window approaching.`};
 if(x.code==='PLJ_LIVE')return {title:'⚡ PUCK LINE JESUS LIVE',body:`${fav} -1.5 · ${score} · ${clock} · opponent net empty.`};
 if(x.code==='BACKDOOR_DANGER')return {title:'Backdoor Danger',body:`${fav} -1.5 is covering by exactly two · ${score} · ${clock}.`};
 if(x.code==='PLJ_CASHED')return {title:'⚡ PLJ CASHED',body:`${fav} -1.5 got the late empty-net cover · ${score}.`};
 if(x.code==='LATE_CASH')return {title:'Late Puck-Line Cover',body:`${fav} -1.5 moved from a one-goal lead to a cover late · ${score}.`};
 if(x.code==='BACKDOORED')return {title:'Backdoor Pain',body:`${fav} -1.5 lost the late cover · ${score}.`};
 return null;
}
function eventFor(x){
 const copy=alertCopy(x);if(!copy)return null;
 return {sport:'nhl',kind:'plj',code:x.code,key:`plj:${x.game.slateDate||''}:${x.game.id}:${x.code}`,ts:Date.now(),gameId:String(x.game.id),favorite:x.line?.puckLine?.favoriteAbbr||'',away:x.game.away?.abbr||'',home:x.game.home?.abbr||'',awayScore:x.game.away?.score??null,homeScore:x.game.home?.score??null,period:x.game.period??null,clock:x.game.clock||'',title:copy.title,body:copy.body,url:'index.html?plj=1#nhl'};
}
async function fetchSubscriptions(){
 if(!SUPABASE_URL||!SERVICE_KEY)return [];
 const url=`${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth_key,user_id,alert_preferences&plj_enabled=eq.true`;
 const r=await fetch(url,{headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`},signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!r.ok)throw new Error(`Supabase subscriptions HTTP ${r.status}`);return r.json();
}
async function liveModel(lines){
 const date=String(lines?.date||'').replaceAll('-','');
 const scoreboard=normalizeScoreboard(await getJSON(`${API}/scoreboard${date?`?dates=${date}`:''}`),Date.now(),lines?.date||null);
 for(const g of scoreboard.games||[]){
  const prior=statusCache.get(String(g.id));statusCache.set(String(g.id),g.status);
  const needsSummary=g.status==='in'||(g.status==='post'&&prior==='in');
  if(needsSummary){
   try{const merged=mergeSummary(g,await getJSON(`${API}/summary?event=${g.id}`));summaryCache.set(String(g.id),merged);Object.assign(g,merged);}catch{}
  }else if(g.status==='post'&&summaryCache.has(String(g.id))){
   const cached=summaryCache.get(String(g.id));g.players=cached.players||[];g.goals=cached.goals||[];g.plays=cached.plays||[];g.onIce=cached.onIce||[];g.summaryAt=cached.summaryAt;
  }
 }
 return buildPuckLineJesusModel(scoreboard,lines);
}
async function deliver(events){
 if(!events.length)return;
 if(DRY){for(const e of events)console.log(`DRY ${e.key} :: ${e.title} :: ${e.body}`);return;}
 const subs=await fetchSubscriptions();if(!subs.length){console.log(`PLJ push: ${events.length} event(s), 0 opted-in devices`);return;}
 const dead=[];let accepted=0,failures=0;
 for(const sub of subs){
  if(sub.alert_preferences?.nhl?.game_edge===false)continue;
  if(!sub.endpoint||!sub.p256dh||!sub.auth_key){failures++;continue;}
  const target={endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}};
  for(const event of events){
   try{await webpush.sendNotification(target,JSON.stringify(event),{TTL:180,urgency:'high'});accepted++;}
   catch(e){if([404,410].includes(e.statusCode)){dead.push(sub.id);break;}failures++;}
  }
 }
 if(dead.length)await pruneDeadSubscriptions([...new Set(dead)]);
 console.log(`PLJ push: ${events.length} event(s), ${accepted} deliveries, ${failures} failure(s), ${dead.length} dead subscription(s)`);
}
async function runTest(){
 const event={sport:'nhl',kind:'plj',code:'PLJ_LIVE',key:`plj:test:${Date.now()}`,ts:Date.now(),gameId:'test',favorite:'TSO',away:'AWY',home:'HME',awayScore:2,homeScore:3,period:3,clock:'1:30',title:'⚡ PLJ Push Test',body:'Remote Puck Line Jesus notifications are connected.',url:'index.html?plj=1#nhl'};
 await deliver([event]);
}

if(!DRY){
 if(!SUPABASE_URL||!SERVICE_KEY||!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY||!checkVapidKeysMatch())throw new Error('PLJ push configuration unavailable');
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:noreply@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
}
if(TEST){await runTest();process.exit(0);}

const rawLines=JSON.parse(await fs.readFile('slates/nhl-puck-lines.json','utf8'));
let history=null;
try{history=JSON.parse(await fs.readFile(HISTORY_PATH,'utf8'));}catch{}
const lines=preserveTrackedPuckLines(rawLines,history);
for(let tick=1;;tick++){
 try{
  const model=await liveModel(lines),events=[];
  for(const x of model.tracked||[]){
   const e=eventFor(x);if(!e||sent.has(e.key))continue;
   sent.add(e.key);events.push(e);
  }
  await deliver(events);
  if(tick===1)console.log(`PLJ push baseline ready · ${model.tracked?.length||0} puck lines · ${POLL_MS}ms poll`);
 }catch(e){console.warn(`PLJ push: ${e.message}`);}
 if(MAX_TICKS&&tick>=MAX_TICKS)break;
 await sleep(POLL_MS);
}
