/* TSO 3.0 isolated development preview.
 * Serves original frontend files from tso-3.0 branch.
 * Proxy only preapproved TSO 2.0 preview source feeds, never production.
 * No credentials or signup proxy. */
const RAW='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-3.0/tso3/';
const UPSTREAM='https://tso2-preview.jthomas0786-tso.workers.dev';
const TYPES={'/':'text/html; charset=utf-8','/index.html':'text/html; charset=utf-8','/app.js':'application/javascript; charset=utf-8','/styles.css':'text/css; charset=utf-8'};
const headers={'access-control-allow-origin':'*','x-tso-version':'3.0-preview','x-robots-tag':'noindex, nofollow'};
export default {async fetch(req){
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'access-control-allow-methods':'GET, HEAD, OPTIONS'}});
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers});
 const u=new URL(req.url);
 if(u.pathname==='/health')return Response.json({ok:true,service:'tso3-preview',version:'3.0',source:'tso-3.0/tso3',environment:'development'},{headers});
 if(['/api/live','/api/props'].includes(u.pathname)){
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
