#!/usr/bin/env node
// Validate a published TSO2 50K model and issue its matching immutable audit
// report. This NEVER runs a simulation or changes any player/model statistics.
import fs from 'node:fs';
import path from 'node:path';

const modelPath=path.resolve(process.argv[2]||'tso2/data/nfl-sim.json');
const reportPath=path.resolve(process.argv[3]||'tso2/data/nfl-sim-run-report.json');
const doc=JSON.parse(fs.readFileSync(modelPath,'utf8'));
const errors=[],summaries=[];
const canonical=x=>String(x||'').toLowerCase().normalize('NFKD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const team=x=>String(x||'').toUpperCase().replace(/^JAC$/,'JAX').replace(/^GNB$/,'GB').replace(/^LAR$/,'LA');
const identity=p=>team(p?.team)+'|'+canonical(p?.name);
const finite=n=>Number.isFinite(Number(n));
const expect=(condition,message)=>{if(!condition)errors.push(message)};
expect(doc?.schemaVersion===2,'Schema is not 2');
expect(doc?.engineVersion==='v89.18.0','Unexpected simulation engine');
expect(Number.isFinite(Date.parse(doc?.generatedAt)),'Missing model-generation timestamp');
expect(Array.isArray(doc?.games)&&doc.games.length>=10,'Missing full NFL slate');
expect(doc?.gameCount===doc.games?.length,'Game-count mismatch');
const seen=new Set();
for(const g of doc.games||[]){
 const id=String(g.game?.gameId||''),pair=(g.game?.away?.abbr||'?')+' @ '+(g.game?.home?.abbr||'?');
 expect(id&&!seen.has(id),'Duplicate or missing game ID: '+id);seen.add(id);
 expect(g.iterations===50000,'Game '+id+' is not an audited 50K run');
 const a=g.availabilityAudit||{},roster=a.rosterAudit||{},world=g.representativeWorld;
 expect(a.rosterVerified===true&&a.season===2026,'No verified 2026 roster: '+id);
 expect(roster.season===2026&&Number.isFinite(Date.parse(roster.checkedAt)),'Roster audit timestamp absent: '+id);
 expect(roster.injuryReportVerified===true&&Number.isFinite(Date.parse(roster.injuryReportCheckedAt)),'Injury source not verified: '+id);
 expect(roster.injuryTeams?.length===2&&roster.injuryTeams.every(t=>t.reported===true),'Incomplete injury audit: '+id);
 expect(roster.finalInactivesVerified!==true,'Unjustified final-inactives claim: '+id);
 expect(world?.selection==='central-correlated-sampled-world'&&world.iterations===50000&&
  Number.isInteger(world.sampledIndex)&&world.sampledIndex>=0&&world.sampledIndex<50000,'Invalid sampled world: '+id);
 expect(Array.isArray(g.notes)&&g.notes.some(x=>String(x).includes('v89.18')),'Engine note missing: '+id);
 const excluded=new Set((a.exclusions||[]).map(identity));
 const players=g.players||[],worldPlayers=world?.players||[];
 expect(players.length>=10&&worldPlayers.length>=10,'Insufficient verified game/world players: '+id);
 for(const p of [...players,...worldPlayers]){
  if(!p?.name||![team(g.game?.away?.abbr),team(g.game?.home?.abbr)].includes(team(p?.team)))
   errors.push('Wrong team / missing identity: '+id+' '+String(p?.name));
  if(excluded.has(identity(p)))errors.push('Excluded player still simulated: '+id+' '+p.name);
 }
 // Players recorded in the chosen illustrative world must be model players.
 const modelNames=new Set(players.map(identity));
 for(const p of worldPlayers)if(!modelNames.has(identity(p)))
  errors.push('Representative-world player missing from simulation pool: '+id+' '+p.name);
 const home=Number(g.outcomes?.home?.score?.mean),away=Number(g.outcomes?.away?.score?.mean);
 expect(finite(home)&&finite(away),'Scoring projection invalid: '+id);
 expect(finite(world?.homeScore)&&finite(world?.awayScore)&&Math.abs(world.homeScore-home)<=12&&
  Math.abs(world.awayScore-away)<=12,'Representative score inconsistent: '+id);
 summaries.push({gameId:id,matchup:pair,iterations:g.iterations,homeMean:home,awayMean:away,
  representativeSampleIndex:world?.sampledIndex??null,
  representativeAwayScore:world?.awayScore??null,representativeHomeScore:world?.homeScore??null,
  rosterCheckedAt:roster.checkedAt,injuryCheckedAt:roster.injuryReportCheckedAt,
  injuryReportVerified:roster.injuryReportVerified===true,
  questionables:roster.injuryTeams?.reduce((n,t)=>n+(t.uncertain||[]).length,0)||0,
  excluded:(a.exclusions||[]).length});
}
expect(summaries.length===doc.gameCount,'Incomplete audited slate');
if(errors.length)throw Error('Refusing to publish an invalid model report:\n'+errors.slice(0,30).join('\n'));
const result={status:'verified',generatedAt:doc.generatedAt,season:2026,
 eligibilityGate:'engine-profile-injury-whitelist-v3',verifiedRosters:true,
 finalGamedayInactivesVerified:false,gameCount:doc.gameCount,
 totalIterations:summaries.reduce((sum,g)=>sum+g.iterations,0),summaries};
fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');
console.log('PASS: paired TSO2 model/report',result.generatedAt,
 result.gameCount+' NFL games',result.totalIterations+' sampled runs');
