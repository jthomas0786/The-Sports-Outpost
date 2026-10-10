#!/usr/bin/env node
// Read-only access-control smoke test. The anon key is PUBLIC; no user/password
// credentials or service-role token are used, and no tables are modified.
import fs from 'node:fs';

const src=fs.readFileSync('tso2/auth.js','utf8');
const url=src.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const key=src.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];
if(!url||!key)throw new Error('Public client configuration is missing');
const common={
  apikey:key,
  Authorization:'Bearer '+key,
  'Content-Type':'application/json'
};
const checks=[
  {name:'Anonymous admin reports blocked',path:'/rest/v1/rpc/tso2_admin_get_dashboard',method:'POST',body:'{}',deny:true},
  {name:'Anonymous admin settings updates blocked',path:'/rest/v1/rpc/tso2_admin_save_settings',method:'POST',body:JSON.stringify({p_announcement:'',p_enabled:false,p_notes:''}),deny:true},
  {name:'Anonymous private settings table blocked',path:'/rest/v1/tso2_admin_settings?select=id',method:'GET',deny:true},
  {name:'Public announcement read permitted',path:'/rest/v1/rpc/tso2_get_public_notice',method:'POST',body:'{}',deny:false},
];
let failed=0;
for(const check of checks){
  try{
    const response=await fetch(url+check.path,{method:check.method,headers:common,body:check.body,signal:AbortSignal.timeout(12000)});
    const responseText=await response.text();
    let safe=check.deny?response.status===401||response.status===403:response.ok;
    if(!check.deny&&safe){
      try{
        const result=JSON.parse(responseText);
        safe=typeof result?.enabled==='boolean'&&typeof result?.text==='string'&&!Object.hasOwn(result,'privateNotes');
      }catch{safe=false}
    }
    if(!safe)failed++;
    console.log(JSON.stringify({name:check.name,status:response.status,pass:safe}));
  }catch(error){
    failed++;
    console.log(JSON.stringify({name:check.name,pass:false,error:String(error?.message||error)}));
  }
}
if(failed){
  console.error('Owner access safety checks blocked:',failed);
  process.exitCode=1;
}else console.log('Anonymous admin endpoint rejection and public announcement access verified.');
