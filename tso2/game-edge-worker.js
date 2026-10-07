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
 const d=String(u.searchParams.get('date')||'').replace(/\D/g,'');const url=base+(d?'?dates='+encodeURIComponent(d):'');
 try{
  const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'okhttp/4.12.0'},cf:{cacheTtl:15,cacheEverything:true}});
  if(!r.ok)throw new Error('ESPN HTTP '+r.status);const doc=await r.json();const games=(doc.events||[]).map(e=>game(e,league)).filter(Boolean);
  return json({source:'espn-scoreboard',generatedAt:new Date().toISOString(),league,date:d||null,games,marketGames:games.filter(g=>g.gameLines).length});
 }catch(e){return json({error:String(e?.message||e)},502)}
}
function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'}}
function json(v,status=200){return new Response(JSON.stringify(v),{status,headers:{...cors(),'content-type':'application/json; charset=UTF-8'}})}