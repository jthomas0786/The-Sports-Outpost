/* Guard the NFL cheatsheet wiring that previously routed supported research
   to a generic "Data connection still needed" placeholder. No network I/O. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=file('app.js'),lab=file('nfl-lab.js');

test('TD Matchups route renders independent current NFL touchdown research',()=>{
 assert.match(app,/\['TD Matchups','Touchdown opportunities/);
 assert.match(app,/'td-matchups':'touchdown-opportunities'/);
 assert.match(app,/if\(state\.sport==='nfl'&&nflLabTool\(state\.tool\)\)/);
 assert.match(app,/nflResearch\(mapped\)/);
 assert.match(app,/state\.nflTD\?\.games\?\.length\|\|state\.nflResearch\?\.players\?\.length/);
 assert.match(app,/Individual CB assignments, receiver alignment/);
});
test('red-zone and team defense categories link to observed sources with honest scope',()=>{
 assert.match(app,/'redzone-matchups':'red-zone-usage'/);
 assert.match(app,/'team-defensive-stats':'defense-vs-position'/);
 assert.match(app,/NOT independently tracked 2026 inside-20 touches/);
 assert.match(app,/group-level allowances, not player-to-defender assignments/);
});
test('TD research uses opponent-position, same-season observations and withholds conflicting samples',()=>{
 assert.match(lab,/const positionGroups=new Map\(defensePositionRows/);
 assert.match(lab,/positionGroups\.get\('dvp\|'\+game\.id\+'\|'\+opp\+'\|'\+pos\)/);
 assert.match(lab,/group&&!group\.sourceConflict&&num\(group\.defense\?\.games\)>=3/);
 assert.match(lab,/num\(group\.defense\?\.perGame\?\.tds\)!==null/);
 assert.match(lab,/'DEF VS POS TD\/GM','DEF GAMES'/);
 assert.match(lab,/\{text:f\(r\.oppTdGroup\?\.tdsPerGame\)\}/);
 assert.match(lab,/Blank cells remain unverified/);
});
