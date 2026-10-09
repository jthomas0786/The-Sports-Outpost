import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tso2/auth.js','utf8');
const begin=source.indexOf('  async loadProfileActivity(){');
const end=source.indexOf('  async rpc(',begin);
assert.ok(begin>=0&&end>begin,'Authenticated activity method exists');
const method=source.slice(begin,end);
const create=(auth,client)=>new Function('auth','client','return ({'+method+'})')(auth,client);
const records={
  point_balances:{balance:1250,updated_at:'2026-10-08T00:00:00Z'},
  wagers:[{id:31,sport:'nfl',stake:50,status:'open'}],
  watchlist:[{id:5,player_name:'Verified Player',sport:'nfl'}],
  picks:[{id:7,player:'Verified Player',market:'atd'}]
};
function mock(denied=''){
  const calls=[];
  const client={from(table){
    const call={table,scopes:[],select:''};
    calls.push(call);
    const response=()=>({
      data:denied===table?null:records[table],
      error:denied===table?{message:'permission denied'}:null
    });
    const q={
      select(value){call.select=value;return q},
      eq(name,value){call.scopes.push([name,value]);return q},
      order(){return q},
      limit(){return q},
      maybeSingle(){return Promise.resolve(response())},
      then(resolve,reject){return Promise.resolve(response()).then(resolve,reject)}
    };
    return q;
  }};
  return {client,calls};
}

{
  const {client,calls}=mock();
  const auth={user:{id:'signed-in-account'}};
  const result=await create(auth,client).loadProfileActivity();
  assert.equal(result.userId,'signed-in-account');
  assert.equal(result.points.balance,1250);
  assert.equal(result.wagers[0].id,31);
  assert.equal(result.watchlist[0].player_name,'Verified Player');
  assert.equal(result.picks[0].id,7);
  assert.equal(result.issues.length,0);
  assert.equal(calls.length,4);
  assert.deepEqual(new Set(calls.map(c=>c.table)),new Set(Object.keys(records)));
  for(const call of calls)
    assert.deepEqual(call.scopes,[['user_id','signed-in-account']],
      'Every '+call.table+' query must be scoped to the current user');
}
{
  const {client}=mock();
  const auth={user:null};
  await assert.rejects(create(auth,client).loadProfileActivity(),/Sign in/);
}
{
  const {client}=mock('wagers');
  const auth={user:{id:'member'}};
  const result=await create(auth,client).loadProfileActivity();
  assert.equal(result.wagers,null,'Denied account query cannot return borrowed data');
  assert.equal(result.points.balance,1250,'Other authorized account values still load');
  assert.match(result.issues.join(','),/wagers: permission denied/);
}
{
  const {client}=mock();
  const auth={user:{id:'first-member'}};
  const pending=create(auth,client).loadProfileActivity();
  auth.user={id:'second-member'};
  await assert.rejects(pending,/Account changed/,'Do not leak the previous user on sign-out/account switch');
}
console.log('TSO 2.0 signed-in profile: four scoped reads, partial denial, signed-out guard, account-switch guard passed');
