#!/usr/bin/env node
// Non-destructive public health probe. Never changes production or DNS.
const targets=[
  {name:'TSO 2 production homepage',url:'https://thesportsoutpost.com/',kind:'html'},
  {name:'TSO 2 www canonical redirect',url:'https://www.thesportsoutpost.com/',kind:'redirect'},
  {name:'TSO 2 production live API',url:'https://thesportsoutpost.com/api/live?league=all',kind:'json'},
  {name:'TSO 2 production props API',url:'https://thesportsoutpost.com/api/props?league=all',kind:'json'},
  {name:'TSO 2 preview homepage',url:process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com/',kind:'html',optional:!process.env.TSO2_PREVIEW_URL},
  {name:'TSO 2 preview live API',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/api/live?league=all',kind:'json',optional:!process.env.TSO2_PREVIEW_URL},
  {name:'TSO 2 preview stylesheet',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/styles.css',kind:'css'},
  {name:'TSO 2 preview app JavaScript',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/app.js',kind:'js'},
  {name:'TSO 2 preview pages JavaScript',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/pages.js',kind:'js'},
  {name:'TSO 2 preview authentication JavaScript',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/auth.js',kind:'js'},
  {name:'TSO 2 preview Admin JavaScript',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/admin.js',kind:'js'},
  {name:'TSO 2 approved wordmark',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/brand/approved/tso2-wordmark-horizontal-approved.webp',kind:'webp'},
  {name:'TSO 2 Game Edge icon',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/brand/production/tso2-product-game-edge-approved.svg',kind:'svg'},
  {name:'TSO 2 install manifest',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/manifest.webmanifest',kind:'manifest'},
  {name:'TSO 2 Android app icon 192',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/brand/production/tso2-app-icon-192.png',kind:'png'},
  {name:'TSO 2 Android app icon 512',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/brand/production/tso2-app-icon-512.png',kind:'png'},
  {name:'TSO 2 iPhone app icon',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/brand/production/tso2-apple-touch-icon-180.png',kind:'png'},
  {name:'TSO 2 browser favicon',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/brand/production/tso2-favicon.ico',kind:'ico'},
  {name:'TSO 2 preview props API',url:(process.env.TSO2_PREVIEW_URL||'https://staging.thesportsoutpost.com').replace(/\/$/,'')+'/api/props?league=all',kind:'json',optional:!process.env.TSO2_PREVIEW_URL},
];
const validate=(target,body)=>{
  if(target.kind==='html')return /<html/i.test(body)
    &&(!target.name.startsWith('TSO 2')||(/data-auth-signout/.test(body)&&/auth\.js/.test(body)&&/admin\.js/.test(body)&&/data-admin-open/.test(body)&&/Guest/.test(body)))
    &&(!target.name.includes('production homepage')||(/TSO2|The Sports Outpost 2\.0|Research Command Center|broadcast-shell/i.test(body)&&/app\.js/.test(body)));
  if(target.kind==='webp')return body.slice(0,4)==='RIFF'&&body.slice(8,12)==='WEBP';
  if(target.kind==='png')return body.slice(0,8)==='\x89PNG\r\n\x1a\n';
  if(target.kind==='ico')return body.charCodeAt(0)===0&&body.charCodeAt(1)===0&&body.charCodeAt(2)===1&&body.charCodeAt(3)===0;
  if(target.kind==='manifest'){
    try{
      const m=JSON.parse(body);
      return m.short_name==='TSO'&&m.display==='standalone'
        &&Array.isArray(m.icons)
        &&m.icons.some(i=>i.sizes==='192x192'&&i.type==='image/png')
        &&m.icons.some(i=>i.sizes==='512x512'&&i.type==='image/png');
    }catch{return false}
  }
  if(target.kind==='svg')return /<svg[\s>]/i.test(body)&&/viewBox="0 0 64 64"/.test(body)&&/EDGE/.test(body);
  if(target.kind==='css')return body.length>1000&&/\{[^}]*\}/.test(body)
    &&(!target.name.includes('preview stylesheet')||(/\.rg2-game-card/.test(body)&&/--rg-orange:var\(--outpost-orange/.test(body)&&!/\.tso2-lab\{/.test(body)));
  if(target.kind==='js'){
    if(body.length<=1000||/^\s*<html/i.test(body))return false;
    if(target.name.includes('preview app JavaScript'))return /TSO2ResearchGameFlow/.test(body)&&/requestResearchMarkets/.test(body);
    if(target.name.includes('preview pages JavaScript'))return /class="rg2-page broadcast-destination"/.test(body);
    return true;
  }
  let doc;try{doc=JSON.parse(body)}catch{return false}
  if(!doc||typeof doc!=='object')return false;
  if(target.url.includes('/api/live'))return Array.isArray(doc.games)&&doc.counts&&typeof doc.counts==='object';
  if(target.url.includes('/api/props')){
    if(!Array.isArray(doc.rows))return false;
    if(target.name.startsWith('TSO 2')){
      const nfl=doc.modelMeta?.nfl;
      if(!nfl||nfl.fetchMode!=='validated-tso2-branch'||!String(nfl.sourceFile||'').includes('tso2/data/nfl-sim.json'))return false;
    }
    return true;
  }
  return true;
};
let failed=0;
for(const target of targets){
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let response;
    try{response=await fetch(target.url,{signal:controller.signal,redirect:target.kind==='redirect'?'manual':'follow',headers:{accept:target.kind==='json'?'application/json':'text/html'}})}finally{clearTimeout(timer)}
    const contentType=response.headers.get('content-type')||'';
    if(target.kind==='redirect'){
      const location=response.headers.get('location')||'';
      const ok=[301,302,307,308].includes(response.status)&&/^https:\/\/thesportsoutpost\.com\/?(?:$|[?#])/.test(location);
      if(!ok&&!target.optional)failed++;
      console.log(JSON.stringify({name:target.name,url:target.url,status:response.status,location,ok}));
      continue;
    }
    const bytes=['webp','png','ico'].includes(target.kind)?new Uint8Array(await response.arrayBuffer()):null;
    const body=bytes ? (bytes.length>=12?String.fromCharCode(...bytes.slice(0,12)):'') : await response.text();
    const validType=target.kind==='png'?/image\/png/i.test(contentType):target.kind==='ico'?/image\/(x-icon|vnd\.microsoft\.icon)/i.test(contentType):target.kind==='manifest'?/application\/(manifest\+json|json)/i.test(contentType):target.kind==='webp'?/image\/webp/i.test(contentType):target.kind==='svg'?/image\/svg\+xml/i.test(contentType):target.kind==='json'?/json/i.test(contentType)&&body.trim().startsWith('{'):target.kind==='html'?/html/i.test(contentType)&&/<html/i.test(body):target.kind==='css'?/css/i.test(contentType):/javascript|ecmascript/i.test(contentType);
    const ok=response.ok&&validType&&validate(target,body)
      &&(target.name!=='TSO 2 production homepage'||!(/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(body)));
    if(!ok&&!target.optional)failed++;
    console.log(JSON.stringify({name:target.name,url:target.url,status:response.status,contentType,ok,optional:!!target.optional,preview:body.slice(0,100),modelSource:target.url.includes('/api/props')&&target.name.startsWith('TSO 2')?(()=>{try{return JSON.parse(body).modelMeta?.nfl||null}catch{return null}})():undefined}));
  }catch(error){
    if(!target.optional)failed++;
    console.log(JSON.stringify({name:target.name,url:target.url,ok:false,optional:!!target.optional,error:String(error.message||error)}));
  }
}
if(failed){console.error('Launch preflight blocked:',failed,'required checks failed');process.exitCode=1}else console.log('Required public route checks passed; this is not a substitute for full launch QA.');
