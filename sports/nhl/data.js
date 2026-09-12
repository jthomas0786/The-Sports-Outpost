export const API='https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';
export const num=v=>v==null||v===''||v==='--'?null:Number.isFinite(Number(v))?Number(v):null;
export const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const imageUrl=u=>/^https:\/\//.test(String(u||''))?u:'';
export const easternDate=(now=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function athlete(a,team,gameId){return {id:String(a.id),gameId,team,name:a.displayName||a.fullName||'Player',position:a.position?.abbreviation||'',photo:imageUrl(a.headshot?.href),active:a.active!==false&&!a.scratched&&!/^(out|injured reserve|suspended)$/i.test(a.injuries?.[0]?.status||''),availability:a.scratched?'Scratched':a.injuries?.[0]?.status||'Lineup unconfirmed'};}
export function normalizeScoreboard(doc,now=Date.now()){
 const games=(doc.events||[]).map(e=>{
  const c=e.competitions?.[0];if(!c)return null;
  const team=side=>{const t=c.competitors?.find(t=>t.homeAway===side);return t?{id:String(t.id),abbr:t.team?.abbreviation||'',name:t.team?.displayName||'',logo:imageUrl(t.team?.logo),score:num(t.score),shots:num(t.statistics?.find(s=>s.name==='shotsTotal')?.displayValue),powerPlay:t.powerPlay===true}:null;};
  const away=team('away'),home=team('home');if(!away||!home)return null;
  const status=c.status||e.status||{};
  return {id:String(e.id),startTime:e.date,away,home,status:status.type?.state||'pre',detail:status.type?.shortDetail||'',period:num(status.period),clock:status.displayClock||'',seasonType:e.season?.type??doc.season?.type??null,venue:c.venue?.fullName||'',fetchedAt:now,players:[],goals:[],plays:[]};
 }).filter(Boolean);
 return {sport:'nhl',schemaVersion:1,generatedAt:new Date(now).toISOString(),season:doc.leagues?.[0]?.season?.displayName||'',date:games[0]?.startTime?easternDate(new Date(games[0].startTime)):easternDate(now),games};
}
export function mergeSummary(game,summary,now=Date.now()){
 const next={...game,players:[],goals:[],plays:[],summaryAt:now};
 const keys={goals:'goals',assists:'assists',shotsTotal:'sog',blockedShots:'blocks',saves:'saves',shotsAgainst:'shotsAgainst',goalsAgainst:'goalsAgainst',timeOnIce:'toi'};
 for(const group of summary.boxscore?.players||[])for(const section of group.statistics||[])for(const row of section.athletes||[]){
  const p=athlete(row.athlete,group.team?.abbreviation,game.id),current={};
  const onIce=(summary.onIce||[]).flatMap(t=>t.entries||[]).filter(e=>e.whereabouts?.id==='1').map(e=>String(e.athleteid));
  p.confirmedStarter=p.position==='G'&&onIce.includes(p.id);
  for(const [i,key] of (section.keys||[]).entries())if(keys[key])current[keys[key]]=key==='timeOnIce'?row.stats?.[i]:num(row.stats?.[i]);
  if(current.goals!=null&&current.assists!=null)current.points=current.goals+current.assists;
  next.players.push({...p,current,availability:row.athlete?.scratched?'Scratched':'Reported in box score'});
 }
 const seen=new Set();
 for(const p of summary.plays||[]){
  if(!p.id||seen.has(String(p.id)))continue;seen.add(String(p.id));
  const period=num(p.period?.number),shootout=/shootout/i.test(`${p.type?.text||''} ${p.period?.displayValue||''} ${p.shotInfo?.text||''}`)||p.period?.type==='SO';
  const scorer=p.participants?.find(x=>x.type==='scorer')?.athlete;
  const play={id:String(p.id),text:p.text||'',period,clock:p.clock?.displayValue||'',team:[game.away,game.home].find(t=>t.id===String(p.team?.id))?.abbr||'',timestamp:p.wallclock||null,awayScore:num(p.awayScore),homeScore:num(p.homeScore),strength:p.strength?.text||'',shootout};
  next.plays.push(play);
  if(p.scoringPlay&&p.type?.text==='Goal'&&!shootout)next.goals.push({...play,scorer:scorer?athlete(scorer,play.team,game.id):{name:'Scorer pending',photo:''}});
 }
 next.plays=next.plays.slice(-40).reverse();next.goals.reverse();
 return next;
}
export async function getJSON(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`Hockey feed HTTP ${r.status}`);return r.json();}
export async function loadScoreboard(date=null){return normalizeScoreboard(await getJSON(`${API}/scoreboard${date?'?dates='+date.replaceAll('-',''):''}`));}
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
