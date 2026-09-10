#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { simulateGame, stripPrivateSamples } from '../sports/nfl/sim/engine-v861.js';
import { isHalftimeState } from '../sports/nfl/sim/auto.js';

const ROOT = process.cwd();
const arg=(flag,fallback=null)=>{const i=process.argv.indexOf(flag);return i>=0&&process.argv[i+1]!=null?process.argv[i+1]:fallback};
const has=flag=>process.argv.includes(flag);
const read=async(file,fallback=null)=>{try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(has('--verbose'))console.warn(`sim read ${file}: ${e.message}`);return fallback}};

const SLATE=path.resolve(ROOT,arg('--slate','slates/nfl.json'));
const RESEARCH=path.resolve(ROOT,arg('--research','slates/nfl-research.json'));
const ODDS=path.resolve(ROOT,arg('--odds','slates/nfl-odds.json'));
const OUT=path.resolve(ROOT,arg('--out','slates/nfl-sim.json'));
const CONFIG=path.resolve(ROOT,arg('--config','sports/nfl/sim/config.json'));
const GAME=arg('--game',null);
const ITER=Number(arg('--iterations',''))||null;
const SEED=Number(arg('--seed',''))||null;
const LIVE_URL=arg('--live-url',process.env.NFL_LIVE_ENDPOINT||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live');
const NO_LIVE=has('--no-live');

async function fetchLive(){
  if(NO_LIVE)return null;
  try{
    const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);
    const r=await fetch(LIVE_URL,{signal:c.signal,headers:{accept:'application/json','cache-control':'no-cache'}});clearTimeout(t);
    if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  }catch(e){console.warn(`⚠ NFL sim live feed unavailable (${e.message}); continuing pregame/static.`);return null;}
}

function matchLive(game,board){
  if(!board?.games)return null;
  return board.games[String(game.gameId||game.id)]||null;
}
function selectedGames(slate){
  const games=slate?.games||[];
  if(!GAME)return games;
  const terms=String(GAME).split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
  return games.filter(g=>{
    const id=String(g.gameId||g.id).toUpperCase(),pair=`${g.away?.abbr||''}-${g.home?.abbr||''}`.toUpperCase();
    return terms.some(t=>t===id||t===pair||pair.includes(t));
  });
}

const [slate,research,odds,config,liveBoard]=await Promise.all([
  read(SLATE,{games:[]}),read(RESEARCH,{players:[]}),read(ODDS,{games:[]}),read(CONFIG,null),fetchLive()
]);
if(!config)throw new Error(`NFL sim config missing: ${CONFIG}`);
const games=selectedGames(slate);
if(!games.length)throw new Error(GAME?`No NFL game matched --game ${GAME}`:'NFL slate contains no games');

const results=[];
for(const game of games){
  const liveGame=matchLive(game,liveBoard);
  const iterations=ITER||(isHalftimeState(liveGame)?(config.halftimeIterations||config.automatic?.halftimeIterations||50000):liveGame?.status==='in'?(config.liveIterations||config.automatic?.liveIterations||15000):(config.defaultIterations||config.automatic?.pregameIterations||50000));
  const result=simulateGame({game,research,odds,liveGame,config,iterations,seed:SEED,includeSamples:false});
  results.push(stripPrivateSamples(result));
  const o=result.outcomes;
  const phase=isHalftimeState(liveGame)?'HALFTIME':liveGame?.status==='in'?'LIVE':'PREGAME';
  console.log(`✓ ${result.game.away.abbr} @ ${result.game.home.abbr}: ${iterations.toLocaleString()} sims [${phase}] | win ${result.game.away.abbr} ${(o.away.winProbability*100).toFixed(1)}% / ${result.game.home.abbr} ${(o.home.winProbability*100).toFixed(1)}% | avg ${o.away.score.mean}-${o.home.score.mean}`);
}

const payload={
  schemaVersion:2,engineVersion:config.engineVersion,generatedAt:new Date().toISOString(),
  meta:{automatic:false,probabilityBlend:config.probabilityBlend||null},
  source:{slate:path.relative(ROOT,SLATE),research:path.relative(ROOT,RESEARCH),odds:path.relative(ROOT,ODDS),live:NO_LIVE?null:LIVE_URL},
  gameCount:results.length,games:results,
};
await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.writeFile(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(`✓ wrote ${path.relative(ROOT,OUT)} — ${results.length} game(s)`);
