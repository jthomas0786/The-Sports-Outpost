#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const KEY=process.env.PARLAY_API_KEY||'';
const OUT_FILE=path.join(process.cwd(),'slates','golf-outrights.json');
const MAX_PAID_KEYS=2;

if(!KEY){console.error('::error::PARLAY_API_KEY is missing.');process.exit(2);}

const finite=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
const norm=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const implied=price=>{const p=finite(price);if(p===null||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);};
const arrayPayload=payload=>Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.events)?payload.events:[];
function first(...values){for(const value of values){if(value!==undefined&&value!==null&&String(value)!=='')return value;}return null;}
function isTournamentKey(key){
  const k=String(key||'').toLowerCase();
  return /^golf_/.test(k)&&!/^disc_golf/.test(k)&&!/(?:^|_)(?:1st|2nd|3rd|4th)_round(?:_|$)/.test(k)&&!/(?:^|_)round_[1-4](?:_|$)/.test(k);
}
function keyPriority(key){
  const k=String(key||'').toLowerCase();
  let score=0;
  if(/pga|masters|championship|open|classic|invitational|tournament|dp_world|european/.test(k))score+=10;
  if(/qualif|match_play|first_round|1st_round/.test(k))score-=20;
  return score;
}
function titleFromKey(key){return String(key||'').replace(/^golf_/,'').split('_').filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}

async function fetchJson(url,{auth=true,attempts=3}={}){
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),35_000);
    try{
      const headers={accept:'application/json','user-agent':'The-Sports-Outpost-ParlayPing/1.0'};
      if(auth)headers['X-API-Key']=KEY;
      const res=await fetch(url,{headers,signal:controller.signal});
      const text=await res.text();
      if(res.ok)return {data:text?JSON.parse(text):null,credits:Number(res.headers.get('x-requests-last')||0)||0,served:String(res.headers.get('x-markets-served')||''),unservable:String(res.headers.get('x-markets-unservable')||'')};
      lastError=new Error(`${res.status} ${res.statusText}: ${text.slice(0,300)}`);
      if(![429,500,502,503,504].includes(res.status)||attempt===attempts)throw lastError;
    }catch(error){lastError=error;if(attempt===attempts)throw error;}
    finally{clearTimeout(timer);}
    await new Promise(resolve=>setTimeout(resolve,700*Math.pow(2,attempt-1)));
  }
  throw lastError||new Error('request failed');
}

function coverageSummary(payload,sportKey){
  const root=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};
  const source=root.data&&typeof root.data==='object'&&!Array.isArray(root.data)?root.data:root;
  const pregame=Math.max(0,finite(source.total_games_pregame??source.totalGamesPregame)??0);
  const inPlay=Math.max(0,finite(source.total_games_in_play??source.totalGamesInPlay)??0);
  const covered=Math.max(0,finite(source.total_games_covered??source.totalGamesCovered)??(pregame+inPlay));
  return {
    sportKey,
    pregame,
    inPlay,
    covered,
    serves:Boolean(source.serves),
    bookmakers:Array.isArray(source.bookmakers)?source.bookmakers:[],
    markets:Array.isArray(source.markets)?source.markets:[]
  };
}

async function getOutrightCoverage(sportKey){
  const params=new URLSearchParams({regions:'us',markets:'outrights',bookmakers:'pinnacle'});
  const response=await fetchJson(`${API}/sports/${encodeURIComponent(sportKey)}/odds/coverage?${params}`,{auth:true,attempts:2});
  return coverageSummary(response.data,sportKey);
}

function normalizeOutrights(payload,sportKey,now){
  const rows=[];const diagnostics=[];
  for(const rawEvent of arrayPayload(payload)){
    const eventId=String(first(rawEvent?.canonical_event_id,rawEvent?.canonicalEventId,rawEvent?.event_id,rawEvent?.eventId,rawEvent?.id)||sportKey);
    const eventTitle=String(first(rawEvent?.sport_title,rawEvent?.sportTitle,rawEvent?.title,rawEvent?.name,rawEvent?.description,titleFromKey(sportKey))||titleFromKey(sportKey)).trim();
    for(const book of Array.isArray(rawEvent?.bookmakers)?rawEvent.bookmakers:[]){
      const bookKey=String(book?.key||book?.bookmaker||'').toLowerCase();if(bookKey!=='pinnacle')continue;
      const staleSeconds=finite(book?.stale_seconds??book?.staleSeconds);
      if(staleSeconds!==null&&staleSeconds>3600)continue;
      for(const market of Array.isArray(book?.markets)?book.markets:[]){
        const marketKey=String(market?.key||market?.market_key||market?.market||'').toLowerCase();if(marketKey!=='outrights')continue;
        const outcomes=(Array.isArray(market?.outcomes)?market.outcomes:[]).map(outcome=>({name:String(outcome?.name||outcome?.player||outcome?.selection||'').trim(),price:finite(outcome?.price)})).filter(outcome=>outcome.name&&outcome.price!==null);
        if(outcomes.length<4)continue;
        const priced=outcomes.map(outcome=>({...outcome,impliedProbability:implied(outcome.price)})).filter(outcome=>outcome.impliedProbability!==null);
        if(priced.length!==outcomes.length)continue;
        const overround=priced.reduce((sum,row)=>sum+row.impliedProbability,0);
        if(!Number.isFinite(overround)||overround<=1||overround>4)continue;
        const marketId=String(first(market?.id,market?.market_id,market?.marketId,eventId)||eventId);
        const snapshotMs=finite(market?.last_update_ms??market?.lastUpdateMs??book?.last_update_ms??book?.lastUpdateMs);
        const snapshotTime=snapshotMs!==null?new Date(snapshotMs).toISOString():new Date(now).toISOString();
        diagnostics.push({sportKey,eventId,marketId,eventTitle,outcomes:priced.length,overround});
        for(const outcome of priced){
          rows.push({sport:'GOLF',sportKey,eventId,marketId,tournament:eventTitle,market:'tournamentWinner',selection:outcome.name,book:'Pinnacle',bookKey:'pinnacle',price:outcome.price,impliedProbability:outcome.impliedProbability,fairProbability:outcome.impliedProbability/overround,snapshotTime,settlementConnected:false});
        }
      }
    }
  }
  const dedup=new Map();
  for(const row of rows){const key=`${row.sportKey}|${row.eventId}|${row.marketId}|${norm(row.selection)}`;const prev=dedup.get(key);if(!prev||Date.parse(row.snapshotTime)>Date.parse(prev.snapshotTime))dedup.set(key,row);}
  return {rows:[...dedup.values()],diagnostics};
}

async function main(){
  const now=Date.now();
  const catalogResponse=await fetchJson(`${API}/sports`,{auth:false,attempts:2});
  const catalog=arrayPayload(catalogResponse.data);
  const golfKeys=catalog.map(row=>String(row?.key||'').trim()).filter(isTournamentKey).sort((a,b)=>keyPriority(b)-keyPriority(a)||a.localeCompare(b));

  // `/odds/coverage` is free. Probe every current Golf key first so paid `/odds`
  // calls are spent only where Pinnacle actually has a current pregame outright board.
  const coverage=[];
  for(const sportKey of golfKeys){
    try{coverage.push(await getOutrightCoverage(sportKey));}
    catch(error){coverage.push({sportKey,pregame:0,inPlay:0,covered:0,serves:false,bookmakers:[],markets:[],error:error?.message||String(error)});}
  }
  const selectedKeys=coverage
    .filter(row=>row.pregame>0&&row.bookmakers.map(v=>String(v).toLowerCase()).includes('pinnacle')&&row.markets.map(v=>String(v).toLowerCase()).includes('outrights'))
    .sort((a,b)=>b.pregame-a.pregame||keyPriority(b.sportKey)-keyPriority(a.sportKey)||a.sportKey.localeCompare(b.sportKey))
    .slice(0,MAX_PAID_KEYS)
    .map(row=>row.sportKey);

  const allRows=[];const diagnostics=[];let reportedCredits=0;
  for(const sportKey of selectedKeys){
    try{
      const params=new URLSearchParams({regions:'us',markets:'outrights',bookmakers:'pinnacle',oddsFormat:'american',dateFormat:'iso'});
      const response=await fetchJson(`${API}/sports/${encodeURIComponent(sportKey)}/odds?${params}`);
      reportedCredits+=response.credits;
      const normalized=normalizeOutrights(response.data,sportKey,now);
      allRows.push(...normalized.rows);
      diagnostics.push({sportKey,acceptedRows:normalized.rows.length,markets:normalized.diagnostics,reportedCredits:response.credits,served:response.served,unservable:response.unservable});
    }catch(error){diagnostics.push({sportKey,acceptedRows:0,error:error?.message||String(error)});}
  }
  const rows=allRows.sort((a,b)=>a.sportKey.localeCompare(b.sportKey)||b.fairProbability-a.fairProbability||a.selection.localeCompare(b.selection));
  const output={
    schemaVersion:1,
    meta:{
      source:'parlayapi-pinnacle',sport:'GOLF',market:'tournamentWinner',providerMarket:'outrights',fetchedAt:new Date(now).toISOString(),settlementConnected:false,
      catalogGolfKeys:golfKeys,coverage,selectedKeys,rows:rows.length,maxPaidSportKeysPerRun:MAX_PAID_KEYS,reportedCreditsUsed:reportedCredits,
      coveragePolicy:'Every current Golf tournament key is checked with the free ParlayAPI /odds/coverage endpoint. Paid /odds is called only for keys reporting current pregame Pinnacle outright coverage.',
      probabilityPolicy:'Only complete multi-player Pinnacle outright fields with at least four priced selections are accepted. Each selection is de-vigged against the full quoted field.',
      settlementPolicy:'Golf is sportsbook-probability only for launch. A disappearing quote, tournament progress, leaderboard position, withdrawal or result is never used to infer HIT/MISS.',
      diagnostics
    },
    rows
  };
  await fs.mkdir(path.dirname(OUT_FILE),{recursive:true});
  await fs.writeFile(OUT_FILE,JSON.stringify(output,null,2)+'\n');
  console.log(`GOLF outright feed: coverage checked ${coverage.length} keys free; ${rows.length} accepted Pinnacle selections across ${selectedKeys.length} paid keys; reported credits=${reportedCredits}.`);
  console.log(JSON.stringify({coverage:coverage.map(({sportKey,pregame,inPlay,covered,error})=>({sportKey,pregame,inPlay,covered,error})),selectedKeys,diagnostics:diagnostics.map(d=>({sportKey:d.sportKey,acceptedRows:d.acceptedRows,reportedCredits:d.reportedCredits,error:d.error,served:d.served,unservable:d.unservable}))}));
}

main().catch(error=>{console.error('::error::',error?.stack||error);process.exit(1);});
