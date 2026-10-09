import assert from 'node:assert/strict';
import fs from 'node:fs';

const authCode=fs.readFileSync('tso2/auth.js','utf8');
const appCode=fs.readFileSync('tso2/app.js','utf8');
const start=authCode.indexOf('  openSignIn(){openSignIn();}');
const end=authCode.indexOf('  async rpc(',start);
assert.ok(start>0&&end>start,'Saved activity methods remain available');
const methods=authCode.slice(start,end);
function harness({guest=false,duplicate=false}={}){
  const queries=[];
  const client={from(table){
    const record={table,fields:[]};queries.push(record);
    return {
      insert(input){record.insert=input;return Promise.resolve({
        error:duplicate?{code:'23505',message:'unique key conflict'}:null
      })},
      delete(){record.delete=true;return this},
      eq(key,value){record.fields.push([key,value]);return this},
      then(ok,bad){return Promise.resolve({error:null}).then(ok,bad)}
    };
  }};
  const auth={user:guest?null:{id:'account-123'}};
  const methodsObject=new Function('auth','client','openSignIn',
    'return ({'+methods+'})')(auth,client,()=>{});
  return {queries,auth,...methodsObject};
}
const pick={
  sport:'nba',key:'nba|game42|player|points|26.5|over',
  player:'Test Guard',market:'points',line:26.5,side:'over',
  selection:'O 26.5',price:-112,book:'Test Book',eventId:'game42',
  slateDate:'2026-10-09',dateSource:'event'
};
{
  const h=harness();
  assert.deepEqual(await h.savePickSelection(pick),{saved:true});
  assert.equal(h.queries.length,1);
  assert.equal(h.queries[0].table,'picks');
  const saved=h.queries[0].insert;
  assert.equal(saved.user_id,'account-123');
  assert.equal(saved.prop_key,pick.key);
  assert.equal(saved.side,'over');
  assert.equal(saved.line,'26.5');
  assert.equal(saved.price,-112);
  assert.equal(saved.slate_date,pick.slateDate);
  assert.ok(saved.note.length<=280);
}
{
  const h=harness({duplicate:true});
  assert.deepEqual(await h.savePickSelection(pick),{alreadySaved:true});
  assert.equal(h.queries.length,1,'Duplicate still checked by unique database key');
}
{
  const h=harness();
  await assert.rejects(h.savePickSelection({...pick,market:'atd',selection:'YES'}),/Only exact Over\/Under/);
  await assert.rejects(h.savePickSelection({...pick,side:'yes'}),/Only exact Over\/Under/);
  await assert.rejects(h.savePickSelection({...pick,slateDate:'not-a-date'}),/valid save date/);
  assert.equal(h.queries.length,0,'Unsupported selections must not write to database');
}
{
  const h=harness({guest:true});
  await assert.rejects(h.savePickSelection(pick),/Sign in/);
  assert.equal(h.queries.length,0);
}
{
  const h=harness();
  const watch=await h.saveWatchlistPlayer({
    sport:'nhl',playerId:777,player:'Test Center',team:'ABC',slateDate:'2026-10-09'
  });
  assert.deepEqual(watch,{saved:true});
  assert.equal(h.queries[0].table,'watchlist');
  assert.deepEqual([h.queries[0].insert.user_id,h.queries[0].insert.player_id],['account-123',777]);
  await assert.rejects(h.saveWatchlistPlayer({sport:'nfl',playerId:'GSIS-X',
    player:'Test',slateDate:'2026-10-09'}),/verified numeric player ID/);
  assert.equal(h.queries.length,1);
}
{
  const h=harness();
  assert.deepEqual(await h.removeSavedActivity('picks',30),{removed:true});
  assert.deepEqual(h.queries[0].fields,[['id',30],['user_id','account-123']]);
  await assert.rejects(h.removeSavedActivity('profiles',30),/Unsupported/);
}
{
  const binary={
    sport:'nfl',market:'atd',player:'Verified Touchdown Player',team:'DAL',
    key:'nfl|event|verified-player|atd|0.5|yes',selection:'yes',
    sourceSide:'over',line:0.5,price:+165,book:'Verified Book',
    eventId:'nfl-event',slateDate:'2026-10-09',dateSource:'event'
  };
  const h=harness();
  assert.deepEqual(await h.saveBinarySelection(binary),{saved:true});
  assert.equal(h.queries.length,1);
  assert.equal(h.queries[0].table,'tso2_saved_selections');
  const record=h.queries[0].insert;
  assert.equal(record.user_id,'account-123');
  assert.equal(record.prop_key,binary.key);
  assert.equal(record.selection,'yes');
  assert.equal(record.source_side,'over');
  assert.equal(record.american_price,165);
  assert.equal(record.source_line,'0.5');
  assert.equal(record.date_source,'event');
  await assert.rejects(h.saveBinarySelection({...binary,selection:'no'}),/verified exact YES\/NO/);
  await assert.rejects(h.saveBinarySelection({...binary,market:'points'}),/verified exact YES\/NO/);
  await assert.rejects(h.saveBinarySelection({...binary,slateDate:'2026/10/09'}),/verified exact YES\/NO/);
  assert.equal(h.queries.length,1,'Invalid selections must never hit the database');
  const hNo=harness();
  await hNo.saveBinarySelection({...binary,sourceSide:'under',selection:'no',key:'nfl|other|no'});
  assert.equal(hNo.queries[0].insert.selection,'no');
  const dup=harness({duplicate:true});
  assert.deepEqual(await dup.saveBinarySelection(binary),{alreadySaved:true});
  const guest=harness({guest:true});
  await assert.rejects(guest.saveBinarySelection(binary),/Sign in/);
  const remove=harness();
  assert.deepEqual(await remove.removeSavedActivity('tso2_saved_selections',9),{removed:true});
  assert.deepEqual(remove.queries[0].fields,[['id',9],['user_id','account-123']]);
}
const uiStart=appCode.indexOf('  function canSaveExactPick(row){');
const uiEnd=appCode.indexOf('  function renderPropsBoard(root,rows){',uiStart);
assert.ok(uiStart>=0&&uiEnd>uiStart);
const helpers=appCode.slice(uiStart,uiEnd);
const domRules=new Function('propSelectionText',helpers+';return {canSaveExactPick,canSaveBinaryPick,exactBinaryDecision,canWatchPlayer,savedActivityDate};')(r=>r.selection||(['atd','atg','fgs','hr'].includes(r.market)&&r.side==='over'?'YES':'U 0.5'));
assert.equal(domRules.canSaveExactPick(pick),true);
assert.equal(domRules.canSaveExactPick({...pick,market:'atd',selection:'YES'}),false);
assert.equal(domRules.canSaveExactPick({...pick,side:'yes'}),false);
assert.equal(domRules.canSaveBinaryPick({...pick,sport:'nfl',market:'atd',side:'over',line:0.5,selection:'YES'}),true);
assert.equal(domRules.canSaveBinaryPick({...pick,sport:'nhl',market:'atg',side:'under',line:0.5,selection:'NO'}),true);
assert.equal(domRules.canSaveBinaryPick({...pick,sport:'mlb',market:'hr',side:'under',line:0.5,selection:'U 0.5'}),false,
  'Do not silently convert Under 0.5 to NO');
assert.equal(domRules.canSaveBinaryPick({...pick,sport:'nfl',market:'atd',side:'under',selection:'YES'}),false);
assert.equal(domRules.canSaveBinaryPick({...pick,sport:'nba',market:'points',side:'over',selection:'YES'}),false);
assert.equal(domRules.canWatchPlayer({sport:'nhl',playerId:777,player:'Test'}),true);
assert.equal(domRules.canWatchPlayer({sport:'nfl',playerId:'GSIS-X',player:'Test'}),false);
assert.deepEqual(domRules.savedActivityDate({eventDate:'2026-10-09'}),{date:'2026-10-09',source:'event'});
assert.match(appCode,/data-props-save/);
assert.match(appCode,/data-props-watch/);
assert.match(appCode,/data-profile-remove-saved/);
assert.match(appCode,/rows.every\(row=>canSaveExactPick\(row\)\|\|canSaveBinaryPick\(row\)\)/,
  'Never partially save unsupported parlay legs');
assert.match(fs.readFileSync('tso2/pages.js','utf8'),/data-parlay-save-legs/);
assert.match(appCode,/profileSavedGroup\('YES \/ NO picks',data\.binarySelections,'binary'\)/,'Profile displays binary history');
console.log('TSO2 saved selections: Over/Under and YES/NO exact source fields, guest guard, isolation, removal and mixed Parlay checks passed');
