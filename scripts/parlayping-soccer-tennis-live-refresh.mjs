#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const UA='okhttp/4.12.0';
const KEEP_MS=8*24*60*60*1000;
const FUTURE_MS=4*24*60*60*1000;
const SOCCER_OUT=path.join(ROOT,'slates','soccer-live.json');
const TENNIS_OUT=path.join(ROOT,'slates','tennis-live.json');

const SOCCER_LEAGUES=[
  ['eng.1','English Premier League'],
  ['esp.1','LaLiga'],
  ['ger.1','Bundesliga'],
  ['ita.1','Serie A'],
  ['fra.1','Ligue 1'],
  ['usa.1','MLS']
];
const TENNIS_TOURS=[['atp','ATP'],['wta','WTA']];

const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFKD').replace(/[.'’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

function centralDateKey(offset=0){
  const d=new Date(Date.now()+offset*86400000);
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value||'';
  return `${get('year')}${get('month')}${get('day')}`;
}
async function getJson(url){
  const urls=[url,url.replace('://site.api.espn.com/','://site.web.api.espn.com/')];
  let last;
  for(const candidate of urls){
    try{
      const r=await fetch(candidate,{headers:{'user-agent':UA,accept:'application/json','cache-control':'no-cache'}});
      if(r.ok)return r.json();
      last=new Error(`${r.status} ${r.statusText} ${candidate}`);
    }catch(e){last=e;}
  }
  throw last||new Error(`ESPN request failed: ${url}`);
}
async function readExisting(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return {games:{},matches:{}};}}
function withinRetention(value){const t=Date.parse(value||'');return Number.isFinite(t)&&t>=Date.now()-KEEP_MS&&t<=Date.now()+FUTURE_MS;}
function statusOf(node){const t=node?.status?.type||{};return {state:t.state||'pre',completed:Boolean(t.completed),detail:t.shortDetail||t.detail||t.description||null};}
function competitor(comp,side){return (comp?.competitors||[]).find(c=>c.homeAway===side)||null;}
function statMap(stats){const out={};for(const s of stats||[]){const name=clean(s?.name);if(name)out[name]=num(s?.value??s?.displayValue);}return out;}
function soccerPlayer(row,team,events){
  const athlete=row?.athlete||{};const raw=statMap(row?.stats);const id=String(athlete.id||'');const eventStats=events.get(id)||{};
  const goals=raw.totalGoals??eventStats.goals??null;
  const yellowCards=raw.yellowCards??eventStats.yellowCards??null;
  const redCards=raw.redCards??eventStats.redCards??null;
  const assists=raw.goalAssists??null;
  return {
    id:id||null,name:athlete.displayName||athlete.fullName||athlete.shortName||null,team,
    position:row?.position?.abbreviation||athlete?.position?.abbreviation||null,starter:Boolean(row?.starter),active:Boolean(row?.active),
    appeared:(raw.appearances??0)>0||Boolean(row?.starter||row?.subbedIn),
    shots:raw.totalShots??null,shotsOnTarget:raw.shotsOnTarget??null,assists,goals,
    goalsAssists:Number.isFinite(goals)&&Number.isFinite(assists)?goals+assists:null,
    fouls:raw.foulsCommitted??null,yellowCards,redCards,
    cards:Number.isFinite(yellowCards)||Number.isFinite(redCards)?(yellowCards||0)+(redCards||0):null,
    saves:raw.saves??null,shotsFaced:raw.shotsFaced??null
  };
}
function soccerEventFallback(summary,event){
  const map=new Map();const all=[...(summary?.keyEvents||[]),...(event?.competitions?.[0]?.details||[])];
  for(const e of all){
    const type=clean(e?.type?.type||e?.type?.text).toLowerCase();
    const people=e?.participants||e?.athletesInvolved||[];
    for(const p of people){const a=p?.athlete||p||{};const id=String(a.id||'');if(!id)continue;const r=map.get(id)||{goals:0,yellowCards:0,redCards:0};if(type.includes('goal')&&!type.includes('own'))r.goals++;if(type.includes('yellow'))r.yellowCards++;if(type.includes('red'))r.redCards++;map.set(id,r);}
  }
  return map;
}
function baseSoccerGame(event,league,name){
  const comp=event?.competitions?.[0];if(!comp)return null;const home=competitor(comp,'home'),away=competitor(comp,'away');if(!home||!away)return null;const st=statusOf(event);
  return {id:String(event.id||comp.id||''),league,leagueName:name,startTime:event.date||comp.date||null,state:st.state,statusDetail:st.detail,final:st.completed||st.state==='post',clock:event?.status?.displayClock||comp?.status?.displayClock||null,period:num(event?.status?.period??comp?.status?.period),home:{id:String(home?.team?.id||''),abbr:home?.team?.abbreviation||null,name:home?.team?.displayName||home?.team?.name||null,score:num(home?.score)},away:{id:String(away?.team?.id||''),abbr:away?.team?.abbreviation||null,name:away?.team?.displayName||away?.team?.name||null,score:num(away?.score)},players:[]};
}
async function enrichSoccer(game,event,base,existing){
  if(game.state==='pre')return game;
  if(game.final&&existing?.final&&Array.isArray(existing.players)&&existing.players.length)return {...existing,...game,players:existing.players,lastStatsFetchAt:existing.lastStatsFetchAt};
  try{
    const summary=await getJson(`${base}/summary?event=${encodeURIComponent(game.id)}`);const fallback=soccerEventFallback(summary,event);const players=[];
    for(const roster of summary?.rosters||[]){const team=roster?.team?.abbreviation||roster?.team?.displayName||null;for(const row of roster?.roster||roster?.athletes||[]){const player=soccerPlayer(row,team,fallback);if(player.name)players.push(player);}}
    return {...game,players,lastStatsFetchAt:new Date().toISOString(),summaryError:null};
  }catch(e){return {...game,players:existing?.players||[],summaryError:String(e?.message||e)};}
}
async function buildSoccer(){
  const existing=await readExisting(SOCCER_OUT);const games={};for(const [id,g] of Object.entries(existing?.games||{}))if(withinRetention(g?.startTime))games[id]=g;
  const dates=[centralDateKey(-1),centralDateKey(0),centralDateKey(1)];let live=0,final=0,statsFetched=0;
  for(const [league,leagueName] of SOCCER_LEAGUES){
    const base=`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}`;const events=new Map();
    for(const date of dates){try{const b=await getJson(`${base}/scoreboard?dates=${date}&limit=500`);for(const e of b?.events||[])events.set(String(e.id||''),e);}catch(e){console.warn(`::warning::Soccer ${league} ${date}: ${e?.message||e}`);}}
    for(const [id,event] of events){if(!id)continue;const baseGame=baseSoccerGame(event,league,leagueName);if(!baseGame)continue;const before=games[id];const game=await enrichSoccer(baseGame,event,base,before);games[id]=game;if(game.state==='in')live++;if(game.final)final++;if(game.lastStatsFetchAt&&game.lastStatsFetchAt!==before?.lastStatsFetchAt)statsFetched++;}
  }
  return {schemaVersion:1,source:'espn-public',sport:'SOCCER',generatedAt:new Date().toISOString(),leagues:SOCCER_LEAGUES.map(([key,name])=>({key,name})),dates,games,meta:{liveCount:live,finalCount:final,statsFetched}};
}

function tennisStats(raw){const map={};for(const s of raw||[]){const n=norm(s?.name||s?.displayName||s?.abbreviation);const v=num(s?.value??s?.displayValue);if(!n||v===null)continue;map[n]=v;}const pick=(...names)=>{for(const name of names){const v=map[norm(name)];if(v!==undefined)return v;}return null;};return {aces:pick('aces','ace'),doubleFaults:pick('double faults','doubleFaults'),breakPointsWon:pick('break points won','breakPointsWon'),firstSetAces:pick('first set aces','firstSetAces')};}
function lines(c){return (c?.linescores||[]).map(x=>num(x?.value)).filter(v=>v!==null);}
function tennisPlayer(comp,c,other){
  const athlete=c?.athlete||{};const mine=lines(c),theirs=lines(other);let setsWon=0;const setCount=Math.max(mine.length,theirs.length);
  for(let i=0;i<setCount;i++){if(Number.isFinite(mine[i])&&Number.isFinite(theirs[i])&&mine[i]>theirs[i])setsWon++;}
  const extra=tennisStats(c?.statistics);
  return {id:String(c?.id||athlete?.id||'')||null,name:athlete.displayName||athlete.fullName||athlete.shortName||null,winner:typeof c?.winner==='boolean'?c.winner:null,linescores:mine,gamesWon:mine.length?mine.reduce((a,b)=>a+b,0):null,setsWon:mine.length?setsWon:null,setsPlayed:setCount||null,...extra};
}
function tennisMatch(event,group,comp,tour,tourName){
  const cs=comp?.competitors||[];if(cs.length<2)return null;const st=statusOf(comp);const a=tennisPlayer(comp,cs[0],cs[1]),b=tennisPlayer(comp,cs[1],cs[0]);if(!a.name||!b.name||/^tbd$/i.test(a.name)||/^tbd$/i.test(b.name))return null;const gamesPlayed=Number.isFinite(a.gamesWon)&&Number.isFinite(b.gamesWon)?a.gamesWon+b.gamesWon:null;const setsPlayed=Math.max(a.setsPlayed||0,b.setsPlayed||0)||null;
  return {id:String(comp.id||comp.uid||''),uid:comp.uid||null,tournamentId:String(event.id||comp.tournamentId||''),tournament:event.name||event.shortName||null,tour,tourName,group:group?.grouping?.slug||comp?.type?.slug||null,round:comp?.round?.displayName||null,startTime:comp.date||comp.startDate||event.date||null,state:st.state,statusDetail:st.detail,final:st.completed||st.state==='post',period:num(comp?.status?.period),bestOf:num(comp?.format?.regulation?.periods),gamesPlayed,setsPlayed,players:[a,b],note:(comp?.notes||[]).map(n=>n?.text).filter(Boolean).join(' | ')||null};
}
async function buildTennis(){
  const existing=await readExisting(TENNIS_OUT);const matches={};for(const [id,m] of Object.entries(existing?.matches||{}))if(withinRetention(m?.startTime))matches[id]=m;let live=0,final=0;
  for(const [tour,tourName] of TENNIS_TOURS){
    const base=`https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}`;
    try{
      const board=await getJson(`${base}/scoreboard?limit=500`);
      for(const event of board?.events||[])for(const group of event?.groupings||[]){const slug=group?.grouping?.slug||'';if(!slug.includes('singles'))continue;for(const comp of group?.competitions||[]){const match=tennisMatch(event,group,comp,tour,tourName);if(!match||!withinRetention(match.startTime))continue;matches[match.id]=match;if(match.state==='in')live++;if(match.final)final++;}}
    }catch(e){console.warn(`::warning::Tennis ${tour}: ${e?.message||e}`);}
  }
  return {schemaVersion:1,source:'espn-public',sport:'TENNIS',generatedAt:new Date().toISOString(),tours:TENNIS_TOURS.map(([key,name])=>({key,name})),matches,meta:{liveCount:live,finalCount:final}};
}

async function main(){
  const [soccer,tennis]=await Promise.all([buildSoccer(),buildTennis()]);await fs.mkdir(path.join(ROOT,'slates'),{recursive:true});await fs.writeFile(SOCCER_OUT,JSON.stringify(soccer,null,2)+'\n');await fs.writeFile(TENNIS_OUT,JSON.stringify(tennis,null,2)+'\n');
  console.log(`Soccer live/final: ${Object.keys(soccer.games).length} cached games, ${soccer.meta.liveCount} live, ${soccer.meta.finalCount} final, ${soccer.meta.statsFetched} summaries fetched.`);
  console.log(`Tennis live/final: ${Object.keys(tennis.matches).length} cached matches, ${tennis.meta.liveCount} live, ${tennis.meta.finalCount} final.`);
}
main().catch(e=>{console.error('::error::ParlayPing Soccer/Tennis live refresh failed:',e?.stack||e);process.exit(1);});
