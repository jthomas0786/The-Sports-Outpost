#!/usr/bin/env node
import fs from 'node:fs/promises';
import process from 'node:process';

const NFL_TZ='America/New_York';
const dateParts = new Intl.DateTimeFormat('en-CA',{
  timeZone:NFL_TZ, year:'numeric', month:'2-digit', day:'2-digit'
});
const nflDate = value => {
  const d=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(d.getTime())) return null;
  const parts=Object.fromEntries(dateParts.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const arg=(flag,fallback)=>{const i=process.argv.indexOf(flag);return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback};
const date=arg('--date',nflDate(new Date()));
const LIVE=process.env.NFL_LIVE_ENDPOINT||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
let fails=0,warns=0;
const pass=m=>console.log(`✓ ${m}`), warn=m=>{warns++;console.log(`⚠ ${m}`)}, fail=m=>{fails++;console.log(`✗ ${m}`)};
const read=async p=>{try{return JSON.parse(await fs.readFile(p,'utf8'))}catch(e){fail(`${p}: ${e.message}`);return null}};
const ageH=iso=>(Date.now()-Date.parse(iso||''))/3600000;
const gameDate = g => {
  if(g?.startTimeUTC || g?.startDateUTC) return nflDate(g.startTimeUTC || g.startDateUTC);
  return String(g?.date||'').slice(0,10) || null;
};

const slate=await read('slates/nfl.json');
const research=await read('slates/nfl-research.json');
const odds=await read('slates/nfl-odds.json');

if(slate){
  const games=(slate.games||[]).filter(g=>gameDate(g)===date);
  if(games.length) {
    pass(`NFL slate has ${games.length} game(s) for ${date} (${NFL_TZ})`);
    for(const g of games.slice(0,4)){
      const away=g?.away?.abbr||g?.away||'AWAY', home=g?.home?.abbr||g?.home||'HOME';
      pass(`Slate matchup: ${away} @ ${home}`);
    }
  } else fail(`NFL slate has no game for ${date} (${NFL_TZ})`);
  const players=games.reduce((n,g)=>n+(g.players||[]).length,0);
  players>=20?pass(`${players} modeled player rows on target game(s)`):warn(`Only ${players} modeled player rows on target game(s)`);
}

if(research){
  const h=ageH(research.generatedAt);
  Number.isFinite(h)&&h<=8?pass(`Research feed age ${h.toFixed(1)}h`):warn(`Research feed age ${Number.isFinite(h)?h.toFixed(1):'?'}h`);
}

if(odds){
  odds.meta?.source==='parlayapi'&&odds.meta?.sample===false
    ? pass('Odds source is live ParlayAPI, not sample data')
    : fail(`Odds source is ${odds.meta?.source||'unknown'} / sample=${odds.meta?.sample}`);
  const h=ageH(odds.meta?.fetchedAt);
  Number.isFinite(h)&&h<=6?pass(`Odds feed age ${h.toFixed(1)}h`):warn(`Odds feed age ${Number.isFinite(h)?h.toFixed(1):'?'}h`);
  const games=(odds.games||[]).filter(g=>gameDate(g)===date);
  if(!games.length) fail(`Odds file has no game for ${date} (${NFL_TZ})`);
  else {
    for(const g of games.slice(0,4)){
      pass(`Odds matchup: ${g.away||'AWAY'} @ ${g.home||'HOME'}`);
    }
    const markets=new Set(games.flatMap(g=>g.markets||[]));
    const count=games.reduce((n,g)=>n+(g.players||[]).length,0);
    count?pass(`${count} players have sportsbook props`):warn('Target game currently has no player prop rows');
    ['atd','rushYds','recYds','receptions','passYds','passTds','completions']
      .forEach(m=>markets.has(m)?pass(`market ${m}`):warn(`market ${m} not posted yet`));
    games.some(g=>g.gameLines?.moneyline||g.gameLines?.spread||g.gameLines?.total)
      ? pass('Game moneyline/spread/total present')
      : warn('Game lines not posted yet');
  }
}

try{
  const r=await fetch(LIVE,{headers:{accept:'application/json'}});
  const d=await r.json();
  if(!r.ok) fail(`NFL live endpoint HTTP ${r.status}`);
  else if(d?.schemaVersion===3&&d?.games&&Object.keys(d.games).length)
    pass(`NFL live endpoint healthy (${Object.keys(d.games).length} scoreboard games)`);
  else fail('NFL live endpoint response shape is invalid');
}catch(e){fail(`NFL live endpoint: ${e.message}`)}

const preview=await fs.readFile('sports/nfl-preview.js','utf8').catch(()=>null);
if(preview){
  /Preview feed\.|these scoring rows are illustrative/i.test(preview)
    ? fail('TD Feed still contains illustrative preview rows')
    : pass('TD Feed preview rows removed');
  /test game available for Gamecast preview/i.test(preview)
    ? fail('Production Live page still injects Test Game')
    : pass('Production Live page does not advertise/inject Test Game');
}

const liveJs=await fs.readFile('sports/nfl/live.js','utf8').catch(()=>null);
if(liveJs&&liveJs.includes('supabase.co/functions/v1/nfl-live'))
  pass('Browser live poller is wired to Supabase Edge endpoint');
else fail('Browser live poller is not wired to Supabase Edge endpoint');

console.log(`\nNFL GAMEDAY CHECK: ${fails?'FAIL':'PASS'} · ${fails} failure(s) · ${warns} warning(s)`);
process.exitCode=fails?1:0;
