#!/usr/bin/env node
// Non-destructive public health probe. Never changes production or DNS.
const targets=[
  {name:'Production homepage',url:'https://thesportsoutpost.com/',kind:'html'},
  {name:'Production live API',url:'https://thesportsoutpost.com/api/live?league=all',kind:'json'},
  {name:'Production props API',url:'https://thesportsoutpost.com/api/props?league=all',kind:'json'},
  {name:'TSO 2 preview homepage',url:process.env.TSO2_PREVIEW_URL||'https://tso2-preview.jthomas0786.workers.dev/',kind:'html',optional:!process.env.TSO2_PREVIEW_URL},
  {name:'TSO 2 preview live API',url:(process.env.TSO2_PREVIEW_URL||'https://tso2-preview.jthomas0786.workers.dev').replace(/\/$/,'')+'/api/live?league=all',kind:'json',optional:!process.env.TSO2_PREVIEW_URL},
  {name:'TSO 2 preview props API',url:(process.env.TSO2_PREVIEW_URL||'https://tso2-preview.jthomas0786.workers.dev').replace(/\/$/,'')+'/api/props?league=all',kind:'json',optional:!process.env.TSO2_PREVIEW_URL},
];
let failed=0;
for(const target of targets){
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let response;
    try{response=await fetch(target.url,{signal:controller.signal,redirect:'follow',headers:{accept:target.kind==='json'?'application/json':'text/html'}})}finally{clearTimeout(timer)}
    const contentType=response.headers.get('content-type')||'';
    const body=await response.text();
    const validType=target.kind==='json'?/json/i.test(contentType)&&body.trim().startsWith('{'):/html/i.test(contentType)&&/<html/i.test(body);
    const ok=response.ok&&validType;
    if(!ok&&!target.optional)failed++;
    console.log(JSON.stringify({name:target.name,url:target.url,status:response.status,contentType,ok,optional:!!target.optional,preview:body.slice(0,100)}));
  }catch(error){
    if(!target.optional)failed++;
    console.log(JSON.stringify({name:target.name,url:target.url,ok:false,optional:!!target.optional,error:String(error.message||error)}));
  }
}
if(failed){console.error('Launch preflight blocked:',failed,'required checks failed');process.exitCode=1}else console.log('Required public route checks passed; this is not a substitute for full launch QA.');
