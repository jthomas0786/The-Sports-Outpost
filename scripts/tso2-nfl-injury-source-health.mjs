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
 topLevelType:typeof doc.injuries
}));
const report=await verifiedLeagueInjuryReport({cache:false});
const codes=new Set(report.coveredTeams);
if(codes.size<14)throw Error('NFL injury feed covers only '+codes.size+' teams; refusing to call this a complete audit');
const summaries=[...codes].map(code=>injuryStatusForTeam(report,code));
console.log(JSON.stringify({verifiedSeason:report.season,teams:codes.size,injuryRows:report.rows.length,
  ruledOut:summaries.reduce((n,r)=>n+r.excluded.length,0),
  uncertain:summaries.reduce((n,r)=>n+r.uncertain.length,0),checkedAt:report.checkedAt,source:report.source}));
