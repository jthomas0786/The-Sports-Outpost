/* NHL defense vs position source-backed matrix and UI regression.
   node --test tso3/tests/nhl-defense-matrix.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const a=source.indexOf('async function verifiedNhlDefenseMatrix(){');
const b=source.indexOf('async function verifiedNhlMatchupHistory(',a);
assert.ok(a>=0&&b>a,'NHL defense matrix missing');
const fixture={currentSeason:2027,generatedAt:'2026-10-24T01:36:41Z',
 players:{'2273':{},'5291935':{}},teamDefense:{teams:{
  FLA:{games:30,currentSeasonGames:11,goalsAllowedPerGame:3.3,shotsAllowedPerGame:27,
   recent10GoalsAllowedPerGame:3.4,recent10ShotsAllowedPerGame:25,
   position:{C:{games:30,goalsPerGame:1.3,shotsPerGame:8.6,goalAllowedRank:11,rankedTeams:32}}},
  MTL:{games:25,currentSeasonGames:10,goalsAllowedPerGame:2.9,shotsAllowedPerGame:29,
   position:{C:{games:25,goalsPerGame:1.1,shotsPerGame:8.2,goalAllowedRank:17,rankedTeams:32}}}
 }}};
const build=runInNewContext(source.slice(a,b)+';verifiedNhlDefenseMatrix',{
 tsoNhlResearchData:async()=>fixture,Date,Math,Object,Number,String,Promise});
test('defensive position sample sizes and source grades preserved',async()=>{
 const result=await build();
 assert.equal(result.available,true);
 assert.equal(result.teams.length,2);
 assert.equal(result.playerCount,2);
 assert.equal(result.teams[0].position.C.goalsPerGame,1.3);
 assert.equal(result.teams[0].position.C.goalAllowedRank,11);
 assert.equal(result.teams[0].position.C.games,30);
});
test('backend only exposes observed position categories and never a model probability',async()=>{
 const r=await build();
 assert.equal(r.teams[0].position.W,undefined);
 assert.equal(r.teams[0].modelProbability,undefined);
 assert.match(r.note,/not a sportsbook/);
});
test('NHL defensive table and four category routes exist in shared frontend',()=>{
 for(const name of ['Defense Vs Position','Team Statistics','Shots on Goal','Goal Scorer Matchups'])assert.ok(app.includes(name));
 assert.match(app,/function renderNhlDefenseMatrix\(/);
 assert.match(app,/id="nhlDefensePosition"/);
 assert.match(app,/hydrateNhlDefenseMatrix\(\)/);
});
