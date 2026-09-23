#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT=process.cwd();
const SLATE_PATH=path.join(ROOT,'slate.json');
const OUT_PATH=path.join(ROOT,'slates','mlb-odds.json');
const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const SPORT='baseball_mlb';
const KEY=process.env.PARLAY_API_KEY||'';
const NOW=Date.now();
const HOUR=3600_000;
const FORCE=process.env.MLB_ODDS_FORCE==='1'||process.argv.includes('--force');
const SPORTSBOOK_KEYS=new Set(['draftkings','fanduel','caesars','betmgm','fanatics','pinnacle','bet365','betrivers','hardrock','parx','bovada']);
const SPORTSBOOK_QUERY=[...SPORTSBOOK_KEYS].join(',');

const MARKET_CANDIDATES=new Map([
  ['player_home_runs','homeRun'],['batter_home_runs','homeRun'],
  ['player_hits','hits'],['batter_hits','hits'],
  ['player_total_bases','totalBases'],['batter_total_bases','totalBases'],
  ['player_rbis','rbi'],['batter_rbis','rbi'],
  ['player_runs','runs'],['batter_runs_scored','runs'],
  ['player_hits_runs_rbis','hrr'],['batter_hits_runs_rbis','hrr'],
  ['player_singles','singles'],['batter_singles','singles'],
  ['player_doubles','doubles'],['batter_doubles','doubles'],
  ['player_triples','triples'],['batter_triples','triples'],
  ['player_walks','walks'],['player_bat_walks','walks'],['batter_walks','walks'],
  ['batter_strikeouts','batterStrikeouts'],
  ['player_stolen_bases','stolenBases'],['batter_stolen_bases','stolenBases'],
  ['pitcher_strikeouts','pitcherStrikeouts'],['player_strikeouts','pitcherStrikeouts'],
  ['player_pitcher_outs','pitchingOuts'],['pitcher_outs','pitchingOuts'],
  ['player_hits_allowed','hitsAllowed'],['pitcher_hits_allowed','hitsAllowed'],
  ['player_earned_runs','earnedRuns'],['pitcher_earned_runs','earnedRuns'],
  ['pitcher_walks','walksAllowed'],
  ['pitcher_home_runs_allowed','homeRunsAllowed'],
  ['pitcher_record_a_win','pitcherWin'],
]);

if(!KEY){console.error('::error::PARLAY_API_KEY is missing.');process.exit(2);}
const finite=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[.'’]/g,'').replace(/\b(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const compact=s=>norm(s).replace(/\s+/g,'');
const bookKey=r=>String(r?.bookmaker||r?.bookmaker_title||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const bookTitle=r=>String(r?.bookmaker_title||r?.bookmaker||'Sportsbook').trim();
const normalizedBookKey=row=>String(row?.bookKey||row?.book||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const iso=v=>{const t=typeof v==='number'?v:Date.parse(String(v||''));return Number.isFinite(t)?new Date(t).toISOString():null;};
const pairKey=(a,b)=>[compact(a),compact(b)].sort().join('|');

async function readJson(file,fallback=null){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return fallback;}}
async function fetchJson(url){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45_000);
  try{
    const res=await fetch(url,{headers:{accept:'application/json','X-API-Key':KEY},signal:controller.signal});
    const text=await res.text();if(!res.ok)throw new Error(`${res.status} ${res.statusText}: ${text.slice(0,800)}`);
    return {body:text?JSON.parse(text):null,headers:res.headers};
  }finally{clearTimeout(timer);}
}
function arrayPayload(payload){return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];}
function marketList(payload){
  const rows=arrayPayload(payload);
  if(rows.length)return new Set(rows.map(row=>String(typeof row==='string'?row:(row?.key||row?.market_key||row?.market||'')).trim()).filter(Boolean));
  const obj=payload&&typeof payload==='object'?payload:{};
  for(const key of ['markets','keys','data'])if(Array.isArray(obj[key]))return new Set(obj[key].map(row=>String(typeof row==='string'?row:(row?.key||row?.market_key||row?.market||'')).trim()).filter(Boolean));
  return new Set();
}
function buildSlateIndex(slate){
  const byPair=new Map();
  for(const game of slate?.games||[]){
    const away=game?.away?.name||game?.away?.abbr||'',home=game?.home?.name||game?.home?.abbr||'';
    if(!away||!home)continue;
    byPair.set(pairKey(away,home),game);
  }
  return byPair;
}
function officialGameFor(row,index){
  const direct=index.get(pairKey(row?.away_team,row?.home_team));if(direct)return direct;
  const rt=Date.parse(row?.commence_time||'');
  if(!Number.isFinite(rt))return null;
  return [...index.values()].find(game=>{
    const gt=Date.parse(game?.startTimeUTC||'');return Number.isFinite(gt)&&Math.abs(gt-rt)<=15*60_000;
  })||null;
}
function desiredRefreshMs(slate,existing){
  if(FORCE)return 0;
  const starts=(slate?.games||[]).map(g=>Date.parse(g?.startTimeUTC||'')).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!starts.length)return 4*HOUR;
  const future=starts.filter(t=>t>NOW);
  if(!future.length)return Infinity;
  const hours=(future[0]-NOW)/HOUR;
  if(hours<=2)return 30*60_000;
  if(hours<=8)return HOUR;
  return 4*HOUR;
}
function rowKey(row){return [row.eventId||'',norm(row.player),row.market,row.line??'null',normalizedBookKey(row),row.period||'FULL'].join('|');}
function currentSlatePairs(slate){return new Set((slate?.games||[]).map(g=>pairKey(g?.away?.name||g?.away?.abbr,g?.home?.name||g?.home?.abbr)).filter(Boolean));}
function keepExistingRow(row,slatePairs){
  if(!row||!row.player||!row.market)return false;
  const p=pairKey(row.awayTeam,row.homeTeam);return !p||slatePairs.has(p);
}
function compactRow(row){
  return {
    eventId:String(row?.eventId||''),
    providerEventId:String(row?.providerEventId||''),
    commenceTime:row?.commenceTime||null,
    homeTeam:row?.homeTeam||null,
    awayTeam:row?.awayTeam||null,
    player:row?.player||null,
    market:row?.market||null,
    line:finite(row?.line),
    period:row?.period||'FULL',
    book:row?.book||null,
    bookKey:normalizedBookKey(row),
    overPrice:finite(row?.overPrice),
    underPrice:finite(row?.underPrice),
    deepLink:row?.deepLink||null,
    snapshotTime:row?.snapshotTime||null,
    preserved:Boolean(row?.preserved),
  };
}

async function main(){
  const slate=await readJson(SLATE_PATH,{games:[]});
  const existing=await readJson(OUT_PATH,null);
  const refreshMs=desiredRefreshMs(slate,existing);
  const fetchedAt=Date.parse(existing?.meta?.fetchedAt||'');
  const age=Number.isFinite(fetchedAt)?NOW-fetchedAt:Infinity;
  if(!FORCE&&Number.isFinite(refreshMs)&&age<refreshMs){
    console.log(`MLB odds refresh not due; age=${Math.round(age/60000)}m threshold=${Math.round(refreshMs/60000)}m.`);return;
  }
  if(!FORCE&&refreshMs===Infinity){
    console.log('MLB odds: all current slate games have started; preserving last pregame snapshot.');return;
  }

  const discovered=await fetchJson(`${API}/sports/${SPORT}/props/markets`);
  const available=marketList(discovered.body);
  const requested=[];
  for(const key of MARKET_CANDIDATES.keys())if(available.has(key))requested.push(key);
  if(!requested.length){
    requested.push('player_home_runs','player_hits','player_total_bases','player_rbis','player_runs','player_hits_runs_rbis');
  }
  const params=new URLSearchParams({markets:requested.join(','),bookmakers:SPORTSBOOK_QUERY,limit:'10000',maxAgeSec:'3600'});
  const response=await fetchJson(`${API}/sports/${SPORT}/props?${params}`);
  const rawRows=arrayPayload(response.body);
  const slateIndex=buildSlateIndex(slate);
  const fresh=[];const books=new Set(),markets=new Set(),rawMarketKeys=new Set();
  for(const r of rawRows){
    const marketRaw=String(r?.market_key||r?.market||'').trim();rawMarketKeys.add(marketRaw);
    const market=MARKET_CANDIDATES.get(marketRaw);if(!market)continue;
    const bk=bookKey(r);if(!SPORTSBOOK_KEYS.has(bk))continue;
    const player=String(r?.player||r?.player_name||'').trim();if(!player)continue;
    const period=String(r?.period||'FULL').toUpperCase();if(!['FULL','UNKNOWN',''].includes(period))continue;
    const line=finite(r?.line);if(line==null)continue;
    const overPrice=finite(r?.over_price??r?.yes_price),underPrice=finite(r?.under_price??r?.no_price);
    if(overPrice==null&&underPrice==null)continue;
    const game=officialGameFor(r,slateIndex);
    const book=bookTitle(r);books.add(book);markets.add(market);
    fresh.push({
      eventId:game?.gamePk?String(game.gamePk):String(r?.canonical_event_id||r?.event_id||''),
      providerEventId:String(r?.canonical_event_id||r?.event_id||''),
      commenceTime:iso(r?.commence_time)||game?.startTimeUTC||null,
      homeTeam:String(r?.home_team||game?.home?.name||'').trim()||null,
      awayTeam:String(r?.away_team||game?.away?.name||'').trim()||null,
      player,market,line,period,book,bookKey:bk,overPrice,underPrice,
      deepLink:r?.deep_link||r?.link||r?.url||null,
      snapshotTime:iso(r?.snapshot_time||r?.last_update||r?.updated_at),
      preserved:false,
    });
  }

  const pairs=currentSlatePairs(slate),merged=new Map();
  for(const row of existing?.rows||[])if(keepExistingRow(row,pairs))merged.set(rowKey(row),compactRow({...row,preserved:true}));
  for(const row of fresh)merged.set(rowKey(row),compactRow(row));
  const rows=[...merged.values()].sort((a,b)=>(a.commenceTime||'').localeCompare(b.commenceTime||'')||String(a.player||'').localeCompare(String(b.player||''))||String(a.market||'').localeCompare(String(b.market||''))||Number(a.line)-Number(b.line)||String(a.book||'').localeCompare(String(b.book||'')));
  const output={meta:{
    source:'parlayapi',sample:false,sport:'MLB',sportKey:SPORT,fetchedAt:new Date().toISOString(),
    rawRows:rawRows.length,freshSportsbookRows:fresh.length,rows:rows.length,books:[...books].sort(),markets:[...markets].sort(),
    requestedMarketKeys:requested,rawMarketKeys:[...rawMarketKeys].filter(Boolean).sort(),
    creditsCost:response.headers.get('x-credits-cost')||null,
    note:'Verified MLB sportsbook prop prices from ParlayAPI. Preserved=true means the last verified pregame quote is retained after the live feed stops publishing that selection. ParlayAPI props do not currently expose sportsbook selection/deep-link IDs, so these rows are prices, not one-tap betslip URLs.'
  },rows};
  await fs.mkdir(path.dirname(OUT_PATH),{recursive:true});
  await fs.writeFile(OUT_PATH,JSON.stringify(output)+'\n');
  console.log(`MLB odds: raw=${rawRows.length}, fresh=${fresh.length}, retained=${rows.length}, books=${books.size}, markets=${markets.size}.`);
}
main().catch(error=>{console.error('::error::MLB odds refresh failed:',error?.stack||error);process.exit(1);});
