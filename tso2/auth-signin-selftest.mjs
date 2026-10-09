import assert from 'node:assert/strict';
import fs from 'node:fs';

const authSrc=fs.readFileSync('tso2/auth.js','utf8');
const html=fs.readFileSync('tso2/index.html','utf8');
assert.match(html, /<form[^>]+novalidate[^>]+data-auth-form/);
assert.doesNotMatch(html, /name="password"[^>]*minlength=/);
assert.match(html, /auth\.js\?v=20261009-auth-save-v1/);

const refreshStart=authSrc.indexOf('async function refreshIdentity(forceAfterInFlight=false){');
const submitStart=authSrc.indexOf('async function submitCredentials(event){');
const afterSubmit=authSrc.indexOf("\ndocument.querySelectorAll('[data-auth-open]')",submitStart);
assert.ok(refreshStart>0&&submitStart>refreshStart&&afterSubmit>submitStart);
const methods=authSrc.slice(refreshStart,afterSubmit);
// Evaluate ONLY the two production async handlers, with isolated mock Supabase,
// DOM form and account state; never use real user credentials or network.
function makeHarness(client,{email='qa@example.invalid',password='short',mode='signin'}={}){
  const form={elements:{namedItem(name){
    if(name==='email')return {value:email,validity:{valid:true}};
    if(name==='password')return {value:password};
    return null;
  }}};
  const messages=[];
  const state={
    auth:{user:null,status:'guest'},client,form,
    submit:{disabled:false,textContent:'SIGN IN'},
    usernameInput:{value:''},mode,initError:'',closeCount:0,renderCount:0,emitCount:0
  };
  const builder=new Function('state',`
    let {auth,client,form,submit,usernameInput,mode,initError}=state;
    let identityFlight=null;
    let resolveClientReady;
    const clientReady=new Promise(resolve=>{resolveClientReady=resolve});
    const renderIdentity=()=>{state.renderCount++};
    const emit=()=>{state.emitCount++};
    const closeSignIn=()=>{state.closeCount++};
    const setMessage=(text,error=false)=>{state.messages.push({text,error})};
    const console={warn(){}};
    ${methods}
    return {refreshIdentity,submitCredentials,connectClient(next){client=next;resolveClientReady(true)}};
  `);
  state.messages=messages;
  return {state,...builder(state)};
}
const profile=()=>({
  select(){return this},eq(){return this},
  maybeSingle:async()=>({data:{username:'VerifiedMember'}})
});
const verified={id:'test-user',user_metadata:{username:'VerifiedMember'},app_metadata:{role:'member'}};
{
  let finishOldRefresh;let calls=0,attempts=0;
  const oldRefresh=new Promise(resolve=>{finishOldRefresh=resolve});
  const client={from:profile,auth:{
    async getUser(){
      calls++;
      if(calls===1){await oldRefresh;return {data:{user:null},error:null}}
      return {data:{user:verified},error:null};
    },
    async signInWithPassword(){
      attempts++;
      finishOldRefresh();
      return {error:null};
    }
  }};
  const h=makeHarness(client);
  const oldRequest=h.refreshIdentity();
  await h.submitCredentials({preventDefault(){}});
  await oldRequest;
  assert.equal(attempts,1,'Form must attempt sign-in even for an old short password');
  assert.equal(calls,2,'Successful login must await stale guest refresh and verify again');
  assert.equal(h.state.auth.user.id,'test-user');
  assert.equal(h.state.auth.status,'authenticated');
  assert.equal(h.state.closeCount,1,'Only verified login closes the dialog');
  assert.equal(h.state.submit.disabled,false,'Button resets on success');
  assert.ok(h.state.messages.some(m=>m.text==='Verifying your account…'),
    'Progress feedback appears immediately');
}
{
  // The form can be opened while the remote auth module is still loading.
  // Its first click must remain queued and log in when the client connects.
  let attempts=0;
  const client={from:profile,auth:{
    async getUser(){return {data:{user:verified},error:null}},
    async signInWithPassword(){attempts++;return {error:null}}
  }};
  const h=makeHarness(null);
  const pending=h.submitCredentials({preventDefault(){}});
  assert.ok(h.state.messages.some(m=>/Connecting to secure sign-in/.test(m.text)),
    'Early submit visibly waits for a connection');
  assert.equal(h.state.submit.disabled,true);
  assert.equal(attempts,0);
  h.connectClient(client);
  await pending;
  assert.equal(attempts,1,'Only a single original click was needed');
  assert.equal(h.state.auth.user.id,'test-user');
  assert.equal(h.state.closeCount,1);
}
{
  let attempts=0;
  const client={from:profile,auth:{
    async getUser(){return {data:{user:null},error:null}},
    async signInWithPassword(){
      attempts++;
      return {error:{message:'Invalid login credentials'}};
    }
  }};
  const h=makeHarness(client);
  await h.submitCredentials({preventDefault(){}});
  assert.equal(attempts,1,'Bad credentials produce an actual API attempt');
  assert.equal(h.state.closeCount,0,'Invalid login leaves dialog open');
  assert.ok(h.state.messages.some(m=>m.error&&/Invalid login credentials/.test(m.text)));
  assert.equal(h.state.submit.disabled,false);
}
{
  let attempts=0;
  const client={from:profile,auth:{
    async getUser(){return {data:{user:null}}},
    async signInWithPassword(){attempts++;return {error:null}}
  }};
  const h=makeHarness(client,{email:'',password:''});
  await h.submitCredentials({preventDefault(){}});
  assert.equal(attempts,0,'Invalid inputs must be rejected visibly before network');
  assert.ok(h.state.messages.some(m=>m.error&&/valid email/.test(m.text)));
}
console.log('TSO2 sign-in test passed: early SDK loading, short existing password, login error, verified success race, and visible feedback');
