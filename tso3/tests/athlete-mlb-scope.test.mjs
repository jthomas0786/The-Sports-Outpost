/* TSO 3.0 pitcher versus batter game-log stat semantic isolation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const dashboard=readFileSync(new URL('../player-dashboard.js',import.meta.url),'utf8');
const from=source.indexOf('function athleteProviderCategory('),
  to=source.indexOf('function verifiedDerivedAthleteStats(',from);
const combineFrom=source.indexOf('function verifiedDerivedAthleteStats('),
  combineTo=source.indexOf('function athleteSeasonStats(',combineFrom);
assert.ok(from>=0&&to>from&&combineFrom>=0&&combineTo>combineFrom);
const {athleteProviderCategory,scopeMlbAthleteValues,verifiedDerivedAthleteStats}=
 runInNewContext(source.slice(from,to)+source.slice(combineFrom,combineTo)
 +';({athleteProviderCategory,scopeMlbAthleteValues,verifiedDerivedAthleteStats})');
const browser={window:{}};runInNewContext(dashboard,browser);
const {marketStatMatches}=browser.window.TSO3PlayerDashboard;
test('official ESPN MLB pitching category is explicitly identified',()=>{
 assert.equal(athleteProviderCategory({filters:[{name:'category',value:'pitching'}]},'mlb'),'pitching');
 assert.equal(athleteProviderCategory({filters:[{name:'category',value:'batting'}]},'mlb'),'batting');
 assert.equal(athleteProviderCategory({filters:[{name:'category',value:'pitching'}]},'nba'),null);
});
test('pitcher raw opponent hits and runs are never mislabeled as batter hitting',()=>{
 const original=[{name:'october:hits',label:'H',numeric:3,value:'3'},
  {name:'october:runs',label:'R',numeric:2,value:'2'},
  {name:'october:earnedRuns',label:'ER',numeric:1,value:'1'}];
 const mapped=scopeMlbAthleteValues(original,'pitching');
 assert.equal(mapped[0].name,'october:hitsAllowed');
 assert.equal(mapped[0].originalESPNStat,'october:hits');
 assert.equal(mapped[1].name,'october:runsAllowed');
 assert.equal(mapped[2].name,'october:earnedRuns');
 assert.equal(marketStatMatches('hits',mapped[0].name),false);
 assert.equal(marketStatMatches('hitsAllowed',mapped[0].name),true);
});
test('pitcher hits/runs allowed must not create false batter H+R+RBI hit rates',()=>{
 const rows=[{eventId:'401999123',stats:scopeMlbAthleteValues([
  {name:'october:hits',numeric:4},{name:'october:runs',numeric:3},
  {name:'october:RBIs',numeric:2}
 ],'pitching')}];
 const derived=verifiedDerivedAthleteStats(rows,'mlb')[0];
 assert.equal(derived.stats.some(v=>v.name.endsWith('hitsRunsRbis')),false);
});
test('batting source keys and complete same-game H+R+RBI remain unchanged',()=>{
 const raw=[{name:'october:hits',numeric:4},{name:'october:runs',numeric:3},
  {name:'october:RBIs',numeric:2}];
 const data=verifiedDerivedAthleteStats([{eventId:'401999123',
  stats:scopeMlbAthleteValues(raw,'batting')}],'mlb')[0];
 assert.equal(data.stats.find(v=>v.name.endsWith('hitsRunsRbis')).numeric,9);
});
test('missing MLB category stays unknown instead of inferring the batter/pitcher stat',()=>{
 assert.equal(athleteProviderCategory({filters:[]},'mlb'),null);
});

test('unknown ESPN MLB batting/pitching scope cannot claim a batter hits history',()=>{
 const rows=scopeMlbAthleteValues([{name:'october:hits',label:'H',value:'2',numeric:2}], 'unknown');
 assert.equal(rows[0].scope,'unknown');
 assert.equal(marketStatMatches('hits',rows[0].name),false);
 assert.equal(marketStatMatches('hitsAllowed',rows[0].name),false);
});
