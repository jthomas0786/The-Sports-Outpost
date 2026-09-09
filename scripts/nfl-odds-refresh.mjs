#!/usr/bin/env node
/**
 * NFL odds refresh for The Sports Outpost.
 * Source: ParlayAPI REST (server-side only; never expose PARLAY_API_KEY in browser code).
 *
 * Produces slates/nfl-odds.json in the shape already consumed by
 * sports/nfl-research-ui.js, plus gameLines for the NFL Slate.
 *
 * Credit control:
 * - GET /events is free and is used as the gate.
 * - When a kickoff is within the next 24h, one /props call (3 credits) and one
 *   /odds call for h2h/spreads/totals (3 credits) are made.
 * - Existing output throttles paid calls: every 4h >6h pregame, hourly inside
 *   6h, every 20m inside 90m. Manual NFL_ODDS_FORCE=1 bypasses the throttle.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SLATE_PATH = path.join(ROOT, 'slates', 'nfl.json');
const OUT_PATH = path.join(ROOT, 'slates', 'nfl-odds.json');
const API = process.env.PARLAY_API_BASE || 'https://parlay-api.com/v1';
const SPORT = 'americanfootball_nfl';
const KEY = process.env.PARLAY_API_KEY || '';
const FORCE = process.env.NFL_ODDS_FORCE === '1' || process.argv.includes('--force');
const NOW = Date.now();
const HOUR = 3600_000;

if (!KEY) {
  console.error('::error::PARLAY_API_KEY is missing. Add it as a GitHub Actions secret.');
  process.exit(2);
}

const MARKET_MAP = {
  player_anytime_td: 'atd',
  player_first_td: 'firstTd',
  player_rush_yds: 'rushYds',
  player_rec_yds: 'recYds',
  player_receptions: 'receptions',
  player_pass_yds: 'passYds',
  player_pass_tds: 'passTds',
  player_pass_completions: 'completions',
};
const API_MARKETS = Object.keys(MARKET_MAP);
const CORE = Object.values(MARKET_MAP);
const SPORTSBOOK_KEYS = new Set(['draftkings','fanduel','caesars','bovada','betmgm','fanatics','pinnacle','fliff','bet365','betrivers','hardrock','hardrockbet','parx','parxcasino','pmu','unibet','betriversca','sportsbetau','rushbet','espnbet']);
const isNonSportsbook = r => !SPORTSBOOK_KEYS.has(bookKey(r));

const TEAM_ABBR = new Map(Object.entries({
  'arizona cardinals':'ARI','atlanta falcons':'ATL','baltimore ravens':'BAL','buffalo bills':'BUF',
  'carolina panthers':'CAR','chicago bears':'CHI','cincinnati bengals':'CIN','cleveland browns':'CLE',
  'dallas cowboys':'DAL','denver broncos':'DEN','detroit lions':'DET','green bay packers':'GB',
  'houston texans':'HOU','indianapolis colts':'IND','jacksonville jaguars':'JAX','kansas city chiefs':'KC',
  'las vegas raiders':'LV','los angeles chargers':'LAC','los angeles rams':'LA','miami dolphins':'MIA',
  'minnesota vikings':'MIN','new england patriots':'NE','new orleans saints':'NO','new york giants':'NYG',
  'new york jets':'NYJ','philadelphia eagles':'PHI','pittsburgh steelers':'PIT','san francisco 49ers':'SF',
  'seattle seahawks':'SEA','tampa bay buccaneers':'TB','tennessee titans':'TEN','washington commanders':'WAS',
}));
const ALIASES = new Map(Object.entries({
  'la rams':'LA','los angeles rams':'LA','washington':'WAS','washington football team':'WAS',
  'jacksonville':'JAX','san francisco':'SF','new england':'NE','seattle':'SEA',
}));

const normName = s => String(s ?? '').toLowerCase().replace(/\./g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const cleanBook = r => String(r?.bookmaker_title || r?.bookmaker || '').trim();
const bookKey = r => String(r?.bookmaker || r?.bookmaker_title || '').toLowerCase().replace(/[^a-z0-9]/g,'');
const finite = v => Number.isFinite(Number(v)) ? Number(v) : null;
const americanPrice = v => {
  const n=finite(v); if(n==null) return null;
  // Defensive normalization for cached/upstream decimal values. The request
  // below also explicitly asks ParlayAPI for American odds.
  if(Math.abs(n)>=100 || n<=-100) return Math.round(n);
  if(n>1 && n<100) return Math.round(n>=2 ? (n-1)*100 : -100/(n-1));
  return Math.round(n);
};
const teamAbbr = name => {
  const n = String(name ?? '').toLowerCase().trim();
  return TEAM_ABBR.get(n) || ALIASES.get(n) || String(name ?? '').toUpperCase().trim();
};
const pairKey = (a,b) => [a,b].sort().join('|');
const splitPlayerLabel = raw => {
  const text=String(raw??'').trim();
  const m=text.match(/^(.*?)\s*\(([A-Z]{2,4})\)\s*$/i);
  return m ? {name:m[1].trim(),team:teamAbbr(m[2])} : {name:text,team:null};
};

async function readJson(file, fallback=null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

async function fetchJson(url, auth=true) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 30_000);
  try {
    const res = await fetch(url, {
      signal: c.signal,
      headers: {
        accept: 'application/json',
        ...(auth ? {'X-API-Key': KEY} : {}),
      },
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${txt.slice(0,300)}`);
    return txt ? JSON.parse(txt) : null;
  } finally { clearTimeout(t); }
}

function paidRefreshMs(hoursToKick) {
  if (hoursToKick <= 1.5) return 20 * 60_000;
  if (hoursToKick <= 6) return 60 * 60_000;
  return 4 * HOUR;
}

function best(entries) {
  const good = entries.filter(e => Number.isFinite(e.price));
  if (!good.length) return null;
  return [...good].sort((a,b) => b.price - a.price || (b.ts||0)-(a.ts||0))[0];
}

function entry(row, side) {
  const price = finite(side === 'under' ? row.under_price : row.over_price);
  if (price == null) return null;
  return {
    book: cleanBook(row) || String(row.bookmaker || 'Sportsbook'),
    price,
    link: row.deep_link || row.link || row.url || null,
    ts: finite(row.last_update) || finite(row.last_update_ms) || NOW,
    ageSeconds: finite(row.age_seconds),
  };
}

function chooseLine(rows) {
  const byLine = new Map();
  for (const r of rows) {
    const line = finite(r.line);
    if (line == null) continue;
    const k = String(line);
    const rec = byLine.get(k) || {line,rows:[],books:new Set(),freshest:0};
    rec.rows.push(r);
    rec.books.add(bookKey(r));
    rec.freshest = Math.max(rec.freshest, finite(r.last_update)||finite(r.last_update_ms)||0);
    byLine.set(k,rec);
  }
  const choices = [...byLine.values()];
  if (!choices.length) return null;
  choices.sort((a,b) => b.books.size-a.books.size || b.freshest-a.freshest || a.line-b.line);
  return choices[0];
}

function parsePlayerMarket(rows, internalKey) {
  // Do not fall back to DFS/exchange quotes. A Novig exchange price is a real
  // market observation, but it is not a sportsbook ATD price and should never
  // be labeled as the site's 'best sportsbook' number.
  const source = rows.filter(r => !isNonSportsbook(r));
  if (!source.length) return null;
  if (internalKey === 'atd' || internalKey === 'firstTd') {
    const all = source.map(r => entry(r,'over')).filter(Boolean);
    const b = best(all);
    return b ? {best:b, all} : null;
  }
  const chosen = chooseLine(source);
  if (!chosen) return null;
  const overAll = chosen.rows.map(r=>entry(r,'over')).filter(Boolean);
  const underAll = chosen.rows.map(r=>entry(r,'under')).filter(Boolean);
  const ov = best(overAll), un = best(underAll);
  if (!ov && !un) return null;
  return {
    line: chosen.line,
    over: ov ? {best:ov,all:overAll} : null,
    under: un ? {best:un,all:underAll} : null,
  };
}

function blankMarketDiagnostics(){
  return Object.fromEntries(CORE.map(k=>[k,{
    rawRows:0,sportsbookRows:0,excludedRows:0,sportsbookSources:{},excludedSources:{}
  }]));
}
function bumpSource(bucket,name){
  const k=String(name||'Unknown').trim()||'Unknown';
  bucket[k]=(bucket[k]||0)+1;
}
function diagRow(diag, internal, row){
  const d=diag?.[internal]; if(!d) return;
  d.rawRows++;
  const source=cleanBook(row)||String(row?.bookmaker||'Unknown');
  if(isNonSportsbook(row)){ d.excludedRows++; bumpSource(d.excludedSources,source); }
  else { d.sportsbookRows++; bumpSource(d.sportsbookSources,source); }
}
function conciseSources(obj){
  const a=Object.entries(obj||{}).sort((x,y)=>y[1]-x[1]||x[0].localeCompare(y[0]));
  return a.length?a.map(([k,v])=>`${k}:${v}`).join(', '):'none';
}

function parseGameLines(event) {
  const books = event?.bookmakers || [];
  const rows = {h2h:[],spreads:[],totals:[]};
  for (const b of books) {
    const bk = String(b.key || b.title || '').toLowerCase();
    if (!SPORTSBOOK_KEYS.has(bk)) continue;
    for (const m of b.markets || []) {
      if (!rows[m.key]) continue;
      for (const o of m.outcomes || []) {
        rows[m.key].push({
          book:b.title||b.key||'Sportsbook', bookKey:b.key||null, name:o.name,
          price:americanPrice(o.price), point:finite(o.point), ts:b.last_update||m.last_update||null,
        });
      }
    }
  }
  const teamPrice = (market, team) => best(rows[market].filter(x=>String(x.name).toLowerCase()===String(team).toLowerCase()).map(x=>({...x,link:null})));
  const modePoint = (market, pred) => {
    const arr=rows[market].filter(pred).map(x=>x.point).filter(Number.isFinite);
    if(!arr.length) return null;
    const counts=new Map(); for(const x of arr) counts.set(x,(counts.get(x)||0)+1);
    return [...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
  };
  const home=event.home_team, away=event.away_team;
  const homeSpread=modePoint('spreads',x=>String(x.name).toLowerCase()===String(home).toLowerCase());
  const total=modePoint('totals',x=>/over/i.test(String(x.name)));
  const bestAt=(market,name,point)=>best(rows[market].filter(x=>String(x.name).toLowerCase()===String(name).toLowerCase()&&(point==null||x.point===point)).map(x=>({...x,link:null})));
  return {
    moneyline:{away:teamPrice('h2h',away),home:teamPrice('h2h',home)},
    spread:{line:homeSpread,home:bestAt('spreads',home,homeSpread),away:homeSpread==null?null:bestAt('spreads',away,-homeSpread)},
    total:{line:total,over:bestAt('totals','Over',total),under:bestAt('totals','Under',total)},
  };
}

function buildSlateIndex(slate) {
  const byPair = new Map();
  for (const g of slate?.games || []) {
    const away = String(g?.away?.abbr || '');
    const home = String(g?.home?.abbr || '');
    if (!away || !home) continue;
    const playerByName = new Map((g.players||[]).map(p=>[normName(p.name),p]));
    byPair.set(pairKey(away,home), {game:g,playerByName});
  }
  return byPair;
}

async function main() {
  await fs.mkdir(path.dirname(OUT_PATH), {recursive:true});
  const slate = await readJson(SLATE_PATH, {games:[]});
  const existing = await readJson(OUT_PATH, null);
  const slateIndex = buildSlateIndex(slate);

  // Event discovery is free. It prevents paid calls on days with no imminent NFL game.
  const from = new Date(NOW - 15*60_000).toISOString();
  const to = new Date(NOW + 24*HOUR).toISOString();
  const eventsUrl = `${API}/sports/${SPORT}/events?commenceTimeFrom=${encodeURIComponent(from)}&commenceTimeTo=${encodeURIComponent(to)}`;
  const allEvents = await fetchJson(eventsUrl);
  const relevant = (Array.isArray(allEvents)?allEvents:[]).filter(e=>{
    const t=Date.parse(e.commence_time||''); return Number.isFinite(t)&&t>=NOW-15*60_000&&t<=NOW+24*HOUR;
  });
  if (!relevant.length) {
    console.log('NFL odds: no kickoff in the next 24h; paid ParlayAPI calls skipped.');
    return;
  }

  const firstKick = Math.min(...relevant.map(e=>Date.parse(e.commence_time)));
  const hoursToKick = Math.max(0,(firstKick-NOW)/HOUR);
  const fetchedAt = Date.parse(existing?.meta?.fetchedAt || '');
  const age = Number.isFinite(fetchedAt) ? NOW-fetchedAt : Infinity;
  const refreshMs = paidRefreshMs(hoursToKick);
  const isLiveCurrent = existing?.meta?.source === 'parlayapi' && existing?.meta?.sample === false;
  if (!FORCE && isLiveCurrent && age < refreshMs) {
    console.log(`NFL odds: current file is ${Math.round(age/60000)}m old; next paid refresh threshold is ${Math.round(refreshMs/60000)}m. Skipping.`);
    return;
  }

  const propParams = new URLSearchParams({markets:API_MARKETS.join(','),limit:'10000',maxAgeSec:'3600'});
  const props = await fetchJson(`${API}/sports/${SPORT}/props?${propParams}`);
  const oddsParams = new URLSearchParams({regions:'us',markets:'h2h,spreads,totals',oddsFormat:'american',commenceTimeFrom:from,commenceTimeTo:to});
  const gameOdds = await fetchJson(`${API}/sports/${SPORT}/odds?${oddsParams}`);

  const eventById = new Map(relevant.map(e=>[String(e.canonical_event_id||e.id||''),e]));
  const gameOddsById = new Map((Array.isArray(gameOdds)?gameOdds:[]).map(e=>[String(e.canonical_event_id||e.id||''),e]));
  // Keep raw-vs-accepted counts per event/market. This lets us tell the
  // difference between "ParlayAPI did not return ATD" and "ATD exists only
  // at an exchange/DFS source that TSO intentionally refuses to label as a sportsbook."
  const diagnosticsByEvent = new Map([...eventById.keys()].map(id=>[id,blankMarketDiagnostics()]));
  const groups = new Map();
  for (const r of (Array.isArray(props)?props:[])) {
    const internal=MARKET_MAP[r.market_key];
    if (!internal) continue;
    const eid=String(r.canonical_event_id||r.event_id||'');
    if (!eventById.has(eid)) continue;
    diagRow(diagnosticsByEvent.get(eid),internal,r);
    const label=splitPlayerLabel(r.player||r.player_name);
    const pk=`${eid}|${normName(label.name)}`;
    const p=groups.get(pk)||{eventId:eid,name:label.name,teamHint:label.team,byMarket:new Map()};
    if(!p.teamHint && label.team) p.teamHint=label.team;
    const arr=p.byMarket.get(r.market_key)||[]; arr.push(r); p.byMarket.set(r.market_key,arr); groups.set(pk,p);
  }

  const outputGames=[];
  const books=new Set();
  for (const event of relevant) {
    const eid=String(event.canonical_event_id||event.id||'');
    const away=teamAbbr(event.away_team), home=teamAbbr(event.home_team);
    const slateRec=slateIndex.get(pairKey(away,home));
    const players=[];
    for (const p of groups.values()) {
      if (p.eventId!==eid) continue;
      const odds={};
      for (const [apiKey,rows] of p.byMarket) {
        for(const row of rows){if(!isNonSportsbook(row)){const b=cleanBook(row);if(b)books.add(b);}}
        const internal=MARKET_MAP[apiKey]; const parsed=parsePlayerMarket(rows,internal); if(parsed) odds[internal]=parsed;
      }
      if (!Object.keys(odds).length) continue;
      const slatePlayer=slateRec?.playerByName?.get(normName(p.name));
      players.push({name:slatePlayer?.name||p.name,playerId:slatePlayer?.id||slatePlayer?.espnId||null,team:slatePlayer?.team||p.teamHint||null,odds});
    }
    const markets=[...new Set(players.flatMap(p=>Object.keys(p.odds)))].sort();
    const go=gameOddsById.get(eid);
    outputGames.push({
      fixtureId:eid, gameId:slateRec?.game?.gameId||slateRec?.game?.id||null,
      away,home,awayName:event.away_team,homeName:event.home_team,
      startDateUTC:event.commence_time,status:'unplayed',venue:slateRec?.game?.venue||null,
      matchKey:`${away}-${home}`,markets,players,gameLines:go?parseGameLines(go):null,
      marketDiagnostics:diagnosticsByEvent.get(eid)||blankMarketDiagnostics(),
    });
  }

  // Persist and print diagnostics so a missing market can be debugged from a
  // workflow log without exposing the API key or dumping the paid raw payload.
  for(const g of outputGames){
    console.log(`[odds diagnostic] ${g.away} @ ${g.home}`);
    for(const k of CORE){
      const d=g.marketDiagnostics?.[k]||{};
      console.log(`  ${k}: raw=${d.rawRows||0} sportsbook=${d.sportsbookRows||0} excluded=${d.excludedRows||0} | books=${conciseSources(d.sportsbookSources)} | excludedSources=${conciseSources(d.excludedSources)}`);
    }
  }

  const result={
    meta:{source:'parlayapi',sportKey:SPORT,books:[...books].sort(),markets:CORE,fetchedAt:new Date().toISOString(),sample:false,creditsEstimated:6,windowHours:24,diagnosticsVersion:1,note:'Live NFL game lines + player props from ParlayAPI. Sportsbook rows only for player cards; DFS/exchange rows are excluded from displayed best prices.'},
    games:outputGames.sort((a,b)=>String(a.startDateUTC).localeCompare(String(b.startDateUTC))),
  };
  if (!result.games.length) throw new Error('ParlayAPI returned data but no relevant NFL events could be normalized. Refusing to overwrite.');
  const text=JSON.stringify(result,null,2)+'\n';
  if (/\b(?:NaN|Infinity)\b/.test(text)) throw new Error('Non-finite value detected; refusing to write nfl-odds.json.');
  await fs.writeFile(OUT_PATH,text);
  const pc=result.games.reduce((n,g)=>n+g.players.length,0);
  console.log(`NFL odds: wrote ${result.games.length} game(s), ${pc} player(s), markets=${[...new Set(result.games.flatMap(g=>g.markets))].join(',')||'none'} -> ${path.relative(ROOT,OUT_PATH)}`);
}

main().catch(err=>{console.error('NFL odds refresh failed:',err);process.exitCode=1;});
