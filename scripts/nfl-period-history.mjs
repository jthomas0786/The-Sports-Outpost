#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT=process.cwd();
const RESEARCH_PATH=path.join(ROOT,'slates','nfl-research.json');
const SLATE_PATH=path.join(ROOT,'slates','nfl.json');
const UA='TheSportsOutpost/1.0 (+https://thesportsoutpost.com)';
const STAT_KEYS=['rushYds','recYds','receptions','passYds','passTds','completions','rushTds','recTds','tds'];
const PERIODS=['q1','q2','q3','q4'];

const normTeam=t=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const clean=s=>String(s??'').trim();
const compact=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const emptyStats=()=>Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
const addStats=(a,b)=>Object.fromEntries(STAT_KEYS.map(k=>[k,Number(a?.[k]||0)+Number(b?.[k]||0)]));
const playerKey=p=>String(p?.espnId||p?.gsisId||`${normTeam(p?.team)}|${compact(p?.name)}`);

function nameParts(name){
  const parts=clean(name).replace(/\b(Jr\.?|Sr\.?|II|III|IV|V)\b/gi,'').trim().split(/\s+/).filter(Boolean);
  return {first:parts[0]||'',last:parts.at(-1)||''};
}
function playerAliases(name){
  const {first,last}=nameParts(name),out=new Set();
  if(first&&last){out.add(compact(`${first[0]}${last}`));out.add(compact(`${first}${last}`));}
  if(last)out.add(compact(last));
  return [...out].filter(Boolean);
}
function rawPlays(summary){
  const drives=summary?.drives||{},groups=[...(drives.previous||[]),...(drives.current?[drives.current]:[])];
  if(!groups.length)return summary?.plays||[];
  const out=[],seen=new Set();
  for(const drive of groups){
    for(const play of drive?.plays||[]){
      const id=String(play?.id||play?.sequenceNumber||JSON.stringify([play?.period,play?.clock,play?.text]));
      if(seen.has(id))continue;seen.add(id);out.push(play);
    }
  }
  return out;
}
function periodOf(play){
  const p=Number(play?.period?.number??play?.period);
  return Number.isFinite(p)&&p>=1&&p<=4?`q${p}`:null;
}
function playType(play){return String(play?.type?.text||play?.type||'');}
function playText(play){return String(play?.text||play?.shortText||'');}
function yardsFrom(text){
  if(/for\s+no\s+gain/i.test(text))return 0;
  const m=text.match(/for\s+(-?\d+)\s+yards?/i);
  return m?Number(m[1]):0;
}
function tokenMatches(text,targets){
  const compactText=compact(text),hits=[];
  for(const target of targets){
    let best=-1;
    for(const alias of target.aliases){const i=compactText.indexOf(alias);if(i>=0&&(best<0||i<best))best=i;}
    if(best>=0)hits.push({target,index:best});
  }
  return hits.sort((a,b)=>a.index-b.index);
}
function firstMatched(text,targets){return tokenMatches(text,targets)[0]?.target||null;}
function receiverMatched(text,targets){
  const m=text.match(/\bto\s+(.+?)(?=\s+for\s+(?:-?\d+\s+yards?|no\s+gain)\b|\s+to\s+[A-Z]{2,4}\s+\d+\b|,|$)/i);
  if(!m)return null;
  return firstMatched(m[1],targets);
}
function passerMatched(text,targets){
  const idx=text.toLowerCase().indexOf(' pass');
  if(idx<0)return null;
  return firstMatched(text.slice(0,idx+1),targets);
}
function isRushLike(play,text){
  const type=playType(play);
  if(/rush|rushing|run/i.test(type))return true;
  if(/\b(scrambles?|kneels?)\b/i.test(text))return true;
  return false;
}

export function parsePeriodHistorySummary(summary,targetPlayers=[]){
  const targets=targetPlayers.map(p=>({...p,key:playerKey(p),aliases:playerAliases(p.name)}));
  const byKey=new Map(targets.map(t=>[t.key,{key:t.key,name:t.name,periods:Object.fromEntries(PERIODS.map(q=>[q,emptyStats()])),firstTd:0}]));
  let firstTouchdownSeen=false,firstTouchdownScorer=null;

  for(const play of rawPlays(summary)){
    const period=periodOf(play),text=playText(play);
    if(!period||!text||/\bno play\b/i.test(text))continue;
    const touchdown=/touchdown/i.test(text),isPass=/\bpass(?:es)?\b/i.test(text)&&!/\bsacked\b/i.test(text);
    let scorer=null;

    if(isPass){
      const passer=passerMatched(text,targets),complete=!/\bincomplete\b|\bintercepted\b/i.test(text)&&/\bto\b/i.test(text),receiver=complete?receiverMatched(text,targets):null,yards=complete?yardsFrom(text):0;
      if(passer){
        const st=byKey.get(passer.key).periods[period];
        if(complete){st.completions+=1;st.passYds+=yards;}
        if(touchdown)st.passTds+=1;
      }
      if(receiver&&complete){
        const st=byKey.get(receiver.key).periods[period];
        st.receptions+=1;st.recYds+=yards;
        if(touchdown){st.recTds+=1;st.tds+=1;scorer=receiver;}
      }
    }else if(isRushLike(play,text)){
      const rusher=firstMatched(text,targets),yards=yardsFrom(text);
      if(rusher){
        const st=byKey.get(rusher.key).periods[period];
        st.rushYds+=yards;
        if(touchdown){st.rushTds+=1;st.tds+=1;scorer=rusher;}
      }
    }

    if(touchdown&&!firstTouchdownSeen){
      firstTouchdownSeen=true;
      firstTouchdownScorer=scorer?.key||null;
    }
  }

  for(const rec of byKey.values()){
    rec.periods['1h']=addStats(rec.periods.q1,rec.periods.q2);
    rec.periods['2h']=addStats(rec.periods.q3,rec.periods.q4);
    rec.firstTd=firstTouchdownSeen&&firstTouchdownScorer===rec.key?1:0;
  }
  return byKey;
}

async function readJson(file,fallback=null){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return fallback;}}
async function espnJson(url){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{'user-agent':UA,accept:'application/json,text/plain,*/*','accept-language':'en-US,en;q=0.9',referer:'https://www.espn.com/'}});
    if(!res.ok)throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  }finally{clearTimeout(timer);}
}
const scoreboardCache=new Map();
async function scoreboardForDate(date){
  const key=String(date||'').replace(/[^0-9]/g,'').slice(0,8);
  if(key.length!==8)return [];
  if(scoreboardCache.has(key))return scoreboardCache.get(key);
  const promise=(async()=>{
    const urls=[
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${key}&limit=100`,
      `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${key}&limit=100`,
    ];
    let last=null;
    for(const url of urls){try{return (await espnJson(url))?.events||[];}catch(err){last=err;}}
    throw last||new Error('ESPN scoreboard unavailable');
  })();
  scoreboardCache.set(key,promise);
  return promise;
}
function eventTeams(event){
  const comp=event?.competitions?.[0],teams={home:'',away:''};
  for(const c of comp?.competitors||[]){const side=String(c?.homeAway||'').toLowerCase();if(side==='home'||side==='away')teams[side]=normTeam(c?.team?.abbreviation||c?.team?.shortDisplayName||'');}
  return teams;
}
async function resolveEspnGameId(meta){
  const direct=clean(meta?.espnGameId||'');
  if(/^\d{6,}$/.test(direct))return direct;
  const raw=clean(meta?.gameId||'');
  if(/^\d{6,}$/.test(raw))return raw;
  if(!meta?.date)return null;
  const team=normTeam(meta?.team),opp=normTeam(meta?.opponent);
  const expectedHome=meta?.homeAway==='home'?team:meta?.homeAway==='away'?opp:null;
  const expectedAway=meta?.homeAway==='away'?team:meta?.homeAway==='home'?opp:null;
  try{
    const events=await scoreboardForDate(meta.date);
    const event=events.find(e=>{
      const t=eventTeams(e);
      if(expectedHome&&expectedAway)return t.home===expectedHome&&t.away===expectedAway;
      return new Set([t.home,t.away]).size===2&&[t.home,t.away].includes(team)&&[t.home,t.away].includes(opp);
    });
    return event?.id?String(event.id):null;
  }catch{return null;}
}
async function fetchSummary(gameId){
  const base=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(gameId)}`;
  const urls=[base,base.replace('://site.api.espn.com/','://site.web.api.espn.com/')];
  const errors=[];
  for(const url of urls){
    try{
      const json=await espnJson(url);
      if(!rawPlays(json).length){errors.push(`${new URL(url).host}:no plays`);continue;}
      return json;
    }catch(err){errors.push(`${new URL(url).host}:${String(err?.message||err)}`);}
  }
  throw new Error(errors.join(' | ')||'ESPN summary unavailable');
}
async function parallelMap(items,limit,fn){
  const out=new Array(items.length);let next=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i);}});
  await Promise.all(workers);return out;
}

async function main(){
  const research=await readJson(RESEARCH_PATH,null),slate=await readJson(SLATE_PATH,{games:[]});
  if(!research?.players?.length)throw new Error('slates/nfl-research.json is missing or empty');
  const slateIds=new Set((slate?.games||[]).map(g=>String(g.gameId||g.id||'')).filter(Boolean));
  const currentPlayers=(research.players||[]).filter(p=>p?.gameId&&slateIds.has(String(p.gameId))&&Array.isArray(p.gameLog)&&p.gameLog.length);
  const targetsByEspnGame=new Map(),wantedByPlayer=new Map(),resolvedBySourceGame=new Map();

  for(const p of currentPlayers){
    const key=playerKey(p),wanted=[];
    for(const row of (p.gameLog||[]).slice(0,10))if(row?.gameId)wanted.push(row);
    for(const row of (p.gameLog||[]).filter(r=>normTeam(r?.opponent)===normTeam(p?.opponent)).slice(0,10))if(row?.gameId&&!wanted.some(x=>String(x.gameId)===String(row.gameId)))wanted.push(row);
    wantedByPlayer.set(key,wanted);
  }

  const uniqueMeta=new Map();
  for(const wanted of wantedByPlayer.values())for(const meta of wanted)uniqueMeta.set(String(meta.gameId),meta);
  await parallelMap([...uniqueMeta.entries()],8,async([sourceId,meta])=>{
    const espnId=await resolveEspnGameId(meta);
    if(espnId)resolvedBySourceGame.set(sourceId,espnId);
  });

  for(const p of currentPlayers){
    const key=playerKey(p),existing=new Map((p.periodGameLog||[]).map(r=>[String(r.gameId),r]));
    for(const meta of wantedByPlayer.get(key)||[]){
      const sourceId=String(meta.gameId);if(existing.has(sourceId))continue;
      const espnId=resolvedBySourceGame.get(sourceId);if(!espnId)continue;
      if(!targetsByEspnGame.has(espnId))targetsByEspnGame.set(espnId,[]);
      const list=targetsByEspnGame.get(espnId);
      if(!list.some(x=>x.key===key))list.push({key,name:p.name,espnId:p.espnId,gsisId:p.gsisId,team:p.team});
    }
  }

  const gameIds=[...targetsByEspnGame.keys()];
  let fetched=0,failed=0;
  const parsedByEspnGame=new Map();
  await parallelMap(gameIds,6,async espnId=>{
    try{
      const summary=await fetchSummary(espnId),parsed=parsePeriodHistorySummary(summary,targetsByEspnGame.get(espnId));
      parsedByEspnGame.set(espnId,parsed);fetched++;
    }catch(err){failed++;console.warn(`period history ESPN ${espnId}: ${String(err?.message||err)}`);}
  });

  for(const p of currentPlayers){
    const key=playerKey(p),baseById=new Map((p.gameLog||[]).map(r=>[String(r.gameId),r])),existing=new Map((p.periodGameLog||[]).map(r=>[String(r.gameId),r]));
    for(const meta of wantedByPlayer.get(key)||[]){
      const sourceId=String(meta.gameId),espnId=resolvedBySourceGame.get(sourceId),parsed=espnId?parsedByEspnGame.get(espnId)?.get(key):null;
      if(!parsed)continue;
      existing.set(sourceId,{
        gameId:sourceId,espnGameId:espnId,season:meta.season??null,week:meta.week??null,date:meta.date??null,team:meta.team||p.team,opponent:meta.opponent||null,homeAway:meta.homeAway||null,
        firstTd:parsed.firstTd,periods:parsed.periods,source:'ESPN play-by-play',
      });
    }
    const order=new Map((p.gameLog||[]).map((r,i)=>[String(r.gameId),i]));
    p.periodGameLog=[...existing.values()].filter(r=>baseById.has(String(r.gameId))).sort((a,b)=>(order.get(String(a.gameId))??999)-(order.get(String(b.gameId))??999));
    p.periodHistoryMeta={source:'ESPN play-by-play',updatedAt:new Date().toISOString(),games:p.periodGameLog.length};
  }

  const unresolved=uniqueMeta.size-resolvedBySourceGame.size;
  research.sources={...(research.sources||{}),espnPeriodHistory:'Historical Q1-Q4 and half splits derived from ESPN play-by-play for current-slate players'};
  research.sourceHealth={...(research.sourceHealth||{}),espnPeriodHistory:{ok:fetched>0||gameIds.length===0,sourceGames:uniqueMeta.size,resolvedGameIds:resolvedBySourceGame.size,unresolvedGameIds:unresolved,requested:gameIds.length,fetched,failed,cached:currentPlayers.reduce((n,p)=>n+(p.periodGameLog?.length||0),0)}};
  research.generatedAt=new Date().toISOString();
  await fs.writeFile(RESEARCH_PATH,JSON.stringify(research,null,2)+'\n');
  console.log(`NFL period history: ${currentPlayers.length} current-slate players · ${resolvedBySourceGame.size}/${uniqueMeta.size} nflverse games resolved to ESPN · ${gameIds.length} summaries requested · ${fetched} fetched · ${failed} failed`);
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked)main().catch(err=>{console.error(err);process.exitCode=1;});

export const __NFL_PERIOD_HISTORY_TEST__={emptyStats,addStats,playerAliases,rawPlays,periodOf,yardsFrom,parsePeriodHistorySummary,eventTeams};
