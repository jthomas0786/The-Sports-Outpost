addEventListener('fetch',event=>event.respondWith(handle(event.request)));
const SPORTS={
  nfl:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba:'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  mlb:'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl:'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard'
};
const num=v=>{if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const amer=v=>{if(v==null||v==='')return null;const n=Number(String(v).replace(/[^0-9+\-.]/g,''));return Number.isFinite(n)?n:null};
const line=v=>{if(v==null||v==='')return null;const n=Number(String(v).replace(/[^0-9+\-.]/g,''));return Number.isFinite(n)?n:null};
const NFL_TZ='America/Chicago';
function nflWeekDateRange(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:NFL_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=t=>Number(parts.find(p=>p.type===t)?.value);
 const y=get('year'),m=get('month'),d=get('day'),hour=get('hour');
 const localDay=new Date(Date.UTC(y,m-1,d));
 const dow=localDay.getUTCDay();
 let daysSinceTuesday=(dow-2+7)%7;
 if(dow===2&&hour<3)daysSinceTuesday=7;
 const startMs=Date.UTC(y,m-1,d)-daysSinceTuesday*86400000;
 const endMs=startMs+6*86400000;
 const fmt=ms=>{
  const dt=new Date(ms);
  return String(dt.getUTCFullYear())+String(dt.getUTCMonth()+1).padStart(2,'0')+String(dt.getUTCDate()).padStart(2,'0');
 };
 return {start:fmt(startMs),end:fmt(endMs),timeZone:NFL_TZ,rolloverHourLocal:3};
}
function nflWeekDates(now=new Date()){
 const range=nflWeekDateRange(now);
 const y=Number(range.start.slice(0,4)),m=Number(range.start.slice(4,6)),d=Number(range.start.slice(6,8));
 const start=Date.UTC(y,m-1,d);
 return Array.from({length:7},(_,i)=>{
  const dt=new Date(start+i*86400000);
  return String(dt.getUTCFullYear())+String(dt.getUTCMonth()+1).padStart(2,'0')+String(dt.getUTCDate()).padStart(2,'0');
 });
}
async function fetchScoreboard(base,date){
 const url=base+'?dates='+encodeURIComponent(date);
 const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'okhttp/4.12.0'},cf:{cacheTtl:15,cacheEverything:true}});
 if(!r.ok)throw new Error('ESPN HTTP '+r.status+' for '+date);
 return r.json();
}
function team(c,side){
 const rows=c?.competitors||[];const r=rows.find(x=>x?.homeAway===side)||(side==='away'?rows[1]:rows[0]);if(!r)return null;
 const t=r.team||{};return {id:String(t.id||r.id||''),abbr:t.abbreviation||t.shortDisplayName||'',name:t.displayName||t.name||'',logo:t.logo||t.logos?.[0]?.href||'',score:num(r.score)};
}
function market(c){
 const o=c?.odds?.[0];if(!o)return null;
 const mlA=amer(o?.moneyline?.away?.close?.odds),mlH=amer(o?.moneyline?.home?.close?.odds);
 const spAL=line(o?.pointSpread?.away?.close?.line),spHL=line(o?.pointSpread?.home?.close?.line);
 const spAP=amer(o?.pointSpread?.away?.close?.odds),spHP=amer(o?.pointSpread?.home?.close?.odds);
 const ovL=line(o?.total?.over?.close?.line),unL=line(o?.total?.under?.close?.line);
 const total=num(o?.overUnder)??ovL??unL,ovP=amer(o?.total?.over?.close?.odds),unP=amer(o?.total?.under?.close?.odds);
 if(![mlA,mlH,spAL,spHL,spAP,spHP,total,ovP,unP].some(v=>v!=null))return null;
 return {source:'espn-scoreboard',provider:o?.provider?.name||null,moneyline:{away:{price:mlA},home:{price:mlH}},spread:{away:{point:spAL,price:spAP},home:{point:spHL,price:spHP}},total:{line:total,over:{price:ovP},under:{price:unP}}};
}
function game(e,league){
 const c=e?.competitions?.[0];if(!c)return null;const away=team(c,'away'),home=team(c,'home');if(!away||!home)return null;
 const s=c.status||e.status||{},t=s.type||{};
 return {id:String(e.id||c.id||''),league,startTime:e.date||c.date||null,state:t.state||'pre',status:t.state||'pre',detail:t.shortDetail||t.detail||s.displayClock||'',period:num(s.period),clock:s.displayClock||'',away,home,venue:c.venue?.fullName||'',gameLines:market(c)};
}
async function handle(req){
 const u=new URL(req.url);if(req.method==='OPTIONS')return new Response('',{headers:cors()});
 const league=String(u.searchParams.get('league')||'nfl').toLowerCase();const base=SPORTS[league];
 if(!base)return json({error:'unsupported league'},400);
 const d=String(u.searchParams.get('date')||'').replace(/\D/g,'');
 const nflWeek=league==='nfl'?nflWeekDateRange():null;
 try{
  let events=[];
  if(league==='nfl'){
   const dates=nflWeekDates();
   const settled=await Promise.allSettled(dates.map(date=>fetchScoreboard(base,date)));
   const byId=new Map();
   const failures=[];
   settled.forEach((result,index)=>{
    if(result.status==='rejected'){failures.push({date:dates[index],error:String(result.reason?.message||result.reason)});return;}
    for(const event of result.value?.events||[]){
      const id=String(event?.id||event?.competitions?.[0]?.id||'');
      if(id)byId.set(id,event);
    }
   });
   if(!byId.size&&failures.length===dates.length)throw new Error('All NFL scoreboard dates failed: '+failures.map(x=>x.date+' '+x.error).join('; '));
   events=[...byId.values()];
  }else{
   const dateQuery=d||'';
   const url=base+(dateQuery?'?dates='+encodeURIComponent(dateQuery):'');
   const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'okhttp/4.12.0'},cf:{cacheTtl:15,cacheEverything:true}});
   if(!r.ok)throw new Error('ESPN HTTP '+r.status);
   const doc=await r.json();
   events=doc?.events||[];
  }
  const games=events.map(e=>game(e,league)).filter(Boolean).sort((a,b)=>String(a.startTime||'').localeCompare(String(b.startTime||'')));
  return json({source:'espn-scoreboard',generatedAt:new Date().toISOString(),league,date:league==='nfl'?null:(d||null),weekRange:nflWeek,games,marketGames:games.filter(g=>g.gameLines).length});
 }catch(e){return json({error:String(e?.message||e)},502)}
}
function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'}}
function json(v,status=200){return new Response(JSON.stringify(v),{status,headers:{...cors(),'content-type':'application/json; charset=UTF-8'}})}