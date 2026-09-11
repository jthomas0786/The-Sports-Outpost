/**
 * sports/nfl/live.js — authoritative in-browser NFL live snapshot builder.
 * v89.14: one accepted snapshot owns scoreboard, clock, possession, field state,
 * current play and the player identities used by Gamecast.
 */

const POLL_MS=2000;
const STATIC_LIVE_URL='slates/nfl-live.json';
const DEFAULT_LIVE_URL='https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
const STATIC_MAX_AGE_MS=2*60*1000;
const LIVE_WINDOW_MS=6*60*60*1000;
const configuredLiveUrl=()=>typeof window==='undefined'?null:(window.DW_NFL_LIVE_ENDPOINT||window.TSO_NFL_LIVE_URL||DEFAULT_LIVE_URL);

let _slate=null,_onChange=null,_timer=null,_inflight=false,_lastNotifySig={};
const _acceptedByGame=new Map();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const teamNorm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const gameSideForTeam=(g,t)=>{const n=teamNorm(t);if(n&&n===teamNorm(g?.away?.abbr))return'away';if(n&&n===teamNorm(g?.home?.abbr))return'home';return null;};
const teamForSide=(g,side)=>teamNorm(side==='home'?g?.home?.abbr:side==='away'?g?.away?.abbr:'');

export function extractLive(event){
  const comp=event?.competitions?.[0];if(!comp)return null;
  const status=comp.status||{},type=status.type||{},state=type.state;
  const comps=comp.competitors||[],home=comps.find(c=>c.homeAway==='home')||comps[0],away=comps.find(c=>c.homeAway==='away')||comps[1];
  if(!home||!away)return null;
  const sit=comp.situation;let possession=null,yardFromOwn=null,isRedZone=false,down=null,distance=null,downDistanceText=null,lastPlayText=null;
  if(sit&&state==='in'){
    down=finite(sit.down);distance=finite(sit.distance);
    downDistanceText=sit.shortDownDistanceText||sit.downDistanceText||sit.possessionText||null;
    lastPlayText=sit.lastPlay?.text||sit.lastPlay?.shortText||null;
    const possId=sit.possession;
    if(possId!=null){if(String(home.team?.id)===String(possId))possession='home';else if(String(away.team?.id)===String(possId))possession='away';}
    isRedZone=!!sit.isRedZone;
    const bl=sit.ballLocation;
    if(bl&&finite(bl.yardLine)!=null&&bl.team?.id!=null&&possId!=null){const own=String(bl.team.id)===String(possId);yardFromOwn=own?Number(bl.yardLine):100-Number(bl.yardLine);if(!own)isRedZone=yardFromOwn>=80;}
  }
  return {status:state,statusDetail:type.shortDetail||(type.completed?type.shortDetail:null),period:status.period||0,clockMin:parseClock(status.displayClock||status.shortClock),awayScore:away.score!=null?Number(away.score):null,homeScore:home.score!=null?Number(home.score):null,possession,yardFromOwn,isRedZone,down,distance,downDistanceText,lastPlayText,lastFetchedAt:Date.now()};
}

function parseClock(displayClock){
  if(!displayClock||typeof displayClock!=='string')return null;
  const z=displayClock.split(':');if(z.length===2){const m=parseInt(z[0],10),s=parseInt(z[1],10);if(Number.isFinite(m)&&Number.isFinite(s))return m+s/60;}
  const n=parseFloat(displayClock);return Number.isFinite(n)?n:null;
}

function resolvePossession(gl,g){
  // ESPN situation.possession is the current accepted authority. A drive can lag
  // by one play during turnovers/change of possession, so only use it as fallback.
  if(gl?.possession==='away'||gl?.possession==='home')return gl.possession;
  const driveSide=gameSideForTeam(g,gl?.currentDrive?.team);if(driveSide)return driveSide;
  const recent=Array.isArray(gl?.plays)?gl.plays:[];
  const playSide=gameSideForTeam(g,recent.at(-1)?.team);if(playSide)return playSide;
  return null;
}

function candidatePlayers(gl,team){
  const out=[],seen=new Set(),nt=teamNorm(team);
  for(const p of Object.values(gl?.playerStats?.byId||{})){
    if(nt&&teamNorm(p?.team)!==nt)continue;
    const name=String(p?.name||'').trim();if(!name||seen.has(name.toLowerCase()))continue;
    seen.add(name.toLowerCase());out.push({...p,headshot:p?.headshot||''});
  }
  const box=gl?.boxScore?.teams?.[nt];
  for(const sec of box?.sections||[])for(const row of sec?.rows||[]){
    const name=String(row?.name||'').trim();if(!name||seen.has(name.toLowerCase()))continue;
    seen.add(name.toLowerCase());out.push({id:row?.id||null,name,team:nt,position:row?.position||'',jersey:row?.jersey||'',headshot:row?.headshot||''});
  }
  return out;
}
const playerRef=p=>p?{id:p.id?String(p.id):null,name:String(p.name||''),team:teamNorm(p.team),position:String(p.position||''),jersey:p.jersey==null?'':String(p.jersey),headshot:String(p.headshot||'')}:null;
const lastName=s=>String(s||'').trim().toLowerCase().split(/\s+/).at(-1)?.replace(/[^a-z0-9'-]/g,'')||'';
function findPlayerInText(gl,team,text){
  const low=String(text||'').toLowerCase();if(!low)return null;
  let best=null,bestIdx=Infinity;
  for(const p of candidatePlayers(gl,team)){
    const last=lastName(p.name);if(last.length<3)continue;
    const idx=low.search(new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`));
    if(idx>=0&&idx<bestIdx){best=p;bestIdx=idx;}
  }
  return best;
}
function qbForTeam(gl,team){return candidatePlayers(gl,team).find(p=>String(p.position||'').toUpperCase()==='QB')||null;}
function afterTo(text){const s=String(text||'');const m=s.match(/\bto\s+(.+?)(?=\s+(?:to\s+[A-Z]{2,3}\s+\d+|for\s|at\s)|,|$)/i);return m?.[1]||'';}
function playKind(text,type=''){
  const s=`${type||''} ${text||''}`;
  if(/intercept|fumble/i.test(s))return'turnover';
  if(/sack/i.test(s))return'sack';
  if(/pass|complete|incomplete/i.test(s))return'pass';
  if(/rush|run|scramble|kneel/i.test(s))return'rush';
  if(/punt/i.test(s))return'punt';
  if(/field goal|extra point|kick/i.test(s))return'kick';
  return'other';
}
function playYards(txt){
  const s=String(txt||'');if(/no gain|incomplete/i.test(s))return 0;
  const loss=s.match(/loss of\s+(\d+)\s+yards?/i);if(loss)return-Number(loss[1]);
  const m=s.match(/(?:for|gain(?:s|ed)?(?: of)?|gained)\s+(-?\d+)\s+yards?/i)||s.match(/(-?\d+)\s+yard(?:s)?\b/i);
  return m?Number(m[1]):0;
}
function playDirection(text){const s=String(text||'').toLowerCase();if(/\bleft\b/.test(s))return'left';if(/\bright\b/.test(s))return'right';return'middle';}
function exactOwnYard(yardsToEndzone){const n=finite(yardsToEndzone);return n==null?null:clamp(100-n,0,100);}

function currentPlayFrom(gl,possession,g){
  const recent=Array.isArray(gl?.plays)?gl.plays:[];
  const p=recent.at(-1)||gl?.currentDrive?.plays?.at?.(-1)||null;if(!p)return null;
  const desc=p.text||p.shortText||gl.lastPlayText||'',kind=playKind(desc,p.type),playTeam=teamNorm(p?.team||gl?.currentDrive?.team||teamForSide(g,possession));
  const passer=(kind==='pass'||kind==='sack')?(findPlayerInText(gl,playTeam,String(desc).split(/\bpass|\bsack/i)[0])||qbForTeam(gl,playTeam)):null;
  const target=kind==='pass'?findPlayerInText(gl,playTeam,afterTo(desc)):null;
  const runner=kind==='rush'?findPlayerInText(gl,playTeam,desc):null;
  const featured=target||runner||passer||findPlayerInText(gl,playTeam,desc);
  return {id:String(p.id||''),description:desc,playerName:featured?.name||'',playerPos:featured?.position||'',playerNo:featured?.jersey||'',headshot:featured?.headshot||'',team:playTeam,type:p.type||'',kind,resultYards:playYards(desc),yards:playYards(desc),targetName:target?.name||'',passer:playerRef(passer),target:playerRef(target),runner:playerRef(runner),direction:playDirection(desc),drivePlays:gl?.currentDrive?.playCount||gl?.currentDrive?.plays?.length||recent.length,driveYards:gl?.currentDrive?.yards||0,driveTime:gl?.currentDrive?.elapsedDisplay||''};
}

function buildGamecastState(gl,possession,g,currentPlay){
  const recent=Array.isArray(gl?.plays)?gl.plays:[];
  const p=recent.at(-1)||gl?.currentDrive?.plays?.at?.(-1)||null;
  const playSide=gameSideForTeam(g,p?.team)||possession||null;
  const playTeam=teamForSide(g,playSide)||teamNorm(p?.team||currentPlay?.team||'');
  const kind=currentPlay?.kind||playKind(p?.text||gl?.lastPlayText||'',p?.type||'');
  const gain=finite(currentPlay?.resultYards)??playYards(p?.text||gl?.lastPlayText||'');
  const exactStart=exactOwnYard(p?.startYardsToEndzone);
  const exactEndRaw=exactOwnYard(p?.endYardsToEndzone);
  const startTeam=teamNorm(p?.startTeam||p?.team||playTeam),endTeam=teamNorm(p?.endTeam||'');
  const turnover=kind==='turnover'||(startTeam&&endTeam&&startTeam!==endTeam);
  let currentOwn=finite(gl?.yardFromOwn);if(currentOwn!=null)currentOwn=clamp(currentOwn,0,100);
  let startOwn=exactStart;
  let endOwn=!turnover&&exactEndRaw!=null?exactEndRaw:null;
  if(endOwn==null&&playSide===possession&&currentOwn!=null)endOwn=currentOwn;
  if(startOwn==null&&endOwn!=null)startOwn=clamp(endOwn-gain,0,100);
  if(startOwn==null&&currentOwn!=null)startOwn=clamp(currentOwn-gain,0,100);
  if(endOwn==null&&startOwn!=null)endOwn=clamp(startOwn+gain,0,100);
  const startDistance=finite(p?.startDistance??p?.distance)??finite(gl?.distance)??10;
  const preSnapFirstDown=startOwn==null?null:clamp(startOwn+Math.max(0,startDistance),0,100);
  const currentDistance=finite(gl?.distance);
  const currentFirstDown=currentOwn==null||currentDistance==null?null:clamp(currentOwn+Math.max(0,currentDistance),0,100);
  const qb=qbForTeam(gl,playTeam);
  const passer=currentPlay?.passer||playerRef((kind==='pass'||kind==='sack')?(findPlayerInText(gl,playTeam,String(p?.text||'').split(/\bpass|\bsack/i)[0])||qb):qb);
  const target=currentPlay?.target||playerRef(kind==='pass'?findPlayerInText(gl,playTeam,afterTo(p?.text||'')):null);
  const runner=currentPlay?.runner||playerRef(kind==='rush'?findPlayerInText(gl,playTeam,p?.text||''):null);
  return {
    gameId:String(g?.gameId||g?.id||''),playId:String(p?.id||currentPlay?.id||''),description:String(p?.text||currentPlay?.description||gl?.lastPlayText||''),kind,direction:currentPlay?.direction||playDirection(p?.text||''),resultYards:gain,
    possession,playOffenseSide:playSide,offenseAbbr:playTeam,defenseAbbr:teamForSide(g,playSide==='away'?'home':playSide==='home'?'away':null),
    startYardFromOwn:startOwn,endYardFromOwn:endOwn,currentYardFromOwn:currentOwn,
    startDown:finite(p?.startDown??p?.down),startDistance,preSnapFirstDownYardFromOwn:preSnapFirstDown,currentFirstDownYardFromOwn:currentFirstDown,
    passer:passer||playerRef(qb),runner,target,turnover,exactStart:exactStart!=null,exactEnd:exactEndRaw!=null&&!turnover
  };
}

function notifySig(gl,g,possession,currentPlay,gamecastState){
  const d=gl?.currentDrive||{},p=(Array.isArray(gl?.plays)?gl.plays:[]).at(-1)||{};
  return [gl?.status||'',gl?.awayScore??'',gl?.homeScore??'',gl?.period??'',possession||'',gl?.yardFromOwn==null?'':Math.round(gl.yardFromOwn),gl?.down??'',gl?.distance??'',gl?.downDistanceText||'',d.id||'',d.playCount??'',d.yards??'',p.id||'',gamecastState?.startYardFromOwn??'',gamecastState?.endYardFromOwn??'',currentPlay?.description||gl?.lastPlayText||''].join('|');
}

function clockText(v){if(v==null||!Number.isFinite(Number(v)))return'';let s=Math.max(0,Math.round(Number(v)*60));const m=Math.floor(s/60);s%=60;return`${m}:${String(s).padStart(2,'0')}`;}
function patchClockOnly(g,gl,possession){
  if(typeof document==='undefined')return;
  const wrap=document.querySelector('#nflView:not([hidden]) .nxg-concept')||document.querySelector('#nflView:not([hidden])');if(!wrap)return;
  const scores=wrap.querySelectorAll('.nxg-score');
  if(scores[0]&&gl.awayScore!=null)scores[0].textContent=String(gl.awayScore);
  if(scores[1]&&gl.homeScore!=null)scores[1].textContent=String(gl.homeScore);
  const c=wrap.querySelector('.nxg-clock');if(c&&gl.clockMin!=null)c.textContent=clockText(gl.clockMin);
  const q=wrap.querySelector('.nxg-period');if(q&&gl.period)q.textContent=gl.period<=4?`${gl.period}${gl.period===1?'ST':gl.period===2?'ND':gl.period===3?'RD':'TH'}`:'OT';
  const poss=wrap.querySelector('.nxg-posstext');if(poss&&possession)poss.textContent=`${possession==='away'?g?.away?.abbr:g?.home?.abbr} has the ball`;
}

function docTime(data){const n=Number(data?.lastFetchedAt);if(Number.isFinite(n)&&n>0)return n;const p=Date.parse(data?.generatedAt||'');return Number.isFinite(p)?p:null;}
function isFreshDoc(data){const t=docTime(data);return t!=null&&Math.abs(Date.now()-t)<=STATIC_MAX_AGE_MS;}
function likelyLiveGame(g){if(g?.status==='in'||Number(g?.liveScore?.period)>0)return true;const t=Date.parse(g?.startTimeUTC||'');if(!Number.isFinite(t))return false;const d=Date.now()-t;return d>=0&&d<LIVE_WINDOW_MS&&g?.status!=='closed';}
function candidateAccepted(g,gl,source,data){
  const id=String(g?.gameId||g?.id||'');
  if(source==='static'&&likelyLiveGame(g)&&!isFreshDoc(data))return false;
  if(likelyLiveGame(g)&&gl?.status==='pre')return false;
  const prior=_acceptedByGame.get(id);
  const away=Number(gl?.awayScore),home=Number(gl?.homeScore),period=Number(gl?.period),clock=Number(gl?.clockMin);
  if(prior){
    if(Number.isFinite(away)&&Number.isFinite(prior.awayScore)&&away<prior.awayScore)return false;
    if(Number.isFinite(home)&&Number.isFinite(prior.homeScore)&&home<prior.homeScore)return false;
    if(Number.isFinite(period)&&Number.isFinite(prior.period)&&period<prior.period)return false;
    if((prior.status==='in'||prior.status==='closed')&&gl?.status==='pre')return false;
    if(period===prior.period&&Number.isFinite(clock)&&Number.isFinite(prior.clockMin)){
      const elapsed=Math.max(0,(Date.now()-prior.acceptedAt)/60000),drop=prior.clockMin-clock,rise=clock-prior.clockMin;
      if(rise>.75)return false;
      if(drop>elapsed+.75&&!(clock===0&&prior.clockMin<=2.25))return false;
    }
  }
  const currentAway=Number(g?.away?.score),currentHome=Number(g?.home?.score);
  if(Number.isFinite(away)&&Number.isFinite(currentAway)&&away<currentAway)return false;
  if(Number.isFinite(home)&&Number.isFinite(currentHome)&&home<currentHome)return false;
  return true;
}
function rememberAccepted(g,gl){_acceptedByGame.set(String(g?.gameId||g?.id||''),{status:gl?.status||g?.status||'',period:Number(gl?.period)||0,clockMin:Number.isFinite(Number(gl?.clockMin))?Number(gl.clockMin):null,awayScore:Number.isFinite(Number(gl?.awayScore))?Number(gl.awayScore):Number(g?.away?.score)||0,homeScore:Number.isFinite(Number(gl?.homeScore))?Number(gl.homeScore):Number(g?.home?.score)||0,acceptedAt:Date.now()});}

async function fetchJson(url){try{const r=await fetch(url,{cache:'no-store'});if(!r?.ok)return null;const d=await r.json();return d?.games?d:null;}catch{return null;}}
async function loadLiveDocument(){const remote=configuredLiveUrl();if(remote){const data=await fetchJson(remote);if(data&&Object.keys(data.games||{}).length)return {data,source:'remote'};}const data=await fetchJson(STATIC_LIVE_URL);if(!data)return null;return {data,source:'static'};}

async function tick(){
  if(_inflight||!_slate)return;_inflight=true;
  try{
    const loaded=await loadLiveDocument();if(!loaded)return;
    const {data,source}=loaded,live=data?.games||{};let changed=false;
    for(const g of (_slate.games||[])){
      const gl=live[String(g.gameId)];if(!gl||!candidateAccepted(g,gl,source,data))continue;
      const possession=resolvePossession(gl,g),currentPlay=currentPlayFrom(gl,possession,g),gamecastState=buildGamecastState(gl,possession,g,currentPlay);
      g.status=gl.status||g.status;g.statusDetail=gl.statusDetail||g.statusDetail;
      g.away={...(g.away||{}),score:gl.awayScore!=null?gl.awayScore:(g.away?.score??0)};
      g.home={...(g.home||{}),score:gl.homeScore!=null?gl.homeScore:(g.home?.score??0)};
      g.currentPlay=currentPlay||g.currentPlay||null;
      g.liveScore={period:gl.period,clockMin:gl.clockMin,possession,yardFromOwn:gl.yardFromOwn,isRedZone:gl.isRedZone,down:gl.down,distance:gl.distance,downDistanceText:gl.downDistanceText,lastPlayText:gl.lastPlayText,currentPlay,gamecastState,winProbability:gl.winProbability||null,linescores:gl.linescores||null,currentDrive:gl.currentDrive||null,plays:Array.isArray(gl.plays)?gl.plays:[],playerStats:gl.playerStats||null,boxScore:gl.boxScore||null,teamStats:gl.teamStats||null,scoringPlays:Array.isArray(gl.scoringPlays)?gl.scoringPlays:[],lastFetchedAt:gl.lastFetchedAt||data.lastFetchedAt,source};
      rememberAccepted(g,gl);patchClockOnly(g,gl,possession);
      const snap={gameId:String(g.gameId),away:g.away,home:g.home,possession,currentPlay,gamecastState,liveScore:g.liveScore,updatedAt:Date.now(),source};
      if(typeof window!=='undefined'){window.__TSO_NFL_LIVE_LATEST__=snap;window.dispatchEvent(new CustomEvent('tso:nfl-live-snapshot',{detail:snap}));}
      const sig=notifySig(gl,g,possession,currentPlay,gamecastState);if(_lastNotifySig[g.gameId]!==sig){_lastNotifySig[g.gameId]=sig;changed=true;}
    }
    if(changed&&typeof _onChange==='function')_onChange();
  }catch{}finally{_inflight=false;}
}
function shouldPoll(){if(!_slate)return false;const now=Date.now();return(_slate.games||[]).some(g=>g.status==='in'||(g.status==='pre'&&g.startTimeUTC&&Number.isFinite(new Date(g.startTimeUTC).getTime())&&new Date(g.startTimeUTC).getTime()-now<30*60000&&new Date(g.startTimeUTC).getTime()-now>-3*3600000));}
export function startLivePolling(slate,onChange){_slate=slate;_onChange=onChange||null;if(_timer)clearInterval(_timer);tick();_timer=setInterval(()=>{if(shouldPoll())tick();},POLL_MS);}
export async function refreshLiveNow(){await tick();}
export function stopLivePolling(){if(_timer){clearInterval(_timer);_timer=null;}_slate=null;_onChange=null;_lastNotifySig={};_acceptedByGame.clear();}
export function timeRemainingMin(period,clockMin){if(!period||period<1)return 60;if(period>=5){if(clockMin==null||clockMin<0)return 10;return Math.min(10,Math.max(0,clockMin));}const inQuarter=clockMin==null?15:Math.max(0,Math.min(15,clockMin));return(4-period)*15+inQuarter;}

export const __LIVE_TEST__={playYards,playKind,playDirection,currentPlayFrom,buildGamecastState,candidatePlayers,findPlayerInText,exactOwnYard};
