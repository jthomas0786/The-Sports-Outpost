
/* TSO 2.0 live NBA milestone + NHL scorer pushes.
 * GitHub Actions (default-branch scheduler) checks out the TSO2 branch.
 * Only confirmed in-progress games + verified ESPN summary events qualify.
 * No model alerts until a separately verified signal source is available.
 */
import webpush from 'web-push';
import {normalizeScoreboard,mergeSummary,easternDate} from '../../sports/nhl/data.js';
import {checkVapidKeysMatch} from '../../send-push.js';

const NHL='https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';
const NBA='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const DRY=process.argv.includes('--dry-run');
const SELFTEST=process.argv.includes('--selftest');
const MAX_TICKS=Number(process.env.MAX_TICKS||0);
const POLL_MS=Math.max(20000,Number(process.env.POLL_MS||45000));
const SUPABASE=String(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/+$/,'');
const SECRET=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const DEFAULTS={
 nhl:{goals:true,hat_tricks:true},nba:{milestones:true}
};
const state=new Map(); // game event baselines: NOT hydrated from historical plays
const date=()=>easternDate().replaceAll('-','');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const isLive=e=>String(e?.status?.type?.state||e?.status?.type?.name||'').toLowerCase()==='in'
  ||['STATUS_IN_PROGRESS','in_progress'].includes(String(e?.status?.type?.name||'').toUpperCase());
const gId=e=>String(e?.id||'');
const num=v=>v==null||v===''||v==='--'?null:Number.isFinite(Number(v))?Number(v):null;
const name=v=>String(v||'').slice(0,120);
const count=(arr,fn)=>arr.filter(fn).length;
async function json(url){
 const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(14000)});
 if(!res.ok)throw Error('Live source HTTP '+res.status);
 return res.json();
}
function eligible(subscription,event){
 const prefs=subscription?.alert_preferences||{};
 const group=prefs?.[event.sport];
 const stored=group?.[event.preference];
 return typeof stored==='boolean'?stored:DEFAULTS[event.sport]?.[event.preference]===true;
}
function makeEvent(sport,preference,key,title,body,gameId){
 return {sport,kind:preference,preference,key,ts:Date.now(),title,body,url:'/#live',gameId:String(gameId)};
}
export function nhlGoalEvents(game,baseline){
 const goals=Array.isArray(game.goals)?game.goals:[];
 const seenGoals=new Set(goals.map(g=>String(g.id)).filter(Boolean));
 const goalsByPlayer=new Map();
 for(const goal of goals){
  const playerId=String(goal.scorer?.id||'');
  if(playerId)goalsByPlayer.set(playerId,(goalsByPlayer.get(playerId)||0)+1);
 }
 const hatPlayers=new Set([...goalsByPlayer.entries()].filter(([,goals])=>goals>=3).map(([id])=>id));
 const current={goalIds:seenGoals,hatPlayers};
 if(!baseline)return {events:[],current};
 const events=[];
 const matchup=game.away?.abbr+' @ '+game.home?.abbr;
 for(const goal of goals){
  const goalId=String(goal.id||'');
  if(!goalId||baseline.goalIds?.has(goalId)||goal.shootout)continue;
  const scorer=name(goal.scorer?.name);
  if(!scorer||scorer==='Scorer pending')continue;
  const description=[goal.team,matchup,'P'+(goal.period||'?'),goal.clock].filter(Boolean).join(' · ');
  events.push(makeEvent('nhl','goals','tso2:nhl:goal:'+game.id+':'+goalId,'🏒 '+scorer+' — GOAL',description,game.id));
  const playerId=String(goal.scorer?.id||'');
  if(playerId&&hatPlayers.has(playerId)&&!baseline.hatPlayers?.has(playerId))
   events.push(makeEvent('nhl','hat_tricks','tso2:nhl:hat:'+game.id+':'+playerId,
    '🎩 '+scorer+' — HAT TRICK',description,game.id));
 }
 return {events,current};
}
export function nbaPlayers(summary){
 const out=new Map();
 for(const group of summary?.boxscore?.players||[]){
  const team=group?.team?.abbreviation||'';
  for(const section of group.statistics||[]){
   const keys=(section.keys||[]).map(k=>String(k).toLowerCase());
   const labels=(section.labels||[]).map(k=>String(k).toUpperCase());
   const ix=kinds=>{const i=keys.findIndex(k=>kinds.includes(k));return i>=0?i:labels.findIndex(k=>kinds.map(s=>({points:'PTS',rebounds:'REB',assists:'AST'}[s]||s.toUpperCase())).includes(k));};
   const pi=ix(['points','pts']),ri=ix(['rebounds','totalrebounds','reb']),ai=ix(['assists','ast']);
   for(const row of section.athletes||[]){
    const player=row?.athlete;
    if(!player?.id||!row?.stats)continue;
    const id=String(player.id),previous=out.get(id)||{};
    const stats={points:pi<0?null:num(row.stats[pi]),rebounds:ri<0?null:num(row.stats[ri]),assists:ai<0?null:num(row.stats[ai])};
    out.set(id,{...previous,id,name:name(player.displayName||player.fullName||previous.name),team,
      points:stats.points??previous.points??null,rebounds:stats.rebounds??previous.rebounds??null,
      assists:stats.assists??previous.assists??null});
   }
  }
 }
 return out;
}
export function nbaMilestoneEvents(game,players,baseline){
 const current=new Map(players);
 if(!baseline)return {events:[],current};
 const thresholds=[['points',20,'PTS'],['rebounds',10,'REB'],['assists',10,'AST']];
 const events=[];
 const teams=game.competitions?.[0]?.competitors||[];
 const matchup=teams.map(x=>x.team?.abbreviation||'').filter(Boolean).join(' vs ');
 for(const [id,player] of current){
  const prior=baseline.get(id);
  if(!prior||!player.name)continue;
  for(const [stat,threshold,label] of thresholds){
   if(player[stat]===null||prior[stat]===null||prior[stat]>=threshold||player[stat]<threshold)continue;
   events.push(makeEvent('nba','milestones',`tso2:nba:${game.id}:${id}:${stat}:${threshold}`,
    '🏀 '+player.name+' — '+player[stat]+' '+label,
    [player.team,matchup,'Verified live box score'].filter(Boolean).join(' · '),game.id));
  }
 }
 return {events,current};
}
async function scanNhl(){
 const result=await json(NHL+'/scoreboard?dates='+date());
 const games=normalizeScoreboard(result,Date.now(),easternDate()).games.filter(g=>g.status==='in');
 const batches=await Promise.allSettled(games.map(async game=>{
  const summary=await json(NHL+'/summary?event='+encodeURIComponent(game.id));
  const merged=mergeSummary(game,summary);
  const key='nhl:'+game.id;const {events,current}=nhlGoalEvents(merged,state.get(key));
  state.set(key,current);
  return events;
 }));
 return batches.flatMap((b,i)=>b.status==='fulfilled'?b.value:(console.warn('NHL summary '+games[i].id+': '+b.reason?.message),[]));
}
async function scanNba(){
 const result=await json(NBA+'/scoreboard?dates='+date());
 const games=(result?.events||[]).filter(isLive);
 const batches=await Promise.allSettled(games.map(async game=>{
  const summary=await json(NBA+'/summary?event='+encodeURIComponent(game.id));
  const players=nbaPlayers(summary);if(!players.size)return [];
  const key='nba:'+game.id;const {events,current}=nbaMilestoneEvents(game,players,state.get(key));
  state.set(key,current);return events;
 }));
 return batches.flatMap((b,i)=>b.status==='fulfilled'?b.value:(console.warn('NBA summary '+games[i].id+': '+b.reason?.message),[]));
}
async function subscriptions(){
 if(!SUPABASE||!SECRET)return [];
 const r=await fetch(SUPABASE+'/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth_key,alert_preferences',
  {headers:{apikey:SECRET,Authorization:'Bearer '+SECRET},signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!r.ok)throw Error('Device lookup HTTP '+r.status);
 return r.json();
}
async function send(events){
 if(!events.length)return;
 if(DRY){console.log('DRY '+events.map(e=>e.title+' '+e.key).join(' | '));return;}
 const subs=await subscriptions();let accepted=0,skipped=0,failed=0;
 for(const sub of subs){
  if(!sub.endpoint||!sub.p256dh||!sub.auth_key)continue;
  for(const event of events){
   if(!eligible(sub,event)){skipped++;continue;}
   try{
    await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},
      JSON.stringify(event),{TTL:240,urgency:'high'});accepted++;
   }catch(error){failed++;console.warn('Push provider HTTP '+(error.statusCode||'?'));}
  }
 }
 console.log('TSO2 live NBA/NHL: '+events.length+' event(s), '+accepted+' accepted, '+skipped+' preference skips, '+failed+' rejected');
}
export function fixtureTest(){
 const g={id:'one',away:{abbr:'BOS'},home:{abbr:'NYR'},goals:[]};
 const first=nhlGoalEvents(g,null);
 const goal={id:'p1',period:1,clock:'10:00',team:'BOS',scorer:{id:'123',name:'Example Skater'}};
 const found=nhlGoalEvents({...g,goals:[goal]},first.current);
 if(found.events.length!==1||found.events[0].preference!=='goals')throw Error('NHL goal event fixture failed');
 if(nhlGoalEvents({...g,goals:[goal]},found.current).events.length)throw Error('NHL goal dedup fixture failed');
 const players=new Map([['1',{id:'1',name:'Test Player',points:19,rebounds:9,assists:9,team:'CHI'}]]);
 const nba=nbaMilestoneEvents({id:'game'},new Map([['1',{...players.get('1'),points:20,rebounds:10,assists:10}]]),players);
 if(nba.events.length!==3)throw Error('NBA three milestone fixture failed');
 if(!eligible({alert_preferences:{nba:{milestones:false}}},nba.events[0])){}else throw Error('Disabled NBA preferences must block delivery');
 console.log('TSO2 NHL goal dedup + NBA player milestones + preference gating: PASS');
}
if(SELFTEST){fixtureTest();process.exit(0);}
if(!DRY){
 if(!SUPABASE||!SECRET||!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY||!checkVapidKeysMatch())
  throw Error('TSO2 push sender secrets or VAPID pair are unavailable');
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:noreply@thesportsoutpost.com',
  process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
}
for(let tick=1;;tick++){
 const batches=await Promise.allSettled([scanNhl(),scanNba()]);
 const events=batches.flatMap((b,i)=>b.status==='fulfilled'?b.value:(console.warn((i?'NBA':'NHL')+' source: '+b.reason?.message),[]));
 if(events.length)await send(events);
 if(tick===1||tick%12===0)console.log('TSO2 live NBA/NHL scan '+tick+' · '+events.length+' new event(s)');
 if(MAX_TICKS&&tick>=MAX_TICKS)break;
 await sleep(POLL_MS);
}
