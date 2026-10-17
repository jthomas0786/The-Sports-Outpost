// Staging-only live diagnostics. Never inject screenshot placeholder statistics.
const root='https://staging.thesportsoutpost.com';
for(const [label,path] of [
 ['NHL_TEAM','/api/tso2-nhl-team-stats?away=NJD&home=CBJ'],
 ['NHL_PLAYER','/api/tso2-nhl-player-rates?playerId=8478402&team=EDM']
]){
 try{
  const response=await fetch(root+path,{signal:AbortSignal.timeout(24000)});
  const json=await response.json();
  console.log('TSO2_NHL_SOURCE_DIAGNOSTIC',label,JSON.stringify({
   status:response.status,available:json.available,error:json.error||null,season:json.season||null,
   awayStats:json.teams?.NJD?.stats||null,homeStats:json.teams?.CBJ?.stats||null,
   playerMetrics:json.metrics||null,games:json.games||null
  }));
 }catch(err){console.log('TSO2_NHL_SOURCE_DIAGNOSTIC',label,String(err.message||err));}
}

for(const report of ['summary','scoringRates','timeonice','powerplay']){
 try{
  const q='seasonId=20262027 and gameTypeId=2 and playerId=8478402';
  const u='https://api.nhle.com/stats/rest/en/skater/'+report+'?limit=3&cayenneExp='+encodeURIComponent(q);
  const r=await fetch(u,{signal:AbortSignal.timeout(18000)});
  const d=await r.json();
  console.log('NHL_SKATER_SCHEMA',report,JSON.stringify({http:r.status,total:d.total,keys:Object.keys(d.data?.[0]||{}),sample:(d.data||[]).slice(0,1)}).slice(0,2200));
 }catch(e){console.log('NHL_SKATER_SCHEMA',report,'ERR '+String(e.message||e));}
}
