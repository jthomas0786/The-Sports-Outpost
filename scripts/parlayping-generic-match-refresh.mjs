#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const KEY=process.env.PARLAY_API_KEY||'';
const OUT_FILE=path.join(process.cwd(),'slates','generic-match-odds.json');
const MAX_PAID_KEYS=5;
const LOOKAHEAD_MS=72*3600_000;
const FAMILY_DEFS=[
  {sport:'VOLLEYBALL',label:'Volleyball',match:key=>/^volleyball(?:_|$)/.test(key),preferred:key=>key==='volleyball'},
  {sport:'CRICKET',label:'Cricket',match:key=>/^cricket(?:_|$)/.test(key),preferred:key=>['cricket_international_twenty20_matches','cricket_one_day_international','cricket_test_match','cricket_ipl'].includes(key)},
  {sport:'RUGBY_LEAGUE',label:'Rugby League',match:key=>/^rugbyleague(?:_|$)/.test(key),preferred:key=>key==='rugbyleague_nrl'},
  {sport:'AFL',label:'Aussie Rules',match:key=>/^aussierules(?:_|$)/.test(key),preferred:key=>key==='aussierules_afl'},
  {sport:'BOXING',label:'Boxing',match:key=>/^boxing(?:_|$)/.test(key),preferred:key=>key==='boxing_boxing_matches'||key==='boxing_boxing'}
];

if(!KEY){console.error('::error::PARLAY_API_KEY is missing.');process.exit(2);}

const finite=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
const iso=value=>{const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toISOString():null;};
const norm=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const implied=price=>{const p=finite(price);if(p===null||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);};
const arrayPayload=payload=>Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.events)?payload.events:[];
function first(...values){for(const value of values){if(value!==undefined&&value!==null&&String(value)!=='')return value;}return null;}
function team(row,side){
  if(side==='home')return String(first(row?.home_team,row?.homeTeam,row?.team1,row?.participant1,row?.home?.name)||'').trim();
  return String(first(row?.away_team,row?.awayTeam,row?.team2,row?.participant2,row?.away?.name)||'').trim();
}
function familyForKey(key){return FAMILY_DEFS.find(def=>def.match(String(key||'').toLowerCase()))||null;}
function normalizeEvent(row,sportKey,family){
  const home=team(row,'home'),away=team(row,'away');
  const commenceTime=iso(first(row?.commence_time,row?.commenceTime,row?.start_time,row?.startTime,row?.game_date,row?.date));
  if(!home||!away||!commenceTime||norm(home)===norm(away))return null;
  const eventId=String(first(row?.canonical_event_id,row?.canonicalEventId,row?.event_id,row?.eventId,row?.id)||`${sportKey}|${commenceTime}|${norm(home)}|${norm(away)}`);
  return {eventId,sport:family.sport,sportLabel:family.label,sportKey,commenceTime,homeTeam:home,awayTeam:away};
}

async function fetchJson(url,{auth=true,attempts=3}={}){
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),35_000);
    try{
      const headers={accept:'application/json','user-agent':'The-Sports-Outpost-ParlayPing/1.0'};
      if(auth)headers['X-API-Key']=KEY;
      const res=await fetch(url,{headers,signal:controller.signal});
      const text=await res.text();
      if(res.ok)return {data:text?JSON.parse(text):null,credits:Number(res.headers.get('x-requests-last')||0)||0};
      lastError=new Error(`${res.status} ${res.statusText}: ${text.slice(0,300)}`);
      if(![429,500,502,503,504].includes(res.status)||attempt===attempts)throw lastError;
    }catch(error){lastError=error;if(attempt===attempts)throw error;}
    finally{clearTimeout(timer);}
    await new Promise(resolve=>setTimeout(resolve,700*Math.pow(2,attempt-1)));
  }
  throw lastError||new Error('request failed');
}

async function mapLimit(items,limit,fn){
  const results=new Array(items.length);let next=0;
  async function worker(){while(true){const index=next++;if(index>=items.length)return;try{results[index]=await fn(items[index],index);}catch(error){results[index]={error};}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length||1)},worker));
  return results;
}

function normalizeMoneylines(payload,sportKey,family,now){
  const rows=[];
  for(const rawEvent of arrayPayload(payload)){
    const base=normalizeEvent(rawEvent,sportKey,family);if(!base||Date.parse(base.commenceTime)<=now)continue;
    for(const book of Array.isArray(rawEvent?.bookmakers)?rawEvent.bookmakers:[]){
      const bookKey=String(book?.key||book?.bookmaker||'').toLowerCase();if(bookKey!=='pinnacle')continue;
      for(const market of Array.isArray(book?.markets)?book.markets:[]){
        const marketKey=String(market?.key||market?.market_key||market?.market||'').toLowerCase();
        if(!['h2h','moneyline','money_line','game_winner'].includes(marketKey))continue;
        const outcomes=(Array.isArray(market?.outcomes)?market.outcomes:[]).map(outcome=>({name:String(outcome?.name||outcome?.team||'').trim(),price:finite(outcome?.price)})).filter(outcome=>outcome.name&&outcome.price!==null);
        if(outcomes.length!==2)continue;
        const home=outcomes.find(outcome=>norm(outcome.name)===norm(base.homeTeam));
        const away=outcomes.find(outcome=>norm(outcome.name)===norm(base.awayTeam));
        if(!home||!away)continue;
        const homeImplied=implied(home.price),awayImplied=implied(away.price),sum=(homeImplied??0)+(awayImplied??0);
        if(homeImplied===null||awayImplied===null||sum<0.98||sum>1.30)continue;
        const snapshotTime=iso(first(market?.last_update,market?.lastUpdate,book?.last_update,book?.lastUpdate,rawEvent?.last_update,rawEvent?.lastUpdate))||new Date(now).toISOString();
        rows.push({...base,selection:base.homeTeam,side:'home',market:'matchWinner',book:'Pinnacle',bookKey:'pinnacle',price:home.price,impliedProbability:homeImplied,fairProbability:homeImplied/sum,snapshotTime});
        rows.push({...base,selection:base.awayTeam,side:'away',market:'matchWinner',book:'Pinnacle',bookKey:'pinnacle',price:away.price,impliedProbability:awayImplied,fairProbability:awayImplied/sum,snapshotTime});
      }
    }
  }
  const dedup=new Map();
  for(const row of rows){const key=`${row.eventId}|${norm(row.selection)}`;const prev=dedup.get(key);if(!prev||Date.parse(row.snapshotTime)>Date.parse(prev.snapshotTime))dedup.set(key,row);}
  return [...dedup.values()];
}

function choosePaidKeys(candidates){
  const chosen=[];const used=new Set();
  for(const family of FAMILY_DEFS){
    const familyRows=candidates.filter(row=>row.family.sport===family.sport).sort((a,b)=>Number(b.preferred)-Number(a.preferred)||a.nearestStart-b.nearestStart||b.futureEvents-a.futureEvents);
    if(familyRows[0]){chosen.push(familyRows[0]);used.add(familyRows[0].key);}
  }
  if(chosen.length>MAX_PAID_KEYS)return chosen.sort((a,b)=>a.nearestStart-b.nearestStart).slice(0,MAX_PAID_KEYS);
  const remaining=candidates.filter(row=>!used.has(row.key)).sort((a,b)=>a.nearestStart-b.nearestStart||Number(b.preferred)-Number(a.preferred)||b.futureEvents-a.futureEvents);
  for(const row of remaining){if(chosen.length>=MAX_PAID_KEYS)break;chosen.push(row);}
  return chosen;
}

async function main(){
  const now=Date.now(),to=new Date(now+LOOKAHEAD_MS).toISOString();
  const catalogResponse=await fetchJson(`${API}/sports`,{auth:false,attempts:2});
  const catalog=arrayPayload(catalogResponse.data);
  const keys=catalog.map(row=>String(row?.key||'').trim()).filter(Boolean).map(key=>({key,family:familyForKey(key)})).filter(row=>row.family);
  const eventChecks=await mapLimit(keys,12,async row=>{
    const response=await fetchJson(`${API}/sports/${encodeURIComponent(row.key)}/events?commenceTimeFrom=${encodeURIComponent(new Date(now).toISOString())}&commenceTimeTo=${encodeURIComponent(to)}`,{attempts:2});
    const events=arrayPayload(response.data).map(event=>normalizeEvent(event,row.key,row.family)).filter(Boolean).filter(event=>Date.parse(event.commenceTime)>now);
    return {...row,events,futureEvents:events.length,nearestStart:events.length?Math.min(...events.map(event=>Date.parse(event.commenceTime))):Infinity,preferred:row.family.preferred(row.key)};
  });
  const candidates=eventChecks.filter(row=>row&&!row.error&&row.futureEvents>0);
  const selected=choosePaidKeys(candidates);
  const allRows=[];let reportedCredits=0;
  const diagnostics=[];
  for(const row of selected){
    try{
      const params=new URLSearchParams({regions:'us',markets:'h2h',bookmakers:'pinnacle',oddsFormat:'american',dateFormat:'iso',include_live:'false'});
      const response=await fetchJson(`${API}/sports/${encodeURIComponent(row.key)}/odds?${params}`);
      reportedCredits+=response.credits;
      const oddsRows=normalizeMoneylines(response.data,row.key,row.family,now);allRows.push(...oddsRows);
      diagnostics.push({sport:row.family.sport,sportKey:row.key,futureEvents:row.futureEvents,acceptedRows:oddsRows.length,reportedCredits:response.credits});
    }catch(error){diagnostics.push({sport:row.family.sport,sportKey:row.key,futureEvents:row.futureEvents,acceptedRows:0,error:error?.message||String(error)});}
  }
  const dedup=new Map();
  for(const row of allRows){const key=`${row.sport}|${row.eventId}|${norm(row.selection)}`;const prev=dedup.get(key);if(!prev||Date.parse(row.snapshotTime)>Date.parse(prev.snapshotTime))dedup.set(key,row);}
  const rows=[...dedup.values()].sort((a,b)=>a.commenceTime.localeCompare(b.commenceTime)||a.sport.localeCompare(b.sport)||a.selection.localeCompare(b.selection));
  const discoveredByFamily=Object.fromEntries(FAMILY_DEFS.map(family=>[family.sport,{catalogKeys:keys.filter(row=>row.family.sport===family.sport).length,keysWithFutureEvents:candidates.filter(row=>row.family.sport===family.sport).length,selectedKeys:selected.filter(row=>row.family.sport===family.sport).map(row=>row.key)}]));
  const output={
    schemaVersion:1,
    meta:{
      source:'parlayapi-pinnacle',sportFamilies:FAMILY_DEFS.map(f=>f.sport),fetchedAt:new Date(now).toISOString(),market:'matchWinner',settlementConnected:false,
      rows:rows.length,maxPaidSportKeysPerRun:MAX_PAID_KEYS,reportedCreditsUsed:reportedCredits,
      probabilityPolicy:'Only complete two-sided Pinnacle h2h markets are accepted and de-vigged. Three-way/draw markets, started events and ambiguous outcomes are rejected.',
      coveragePolicy:'Active league keys are discovered for free. At most five league keys with upcoming events are priced per run, prioritizing family diversity and nearest starts.',
      discoveredByFamily,diagnostics
    },
    rows
  };
  await fs.mkdir(path.dirname(OUT_FILE),{recursive:true});
  await fs.writeFile(OUT_FILE,JSON.stringify(output,null,2)+'\n');
  console.log(`GENERIC MATCH feed: ${rows.length} accepted Pinnacle sides; selected ${selected.length} paid sport keys; reported credits=${reportedCredits}.`);
  console.log(JSON.stringify({discoveredByFamily,diagnostics}));
}

main().catch(error=>{console.error('::error::',error?.stack||error);process.exit(1);});
