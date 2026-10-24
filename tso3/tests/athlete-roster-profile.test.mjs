/* ESPN numeric-ID roster resolution for full six-sport dashboards. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const rs=source.indexOf('function officialRosterAthletes(doc){');
const re=source.indexOf('async function officialVerifiedGameById(',rs);
const ps=source.indexOf('async function rosterBackedAthleteIdentity(');
const pe=source.indexOf('async function verifiedAthleteDepth(',ps);
assert.ok(rs>=0&&re>rs&&ps>=0&&pe>ps);
const athleteRow=(id='40884',url='https://a.espncdn.com/i/headshots/mlb/players/full/40884.png')=>
 ({id,displayName:'Bryan Baker',position:{abbreviation:'RP'},headshot:{href:url}});
const gamelog={events:{'401990010':{id:'401990010',gameDate:'2026-10-20T20:00:00Z',
 team:{id:'11',abbreviation:'TB'}}}};
function resolver(rows=[athleteRow()]){
 const ctx={
  ATHLETE_PATHS:{mlb:'baseball/mlb'},
  fetch:async()=>({ok:true,json:async()=>({athletes:[{items:rows}]})}),
  AbortSignal:{timeout:()=>null},Date,Promise,Number,String,Object
 };
 return runInNewContext(source.slice(rs,re)+source.slice(ps,pe)+';rosterBackedAthleteIdentity',ctx);
}
test('numeric ESPN player id joins exactly to official roster identity',async()=>{
 const p=await resolver()('mlb','40884',gamelog);
 assert.equal(p.name,'Bryan Baker');
 assert.equal(p.teamAbbr,'TB');
 assert.equal(p.position,'RP');
 assert.match(p.source,/exact athlete ID/);
});
test('same-name athlete with the wrong ESPN ID is never attached',async()=>{
 const p=await resolver([athleteRow('90000')])('mlb','40884',gamelog);
 assert.equal(p,null);
});
test('official CDN headshots only, rejecting attacker-controlled URLs',async()=>{
 const p=await resolver([athleteRow('40884','https://example.com/evil.png')])('mlb','40884',gamelog);
 assert.equal(p.headshot,null);
});
test('without an ESPN-recorded team id, roster identity cannot be invented',async()=>{
 const p=await resolver()('mlb','40884',{events:{'40199':{gameDate:'2026-10-20T20:00:00Z'}}});
 assert.equal(p,null);
});
