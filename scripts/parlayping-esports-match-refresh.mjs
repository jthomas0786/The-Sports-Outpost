#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const KEY=process.env.PARLAY_API_KEY||'';
const OUT_DIR=path.join(process.cwd(),'slates');
const ODDS_FILE=path.join(OUT_DIR,'esports-match-odds.json');
const RESULTS_FILE=path.join(OUT_DIR,'esports-results.json');
const LOOKBACK_MS=6*3600_000;
const LOOKAHEAD_MS=48*3600_000;
const SPORTS=[
  {key:'esports_cs2',game:'CS2'},
  {key:'esports_valorant',game:'VALORANT'},
  {key:'esports_dota2',game:'DOTA2'},
  {key:'esports_lol',game:'LOL'}
];

if(!KEY){console.error('::error::PARLAY_API_KEY is missing.');process.exit(2);}

const iso=value=>{const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toISOString():null;};
const finite=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
const norm=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const implied=price=>{const p=finite(price);if(p===null||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);};
const arrayPayload=payload=>Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.matches)?payload.matches:Array.isArray(payload?.events)?payload.events:[];

function first(...values){for(const value of values){if(value!==undefined&&value!==null&&String(value)!=='')return value;}return null;}
function rawTeam(row,side){
  if(side==='home')return String(first(row?.home_team,row?.homeTeam,row?.team1,row?.team_a,row?.participant1,row?.opponent1,row?.home?.name,row?.teams?.home?.name)||'').trim();
  return String(first(row?.away_team,row?.awayTeam,row?.team2,row?.team_b,row?.participant2,row?.opponent2,row?.away?.name,row?.teams?.away?.name)||'').trim();
}
function normalizeEvent(row,sportKey,game){
  const home=rawTeam(row,'home'),away=rawTeam(row,'away');
  const start=iso(first(row?.commence_time,row?.commenceTime,row?.start_time,row?.startTime,row?.scheduled_at,row?.scheduledAt,row?.game_date,row?.gameDate,row?.date));
  if(!home||!away||!start||norm(home)===norm(away))return null;
  const eventId=String(first(row?.canonical_event_id,row?.canonicalEventId,row?.event_id,row?.eventId,row?.match_id,row?.matchId,row?.id)||`${sportKey}|${start}|${norm(home)}|${norm(away)}`);
  return {eventId,sportKey,game,commenceTime:start,homeTeam:home,awayTeam:away};
}

async function fetchJson(url,{attempts=3}={}){
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45_000);
    try{
      const res=await fetch(url,{headers:{accept:'application/json','X-API-Key':KEY,'user-agent':'The-Sports-Outpost-ParlayPing/1.0'},signal:controller.signal});
      const text=await res.text();
      if(res.ok)return {data:text?JSON.parse(text):null,credits:Number(res.headers.get('x-requests-last')||0)||0};
      lastError=new Error(`${res.status} ${res.statusText}: ${text.slice(0,500)}`);
      if(![429,500,502,503,504].includes(res.status)||attempt===attempts)throw lastError;
    }catch(error){lastError=error;if(attempt===attempts)throw error;}
    finally{clearTimeout(timer);}
    await new Promise(resolve=>setTimeout(resolve,1000*Math.pow(2,attempt-1)));
  }
  throw lastError||new Error('ParlayAPI request failed');
}

function normalizeMoneylines(payload,sportKey,game,now){
  const rows=[];
  for(const event of arrayPayload(payload)){
    const base=normalizeEvent(event,sportKey,game);if(!base||Date.parse(base.commenceTime)<=now)continue;
    for(const book of Array.isArray(event?.bookmakers)?event.bookmakers:[]){
      const bookKey=String(book?.key||book?.bookmaker||'').toLowerCase();if(bookKey!=='pinnacle')continue;
      for(const market of Array.isArray(book?.markets)?book.markets:[]){
        const marketKey=String(market?.key||market?.market_key||market?.market||'').toLowerCase();
        if(!['h2h','moneyline','money_line','game_winner'].includes(marketKey))continue;
        const outcomes=(Array.isArray(market?.outcomes)?market.outcomes:[]).map(outcome=>({name:String(outcome?.name||outcome?.team||'').trim(),price:finite(outcome?.price)})).filter(x=>x.name&&x.price!==null);
        const home=outcomes.find(x=>norm(x.name)===norm(base.homeTeam));
        const away=outcomes.find(x=>norm(x.name)===norm(base.awayTeam));
        if(!home||!away)continue;
        const h=implied(home.price),a=implied(away.price),sum=(h??0)+(a??0);
        if(h===null||a===null||sum<0.98||sum>1.30)continue;
        const snapshotTime=iso(first(market?.last_update,market?.lastUpdate,book?.last_update,book?.lastUpdate,event?.last_update,event?.lastUpdate))||new Date(now).toISOString();
        rows.push({...base,selection:base.homeTeam,side:'home',market:'matchWinner',book:'Pinnacle',bookKey:'pinnacle',price:home.price,impliedProbability:h,fairProbability:h/sum,snapshotTime});
        rows.push({...base,selection:base.awayTeam,side:'away',market:'matchWinner',book:'Pinnacle',bookKey:'pinnacle',price:away.price,impliedProbability:a,fairProbability:a/sum,snapshotTime});
      }
    }
  }
  const dedup=new Map();
  for(const row of rows){const key=`${row.eventId}|${norm(row.selection)}`;const prev=dedup.get(key);if(!prev||Date.parse(row.snapshotTime)>Date.parse(prev.snapshotTime))dedup.set(key,row);}
  return [...dedup.values()];
}

async function main(){
  const now=Date.now(),moneylineRows=[],diagnostics=[];let totalCredits=0;
  for(const sport of SPORTS){
    const from=new Date(now-LOOKBACK_MS).toISOString(),to=new Date(now+LOOKAHEAD_MS).toISOString();
    let events=[];
    try{
      const response=await fetchJson(`${API}/sports/${encodeURIComponent(sport.key)}/events?commenceTimeFrom=${encodeURIComponent(from)}&commenceTimeTo=${encodeURIComponent(to)}`,{attempts:2});
      totalCredits+=response.credits;
      events=arrayPayload(response.data).map(row=>normalizeEvent(row,sport.key,sport.game)).filter(Boolean);
    }catch(error){
      diagnostics.push({sportKey:sport.key,game:sport.game,eventCount:0,futureEvents:0,oddsCalled:false,oddsRows:0,error:`events: ${error?.message||error}`});
      continue;
    }
    const future=events.filter(event=>Date.parse(event.commenceTime)>now);let oddsCalled=false,oddsRows=0;
    if(future.length){
      try{
        const params=new URLSearchParams({regions:'us',markets:'h2h',bookmakers:'pinnacle',oddsFormat:'american',dateFormat:'iso',include_live:'false'});
        const response=await fetchJson(`${API}/sports/${encodeURIComponent(sport.key)}/odds?${params}`);
        totalCredits+=response.credits;oddsCalled=true;
        const rows=normalizeMoneylines(response.data,sport.key,sport.game,now);moneylineRows.push(...rows);oddsRows=rows.length;
      }catch(error){console.error(`::warning::${sport.key} Pinnacle h2h failed: ${error?.message||error}`);}
    }
    diagnostics.push({sportKey:sport.key,game:sport.game,eventCount:events.length,futureEvents:future.length,oddsCalled,oddsRows});
  }

  moneylineRows.sort((a,b)=>a.commenceTime.localeCompare(b.commenceTime)||a.game.localeCompare(b.game)||a.selection.localeCompare(b.selection));
  const generatedAt=new Date(now).toISOString();
  const oddsOutput={
    schemaVersion:1,
    meta:{
      source:'parlayapi-pinnacle',sport:'ESPORTS',fetchedAt:generatedAt,market:'matchWinner',rows:moneylineRows.length,
      estimatedCreditsUsed:totalCredits,
      probabilityPolicy:'Only complete two-sided Pinnacle h2h markets are accepted and de-vigged. Started events are never settled from this snapshot.',
      settlementConnected:false,
      diagnostics
    },
    rows:moneylineRows
  };
  const resultsOutput={
    schemaVersion:1,
    source:'none-trusted-yet',
    sport:'ESPORTS',
    generatedAt,
    settlementConnected:false,
    liveCoverage:false,
    finalCoverage:false,
    reason:'Authenticated ParlayAPI archive validation on 2026-09-19 and 2026-09-20 returned null score/result fields, so settlement remains disabled.',
    matches:{}
  };
  await fs.mkdir(OUT_DIR,{recursive:true});
  await fs.writeFile(ODDS_FILE,JSON.stringify(oddsOutput,null,2)+'\n');
  await fs.writeFile(RESULTS_FILE,JSON.stringify(resultsOutput,null,2)+'\n');
  console.log(`ESPORTS pregame feed: ${moneylineRows.length} Pinnacle selection rows; settlement disabled; reported credits=${totalCredits}.`);
  for(const d of diagnostics)console.log(JSON.stringify(d));
}

main().catch(error=>{console.error('::error::',error?.stack||error);process.exit(1);});
