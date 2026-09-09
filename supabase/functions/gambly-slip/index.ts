// v87 — Gambly direct-slip adapter.
//
// IMPORTANT: Gambly's public site currently does not publish a supported public
// API contract for programmatically creating /share-bet slips. TSO therefore
// does NOT reverse-engineer a private endpoint. This function is a server-side
// adapter for an approved Gambly partner endpoint once Gambly supplies one.
//
// Required Supabase secrets when approved:
//   GAMBLY_GENERATE_URL
//   GAMBLY_API_TOKEN
//
// The browser never receives the partner token.

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});

function safeShareUrl(value:unknown){
  try{
    const u=new URL(String(value||''));
    const host=u.hostname.toLowerCase();
    if(!(host==='gambly.com'||host==='www.gambly.com')) return null;
    if(!/^\/share-bet\/[^/]+/.test(u.pathname)) return null;
    return u.toString();
  }catch{return null}
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'POST only'},405);

  let body:any;
  try{body=await req.json()}catch{return json({error:'invalid request body'},400)}
  const legs=Array.isArray(body?.legs)?body.legs:[];
  const text=String(body?.text||'').trim();
  if(!legs.length||!text)return json({error:'betslip legs and text are required'},400);
  if(legs.length>20)return json({error:'too many betslip legs'},400);

  const endpoint=Deno.env.get('GAMBLY_GENERATE_URL')||'';
  const token=Deno.env.get('GAMBLY_API_TOKEN')||'';
  if(!endpoint||!token){
    return json({
      error:'Direct Gambly generation is waiting on an approved Gambly partner API connection.',
      code:'GAMBLY_PARTNER_API_NOT_CONFIGURED',
    },503);
  }
  let url:URL;
  try{url=new URL(endpoint)}catch{return json({error:'Gambly partner endpoint is invalid'},500)}
  if(url.protocol!=='https:')return json({error:'Gambly partner endpoint must use HTTPS'},500);

  const upstream=await fetch(url.toString(),{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Accept':'application/json',
      'Authorization':`Bearer ${token}`,
    },
    body:JSON.stringify({
      source:'the-sports-outpost',
      text,
      legs:legs.map((l:any)=>({
        sport:l?.sport||null,
        player:l?.player||l?.player_name||null,
        market:l?.market||null,
        side:l?.side||'over',
        line:l?.line??null,
        game:l?.game||null,
      })),
    }),
  });
  const raw=await upstream.text();
  let data:any=null;
  try{data=raw?JSON.parse(raw):null}catch{data={raw}}
  if(!upstream.ok){
    return json({error:data?.error||data?.message||`Gambly partner API returned ${upstream.status}`,code:'GAMBLY_UPSTREAM_ERROR'},502);
  }
  const share=safeShareUrl(data?.shareUrl||data?.share_url||data?.betslip_url||data?.url);
  if(!share)return json({error:'Gambly response did not contain a valid share-bet URL',code:'GAMBLY_BAD_RESPONSE'},502);
  return json({ok:true,shareUrl:share});
});
