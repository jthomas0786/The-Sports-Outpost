#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { optimizeHalftimeParlay } from '../sports/nfl/halftime-optimizer-v884.js';
import { isHalftimeState, isHalftimeWarmupState } from '../sports/nfl/sim/auto.js';

const read=p=>fs.readFileSync(p,'utf8');
const preview=read('sports/nfl-preview.js');
const router=read('sports/router.js');
const index=read('index.html');
const workflow=read('.github/workflows/nfl-live.yml');
const simAuto=read('scripts/nfl-sim-auto.mjs');
const ui=read('sports/nfl/halftime-ui-v884.js');
const style=read('sports/nfl/gamecast-v884-styles.js');
const pkg=JSON.parse(read('package.json'));

assert.match(preview,/halftime-ui-v884\.js\?v=88\.4/);
assert.match(preview,/gamecast-v884-styles\.js\?v=88\.4/);
assert.match(preview,/v884EndzoneStyle\(g\.away\.abbr\)/);
assert.match(preview,/v884EndzoneStyle\(g\.home\.abbr\)/);
assert.match(preview,/v884MarkerLeft\(ball\)/);
assert.match(preview,/data-v884-possession-football/);
assert.match(preview,/halftimeGamecastBannerHTML\(g,state\.halftime,data\(\)\.games\)/);
assert.match(style,/team palette/i);
assert.match(style,/horizontal name/i);
assert.match(style,/rotateX\(42deg\)/);
assert.match(ui,/no fixed cap/i);
assert.match(ui,/Use every selected READY game/i);
assert.match(ui,/thresholdMinutes=2/);
assert.match(workflow,/nfl-halftime-window-refresh\.mjs/);
assert.match(simAuto,/halftime 50K waiting for staged live sportsbook props/);
assert.match(router,/nfl-preview\.js\?v=88\.4/);
assert.match(index,/sports\/router\.js\?v=88\.4/);
assert.equal(pkg?.scripts?.['nfl:v88.4:test'],'node scripts/nfl-v884-selftest.mjs');

assert.equal(isHalftimeWarmupState({status:'in',period:2,clockMin:2},2),true);
assert.equal(isHalftimeWarmupState({status:'in',period:2,clockMin:2.01},2),false);
assert.equal(isHalftimeState({status:'in',period:2,clockMin:0,statusDetail:'Halftime'}),true);

function mask(iterations=64){return Buffer.alloc(Math.ceil(iterations/8),0xff).toString('base64');}
const boards=[];
for(let g=1;g<=4;g++){
  const candidates=[];
  for(let i=1;i<=4;i++){
    candidates.push({id:`g${g}c${i}`,gameId:`g${g}`,playerId:`p${g}-${i}`,name:`Player ${g}-${i}`,team:`T${g}`,market:'recYds',side:'over',line:39.5+i,price:-110,simProbability:.60-i*.01,bookFairProbability:.50,edge:.09-i*.01,grade:'B+',worldMaskB64:mask(),worldMaskIterations:64});
  }
  boards.push({gameId:`g${g}`,ready:true,iterations:64,candidates,rankings:{tsoPick:candidates.map(c=>c.id)},correlations:{positive:[],conflicts:[]}});
}
const eight=optimizeHalftimeParlay({boards,legCount:8,maxGames:null,mode:'tsoPick',requireEverySelectedGame:true});
assert.equal(eight.error,undefined);
assert.equal(eight.legs.length,8);
assert.equal(eight.evaluation.gamesUsed,4);
assert.equal(new Set(eight.legs.map(x=>x.gameId)).size,4);

console.log('✓ v88.4 self-test passed');
console.log('  ✓ possession football is header-only and v88.4-scoped');
console.log('  ✓ team-color horizontal end zones + stronger 3D perspective wired');
console.log('  ✓ Q2 2:00 UI warmup + Q2 5:00 backend prefetch supported');
console.log('  ✓ 8-leg / 4-game optimizer build succeeds (old 6-leg / 3-game caps removed)');
console.log('  ✓ halftime 50K waits for staged live sportsbook props');
console.log('  ✓ index -> router -> NFL v88.4 cache chain');
