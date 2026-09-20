#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API=process.env.PARLAY_API_BASE||'https://parlay-api.com/v1';
const KEY=process.env.PARLAY_API_KEY||'';
const OUT_DIR=path.join(process.cwd(),'slates');
const ODDS_FILE=path.join(OUT_DIR,'esports-match-odds.json');
const RESULTS_FILE=path.join(OUT_DIR,'esports-results.json');
const RESULT_CACHE_MS=72*3600_000;
const LOOKBACK_MS=36*3600_000;
const LOOKAHEAD_MS=48*3600_000;
const RESULT_DELAY_MS=30*60_000;

const SPORTS=[
  {key:'esports_cs2',game:'CS2',results:true},
  {key:'esports_valorant',game:'VALORANT',results:true},
  {key:'esports_dota2',game:'DOTA2',results:true},
  {key:'esports_lol',game:'LOL',results:false}
];

if(!KEY){console.error('::error::PARLAY_API_KEY is missing.');process.exit(2);}

const iso=value=>{const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toISOString():null;};
const finite=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
const norm=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const dateKey=value=>{const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toISOString().slice(0,10):null;};
const implied=price=>{const p=finite(price);if(p===null||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);};
const arrayPayload=payload=>Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.matches)?payload.matches:Array.isArray(payload?.events)?payload.events:[];
const voidLikeText=value=>/\b(?:void|cancel(?:led|ed)?|abandon(?:ed)?|postpon(?:ed)?|forfeit(?:ed)?|walkover|w\/o|retir(?:ed|ement)|default|disqualif(?:ied|ication)|no\s*contest|draw|tie)\b/i.test(String(value||''));

function first(...values){for(const value of values){if(value!==undefined&&value!==null&&String(value)!=='')return value;}return null;}
function firstFinite(...values){for(const value of values){const n=finite(value);if(n!==null)return n;}return null;}
function esportsFamily(value){
  const key=String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  if(/^esports_cs2(?:_|$)/.test(key)||/^esports_counter_strike(?:_2)?(?:_|$)/.test(key))return 'esports_cs2';
  if(/^esports_valorant(?:_|$)/.test(key))return 'esports_valorant';
  if(/^esports_dota_?2(?:_|$)/.test(key))return 'esports_dota2';
  if(/^esports_(?:lol|league_of_legends)(?:_|$)/.test(key))return 'esports_lol';
  return key;
}
function rawScore(row,side){
  const score=row?.score||row?.scores||(row?.result&&typeof row.result==='object'?row.result:{});
  if(side==='home')return firstFinite(row?.home_score,row?.homeScore,row?.score_home,row?.team1_score,row?.team1Score,score?.home,score?.home_score,score?.homeScore,score?.team1,score?.team1_score);
  return firstFinite(row?.away_score,row?.awayScore,row?.score_away,row?.team2_score,row?.team2Score,score?.away,score?.away_score,score?.awayScore,score?.team2,score?.team2_score);
}
function rawTeam(row,side){
  if(side==='home')return String(first(row?.home_team,row?.homeTeam,row?.team1,row?.team_a,row?.participant1,row?.opponent1,row?.home?.name,row?.teams?.home?.name)||'').trim();
  return String(first(row?.away_team,row?.awayTeam,row?.team2,row?.team_b,row?.participant2,row?.opponent2,row?.away?.name,row?.teams?.away?.name)||'').trim();
}
function primitiveResult(row){const value=row?.result;return typeof value==='string'||typeof value==='number'?String(value).trim():'';}
function rawWinner(row){
  const winner=first(row?.winner_team,row?.winnerTeam,row?.winning_team,row?.winningTeam,row?.winner_name,row?.winnerName,row?.winner?.name,typeof row?.winner==='string'?row.winner:null);
  return typeof winner==='string'?winner.trim():'';
}
function winnerFromResult(row,home,away){
  const value=primitiveResult(row);if(!value)return '';
  const key=norm(value);
  if(key===norm(home))return home;
  if(key===norm(away))return away;
  if(['home','home win','home winner','1'].includes(key))return home;
  if(['away','away win','away winner','2'].includes(key))return away;
  return '';
}
function eventIdentity({sportKey,homeTeam,awayTeam,commenceTime}){
  const teams=[norm(homeTeam),norm(awayTeam)].filter(Boolean).sort();
  return `${esportsFamily(sportKey)||''}|${dateKey(commenceTime)||''}|${teams.join('|')}`;
}
function readId(row,sportKey,home,away,start){
  return String(first(row?.canonical_event_id,row?.canonicalEventId,row?.event_id,row?.eventId,row?.match_id,row?.matchId,row?.id)||eventIdentity({sportKey,homeTeam:home,awayTeam:away,commenceTime:start}));
}
function sanitizedSample(row){
  if(!row||typeof row!=='object')return null;
  return {
    game_date:first(row.game_date,row.gameDate,row.commence_time,row.commenceTime,row.start_time,row.startTime)||null,
    sport_key:first(row.sport_key,row.sportKey)||null,
    family:esportsFamily(first(row.sport_key,row.sportKey)||''),
    home_team:rawTeam(row,'home')||null,
    away_team:rawTeam(row,'away')||null,
    home_score:rawScore(row,'home'),
    away_score:rawScore(row,'away'),
    result:primitiveResult(row)||null,
    has_odds:row.has_odds??null,
    canonical_event_id:first(row.canonical_event_id,row.canonicalEventId)||null
  };
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
async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return fallback;}}

function normalizeEvent(row,sportKey,game){
  const home=rawTeam(row,'home'),away=rawTeam(row,'away');
  const start=iso(first(row?.commence_time,row?.commenceTime,row?.start_time,row?.startTime,row?.scheduled_at,row?.scheduledAt,row?.game_date,row?.gameDate,row?.date));
  if(!home||!away||!start||norm(home)===norm(away))return null;
  return {eventId:readId(row,sportKey,home,away,start),sportKey,game,commenceTime:start,homeTeam:home,awayTeam:away,identity:eventIdentity({sportKey,homeTeam:home,awayTeam:away,commenceTime:start})};
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
        const home=outcomes.find(x=>norm(x.name)===norm(base.homeTeam)),away=outcomes.find(x=>norm(x.name)===norm(base.awayTeam));
        if(!home||!away)continue;
        const h=implied(home.price),a=implied(away.price),sum=(h??0)+(a??0);if(h===null||a===null||sum<0.98||sum>1.30)continue;
        const snapshotTime=iso(first(market?.last_update,market?.lastUpdate,book?.last_update,book?.lastUpdate,event?.last_update,event?.lastUpdate))||new Date(now).toISOString();
        rows.push({...base,selection:base.homeTeam,side:'home',market:'matchWinner',book:'Pinnacle',bookKey:'pinnacle',price:home.price,impliedProbability:h,fairProbability:h/sum,snapshotTime});
        rows.push({...base,selection:base.awayTeam,side:'away',market:'matchWinner',book:'Pinnacle',bookKey:'pinnacle',price:away.price,impliedProbability:a,fairProbability:a/sum,snapshotTime});
      }
    }
  }
  const dedup=new Map();
  for(const row of rows){const key=`${row.eventId}|${norm(row.selection)}`,prev=dedup.get(key);if(!prev||Date.parse(row.snapshotTime)>Date.parse(prev.snapshotTime))dedup.set(key,row);}
  return [...dedup.values()];
}

function normalizeResult(row,sportKey,game){
  const rowSport=String(first(row?.sport_key,row?.sportKey)||'').trim();
  if(rowSport&&esportsFamily(rowSport)!==esportsFamily(sportKey))return null;
  const home=rawTeam(row,'home'),away=rawTeam(row,'away');if(!home||!away||norm(home)===norm(away))return null;
  const start=iso(first(row?.commence_time,row?.commenceTime,row?.start_time,row?.startTime,row?.scheduled_at,row?.scheduledAt,row?.match_time,row?.matchTime,row?.game_date,row?.gameDate,row?.date));if(!start)return null;
  const statusText=String(first(row?.status,row?.state,row?.result_status,row?.resultStatus,row?.match_status,row?.matchStatus,row?.outcome_status)||'').trim();
  const resultText=primitiveResult(row);
  const homeScore=rawScore(row,'home'),awayScore=rawScore(row,'away');
  const voidLike=voidLikeText(statusText)||voidLikeText(resultText)||voidLikeText(row?.reason)||row?.void===true||row?.cancelled===true||row?.canceled===true;
  let winner=rawWinner(row)||winnerFromResult(row,home,away);
  if(winner&&![home,away].some(team=>norm(team)===norm(winner)))winner='';
  const explicitFinal=row?.completed===true||row?.complete===true||row?.is_final===true||row?.final===true||/\b(?:final|completed|complete|finished|closed)\b/i.test(statusText)||Boolean(resultText);
  if(!winner&&!voidLike&&explicitFinal&&homeScore!==null&&awayScore!==null&&homeScore!==awayScore)winner=homeScore>awayScore?home:away;
  if(!voidLike&&!winner)return null;
  return {
    id:readId(row,sportKey,home,away,start),sport:'ESPORTS',sportKey:esportsFamily(rowSport||sportKey),sourceSportKey:rowSport||sportKey,game,commenceTime:start,homeTeam:home,awayTeam:away,
    homeScore,awayScore,status:'FINAL',resultStatus:statusText||resultText||'FINAL',final:true,voidLike,winner:voidLike?null:winner,
    identity:eventIdentity({sportKey,homeTeam:home,awayTeam:away,commenceTime:start}),updatedAt:new Date().toISOString()
  };
}

function cachedFinalMap(snapshot,now){
  const map=new Map();
  for(const match of Object.values(snapshot?.matches||{})){
    const t=Date.parse(match?.commenceTime||'');if(!Number.isFinite(t)||now-t>RESULT_CACHE_MS||t-now>6*3600_000)continue;
    if(!match?.homeTeam||!match?.awayTeam||!match?.sportKey)continue;
    map.set(match.identity||eventIdentity(match),match);
  }
  return map;
}

async function main(){
  const now=Date.now(),previousResults=await readJson(RESULTS_FILE,{matches:{}}),finals=cachedFinalMap(previousResults,now),moneylineRows=[],diagnostics=[];
  let totalCredits=0;
  for(const sport of SPORTS){
    const from=new Date(now-LOOKBACK_MS).toISOString(),to=new Date(now+LOOKAHEAD_MS).toISOString();
    const eventUrl=`${API}/sports/${encodeURIComponent(sport.key)}/events?commenceTimeFrom=${encodeURIComponent(from)}&commenceTimeTo=${encodeURIComponent(to)}`;
    let events=[];
    try{const response=await fetchJson(eventUrl,{attempts:2});totalCredits+=response.credits;events=arrayPayload(response.data).map(row=>normalizeEvent(row,sport.key,sport.game)).filter(Boolean);}
    catch(error){diagnostics.push({sportKey:sport.key,game:sport.game,eventCount:0,oddsCalled:false,resultDates:[],error:`events: ${error?.message||error}`});continue;}

    const future=events.filter(event=>Date.parse(event.commenceTime)>now);let oddsCalled=false,oddsRows=0;
    if(future.length){
      try{
        const params=new URLSearchParams({regions:'us',markets:'h2h',bookmakers:'pinnacle',oddsFormat:'american',dateFormat:'iso',include_live:'false'});
        const response=await fetchJson(`${API}/sports/${encodeURIComponent(sport.key)}/odds?${params}`);totalCredits+=response.credits;oddsCalled=true;
        const rows=normalizeMoneylines(response.data,sport.key,sport.game,now);moneylineRows.push(...rows);oddsRows=rows.length;
      }catch(error){console.error(`::warning::${sport.key} Pinnacle h2h failed: ${error?.message||error}`);}
    }

    const resultDates=[];let rawResultRows=0,acceptedFinals=0,sampleResultKeys=[],sampleResult=null,sampleResolvedResult=null;
    if(sport.results){
      const due=events.filter(event=>Date.parse(event.commenceTime)<=now-RESULT_DELAY_MS);
      const dates=[...new Set(due.filter(event=>!finals.has(event.identity)).map(event=>dateKey(event.commenceTime)).filter(Boolean))];
      for(const date of dates.slice(0,2)){
        try{
          const response=await fetchJson(`${API}/historical/sports/${encodeURIComponent(sport.key)}/matches?date=${encodeURIComponent(date)}&pricedOnly=false`);totalCredits+=response.credits;resultDates.push(date);
          const raw=arrayPayload(response.data);rawResultRows+=raw.length;
          if(!sampleResultKeys.length&&raw[0]&&typeof raw[0]==='object'){
            sampleResultKeys=Object.keys(raw[0]).slice(0,30);sampleResult=sanitizedSample(raw[0]);
            const resolved=raw.find(item=>primitiveResult(item)||rawScore(item,'home')!==null||rawScore(item,'away')!==null);
            sampleResolvedResult=sanitizedSample(resolved);
          }
          for(const item of raw){
            const match=normalizeResult(item,sport.key,sport.game);if(!match)continue;
            const t=Date.parse(match.commenceTime);if(!Number.isFinite(t)||now-t>RESULT_CACHE_MS||t-now>6*3600_000)continue;
            finals.set(match.identity,match);acceptedFinals++;
          }
        }catch(error){console.error(`::warning::${sport.key} results ${date} failed: ${error?.message||error}`);}
      }
    }
    diagnostics.push({sportKey:sport.key,game:sport.game,eventCount:events.length,futureEvents:future.length,oddsCalled,oddsRows,resultDates,rawResultRows,acceptedFinals,sampleResultKeys,sampleResult,sampleResolvedResult});
  }

  moneylineRows.sort((a,b)=>a.commenceTime.localeCompare(b.commenceTime)||a.game.localeCompare(b.game)||a.selection.localeCompare(b.selection));
  const finalRows=[...finals.values()].sort((a,b)=>a.commenceTime.localeCompare(b.commenceTime)||a.game.localeCompare(b.game));
  const matches=Object.fromEntries(finalRows.map(match=>[match.id,match]));
  const generatedAt=new Date(now).toISOString();
  const oddsOutput={schemaVersion:1,meta:{source:'parlayapi-pinnacle',sport:'ESPORTS',fetchedAt:generatedAt,market:'matchWinner',finalSettlementSource:'parlayapi-results-archive',probabilityPolicy:'Only complete two-sided Pinnacle h2h markets are accepted and de-vigged. Started events are not priced from this snapshot.',rows:moneylineRows.length,estimatedCreditsUsed:totalCredits,diagnostics},rows:moneylineRows};
  const resultsOutput={schemaVersion:1,source:'parlayapi-results-archive',sport:'ESPORTS',generatedAt,finalOnly:true,liveCoverage:false,resultCoverage:['CS2','VALORANT','DOTA2'],cacheHours:72,matchCount:finalRows.length,matches};
  await fs.mkdir(OUT_DIR,{recursive:true});
  await fs.writeFile(ODDS_FILE,JSON.stringify(oddsOutput,null,2)+'\n');
  await fs.writeFile(RESULTS_FILE,JSON.stringify(resultsOutput,null,2)+'\n');
  console.log(`ESPORTS match feed: ${moneylineRows.length} Pinnacle selection rows, ${finalRows.length} cached finals, reported credits=${totalCredits}.`);
  for(const d of diagnostics)console.log(JSON.stringify(d));
}

main().catch(error=>{console.error('::error::',error?.stack||error);process.exit(1);});
