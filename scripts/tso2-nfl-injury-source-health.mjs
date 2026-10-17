#!/usr/bin/env node
// Read-only production-source test; prints counts, not medical details or identifiers.
import {verifiedLeagueInjuryReport,injuryStatusForTeam} from '../sports/nfl/sim/injury-audit.js';
const report=await verifiedLeagueInjuryReport({cache:false});
const codes=new Set(report.coveredTeams);
if(codes.size<14)throw Error('NFL injury feed covers only '+codes.size+' teams; refusing to call this a complete audit');
const summaries=[...codes].map(code=>injuryStatusForTeam(report,code));
console.log(JSON.stringify({verifiedSeason:report.season,teams:codes.size,injuryRows:report.rows.length,
  ruledOut:summaries.reduce((n,r)=>n+r.excluded.length,0),
  uncertain:summaries.reduce((n,r)=>n+r.uncertain.length,0),checkedAt:report.checkedAt,source:report.source}));
