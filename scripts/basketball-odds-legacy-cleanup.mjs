#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeBasketballPlayerIdentity } from './lib/basketball-odds-quality.mjs';

const file=path.join(process.cwd(),'slates','wnba-odds.json');
let parsed;
try{parsed=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){
  if(error?.code==='ENOENT')process.exit(0);
  throw error;
}
const input=Array.isArray(parsed?.rows)?parsed.rows:[];
let removedOrphans=0,normalizedSuffixes=0;
const rows=[];
for(const row of input){
  if(!row?.eventId||!row?.commenceTime||!row?.homeTeam||!row?.awayTeam){removedOrphans++;continue;}
  const identity=normalizeBasketballPlayerIdentity('WNBA',row?.player||'',row?.team||'');
  if(!identity.player){removedOrphans++;continue;}
  if(identity.strippedTeamSuffix)normalizedSuffixes++;
  rows.push({...row,player:identity.player,team:identity.team});
}
if(removedOrphans||normalizedSuffixes){
  parsed.rows=rows;
  parsed.meta={...(parsed.meta||{}),legacyCleanup:{at:new Date().toISOString(),removedOrphans,normalizedSuffixes}};
  await fs.writeFile(file,JSON.stringify(parsed,null,2)+'\n');
}
console.log(`WNBA legacy cleanup: rows=${input.length}->${rows.length}, removedOrphans=${removedOrphans}, normalizedSuffixes=${normalizedSuffixes}.`);
