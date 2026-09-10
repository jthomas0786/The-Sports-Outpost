#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { jointProbabilityFromResult, quarterPropProbability, simulateGame } from '../sports/nfl/sim/engine-v861.js';

const ROOT=process.cwd();
const arg=(flag,fallback=null)=>{const i=process.argv.indexOf(flag);return i>=0&&process.argv[i+1]!=null?process.argv[i+1]:fallback};
const read=async(file,fallback=null)=>{try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return fallback}};
const GAME=String(arg('--game','')||'').toUpperCase();
const QUARTER=Math.max(1,Math.min(4,Number(arg('--quarter','1'))||1));
const LEGS=Math.max(2,Math.min(6,Number(arg('--legs','3'))||3));
const TARGET=Math.max(.55,Math.min(.90,Number(arg('--target','.72'))||.72));
const MIN=Math.max(.50,Math.min(.90,Number(arg('--min','.60'))||.60));
const ITER=Number(arg('--iterations',''))||null;

const [slate,research,odds,config]=await Promise.all([
  read(path.resolve(ROOT,'slates/nfl.json'),{games:[]}),
  read(path.resolve(ROOT,'slates/nfl-research.json'),{players:[]}),
  read(path.resolve(ROOT,'slates/nfl-odds.json'),{games:[]}),
  read(path.resolve(ROOT,'sports/nfl/sim/config.json'),null),
]);
if(!config) throw new Error('NFL simulation config unavailable');
const games=slate?.games||[];
const game=games.find(g=>{
  if(!GAME) return true;
  const id=String(g.gameId||g.id||'').toUpperCase();
  const pair=`${g.away?.abbr||''}-${g.home?.abbr||''}`.toUpperCase();
  return GAME===id||GAME===pair||pair.includes(GAME);
});
if(!game) throw new Error(`No game matched ${GAME||'current slate'}`);
const iterations=ITER||config.automatic?.pregameIterations||config.defaultIterations||50000;
const result=simulateGame({game,research,odds,config,iterations,includeSamples:true,liveGame:null});
const q=`q${QUARTER}`;
const thresholds={
  passYds:[24.5,39.5,49.5,59.5,74.5],
  completions:[2.5,3.5,4.5,5.5,6.5],
  rushYds:[4.5,9.5,14.5,19.5,24.5,29.5],
  recYds:[4.5,9.5,14.5,19.5,24.5,29.5],
  receptions:[0.5,1.5,2.5,3.5],
};
const allowedByPos={QB:['passYds','completions','rushYds'],RB:['rushYds','recYds','receptions'],WR:['recYds','receptions'],TE:['recYds','receptions']};
const period=result.quarters?.periods?.[q];
if(!period) throw new Error(`${q.toUpperCase()} distributions unavailable`);
const candidates=[];
for(const p of period.players||[]){
  for(const market of allowedByPos[p.position]||[]){
    const options=[];
    for(const line of thresholds[market]||[]){
      const probability=quarterPropProbability(result,{playerId:p.playerId,quarter:q,market,line,side:'over'});
      if(probability==null||probability<MIN||probability>.94) continue;
      options.push({playerId:p.playerId,player:p.name,team:p.team,position:p.position,market,line,side:'over',probability});
    }
    if(!options.length) continue;
    options.sort((a,b)=>Math.abs(a.probability-TARGET)-Math.abs(b.probability-TARGET)||b.line-a.line);
    candidates.push(options[0]);
  }
}
candidates.sort((a,b)=>Math.abs(a.probability-TARGET)-Math.abs(b.probability-TARGET)||b.probability-a.probability);
const picked=[];
const usedPlayers=new Set();
for(const c of candidates){
  if(usedPlayers.has(c.playerId)) continue;
  picked.push(c);usedPlayers.add(c.playerId);
  if(picked.length>=LEGS) break;
}
if(picked.length<2) throw new Error(`Not enough ${q.toUpperCase()} candidates cleared ${(MIN*100).toFixed(0)}%`);
const legs=picked.map(c=>({playerId:c.playerId,period:q,market:c.market,side:c.side,line:c.line}));
const joint=jointProbabilityFromResult(result,legs);
console.log(`TSO ${q.toUpperCase()} ${picked.length}-leg candidate — ${iterations.toLocaleString()} simulations`);
for(const c of picked) console.log(`  ${c.player} — OVER ${c.line} ${c.market} | ${(c.probability*100).toFixed(1)}%`);
console.log(`  Joint hit rate: ${joint==null?'—':(joint*100).toFixed(2)+'%'}`);
console.log(`  Matchup: ${result.game.away.abbr} @ ${result.game.home.abbr}`);
