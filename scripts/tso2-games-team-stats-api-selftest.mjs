import assert from 'node:assert/strict';
const origin=String(process.env.TSO2_STAGING_ORIGIN||'https://staging.thesportsoutpost.com').replace(/\/$/,'');
const u=origin+'/api/tso2-matchup-team-stats?away=BUF&home=MIA';
const response=await fetch(u,{signal:AbortSignal.timeout(35000),headers:{accept:'application/json'},cache:'no-store'});
const doc=await response.json();
assert.equal(response.status,200,'NFL matchup-stat API must respond successfully: '+JSON.stringify(doc).slice(0,300));
assert.equal(doc.season,2026);
assert.equal(doc.available,true);
const fields=['pointsPerGame','yardsPerGame','passYardsPerGame','rushYardsPerGame','thirdDownPct','turnoverDifferential'];
for(const team of ['BUF','MIA']){
 const a=doc.teams?.[team];
 assert.equal(a?.team,team);
 assert.equal(a?.season,2026);
 assert.ok(a.games>=1,'Verified 2026 season sample');
 for(const metric of fields){
  assert.ok(Number.isFinite(a?.stats?.[metric]),team+' missing verified '+metric);
 }
 assert.ok(a.stats.defYardsAllowed===null||Number.isFinite(a.stats.defYardsAllowed),'Unknown defensive yard allowances may not become zero');
}
console.log('TSO2 LIVE 2026 NFL MATCHUP METRICS PASS',JSON.stringify({checkedAt:doc.checkedAt,source:doc.source,buf:doc.teams.BUF.stats,mia:doc.teams.MIA.stats}));
