/* TSO 2.0 NBA Opening Possession Research.
 * ESPN observed made FIELD GOALS only; never a calibrated betting model. */
const ORIGIN='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const HEADERS={'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','content-type':'application/json; charset=utf-8'};
const ALIAS={GSW:'GS',NYK:'NY',NOP:'NO',SAS:'SA',UTA:'UTAH',PHX:'PHO'};
const num=x=>x==null||x===''?null:Number.isFinite(+x)?+x:null;
const ident=x=>String(x||'').replace(/[^0-9]/g,'');
const norm=x=>String(x||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const respond=(value,status=200,ttl=600)=>new Response(JSON.stringify(value),{status,headers:{...HEADERS,'cache-control':'public, max-age='+ttl}});
const yearEnd=t=>{const d=new Date(t);return d.getUTCFullYear()+(d.getUTCMonth()>=6?1:0)};
async function espn(url){const r=await fetch(ORIGIN+url,{signal:AbortSignal.timeout(9000),cf:{cacheEverything:true,cacheTtl:1800}});if(!r.ok)throw Error('ESPN '+r.status);return r.json()}
function games(d,season,cutoff){
 return (d?.events||[]).map(e=>({id:ident(e.id),date:Date.parse(e.date||e.competitions?.[0]?.date),status:String(e.status?.type?.name||e.competitions?.[0]?.status?.type?.name||'').toLowerCase(),season}))
 .filter(e=>e.id&&Number.isFinite(e.date)&&e.date<cutoff&&(/final|post/.test(e.status)||e.date<cutoff-5*3600000))
 .sort((a,b)=>b.date-a.date);
}
async function history(code,year,cutoff){
 const name=(ALIAS[code]||code).toLowerCase();
 const [now,prev]=await Promise.all([
 espn('teams/'+name+'/schedule?season='+year+'&seasontype=2'),
 espn('teams/'+name+'/schedule?season='+(year-1)+'&seasontype=2')]);
 return [...games(now,year,cutoff).slice(0,20),...games(prev,year-1,cutoff).slice(0,10)];
}
async function parallel(items,callback){let next=0;const result=new Array(items.length);await Promise.all(Array.from({length:Math.min(8,items.length)},async()=>{while(next<items.length){let k=next++;try{result[k]=await callback(items[k])}catch(e){result[k]=null}}}));return result.filter(Boolean)}
function roster(summary){
 const result=new Map();
 for(const group of summary?.boxscore?.players||[])for(const stat of group.statistics||[])for(const entry of stat.athletes||[]){
  const a=entry.athlete||{},id=ident(a.id);
  if(id)result.set(id,{id,name:String(a.displayName||a.fullName||a.shortName||''),team:String(group.team?.id||''),starter:entry.starter===true});
 }
 return result;
}
function period(p){return num(p.period?.number??p.period?.value??p.period)}
function attempt(p){
 const type=String(p.type?.text||p.type?.name||'').toLowerCase(),text=String(p.text||'').toLowerCase();
 return !/free throw/.test(type+' '+text)&&
  (p.shootingPlay===true||/made shot|missed shot/.test(type)||(/\b(makes|misses)\b/.test(text)&&/\b(shot|jumper|layup|dunk|hook|tip|3-pt|foot)\b/.test(text)));
}
function made(p){return attempt(p)&&(p.scoringPlay===true||/made shot/i.test(p.type?.text||'')||(/\bmakes\b/i.test(p.text||'')&&(num(p.scoreValue)||0)>=2))}
function person(p,players){
 const a=p.participants?.[0]?.athlete||p.athlete||{},id=ident(a.id);
 if(id&&players.has(id))return players.get(id);
 const name=String(p.text||'').match(/^(.+?)\s+(makes|misses)\s/i)?.[1],needle=norm(name);
 if(needle){const found=[...players.values()].find(q=>norm(q.name)===needle||norm(q.name).endsWith(needle));if(found)return found}
 return id?{id,name:String(a.displayName||a.fullName||''),team:String(p.team?.id||'')}:null;
}
function jumpTeam(p,players,known){
 if(!p)return null;
 const tip=String(p.text||'').match(/tip to\s+(.+?)(?:[.,;]|$)/i)?.[1];
 if(tip){
  const matches=[...players.values()].filter(x=>norm(x.name)===norm(tip)||norm(x.name).endsWith(norm(tip)));
  const unique=new Set(matches.map(x=>x.team).filter(Boolean));
  if(unique.size===1&&known.has([...unique][0]))return [...unique][0];
 }
 const direct=String(p.team?.id||'');
 return known.has(direct)?direct:null;
}
function observe(summary,season){
 const people=roster(summary),competitors=summary?.header?.competitions?.[0]?.competitors||[];
 const known=new Set(competitors.map(c=>String(c.team?.id||'')));
 const plays=(Array.isArray(summary.plays)?summary.plays:[]).filter(p=>period(p)===1);
 if(!plays.length||known.size!==2)return null;
 const j=plays.find(p=>/jump\s?ball/i.test(String(p.type?.text||'')+' '+String(p.text||'')));
 const tip=jumpTeam(j,people,known);
 const fg=plays.find(made),scorer=fg?person(fg,people):null;
 const fgteam=String(fg?.team?.id||scorer?.team||'');
 const firstFG=scorer?.id&&known.has(fgteam)?{id:scorer.id,name:scorer.name,team:fgteam}:null;
 const firstShot={},starters={};
 for(const x of people.values())if(x.starter&&known.has(x.team))(starters[x.team]||=[]).push({id:x.id,name:x.name});
 for(const p of plays){if(!attempt(p))continue;const x=person(p,people),team=String(p.team?.id||x?.team||'');
  if(x?.id&&known.has(team)&&!firstShot[team])firstShot[team]={id:x.id,name:x.name};
 }
 return {season,tip,firstFG,firstShot,starters,teams:[...known]};
}
function stat(g,selector,count){const events=g.slice(0,count).map(selector).filter(x=>x!==null);const won=events.filter(Boolean).length;return{won,n:events.length,pct:events.length?Math.round(100*won/events.length):null}}
function teamReport(records,team,year){
 const eligible=records.filter(g=>g.teams.includes(team));
 const current=eligible.filter(g=>g.season===year);
 const p=new Map();
 const add=(athlete,key)=>{
  if(!athlete?.id)return;
  const x=p.get(athlete.id)||{id:athlete.id,name:athlete.name,firstBaskets:0,firstShots:0,starts:0};
  if(athlete.name)x.name=athlete.name;x[key]++;p.set(athlete.id,x);
 };
 for(const g of eligible){
  for(const x of g.starters[team]||[])add(x,'starts');
  if(g.firstFG?.team===team)add(g.firstFG,'firstBaskets');
  add(g.firstShot[team],'firstShots');
 }
 const n=eligible.length;
 const players=[...p.values()].filter(x=>x.firstBaskets||x.firstShots)
 .sort((a,b)=>3*(b.firstBaskets-a.firstBaskets)+(b.firstShots-a.firstShots)+.1*(b.starts-a.starts)).slice(0,8)
 .map(x=>({...x,games:n,firstBasketRate:n?Math.round(100*x.firstBaskets/n):null,firstShotRate:n?Math.round(100*x.firstShots/n):null,startRate:n?Math.round(100*x.starts/n):null}));
 const tip=g=>g.tip===null?null:g.tip===team,basket=g=>g.firstFG===null?null:g.firstFG.team===team;
 return{games:n,seasonGames:current.length,tip:{last5:stat(eligible,tip,5),last10:stat(eligible,tip,10),season:stat(current,tip,current.length)},
 basket:{last5:stat(eligible,basket,5),last10:stat(eligible,basket,10),season:stat(current,basket,current.length)},
 conversion:stat(eligible,g=>g.tip===team&&g.firstFG!==null?g.firstFG.team===team:null,n),players};
}
export default {async fetch(request,env,ctx){
 if(request.method==='OPTIONS')return new Response(null,{headers:HEADERS});
 if(request.method!=='GET')return respond({error:'GET only'},405,0);
 const url=new URL(request.url);
 if(url.pathname==='/health')return respond({ok:true,source:'ESPN NBA play-by-play'},200,60);
 const home=String(url.searchParams.get('home')||'').toUpperCase(),away=String(url.searchParams.get('away')||'').toUpperCase();
 if(!/^[A-Z]{2,4}$/.test(home)||!/^[A-Z]{2,4}$/.test(away)||home===away)return respond({error:'Invalid team codes'},400,0);
 const cutoff=Date.parse(url.searchParams.get('before'))||Date.now(),year=yearEnd(cutoff);
 const cache=caches.default,key=new Request(url.toString());const cached=await cache.match(key);if(cached)return cached;
 try{
  const schedules=await Promise.all([history(home,year,cutoff),history(away,year,cutoff)]);
  const ids=[...new Map(schedules.flat().map(x=>[x.id,x])).values()].sort((a,b)=>b.date-a.date);
  const summaries=await parallel(ids,async x=>({data:await espn('summary?event='+x.id),season:x.season,date:x.date}));
  const codes=new Map();
  for(const x of summaries)for(const c of x.data?.header?.competitions?.[0]?.competitors||[]){
   const a=String(c.team?.abbreviation||'').toUpperCase(),tid=String(c.team?.id||'');if(a&&tid)codes.set(a,tid);
  }
  const homeID=codes.get(home)||codes.get(ALIAS[home]||home);
  const awayID=codes.get(away)||codes.get(ALIAS[away]||away);
  if(!homeID||!awayID)throw Error('Could not verify both teams in ESPN game records');
  const observed=summaries.map(x=>({date:x.date,...observe(x.data,x.season)})).filter(x=>x.season&&x.teams).sort((a,b)=>b.date-a.date);
  if(!observed.length)throw Error('ESPN game play-by-play unavailable');
  const body={available:true,season:year,seasonLabel:(year-1)+'–'+String(year).slice(-2),
   generatedAt:new Date().toISOString(),source:'ESPN NBA completed regular-season play-by-play',
   recentSampleCap:20,home:{abbr:home,id:homeID,...teamReport(observed,homeID,year)},
   away:{abbr:away,id:awayID,...teamReport(observed,awayID,year)},
   notes:'L5/L10 include prior-season history where needed. Season covers the most recent up-to-20 current-season games per team (not necessarily the entire season). Historical frequencies are not calibrated predictions or sportsbook win probabilities. First basket means first made field goal, not first free throw.'};
  const result=respond(body,200,1200);ctx.waitUntil(cache.put(key,result.clone()));return result;
 }catch(e){return respond({available:false,error:String(e?.message||e),source:'ESPN NBA play-by-play'},503,30)}
}};
