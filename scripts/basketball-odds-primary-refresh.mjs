#!/usr/bin/env node
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { nextFutureStartMs, refreshState } from './parlayapi-pregame-cadence.mjs';
import { plausibleBasketballPropRow } from './lib/basketball-odds-quality.mjs';

const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const KEY=process.env.PARLAY_API_KEY||'';
const NOW=Date.now();
const FORCE=process.env.BASKETBALL_ODDS_FORCE==='1'||process.argv.includes('--force');
const LEAGUES={NBA:{sportKey:'basketball_nba',slug:'nba'},NCAAB:{sportKey:'basketball_ncaab',slug:'ncaab'},WNBA:{sportKey:'basketball_wnba',slug:'wnba'}};
if(!KEY){console.error('::error::PARLAY_API_KEY is missing.');process.exit(2);}

function arrayPayload(payload){return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];}
async function readSnapshot(slug){try{return JSON.parse(await fs.readFile(`slates/${slug}-odds.json`,'utf8'));}catch{return null;}}
async function writeSnapshot(slug,doc){await fs.writeFile(`slates/${slug}-odds.json`,JSON.stringify(doc,null,2)+'\n');}
function matchupLabel(value){const name=String(value||'').trim();return name.includes('@')||/\bvs\.?\b/i.test(name);}
function verifiedSnapshot(doc){return doc?.meta?.source==='parlayapi'&&doc?.meta?.sample===false&&Array.isArray(doc?.rows);}
async function sanitizeSnapshot(slug){
  const doc=await readSnapshot(slug);if(!doc||!Array.isArray(doc.rows))return 0;
  const before=doc.rows.length;
  doc.rows=doc.rows.filter(row=>!matchupLabel(row?.player)&&plausibleBasketballPropRow(row?.market,row?.line,row?.player));
  const removed=before-doc.rows.length;
  if(!removed)return 0;
  if(doc.meta&&typeof doc.meta==='object'){
    doc.meta.sportsbookRows=doc.rows.length;
    doc.meta.currentRows=doc.rows.filter(row=>!row?.preserved).length;
    doc.meta.preservedRows=doc.rows.filter(row=>row?.preserved).length;
    doc.meta.rejectedNonPlayers=Number(doc.meta.rejectedNonPlayers||0)+removed;
    doc.meta.sanitizedMatchupLabels=Number(doc.meta.sanitizedMatchupLabels||0)+removed;
  }
  await writeSnapshot(slug,doc);
  console.log(`${slug.toUpperCase()} snapshot removed ${removed} matchup label row(s) misclassified as players.`);
  return removed;
}
async function eventsFor(sportKey){
  const from=new Date(NOW-12*3600_000).toISOString();
  const to=new Date(NOW+30*24*3600_000).toISOString();
  const qs=new URLSearchParams({commenceTimeFrom:from,commenceTimeTo:to});
  const response=await fetch(`${API}/sports/${sportKey}/events?${qs}`,{headers:{accept:'application/json','X-API-Key':KEY},signal:AbortSignal.timeout(30_000)});
  const text=await response.text();
  if(!response.ok)throw new Error(`ParlayAPI events HTTP ${response.status}: ${text.slice(0,300)}`);
  return arrayPayload(text?JSON.parse(text):null);
}

const requested=process.argv.slice(2).filter(x=>x!=='--force').map(x=>String(x).toUpperCase()).filter(x=>LEAGUES[x]);
const sports=requested.length?[...new Set(requested)]:['NBA','NCAAB','WNBA'];
let failed=false;
for(const sport of sports){
  try{
    const cfg=LEAGUES[sport],snapshot=await readSnapshot(cfg.slug),events=await eventsFor(cfg.sportKey);
    const nextStartMs=nextFutureStartMs(events.map(e=>e?.commence_time),NOW);
    const gate=refreshState({lastFetchedAt:snapshot?.meta?.fetchedAt,nextStartMs,nowMs:NOW,force:FORCE});
    if(!gate.due){
      await sanitizeSnapshot(cfg.slug);
      const threshold=Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60_000):null;
      const age=Number.isFinite(gate.ageMs)?Math.round(gate.ageMs/60_000):null;
      console.log(`${sport} ParlayAPI props not due; age=${age??'n/a'}m threshold=${threshold??'n/a'}m next=${gate.hoursToNextStart==null?'none':gate.hoursToNextStart.toFixed(2)+'h'}.`);
      continue;
    }
    console.log(`${sport} ParlayAPI props due; next=${gate.hoursToNextStart==null?'forced':gate.hoursToNextStart.toFixed(2)+'h'}, threshold=${Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60_000):0}m.`);
    const run=spawnSync(process.execPath,['scripts/basketball-odds-refresh.mjs',sport],{encoding:'utf8',env:process.env,maxBuffer:16*1024*1024});
    if(run.stdout)process.stdout.write(run.stdout);
    if(run.stderr)process.stderr.write(run.stderr);
    if(run.status!==0){
      const detail=`${run.stdout||''}\n${run.stderr||''}`;
      const transient=/\b503\b|props_temporarily_busy|temporarily busy|board is being rebuilt/i.test(detail);
      if(transient&&verifiedSnapshot(snapshot)){
        console.warn(`::warning::${sport} ParlayAPI props are temporarily busy; preserving the last verified snapshot instead of failing the pricing path.`);
        await sanitizeSnapshot(cfg.slug);
        continue;
      }
      throw new Error(`${sport} basketball odds refresh exited ${run.status}`);
    }
    await sanitizeSnapshot(cfg.slug);
  }catch(error){failed=true;console.error(`::error::${sport} primary refresh failed:`,error?.stack||error);}
}
if(failed)process.exit(1);
