#!/usr/bin/env node
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { nextFutureStartMs, refreshState } from './parlayapi-pregame-cadence.mjs';

const NOW=Date.now();
const FORCE=process.env.MLB_ODDS_FORCE==='1'||process.argv.includes('--force');
async function readJson(file,fallback=null){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return fallback;}}

const slate=await readJson('slate.json',{games:[]});
const snapshot=await readJson('slates/mlb-odds.json',null);
const starts=(slate?.games||[]).map(g=>g?.startTimeUTC).filter(Boolean);
const nextStartMs=nextFutureStartMs(starts,NOW);
const gate=refreshState({lastFetchedAt:snapshot?.meta?.fetchedAt,nextStartMs,nowMs:NOW,force:FORCE});
if(!gate.due){
  const threshold=Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60_000):null;
  const age=Number.isFinite(gate.ageMs)?Math.round(gate.ageMs/60_000):null;
  console.log(`MLB ParlayAPI props not due; age=${age??'n/a'}m threshold=${threshold??'n/a'}m next=${gate.hoursToNextStart==null?'none':gate.hoursToNextStart.toFixed(2)+'h'}.`);
  process.exit(0);
}
console.log(`MLB ParlayAPI props due; next=${gate.hoursToNextStart==null?'forced':gate.hoursToNextStart.toFixed(2)+'h'}, threshold=${Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60_000):0}m.`);
const env={...process.env,MLB_ODDS_FORCE:'1'};
const run=spawnSync(process.execPath,['scripts/mlb-odds-refresh.mjs','--force'],{stdio:'inherit',env});
if(run.status!==0)process.exit(run.status||1);
