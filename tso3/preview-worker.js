/* TSO 3.0 isolated development preview.
 * Serves original frontend files from tso-3.0 branch.
 * Proxy only preapproved TSO 2.0 preview source feeds, never production.
 * No credentials or signup proxy. */
const RAW='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-3.0/tso3/';
const UPSTREAM='https://tso2-preview.jthomas0786-tso.workers.dev';
const TYPES={'/':'text/html; charset=utf-8','/index.html':'text/html; charset=utf-8','/app.js':'application/javascript; charset=utf-8','/styles.css':'text/css; charset=utf-8'};
const headers={'access-control-allow-origin':'*','x-tso-version':'3.0-preview','x-robots-tag':'noindex, nofollow'};
const COLLEGE_FEED='https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';
const WOMEN_FEED='https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard';
const FIRST_BASKET_SOURCE='https://tso2-nba-first-basket.jthomas0786-tso.workers.dev/';
const isoDay=date=>date.toISOString().slice(0,10).replace(/-/g,'');
async function officialGames(url,league){
 const from=new Date(),until=new Date(Date.now()+8*86400000);
 const endpoint=url+'?dates='+isoDay(from)+'-'+isoDay(until)+'&limit=350';
 const res=await fetch(endpoint,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:300},signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('Verified ESPN scoreboard unavailable: '+league);
 const json=await res.json();
 if(!Array.isArray(json?.events))throw Error('Invalid '+league+' scoreboard schema');
 const games=[];
 for(const e of json.events){
  const comp=e.competitions?.[0];if(!comp)continue;
  const home=comp.competitors?.find(x=>x.homeAway==='home'),away=comp.competitors?.find(x=>x.homeAway==='away');
  if(!home?.team?.id||!away?.team?.id||!e.id)continue;
  const team=c=>({id:String(c.team.id),name:String(c.team.displayName||c.team.name||''),abbr:String(c.team.abbreviation||''),
   logo:String(c.team.logo||c.team.logos?.[0]?.href||''),score:c.score??null,
   record:String(c.records?.find(r=>r.type==='total')?.summary||c.records?.[0]?.summary||'')});
  const status=comp.status?.type||e.status?.type||{};
  const state=status.completed===true?'post':status.state==='in'?'in':'pre';
  const startTime=e.date||comp.date;
  if(!Number.isFinite(Date.parse(startTime||'')))continue;
  games.push({id:String(e.id),league,state,startTime,away:team(away),home:team(home),
    venue:String(comp.venue?.fullName||''),period:comp.status?.period||null,clock:comp.status?.displayClock||null,
    source:'ESPN official scoreboard'});
 }
 return games;
}
async function sixLeagueLive(){
 const result=await Promise.allSettled([
  fetch(UPSTREAM+'/api/live?league=all',{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)}).then(async r=>{if(!r.ok)throw Error('TSO staging scoreboard '+r.status);const d=await r.json();if(!Array.isArray(d?.games))throw Error('Invalid TSO game schema');return d}),
  officialGames(COLLEGE_FEED,'cfb'),
  officialGames(WOMEN_FEED,'wnba')
 ]);
 const base=result[0].status==='fulfilled'?result[0].value:{games:[]};
 const college=result[1].status==='fulfilled'?result[1].value:[];
 const women=result[2].status==='fulfilled'?result[2].value:[];
 const merged=new Map();
 for(const game of [...base.games,...college,...women]){
  if(!game?.id||!game?.league)continue;
  merged.set(game.league+':'+game.id,game);
 }
 if(result.every(r=>r.status==='rejected'))throw Error('All verified scoreboard feeds unavailable');
 return {...base,games:[...merged.values()],tso3:{sources:{
  tso2:result[0].status==='fulfilled'?'verified':'unavailable',
  cfb:result[1].status==='fulfilled'?'ESPN':'unavailable',
  wnba:result[2].status==='fulfilled'?'ESPN':'unavailable'
 },generatedAt:new Date().toISOString()}};
}

export default {async fetch(req){
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'access-control-allow-methods':'GET, HEAD, OPTIONS'}});
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers});
 const u=new URL(req.url);
 if(u.pathname==='/health')return Response.json({ok:true,service:'tso3-preview',version:'3.0',source:'tso-3.0/tso3',environment:'development'},{headers});
 if(u.pathname==='/api/first-basket'){
  const home=String(u.searchParams.get('home')||'').toUpperCase();
  const away=String(u.searchParams.get('away')||'').toUpperCase();
  if(!/^[A-Z]{2,4}$/.test(home)||!/^[A-Z]{2,4}$/.test(away)||home===away)
   return Response.json({available:false,error:'Invalid matchup teams'},{status:400,headers});
  const p=new URLSearchParams({home,away});
  const before=String(u.searchParams.get('before')||'');
  if(Number.isFinite(Date.parse(before)))p.set('before',before);
  try{
   const r=await fetch(FIRST_BASKET_SOURCE+'?'+p.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
   if(!r.ok)return Response.json({available:false,error:'Opening-event data unavailable'},{status:503,headers});
   return new Response(r.body,{headers:{...headers,'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tso-source':'tso2-nba-first-basket'}});
  }catch(_){return Response.json({available:false,error:'Opening-event data unavailable'},{status:503,headers})}
 }
 if(['/api/live','/api/props'].includes(u.pathname)){
  if(u.pathname==='/api/live'){
   try{
    const combined=await sixLeagueLive();
    const only=String(u.searchParams.get('league')||'all').toLowerCase();
    if(only!=='all'&&['nfl','nba','mlb','nhl','wnba','cfb'].includes(only))
     combined.games=combined.games.filter(g=>g.league===only);
    return Response.json(combined,{headers:{...headers,'cache-control':'no-store','x-tso-source':'tso2-and-espn'}});
   }catch(error){return Response.json({available:false,error:'Verified scoreboard unavailable',games:[]},{status:503,headers});}
  }
  const params=new URLSearchParams(u.search);
  // Restrict the proxy's query surface to declared source-feed parameters.
  const safe=new URLSearchParams();
  if(['all','nfl','nba','mlb','nhl','wnba','cfb'].includes(params.get('league')))safe.set('league',params.get('league'));
  else safe.set('league','all');
  if(/^\d{4}-\d{2}-\d{2}$/.test(params.get('date')||''))safe.set('date',params.get('date'));
  try{
   const response=await fetch(UPSTREAM+u.pathname+'?'+safe,{headers:{accept:'application/json'},cf:{cacheEverything:false,cacheTtl:0},signal:AbortSignal.timeout(13000)});
   if(!response.ok)return Response.json({available:false,error:'Source '+response.status},{status:503,headers:{...headers,'cache-control':'no-store'}});
   return new Response(response.body,{status:response.status,headers:{...headers,'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tso-source':'tso2-staging-preview'}});
  }catch(e){return Response.json({available:false,error:'TSO source unavailable'},{status:503,headers})}
 }
 const filepath=u.pathname==='/'?'index.html':u.pathname.replace(/^\//,'');
 if(!/^(index\.html|app\.js|styles\.css)$/.test(filepath))return new Response('Not found',{status:404,headers});
 try{
  const response=await fetch(RAW+filepath+'?tso3='+Math.floor(Date.now()/30000),{headers:{accept:'text/plain,*/*'},cf:{cacheTtl:20,cacheEverything:true}});
  if(!response.ok)return new Response('Preview file unavailable',{status:502,headers});
  return new Response(req.method==='HEAD'?null:response.body,{status:200,headers:{...headers,'content-type':TYPES[u.pathname]||TYPES['/'+filepath],'cache-control':'no-store'}});
 }catch(_){return new Response('Preview source unavailable',{status:503,headers})}
}};
