#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'slates','mma-live.json');
const UA='ParlayPing/1.0';
const KEEP_MS=8*24*60*60*1000;
const FUTURE_MS=3*24*60*60*1000;
const BASE='https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard';

const clean=v=>String(v??'').trim();
const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
function dateKey(offset=0){
  const d=new Date(Date.now()+offset*86400000);
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const get=t=>p.find(x=>x.type===t)?.value||'';
  return `${get('year')}${get('month')}${get('day')}`;
}
async function getJson(url){
  const candidates=[url,url.replace('://site.api.espn.com/','://site.web.api.espn.com/')];
  let last;
  for(const candidate of candidates){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
    try{
      const r=await fetch(candidate,{headers:{accept:'application/json','user-agent':UA,'cache-control':'no-cache'},signal:controller.signal});
      if(r.ok)return r.json();
      last=new Error(`${r.status} ${r.statusText}`);
    }catch(e){last=e;}finally{clearTimeout(timer);}
  }
  throw last||new Error('ESPN MMA request failed');
}
async function readExisting(){try{return JSON.parse(await fs.readFile(OUT,'utf8'));}catch{return {fights:{}};}}
function withinRetention(v){const t=Date.parse(v||'');return Number.isFinite(t)&&t>=Date.now()-KEEP_MS&&t<=Date.now()+FUTURE_MS;}
function statusOf(comp){const t=comp?.status?.type||{};return {state:t.state||'pre',final:Boolean(t.completed)||t.state==='post',detail:t.shortDetail||t.detail||t.description||null};}
function fighter(c){return {id:String(c?.id||c?.athlete?.id||'')||null,name:c?.athlete?.displayName||c?.athlete?.fullName||c?.athlete?.shortName||null,winner:typeof c?.winner==='boolean'?c.winner:null,record:(c?.records||[]).find(r=>r?.name==='overall')?.summary||c?.records?.[0]?.summary||null};}
function fightFrom(event,comp){
  const cs=comp?.competitors||[];if(cs.length<2)return null;const st=statusOf(comp);const fighters=cs.slice(0,2).map(fighter);if(fighters.some(f=>!f.name))return null;
  return {
    id:String(comp.id||''),eventId:String(event?.id||''),event:event?.name||event?.shortName||null,
    weightClass:comp?.type?.abbreviation||comp?.type?.text||null,startTime:comp?.startDate||comp?.date||event?.date||null,
    state:st.state,final:st.final,statusDetail:st.detail,round:num(comp?.status?.period),clock:comp?.status?.displayClock||null,
    regulationRounds:num(comp?.format?.regulation?.periods),fighters
  };
}
async function main(){
  const existing=await readExisting();const fights={};
  for(const [id,f] of Object.entries(existing?.fights||{}))if(withinRetention(f?.startTime))fights[id]=f;
  const dates=[dateKey(-1),dateKey(0),dateKey(1)];const events=new Map();
  for(const date of dates){
    try{const board=await getJson(`${BASE}?dates=${date}&limit=500`);for(const event of board?.events||[])events.set(String(event.id||''),event);}
    catch(e){console.warn(`::warning::MMA scoreboard ${date}: ${e?.message||e}`);}
  }
  let live=0,final=0,pre=0;
  for(const event of events.values())for(const comp of event?.competitions||[]){const f=fightFrom(event,comp);if(!f||!withinRetention(f.startTime))continue;fights[f.id]=f;if(f.state==='in')live++;else if(f.final)final++;else pre++;}
  const out={schemaVersion:1,source:'espn-public',sport:'MMA',league:'UFC',generatedAt:new Date().toISOString(),dates,fights,meta:{eventCount:events.size,fightCount:Object.keys(fights).length,liveCount:live,finalCount:final,preCount:pre}};
  await fs.mkdir(path.dirname(OUT),{recursive:true});await fs.writeFile(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(`MMA live/final: ${out.meta.fightCount} cached fights, ${live} live, ${final} final, ${pre} pre.`);
}
main().catch(e=>{console.error('::error::ParlayPing MMA live refresh failed:',e?.stack||e);process.exit(1);});
