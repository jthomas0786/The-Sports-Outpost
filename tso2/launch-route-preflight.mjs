#!/usr/bin/env node
// Non-destructive public health probe. Never changes production or DNS.
const targets=[
  {name:'Production homepage',url:'https://thesportsoutpost.com/',kind:'html'},
  {name:'Production live API',url:'https://thesportsoutpost.com/api/live?league=all',kind:'json'},
  {name:'Production props API',url:'https://thesportsoutpost.com/api/props?league=all',kind:'json'},
  {name:'TSO 2 preview homepage',url:process.env.TSO2_PREVIEW_URL||'https://tso2-preview.jthomas0786-tso.workers.dev/',kind:'html',optional:!process.env.TSO2_PREVIEW_URL},
  {name:'TSO 2 preview live API',url:(process.env.TSO2_PREVIEW_URL||'https://tso2-preview.jthomas0786-tso.workers.dev').replace(/\/$/,'')+'/api/live?league=all',kind:'json',optional:!process.env.TSO2_PREVIEW_URL},
  {name:'TSO 2 preview props API',url:(process.env.TSO2_PREVIEW_URL||'https://tso2-preview.jthomas0786-tso.workers.dev').replace(/\/$/,'')+'/api/props?league=all',kind:'json',optional:!process.env.TSO2_PREVIEW_URL},
];
const validate=(target,body)=>{\n  if(target.kind==='html')return /<html/i.test(body);\n  let doc;try{doc=JSON.parse(body)}catch{return false}\n  if(!doc||typeof doc!=='object')return false;\n  if(target.url.includes('/api/live'))return Array.isArray(doc.games)&&doc.counts&&typeof doc.counts==='object';\n  if(target.url.includes('/api/props')){\n    if(!Array.isArray(doc.rows))return false;\n    if(target.name.startsWith('TSO 2')){\n      const nfl=doc.modelMeta?.nfl;\n      if(!nfl||nfl.fetchMode!=='validated-tso2-branch'||!String(nfl.sourceFile||'').includes('tso2/data/nfl-sim.json'))return false;\n    }\n    return true;\n  }\n  return true;\n};\nlet failed=0;
for(const target of targets){
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let response;
    try{response=await fetch(target.url,{signal:controller.signal,redirect:'follow',headers:{accept:target.kind==='json'?'application/json':'text/html'}})}finally{clearTimeout(timer)}
    const contentType=response.headers.get('content-type')||'';
    const body=await response.text();
    const validType=target.kind==='json'?/json/i.test(contentType)&&body.trim().startsWith('{'):/html/i.test(contentType)&&/<html/i.test(body);
    const ok=response.ok&&validType&&validate(target,body);
    if(!ok&&!target.optional)failed++;
    console.log(JSON.stringify({name:target.name,url:target.url,status:response.status,contentType,ok,optional:!!target.optional,preview:body.slice(0,100),modelSource:target.url.includes('/api/props')&&target.name.startsWith('TSO 2')?(()=>{try{return JSON.parse(body).modelMeta?.nfl||null}catch{return null}})():undefined}));
  }catch(error){
    if(!target.optional)failed++;
    console.log(JSON.stringify({name:target.name,url:target.url,ok:false,optional:!!target.optional,error:String(error.message||error)}));
  }
}
if(failed){console.error('Launch preflight blocked:',failed,'required checks failed');process.exitCode=1}else console.log('Required public route checks passed; this is not a substitute for full launch QA.');
