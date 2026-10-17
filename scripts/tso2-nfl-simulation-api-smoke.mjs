#!/usr/bin/env node
// Read-only staging API regression probe. Does not use production or modify data.
import assert from 'node:assert/strict';
const base=(process.env.TSO2_STAGING_ORIGIN||'https://staging.thesportsoutpost.com').replace(/\/$/,'');
const maxWait=20000;
async function get(url){
 const signal=AbortSignal.timeout(maxWait);
 const response=await fetch(url,{signal,headers:{accept:'application/json','cache-control':'no-cache'},cache:'no-store'});
 const raw=await response.text();
 let doc;
 try{doc=JSON.parse(raw);}catch{throw new Error('Expected JSON from '+url+'; status '+response.status+'; body: '+raw.slice(0,120));}
 assert.equal(response.status,200,'Staging simulation endpoint HTTP '+response.status+' '+(doc.error||''));
 return doc;
}
const data=await get(base+'/api/tso-simulations-nfl');
assert.equal(data.schemaVersion,2);
assert.ok(Array.isArray(data.games)&&data.games.length>0,'NFL simulation games missing');
assert.ok(String(data.modelValidation||'').startsWith('Verified'),'Selected game must come from validated 50K model: '+data.modelValidation);
const ready=data.games.filter(g=>g.availability?.rosterVerified===true&&!g.availability.requiresRerun);
assert.ok(ready.length>0,'All games disabled despite validated simulation report');
for(const game of ready){
 assert.ok(Number.isFinite(Date.parse(game.kickoff)),'Missing game kickoff '+game.gameId);
 assert.equal(game.iterations,50000,'Unexpected model iterations for '+game.gameId);
 assert.equal(game.representativeWorld?.selection,'central-correlated-sampled-world');
 assert.equal(game.representativeWorld?.iterations,50000);
 assert.ok(Array.isArray(game.players)&&game.players.some(p=>p.position==='QB'));
 const blocked=new Set(['jaydenreed','joshjacobs','skyymoore','mitchvanvooren','mitchellvanvooren']);
 if(game.gameId==='401873007')for(const p of game.players)assert.ok(!blocked.has(p.name.toLowerCase().replace(/[^a-z]/g,'')),'Unavailable game player: '+p.name);
}
console.log('TSO 2.0 staging NFL API PASS',JSON.stringify({games:data.games.length,ready:ready.length,validation:data.modelValidation,firstKickoff:ready[0].kickoff}));
