#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API = process.env.PARLAY_API_BASE || 'https://parlay-api.com/v1';
const SPORT = 'americanfootball_ncaaf';
const KEY = process.env.PARLAY_API_KEY || '';
const OUT = path.join(process.cwd(), 'slates', 'ncaaf-odds.json');
const NOW = Date.now();
const MARKET_KEYS = [
  'player_rec_yds','player_reception_yds','player_receiving_yds','player_receiving_yards',
  'player_rush_yds','player_rushing_yards','player_pass_yds','player_passing_yards',
  'player_receptions','player_pass_tds','player_passing_tds','player_pass_completions',
  'player_anytime_td','player_anytime_touchdown_scorer',
  'player_receiving_yards_milestones_20_or_more','player_receiving_yards_milestones_30_or_more',
  'player_receiving_yards_milestones_40_or_more','player_receiving_yards_milestones_50_or_more',
  'player_receiving_yards_milestones_60_or_more','player_receiving_yards_milestones_70_or_more',
  'player_receiving_yards_milestones_80_or_more','player_receiving_yards_milestones_90_or_more',
  'player_receiving_yards_milestones_100_or_more'
];
const MARKET_MAP = new Map([
  ['player_rec_yds','recYds'],['player_reception_yds','recYds'],['player_receiving_yds','recYds'],['player_receiving_yards','recYds'],
  ['player_rush_yds','rushYds'],['player_rushing_yards','rushYds'],['player_pass_yds','passYds'],['player_passing_yards','passYds'],
  ['player_receptions','receptions'],['player_pass_tds','passTds'],['player_passing_tds','passTds'],['player_pass_completions','completions'],
  ['player_anytime_td','atd'],['player_anytime_touchdown_scorer','atd']
]);
const SPORTSBOOK_KEYS = new Set(['draftkings','fanduel','caesars','betmgm','fanatics','pinnacle','bet365','betrivers','hardrock','parx','bovada']);
const SPORTSBOOK_QUERY = [...SPORTSBOOK_KEYS].join(',');

if (!KEY) { console.error('::error::PARLAY_API_KEY is missing.'); process.exit(2); }
const finite = v => Number.isFinite(Number(v)) ? Number(v) : null;
const bookKey = r => String(r?.bookmaker || r?.bookmaker_title || r?.source || r?.source_title || '').toLowerCase().replace(/[^a-z0-9]/g,'');
const bookTitle = r => String(r?.bookmaker_title || r?.source_title || r?.bookmaker || r?.source || 'Sportsbook').trim();
const iso = v => { const t=Date.parse(String(v||'')); return Number.isFinite(t)?new Date(t).toISOString():null; };
function marketInfo(key,row){
  if(MARKET_MAP.has(key)) return {market:MARKET_MAP.get(key),line:MARKET_MAP.get(key)==='atd'?0.5:finite(row?.line),inclusive:false};
  const m=key.match(/^player_receiving_yards_milestones_(\d+)_or_more$/);
  if(m) return {market:'recYds',line:Number(m[1]),inclusive:true};
  return null;
}
async function fetchJson(url){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),45_000);
  try{
    const res=await fetch(url,{headers:{accept:'application/json','X-API-Key':KEY},signal:controller.signal});
    const text=await res.text(); if(!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0,500)}`);
    return text?JSON.parse(text):null;
  } finally { clearTimeout(timer); }
}
function arrayPayload(payload){ return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[]; }

async function main(){
  const from=new Date(NOW-24*3600_000).toISOString();
  const to=new Date(NOW+10*24*3600_000).toISOString();
  const eventsParams=new URLSearchParams({commenceTimeFrom:from,commenceTimeTo:to});
  const events=arrayPayload(await fetchJson(`${API}/sports/${SPORT}/events?${eventsParams}`));
  const upcoming=events.filter(e=>{const t=Date.parse(e?.commence_time||'');return Number.isFinite(t)&&t>NOW;});

  // Mirror the proven NFL collector request shape: explicit sportsbook sources,
  // high response cap, and freshness bound so DFS/exchange/stale rows do not
  // consume the payload or masquerade as current sportsbook prices.
  const propParams=new URLSearchParams({
    markets:MARKET_KEYS.join(','),
    bookmakers:SPORTSBOOK_QUERY,
    limit:'10000',
    maxAgeSec:'3600'
  });
  const payload=await fetchJson(`${API}/sports/${SPORT}/props?${propParams}`);
  const rawRows=arrayPayload(payload);
  const rows=[],books=new Set(),markets=new Set(),rawMarketKeys=new Set(),rawBooks=new Set();
  for(const r of rawRows){
    const marketRaw=String(r?.market_key||r?.market||'').trim(); rawMarketKeys.add(marketRaw);
    const bk=bookKey(r); if(bk) rawBooks.add(bk);
    const info=marketInfo(marketRaw,r),player=String(r?.player_name||r?.player||'').trim();
    const period=String(r?.period||'FULL').toUpperCase();
    if(!info||!player||!SPORTSBOOK_KEYS.has(bk)||!['FULL','UNKNOWN',''].includes(period)) continue;
    if(info.market!=='atd'&&!Number.isFinite(info.line)) continue;
    const overPrice=finite(r?.over_price??r?.yes_price),underPrice=finite(r?.under_price??r?.no_price);
    if(overPrice==null&&underPrice==null) continue;
    const book=bookTitle(r); books.add(book); markets.add(info.market);
    rows.push({
      eventId:String(r?.canonical_event_id||r?.event_id||''),sport:'NCAAF',commenceTime:iso(r?.commence_time),
      homeTeam:String(r?.home_team||'').trim()||null,awayTeam:String(r?.away_team||'').trim()||null,
      player,team:String(r?.team||r?.player_team||'').trim()||null,
      market:info.market,marketKey:marketRaw,line:info.line,inclusive:info.inclusive,period,
      book,bookKey:bk,overPrice,underPrice,
      overImplied:finite(r?.over_implied_prob),underImplied:finite(r?.under_implied_prob),
      deepLink:r?.deep_link||r?.link||r?.url||null,
      snapshotTime:iso(r?.snapshot_time||r?.last_update||r?.updated_at)
    });
  }
  rows.sort((a,b)=>(a.commenceTime||'').localeCompare(b.commenceTime||'')||a.player.localeCompare(b.player)||a.market.localeCompare(b.market)||a.line-b.line||a.book.localeCompare(b.book));
  const eventPreview=upcoming.slice(0,12).map(e=>({
    eventId:String(e?.canonical_event_id||e?.id||''),commenceTime:iso(e?.commence_time),awayTeam:e?.away_team||null,homeTeam:e?.home_team||null
  }));
  const output={meta:{
    source:'parlayapi',sample:false,sport:'NCAAF',sportKey:SPORT,fetchedAt:new Date().toISOString(),
    queryWindow:{from,to},eventsFound:events.length,upcomingEvents:upcoming.length,eventPreview,
    rawRows:rawRows.length,sportsbookRows:rows.length,books:[...books].sort(),rawBooks:[...rawBooks].sort(),
    markets:[...markets].sort(),rawMarketKeys:[...rawMarketKeys].filter(Boolean).sort(),
    noCurrentProps:rawRows.length===0,
    note:'Current NCAAF player props from ParlayAPI. Empty rows with upcomingEvents > 0 means no fresh sportsbook player-prop rows are currently published; it is not treated as a fake zero-probability market.'
  },rows};
  await fs.mkdir(path.dirname(OUT),{recursive:true}); await fs.writeFile(OUT,JSON.stringify(output,null,2)+'\n');
  console.log(`NCAAF odds: events=${events.length}, upcoming=${upcoming.length}, rawProps=${rawRows.length}, sportsbookRows=${rows.length}, books=${books.size}.`);
  if(!rawRows.length&&upcoming.length) console.warn('::warning::NCAAF has upcoming events but no fresh player-prop rows from ParlayAPI right now.');
}
main().catch(error=>{console.error('::error::NCAAF odds refresh failed:',error?.stack||error);process.exit(1);});
