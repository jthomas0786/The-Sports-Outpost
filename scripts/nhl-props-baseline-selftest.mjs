#!/usr/bin/env node
import assert from 'node:assert/strict';
import {currentSeasonWeight,historicalPropProjection,propLine} from '../sports/nhl/props-model.js';
import {overProbability} from '../sports/nhl/grade.js';
import {historicalModalFallback} from '../sports/nhl/player-modal-v921.js';

const base={
  season:2026,
  games:82,
  rates:{goals:.45,sog:3,points:1.1,assists:.65,blocks:1.2,saves:25},
  recentGames:[],
};
const row=(seasonType,sog)=>({season:2027,seasonType,stats:{sog}});

assert.equal(currentSeasonWeight(0),0);
assert.equal(currentSeasonWeight(5),0);
assert.equal(currentSeasonWeight(10),1/3);
assert.equal(currentSeasonWeight(20),1);

const prior=historicalPropProjection(base,'sog',2027);
assert.equal(prior.priorMean,3);
assert.equal(prior.currentGames,0);
assert.equal(prior.currentWeight,0);
assert.equal(prior.metric.mean,3);
assert.ok(Number.isFinite(overProbability(prior.metric,2.5)));

const preseason=historicalPropProjection({...base,recentGames:[row(1,99),row(1,99)]},'sog',2027);
assert.equal(preseason.currentGames,0,'preseason games must not enter active-season blend');
assert.equal(preseason.metric.mean,3);

const four=historicalPropProjection({...base,recentGames:Array.from({length:4},()=>row(2,4))},'sog',2027);
assert.equal(four.currentWeight,0);
assert.equal(four.metric.mean,3);

const ten=historicalPropProjection({...base,recentGames:Array.from({length:10},()=>row(2,4.5))},'sog',2027);
assert.equal(ten.currentGames,10);
assert.ok(Math.abs(ten.currentWeight-1/3)<1e-12);
assert.ok(Math.abs(ten.metric.mean-3.5)<1e-12);

const twenty=historicalPropProjection({...base,recentGames:Array.from({length:20},()=>row(2,4))},'sog',2027);
assert.equal(twenty.currentWeight,1);
assert.equal(twenty.metric.mean,4);

assert.deepEqual(propLine('sog',{line:3.5}),{line:3.5,reference:false});
assert.deepEqual(propLine('sog',null),{line:2.5,reference:true});
assert.deepEqual(propLine('atg',null),{line:.5,reference:true});
assert.deepEqual(propLine('saves',null),{line:24.5,reference:true});

const atg=historicalPropProjection(base,'atg',2027);
const atgHit=overProbability(atg.metric,.5);
assert.ok(atgHit>0&&atgHit<1);

const modalFallback=historicalModalFallback(base,'sog',2027,null);
assert.ok(modalFallback,'player modal must get the same verified fallback as the Props list');
assert.equal(modalFallback.source,'historical');
assert.equal(modalFallback.referenceLine,true);
assert.equal(modalFallback.line,2.5);
assert.equal(modalFallback.grade.length>0,true);
assert.ok(modalFallback.probability>0&&modalFallback.probability<1);
const modalBook=historicalModalFallback(base,'sog',2027,{line:3.5});
assert.equal(modalBook.referenceLine,false,'real sportsbook line must replace the TSO reference line in the modal');
assert.equal(modalBook.line,3.5);

console.log('✓ NHL historical Props fallback regression passed');
console.log('  ✓ 2025–26 baseline drives grades before enough 2026–27 regular-season games');
console.log('  ✓ preseason is excluded from current-season weighting');
console.log('  ✓ current regular season blends after 5 GP and is full-weight at 20 GP');
console.log('  ✓ sportsbook lines override clearly separated TSO reference lines');
console.log('  ✓ player modal uses the same historical fallback and never invents a sportsbook line');
