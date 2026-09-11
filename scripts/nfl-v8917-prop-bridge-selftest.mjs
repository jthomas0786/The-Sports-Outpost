import assert from 'node:assert/strict';
import { americanToImplied, buildTsoPropView, devigTwoWay, metricForMarket, normalizeMarket, __V8917_PROP_TEST__ as T } from '../sports/nfl/sim/prop-probabilities-v8917.js';

assert.equal(normalizeMarket('Passing Yards'),'passYds');
assert.equal(normalizeMarket('rushing_yards'),'rushYds');
assert.equal(normalizeMarket('Receiving Yards'),'recYds');
assert.equal(normalizeMarket('Receptions'),'receptions');
assert.equal(normalizeMarket('Anytime TD'),'atd');
assert.equal(metricForMarket('ATD'),null);
assert.ok(Math.abs(americanToImplied(+110)-100/210)<1e-10);
assert.ok(Math.abs(americanToImplied(-120)-120/220)<1e-10);
const vig=devigTwoWay(-110,-110);assert.ok(vig);assert.ok(Math.abs(vig.over-.5)<1e-10);assert.ok(Math.abs(vig.under-.5)<1e-10);

const playerSim={
  playerId:'LA|sample',name:'Sample Player',team:'LA',
  distributions:{
    passYds:{mean:274.2,median:271,p10:214,p25:244,p75:302,p90:337,min:121,max:448},
    rushYds:{mean:72.1,median:71,p10:42,p25:56,p75:87,p90:103,min:9,max:154},
    recYds:{mean:81.7,median:79,p10:39,p25:58,p75:102,p90:128,min:0,max:208},
    receptions:{mean:5.7,median:6,p10:3,p25:4,p75:7,p90:8,min:0,max:13}
  },
  probabilities:{atd:.6432},
  sportsbook:{
    over:{passYds:{line:264.5,probability:.5864},rushYds:{line:64.5,probability:.618},recYds:{line:74.5,probability:.574},receptions:{line:5.5,probability:.526}},
    under:{passYds:{line:264.5,probability:.4136},rushYds:{line:64.5,probability:.382},recYds:{line:74.5,probability:.426},receptions:{line:5.5,probability:.474}}
  }
};

let v=buildTsoPropView({playerSim,market:'Rushing Yards',line:64.5,side:'over',price:-110,iterations:50000});
assert.equal(v.market,'rushYds');assert.equal(v.probabilityMethod,'exact-line');assert.equal(v.tsoProbability,.618);assert.equal(v.iterations,50000);assert.equal(v.mean,72.1);assert.equal(v.median,71);assert.equal(v.projectionEdge,7.6);assert.ok(v.edgePoints>9&&v.edgePoints<10);

v=buildTsoPropView({playerSim,market:'Rushing Yards',line:64.5,side:'under',price:+105,iterations:50000});
assert.equal(v.tsoProbability,.382);assert.equal(v.probabilityMethod,'exact-line');

v=buildTsoPropView({playerSim,market:'Anytime TD',side:'over',price:+120,iterations:50000});
assert.equal(v.tsoProbability,.6432);assert.equal(v.probabilityMethod,'exact-atd');assert.equal(v.projection,null);assert.ok(v.edgePoints>18);

v=buildTsoPropView({playerSim,market:'Passing Yards',line:279.5,side:'over',price:-105,iterations:50000});
assert.equal(v.probabilityMethod,'distribution');assert.ok(v.tsoProbability>=0&&v.tsoProbability<=1);assert.ok(v.underProbability>=0&&v.underProbability<=1);assert.equal(v.pushProbability,0);

v=buildTsoPropView({playerSim,market:'Receptions',line:6,side:'over',price:-110,iterations:50000});
assert.equal(v.probabilityMethod,'distribution');assert.ok(v.pushProbability>0);assert.ok(Math.abs(v.overProbability+v.underProbability+v.pushProbability-1)<.002);

v=buildTsoPropView({playerSim,market:'Receiving Yards',line:74.5,side:'over',price:-115,oppositePrice:-105,iterations:50000});
assert.equal(v.edgeBasis,'fair-market');assert.ok(v.fairMarketProbability>0&&v.fairMarketProbability<1);

const approx=T.approximateLineProbabilities({mean:50,median:50,p10:40,p25:45,p75:55,p90:60,min:20,max:80},50);
assert.ok(approx.push>0);assert.ok(approx.over<.5);assert.ok(approx.under<.5);
console.log('v89.17 prop probability bridge tests passed');
