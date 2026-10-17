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
