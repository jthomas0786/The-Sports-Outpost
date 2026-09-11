/**
 * sports/nfl/live.js — in-browser live-score merge for the NFL gamecast.
 * v89.7: merge every poll, but only notify the heavy renderer for real football
 * state changes (not the running game clock). Also prefer current-drive/play team
 * identity over stale situation possession when they disagree.
 */

const POLL_MS=2000;
const STATIC_LIVE_URL='slates/nfl-live.json';
const DEFAULT_LIVE_URL='https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
const configuredLiveUrl=()=>typeof window==='undefined'?null:(window.DW_NFL_LIVE_ENDPOINT||window.TSO_NFL_LIVE_URL||DEFAULT_LIVE_URL);

let _slate=null,_onChange=null,_timer=null,_inflight=false,_lastNotifySig={};

export function extractLive(event){
  const comp=event?.competitions?.[0];if(!comp)return null;
  const status=comp.status||{},type=status.type||{},state=type.state;
  const comps=comp.competitors||[],home=comps.find(c=>c.homeAway==='home')||comps[0],away=comps.find(c=>c.homeAway==='away')||comps[1];
  if(!home||!away)return null;
  const sit=comp.situation;let possession=null,yardFromOwn=null,isRedZone=false,down=null,distance=null,downDistanceText=null,lastPlayText=null;
  if(sit&&state==='in'){
    down=Number.isFinite(Number(sit.down))?Number(sit.down):null;
    distance=Number.isFinite(Number(sit.distance))?Number(sit.distance):null;
    downDistanceText=sit.shortDownDistanceText||sit.downDistanceText||sit.possessionText||null;
    lastPlayText=sit.lastPlay?.text||sit.lastPlay?.shortText||null;
    const possId=sit.possession;
    if(possId!=null){if(String(home.team?.id)===String(possId))possession='home';else if(String(away.team?.id)===String(possId))possession='away';}
    isRedZone=!!sit.isRedZone;
    const bl=sit.ballLocation;
    if(bl&&Number.isFinite(Number(bl.yardLine))&&bl.team?.id!=null&&possId!=null){const own=String(bl.team.id)===String(possId);yardFromOwn=own?Number(bl.yardLine):100-Number(bl.yardLine);if(!own)isRedZone=yardFromOwn>=80;}
  }
  return {status:state,statusDetail:type.shortDetail||(type.completed?type.shortDetail:null),period:status.period||0,clockMin:parseClock(status.displayClock||status.shortClock),awayScore:away.score!=null?Number(away.score):null,homeScore:home.score!=null?Number(home.score):null,possession,yardFromOwn,isRedZone,down,distance,downDistanceText,lastPlayText,lastFetchedAt:Date.now()};
}

function parseClock(displayClock){
  if(!displayClock||typeof displayClock!=='string')return null;
  const z=displayClock.split(':');if(z.length===2){const m=parseInt(z[0],10),s=parseInt(z[1],10);if(Number.isFinite(m)&&Number.isFinite(s))return m+s/60;}
  const n=parseFloat(displayClock);return Number.isFinite(n)?n:null;
}
const teamNorm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const gameSideForTeam=(g,t)=>{const n=teamNorm(t);if(n&&n===teamNorm(g?.away?.abbr))return'away';if(n&&n===teamNorm(g?.home?.abbr))return'home';return null;};

function resolvePossession(gl,g){
  // Current drive is more reliable than ESPN's situation field during drive/play transitions.
  const driveSide=gameSideForTeam(g,gl?.currentDrive?.team);if(driveSide)return driveSide;
  if(gl?.possession==='away'||gl?.possession==='home')return gl.possession;
  const recent=Array.isArray(gl?.plays)?gl.plays:[];
  const playSide=gameSideForTeam(g,recent.at(-1)?.team);if(playSide)return playSide;
  return null;
}

function candidatePlayers(gl,team){
  const out=[],seen=new Set();
  for(const p of Object.values(gl?.playerStats?.byId||{})){
    if(team&&teamNorm(p?.team)!==team)continue;
    const name=String(p?.name||'').trim();if(!name||seen.has(name.toLowerCase()))continue;
    seen.add(name.toLowerCase());out.push({...p,headshot:p?.headshot||''});
  }
  const box=gl?.boxScore?.teams?.[team];
  for(const sec of box?.sections||[])for(const row of sec?.rows||[]){
    const name=String(row?.name||'').trim();if(!name||seen.has(name.toLowerCase()))continue;
    seen.add(name.toLowerCase());out.push({name,team,position:row?.position||'',jersey:row?.jersey||'',headshot:row?.headshot||''});
  }
  return out;
}

function findPlayPlayer(gl,play,possession,g){
  if(!play)return null;
  const text=String(play.text||play.shortText||'');
  const low=text.toLowerCase();
  // The play's own team is authoritative. This fixes cases where possession has already
  // flipped but the newest play still belongs to the previous offense.
  const playTeam=teamNorm(play?.team)||teamNorm(gl?.currentDrive?.team)||teamNorm(possession==='away'?g?.away?.abbr:possession==='home'?g?.home?.abbr:'');
  const players=candidatePlayers(gl,playTeam);
  let best=null,bestIdx=Infinity;
  for(const p of players){
    const last=String(p?.name||'').toLowerCase().split(/\s+/).at(-1)?.replace(/[^a-z'-]/g,'')||'';
    if(last.length<3)continue;const idx=low.indexOf(last);if(idx>=0&&idx<bestIdx){best=p;bestIdx=idx;}
  }
  if(best)return best;
  // ESPN play text still gives us a useful identity even before box/player stats arrive.
  const token=text.replace(/^\([^)]*\)\s*/,'').match(/\b([A-Z]\.[A-Za-z][A-Za-z'’-]{2,})\b/);
  if(token)return {name:token[1].replace('.', '. '),team:playTeam,position:'',jersey:'',headshot:''};
  return null;
}

function playYards(text){const m=String(text||'').match(/for\s+(-?\d+)\s+yards?/i);return m?Number(m[1]):0;}
function currentPlayFrom(gl,possession,g){
  const recent=Array.isArray(gl?.plays)?gl.plays:[];
  const play=recent.at(-1)||gl?.currentDrive?.plays?.at?.(-1)||null;if(!play)return null;
  const player=findPlayPlayer(gl,play,possession,g),desc=play.text||play.shortText||gl.lastPlayText||'';
  return {id:String(play.id||''),description:desc,playerName:player?.name||'',playerPos:player?.position||'',playerNo:player?.jersey||'',headshot:player?.headshot||'',team:teamNorm(play?.team||player?.team||''),type:play.type||'',resultYards:playYards(desc),yards:playYards(desc),targetName:'',drivePlays:gl?.currentDrive?.playCount||gl?.currentDrive?.plays?.length||recent.length,driveYards:gl?.currentDrive?.yards||0,driveTime:gl?.currentDrive?.elapsedDisplay||''};
}

function notifySig(gl,g,possession,currentPlay){
  const d=gl?.currentDrive||{},p=(Array.isArray(gl?.plays)?gl.plays:[]).at(-1)||{};
  // CLOCK IS INTENTIONALLY ABSENT. A running clock must never rebuild the field.
  return [gl?.status||'',gl?.awayScore??'',gl?.homeScore??'',gl?.period??'',possession||'',gl?.yardFromOwn==null?'':Math.round(gl.yardFromOwn),gl?.down??'',gl?.distance??'',gl?.downDistanceText||'',d.id||'',d.playCount??'',d.yards??'',p.id||'',currentPlay?.description||gl?.lastPlayText||''].join('|');
}

function clockText(v){if(v==null||!Number.isFinite(Number(v)))return'';let s=Math.max(0,Math.round(Number(v)*60));const m=Math.floor(s/60);s%=60;return`${m}:${String(s).padStart(2,'0')}`;}
function patchClockOnly(g,gl,possession){
  if(typeof document==='undefined')return;
  const wrap=document.querySelector('#nflView:not([hidden]) .nxg-concept')||document.querySelector('#nflView:not([hidden])');if(!wrap)return;
  const scores=wrap.querySelectorAll('.nxg-score');if(scores[0]&&gl.awayScore!=null)scores[0].textContent=String(gl.awayScore);if(scores[1]&&gl.homeScore!=null)scores[1].textContent=String(gl.homeScore);
  const c=wrap.querySelector('.nxg-clock');if(c&&gl.clockMin!=null)c.textContent=clockText(gl.clockMin);
  const q=wrap.querySelector('.nxg-period');if(q&&gl.period)q.textContent=gl.period<=4?`${gl.period}${gl.period===1?'ST':gl.period===2?'ND':gl.period===3?'RD':'TH'}`:'OT';
  const poss=wrap.querySelector('.nxg-posstext');if(poss&&possession)poss.textContent=`${possession==='away'?g?.away?.abbr:g?.home?.abbr} has the ball`;
}

async function tick(){
  if(_inflight||!_slate)return;_inflight=true;
  try{
    let res=null;const remote=configuredLiveUrl();if(remote){try{res=await fetch(remote,{cache:'no-store'});}catch{res=null;}}
    if(!res||!res.ok)res=await fetch(STATIC_LIVE_URL,{cache:'no-store'});if(!res?.ok)return;
    const data=await res.json(),live=data?.games||{};let changed=false;
    for(const g of (_slate.games||[])){
      const gl=live[String(g.gameId)];if(!gl)continue;
      const possession=resolvePossession(gl,g),currentPlay=currentPlayFrom(gl,possession,g);
      g.status=gl.status||g.status;g.statusDetail=gl.statusDetail||g.statusDetail;
      g.away={...(g.away||{}),score:gl.awayScore!=null?gl.awayScore:(g.away?.score??0)};g.home={...(g.home||{}),score:gl.homeScore!=null?gl.homeScore:(g.home?.score??0)};
      g.currentPlay=currentPlay||g.currentPlay||null;
      g.liveScore={period:gl.period,clockMin:gl.clockMin,possession,yardFromOwn:gl.yardFromOwn,isRedZone:gl.isRedZone,down:gl.down,distance:gl.distance,downDistanceText:gl.downDistanceText,lastPlayText:gl.lastPlayText,currentPlay,winProbability:gl.winProbability||null,linescores:gl.linescores||null,currentDrive:gl.currentDrive||null,plays:Array.isArray(gl.plays)?gl.plays:[],playerStats:gl.playerStats||null,boxScore:gl.boxScore||null,teamStats:gl.teamStats||null,scoringPlays:Array.isArray(gl.scoringPlays)?gl.scoringPlays:[],lastFetchedAt:gl.lastFetchedAt||data.lastFetchedAt};
      patchClockOnly(g,gl,possession);
      const snap={gameId:String(g.gameId),away:g.away,home:g.home,possession,currentPlay,liveScore:g.liveScore,updatedAt:Date.now()};
      if(typeof window!=='undefined'){
        window.__TSO_NFL_LIVE_LATEST__=snap;
        window.dispatchEvent(new CustomEvent('tso:nfl-live-snapshot',{detail:snap}));
      }
      const sig=notifySig(gl,g,possession,currentPlay);
      if(_lastNotifySig[g.gameId]!==sig){_lastNotifySig[g.gameId]=sig;changed=true;}
    }
    if(changed&&typeof _onChange==='function')_onChange();
  }catch{}finally{_inflight=false;}
}
function shouldPoll(){if(!_slate)return false;const now=Date.now();return(_slate.games||[]).some(g=>g.status==='in'||(g.status==='pre'&&g.startTimeUTC&&Number.isFinite(new Date(g.startTimeUTC).getTime())&&new Date(g.startTimeUTC).getTime()-now<30*60000&&new Date(g.startTimeUTC).getTime()-now>-3*3600000));}
export function startLivePolling(slate,onChange){_slate=slate;_onChange=onChange||null;if(_timer)clearInterval(_timer);tick();_timer=setInterval(()=>{if(shouldPoll())tick();},POLL_MS);}
export async function refreshLiveNow(){await tick();}
export function stopLivePolling(){if(_timer){clearInterval(_timer);_timer=null;}_slate=null;_onChange=null;_lastNotifySig={};}
export function timeRemainingMin(period,clockMin){if(!period||period<1)return 60;if(period>=5){if(clockMin==null||clockMin<0)return 10;return Math.min(10,Math.max(0,clockMin));}const inQuarter=clockMin==null?15:Math.max(0,Math.min(15,clockMin));return(4-period)*15+inQuarter;}
