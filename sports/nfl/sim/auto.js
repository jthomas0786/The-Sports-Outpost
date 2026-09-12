import { hash32, normName, normTeam } from './utils.js';

function stable(value){
  if(value == null || typeof value !== 'object') return value;
  if(Array.isArray(value)) return value.map(stable);
  const out={};
  for(const key of Object.keys(value).sort()) out[key]=stable(value[key]);
  return out;
}

export function stableStringify(value){ return JSON.stringify(stable(value)); }

export function isHalftimeState(liveGame){
  if(!liveGame || String(liveGame.status||'').toLowerCase()!=='in') return false;
  const detail=`${liveGame.statusDetail||''} ${liveGame.detail||''}`.toLowerCase();
  if(/half\s*time|halftime|end of (?:the )?2nd|end of second/.test(detail)) return true;
  const period=Number(liveGame.period);
  const clock=Number(liveGame.clockMin);
  return period===2 && Number.isFinite(clock) && clock<=0.05;
}

export function isHalftimeWarmupState(liveGame,thresholdMinutes=2){
  if(isHalftimeState(liveGame)) return true;
  if(!liveGame || String(liveGame.status||'').toLowerCase()!=='in') return false;
  const period=Number(liveGame.period),clock=Number(liveGame.clockMin),limit=Math.max(0,Number(thresholdMinutes)||0);
  return period===2 && Number.isFinite(clock) && clock>=0 && clock<=limit;
}

export function automationPhase(liveGame){
  const status=String(liveGame?.status||'pre').toLowerCase();
  if(status==='post') return 'post';
  if(isHalftimeState(liveGame)) return 'halftime';
  if(status==='in') return 'live';
  return 'pregame';
}

function gameTeams(game){ return [normTeam(game?.away?.abbr),normTeam(game?.home?.abbr)].filter(Boolean); }

function compactResearchPlayer(p){
  return {
    espnId:p?.espnId||null,gsisId:p?.gsisId||null,name:p?.name||null,team:normTeam(p?.team),opponent:normTeam(p?.opponent),position:p?.position||null,
    depth:p?.depth||null,depthRank:p?.depthRank??null,injury:p?.injury||null,rosterStatus:p?.rosterStatus||null,
    currentSeason:p?.currentSeason||null,last5:p?.last5||null,previousSeason:p?.previousSeason||null,
    snapTrend:p?.snapTrend||null,model:p?.model||null,matchup:p?.matchup||null,stats:p?.stats||null,props:p?.props||null,
  };
}

function compactSlatePlayer(p){
  return {
    espnId:p?.espnId||null,gsisId:p?.gsisId||null,name:p?.name||null,team:normTeam(p?.team),opponent:normTeam(p?.opponent),position:p?.position||null,
    depthRank:p?.depthRank??null,stats:p?.stats||null,props:p?.props||null,
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

export function gameInputFingerprint({game,research,odds,liveGame=null,phase='pregame'}){
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
  game,research,odds,liveGame=null,previousState=null,existingResult=null,config,now=new Date(),force=false,
}){
  const auto=config?.automatic||{};
  const phase=automationPhase(liveGame);
  const fingerprint=gameInputFingerprint({game,research,odds,liveGame,phase});
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
    const attempts=Number(prev.halftimeCandidateAttempts||0);
    const maxAttempts=Number(config?.halftime?.maxCandidateRetries??3);
    if(attempts>=maxAttempts) return {run:false,phase,reason:'halftime candidate retries exhausted',fingerprint,iterations:0,ready};
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
    // Missing sportsbook data must not consume the candidate retry budget.
    out.halftimeCandidateAttempts=Number(prev.halftimeCandidateAttempts||0)+(result?.automation?.halftimeHasLiveOdds===false?0:1);
    out.halftimeCandidatesReady=result?.automation?.halftimeCandidatesReady===true;
    if(out.halftimeCandidatesReady){
      out.halftimeFingerprint=decision.fingerprint;
    }else{
      delete out.halftimeFingerprint;
    }
    out.halftimeGameStateKey=`${result?.game?.currentScore?.away??''}-${result?.game?.currentScore?.home??''}`;
  }
  return out;
}
