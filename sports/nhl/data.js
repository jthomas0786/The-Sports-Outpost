export const API='https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';
export const num=v=>v==null||v===''||v==='--'?null:Number.isFinite(Number(v))?Number(v):null;
export const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const imageUrl=u=>/^https:\/\//.test(String(u||''))?u:'';
export const normalizeSlateDate=value=>{const m=String(value??'').trim().match(/^(\d{4})-?(\d{2})-?(\d{2})$/);return m?`${m[1]}-${m[2]}-${m[3]}`:'';};
export const easternDate=(value=Date.now())=>{const date=value instanceof Date?value:new Date(value);return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(Number.isNaN(date.getTime())?new Date():date);};
const playerKey=p=>p?.id?`${p.team||''}:${p.id}`:`${p?.team||''}:${String(p?.name||'').trim().toLowerCase()}`;
const propsCandidateScore=(p,g)=>Number(Boolean(g?.status==='in'||g?.status==='post'))*8+Number(Boolean(p?.lineupConfirmed))*6+Number(Boolean(p?.confirmedStarter||p?.currentGoalie))*4+Number(p?.active!==false)+Number(Boolean(p?.current&&Object.values(p.current).some(v=>v!=null)))*5;
export function markSplitSquadSlate(games=[]){
 const counts=new Map();
 for(const game of games)for(const team of [game?.away,game?.home]){
  const abbr=String(team?.abbr||'').toUpperCase();
  if(abbr)counts.set(abbr,(counts.get(abbr)||0)+1);
 }
 for(const game of games){
  const teams=[game?.away?.abbr,game?.home?.abbr].map(x=>String(x||'').toUpperCase()).filter(Boolean);
  game.splitSquadTeams=teams.filter(abbr=>(counts.get(abbr)||0)>1);
  game.splitSquad=Number(game?.seasonType)===1&&game.splitSquadTeams.length>0;
 }
 return games;
}
export function dedupeSlatePlayers(games=[]){
 markSplitSquadSlate(games);
 for(const game of games){
  const unique=new Map();
  for(const p of game.players||[]){const key=playerKey(p);if(!key)continue;const prev=unique.get(key);if(!prev||propsCandidateScore(p,game)>propsCandidateScore(prev,game))unique.set(key,p);}
  game.players=[...unique.values()];
  for(const p of game.players){p.propsEligible=true;delete p.splitSquadAssignmentPending;}
 }
 const groups=new Map();
 for(const game of games)for(const p of game.players||[]){
  const key=playerKey(p);if(!key)continue;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({p,game});
 }
 for(const rows of groups.values()){
  if(rows.length===1)continue;
  const confirmed=rows.filter(({p,game})=>p.lineupConfirmed===true||(game.status==='in'&&p.current&&Object.values(p.current).some(v=>v!=null)));
  if(confirmed.length===1){
   for(const row of rows)row.p.propsEligible=row===confirmed[0];
   continue;
  }
  const split=rows.some(({p,game})=>game.splitSquadTeams?.includes(String(p.team||'').toUpperCase()));
  if(split){
   for(const {p} of rows){p.propsEligible=false;p.splitSquadAssignmentPending=true;}
   continue;
  }
  const best=rows.slice().sort((a,b)=>propsCandidateScore(b.p,b.game)-propsCandidateScore(a.p,a.game))[0];
  for(const row of rows)row.p.propsEligible=row===best;
 }
 return games;
}
export function athlete(a,team,gameId){return {id:String(a.id),gameId,team,name:a.displayName||a.fullName||'Player',position:a.position?.abbreviation||'',photo:imageUrl(a.headshot?.href),active:a.active!==false&&!a.scratched&&!/^(out|injured reserve|suspended)$/i.test(a.injuries?.[0]?.status||''),availability:a.scratched?'Scratched':a.injuries?.[0]?.status||'Lineup unconfirmed'};}
export function normalizeScoreboard(doc,now=Date.now(),requestedDate=null){
 const events=doc.events||[],requested=normalizeSlateDate(requestedDate),feedDate=normalizeSlateDate(doc.day?.date||doc.date),firstDate=events.find(e=>Number.isFinite(Date.parse(e?.date)))?.date;
 const slateDate=requested||feedDate||(firstDate?easternDate(firstDate):easternDate(now));
 const games=events.map(e=>{
  const c=e.competitions?.[0];if(!c)return null;
  const team=side=>{const t=c.competitors?.find(t=>t.homeAway===side);return t?{id:String(t.id),abbr:t.team?.abbreviation||'',name:t.team?.displayName||'',logo:imageUrl(t.team?.logo),score:num(t.score),shots:num(t.statistics?.find(s=>s.name==='shotsTotal')?.displayValue),powerPlay:t.powerPlay===true}:null;};
  const away=team('away'),home=team('home');if(!away||!home)return null;
  const status=c.status||e.status||{},gameDate=e.date?easternDate(e.date):'';
  return {id:String(e.id),startTime:e.date,slateDate:gameDate,away,home,status:status.type?.state||'pre',detail:status.type?.shortDetail||'',period:num(status.period),clock:status.displayClock||'',seasonType:e.season?.type??doc.season?.type??null,venue:c.venue?.fullName||'',neutralSite:c.neutralSite===true,fetchedAt:now,players:[],goals:[],plays:[]};
 }).filter(g=>g&&g.slateDate===slateDate);
 markSplitSquadSlate(games);
 return {sport:'nhl',schemaVersion:2,generatedAt:new Date(now).toISOString(),season:doc.leagues?.[0]?.season?.displayName||'',date:slateDate,games};
}
export function mergeSummary(game,summary,now=Date.now()){
 const next={...game,players:[],goals:[],plays:[],summaryAt:now,onIce:summary.onIce||[]};
 const keys={goals:'goals',assists:'assists',shotsTotal:'sog',blockedShots:'blocks',saves:'saves',shotsAgainst:'shotsAgainst',goalsAgainst:'goalsAgainst',timeOnIce:'toi'};
 for(const group of summary.boxscore?.players||[])for(const section of group.statistics||[])for(const row of section.athletes||[]){
  const p=athlete(row.athlete,group.team?.abbreviation,game.id),current={};
  for(const [i,key] of (section.keys||[]).entries())if(keys[key])current[keys[key]]=key==='timeOnIce'?row.stats?.[i]:num(row.stats?.[i]);
  if(current.goals!=null&&current.assists!=null)current.points=current.goals+current.assists;
  next.players.push({...p,current});
 }
 const seen=new Set();
 for(const p of summary.plays||[]){
  if(!p.id||seen.has(String(p.id)))continue;seen.add(String(p.id));
  const period=num(p.period?.number),shootout=/shootout/i.test(`${p.type?.text||''} ${p.period?.displayValue||''} ${p.shotInfo?.text||''}`)||p.period?.type==='SO';
  const participants=(p.participants||[]).map(x=>{const a=x.athlete||{};return {type:x.type||'',id:a.id!=null?String(a.id):'',name:a.displayName||a.fullName||'',photo:imageUrl(a.headshot?.href)};}).filter(x=>x.id||x.name);
  const scorerRaw=p.participants?.find(x=>x.type==='scorer')?.athlete;
  const play={id:String(p.id),type:p.type?.text||'',text:p.text||'',period,clock:p.clock?.displayValue||'',team:[game.away,game.home].find(t=>t.id===String(p.team?.id))?.abbr||'',timestamp:p.wallclock||null,awayScore:num(p.awayScore),homeScore:num(p.homeScore),strength:p.strength?.text||'',shootout,participants};
  next.plays.push(play);
  if(p.scoringPlay&&p.type?.text==='Goal'&&!shootout)next.goals.push({...play,scorer:scorerRaw?athlete(scorerRaw,play.team,game.id):{name:'Scorer pending',photo:''}});
 }
 next.plays=next.plays.slice(-40).reverse();next.goals.reverse();
 return next;
}
export async function getJSON(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`Hockey feed HTTP ${r.status}`);return r.json();}
export async function loadScoreboard(date=null){const selected=normalizeSlateDate(date);return normalizeScoreboard(await getJSON(`${API}/scoreboard${selected?'?dates='+selected.replaceAll('-',''):''}`),Date.now(),selected||null);}
export function freshGame(g,now=Date.now()){return g.status==='in'&&Number.isFinite(g.fetchedAt)&&now-g.fetchedAt<=120000&&g.fetchedAt<=now+60000;}
export function threats(doc,now=Date.now()){
 const alerts=[];
 for(const g of doc?.games||[]){
  if(!freshGame(g,now))continue;
  for(const t of [g.away,g.home])if(t.powerPlay)alerts.push({key:`nhl:${g.id}:${t.id}:pp:${g.period}:${g.away.score}-${g.home.score}`,gameId:g.id,team:t.abbr,title:'Power-play opportunity',detail:`${t.abbr} on the power play · ${g.detail}`});
  if(!g.summaryAt||now-g.summaryAt>120000)continue;
  for(const p of g.players.filter(p=>p.active&&p.position!=='G')){
   if(p.current?.sog>=4)alerts.push({key:`nhl:${g.id}:${p.id}:shots:${p.current.sog}`,gameId:g.id,team:p.team,title:p.name,detail:`Shot watch · ${p.current.sog} shots on goal · ${g.detail}`});
   if(p.current?.goals===2)alerts.push({key:`nhl:${g.id}:${p.id}:hat-trick`,gameId:g.id,team:p.team,title:p.name,detail:`Hat-trick watch · 2 goals · ${g.detail}`});
  }
 }
 return alerts;
}
