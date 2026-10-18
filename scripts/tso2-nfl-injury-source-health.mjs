#!/usr/bin/env node
// Read-only production-source test; prints counts, not medical details or identifiers.
import {verifiedLeagueInjuryReport,injuryStatusForTeam} from '../sports/nfl/sim/injury-audit.js';
const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries';
const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
if(!response.ok)throw Error('Injury source HTTP '+response.status);
const doc=await response.json();
const sample=Array.isArray(doc.injuries)?doc.injuries[0]:null;
console.log('ESPN_INJURY_SHAPE',JSON.stringify({
 season:doc.season,topLevelKeys:Object.keys(doc),
 groups:Array.isArray(doc.injuries)?doc.injuries.length:null,
 firstGroupKeys:sample?Object.keys(sample):[],
 firstGroupTeam:sample?.team||null,
 firstGroupRows:Array.isArray(sample?.injuries)?sample.injuries.length:null,
 firstRowKeys:sample?.injuries?.[0]?Object.keys(sample.injuries[0]):[],
 sampleIds:doc.injuries.slice(0,5).map(g=>({id:g.id,count:g.injuries?.length})),
 statuses:Object.entries((doc.injuries||[]).flatMap(g=>g.injuries||[]).reduce((m,x)=>{const k=typeof x.status==='string'?x.status:JSON.stringify(x.status);m[k]=(m[k]||0)+1;return m},{})).sort((a,b)=>b[1]-a[1]).slice(0,12),

 topLevelType:typeof doc.injuries
}));
const rosterResponse=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/dal/roster',{signal:AbortSignal.timeout(12000)});
if(!rosterResponse.ok)throw Error('Team roster unavailable '+rosterResponse.status);
const roster=await rosterResponse.json();
console.log('ESPN_ROSTER_GROUP_SHAPE',JSON.stringify({year:roster.season?.year,
 groups:(roster.athletes||[]).map(g=>({position:g.position,count:g.items?.length,
 active:g.items?.filter(p=>p.status?.type==='active').length})).slice(0,10)}));
const report=await verifiedLeagueInjuryReport({cache:false});
const codes=new Set(report.coveredTeams);
if(codes.size<14)throw Error('NFL injury feed covers only '+codes.size+' teams; refusing to call this a complete audit');
const summaries=[...codes].map(code=>injuryStatusForTeam(report,code));
console.log(JSON.stringify({verifiedSeason:report.season,teams:codes.size,injuryRows:report.rows.length,
  ruledOut:summaries.reduce((n,r)=>n+r.excluded.length,0),
  uncertain:summaries.reduce((n,r)=>n+r.uncertain.length,0),checkedAt:report.checkedAt,source:report.source}));
