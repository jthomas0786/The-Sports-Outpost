#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'slates','ncaaf-live.json');
const ESPN='https://site.api.espn.com/apis/site/v2/sports/football/college-football';
const UA='okhttp/4.12.0';
const KEEP_MS=8*24*60*60*1000;

const number=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const clean=v=>String(v??'').trim();
const normTeam=v=>clean(v).toUpperCase();
function dateKey(offset=0){
  const d=new Date(Date.now()+offset*86400000);
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value||'';
  return `${get('year')}${get('month')}${get('day')}`;
}
async function getJson(url){
  const candidates=[url,url.replace('://site.api.espn.com/','://site.web.api.espn.com/')];
  let last=null;
  for(const candidate of candidates){
    try{
      const r=await fetch(candidate,{headers:{'user-agent':UA,accept:'application/json','cache-control':'no-cache'}});
      if(r.ok)return r.json();
      last=new Error(`${r.status} ${r.statusText} ${candidate}`);
    }catch(e){last=e;}
  }
  throw last||new Error(`ESPN request failed: ${url}`);
}
function competitor(comp,side){return (comp?.competitors||[]).find(c=>c.homeAway===side)||null;}
function baseGame(event){
  const comp=event?.competitions?.[0]; if(!comp)return null;
  const type=(comp.status||event.status||{})?.type||{};
  const home=competitor(comp,'home'),away=competitor(comp,'away'); if(!home||!away)return null;
  return {
    id:String(event.id||comp.id||''),
    startTime:event.date||comp.date||null,
    state:type.state||'pre',
    statusDetail:type.shortDetail||type.detail||null,
    period:number(comp?.status?.period??event?.status?.period)??0,
    clock:comp?.status?.displayClock||event?.status?.displayClock||null,
    home:{id:String(home?.team?.id||''),abbr:normTeam(home?.team?.abbreviation),name:home?.team?.displayName||home?.team?.name||null,score:number(home?.score)},
    away:{id:String(away?.team?.id||''),abbr:normTeam(away?.team?.abbreviation),name:away?.team?.displayName||away?.team?.name||null,score:number(away?.score)},
    final:type.state==='post',
    playerStats:[]
  };
}
function parseCompAtt(v){
  const m=String(v??'').match(/^(\d+)\s*\/\s*(\d+)/); return m?{completions:Number(m[1]),attempts:Number(m[2])}:{completions:null,attempts:null};
}
function parsePlayerBox(summary){
  const players=new Map();
  for(const block of summary?.boxscore?.players||[]){
    const team=normTeam(block?.team?.abbreviation);
    for(const cat of block?.statistics||[]){
      const category=String(cat?.name||cat?.type||'').toLowerCase();
      const labels=(cat?.labels||cat?.descriptions||cat?.keys||[]).map(x=>String(x).toLowerCase());
      for(const row of cat?.athletes||[]){
        const a=row?.athlete||{},stats=row?.stats||row?.statistics||[];
        const id=String(a.id||''); const name=a.displayName||a.fullName||a.shortName||''; if(!name)continue;
        const key=id||`${team}|${name.toLowerCase()}`;
        const obj=players.get(key)||{id:id||null,name,team,position:a.position?.abbreviation||null,recYds:0,receptions:0,recTds:0,rushYds:0,rushTds:0,passYds:0,passTds:0,completions:0,attempts:0};
        const val=(names,fallback)=>{for(const needle of names){const i=labels.findIndex(x=>x===needle||x.includes(needle));if(i>=0)return stats[i]??null;}return fallback!=null?stats[fallback]??null:null;};
        if(category.includes('receiv')){
          obj.receptions=number(val(['rec','receptions'],0))??obj.receptions;
          obj.recYds=number(val(['yds','receiving yards'],2))??obj.recYds;
          obj.recTds=number(val(['td','receiving touchdowns'],4))??obj.recTds;
        }else if(category.includes('rush')){
          obj.rushYds=number(val(['yds','rushing yards'],1))??obj.rushYds;
          obj.rushTds=number(val(['td','rushing touchdowns'],3))??obj.rushTds;
        }else if(category.includes('pass')){
          const ca=parseCompAtt(val(['c/att','comp/att','completions/attempts'],0));
          obj.completions=ca.completions??obj.completions; obj.attempts=ca.attempts??obj.attempts;
          obj.passYds=number(val(['yds','passing yards'],1))??obj.passYds;
          obj.passTds=number(val(['td','passing touchdowns'],3))??obj.passTds;
        }
        players.set(key,obj);
      }
    }
  }
  return [...players.values()];
}
async function enrich(game,existing){
  if(game.state==='pre')return game;
  if(game.final&&existing?.final&&Array.isArray(existing.playerStats)&&existing.playerStats.length)return {...existing,...game,playerStats:existing.playerStats,lastStatsFetchAt:existing.lastStatsFetchAt};
  try{
    const summary=await getJson(`${ESPN}/summary?event=${encodeURIComponent(game.id)}`);
    return {...game,playerStats:parsePlayerBox(summary),lastStatsFetchAt:new Date().toISOString(),summaryError:null};
  }catch(e){return {...game,playerStats:existing?.playerStats||[],summaryError:String(e?.message||e)};}
}

async function main(){
  let existing={games:{}}; try{existing=JSON.parse(await fs.readFile(OUT,'utf8'));}catch(_){ }
  const retained={};
  for(const [id,g] of Object.entries(existing?.games||{})){
    const t=Date.parse(g?.startTime||''); if(Number.isFinite(t)&&t>Date.now()-KEEP_MS)retained[id]=g;
  }
  const dates=[dateKey(-1),dateKey(0),dateKey(1)];
  const events=[];
  for(const date of dates){
    try{const board=await getJson(`${ESPN}/scoreboard?dates=${date}&limit=500`);events.push(...(board?.events||[]));}
    catch(e){console.warn(`::warning::NCAAF ESPN scoreboard ${date} failed: ${e?.message||e}`);}
  }
  const unique=new Map(events.map(e=>[String(e.id||''),e]).filter(([id])=>id));
  let liveCount=0,finalCount=0,statsFetched=0;
  for(const [id,event] of unique){
    const base=baseGame(event); if(!base)continue;
    const before=retained[id]; const enriched=await enrich(base,before);
    if(enriched.state==='in')liveCount++; if(enriched.final)finalCount++;
    if(enriched.lastStatsFetchAt!==before?.lastStatsFetchAt)statsFetched++;
    retained[id]=enriched;
  }
  const out={schemaVersion:1,source:'espn-public',generatedAt:new Date().toISOString(),dates,games:retained};
  await fs.mkdir(path.dirname(OUT),{recursive:true}); await fs.writeFile(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(`NCAAF live/final: ${Object.keys(retained).length} cached games, ${liveCount} live, ${finalCount} final, ${statsFetched} summaries fetched.`);
}
main().catch(e=>{console.error('::error::NCAAF live poll failed:',e?.stack||e);process.exit(1);});
