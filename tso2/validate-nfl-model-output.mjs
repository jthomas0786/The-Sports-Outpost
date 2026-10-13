#!/usr/bin/env node
import fs from 'node:fs';
const file=process.argv[2]||'tso2/data/nfl-sim.json';
if(!fs.existsSync(file))throw Error('TSO2 simulation missing: '+file);
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(doc.games)||!doc.games.length)throw Error('No NFL games generated');
let candidates=0,extreme=0,invalid=0,zeroVariance=0;
for(const game of doc.games){
 if(!game.game?.gameId)throw Error('NFL game identifier missing');
 const pregame=game.automation?.phase==='pregame';
 if(!pregame)continue;
 if(!Array.isArray(game.propStyles?.candidates))throw Error('Missing prop candidates for '+game.game.gameId);
 for(const c of game.propStyles.candidates){
  candidates++;
  const prob=Number(c.simProbability);
  if(!Number.isFinite(prob)||prob<0||prob>1){invalid++;continue;}
  if(prob<=0.0005||prob>=0.9995)extreme++;
  if(['passYds','passTds','completions'].includes(c.market)){
   const player=(game.players||[]).find(p=>String(p.name||'').toLowerCase()===String(c.name||'').toLowerCase()&&String(p.team||'').toUpperCase()===String(c.team||'').toUpperCase());
   const dist=player?.distributions?.[c.market];
   if(dist&&Number.isFinite(Number(dist.min))&&Number(dist.min)===Number(dist.max))zeroVariance++;
  }
 }
}
const report={games:doc.games.length,candidates,invalid,extreme,zeroVariance,engine:doc.engineVersion};
console.log(JSON.stringify(report,null,2));
if(invalid)throw Error('Invalid NFL probability candidates: '+invalid);
if(extreme)throw Error('NFL candidate probabilities near 0% or 100% require review: '+extreme);
if(zeroVariance)throw Error('Zero-variance quarterback passing candidates: '+zeroVariance);
if(!candidates)throw Error('No NFL prop candidates to validate');
