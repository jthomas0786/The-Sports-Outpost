import { hash32, normName, normTeam } from './utils.js';

function stable(value){
  if(value == null || typeof value !== 'object') return value;
  if(Array.isArray(value)) return value.map(stable);
  const out={};
  for(const key of Object.keys(value).sort()) out[key]=stable(value[key]);
  return out;
}

export function stableStringify(value){ return JSON.stringify(stable(value)); }

export const HALFTIME_WARMUP_MINUTES=8;

function livePeriod(liveGame){
  return Number(liveGame?.period ?? liveGame?.quarter ?? liveGame?.status?.period);
}
function liveClockMinutes(liveGame){
  const direct=Number(liveGame?.clockMin);
  if(Number.isFinite(direct)) return direct;
  const seconds=Number(liveGame?.secondsRemaining ?? liveGame?.status?.seconds ?? liveGame?.seconds);
  if(Number.isFinite(seconds)) return seconds/60;
  const raw=String(liveGame?.clock ?? liveGame?.lastPlay?.clock ?? '').trim();
  const m=raw.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1])+Number(m[2])/60 : NaN;
}

export function isHalftimeState(liveGame){
  if(!liveGame) return false;
  const status=String(liveGame.status ?? liveGame.state ?? liveGame.status?.state ?? '').toLowerCase();
  const detail=`${liveGame.statusDetail||''} ${liveGame.status?.detail||''} ${liveGame.detail||''} ${liveGame.clock||''}`.toLowerCase();
  if(status==='halftime'||status==='half') return true;
  if(/half\s*time|halftime|end of (?:the )?2nd|end of second/.test(detail)) return true;
  const active=['in','live'].includes(status);
  const period=livePeriod(liveGame);
  const clock=liveClockMinutes(liveGame);
  return active && period===2 && Number.isFinite(clock) && clock<=0.05;
}

export function isHalftimeWarmupState(liveGame,thresholdMinutes=HALFTIME_WARMUP_MINUTES){
  if(isHalftimeState(liveGame)) return true;
  if(!liveGame) return false;
  const status=String(liveGame.status ?? liveGame.state ?? liveGame.status?.state ?? '').toLowerCase();
  if(!['in','live'].includes(status)) return false;
  const period=livePeriod(liveGame),clock=liveClockMinutes(liveGame),limit=Math.max(0,Number(thresholdMinutes)||0);
  return period===2 && Number.isFinite(clock) && clock>=0 && clock<=limit;
}

export function automationPhase(liveGame){
  const status=String(liveGame?.status ?? liveGame?.state ?? liveGame?.status?.state ?? 'pre').toLowerCase();
  if(['post','final','closed'].includes(status)) return 'post';
  if(isHalftimeWarmupState(liveGame,HALFTIME_WARMUP_MINUTES)) return 'halftime';
  if(status==='in'||status==='live') return 'live';
  return 'pregame';
}

function gameTeams(game){ return [normTeam(game?.away?.abbr),normTeam(game?.home?.abbr)].filter(Boolean); }

function compactResearchPlayer(p){
  return {
    espnId:p?.espnId||null,gsisId:p?.gsisId||null,name:p?.name||null,team:normTeam(p?.team),opponent:normTeam(p?.opponent),position:p?.position||null,
    depth:p?.depth||null,depthRank:p?.depthRank??null,injury:p?.injury||null,rosterStatus:p?.rosterStatus||null,active:p?.active??null,availability:p?.availability||null,
    currentSeason:p?.currentSeason||null,last5:p?.last5||null,previousSeason:p?.previousSeason||null,
    snapTrend:p?.snapTrend||null,model:p?.model||null,matchup:p?.matchup||null,stats:p?.stats||null,props:p?.props||null,
  };
}

function compactSlatePlayer(p){
  return {
    espnId:p?.espnId||null,gsisId:p?.gsisId||null,name:p?.name||null,team:normTeam(p?.team),opponent:normTeam(p?.opponent),position:p?.position||null,
    depthRank:p?.depthRank??null,stats:p?.stats||null,props:p?.props||null,active:p?.active??null,injury:p?.injury||null,rosterStatus:p?.rosterStatus||null,availability:p?.availability||null,
  };
}

function matchingResearch(game,research){
  const id=String(game?.gameId||game?.id||'');
  const teams=new Set(gameTeams(game));
  return (research?.players||[]).filter(p=>String(p?.gameId||'')===id || teams.has(normTeam(p?.team))).map(compactResearchPlayer)
    .sort((a,b)=>`${a.team}|${normName(a.name)}`.localeCompare(`${b.team}|${normName(b.name)}`));
}

function matchingOdds(game,odds){
  const id=String(game?.gameId||game?.id||'');
  const pair=gameTeams(game).sort().join('|');
  return (odds?.games||[]).find(g=>String(g?.gameId||'')===id || [normTeam(g?.away),normTeam(g?.home)].sort().join('|')===pair) || null;
}

function compactOddsGame(game){
  if(!game) return null;
  const players=(game.players||[]).map(p=>{
    const lines={};
    for(const [market,slot] of Object.entries(p?.odds||{})){
      if(slot && Number.isFinite(Number(slot.line))) lines[market]=Number(slot.line);
      else if(market==='atd'||market==='firstTd') lines[market]=true;
    }
    return {name:p?.name||null,team:normTeam(p?.team),lines};
  }).sort((a,b)=>`${a.team}|${normName(a.name)}`.localeCompare(`${b.team}|${normName(b.name)}`));
  return {
    gameId:String(game.gameId||''),away:normTeam(game.away),home:normTeam(game.home),
    spread:Number.isFinite(Number(game?.gameLines?.spread?.line))?Number(game.gameLines.spread.line):null,
    total:Number.isFinite(Number(game?.gameLines?.total?.line))?Number(game.gameLines.total.line):null,
    players,
  };
}

export function gameInputsReady({game,research,odds}){
  if(!game?.startTimeUTC) return {ready:false,reason:'kickoff missing'};
  if(odds?.meta?.sample===true) return {ready:false,reason:'real sportsbook odds pending'};
  const researchPlayers=matchingResearch(game,research);
  if(!researchPlayers.length) return {ready:false,reason:'research pending'};
  const oddsGame=matchingOdds(game,odds);
  if(!oddsGame) return {ready:false,reason:'odds pending'};
  return {ready:true,reason:'ready',researchPlayers:researchPlayers.length,oddsGame:true};
}

export function gameInputFingerprint({game,research,odds,liveGame=null,liveOdds=null,phase='pregame'}){
  const payload={
    phase,
    game:{
      gameId:String(game?.gameId||game?.id||''),startTimeUTC:game?.startTimeUTC||null,status:game?.status||null,statusDetail:game?.statusDetail||null,
      away:{abbr:normTeam(game?.away?.abbr),score:game?.away?.score??null},home:{abbr:normTeam(game?.home?.abbr),score:game?.home?.score??null},
      venue:game?.venue||null,players:(game?.players||[]).map(compactSlatePlayer).sort((a,b)=>`${a.team}|${normName(a.name)}`.localeCompare(`${b.team}|${normName(b.name)}`)),
    },
    research:matchingResearch(game,research),
    odds:compactOddsGame(matchingOdds(game,odds)),
  };
  if(phase==='live'||phase==='halftime'){
    payload.live={
      status:liveGame?.status||null,statusDetail:liveGame?.statusDetail||null,period:liveGame?.period??null,clockMin:liveGame?.clockMin??null,
      awayScore:liveGame?.awayScore??null,homeScore:liveGame?.homeScore??null,possession:liveGame?.possession??null,yardFromOwn:liveGame?.yardFromOwn??null,
      down:liveGame?.down??null,distance:liveGame?.distance??null,lastPlayText:liveGame?.lastPlayText||null,
      playerStats:liveGame?.playerStats||null,teamStats:liveGame?.teamStats||null,
    };
  }
  if(phase==='halftime'){
    const gameId=String(game?.gameId||game?.id||'');
    const liveOddsGame=(liveOdds?.games||[]).find(g=>String(g?.gameId||'')===gameId)||null;
    payload.liveOdds=liveOddsGame?{
      fetchedAt:liveOdds?.meta?.fetchedAt||null,
      gameId,
      players:(liveOddsGame.players||[]).map(p=>({name:normName(p?.name),team:normTeam(p?.team),odds:p?.odds||null}))
        .sort((a,b)=>`${a.team}|${a.name}`.localeCompare(`${b.team}|${b.name}`)),
    }:null;
  }
  return hash32(stableStringify(payload)).toString(16).padStart(8,'0');
}

export function kickoffMinutes(game,now=new Date()){
  const t=new Date(game?.startTimeUTC||0).getTime();
  const n=now instanceof Date?now.getTime():new Date(now).getTime();
  return Number.isFinite(t)&&Number.isFinite(n)?(t-n)/60000:null;
}

export function activePregameCheckpoint(minutesToKickoff,checkpoints=[180,90,15]){
  if(!Number.isFinite(minutesToKickoff)||minutesToKickoff<0) return null;
  const sorted=[...checkpoints].map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  return sorted.find(cp=>minutesToKickoff<=cp) ?? null;
}

function minutesSince(iso,now){
  if(!iso) return Infinity;
  const ms=(now instanceof Date?now:new Date(now)).getTime()-new Date(iso).getTime();
  return Number.isFinite(ms)?ms/60000:Infinity;
}

export function decideAutomaticRun({
  game,research,odds,liveGame=null,liveOdds=null,previousState=null,existingResult=null,config,now=new Date(),force=false,
}){
  const auto=config?.automatic||{};
  const phase=automationPhase(liveGame);
  const fingerprint=gameInputFingerprint({game,research,odds,liveGame,liveOdds,phase});
  const ready=gameInputsReady({game,research,odds});
  const pregameIterations=Number(auto.pregameIterations||config?.defaultIterations||50000);
  const halftimeIterations=Number(auto.halftimeIterations||config?.halftimeIterations||50000);
  const liveIterations=Number(auto.liveIterations||config?.liveIterations||15000);
  const prev=previousState||{};

  if(force){
    if(phase==='post') return {run:false,phase,reason:'final game',fingerprint,iterations:0};
    return {run:true,phase,reason:'forced',fingerprint,iterations:phase==='halftime'?halftimeIterations:phase==='live'?liveIterations:pregameIterations,checkpointMinutes:null,ready};
  }
  if(phase==='post') return {run:false,phase,reason:'final game',fingerprint,iterations:0,ready};
  if(!ready.ready && phase==='pregame') return {run:false,phase,reason:ready.reason,fingerprint,iterations:0,ready};

  if(phase==='halftime'){
    const already=prev.halftimeFingerprint===fingerprint;
    if(already) return {run:false,phase,reason:'halftime 50K + candidate board already complete',fingerprint,iterations:0,ready};
    // Candidate retries belong to one exact live/odds fingerprint. A new score,
    // clock state, or sportsbook snapshot gets a fresh retry budget instead of
    // inheriting exhausted attempts from an older board.
    const sameAttemptFingerprint=prev.halftimeAttemptFingerprint===fingerprint;
    const attempts=sameAttemptFingerprint?Number(prev.halftimeCandidateAttempts||0):0;
    const maxAttempts=Number(config?.halftime?.maxCandidateRetries??3);
    if(attempts>=maxAttempts) return {run:false,phase,reason:'halftime candidate retries exhausted for current inputs',fingerprint,iterations:0,ready};
    return {run:true,phase,reason:attempts?('halftime candidate retry '+(attempts+1)):'halftime',fingerprint,iterations:halftimeIterations,checkpointMinutes:null,ready};
  }

  if(phase==='live'){
    const minGap=Number(auto.liveMinIntervalMinutes??4);
    const changed=fingerprint!==prev.lastFingerprint;
    if(!existingResult) return {run:true,phase,reason:'first live state',fingerprint,iterations:liveIterations,checkpointMinutes:null,ready};
    if(changed && minutesSince(prev.lastRunAt,now)>=minGap) return {run:true,phase,reason:'live state changed',fingerprint,iterations:liveIterations,checkpointMinutes:null,ready};
    return {run:false,phase,reason:changed?'live throttle':'live state unchanged',fingerprint,iterations:0,ready};
  }

  // Pregame automation: first ready model, then 3h / 90m / 15m checkpoints,
  // plus meaningful research/odds/slate changes between checkpoints.
  const mins=kickoffMinutes(game,now);
  const cp=activePregameCheckpoint(mins,auto.pregameCheckpointMinutes||[180,90,15]);
  if(!existingResult || !prev.lastRunAt){
    // If the model becomes ready after a checkpoint threshold has already been
    // reached, this 50K run also satisfies that checkpoint instead of running
    // the same 50K job again five minutes later.
    return {run:true,phase,reason:'initial ready',fingerprint,iterations:pregameIterations,checkpointMinutes:cp,ready};
  }
  if(cp!=null && !prev.checkpoints?.[String(cp)]){
    return {run:true,phase,reason:`pregame ${cp}m checkpoint`,fingerprint,iterations:pregameIterations,checkpointMinutes:cp,ready};
  }
  const changed=fingerprint!==prev.lastFingerprint;
  const minGap=Number(auto.materialChangeMinIntervalMinutes??10);
  if(changed && minutesSince(prev.lastRunAt,now)>=minGap){
    return {run:true,phase,reason:'material input change',fingerprint,iterations:pregameIterations,checkpointMinutes:null,ready};
  }
  return {run:false,phase,reason:changed?'pregame change throttled':'no material change',fingerprint,iterations:0,checkpointMinutes:cp,ready};
}

export function nextAutomationState({previousState=null,decision,result,game,now=new Date()}){
  const prev=previousState||{};
  const out={...prev,gameId:String(game?.gameId||game?.id||''),kickoff:game?.startTimeUTC||null};
  if(!decision?.run) return out;
  const stamp=(now instanceof Date?now:new Date(now)).toISOString();
  out.lastRunAt=stamp;
  out.lastFingerprint=decision.fingerprint;
  out.lastPhase=decision.phase;
  out.lastReason=decision.reason;
  out.lastIterations=result?.iterations||decision.iterations||null;
  out.lastGeneratedAt=result?.generatedAt||stamp;
  out.checkpoints={...(prev.checkpoints||{})};
  if(decision.checkpointMinutes!=null) out.checkpoints[String(decision.checkpointMinutes)]=stamp;
  if(decision.phase==='halftime'){
    out.halftimeRunAt=stamp;
    const candidatesReady=result?.automation?.halftimeCandidatesReady===true;
    const hasLiveOdds=result?.automation?.halftimeHasLiveOdds!==false;
    out.halftimeCandidatesReady=candidatesReady;
    if(candidatesReady){
      // A successful READY board completes this fingerprint and resets the retry
      // budget. Later live/odds changes must never inherit these old attempts.
      out.halftimeFingerprint=decision.fingerprint;
      out.halftimeCandidateAttempts=0;
      delete out.halftimeAttemptFingerprint;
    }else{
      delete out.halftimeFingerprint;
      const sameAttemptFingerprint=prev.halftimeAttemptFingerprint===decision.fingerprint;
      const priorAttempts=sameAttemptFingerprint?Number(prev.halftimeCandidateAttempts||0):0;
      out.halftimeAttemptFingerprint=decision.fingerprint;
      // Missing sportsbook data does not consume candidate attempts; as soon as
      // fresh props arrive their changed fingerprint receives a clean budget.
      out.halftimeCandidateAttempts=priorAttempts+(hasLiveOdds?1:0);
    }
    out.halftimeGameStateKey=`${result?.game?.currentScore?.away??''}-${result?.game?.currentScore?.home??''}`;
  }
  return out;
}
