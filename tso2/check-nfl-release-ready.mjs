#!/usr/bin/env node
// Read-only release gate: do not authorize TSO 2.0 cutover without isolated NFL slate.
const origin='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-2.0-restructure/tso2/data/nfl-sim.json';
const r=await fetch(origin,{headers:{accept:'application/json'}});
if(!r.ok)throw Error('TSO 2.0 validated NFL slate unavailable: HTTP '+r.status);
const doc=await r.json();
if(!Array.isArray(doc.games)||!doc.games.length)throw Error('TSO 2.0 NFL slate is empty');
if(!doc.engineVersion)throw Error('TSO 2.0 NFL engine version missing');
if(!Number.isFinite(Date.parse(doc.generatedAt)))throw Error('Invalid NFL generatedAt timestamp');
const staleHours=(Date.now()-Date.parse(doc.generatedAt))/3600000;
if(staleHours>72||staleHours < -1)throw Error('NFL slate is stale or future-dated: '+staleHours.toFixed(1)+' hours old');
const pregame=doc.games.filter(g=>g.automation?.phase==='pregame');
if(!pregame.length)throw Error('No pregame NFL model games found');
for(const g of pregame){
 if(!Array.isArray(g.propStyles?.candidates))throw Error('No full prop candidates for '+g.game?.gameId);
 for(const c of g.propStyles.candidates){
  const p=Number(c.simProbability);
  if(!Number.isFinite(p)||p<0||p>1)throw Error('Invalid NFL model probability');
 }
}
console.log('READY:',JSON.stringify({engine:doc.engineVersion,generatedAt:doc.generatedAt,games:doc.games.length,pregame:pregame.length,ageHours:staleHours.toFixed(1)}));
