#!/usr/bin/env node
/**
 * Server-side NFL live snapshot builder.
 * Writes slates/nfl-live.json for the browser Gamecast. The file contains the
 * basic scoreboard state PLUS real current-drive plays, real live player box
 * stats, team stats, quarter linescores, scoring plays and recent play-by-play.
 *
 * Run from GitHub Actions, a cron job, or any server with Node 20+.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'slates','nfl-live.json');
const SLATE=path.join(ROOT,'slates','nfl.json');
const UA='TheSportsOutpost/1.0 (+https://thesportsoutpost.com)';
const SCOREBOARD='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100';
const SUMMARY=id=>`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(id)}`;
const ESPN_WEB_HOST='https://site.web.api.espn.com';

const clean=s=>String(s??'').trim();
const number=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
const normTeam=t=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());

async function getJson(url){
  const urls=[url];
  if(url.includes('://site.api.espn.com/')) urls.push(url.replace('://site.api.espn.com/', '://site.web.api.espn.com/'));
  let lastErr=null;
  for(const candidate of urls){
    try{
      const res=await fetch(candidate,{headers:{'user-agent':UA,'accept':'application/json','accept-language':'en-US,en;q=0.9','cache-control':'no-cache'}});
      if(res.ok) return res.json();
      lastErr=new Error(`${res.status} ${res.statusText} ${candidate}`);
    }catch(err){lastErr=err;}
  }
  throw lastErr||new Error(`ESPN request failed: ${url}`);
}
function clockMin(display){
  if(!display)return null; const parts=String(display).split(':');
  if(parts.length===2){const m=parseInt(parts[0],10),s=parseInt(parts[1],10);if(Number.isFinite(m)&&Number.isFinite(s))return m+s/60;}
  return number(display);
}
function competitor(comp,side){return (comp?.competitors||[]).find(c=>c.homeAway===side)||null;}
function teamAbbr(c){return normTeam(c?.team?.abbreviation||c?.team?.shortDisplayName||'');}

function baseLive(event){
  const comp=event?.competitions?.[0]; if(!comp)return null;
  const status=comp.status||event.status||{}; const type=status.type||{}; const state=type.state||'pre';
  const home=competitor(comp,'home'),away=competitor(comp,'away'); if(!home||!away)return null;
  const sit=comp.situation||{}; const possId=sit.possession!=null?String(sit.possession):null;
  let possession=null;
  if(possId&&String(home.team?.id)===possId)possession='home'; else if(possId&&String(away.team?.id)===possId)possession='away';
  let yardFromOwn=null,isRedZone=!!sit.isRedZone;
  const bl=sit.ballLocation;
  if(bl&&Number.isFinite(Number(bl.yardLine))&&bl.team?.id!=null&&possId){
    const own=String(bl.team.id)===possId; yardFromOwn=own?Number(bl.yardLine):100-Number(bl.yardLine); if(!own)isRedZone=yardFromOwn>=80;
  }
  return {
    status:state,statusDetail:type.shortDetail||type.detail||null,period:number(status.period)||0,clockMin:clockMin(status.displayClock||status.shortClock),
    awayScore:number(away.score),homeScore:number(home.score),awayAbbr:teamAbbr(away),homeAbbr:teamAbbr(home),
    possession,yardFromOwn,isRedZone,down:number(sit.down),distance:number(sit.distance),
    downDistanceText:sit.shortDownDistanceText||sit.downDistanceText||sit.possessionText||null,
    lastPlayText:sit.lastPlay?.text||sit.lastPlay?.shortText||null,
    linescores:{away:(away.linescores||[]).map(x=>number(x.value??x.displayValue)),home:(home.linescores||[]).map(x=>number(x.value??x.displayValue))},
  };
}

function playText(p){return p?.text||p?.shortText||p?.type?.text||'';}
function normalizePlay(p){
  const start=p?.start||{},end=p?.end||{},clock=p?.clock||{};
  return {
    id:String(p?.id??p?.sequenceNumber??''),text:playText(p),shortText:p?.shortText||null,
    period:number(p?.period?.number??p?.period),clock:clock.displayValue||p?.displayClock||null,
    down:number(start.down??p?.start?.down),distance:number(start.distance??p?.start?.distance),
    downDistanceText:start.shortDownDistanceText||p?.shortDownDistanceText||null,
    yardLine:number(start.yardLine??end.yardLine),team:normTeam(p?.team?.abbreviation||''),
    scoring:!!p?.scoringPlay,type:p?.type?.text||p?.type?.abbreviation||null,
    homeScore:number(p?.homeScore),awayScore:number(p?.awayScore),
  };
}
function normalizeDrive(d){
  if(!d)return null; const plays=(d.plays||[]).map(normalizePlay).filter(p=>p.text);
  const elapsed=d.timeElapsed?.displayValue||d.timeElapsed||d.elapsedTime||null;
  return {
    id:String(d.id??d.sequenceNumber??''),team:normTeam(d.team?.abbreviation||''),description:d.description||d.displayResult||d.result||null,
    result:d.displayResult||d.result||null,playCount:number(d.offensivePlays??d.plays?.length)??plays.length,
    yards:number(d.yards),elapsedDisplay:typeof elapsed==='string'?elapsed:null,startText:d.start?.text||d.start?.shortText||null,endText:d.end?.text||d.end?.shortText||null,
    plays,
  };
}
function currentDrive(summary){
  const d=summary?.drives||{}; return normalizeDrive(d.current)||normalizeDrive((d.previous||[]).at?.(-1)||(d.previous||[])[(d.previous||[]).length-1]);
}

function parsePlayerBox(summary){
  const out={byId:{},byName:{}};
  for(const teamBlock of summary?.boxscore?.players||[]){
    const team=normTeam(teamBlock?.team?.abbreviation||'');
    for(const cat of teamBlock?.statistics||[]){
      const category=cat?.name||cat?.type||'';
      const labels=cat?.labels||cat?.descriptions||cat?.keys||[];
      for(const row of cat?.athletes||[]){
        const a=row?.athlete||{}; const stats=row?.stats||row?.statistics||[];
        const obj=out.byId[String(a.id||'')]||{id:a.id?String(a.id):null,name:a.displayName||a.fullName||a.shortName||'',team,position:a.position?.abbreviation||'',jersey:a.jersey||null,categories:{},flat:{}};
        obj.team=team||obj.team; obj.categories[category]={};
        labels.forEach((label,i)=>{obj.categories[category][String(label)]=stats[i]??null;});
        // Stable stat extraction for the Gamecast overlay. ESPN label orders
        // vary by category, so use description names first and index fallbacks second.
        const lower=labels.map(x=>String(x).toLowerCase());
        const val=(names,idx)=>{for(const name of names){const j=lower.findIndex(x=>x===name||x.includes(name));if(j>=0)return stats[j]??null;}return idx!=null?stats[idx]??null:null;};
        if(category==='rushing'){
          obj.flat.carries=val(['car','rushing attempts','att'],0); obj.flat.rushYds=val(['yds','rushing yards'],1); obj.flat.rushTds=val(['td','rushing touchdowns'],3);
        }else if(category==='receiving'){
          obj.flat.receptions=val(['rec','receptions'],0); obj.flat.recYds=val(['yds','receiving yards'],2); obj.flat.recTds=val(['td','receiving touchdowns'],4); obj.flat.targets=val(['tgts','targets'],1);
        }else if(category==='passing'){
          obj.flat.compAtt=val(['c/att','comp/att','completions/attempts'],0); obj.flat.passYds=val(['yds','passing yards'],1); obj.flat.passTds=val(['td','passing touchdowns'],3); obj.flat.interceptions=val(['int','interceptions'],4);
        }
        if(obj.id)out.byId[obj.id]=obj; if(obj.name)out.byName[`${team}|${obj.name.toLowerCase()}`]=obj;
      }
    }
  }
  return out;
}

function parseFullBoxScore(summary){
  const teams={};
  for(const teamBlock of summary?.boxscore?.players||[]){
    const t=teamBlock?.team||{}; const abbr=normTeam(t.abbreviation||''); if(!abbr)continue;
    const sections=[];
    for(const cat of teamBlock?.statistics||[]){
      const labels=(cat?.labels||cat?.descriptions||cat?.keys||[]).map(x=>String(x));
      const rows=[];
      for(const row of cat?.athletes||[]){
        const a=row?.athlete||{};
        rows.push({
          id:a.id?String(a.id):null,name:a.displayName||a.fullName||a.shortName||'Player',jersey:a.jersey||null,
          position:a.position?.abbreviation||null,headshot:a.headshot?.href||null,
          stats:Array.isArray(row?.stats)?row.stats:Array.isArray(row?.statistics)?row.statistics:[],
        });
      }
      sections.push({
        name:cat?.name||cat?.type||'statistics',displayName:cat?.displayName||cat?.label||cat?.name||cat?.type||'Statistics',
        labels,rows,totals:Array.isArray(cat?.totals)?cat.totals:[],
      });
    }
    teams[abbr]={team:{id:t.id?String(t.id):null,abbr,name:t.displayName||t.shortDisplayName||t.name||abbr,logo:t.logo||null},sections};
  }
  return {teams};
}

function parseTeamStats(summary){
  const out={};
  for(const t of summary?.boxscore?.teams||[]){
    const abbr=normTeam(t?.team?.abbreviation||''); if(!abbr)continue; const stats={};
    for(const s of t.statistics||[]) stats[s.name||s.label]=s.displayValue??s.value??null;
    out[abbr]={
      totalYards:stats.totalYards??stats['Total Yards']??null,passingYards:stats.passingYards??stats.netPassingYards??null,
      rushingYards:stats.rushingYards??null,turnovers:stats.turnovers??null,firstDowns:stats.firstDowns??null,
      timeOfPossession:stats.possessionTime??stats.timeOfPossession??null,thirdDownEff:stats.thirdDownEff??null,
    };
  }
  return out;
}
function scoringPlays(summary){return (summary?.scoringPlays||[]).map(p=>({id:String(p.id??''),text:playText(p),period:number(p.period?.number??p.period),clock:p.clock?.displayValue||null,team:normTeam(p.team?.abbreviation||''),homeScore:number(p.homeScore),awayScore:number(p.awayScore),type:p.type?.text||null}));}
function recentPlays(summary){
  const all=[]; const drives=summary?.drives||{};
  for(const d of drives.previous||[]) for(const p of d.plays||[]) all.push(normalizePlay(p));
  if(drives.current) for(const p of drives.current.plays||[]) all.push(normalizePlay(p));
  if(!all.length&&Array.isArray(summary?.plays)) for(const p of summary.plays) all.push(normalizePlay(p));
  return all.filter(p=>p.text).slice(-30);
}
function mergeSummary(base,summary){
  if(!summary)return base;
  const headerComp=summary?.header?.competitions?.[0];
  if(headerComp){
    const faux={competitions:[headerComp],status:headerComp.status}; const fresh=baseLive(faux); if(fresh)base={...base,...fresh};
  }
  const drive=currentDrive(summary); const recent=recentPlays(summary); const players=parsePlayerBox(summary); const teams=parseTeamStats(summary);
  return {...base,currentDrive:drive,plays:recent,playerStats:players,boxScore:parseFullBoxScore(summary),teamStats:teams,scoringPlays:scoringPlays(summary),lastPlayText:recent.at(-1)?.text||base.lastPlayText||null};
}

async function main(){
  await fs.mkdir(path.dirname(OUT),{recursive:true});
  let slate=null; try{slate=JSON.parse(await fs.readFile(SLATE,'utf8'));}catch(_e){}
  const weekKey=String(slate?.slateId||[slate?.season,slate?.seasonType,slate?.week].filter(v=>v!=null).join('-w')||'unknown-week');
  const scoreboard=await getJson(SCOREBOARD); const events=scoreboard?.events||[]; const games={};
  const relevant=events.filter(e=>['pre','in','post'].includes(e?.status?.type?.state||e?.competitions?.[0]?.status?.type?.state));
  for(const event of relevant){
    const id=String(event.id||''); if(!id)continue; let live=baseLive(event); if(!live)continue;
    if(live.status==='in' || live.status==='post' || process.env.NFL_LIVE_INCLUDE_FINAL==='1'){
      try{live=mergeSummary(live,await getJson(SUMMARY(id)));}catch(err){live.summaryError=String(err?.message||err);}
    }
    live.lastFetchedAt=Date.now(); games[id]=live;
  }
  const active=Object.values(games).filter(g=>g.status==='in').length;
  let existing=null; try{existing=JSON.parse(await fs.readFile(OUT,'utf8'));}catch(_e){}
  const hadLive=Object.values(existing?.games||{}).some(g=>g?.status==='in');
  const weekChanged=String(existing?.weekKey||'')!==weekKey;
  // Between games, keep the accumulated weekly TD/box-score snapshot intact.
  // The ONLY automatic reset boundary is a new weekly slate (Tuesday morning).
  if(active===0 && !hadLive && !weekChanged){ console.log(`NFL live snapshot: ${weekKey} idle; weekly file preserved.`); return; }
  const out={schemaVersion:4,weekKey,season:slate?.season??null,seasonType:slate?.seasonType??null,week:slate?.week??null,lastFetchedAt:Date.now(),generatedAt:new Date().toISOString(),games};
  await fs.writeFile(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(`NFL live snapshot: ${weekChanged?`weekly reset -> ${weekKey}; `:``}${active} live / ${Object.keys(games).length} scoreboard games -> ${path.relative(ROOT,OUT)}`);
}
main().catch(err=>{console.error(err);process.exitCode=1;});
