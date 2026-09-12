import { simulateGame, stripPrivateSamples } from './engine-v8918.js';
import { isHalftimeState } from './auto.js';
import { normTeam } from './utils.js';

const copy=x=>structuredClone(x);
export function replayTime(value){
  if(value==null||value==='')throw new Error('Replay timestamp is required');
  const n=typeof value==='number'?value:Date.parse(value);
  if(!Number.isFinite(n))throw new Error(`Invalid replay timestamp: ${value}`);
  return n;
}
function assertPast(value,cutoff,label){
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    if(['generatedAt','fetchedAt','lastFetchedAt','capturedAt'].includes(key)&&item!=null){
      if(replayTime(item)>cutoff)throw new Error(`${label}.${key} is from the future`);
    }
    if(key==='ts'&&item!=null){
      const numeric=Number(item),time=Number.isFinite(numeric)?(numeric<1e12?numeric*1000:numeric):replayTime(item);
      if(time>cutoff)throw new Error(`${label}.ts is from the future`);
    }
    if(item&&typeof item==='object')assertPast(item,cutoff,`${label}.${key}`);
  }
}
function asOf(records,at,label,required=true){
  const eligible=(records||[]).filter(r=>replayTime(r.availableAt)<=at).sort((a,b)=>replayTime(b.availableAt)-replayTime(a.availableAt));
  if(!eligible.length){if(required)throw new Error(`No archived ${label} available at this frame`);return null;}
  const selected=eligible[0];
  if(!selected.data)throw new Error(`Missing archived ${label} data`);
  assertPast(selected.data,at,label);
  return selected;
}
export function prepareReplayFrame(archive,index){
  if(archive?.schemaVersion!==1)throw new Error('Unsupported NFL replay archive schema');
  const frame=archive.frames?.[index];
  if(!frame)throw new Error('Replay frame not found');
  const at=replayTime(frame.at);
  for(let i=1;i<=index;i++)if(replayTime(archive.frames[i-1].at)>=replayTime(archive.frames[i].at))throw new Error('Replay frames must be strictly chronological');
  const raw=archive.game;
  if(!raw?.gameId||!raw.away?.abbr||!raw.home?.abbr)throw new Error('Replay game identity is required');
  const liveGame=copy(frame.liveGame);
  if(!liveGame||!['pre','in','post'].includes(liveGame.status))throw new Error('Replay frame must contain an archived game state');
  if(frame.source==='summary'||liveGame.replayStatsComplete===false)throw new Error('Visual summary replay is not a simulation snapshot');
  assertPast(liveGame,at,'liveGame');
  if(liveGame.status==='in'&&(!liveGame.playerStats||!Number.isFinite(liveGame.period)||liveGame.period<1||!Number.isFinite(liveGame.clockMin)))throw new Error('Live simulation replay requires archived clock and player stats');
  if(liveGame.status!=='pre'&&![liveGame.homeScore,liveGame.awayScore].every(Number.isFinite))throw new Error('Replay score is missing');
  if(liveGame.status==='pre'&&((liveGame.homeScore||0)!==0||(liveGame.awayScore||0)!==0))throw new Error('Pregame frame contains a score');
  if(liveGame.status==='pre'&&(Object.keys(liveGame.playerStats?.byId||{}).length||Object.keys(liveGame.playerStats?.byName||{}).length))throw new Error('Pregame frame contains player box-score stats');
  const teams=[normTeam(raw.away.abbr),normTeam(raw.home.abbr)];
  if((liveGame.awayAbbr&&normTeam(liveGame.awayAbbr)!==teams[0])||(liveGame.homeAbbr&&normTeam(liveGame.homeAbbr)!==teams[1]))throw new Error('Replay frame teams do not match game');
  const research=asOf(archive.research,at,'research',liveGame.status!=='post');
  const odds=asOf(archive.odds,at,'odds',false);
  // Whitelist static game identity. Final slate scores, players, and projections
  // must never enter a past world through the game object.
  const game={gameId:String(raw.gameId),startTimeUTC:raw.startTimeUTC||null,
    away:{abbr:teams[0],name:raw.away.name||teams[0],score:liveGame.awayScore||0},
    home:{abbr:teams[1],name:raw.home.name||teams[1],score:liveGame.homeScore||0}};
  const players=research?.data?.players?.filter(p=>String(p.gameId||'')===game.gameId||(!p.gameId&&teams.includes(normTeam(p.team))))||[];
  if(liveGame.status!=='post'&&!players.length)throw new Error('Archived research has no roster for this game');
  return {at,game,liveGame,research:{...(research?.data||{}),players:copy(players)},odds:copy(odds?.data||{games:[]}),
    provenance:{frame:frame.source||null,research:research?{availableAt:research.availableAt,source:research.source||null}:null,odds:odds?{availableAt:odds.availableAt,source:odds.source||null}:null}};
}
export function replayIterations(liveGame){return liveGame.status==='post'?0:isHalftimeState(liveGame)||liveGame.status==='pre'?50000:15000;}
export function simulateReplayFrame(archive,index,{config,seed=8922,iterations=null}={}){
  const inputs=prepareReplayFrame(archive,index);
  const normal=replayIterations(inputs.liveGame);
  if(iterations!=null&&(!Number.isInteger(iterations)||iterations<1))throw new Error('Replay iterations must be a positive integer');
  if(!normal)return {at:new Date(inputs.at).toISOString(),phase:'final',iterations:0,actual:inputs.liveGame,provenance:inputs.provenance};
  const result=simulateGame({...inputs,config,seed:seed+index,iterations:iterations??normal,includeSamples:false});
  const clean=stripPrivateSamples(result);
  // The engine's wall-clock timestamp is execution metadata, not historical data.
  clean.generatedAt=new Date(inputs.at).toISOString();
  return {at:new Date(inputs.at).toISOString(),phase:isHalftimeState(inputs.liveGame)?'halftime':inputs.liveGame.status==='pre'?'pregame':'live',iterations:result.iterations,
    testIterations:iterations!=null,provenance:inputs.provenance,result:clean};
}
