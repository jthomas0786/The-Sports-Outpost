/* ESPN numeric composite and independently reconstructed exact player markets.
   Node 20: node --test tso3/tests/athlete-composite-markets.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const dashboard=readFileSync(new URL('../player-dashboard.js',import.meta.url),'utf8');
const from=worker.indexOf('function athleteStatFields('),
  to=worker.indexOf('function athleteGamelogEntries(',from);
const derivedFrom=worker.indexOf('function verifiedDerivedAthleteStats('),
  derivedTo=worker.indexOf('function athleteSeasonStats(',derivedFrom);
assert.ok(from>=0&&to>from&&derivedFrom>=0&&derivedTo>derivedFrom);
const {athleteStatFields,verifiedDerivedAthleteStats}=runInNewContext(
 worker.slice(from,to)+worker.slice(derivedFrom,derivedTo)
 +';({athleteStatFields,verifiedDerivedAthleteStats})'
);
const browser={window:{}};
runInNewContext(dashboard,browser);
const model=browser.window.TSO3PlayerDashboard;
test('preserve source 14-26 and separately identify made vs attempted from exact ESPN source',()=>{
 const values=athleteStatFields(['fieldGoalsMade-fieldGoalsAttempted'],['FG'],['14-26']);
 assert.equal(values.length,3);
 assert.equal(values[0].value,'14-26');
 assert.equal(values[0].numeric,null);
 assert.equal(values[1].name,'fieldGoalsMade');
 assert.equal(values[1].numeric,14);
 assert.equal(values[2].name,'fieldGoalsAttempted');
 assert.equal(values[2].numeric,26);
});
test('no fabricated made/attempted stats from missing, invalid or unmatched ESPN values',()=>{
 for(const val of ['-', '', '14-?', '14-26-?', '4:33']){
  const results=athleteStatFields(['fieldGoalsMade-fieldGoalsAttempted'],['FG'],[val]);
  assert.equal(results.length,1,'input '+val);
  assert.equal(results[0].numeric,null);
 }
});
const stats=(values)=>Object.entries(values).map(([name,numeric])=>({name:'October:'+name,numeric,value:String(numeric)}));
const game=(values)=>({eventId:'401999123',date:'2026-10-23T01:00:00Z',stats:stats(values)});
test('PRA and P+R exact same-game arithmetic added only with complete separate official stats',()=>{
 const done=verifiedDerivedAthleteStats([game({points:25,rebounds:8,assists:7})],'nba');
 const got=done[0].stats.find(x=>x.name==='TSO Derived:pointsReboundsAssists');
 assert.equal(got.numeric,40);
 assert.equal(got.derivedFrom.length,3);
 assert.equal(model.marketStatMatches('PRA',got.name),true);
 assert.equal(model.marketStatMatches('Points + Rebounds', 'TSO Derived:pointsRebounds'),true);
});
test('no PRA without an ESPN-reported assists observation for that SAME game',()=>{
 const done=verifiedDerivedAthleteStats([game({points:25,rebounds:8})],'nba');
 assert.equal(done[0].stats.some(x=>x.name.endsWith('pointsReboundsAssists')),false);
 assert.equal(done[0].stats.find(x=>x.name.endsWith('pointsRebounds')).numeric,33);
});
test('MLB H+R+RBI requires hits, runs and RBIs from the same source game',()=>{
 const done=verifiedDerivedAthleteStats([game({hits:2,runs:1,RBIs:3})],'mlb')[0];
 assert.equal(done.stats.find(x=>x.name.endsWith('hitsRunsRbis')).numeric,6);
 assert.equal(model.marketStatMatches('H+R+RBI','TSO Derived:hitsRunsRbis'),true);
 assert.equal(verifiedDerivedAthleteStats([game({hits:2,runs:1})],'mlb')[0].stats
  .some(x=>x.name.endsWith('hitsRunsRbis')),false);
});
test('published three-point field goals composite made stat maps to 3PM prop, not attempts',()=>{
 const a=athleteStatFields(['threePointFieldGoalsMade-threePointFieldGoalsAttempted'],['3PT'],['4-9']);
 assert.equal(model.marketStatMatches('threes','October:'+a[1].name),true);
 assert.equal(model.marketStatMatches('threes','October:'+a[2].name),false);
});
test('literal goals do not count as NHL first goal',()=>{
 assert.equal(model.marketStatMatches('firstGoal','October:goals'),false);
});

test('ESPN totalRebounds alias supports NBA PRA and actual rebound props',()=>{
 const ev=game({points:25,totalRebounds:8,assists:7});
 const got=verifiedDerivedAthleteStats([ev],'nba')[0].stats;
 assert.equal(got.find(x=>x.name.endsWith('pointsReboundsAssists')).numeric,40);
 assert.equal(model.marketStatMatches('rebounds','October:totalRebounds'),true);
});
test('MLB singular RBI provider aliases build an observed H+R+RBI from same game only',()=>{
 const got=verifiedDerivedAthleteStats([game({hits:3,runs:1,RBI:2})],'mlb')[0].stats;
 assert.equal(got.find(x=>x.name.endsWith('hitsRunsRbis')).numeric,6);
});
