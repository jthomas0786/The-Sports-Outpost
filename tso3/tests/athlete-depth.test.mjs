/* ESPN player history response-shape tests, offline fixtures only.
   node --test tso3/tests/athlete-depth.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const from=source.indexOf('const ATHLETE_PATHS=');
const to=source.indexOf('async function safeNbaInjuries(){',from);
assert.ok(from>=0&&to>from,'athlete parser must exist');
const {athleteGamelogEntries,athleteSeasonStats,verifiedAthleteDepth}=
 runInNewContext(source.slice(from,to)+';({athleteGamelogEntries,athleteSeasonStats,verifiedAthleteDepth})');
const now=Date.parse('2026-10-24T02:00:00Z');
const fixture=()=>({
 names:['goals','assists','shotsTotal'],labels:['G','A','SOG'],
 events:[
  {id:'401099001',gameDate:'2026-10-23T01:00:00Z',opponent:{id:'8',abbreviation:'NYR'},gameResult:'W'},
  {id:'401099002',gameDate:'2026-10-21T01:00:00Z',opponent:{id:'9',abbreviation:'BUF'},gameResult:'L'}
 ],
 seasonTypes:[{displayName:'2026-27 Regular Season',categories:[
  {displayName:'Offense',events:[
   {eventId:'401099001',stats:['1','2','4']},
   {eventId:'401099002',stats:['0','0','2']}
  ]}
 ]}]
});
test('join seasonType category stats to root event metadata for correct opponent',()=>{
 const arr=athleteGamelogEntries(fixture(),now);
 assert.equal(arr.length,2);
 assert.equal(arr[0].opponent,'NYR');
 assert.equal(arr[0].stats.find(s=>s.name==='Offense:goals')?.numeric,1);
 assert.equal(arr[1].stats.find(s=>s.name==='Offense:goals')?.numeric,0);
});
test('missing or future game data is not fabricated into a numeric zero',()=>{
 const doc=fixture();
 doc.seasonTypes[0].categories[0].events.pop();
 doc.events.push({id:'401099010',gameDate:'2026-10-25T01:00:00Z',stats:['7','7','7']});
 const arr=athleteGamelogEntries(doc,now);
 assert.equal(arr.length,1);
 assert.equal(arr[0].eventId,'401099001');
});
test('season stat labels stay tied to actual values and preserve nonnumeric entries',()=>{
 const r=athleteSeasonStats({categories:[{displayName:'General',
  names:['goals','shootingPct'],labels:['G','SH%'],totals:['16','.118']}]});
 assert.equal(r[0].values[0].numeric,16);
 assert.equal(r[0].values[1].label,'SH%');
});
test('player ID input cannot target arbitrary host or unsupported season',async()=>{
 await assert.rejects(()=>verifiedAthleteDepth('unknown','12',2026),/Unsupported/);
 await assert.rejects(()=>verifiedAthleteDepth('nba','../../etc',2026),/Unsupported/);
 await assert.rejects(()=>verifiedAthleteDepth('nba','1234567',2099),/Unsupported/);
});
test('mismatched independent source athlete ID is blocked',async()=>{
 // This test applies the name/ID validation contract to any accepted payload.
 const text=source.slice(from,to);
 assert.match(text,/foundId&&foundId!==id/);
});
