#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API = process.env.PARLAY_API_BASE || 'https://parlay-api.com/v1';
const KEY = process.env.PARLAY_API_KEY || '';
const NOW = Date.now();
const LEAGUES = {
  NBA: { sportKey:'basketball_nba', slug:'nba' },
  NCAAB: { sportKey:'basketball_ncaab', slug:'ncaab' },
  WNBA: { sportKey:'basketball_wnba', slug:'wnba' }
};
const MARKET_KEYS = [
  'player_points','player_points_alt',
  'player_rebounds','player_rebounds_alt',
  'player_assists','player_assists_alt',
  'player_threes','player_threes_alt','player_three_pointers','player_three_pointers_made',
  'player_steals','player_blocks','player_turnovers',
  'player_pra','player_pts_rebs','player_pts_asts','player_rebs_asts',
  'player_double_double','player_triple_double'
];
const MARKET_MAP = new Map([
  ['player_points','points'],['player_points_alt','points'],
  ['player_rebounds','rebounds'],['player_rebounds_alt','rebounds'],
  ['player_assists','assists'],['player_assists_alt','assists'],
  ['player_threes','threes'],['player_threes_alt','threes'],['player_three_pointers','threes'],['player_three_pointers_made','threes'],
  ['player_steals','steals'],['player_blocks','blocks'],['player_turnovers','turnovers'],
  ['player_pra','pra'],['player_pts_rebs','ptsRebs'],['player_pts_asts','ptsAsts'],['player_rebs_asts','rebsAsts'],
  ['player_double_double','doubleDouble'],['player_triple_double','tripleDouble']
]);
const BINARY_MARKETS = new Set(['doubleDouble','tripleDouble']);
const SPORTSBOOK_KEYS = new Set(['draftkings','fanduel','caesars','betmgm','fanatics','pinnacle','bet365','betrivers','hardrock','parx','bovada']);
const SPORTSBOOK_QUERY = [...SPORTSBOOK_KEYS].join(',');

if (!KEY) { console.error('::error::PARLAY_API_KEY is missing.'); process.exit(2); }
const finite = v => Number.isFinite(Number(v)) ? Number(v) : null;
const iso = v => { const t=Date.parse(String(v||'')); return Number.isFinite(t)?new Date(t).toISOString():null; };
const bookKey = r => String(r?.bookmaker || r?.bookmaker_title || r?.source || r?.source_title || '').toLowerCase().replace(/[^a-z0-9]/g,'');
const bookTitle = r => String(r?.bookmaker_title || r?.source_title || r?.bookmaker || r?.source || 'Sportsbook').trim();
function arrayPayload(payload){ return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[]; }
function plausiblePlayerName(value){
  const name=String(value||'').trim();
  if(!name||name.length<3||name.length>80)return false;
  if(/\b(or\s+(?:more|less)|team\s+total|1q|1h|first\s+(?:quarter|half)|second\s+half|game\s+total)\b/i.test(name))return false;
  if(/^\d/.test(name)||/^[+\-]?\d+(?:\.\d+)?$/.test(name))return false;
  const words=name.match(/[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.'’\-]*/g)||[];
  return words.length>=2;
}
async function fetchJson(url){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),45_000);
  try{
    const res=await fetch(url,{headers:{accept:'application/json','X-API-Key':KEY},signal:controller.signal});
    const text=await res.text(); if(!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0,500)}`);
    return text?JSON.parse(text):null;
  } finally { clearTimeout(timer); }
}
function marketInfo(key,row){
  const market=MARKET_MAP.get(key); if(!market)return null;
  if(BINARY_MARKETS.has(market)) return {market,line:0.5,binary:true};
  const line=finite(row?.line); if(line==null)return null;
  return {market,line,binary:false};
}
async function refreshLeague(sport){
  const cfg=LEAGUES[sport];
  const from=new Date(NOW-24*3600_000).toISOString();
  const to=new Date(NOW+7*24*3600_000).toISOString();
  const eventParams=new URLSearchParams({commenceTimeFrom:from,commenceTimeTo:to});
  const events=arrayPayload(await fetchJson(`${API}/sports/${cfg.sportKey}/events?${eventParams}`));
  const relevant=events.filter(e=>{const t=Date.parse(e?.commence_time||'');return Number.isFinite(t)&&t>NOW-12*3600_000;});
  let rawRows=[];
  if(relevant.length){
    const propParams=new URLSearchParams({markets:MARKET_KEYS.join(','),bookmakers:SPORTSBOOK_QUERY,limit:'10000',maxAgeSec:'3600'});
    rawRows=arrayPayload(await fetchJson(`${API}/sports/${cfg.sportKey}/props?${propParams}`));
  }
  const rows=[],books=new Set(),markets=new Set(),rawMarketKeys=new Set(),rawBooks=new Set();
  let rejectedNonPlayers=0;
  for(const r of rawRows){
    const marketRaw=String(r?.market_key||r?.market||'').trim(); rawMarketKeys.add(marketRaw);
    const bk=bookKey(r); if(bk)rawBooks.add(bk);
    const info=marketInfo(marketRaw,r),player=String(r?.player_name||r?.player||'').trim();
    const period=String(r?.period||'FULL').toUpperCase();
    if(!info||!player||!SPORTSBOOK_KEYS.has(bk)||!['FULL','UNKNOWN',''].includes(period))continue;
    if(!plausiblePlayerName(player)){rejectedNonPlayers++;continue;}
    const overPrice=finite(r?.over_price??r?.yes_price),underPrice=finite(r?.under_price??r?.no_price);
    if(overPrice==null&&underPrice==null)continue;
    const book=bookTitle(r);books.add(book);markets.add(info.market);
    rows.push({
      eventId:String(r?.canonical_event_id||r?.event_id||''),sport,commenceTime:iso(r?.commence_time),
      homeTeam:String(r?.home_team||'').trim()||null,awayTeam:String(r?.away_team||'').trim()||null,
      player,team:String(r?.team||r?.player_team||'').trim()||null,
      market:info.market,marketKey:marketRaw,line:info.line,binary:info.binary,period,
      book,bookKey:bk,overPrice,underPrice,
      overImplied:finite(r?.over_implied_prob),underImplied:finite(r?.under_implied_prob),
      deepLink:r?.deep_link||r?.link||r?.url||null,
      snapshotTime:iso(r?.snapshot_time||r?.last_update||r?.updated_at)
    });
  }
  rows.sort((a,b)=>(a.commenceTime||'').localeCompare(b.commenceTime||'')||a.player.localeCompare(b.player)||a.market.localeCompare(b.market)||a.line-b.line||a.book.localeCompare(b.book));
  const eventPreview=relevant.slice(0,12).map(e=>({eventId:String(e?.canonical_event_id||e?.id||''),commenceTime:iso(e?.commence_time),awayTeam:e?.away_team||null,homeTeam:e?.home_team||null}));
  const output={meta:{
    source:'parlayapi',sample:false,sport,sportKey:cfg.sportKey,fetchedAt:new Date().toISOString(),queryWindow:{from,to},
    eventsFound:events.length,relevantEvents:relevant.length,eventPreview,rawRows:rawRows.length,sportsbookRows:rows.length,rejectedNonPlayers,
    books:[...books].sort(),rawBooks:[...rawBooks].sort(),markets:[...markets].sort(),rawMarketKeys:[...rawMarketKeys].filter(Boolean).sort(),
    noCurrentProps:rawRows.length===0,
    probabilityPolicy:'Two-sided sportsbook prices may be de-vigged by ParlayPing. Single-sided prices remain market-implied and are never labeled as a proprietary model.',
    note:`Current ${sport} player props from ParlayAPI. Non-player selections are filtered. Empty rows are treated as unavailable data, never as zero probability.`
  },rows};
  const out=path.join(process.cwd(),'slates',`${cfg.slug}-odds.json`);
  await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(output,null,2)+'\n');
  console.log(`${sport} odds: events=${events.length}, relevant=${relevant.length}, rawProps=${rawRows.length}, sportsbookRows=${rows.length}, rejectedNonPlayers=${rejectedNonPlayers}, books=${books.size}.`);
}

async function main(){
  const requested=process.argv.slice(2).map(x=>String(x).toUpperCase()).filter(x=>LEAGUES[x]);
  const sports=requested.length?[...new Set(requested)]:Object.keys(LEAGUES);
  for(const sport of sports){
    try{await refreshLeague(sport);}catch(error){console.error(`::error::${sport} odds refresh failed:`,error?.stack||error);process.exitCode=1;}
  }
}
await main();
