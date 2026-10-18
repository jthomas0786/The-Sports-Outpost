import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('tso2/functions/verify-mlb-hr/index.ts','utf8');
const app=fs.readFileSync('tso2/app.js','utf8');
const auth=fs.readFileSync('tso2/auth.js','utf8');
const migration=fs.readFileSync('tso2/migrations/20261009_verified_hit_alerts.sql','utf8');
assert.match(source,/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
assert.match(source,/\/auth\/v1\/user/,'Always validate signed-in user on backend');
assert.match(source,/user_id=eq\./,'Only query authenticated user selections');
assert.match(source,/api\/v1\.1\/game/,'Official MLB event detail required');
assert.match(source,/resolution=ignore-duplicates/,'Deduplicate source event alerts on server');
assert.match(migration,/unique \(saved_selection_id,evidence_key\)/);
assert.match(migration,/grant select on public\.tso2_verified_hits to authenticated/);
assert.match(migration,/grant update \(read\)/);
assert.doesNotMatch(migration,/grant insert.*authenticated/i);
assert.match(auth,/async loadVerifiedHits\(limit=16\)/);
assert.match(auth,/async markVerifiedHitsRead\(ids=null\)/);
assert.match(auth,/async checkVerifiedHomeRuns\(\)/);
assert.match(app,/function verifiedHitEntry\(row\)/);
assert.match(app,/window\.TSO_AUTH\.markVerifiedHitsRead/);
assert.match(app,/VERIFIED_HIT_POLL_MS/);
assert.doesNotMatch(app,/\.from\('tso2_verified_hits'\)\.insert/);

const start=source.indexOf('const normalize=');
const end=source.indexOf('Deno.serve(',start);
assert.ok(start>0&&end>start);
const lib=source.slice(start,end);
const extractor=new Function('Deno','fetch',
  lib+';return {normalize,isoDay,matchingHomeRun};')(
    {env:{get:()=>''}},async()=>{throw Error('Not for unit tests')});
const {matchingHomeRun,isoDay}=extractor;
assert.equal(isoDay('2026-10-09'),'2026-10-09');
assert.equal(isoDay('bad-date'),'');
const game={gamePk:77777,teamId:10,teams:{
  home:{team:{id:10}},away:{team:{id:20}}}};
const picker={player:'José Ramírez',team:'CLE',created_at:'2026-10-09T19:00:00Z'};
function fixture({batter=123,team='home',scoringAt='2026-10-09T21:15:00Z',event='home_run',status='Live',name='Jose Ramirez',atBat=2}={}){
  return {gameData:{status:{abstractGameState:status},players:{ID123:{fullName:name}}},
    liveData:{boxscore:{teams:{
      home:{batters:team==='home'?[123]:[]},
      away:{batters:team==='away'?[123]:[]}
    }},plays:{allPlays:[{
      result:{eventType:event},matchup:{batter:{id:batter,fullName:name}},
      about:{endTime:scoringAt,atBatIndex:atBat}
    }]}}};
}
const correct=matchingHomeRun(fixture(),game,picker);
assert.deepEqual(correct,{gameId:'77777',atBat:2,occurredAt:'2026-10-09T21:15:00.000Z',officialName:'Jose Ramirez'});
assert.equal(matchingHomeRun(fixture({team:'away'}),game,picker),null,'Wrong team cannot score for pick');
assert.equal(matchingHomeRun(fixture({name:'Different Player'}),game,picker),null,'Wrong batter identity');
assert.equal(matchingHomeRun(fixture({scoringAt:'2026-10-09T18:00:00Z'}),game,picker),null,'Never alert on HR before save');
assert.equal(matchingHomeRun(fixture({scoringAt:''}),game,picker),null,'Missing official event timestamp');
assert.equal(matchingHomeRun(fixture({event:'double'}),game,picker),null,'Double is not a HR');
assert.equal(matchingHomeRun(fixture({status:'Preview'}),game,picker),null,'Pregame never has verified HR');
assert.equal(matchingHomeRun(fixture({atBat:-1}),game,picker),null,'Unidentified scoring play');
console.log('TSO2 official MLB HR verifier passed: player/team, strict event type, save-before-score, timestamp, status and service-only inbox');
