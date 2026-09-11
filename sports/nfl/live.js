/**
 * sports/nfl/live.js — in-browser live-score merge for the NFL gamecast.
 */

const POLL_MS = 2000;
const STATIC_LIVE_URL = 'slates/nfl-live.json';
const DEFAULT_LIVE_URL = 'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
const configuredLiveUrl = () => typeof window === 'undefined' ? null : (window.DW_NFL_LIVE_ENDPOINT || window.TSO_NFL_LIVE_URL || DEFAULT_LIVE_URL);

let _slate=null,_onChange=null,_timer=null,_inflight=false,_lastSig={};

export function extractLive(event){
  const comp=event?.competitions?.[0]; if(!comp)return null;
  const status=comp.status||{},type=status.type||{},state=type.state;
  const comps=comp.competitors||[],home=comps.find(c=>c.homeAway==='home')||comps[0],away=comps.find(c=>c.homeAway==='away')||comps[1];
  if(!home||!away)return null;
  const sit=comp.situation; let possession=null,yardFromOwn=null,isRedZone=false,down=null,distance=null,downDistanceText=null,lastPlayText=null;
  if(sit&&state==='in'){
    down=Number.isFinite(Number(sit.down))?Number(sit.down):null;
    distance=Number.isFinite(Number(sit.distance))?Number(sit.distance):null;
    downDistanceText=sit.shortDownDistanceText||sit.downDistanceText||sit.possessionText||null;
    lastPlayText=sit.lastPlay?.text||sit.lastPlay?.shortText||null;
    const possId=sit.possession;
    if(possId!=null){if(String(home.team?.id)===String(possId))possession='home';else if(String(away.team?.id)===String(possId))possession='away';}
    isRedZone=!!sit.isRedZone;
    const bl=sit.ballLocation;
    if(bl&&Number.isFinite(Number(bl.yardLine))&&bl.team?.id!=null&&possId!=null){
      const own=String(bl.team.id)===String(possId);yardFromOwn=own?Number(bl.yardLine):100-Number(bl.yardLine);if(!own)isRedZone=yardFromOwn>=80;
    }
  }
  return {status:state,statusDetail:type.shortDetail||(type.completed?type.shortDetail:null),period:status.period||0,clockMin:parseClock(status.displayClock||status.shortClock),awayScore:away.score!=null?Number(away.score):null,homeScore:home.score!=null?Number(home.score):null,possession,yardFromOwn,isRedZone,down,distance,downDistanceText,lastPlayText,lastFetchedAt:Date.now()};
}

function parseClock(displayClock){
  if(!displayClock||typeof displayClock!=='string')return null;
  const parts=displayClock.split(':');if(parts.length===2){const m=parseInt(parts[0],10),s=parseInt(parts[1],10);if(Number.isFinite(m)&&Number.isFinite(s))return m+s/60;}
  const n=parseFloat(displayClock);return Number.isFinite(n)?n:null;
}
const teamNorm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
function resolvePossession(gl,g){
  if(gl?.possession==='away'||gl?.possession==='home')return gl.possession;
  const away=teamNorm(g?.away?.abbr),home=teamNorm(g?.home?.abbr);
  const driveTeam=teamNorm(gl?.currentDrive?.team);
  if(driveTeam===away)return 'away'; if(driveTeam===home)return 'home';
  const recent=Array.isArray(gl?.plays)?gl.plays:[]; const lastTeam=teamNorm(recent.at(-1)?.team);
  if(lastTeam===away)return 'away'; if(lastTeam===home)return 'home';
  return null;
}
function findPlayPlayer(gl,play,possession,g){
  if(!play)return null;
  const text=String(play.text||play.shortText||'').toLowerCase();
  const team=possession==='away'?teamNorm(g?.away?.abbr):possession==='home'?teamNorm(g?.home?.abbr):'';
  const players=Object.values(gl?.playerStats?.byId||{}).filter(p=>!team||teamNorm(p?.team)===team);
  let best=null,bestIdx=Infinity;
  for(const p of players){
    const name=String(p?.name||'').trim(); if(!name)continue;
    const last=name.toLowerCase().split(/\s+/).at(-1)?.replace(/[^a-z'-]/g,'')||''; if(last.length<3)continue;
    const idx=text.indexOf(last); if(idx>=0&&idx<bestIdx){best=p;bestIdx=idx;}
  }
  if(!best)return null;
  let headshot='';
  const boxTeam=gl?.boxScore?.teams?.[team];
  for(const sec of boxTeam?.sections||[]){const row=(sec.rows||[]).find(r=>String(r?.name||'').toLowerCase()===String(best.name||'').toLowerCase());if(row?.headshot){headshot=row.headshot;break;}}
  return {...best,headshot};
}
function playYards(text){const m=String(text||'').match(/for\s+(-?\d+)\s+yards?/i);return m?Number(m[1]):0;}
function currentPlayFrom(gl,possession,g){
  const recent=Array.isArray(gl?.plays)?gl.plays:[];
  const play=recent.at(-1)||gl?.currentDrive?.plays?.at?.(-1)||null;
  if(!play)return null;
  const player=findPlayPlayer(gl,play,possession,g);
  return {description:play.text||play.shortText||gl.lastPlayText||'',playerName:player?.name||'',playerPos:player?.position||'',playerNo:player?.jersey||'',headshot:player?.headshot||'',type:play.type||'',resultYards:playYards(play.text),yards:playYards(play.text),targetName:'',drivePlays:gl?.currentDrive?.playCount||gl?.currentDrive?.plays?.length||recent.length,driveYards:gl?.currentDrive?.yards||0,driveTime:gl?.currentDrive?.elapsedDisplay||''};
}
function sig(live){
  if(!live)return '';
  const drive=live.currentDrive||{},recent=Array.isArray(live.plays)?live.plays:[],playerKeys=Object.keys(live.playerStats?.byId||{}).sort(),boxTeams=live.boxScore?.teams||{};
  const boxSig=Object.entries(boxTeams).map(([abbr,t])=>`${abbr}:${(t?.sections||[]).map(s=>`${s.name}:${(s.rows||[]).length}`).join(',')}`).sort().join(';');
  // Deliberately exclude lastFetchedAt. The old signature treated every 2-second
  // poll as a state change, forcing the Gamecast to rebuild/flash even when no play changed.
  return [live.status,live.awayScore,live.homeScore,live.period,live.clockMin!=null?Number(live.clockMin).toFixed(2):'',live.possession,live.yardFromOwn!=null?Math.round(live.yardFromOwn):'',live.isRedZone?1:0,live.down??'',live.distance??'',live.downDistanceText||'',live.lastPlayText||'',live.winProbability?.home??'',live.winProbability?.away??'',drive.id||'',drive.playCount??'',drive.yards??'',drive.elapsedDisplay||'',recent.at(-1)?.id||'',recent.length,playerKeys.length,boxSig].join('|');
}

async function tick(){
  if(_inflight||!_slate)return;_inflight=true;
  try{
    let res=null;const remote=configuredLiveUrl();if(remote){try{res=await fetch(remote,{cache:'no-store'});}catch{res=null;}}
    if(!res||!res.ok)res=await fetch(STATIC_LIVE_URL,{cache:'no-store'});if(!res.ok)return;
    const data=await res.json(),live=data?.games||{};let changed=false;
    for(const g of (_slate.games||[])){
      const gl=live[String(g.gameId)];if(!gl)continue;const s=sig(gl);if(!s||_lastSig[g.gameId]===s)continue;
      const possession=resolvePossession(gl,g);const currentPlay=currentPlayFrom(gl,possession,g);
      g.status=gl.status||g.status;g.statusDetail=gl.statusDetail||g.statusDetail;
      g.away={...(g.away||{}),score:gl.awayScore!=null?gl.awayScore:(g.away?.score??0)};g.home={...(g.home||{}),score:gl.homeScore!=null?gl.homeScore:(g.home?.score??0)};
      g.currentPlay=currentPlay||g.currentPlay||null;
      g.liveScore={period:gl.period,clockMin:gl.clockMin,possession,yardFromOwn:gl.yardFromOwn,isRedZone:gl.isRedZone,down:gl.down,distance:gl.distance,downDistanceText:gl.downDistanceText,lastPlayText:gl.lastPlayText,currentPlay,winProbability:gl.winProbability||null,linescores:gl.linescores||null,currentDrive:gl.currentDrive||null,plays:Array.isArray(gl.plays)?gl.plays:[],playerStats:gl.playerStats||null,boxScore:gl.boxScore||null,teamStats:gl.teamStats||null,scoringPlays:Array.isArray(gl.scoringPlays)?gl.scoringPlays:[],lastFetchedAt:gl.lastFetchedAt||data.lastFetchedAt};
      _lastSig[g.gameId]=s;changed=true;
    }
    if(changed&&typeof _onChange==='function')_onChange();
  }catch{}finally{_inflight=false;}
}
function shouldPoll(){
  if(!_slate)return false;const now=Date.now();return (_slate.games||[]).some(g=>g.status==='in'||(g.status==='pre'&&g.startTimeUTC&&Number.isFinite(new Date(g.startTimeUTC).getTime())&&new Date(g.startTimeUTC).getTime()-now<30*60000&&new Date(g.startTimeUTC).getTime()-now>-3*3600000));
}
export function startLivePolling(slate,onChange){_slate=slate;_onChange=onChange||null;if(_timer)clearInterval(_timer);tick();_timer=setInterval(()=>{if(shouldPoll())tick();},POLL_MS);}
export async function refreshLiveNow(){await tick();}
export function stopLivePolling(){if(_timer){clearInterval(_timer);_timer=null;}_slate=null;_onChange=null;_lastSig={};}
export function timeRemainingMin(period,clockMin){if(!period||period<1)return 60;if(period>=5){if(clockMin==null||clockMin<0)return 10;return Math.min(10,Math.max(0,clockMin));}const inQuarter=clockMin==null?15:Math.max(0,Math.min(15,clockMin));return (4-period)*15+inQuarter;}
