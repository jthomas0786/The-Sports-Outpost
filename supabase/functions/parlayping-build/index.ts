// The Sports Outpost -> ParlayPing bet builder bridge.
//
// The browser never receives PARLAYPING_API_KEY. A signed-in TSO user calls
// this Edge Function; the function verifies that TSO session, then calls the
// commercial ParlayPing v1 Build API server-to-server.
//
// Required Supabase secret:
//   PARLAYPING_API_KEY=pp_live_...
// Optional:
//   PARLAYPING_API_BASE=https://parlayping.net

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
};
const json=(body:unknown,status=200,extra:Record<string,string>={})=>new Response(JSON.stringify(body),{
  status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store',...extra},
});

async function authenticatedUser(req:Request){
  const auth=req.headers.get('Authorization')||'';
  const url=(Deno.env.get('SUPABASE_URL')||'').replace(/\/+$/,'');
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
  if(!auth||!url||!anon)return null;
  try{
    const response=await fetch(`${url}/auth/v1/user`,{
      headers:{Authorization:auth,apikey:anon,Accept:'application/json'},
      signal:AbortSignal.timeout(6000),
    });
    if(!response.ok)return null;
    const user=await response.json();
    return user?.id?user:null;
  }catch{return null;}
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({ok:false,error:'POST only'},405);

  const user=await authenticatedUser(req);
  if(!user)return json({ok:false,error:'Sign in to The Sports Outpost to use ParlayPing.',code:'TSO_SIGN_IN_REQUIRED'},401);

  let body:any={};
  try{body=await req.json();}catch{return json({ok:false,error:'Invalid request body.'},400);}
  const candidates=Array.isArray(body?.candidates)?body.candidates:[];
  if(!candidates.length)return json({ok:false,error:'Add at least one pick first.'},400);
  if(candidates.length>20)return json({ok:false,error:'ParlayPing supports up to 20 candidate legs per build.'},400);

  const apiKey=Deno.env.get('PARLAYPING_API_KEY')||'';
  const base=(Deno.env.get('PARLAYPING_API_BASE')||'https://parlayping.net').replace(/\/+$/,'');
  if(!apiKey)return json({ok:false,error:'ParlayPing is not connected to The Sports Outpost yet.',code:'PARLAYPING_API_NOT_CONFIGURED'},503);
  if(!/^pp_live_[0-9a-f]{48}$/i.test(apiKey))return json({ok:false,error:'ParlayPing API configuration is invalid.',code:'PARLAYPING_API_KEY_INVALID'},503);

  const requestId=`tso-${crypto.randomUUID()}`;
  try{
    const upstream=await fetch(`${base}/api/v1/build`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json',
        'x-api-key':apiKey,
        'x-request-id':requestId,
      },
      body:JSON.stringify({
        candidates,
        desiredLegs:body?.desiredLegs,
        allowSameGame:body?.allowSameGame===true,
        minProbability:body?.minProbability,
        sports:body?.sports,
        referenceTime:body?.referenceTime||null,
        context:{source:'the-sports-outpost'},
      }),
      signal:AbortSignal.timeout(20000),
    });
    const raw=await upstream.text();
    let data:any={};
    try{data=raw?JSON.parse(raw):{};}catch{data={error:'ParlayPing returned an unreadable response.'};}
    const safeStatus=upstream.status===429?429:upstream.ok?200:upstream.status>=400&&upstream.status<500?upstream.status:502;
    return json(data,safeStatus,{'x-parlayping-request-id':String(data?.requestId||requestId).slice(0,160)});
  }catch(error){
    const timedOut=String(error?.name||'')==='TimeoutError';
    return json({ok:false,error:timedOut?'ParlayPing timed out. Try again in a moment.':'Could not reach ParlayPing.',code:timedOut?'PARLAYPING_TIMEOUT':'PARLAYPING_UPSTREAM_UNAVAILABLE'},503);
  }
});
