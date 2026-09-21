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
const num=v=>Number.isFinite(Number(v))?Number(v):0;
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
  const m=text.match(/\bto\s+([A-Z][^,;]*?)(?:\s+for\s+|\s+to\s+[A-Z]{2,3}\s+\d+|\.|,|$)/i);
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
async function fetchSummary(gameId){
  const base=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(gameId)}`;
  const urls=[base,base.replace('://site.api.espn.com/','://site.web.api.espn.com/')];
  const errors=[];
  for(const url of urls){
    try{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      const res=await fetch(url,{signal:controller.signal,headers:{'user-agent':UA,accept:'application/json,text/plain,*/*','accept-language':'en-US,en;q=0.9',referer:'https://www.espn.com/'}});clearTimeout(timer);
      if(!res.ok){errors.push(`${new URL(url).host}:${res.status}`);continue;}
      const json=await res.json();
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
  const targetsByGame=new Map(),wantedByPlayer=new Map();

  for(const p of currentPlayers){
    const key=playerKey(p),wanted=[];
    for(const row of (p.gameLog||[]).slice(0,10))if(row?.gameId)wanted.push(row);
    for(const row of (p.gameLog||[]).filter(r=>normTeam(r?.opponent)===normTeam(p?.opponent)).slice(0,10))if(row?.gameId&&!wanted.some(x=>String(x.gameId)===String(row.gameId)))wanted.push(row);
    wantedByPlayer.set(key,wanted);
    const existing=new Map((p.periodGameLog||[]).map(r=>[String(r.gameId),r]));
    for(const meta of wanted){
      const gid=String(meta.gameId);if(existing.has(gid))continue;
      if(!targetsByGame.has(gid))targetsByGame.set(gid,[]);
      const list=targetsByGame.get(gid);
      if(!list.some(x=>x.key===key))list.push({key,name:p.name,espnId:p.espnId,gsisId:p.gsisId,team:p.team});
    }
  }

  const gameIds=[...targetsByGame.keys()];
  let fetched=0,failed=0;
  const parsedByGame=new Map();
  await parallelMap(gameIds,8,async gid=>{
    try{
      const summary=await fetchSummary(gid),parsed=parsePeriodHistorySummary(summary,targetsByGame.get(gid));
      parsedByGame.set(gid,parsed);fetched++;
    }catch(err){failed++;console.warn(`period history ${gid}: ${String(err?.message||err)}`);}
  });

  for(const p of currentPlayers){
    const key=playerKey(p),baseById=new Map((p.gameLog||[]).map(r=>[String(r.gameId),r])),existing=new Map((p.periodGameLog||[]).map(r=>[String(r.gameId),r]));
    for(const meta of wantedByPlayer.get(key)||[]){
      const gid=String(meta.gameId),parsed=parsedByGame.get(gid)?.get(key);
      if(!parsed)continue;
      existing.set(gid,{
        gameId:gid,season:meta.season??null,week:meta.week??null,date:meta.date??null,team:meta.team||p.team,opponent:meta.opponent||null,homeAway:meta.homeAway||null,
        firstTd:parsed.firstTd,periods:parsed.periods,source:'ESPN play-by-play',
      });
    }
    const order=new Map((p.gameLog||[]).map((r,i)=>[String(r.gameId),i]));
    p.periodGameLog=[...existing.values()].filter(r=>baseById.has(String(r.gameId))).sort((a,b)=>(order.get(String(a.gameId))??999)-(order.get(String(b.gameId))??999));
    p.periodHistoryMeta={source:'ESPN play-by-play',updatedAt:new Date().toISOString(),games:p.periodGameLog.length};
  }

  research.sources={...(research.sources||{}),espnPeriodHistory:'Historical Q1-Q4 and half splits derived from ESPN play-by-play for current-slate players'};
  research.sourceHealth={...(research.sourceHealth||{}),espnPeriodHistory:{ok:fetched>0||gameIds.length===0,requested:gameIds.length,fetched,failed,cached:currentPlayers.reduce((n,p)=>n+(p.periodGameLog?.length||0),0)}};
  research.generatedAt=new Date().toISOString();
  await fs.writeFile(RESEARCH_PATH,JSON.stringify(research,null,2)+'\n');
  console.log(`NFL period history: ${currentPlayers.length} current-slate players · ${gameIds.length} game summaries requested · ${fetched} fetched · ${failed} failed`);
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked)main().catch(err=>{console.error(err);process.exitCode=1;});

export const __NFL_PERIOD_HISTORY_TEST__={emptyStats,addStats,playerAliases,rawPlays,periodOf,yardsFrom,parsePeriodHistorySummary};
