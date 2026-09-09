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
    const gamePrices=games.flatMap(g=>[
      g.gameLines?.moneyline?.away?.price,g.gameLines?.moneyline?.home?.price,
      g.gameLines?.spread?.away?.price,g.gameLines?.spread?.home?.price,
      g.gameLines?.total?.over?.price,g.gameLines?.total?.under?.price,
    ]).map(Number).filter(Number.isFinite);
    const decimalLeak=gamePrices.filter(x=>x>1&&x<100);
    decimalLeak.length?fail(`Game odds still contain decimal prices (${decimalLeak.slice(0,4).join(', ')})`):pass('Game odds are normalized to American prices');
    const exchange=/^(novig|novig exchange|kalshi|polymarket|sporttrade|prophetx|prizepicks|underdog(?: fantasy)?|betr|sleeper|pick6|draftkings pick6)$/i;
    const bad=[];
    for(const g of games) for(const p of g.players||[]) for(const [market,slot] of Object.entries(p.odds||{})){
      const offers=[];
      if(slot?.best) offers.push(slot.best);
      if(Array.isArray(slot?.all)) offers.push(...slot.all);
      if(slot?.over?.best) offers.push(slot.over.best);
      if(Array.isArray(slot?.over?.all)) offers.push(...slot.over.all);
      if(slot?.under?.best) offers.push(slot.under.best);
      if(Array.isArray(slot?.under?.all)) offers.push(...slot.under.all);
      for(const o of offers) if(exchange.test(String(o?.book||'').trim())) bad.push(`${p.name} ${market} ${o.book}`);
    }
    bad.length?fail(`Exchange/DFS quotes leaked into sportsbook odds (${[...new Set(bad)].slice(0,4).join(', ')})`):pass('Player odds contain sportsbook quotes only (no Novig/DFS/exchange)');
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
  preview.includes("fetch('./slates/nfl-odds.json'")?pass('NFL Slate/Props load the live sportsbook odds file'):fail('NFL Slate/Props are not loading nfl-odds.json');
  preview.includes('nflGradeRingHTML')?pass('MLB-style NFL grade progress rings are installed'):fail('NFL grade progress rings are missing');
  preview.includes('tdOddsHTML')?pass('TD Feed scorer odds are wired'):fail('TD Feed scorer odds are not wired');
  preview.includes('nflKickoffDateLabel')?pass('NFL Slate kickoff weekday/date labels are wired'):fail('NFL Slate kickoff date labels are missing');
  preview.includes('nflKickoffTimeLabel')&&preview.includes('timeZoneName')?pass('Kickoff time uses viewer-local timezone abbreviation'):fail('Viewer-local kickoff timezone label is missing');
  preview.includes('gameOddsPanelHTML')?pass('Themed Game Odds panel is installed on NFL Slate'):fail('NFL Slate Game Odds panel is missing');
  preview.includes('nflMlbPropSelect')?pass('NFL Props market uses the MLB-style dropdown'):fail('NFL Props dropdown is missing');
  preview.includes('atdWagerButtonHTML')?pass('NFL ATD Add-to-Slip controls are installed'):fail('NFL ATD Add-to-Slip controls are missing');
  /projected rush yds|projected rec yds|projected completions/i.test(preview)?warn('Legacy deterministic prop preview strings still exist'):pass('Legacy deterministic non-TD prop preview values removed');
}

const indexHtml=await fs.readFile('index.html','utf8').catch(()=>null);
if(indexHtml){
  indexHtml.includes("sport==='nfl' && market==='ATD'")?pass('Point wager panel accepts NFL ATD legs'):fail('Point wager panel is still HR-only');
}
const settlement=await fs.readFile('settle-wagers.js','utf8').catch(()=>null);
if(settlement){
  settlement.includes('decideNflAtd')?pass('NFL ATD settlement is installed'):fail('NFL ATD settlement is missing');
}
const wagerMigration=await fs.readFile('supabase/migrations/20260909033000_enable_nfl_atd_wagers.sql','utf8').catch(()=>null);
if(wagerMigration){
  wagerMigration.includes("v_leg_market := 'ATD'")?pass('NFL ATD wager database migration is present'):fail('NFL ATD wager migration is incomplete');
}else warn('NFL ATD wager migration file is not present locally');

const liveJs=await fs.readFile('sports/nfl/live.js','utf8').catch(()=>null);
if(liveJs&&liveJs.includes('supabase.co/functions/v1/nfl-live'))
  pass('Browser live poller is wired to Supabase Edge endpoint');
else fail('Browser live poller is not wired to Supabase Edge endpoint');

console.log(`\nNFL GAMEDAY CHECK: ${fails?'FAIL':'PASS'} · ${fails} failure(s) · ${warns} warning(s)`);
process.exitCode=fails?1:0;
