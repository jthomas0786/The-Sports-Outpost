#!/usr/bin/env node
/**
 * Replay a completed ESPN NFL game into slates/nfl-live.json.
 * Usage:
 *   node scripts/nfl-replay.mjs --event 401671789 --delay 2500
 *   node scripts/nfl-replay.mjs --file fixtures/espn-summary.json --delay 1500
 *
 * This is a local/QA tool: it walks real play-by-play one play at a time so the
 * exact production Gamecast can be tested before opening day.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args=Object.fromEntries(process.argv.slice(2).map((v,i,a)=>v.startsWith('--')?[v.slice(2),a[i+1]&&!a[i+1].startsWith('--')?a[i+1]:true]:null).filter(Boolean));
const ROOT=process.cwd();
const OUT=path.join(ROOT,'slates','nfl-live.json');
const delay=Math.max(250,Number(args.delay||2500));
const UA='TheSportsOutpost/1.0 (+https://thesportsoutpost.com)';
const eventId=args.event?String(args.event):null;

async function loadSummary(){
  if(args.file) return JSON.parse(await fs.readFile(path.resolve(ROOT,String(args.file)),'utf8'));
  if(!eventId) throw new Error('Provide --event <ESPN event id> or --file <summary.json>');
  const url=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(eventId)}`;
  const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json'}});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const norm=t=>({LAR:'LA',JAC:'JAX',WAS:'WSH'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
function normalizePlay(p){const s=p?.start||{};return{id:String(p?.id||p?.sequenceNumber||''),text:p?.text||p?.shortText||'',period:num(p?.period?.number??p?.period),clock:p?.clock?.displayValue||null,down:num(s.down),distance:num(s.distance),downDistanceText:s.shortDownDistanceText||p?.shortDownDistanceText||null,team:norm(p?.team?.abbreviation||''),scoring:!!p?.scoringPlay,homeScore:num(p?.homeScore),awayScore:num(p?.awayScore),type:p?.type?.text||null}};
function allPlays(summary){const out=[];const d=summary?.drives||{};for(const dr of d.previous||[])for(const p of dr.plays||[])out.push(normalizePlay(p));if(d.current)for(const p of d.current.plays||[])out.push(normalizePlay(p));if(!out.length)for(const p of summary?.plays||[])out.push(normalizePlay(p));return out.filter(p=>p.text)}
function header(summary){const c=summary?.header?.competitions?.[0];if(!c)throw new Error('No competition in summary');const home=(c.competitors||[]).find(x=>x.homeAway==='home'),away=(c.competitors||[]).find(x=>x.homeAway==='away');return{home,away,c}}
function driveForPlay(summary,playId){const d=summary?.drives||{};for(const dr of [...(d.previous||[]),...(d.current?[d.current]:[])])if((dr.plays||[]).some(p=>String(p.id||p.sequenceNumber||'')===String(playId)))return dr;return null}
function playerStats(summary){
  const out={byId:{},byName:{}};
  for(const t of summary?.boxscore?.players||[]){
    const team=norm(t?.team?.abbreviation||'');
    for(const cat of t.statistics||[]){
      const labels=cat.labels||[];
      for(const row of cat.athletes||[]){
        const a=row.athlete||{};
        const obj=out.byId[String(a.id||'')]||{id:a.id?String(a.id):null,name:a.displayName||a.fullName||'',team,position:a.position?.abbreviation||'',flat:{}};
        const l=labels.map(x=>String(x).toLowerCase()),s=row.stats||[];
        const v=(names,idx)=>{for(const nm of names){const j=l.findIndex(x=>x===nm||x.includes(nm));if(j>=0)return s[j]??null}return idx!=null?s[idx]??null:null};
        if(cat.name==='rushing'){obj.flat.carries=v(['car','att'],0);obj.flat.rushYds=v(['yds'],1);obj.flat.rushTds=v(['td'],3)}
        if(cat.name==='receiving'){obj.flat.receptions=v(['rec'],0);obj.flat.targets=v(['tgts','targets'],1);obj.flat.recYds=v(['yds'],2);obj.flat.recTds=v(['td'],4)}
        if(cat.name==='passing'){obj.flat.compAtt=v(['c/att','comp/att'],0);obj.flat.passYds=v(['yds'],1);obj.flat.passTds=v(['td'],3)}
        if(obj.id) out.byId[obj.id]=obj;
        if(obj.name) out.byName[`${team}|${obj.name.toLowerCase()}`]=obj;
      }
    }
  }
  return out;
}

function teamStats(summary){const out={};for(const t of summary?.boxscore?.teams||[]){const a=norm(t?.team?.abbreviation||'');const s={};for(const x of t.statistics||[])s[x.name||x.label]=x.displayValue??x.value??null;out[a]={totalYards:s.totalYards??null,passingYards:s.netPassingYards??s.passingYards??null,rushingYards:s.rushingYards??null,turnovers:s.turnovers??null,timeOfPossession:s.possessionTime??null}}return out}
async function writeFrame(summary,plays,i){const {home,away,c}=header(summary);const p=plays[i];const dr=driveForPlay(summary,p.id);const drPlays=(dr?.plays||[]).map(normalizePlay).filter(x=>plays.findIndex(y=>y.id===x.id)<=i);const possession=p.team===norm(home.team?.abbreviation)?'home':p.team===norm(away.team?.abbreviation)?'away':null;const gl={status:i===plays.length-1?'post':'in',statusDetail:i===plays.length-1?'Final':`${p.period?`Q${p.period}`:'LIVE'} ${p.clock||''}`.trim(),period:p.period||1,clockMin:p.clock&&p.clock.includes(':')?Number(p.clock.split(':')[0])+Number(p.clock.split(':')[1])/60:null,awayScore:p.awayScore??0,homeScore:p.homeScore??0,awayAbbr:norm(away.team?.abbreviation),homeAbbr:norm(home.team?.abbreviation),possession,yardFromOwn:null,isRedZone:false,down:p.down,distance:p.distance,downDistanceText:p.downDistanceText,lastPlayText:p.text,currentDrive:dr?{id:String(dr.id||''),team:norm(dr.team?.abbreviation||p.team),description:dr.description||dr.displayResult||null,result:dr.displayResult||dr.result||null,playCount:drPlays.length,yards:num(dr.yards),elapsedDisplay:dr.timeElapsed?.displayValue||null,plays:drPlays}:null,plays:plays.slice(Math.max(0,i-29),i+1),playerStats:playerStats(summary),teamStats:teamStats(summary),scoringPlays:plays.slice(0,i+1).filter(x=>x.scoring),lastFetchedAt:Date.now()};const id=String(summary?.header?.id||c.id||eventId||'replay');await fs.mkdir(path.dirname(OUT),{recursive:true});await fs.writeFile(OUT,JSON.stringify({schemaVersion:2,replay:true,replayIndex:i,replayTotal:plays.length,lastFetchedAt:Date.now(),games:{[id]:gl}},null,2)+'\n')}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){const summary=await loadSummary();const plays=allPlays(summary);if(!plays.length)throw new Error('No plays found');console.log(`Replaying ${plays.length} plays -> ${OUT}`);for(let i=0;i<plays.length;i++){await writeFrame(summary,plays,i);console.log(`${i+1}/${plays.length}: ${plays[i].text}`);if(i<plays.length-1)await sleep(delay)}}
main().catch(e=>{console.error(e);process.exitCode=1});
