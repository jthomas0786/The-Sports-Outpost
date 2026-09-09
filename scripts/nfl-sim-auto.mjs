#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { simulateGame, stripPrivateSamples } from '../sports/nfl/sim/engine.js';
import { decideAutomaticRun, nextAutomationState } from '../sports/nfl/sim/auto.js';

const ROOT=process.cwd();
const arg=(flag,fallback=null)=>{const i=process.argv.indexOf(flag);return i>=0&&process.argv[i+1]!=null?process.argv[i+1]:fallback};
const has=flag=>process.argv.includes(flag);
const truthy=v=>/^(1|true|yes|on)$/i.test(String(v||''));
const read=async(file,fallback=null)=>{try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(has('--verbose'))console.warn(`sim auto read ${file}: ${e.message}`);return fallback}};

const SLATE=path.resolve(ROOT,arg('--slate','slates/nfl.json'));
const RESEARCH=path.resolve(ROOT,arg('--research','slates/nfl-research.json'));
const ODDS=path.resolve(ROOT,arg('--odds','slates/nfl-odds.json'));
const OUT=path.resolve(ROOT,arg('--out','slates/nfl-sim.json'));
const STATE=path.resolve(ROOT,arg('--state','slates/nfl-sim-state.json'));
const CONFIG=path.resolve(ROOT,arg('--config','sports/nfl/sim/config.json'));
const GAME=arg('--game',null);
const LIVE_URL=arg('--live-url',process.env.NFL_LIVE_ENDPOINT||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live');
const LIVE_FILE=arg('--live-file',null);
const FORCE=has('--force')||truthy(process.env.NFL_SIM_FORCE);
const DRY=has('--dry-run');
const NO_LIVE=has('--no-live');
const NOW_ARG=arg('--now',null);
const NOW=NOW_ARG?new Date(NOW_ARG):new Date();
if(!Number.isFinite(NOW.getTime())) throw new Error(`Invalid --now ${NOW_ARG}`);

async function fetchLive(){
  if(NO_LIVE) return null;
  if(LIVE_FILE) return await read(path.resolve(ROOT,LIVE_FILE),null);
  try{
    const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);
    const r=await fetch(LIVE_URL,{signal:c.signal,headers:{accept:'application/json','cache-control':'no-cache'}});clearTimeout(t);
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  }catch(e){console.warn(`⚠ NFL sim live feed unavailable (${e.message}); pregame automation can still run.`);return null;}
}
function matchLive(game,board){ return board?.games?.[String(game.gameId||game.id)]||null; }
function selectedGames(slate){
  const games=slate?.games||[];
  if(!GAME) return games;
  const terms=String(GAME).split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
  return games.filter(g=>{
    const id=String(g.gameId||g.id).toUpperCase();
    const pair=`${g.away?.abbr||''}-${g.home?.abbr||''}`.toUpperCase();
    return terms.some(t=>t===id||t===pair||pair.includes(t));
  });
}

const [slate,research,odds,config,existing,stateDoc,liveBoard]=await Promise.all([
  read(SLATE,{games:[]}),read(RESEARCH,{players:[]}),read(ODDS,{games:[]}),read(CONFIG,null),
  read(OUT,{schemaVersion:2,games:[]}),read(STATE,{schemaVersion:1,games:{}}),fetchLive(),
]);
if(!config) throw new Error(`NFL sim config missing: ${CONFIG}`);
if(config.automatic?.enabled===false && !FORCE){console.log('NFL automatic simulation is disabled in config.');process.exit(0);}
const games=selectedGames(slate);
if(!games.length){console.log(GAME?`No NFL game matched --game ${GAME}`:'NFL slate contains no games; nothing to simulate.');process.exit(0);}

const weekKey=String(slate?.slateId||[slate?.season,slate?.seasonType,slate?.week].filter(v=>v!=null).join('-w')||'unknown-week');
const previousWeekKey=String(stateDoc?.weekKey||existing?.meta?.weekKey||'');
const weekChanged=previousWeekKey!==weekKey;
if(weekChanged) console.log(`↻ NFL simulation weekly rollover: ${previousWeekKey||"unkeyed"} → ${weekKey}`);
const existingById=new Map((weekChanged?[]:(existing?.games||[])).map(r=>[String(r?.game?.gameId||''),r]));
const stateGames=weekChanged?{}:{...(stateDoc?.games||{})};
let runs=0,totalIterations=0;
const touched=[];

for(const game of games){
  const gameId=String(game.gameId||game.id);
  const liveGame=matchLive(game,liveBoard);
  const prev=stateGames[gameId]||null;
  const old=existingById.get(gameId)||null;
  const decision=decideAutomaticRun({game,research,odds,liveGame,previousState:prev,existingResult:old,config,now:NOW,force:FORCE});
  const pair=`${game.away?.abbr||'AWY'} @ ${game.home?.abbr||'HME'}`;
  if(!decision.run){
    console.log(`· ${pair}: skip — ${decision.reason}`);
    continue;
  }
  console.log(`▶ ${pair}: ${decision.reason} — ${Number(decision.iterations).toLocaleString()} simulations`);
  if(DRY){
    touched.push({gameId,pair,decision});
    continue;
  }
  const raw=simulateGame({game,research,odds,liveGame,config,iterations:decision.iterations,includeSamples:false});
  const result=stripPrivateSamples(raw);
  result.automation={
    automatic:true,phase:decision.phase,reason:decision.reason,checkpointMinutes:decision.checkpointMinutes??null,
    inputFingerprint:decision.fingerprint,runAt:NOW.toISOString(),probabilityBlend:config.probabilityBlend||null,
  };
  existingById.set(gameId,result);
  stateGames[gameId]=nextAutomationState({previousState:prev,decision,result,game,now:NOW});
  runs++;totalIterations+=result.iterations;touched.push({gameId,pair,decision,result});
  console.log(`  ✓ ${pair}: ${result.iterations.toLocaleString()} complete | ${result.game.away.abbr} ${(result.outcomes.away.winProbability*100).toFixed(1)}% / ${result.game.home.abbr} ${(result.outcomes.home.winProbability*100).toFixed(1)}%`);
}

if(DRY){
  console.log(`Dry run: ${touched.length} game(s) would run.`);
  process.exit(0);
}
if(!runs && !weekChanged){
  console.log('✓ NFL simulation cache is current — no automatic run required.');
  process.exit(0);
}

const slateIds=new Set((slate?.games||[]).map(g=>String(g.gameId||g.id)));
const merged=[...existingById.entries()].filter(([id])=>slateIds.has(id)).map(([,r])=>r).sort((a,b)=>{
  const ta=new Date(a?.game?.startTimeUTC||0).getTime(),tb=new Date(b?.game?.startTimeUTC||0).getTime();
  return ta-tb || String(a?.game?.gameId||'').localeCompare(String(b?.game?.gameId||''));
});
const payload={
  schemaVersion:2,engineVersion:config.engineVersion,generatedAt:NOW.toISOString(),
  meta:{
    automatic:true,pollMinutes:config.automatic?.pollMinutes||5,
    pregameIterations:config.automatic?.pregameIterations||config.defaultIterations||50000,
    halftimeIterations:config.automatic?.halftimeIterations||config.halftimeIterations||50000,
    liveIterations:config.automatic?.liveIterations||config.liveIterations||15000,
    pregameCheckpointMinutes:config.automatic?.pregameCheckpointMinutes||[180,90,15],
    probabilityBlend:config.probabilityBlend||null,weekKey,
    lastRun:{games:runs,totalIterations,reasonCounts:Object.fromEntries([...new Set(touched.map(x=>x.decision.reason))].map(reason=>[reason,touched.filter(x=>x.decision.reason===reason).length]))},
  },
  source:{slate:path.relative(ROOT,SLATE),research:path.relative(ROOT,RESEARCH),odds:path.relative(ROOT,ODDS),live:LIVE_URL},
  gameCount:merged.length,games:merged,
};
const nextState={schemaVersion:2,engineVersion:config.engineVersion,weekKey,updatedAt:NOW.toISOString(),games:stateGames};
await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.mkdir(path.dirname(STATE),{recursive:true});
await fs.writeFile(OUT,JSON.stringify(payload,null,2)+'\n');
await fs.writeFile(STATE,JSON.stringify(nextState,null,2)+'\n');
console.log(`✓ wrote ${path.relative(ROOT,OUT)} + ${path.relative(ROOT,STATE)} — ${runs} run(s), ${totalIterations.toLocaleString()} simulations`);
