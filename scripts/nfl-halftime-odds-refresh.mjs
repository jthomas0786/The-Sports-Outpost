#!/usr/bin/env node
/**
 * v87 halftime sportsbook-prop refresh.
 *
 * This is intentionally separate from nfl-odds-refresh.mjs:
 * - the normal file remains a pregame/week product;
 * - this script only spends paid ParlayAPI credits when the low-latency feed
 *   says at least one game is actually at halftime;
 * - it searches events several hours BACK so a game that kicked off long ago
 *   can still be mapped to ParlayAPI's canonical event id.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { isHalftimeState } from '../sports/nfl/sim/auto.js';

const ROOT=process.cwd();
const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const KEY=process.env.PARLAY_API_KEY||'';
const LIVE_URL=process.env.NFL_LIVE_ENDPOINT||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
const SLATE=path.join(ROOT,'slates','nfl.json');
const OUT=path.join(ROOT,'slates','nfl-live-odds.json');
const SPORT='americanfootball_nfl';
const NOW=Date.now();
const MAX_AGE_SEC=Number(process.env.NFL_HALFTIME_ODDS_MAX_AGE_SEC||600);
const RETRY_LIMIT=Number(process.env.NFL_HALFTIME_ODDS_RETRY_LIMIT||3);
const GOOD_REFRESH_MIN=Number(process.env.NFL_HALFTIME_ODDS_REFRESH_MINUTES||8);

const MARKET_MAP={
  player_anytime_td:'atd',
  player_rush_yds:'rushYds',
  player_rec_yds:'recYds',
  player_receptions:'receptions',
  player_pass_yds:'passYds',
  player_pass_tds:'passTds',
  player_pass_completions:'completions',
  player_pass_interceptions:'interceptions',
};
const API_MARKETS=Object.keys(MARKET_MAP);
const SPORTSBOOK_KEYS=new Set(['draftkings','fanduel','caesars','bovada','betmgm','fanatics','pinnacle','fliff','bet365','betrivers','hardrock','hardrockbet','parx','parxcasino','pmu','unibet','betriversca','sportsbetau','rushbet','espnbet']);
const TEAM_ABBR=new Map(Object.entries({
  'arizona cardinals':'ARI','atlanta falcons':'ATL','baltimore ravens':'BAL','buffalo bills':'BUF',
  'carolina panthers':'CAR','chicago bears':'CHI','cincinnati bengals':'CIN','cleveland browns':'CLE',
  'dallas cowboys':'DAL','denver broncos':'DEN','detroit lions':'DET','green bay packers':'GB',
  'houston texans':'HOU','indianapolis colts':'IND','jacksonville jaguars':'JAX','kansas city chiefs':'KC',
  'las vegas raiders':'LV','los angeles chargers':'LAC','los angeles rams':'LA','miami dolphins':'MIA',
  'minnesota vikings':'MIN','new england patriots':'NE','new orleans saints':'NO','new york giants':'NYG',
  'new york jets':'NYJ','philadelphia eagles':'PHI','pittsburgh steelers':'PIT','san francisco 49ers':'SF',
  'seattle seahawks':'SEA','tampa bay buccaneers':'TB','tennessee titans':'TEN','washington commanders':'WAS',
}));
const ALIASES=new Map(Object.entries({'la rams':'LA','washington':'WAS','jacksonville':'JAX','san francisco':'SF','new england':'NE','seattle':'SEA'}));
const norm=s=>String(s??'').toLowerCase().replace(/\./g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const teamAbbr=n=>TEAM_ABBR.get(String(n??'').toLowerCase().trim())||ALIASES.get(String(n??'').toLowerCase().trim())||String(n??'').toUpperCase().trim();
const pair=(a,b)=>[String(a||'').toUpperCase(),String(b||'').toUpperCase()].sort().join('|');
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const bookKey=r=>String(r?.bookmaker||r?.bookmaker_title||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cleanBook=r=>String(r?.bookmaker_title||r?.bookmaker||'').trim();
const isSportsbook=r=>SPORTSBOOK_KEYS.has(bookKey(r));
const read=async(f,fallback=null)=>{try{return JSON.parse(await fs.readFile(f,'utf8'))}catch{return fallback}};
async function fetchJson(url,auth=true){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),30000);
  try{
    const r=await fetch(url,{signal:c.signal,headers:{accept:'application/json',...(auth?{'X-API-Key':KEY}:{})}});
    const txt=await r.text();
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}: ${txt.slice(0,240)}`);
    return txt?JSON.parse(txt):null;
  }finally{clearTimeout(t)}
}
async function fetchLive(){
  const r=await fetch(LIVE_URL,{headers:{accept:'application/json','cache-control':'no-cache'}});
  if(!r.ok) throw new Error(`NFL live ${r.status}`);
  return r.json();
}
function splitPlayer(raw){
  const text=String(raw??'').trim();
  const m=text.match(/^(.*?)\s*\(([A-Z]{2,4})\)\s*$/i);
  return m?{name:m[1].trim(),team:teamAbbr(m[2])}:{name:text,team:null};
}
function entry(row,side){
  const price=finite(side==='under'?row.under_price:row.over_price);
  if(price==null) return null;
  const ts=finite(row.last_update)||finite(row.last_update_ms)||NOW;
  return {book:cleanBook(row)||'Sportsbook',price,link:row.deep_link||row.link||row.url||null,ts,ageSeconds:finite(row.age_seconds)};
}
function best(arr){return [...arr].filter(x=>x&&Number.isFinite(x.price)).sort((a,b)=>b.price-a.price)[0]||null}
function chooseLine(rows){
  const by=new Map();
  for(const r of rows){
    const line=finite(r.line); if(line==null)continue;
    const rec=by.get(String(line))||{line,rows:[],books:new Set(),freshest:0};
    rec.rows.push(r);rec.books.add(bookKey(r));rec.freshest=Math.max(rec.freshest,finite(r.last_update)||finite(r.last_update_ms)||0);by.set(String(line),rec);
  }
  return [...by.values()].sort((a,b)=>b.books.size-a.books.size||b.freshest-a.freshest)[0]||null;
}
function parseMarket(rows,key){
  const source=rows.filter(isSportsbook);
  if(!source.length)return null;
  if(key==='atd'){
    const all=source.map(r=>entry(r,'over')).filter(Boolean),b=best(all);
    return b?{best:b,all}:null;
  }
  const c=chooseLine(source); if(!c)return null;
  const oa=c.rows.map(r=>entry(r,'over')).filter(Boolean),ua=c.rows.map(r=>entry(r,'under')).filter(Boolean);
  const ov=best(oa),un=best(ua);
  return (!ov&&!un)?null:{line:c.line,over:ov?{best:ov,all:oa}:null,under:un?{best:un,all:ua}:null};
}

async function main(){
  const slate=await read(SLATE,{games:[]});
  const live=await fetchLive();
  const atHalf=(slate.games||[]).filter(g=>isHalftimeState(live?.games?.[String(g.gameId||g.id)]));
  if(!atHalf.length){
    console.log('NFL halftime odds: no game is at halftime; paid ParlayAPI call skipped.');
    return;
  }
  if(!KEY) throw new Error('PARLAY_API_KEY missing while a game is at halftime');

  const existing=await read(OUT,null);
  const ids=atHalf.map(g=>String(g.gameId||g.id)).sort();
  const sameIds=JSON.stringify((existing?.meta?.gameIds||[]).map(String).sort())===JSON.stringify(ids);
  const ageMin=(NOW-Date.parse(existing?.meta?.fetchedAt||0))/60000;
  const coverage=Number(existing?.meta?.sportsbookPlayerCount||0);
  const attempts=Number(existing?.meta?.attempts||0);
  if(sameIds&&coverage>0&&ageMin<GOOD_REFRESH_MIN){
    console.log(`NFL halftime odds: usable cache ${Math.round(ageMin)}m old; paid refresh skipped.`);
    return;
  }
  if(sameIds&&coverage===0&&attempts>=RETRY_LIMIT){
    console.log(`NFL halftime odds: ${attempts} empty retries already attempted; paid refresh capped.`);
    return;
  }

  // Events are free. Search far enough backward to include games already in Q2.
  const from=new Date(NOW-6*3600_000).toISOString();
  const to=new Date(NOW+2*3600_000).toISOString();
  const events=await fetchJson(`${API}/sports/${SPORT}/events?commenceTimeFrom=${encodeURIComponent(from)}&commenceTimeTo=${encodeURIComponent(to)}`);
  const wantedPairs=new Map(atHalf.map(g=>[pair(g.away?.abbr,g.home?.abbr),g]));
  const relevant=(Array.isArray(events)?events:[]).filter(e=>wantedPairs.has(pair(teamAbbr(e.away_team),teamAbbr(e.home_team))));
  const eventIds=new Set(relevant.map(e=>String(e.canonical_event_id||e.id||'')));
  const params=new URLSearchParams({markets:API_MARKETS.join(','),limit:'10000',maxAgeSec:String(MAX_AGE_SEC)});
  const props=await fetchJson(`${API}/sports/${SPORT}/props?${params}`);

  const groups=new Map();
  let sportsbookRows=0;
  for(const r of (Array.isArray(props)?props:[])){
    if(!eventIds.has(String(r.canonical_event_id||r.event_id||'')))continue;
    const internal=MARKET_MAP[r.market_key]; if(!internal)continue;
    if(isSportsbook(r))sportsbookRows++;
    const pl=splitPlayer(r.player||r.player_name);
    const k=`${r.canonical_event_id||r.event_id}|${norm(pl.name)}`;
    const rec=groups.get(k)||{eventId:String(r.canonical_event_id||r.event_id||''),name:pl.name,teamHint:pl.team,markets:new Map()};
    const arr=rec.markets.get(r.market_key)||[];arr.push(r);rec.markets.set(r.market_key,arr);groups.set(k,rec);
  }

  const output=[];
  for(const e of relevant){
    const eid=String(e.canonical_event_id||e.id||''),away=teamAbbr(e.away_team),home=teamAbbr(e.home_team);
    const sg=wantedPairs.get(pair(away,home));
    const slatePlayers=new Map((sg?.players||[]).map(p=>[norm(p.name),p]));
    const players=[];
    for(const rec of groups.values()){
      if(rec.eventId!==eid)continue;
      const odds={};
      for(const [apiKey,rows] of rec.markets){
        const key=MARKET_MAP[apiKey],parsed=parseMarket(rows,key);
        if(parsed)odds[key]=parsed;
      }
      if(!Object.keys(odds).length)continue;
      const sp=slatePlayers.get(norm(rec.name));
      players.push({name:sp?.name||rec.name,playerId:sp?.id||sp?.espnId||null,team:sp?.team||rec.teamHint||null,odds});
    }
    output.push({
      fixtureId:eid,gameId:String(sg?.gameId||sg?.id||''),away,home,startDateUTC:e.commence_time,
      status:'halftime',markets:[...new Set(players.flatMap(p=>Object.keys(p.odds)))].sort(),players,
    });
  }
  const count=output.reduce((n,g)=>n+g.players.length,0);
  const nextAttempts=sameIds?(attempts+1):1;
  const payload={
    meta:{
      source:'parlayapi',mode:'halftime',sample:false,fetchedAt:new Date().toISOString(),
      gameIds:ids,maxAgeSec:MAX_AGE_SEC,creditsEstimated:3,attempts:nextAttempts,
      sportsbookRows,sportsbookPlayerCount:count,
      note:'v87 halftime-only player props. Paid call occurs only while a game is at halftime; sportsbook rows only.',
    },
    games:output,
  };
  await fs.mkdir(path.dirname(OUT),{recursive:true});
  await fs.writeFile(OUT,JSON.stringify(payload,null,2)+'\n');
  console.log(`✓ NFL halftime odds: ${output.length} game(s), ${count} sportsbook player(s), attempt ${nextAttempts} -> ${path.relative(ROOT,OUT)}`);
}
main().catch(e=>{console.error('NFL halftime odds refresh failed:',e);process.exitCode=1});
