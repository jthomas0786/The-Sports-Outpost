import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../verified-research.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const world={};
runInNewContext(src,{window:world,Date});
const module=world.TSO3ObservedResearch;
const games={
 mlb:{id:'401908042',league:'mlb',startTime:'2026-10-24T23:00:00Z',away:{abbr:'TB'},home:{abbr:'MIL'}},
 wnba:{id:'401777123',league:'wnba',startTime:'2026-10-24T22:00:00Z',away:{abbr:'IND'},home:{abbr:'NY'}},
 cfb:{id:'401789223',league:'cfb',startTime:'2026-10-24T22:00:00Z',away:{abbr:'TEX'},home:{abbr:'OU'}},
 nhl:{id:'401809333',league:'nhl',startTime:'2026-10-24T22:00:00Z',away:{abbr:'CHI'},home:{abbr:'DAL'}},
 nfl:{id:'401873017',league:'nfl',startTime:'2026-10-25T17:00:00Z',away:{abbr:'SF'},home:{abbr:'ATL'}}
};
test('research is actually routed for five of the six connected sports',()=>{
 for(const [sport,tool] of [['mlb','home-run-matchups'],['wnba','player-trends'],['cfb','quarterback-rankings'],
  ['nhl','goalie-matchups'],['nfl','explosive-plays']]){
  assert.equal(module.supports(sport,tool),true);
  const view=module.render({sport,games:Object.values(games),title:tool},tool);
  assert.match(view,/Official Player Research/);
  assert.match(view,/data-observed-game/);
  assert.match(view,/not fully integrated/);
  assert.match(view,/Loading ESPN verified rosters/);
  assert.match(view,new RegExp(games[sport].id));
 }
});
test('no non-source-backed specialized categories are marked ready',()=>{
 for(const [sport,tool] of [['mlb','exit-velocity'],['mlb','pitch-mix'],['cfb','power-ratings'],
  ['nhl','scoring-chances'],['wnba','game-projections'],['nfl','wr-vs-cb-matchups']])
  assert.equal(module.supports(sport,tool),false);
});
test('no current fixture does not manufacture starting lineup or projected stats',()=>{
 const view=module.render({sport:'wnba',games:[],title:'Player Trends'},'player-trends');
 assert.match(view,/no current matchup roster/i);
 assert.doesNotMatch(view,/data-observed-player=/);
});
test('all registered sport modules use exact ESPN fixture and athlete IDs',()=>{
 assert.match(src,/verified roster did not match selected official fixture/i);
 assert.match(src,/doc\.available/);
 assert.match(src,/String\(data\.athleteId\)!==athlete/);
 assert.match(src,/data\.athleteName.*canon\(name\)/);
 assert.match(src,/not prove game-day starters/);
 assert.match(src,/No missing game is treated as zero/i);
});
test('UI script is served, navigated and hydrated through existing verified endpoints',()=>{
 assert.match(html,/verified-research\.js/);
 assert.match(worker,/verified-research\\\.js/);
 assert.match(app,/window\.TSO3ObservedResearch\.render/);
 assert.match(app,/window\.TSO3ObservedResearch\.hydrate/);
 assert.match(worker,/u\.pathname==='\/api\/game-roster'/);
 assert.match(worker,/u\.pathname==='\/api\/athlete-depth'/);
});
