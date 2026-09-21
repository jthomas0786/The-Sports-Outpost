#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { simulateGame, stripPrivateSamples } from '../sports/nfl/sim/engine-v8918.js';
import { buildPregameQuarterBoard } from '../sports/nfl/sim/quarter-board.js';
import { buildPregameFullPropBoard } from '../sports/nfl/sim/full-prop-board-v942.js';

const ROOT=process.cwd();
const read=async(file,fallback=null)=>{try{return JSON.parse(await fs.readFile(path.join(ROOT,file),'utf8'));}catch{return fallback;}};
const [slate,research,odds,sim,live,config]=await Promise.all([
  read('slates/nfl.json',{games:[]}),read('slates/nfl-research.json',{players:[]}),read('slates/nfl-odds.json',{games:[]}),
  read('slates/nfl-sim.json',{schemaVersion:2,games:[]}),read('slates/nfl-live.json',{games:{}}),read('sports/nfl/sim/config.json',null),
]);
if(!config)throw new Error('NFL sim config missing');
const requested=new Set((process.argv.find(x=>x.startsWith('--games='))?.slice(8)||'').split(',').map(x=>x.trim()).filter(Boolean));
const isFinal=id=>{
  const g=live?.games?.[String(id)]||{},s=String(g.status||'').toLowerCase(),d=String(g.statusDetail||g.detail||'').toLowerCase();
  return ['post','final','completed','closed'].includes(s)||d.includes('final');
};
const publicPropPeriods=board=>Object.fromEntries(Object.entries(board?.periods||{}).map(([period,data])=>[period,{
  ready:!!data?.ready,iterations:Number(data?.iterations||board?.iterations||0),rankings:{...(data?.rankings||{})},
  candidates:(data?.candidates||[]).map(candidate=>{const {worldMaskB64,...rest}=candidate;return rest;}),
}]));
const existingById=new Map((sim?.games||[]).map(g=>[String(g?.game?.gameId||g?.gameId||''),g]));
let rebuilt=0;
for(const game of slate?.games||[]){
  const id=String(game.gameId||game.id||'');
  if(!id||isFinal(id)||(requested.size&&!requested.has(id)))continue;
  console.log(`▶ rebuilding frozen Player Prop boards for ${game?.away?.abbr||'AWY'} @ ${game?.home?.abbr||'HME'} (${id})`);
  const raw=simulateGame({game,research,odds,liveGame:null,config,iterations:Number(config?.automatic?.pregameIterations||config?.defaultIterations||50000),includeSamples:true});
  const full=buildPregameFullPropBoard({result:raw,game,odds,generatedAt:new Date().toISOString()});
  const quarter=buildPregameQuarterBoard({result:raw,game,config,generatedAt:new Date().toISOString()});
  const current=existingById.get(id)||stripPrivateSamples(raw);
  if(full?.ready){current.propStyles=full;current.propStyleVersion='v95.5';}
  if(Object.values(quarter?.periods||{}).some(p=>p?.ready)){current.propPeriods=publicPropPeriods(quarter);current.propPeriodVersion='v95.5';}
  existingById.set(id,current);rebuilt++;
  console.log(`  ✓ full ${full?.candidates?.length||0} candidates · period ${Object.values(quarter?.periods||{}).reduce((n,p)=>n+(p?.candidates?.length||0),0)} candidates`);
}
if(!rebuilt){console.log('No active/upcoming NFL game required a prop-cache rebuild.');process.exit(0);}
const slateIds=new Set((slate?.games||[]).map(g=>String(g.gameId||g.id||'')));
sim.games=[...existingById.values()].filter(g=>slateIds.has(String(g?.game?.gameId||g?.gameId||''))).sort((a,b)=>new Date(a?.game?.startTimeUTC||0)-new Date(b?.game?.startTimeUTC||0));
sim.generatedAt=new Date().toISOString();
sim.meta={...(sim.meta||{}),propStyleVersion:'v95.5',propPeriodVersion:'v95.5',propCacheRefreshedAt:new Date().toISOString()};
await fs.writeFile(path.join(ROOT,'slates','nfl-sim.json'),JSON.stringify(sim,null,2)+'\n');
console.log(`✓ refreshed ${rebuilt} active/upcoming NFL Player Prop board cache(s) without replacing live simulation state`);
