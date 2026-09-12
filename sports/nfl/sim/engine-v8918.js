import {
  evaluateLegFromArrays,
  jointProbabilityFromResult,
  quarterPropProbability,
  simulateGame as simulateV861,
  stripPrivateSamples,
} from './engine-v861.js';
import { clamp, finite, normName, normTeam, round } from './utils.js';

const VERSION='v89.18.0';
const LIVE_POSITIONS=new Set(['QB','RB','HB','FB','WR','TE']);
const POSITION_STATS={
  QB:['attempts','completions','passYds','passTds','carries','rushYds','rushTds'],
  RB:['carries','rushYds','rushTds','targets','receptions','recYds','recTds'],
  WR:['targets','receptions','recYds','recTds','carries','rushYds','rushTds'],
  TE:['targets','receptions','recYds','recTds','carries','rushYds','rushTds'],
};
const TD_STATS=new Set(['passTds','rushTds','recTds']);
const YARD_STATS=new Set(['passYds','rushYds','recYds']);

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const positionOf=p=>{const x=String(p?.position||'').toUpperCase();return x==='HB'||x==='FB'?'RB':x;};
const numeric=value=>finite(String(value??'').replace(/,/g,''),null);

function elapsedFraction(liveGame){
  if(!liveGame||String(liveGame.status||'pre').toLowerCase()==='pre')return 0;
  if(String(liveGame.status||'').toLowerCase()==='post')return 1;
  const period=Math.max(1,Math.round(finite(liveGame.period,1)));
  const clock=clamp(finite(liveGame.clockMin,15),0,15);
  if(period<=4)return clamp(((period-1)*15+(15-clock))/60,0,1);
  return .92;
}

function parseCompAtt(value){
  const m=String(value??'').match(/(\d+)\s*\/\s*(\d+)/);
  return m?{completions:Number(m[1]),attempts:Number(m[2])}:{completions:null,attempts:null};
}

function liveRows(liveGame){
  return Object.values(liveGame?.playerStats?.byId||{}).filter(Boolean);
}

function liveIndex(liveGame){
  const byId=new Map(),byName=new Map();
  for(const [id,row] of Object.entries(liveGame?.playerStats?.byId||{})){
    byId.set(String(id),row);
    const team=normTeam(row?.team),name=normName(row?.name);
    if(name)byName.set(`${team}|${name}`,row);
  }
  for(const [raw,row] of Object.entries(liveGame?.playerStats?.byName||{})){
    const split=raw.indexOf('|');
    const team=split>=0?normTeam(raw.slice(0,split)):normTeam(row?.team);
    const name=split>=0?normName(raw.slice(split+1)):normName(row?.name);
    if(name)byName.set(`${team}|${name}`,row);
  }
  return {byId,byName};
}

function rowForPlayer(player,index){
  if(player?.espnId&&index.byId.has(String(player.espnId)))return index.byId.get(String(player.espnId));
  return index.byName.get(`${normTeam(player?.team)}|${normName(player?.name)}`)||null;
}

function observedStats(row){
  const flat=row?.flat||{};
  const ca=parseCompAtt(flat.compAtt);
  return {
    attempts:ca.attempts,
    completions:ca.completions,
    passYds:numeric(flat.passYds),
    passTds:numeric(flat.passTds),
    carries:numeric(flat.carries),
    rushYds:numeric(flat.rushYds),
    rushTds:numeric(flat.rushTds),
    targets:numeric(flat.targets),
    receptions:numeric(flat.receptions),
    recYds:numeric(flat.recYds),
    recTds:numeric(flat.recTds),
  };
}

function depthFactor(player,config){
  const pos=positionOf(player),ladder=config?.depthRole?.[pos]||[1];
  const rank=Math.max(1,Math.round(finite(player?.depth?.rank,finite(player?.depthRank,1))));
  return finite(ladder[Math.min(rank,ladder.length)-1],ladder.at(-1)||1);
}

function priorStat(player,key,config){
  const candidates=[player?.currentSeason?.perGame?.[key],player?.last5?.avg?.[key],player?.previousSeason?.perGame?.[key]];
  for(const value of candidates){const n=finite(value,null);if(n!=null&&n>=0)return n;}
  const base=finite(config?.fallback?.[positionOf(player)]?.[key],0);
  return Math.max(0,base*depthFactor(player,config));
}

function liveBlendWeight(elapsed,key,config){
  const live=config?.liveModel||{};
  const start=finite(live.usageStartElapsed,.08),full=finite(live.usageFullWeightElapsed,.70),max=finite(live.usageMaxWeight,.72);
  let w=clamp((elapsed-start)/Math.max(.05,full-start),0,1)*max;
  if(TD_STATS.has(key))w*=finite(live.touchdownUsageWeightMultiplier,.42);
  else if(YARD_STATS.has(key))w*=finite(live.yardageUsageWeightMultiplier,.82);
  return clamp(w,0,max);
}

function calibratedRate(prior,observed,elapsed,key,config){
  if(observed==null||elapsed<=0)return prior;
  const safeElapsed=Math.max(elapsed,finite(config?.liveModel?.minimumPaceElapsed,.12));
  const projected=observed/safeElapsed;
  const weight=liveBlendWeight(elapsed,key,config);
  if(!(weight>0))return prior;
  const raw=prior*(1-weight)+projected*weight;
  const floorFactor=TD_STATS.has(key)?.45:YARD_STATS.has(key)?.38:.32;
  const ceilingFactor=TD_STATS.has(key)?2.5:YARD_STATS.has(key)?2.25:2.10;
  const floor=Math.max(0,prior*floorFactor);
  const ceiling=Math.max(prior+1,prior*ceilingFactor);
  return clamp(raw,floor,ceiling);
}

function applyLiveAvailability(player,row){
  const status=String(row?.injury?.status||row?.status||row?.availability||'').trim();
  if(!status)return player;
  player.injury={...(player.injury||{}),status};
  return player;
}

function adjustResearch(research,liveGame,config,elapsed){
  const next=clone(research)||{players:[]};
  const index=liveIndex(liveGame);
  let adjustedPlayers=0,matchedPlayers=0;
  for(const player of next.players||[]){
    if(!LIVE_POSITIONS.has(String(player?.position||'').toUpperCase()))continue;
    const row=rowForPlayer(player,index);
    if(!row)continue;
    matchedPlayers++;
    applyLiveAvailability(player,row);
    const obs=observedStats(row),pos=positionOf(player),keys=POSITION_STATS[pos]||[];
    const synthetic={...(player.currentSeason?.perGame||{})};
    let changed=false;
    for(const key of keys){
      if(obs[key]==null)continue;
      const prior=priorStat(player,key,config);
      const calibrated=calibratedRate(prior,obs[key],elapsed,key,config);
      if(Number.isFinite(calibrated)){
        synthetic[key]=round(calibrated,3);
        changed=true;
      }
    }
    if(changed){
      player.currentSeason={...(player.currentSeason||{}),perGame:synthetic};
      player.model={...(player.model||{}),liveCalibration:{version:VERSION,elapsed:round(elapsed,4),matched:true}};
      adjustedPlayers++;
    }
  }
  return {research:next,adjustedPlayers,matchedPlayers};
}

function teamObservedPlays(liveGame,team){
  let passAttempts=0,carries=0;
  for(const row of liveRows(liveGame)){
    if(normTeam(row?.team)!==normTeam(team))continue;
    const obs=observedStats(row);
    if(obs.attempts!=null)passAttempts+=Math.max(0,obs.attempts);
    if(obs.carries!=null)carries+=Math.max(0,obs.carries);
  }
  return {passAttempts,carries,plays:passAttempts+carries};
}

function paceProjection(observed,elapsed,prior,config){
  if(!(observed>0)||elapsed<=0)return prior;
  const live=config?.liveModel||{};
  const projected=observed/Math.max(elapsed,finite(live.minimumPaceElapsed,.12));
  const maxWeight=finite(live.paceMaxWeight,.62);
  const weight=clamp((elapsed-.08)/.55,0,1)*maxWeight;
  const blended=prior*(1-weight)+projected*weight;
  return clamp(blended,finite(live.paceMin,48),finite(live.paceMax,82));
}

function driveBonus(liveGame,side,config){
  if(String(liveGame?.status||'').toLowerCase()!=='in'||String(liveGame?.possession||'')!==side)return 0;
  const live=config?.liveModel||{};
  const y=clamp(finite(liveGame?.yardFromOwn,25),1,99);
  const x=y/100;
  let value=.20+2.25*x*x;
  if(liveGame?.isRedZone||y>=80)value+=.55;
  const down=finite(liveGame?.down,null),distance=finite(liveGame?.distance,null);
  if(down===4)value-=.40;
  else if(down===3&&distance!=null&&distance>=8)value-=.18;
  else if(down===1)value+=.08;
  return round(clamp(value,0,finite(live.driveBonusMaxPoints,2.8)),3);
}

function gamePair(game){return [normTeam(game?.away?.abbr),normTeam(game?.home?.abbr)].sort().join('|');}

function adjustOdds(odds,game,liveGame,config){
  const next=clone(odds)||{games:[]};
  const id=String(game?.gameId||game?.id||''),pair=gamePair(game);
  const row=(next.games||[]).find(g=>String(g?.gameId||'')===id||[normTeam(g?.away),normTeam(g?.home)].sort().join('|')===pair);
  const homeBonus=driveBonus(liveGame,'home',config),awayBonus=driveBonus(liveGame,'away',config);
  if(!row||(!homeBonus&&!awayBonus))return {odds:next,homeBonus,awayBonus,adjusted:false};
  const total=finite(row?.gameLines?.total?.line,null),spread=finite(row?.gameLines?.spread?.line,null);
  if(total==null)return {odds:next,homeBonus,awayBonus,adjusted:false};
  const margin=spread==null?finite(config?.league?.homeFieldPoints,1.5):-spread;
  const homeExpected=Math.max(0,(total+margin)/2)+homeBonus;
  const awayExpected=Math.max(0,(total-margin)/2)+awayBonus;
  row.gameLines={...(row.gameLines||{}),
    total:{...(row.gameLines?.total||{}),line:round(homeExpected+awayExpected,3)},
    spread:{...(row.gameLines?.spread||{}),line:round(-(homeExpected-awayExpected),3)},
  };
  return {odds:next,homeBonus,awayBonus,adjusted:true};
}

function adjustConfig(config,liveGame,game,elapsed){
  const next=clone(config)||{};
  next.engineVersion=VERSION;
  next.blend={...(next.blend||{})};
  if(String(liveGame?.status||'').toLowerCase()==='in'){
    next.blend.currentSeason=finite(next.liveModel?.currentSeasonWeightLive,.82);
    next.blend.last5=finite(next.liveModel?.last5WeightLive,.12);
    next.blend.previousSeason=finite(next.liveModel?.previousSeasonWeightLive,.06);
    next.blend.snapTrendWeight=Math.min(finite(next.blend.snapTrendWeight,.18),.10);
    next.blend.observedScoringWeightLive=Math.max(finite(next.blend.observedScoringWeightLive,.30),finite(next.liveModel?.observedScoringWeightLive,.42));
    const prior=finite(next.league?.playsPerTeam,63.5);
    const away=teamObservedPlays(liveGame,game?.away?.abbr),home=teamObservedPlays(liveGame,game?.home?.abbr);
    const awayPace=paceProjection(away.plays,elapsed,prior,next),homePace=paceProjection(home.plays,elapsed,prior,next);
    const awayAbbr=normTeam(game?.away?.abbr),homeAbbr=normTeam(game?.home?.abbr);
    next.league={
      ...(next.league||{}),
      // Keep the aggregate for old consumers while allowing the established core to
      // use each offense's observed pace independently.
      playsPerTeam:round((awayPace+homePace)/2,3),
      playsPerTeamByTeam:{
        ...(next.league?.playsPerTeamByTeam||{}),
        ...(awayAbbr?{[awayAbbr]:round(awayPace,3)}:{}),
        ...(homeAbbr?{[homeAbbr]:round(homePace,3)}:{}),
      },
    };
    return {config:next,pace:{prior,awayObserved:away.plays,homeObserved:home.plays,awayProjected:round(awayPace,2),homeProjected:round(homePace,2),modelPlaysPerTeam:next.league.playsPerTeam}};
  }
  return {config:next,pace:{prior:finite(next.league?.playsPerTeam,63.5),awayObserved:0,homeObserved:0,awayProjected:null,homeProjected:null,modelPlaysPerTeam:finite(next.league?.playsPerTeam,63.5)}};
}

export function prepareLiveSimulationInputs({game,research,odds,liveGame=null,config}={}){
  const status=String(liveGame?.status||'pre').toLowerCase();
  const elapsed=elapsedFraction(liveGame);
  const configResult=adjustConfig(config,liveGame,game,elapsed);
  if(status!=='in'){
    return {game,research,odds,liveGame,config:configResult.config,summary:{version:VERSION,active:false,status,elapsed:round(elapsed,4),pace:configResult.pace,matchedPlayers:0,adjustedPlayers:0,driveBonus:{away:0,home:0}}};
  }
  const researchResult=adjustResearch(research,liveGame,configResult.config,elapsed);
  const oddsResult=adjustOdds(odds,game,liveGame,configResult.config);
  return {
    game,research:researchResult.research,odds:oddsResult.odds,liveGame,config:configResult.config,
    summary:{
      version:VERSION,active:true,status,elapsed:round(elapsed,4),period:finite(liveGame?.period,null),clockMin:finite(liveGame?.clockMin,null),
      possession:liveGame?.possession||null,yardFromOwn:finite(liveGame?.yardFromOwn,null),matchedPlayers:researchResult.matchedPlayers,adjustedPlayers:researchResult.adjustedPlayers,
      pace:configResult.pace,driveBonus:{away:oddsResult.awayBonus,home:oddsResult.homeBonus},anchorAdjusted:oddsResult.adjusted,
    },
  };
}

export function simulateGame(args={}){
  const prepared=prepareLiveSimulationInputs(args);
  const result=simulateV861({...args,...prepared,config:prepared.config,research:prepared.research,odds:prepared.odds});
  result.liveModel=prepared.summary;
  result.engineVersion=VERSION;
  result.notes=[...(result.notes||[]),prepared.summary.active
    ?'v89.18 recalibrates remaining-game player usage, pace and the current possession drive before each live Monte Carlo refresh.'
    :'v89.18 live calibration is armed; pregame simulations retain the established priors.'];
  return result;
}

export {evaluateLegFromArrays,jointProbabilityFromResult,quarterPropProbability,stripPrivateSamples};
export const __V8918_TEST__={elapsedFraction,observedStats,calibratedRate,teamObservedPlays,paceProjection,driveBonus,adjustResearch,adjustOdds,adjustConfig};
