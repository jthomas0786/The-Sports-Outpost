#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API = process.env.PARLAY_API_BASE || 'https://parlay-api.com/v1';
const KEY = process.env.PARLAY_API_KEY || '';
const NOW = Date.now();
const PRESERVE_QUOTE_MAX_AGE_MS = 36 * 3600_000;
const PRESERVE_AFTER_START_MS = 30 * 60_000;
const LEAGUES = {
  NBA: { sportKey:'basketball_nba', slug:'nba' },
  NCAAB: { sportKey:'basketball_ncaab', slug:'ncaab' },
  WNBA: { sportKey:'basketball_wnba', slug:'wnba' }
};
const MARKET_KEYS = [
  'player_points','player_points_alt','player_points_alternate',
  'player_rebounds','player_rebounds_alt','player_rebounds_alternate',
  'player_assists','player_assists_alt','player_assists_alternate',
  'player_threes','player_threes_alt','player_threes_alternate','player_three_pointers','player_three_pointers_made','player_threes_made',
  'player_steals','player_blocks','player_turnovers',
  'player_points_rebounds_assists','player_points_rebounds','player_points_assists','player_rebounds_assists',
  'player_pra','player_pts_rebs_asts','player_pts_rebs','player_pts_asts','player_rebs_asts',
  'player_double_double','player_triple_double'
];
const MARKET_MAP = new Map([
  ['player_points','points'],['player_points_alt','points'],['player_points_alternate','points'],
  ['player_rebounds','rebounds'],['player_rebounds_alt','rebounds'],['player_rebounds_alternate','rebounds'],
  ['player_assists','assists'],['player_assists_alt','assists'],['player_assists_alternate','assists'],
  ['player_threes','threes'],['player_threes_alt','threes'],['player_threes_alternate','threes'],['player_three_pointers','threes'],['player_three_pointers_made','threes'],['player_threes_made','threes'],
  ['player_steals','steals'],['player_blocks','blocks'],['player_turnovers','turnovers'],
  ['player_points_rebounds_assists','pra'],['player_pts_rebs_asts','pra'],['player_pra','pra'],
  ['player_points_rebounds','ptsRebs'],['player_pts_rebs','ptsRebs'],
  ['player_points_assists','ptsAsts'],['player_pts_asts','ptsAsts'],
  ['player_rebounds_assists','rebsAsts'],['player_rebs_asts','rebsAsts'],
  ['player_double_double','doubleDouble'],['player_triple_double','tripleDouble']
]);
const BINARY_MARKETS = new Set(['doubleDouble','tripleDouble']);
const SPORTSBOOK_KEYS = new Set(['draftkings','fanduel','caesars','betmgm','fanatics','pinnacle','bet365','betrivers','hardrock','parx','bovada']);
const SPORTSBOOK_QUERY = [...SPORTSBOOK_KEYS].join(',');

if (!KEY) { console.error('::error::PARLAY_API_KEY is missing.'); process.exit(2); }
const finite = v => v===null||v===undefined||v==='' ? null : (Number.isFinite(Number(v)) ? Number(v) : null);
const iso = v => { const t=Date.parse(String(v||'')); return Number.isFinite(t)?new Date(t).toISOString():null; };
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const bookKey = r => String(r?.bookmaker || r?.bookmaker_title || r?.source || r?.source_title || r?.bookKey || '').toLowerCase().replace(/[^a-z0-9]/g,'');
const bookTitle = r => String(r?.bookmaker_title || r?.source_title || r?.bookmaker || r?.source || r?.book || 'Sportsbook').trim();
function arrayPayload(payload){ return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[]; }
function plausiblePlayerName(value){
  const name=String(value||'').trim();
  if(!name||name.length<3||name.length>80)return false;
  if(/\b(or\s+(?:more|less)|team\s+total|1q|1h|first\s+(?:quarter|half)|second\s+half|game\s+total)\b/i.test(name))return false;
  if(/^\d/.test(name)||/^[+\-]?\d+(?:\.\d+)?$/.test(name))return false;
  const words=name.match(/[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.'’\-]*/g)||[];
  return words.length>=2;
}
function nativeSideObject(row,side){
  const aliases=side==='over'?['over','yes','more','higher']:['under','no','less','lower'];
  const containers=[row?.selection_by_side,row?.selectionBySide,row?.native_selection_by_side,row?.nativeSelectionBySide,row?.links_by_side,row?.linksBySide,row?.betslip_links,row?.betslipLinks,row?.links];
  for(const container of containers){
    if(!container||typeof container!=='object')continue;
    for(const key of aliases){if(container[key]!=null)return container[key];}
  }
  return null;
}
function nativeSideLink(row,side){
  const aliases=side==='over'?['over','yes']:['under','no'];
  for(const key of aliases){
    const upper=key[0].toUpperCase()+key.slice(1);
    const direct=[row?.[`${key}_link`],row?.[`${key}Link`],row?.[`${key}_url`],row?.[`${key}Url`],row?.[`link${upper}`],row?.[`url${upper}`]];
    const value=direct.find(v=>typeof v==='string'&&/^https:\/\//i.test(v));
    if(value)return value;
  }
  const entry=nativeSideObject(row,side);
  if(typeof entry==='string'&&/^https:\/\//i.test(entry))return entry;
  if(entry&&typeof entry==='object'){
    const value=[entry.link,entry.url,entry.deep_link,entry.deepLink,entry.betslip_url,entry.betslipUrl].find(v=>typeof v==='string'&&/^https:\/\//i.test(v));
    if(value)return value;
  }
  return null;
}
function nativeSideSid(row,side){
  const aliases=side==='over'?['over','yes']:['under','no'];
  for(const key of aliases){
    const upper=key[0].toUpperCase()+key.slice(1);
    const direct=[row?.[`${key}_sid`],row?.[`${key}Sid`],row?.[`sid${upper}`],row?.[`${key}_selection_id`],row?.[`${key}SelectionId`]];
    const value=direct.find(v=>v!==null&&v!==undefined&&String(v).trim());
    if(value!=null)return String(value);
  }
  const entry=nativeSideObject(row,side);
  if(entry&&typeof entry==='object'){
    const value=[entry.sid,entry.selection_id,entry.selectionId,entry.id].find(v=>v!==null&&v!==undefined&&String(v).trim());
    if(value!=null)return String(value);
  }
  return null;
}
async function fetchJson(url,{attempts=4}={}){
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),45_000);
    try{
      const res=await fetch(url,{headers:{accept:'application/json','X-API-Key':KEY},signal:controller.signal});
      const text=await res.text();
      if(res.ok)return text?JSON.parse(text):null;
      const retryable=[429,500,502,503,504].includes(res.status);
      lastError=new Error(`${res.status} ${res.statusText}: ${text.slice(0,500)}`);
      if(!retryable||attempt===attempts)throw lastError;
      const retryAfter=Number(res.headers?.get?.('retry-after'));
      const delay=Number.isFinite(retryAfter)&&retryAfter>0?retryAfter*1000:Math.min(8000,1000*(2**(attempt-1)));
      console.warn(`ParlayAPI request returned ${res.status}; retrying in ${delay}ms (attempt ${attempt}/${attempts}).`);
      await sleep(delay);
    }catch(error){
      lastError=error;
      if(attempt===attempts)throw error;
      const message=String(error?.message||'');
      if(!/\b(?:429|500|502|503|504)\b|abort|fetch/i.test(message))throw error;
      const delay=Math.min(8000,1000*(2**(attempt-1)));
      console.warn(`ParlayAPI request failed transiently; retrying in ${delay}ms (attempt ${attempt}/${attempts}).`);
      await sleep(delay);
    }finally{
      clearTimeout(timer);
    }
  }
  throw lastError||new Error('ParlayAPI request failed.');
}
function marketInfo(key,row){
  const market=MARKET_MAP.get(key); if(!market)return null;
  if(BINARY_MARKETS.has(market)) return {market,line:0.5,binary:true};
  const line=finite(row?.line); if(line==null)return null;
  return {market,line,binary:false};
}
function quoteIdentity(row){
  return [String(row?.eventId||''),String(row?.player||'').trim().toLowerCase(),String(row?.market||''),String(row?.line??''),String(row?.bookKey||bookKey(row)||'')].join('|');
}
async function previousSnapshotRows(out){
  try{
    const parsed=JSON.parse(await fs.readFile(out,'utf8'));
    return Array.isArray(parsed?.rows)?parsed.rows:[];
  }catch{return [];}
}
function appendLastVerifiedRows(rows,previousRows){
  const known=new Set(rows.map(quoteIdentity));
  let preserved=0;
  for(const old of previousRows){
    const key=quoteIdentity(old);
    if(!key||known.has(key))continue;
    const start=Date.parse(old?.commenceTime||'');
    const snap=Date.parse(old?.snapshotTime||'');
    if(!Number.isFinite(start)||start<NOW-PRESERVE_AFTER_START_MS)continue;
    if(Number.isFinite(snap)&&NOW-snap>PRESERVE_QUOTE_MAX_AGE_MS)continue;
    if(finite(old?.overPrice)==null&&finite(old?.underPrice)==null)continue;
    rows.push({...old,preserved:true,priceKind:'last-verified-pregame',preservedAt:new Date(NOW).toISOString()});
    known.add(key);preserved++;
  }
  return preserved;
}
async function refreshLeague(sport){
  const cfg=LEAGUES[sport];
  const out=path.join(process.cwd(),'slates',`${cfg.slug}-odds.json`);
  const previousRows=await previousSnapshotRows(out);
  const from=new Date(NOW-24*3600_000).toISOString();
  const to=new Date(NOW+7*24*3600_000).toISOString();
  const eventParams=new URLSearchParams({commenceTimeFrom:from,commenceTimeTo:to});
  const events=arrayPayload(await fetchJson(`${API}/sports/${cfg.sportKey}/events?${eventParams}`));
  const relevant=events.filter(e=>{const t=Date.parse(e?.commence_time||'');return Number.isFinite(t)&&t>NOW-12*3600_000;});
  let rawRows=[];
  if(relevant.length){
    const propParams=new URLSearchParams({markets:MARKET_KEYS.join(','),bookmakers:SPORTSBOOK_QUERY,limit:'10000',maxAgeSec:'3600',includeLinks:'true',includeSids:'true'});
    rawRows=arrayPayload(await fetchJson(`${API}/sports/${cfg.sportKey}/props?${propParams}`));
  }
  const rows=[],rawMarketKeys=new Set(),rawBooks=new Set();
  let rejectedNonPlayers=0,nativeLinkRows=0,nativeSidRows=0;
  for(const r of rawRows){
    const marketRaw=String(r?.market_key||r?.market||'').trim(); rawMarketKeys.add(marketRaw);
    const bk=bookKey(r); if(bk)rawBooks.add(bk);
    const info=marketInfo(marketRaw,r),player=String(r?.player_name||r?.player||'').trim();
    const period=String(r?.period||'FULL').toUpperCase();
    if(!info||!player||!SPORTSBOOK_KEYS.has(bk)||!['FULL','UNKNOWN',''].includes(period))continue;
    if(!plausiblePlayerName(player)){rejectedNonPlayers++;continue;}
    const overPrice=finite(r?.over_price??r?.yes_price),underPrice=finite(r?.under_price??r?.no_price);
    if(overPrice==null&&underPrice==null)continue;
    const overLink=nativeSideLink(r,'over'),underLink=nativeSideLink(r,'under');
    const overSid=nativeSideSid(r,'over'),underSid=nativeSideSid(r,'under');
    if(overLink||underLink)nativeLinkRows++;
    if(overSid||underSid)nativeSidRows++;
    rows.push({
      eventId:String(r?.canonical_event_id||r?.event_id||''),sport,commenceTime:iso(r?.commence_time),
      homeTeam:String(r?.home_team||'').trim()||null,awayTeam:String(r?.away_team||'').trim()||null,
      player,team:String(r?.team||r?.player_team||'').trim()||null,
      market:info.market,marketKey:marketRaw,line:info.line,binary:info.binary,period,
      book:bookTitle(r),bookKey:bk,overPrice,underPrice,
      overImplied:finite(r?.over_implied_prob),underImplied:finite(r?.under_implied_prob),
      overLink,underLink,overSid,underSid,
      deepLink:r?.deep_link||r?.link||r?.url||null,
      snapshotTime:iso(r?.snapshot_time||r?.last_update||r?.updated_at),
      preserved:false,priceKind:'verified-snapshot'
    });
  }
  const preservedRows=appendLastVerifiedRows(rows,previousRows);
  rows.sort((a,b)=>(a.commenceTime||'').localeCompare(b.commenceTime||'')||a.player.localeCompare(b.player)||a.market.localeCompare(b.market)||a.line-b.line||a.book.localeCompare(b.book));
  const books=[...new Set(rows.map(r=>r.book).filter(Boolean))].sort();
  const markets=[...new Set(rows.map(r=>r.market).filter(Boolean))].sort();
  const eventPreview=relevant.slice(0,12).map(e=>({eventId:String(e?.canonical_event_id||e?.id||''),commenceTime:iso(e?.commence_time),awayTeam:e?.away_team||null,homeTeam:e?.home_team||null}));
  const output={meta:{
    source:'parlayapi',sample:false,sport,sportKey:cfg.sportKey,fetchedAt:new Date().toISOString(),queryWindow:{from,to},
    eventsFound:events.length,relevantEvents:relevant.length,eventPreview,rawRows:rawRows.length,sportsbookRows:rows.length,currentRows:rows.length-preservedRows,preservedRows,rejectedNonPlayers,nativeLinkRows,nativeSidRows,
    nativeMetadataRequested:{includeLinks:true,includeSids:true},
    books,rawBooks:[...rawBooks].sort(),markets,rawMarketKeys:[...rawMarketKeys].filter(Boolean).sort(),
    noCurrentProps:rawRows.length===0,
    probabilityPolicy:'Two-sided sportsbook prices may be de-vigged by ParlayPing. Single-sided prices remain market-implied and are never labeled as a proprietary model.',
    preservationPolicy:'If an exact sportsbook player-prop quote disappears before game time, retain its last verified pregame price for up to 36 hours and no later than 30 minutes after scheduled start.',
    note:`Current ${sport} player props from ParlayAPI. Non-player selections are filtered. Native sportsbook selection metadata is preserved when the provider supplies it. Missing exact pregame rows may retain their last verified price; prices are never invented.`
  },rows};
  await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(output,null,2)+'\n');
  console.log(`${sport} odds: events=${events.length}, relevant=${relevant.length}, rawProps=${rawRows.length}, sportsbookRows=${rows.length}, preserved=${preservedRows}, nativeLinks=${nativeLinkRows}, nativeSids=${nativeSidRows}, rejectedNonPlayers=${rejectedNonPlayers}, books=${books.length}.`);
}

async function main(){
  const requested=process.argv.slice(2).map(x=>String(x).toUpperCase()).filter(x=>LEAGUES[x]);
  const sports=requested.length?[...new Set(requested)]:Object.keys(LEAGUES);
  for(const sport of sports){
    try{await refreshLeague(sport);}catch(error){console.error(`::error::${sport} odds refresh failed:`,error?.stack||error);process.exitCode=1;}
  }
}
await main();
