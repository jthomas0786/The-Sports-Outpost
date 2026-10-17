// Read-only smoke check: can a guest retrieve the public TSO2 published theme?
// Uses the already-public anon key from TSO auth.js, never a service key.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('tso2/auth.js','utf8');
const token=source.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];
const url=source.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
assert.ok(token&&url,'Existing public Supabase client must be configured');
const r=await fetch(url+'/rest/v1/rpc/tso2_get_published_theme',{
 method:'POST',headers:{apikey:token,authorization:'Bearer '+token,'content-type':'application/json'},body:'{}',
 signal:AbortSignal.timeout(16000)
});
const data=await r.json();
assert.equal(r.status,200,'Guest cannot load sitewide TSO theme: '+JSON.stringify(data).slice(0,230));
assert.equal(typeof data,'object');
assert.ok(data.tokens&&typeof data.tokens==='object'&&!Array.isArray(data.tokens));
assert.equal(typeof data.revision,'number');
assert.equal(typeof data.customCss,'string');
console.log('TSO2 GUEST THEME READ PASS',JSON.stringify({revision:data.revision,tokenCount:Object.keys(data.tokens).length,hasCustomCss:Boolean(data.customCss)}));
