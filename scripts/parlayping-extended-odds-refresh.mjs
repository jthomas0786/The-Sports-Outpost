#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const KEY=process.env.PARLAY_API_KEY||'';
const SPORTSBOOK_KEYS=new Set(['draftkings','fanduel','caesars','betmgm','fanatics','pinnacle','bet365','betrivers','hardrock','parx','bovada']);
const BOOKMAKERS=[...SPORTSBOOK_KEYS].join(',');
const BINARY_KEYS=new Set(['player_moneyline','player_to_score_anytime','player_to_receive_a_card']);

const GROUPS={
  SOCCER:{
    file:'soccer-odds.json',
    sportKeys:['soccer_epl','soccer_spain_la_liga','soccer_germany_bundesliga','soccer_italy_serie_a','soccer_france_ligue_one','soccer_usa_mls'],
    markets:{
      player_shots:'shots',player_shots_on_target:'shotsOnTarget',player_assists:'assists',player_goals_assists:'goalsAssists',
      player_fouls:'fouls',player_goals:'goals',player_to_score_anytime:'anytimeGoal',player_to_receive_a_card:'toReceiveCard',player_saves:'saves'
    }
  },
  TENNIS:{
    file:'tennis-odds.json',sportKeys:['tennis'],
    markets:{
      player_games_won:'gamesWon',player_games_played:'gamesPlayed',player_total_games_won:'gamesWon',player_total_games:'gamesPlayed',
      player_sets_won:'setsWon',player_sets_played:'setsPlayed',player_aces:'aces',player_double_faults:'doubleFaults',
      player_break_points_won:'breakPointsWon',player_tiebreakers_played:'tiebreaksPlayed',player_1st_set_aces:'firstSetAces',player_moneyline:'matchWinner'
    }
  },
  MMA:{file:'mma-odds.json',sportKeys:['mma_mixed_martial_arts'],markets:{player_moneyline:'fightWinner'}},
  ESPORTS:{
    file:'esports-odds.json',sportKeys:['esports'],
    markets:{
      player_kills_on_maps_1_2:'killsMaps12',player_maps_1_2_kills:'killsMaps12',player_kills_on_maps_1_2_3:'killsMaps123',
      player_maps_1_3_kills:'killsMaps13',player_map_1_kills:'map1Kills',player_map_3_kills:'map3Kills',player_map_4_kills:'map4Kills',player_map_5_kills:'map5Kills',
      player_headshots_on_maps_1_2:'headshotsMaps12',player_maps_1_2_headshots:'headshotsMaps12',player_map_3_headshots:'map3Headshots',
      player_maps_1_2_first_bloods:'firstBloodsMaps12',player_points:'points',player_assists:'assists'
    }
  },
  TABLE_TENNIS:{
    file:'table-tennis-odds.json',sportKeys:['table_tennis'],
    markets:{player_moneyline:'matchWinner'}
  }
};

if(!KEY){console.error('::error::PARLAY_API_KEY is missing.');process.exit(2);}
const finite=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const iso=v=>{const t=Date.parse(String(v||''));return Number.isFinite(t)?new Date(t).toISOString():null;};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bookKey=r=>String(r?.bookmaker||r?.bookmaker_key||r?.source||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const bookTitle=r=>String(r?.bookmaker_title||r?.source_title||r?.bookmaker||r?.source||'Sportsbook').trim();
function arrayPayload(payload){return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];}
async function fetchJson(url,{attempts=4}={}){
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45_000);
    try{
      const res=await fetch(url,{headers:{accept:'application/json','X-API-Key':KEY},signal:controller.signal});
      const text=await res.text();
      if(res.ok)return text?JSON.parse(text):null;
      lastError=new Error(`${res.status} ${res.statusText}: ${text.slice(0,700)}`);
      if(![429,502,503,504].includes(res.status)||attempt===attempts)throw lastError;
    }catch(error){
      lastError=error;
      if(attempt===attempts)throw error;
    }finally{clearTimeout(timer);}
    const delay=1200*Math.pow(2,attempt-1)+Math.floor(Math.random()*350);
    console.log(`Transient props response; retrying in ${delay}ms (attempt ${attempt+1}/${attempts}).`);
    await sleep(delay);
  }
  throw lastError||new Error('ParlayAPI request failed.');
}
function looksLikePlayer(value,groupKey){
  const s=String(value||'').trim();
  if(!s||!/[A-Za-z]/.test(s))return false;
  if(/^\d+(?:\.\d+)?\s+or\s+(?:more|less)/i.test(s))return false;
  if(/\b(?:team total|game total|match total|1q|1h|2h|first half|second half)\b/i.test(s))return false;
  if(groupKey==='TABLE_TENNIS'&&(s.includes('@')||/^(?:odd|even)(?:\s*-\s*lg\d+)?$/i.test(s)||/\s-\sG\d+$/i.test(s)))return false;
  return true;
}
function normalizeRow(groupKey,sportKey,marketMap,r){
  const rawMarket=String(r?.market_key||r?.market||'').trim();
  const market=marketMap[rawMarket];if(!market)return null;
  const player=String(r?.player_name||r?.player||'').trim();if(!looksLikePlayer(player,groupKey))return null;
  const bk=bookKey(r);if(!SPORTSBOOK_KEYS.has(bk))return null;
  const period=String(r?.period||'FULL').toUpperCase();if(!['FULL','UNKNOWN',''].includes(period))return null;
  const binary=BINARY_KEYS.has(rawMarket);
  const line=finite(r?.line);
  const overPrice=finite(r?.over_price??r?.yes_price??r?.price);
  const underPrice=finite(r?.under_price??r?.no_price);
  if(overPrice===null&&underPrice===null)return null;
  if(!binary&&line===null)return null;
  return {
    eventId:String(r?.canonical_event_id||r?.event_id||''),sport:groupKey,sportKey,commenceTime:iso(r?.commence_time),
    homeTeam:String(r?.home_team||'').trim()||null,awayTeam:String(r?.away_team||'').trim()||null,
    player,team:String(r?.team||r?.player_team||'').trim()||null,market,marketKey:rawMarket,line:binary&&line===null?0.5:line,
    binary,period,book:bookTitle(r),bookKey:bk,overPrice,underPrice,
    overImplied:finite(r?.over_implied_prob),underImplied:finite(r?.under_implied_prob),
    deepLink:r?.deep_link||r?.link||r?.url||null,snapshotTime:iso(r?.snapshot_time||r?.last_update||r?.updated_at)
  };
}
async function refreshGroup(groupKey,cfg){
  const marketKeys=Object.keys(cfg.markets);const rows=[];const books=new Set();const activeMarkets=new Set();const rawMarketKeys=new Set();
  const bySportKey=[];
  for(const sportKey of cfg.sportKeys){
    const params=new URLSearchParams({markets:marketKeys.join(','),bookmakers:BOOKMAKERS,limit:'10000',maxAgeSec:'3600'});
    let raw=[];
    try{raw=arrayPayload(await fetchJson(`${API}/sports/${sportKey}/props?${params}`));}
    catch(error){console.error(`::warning::${groupKey} ${sportKey} props failed after retries: ${error?.message||error}`);bySportKey.push({sportKey,rawRows:0,acceptedRows:0,error:String(error?.message||error)});continue;}
    let accepted=0;
    for(const r of raw){
      rawMarketKeys.add(String(r?.market_key||r?.market||''));
      const row=normalizeRow(groupKey,sportKey,cfg.markets,r);if(!row)continue;
      rows.push(row);accepted++;books.add(row.book);activeMarkets.add(row.market);
    }
    bySportKey.push({sportKey,rawRows:raw.length,acceptedRows:accepted});
  }
  rows.sort((a,b)=>(a.commenceTime||'').localeCompare(b.commenceTime||'')||a.player.localeCompare(b.player)||a.market.localeCompare(b.market)||(a.line??0)-(b.line??0)||a.book.localeCompare(b.book));
  const output={meta:{
    source:'parlayapi',sample:false,sport:groupKey,fetchedAt:new Date().toISOString(),sportKeys:cfg.sportKeys,bySportKey,
    sportsbookRows:rows.length,books:[...books].sort(),markets:[...activeMarkets].sort(),rawMarketKeys:[...rawMarketKeys].filter(Boolean).sort(),
    probabilityPolicy:'Two-sided sportsbook prices may be de-vigged by ParlayPing. Single-sided prices remain market-implied. No proprietary model is claimed for this snapshot.',
    liveGrading:'not-connected',note:`Current ${groupKey} player markets for ParlayPing. Started events must not be graded from this pregame snapshot.`
  },rows};
  const out=path.join(process.cwd(),'slates',cfg.file);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(output,null,2)+'\n');
  console.log(`${groupKey}: rows=${rows.length}, books=${books.size}, markets=${activeMarkets.size}, sources=${cfg.sportKeys.length}.`);
}

const requested=process.argv.slice(2).map(x=>String(x).toUpperCase()).filter(x=>GROUPS[x]);
const groups=requested.length?[...new Set(requested)]:Object.keys(GROUPS);
for(const group of groups){try{await refreshGroup(group,GROUPS[group]);}catch(error){console.error(`::error::${group} refresh failed:`,error?.stack||error);process.exitCode=1;}}
