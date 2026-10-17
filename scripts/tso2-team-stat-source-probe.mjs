// Diagnostic only: source shape for verified 2026 NFL matchup statistics.
const urls=[
 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/2/statistics?season=2026',
 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/teams/2/statistics',
 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/2?enable=stats'
];
for(const url of urls){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(14000)});
  const data=await response.json();
  const categories=data.splits?.categories||data.statistics?.categories||data.statistics||data.team?.statistics||[];
  const summary=(Array.isArray(categories)?categories:[]).map(c=>({
   name:c.name,displayName:c.displayName,labels:c.labels,
   stats:c.stats?.slice?.(0,15)?.map(s=>({name:s.name,displayName:s.displayName,value:s.value,displayValue:s.displayValue}))||[],
   names:c.names?.slice?.(0,15),values:c.values?.slice?.(0,15)
  }));
  console.log('TEAM_STATS_SOURCE',JSON.stringify({url,status:response.status,keys:Object.keys(data),season:data.season,
   splitKeys:Object.keys(data.splits||{}),statsKeys:Object.keys(data.statistics||{}),cats:summary.slice(0,14),
   firstSection:JSON.stringify(data).slice(0,1700)}));
 }catch(e){console.log('TEAM_STATS_SOURCE_ERROR',JSON.stringify({url,error:e.message}))}
}

// Run diagnostic against live current-season team statistics.
