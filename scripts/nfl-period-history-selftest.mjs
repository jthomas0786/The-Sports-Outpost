#!/usr/bin/env node
import assert from 'node:assert/strict';
import { parsePeriodHistorySummary } from './nfl-period-history.mjs';

const summary={
  drives:{previous:[
    {id:'d1',plays:[
      {id:'1',period:{number:1},type:{text:'Pass Reception'},text:'P.Mahomes pass short middle to T.Kelce for 12 yards.'},
      {id:'2',period:{number:1},type:{text:'Rush'},text:'I.Pacheco left guard for 7 yards.'},
      {id:'3',period:{number:2},type:{text:'Pass Reception'},text:'P.Mahomes pass short right to T.Kelce for 8 yards, TOUCHDOWN.',scoringPlay:true},
      {id:'4',period:{number:2},type:{text:'Pass Incompletion'},text:'P.Mahomes pass incomplete short left intended for T.Kelce.'},
      {id:'5',period:{number:3},type:{text:'Rush'},text:'I.Pacheco right tackle for no gain.'},
      {id:'6',period:{number:4},type:{text:'Rush'},text:'I.Pacheco up the middle for 3 yards, TOUCHDOWN.',scoringPlay:true},
    ]}
  ]}
};
const players=[
  {espnId:'15',name:'Patrick Mahomes',team:'KC'},
  {espnId:'87',name:'Travis Kelce',team:'KC'},
  {espnId:'10',name:'Isiah Pacheco',team:'KC'},
];
const out=parsePeriodHistorySummary(summary,players);
const mahomes=out.get('15'),kelce=out.get('87'),pacheco=out.get('10');
assert.equal(kelce.periods.q1.receptions,1);
assert.equal(kelce.periods.q1.recYds,12);
assert.equal(kelce.periods.q2.receptions,1);
assert.equal(kelce.periods.q2.recYds,8);
assert.equal(kelce.periods.q2.recTds,1);
assert.equal(kelce.periods['1h'].recYds,20);
assert.equal(kelce.firstTd,1);
assert.equal(mahomes.periods.q1.completions,1);
assert.equal(mahomes.periods.q1.passYds,12);
assert.equal(mahomes.periods.q2.completions,1);
assert.equal(mahomes.periods.q2.passYds,8);
assert.equal(mahomes.periods.q2.passTds,1);
assert.equal(pacheco.periods.q1.rushYds,7);
assert.equal(pacheco.periods.q3.rushYds,0);
assert.equal(pacheco.periods.q4.rushYds,3);
assert.equal(pacheco.periods.q4.rushTds,1);
assert.equal(pacheco.firstTd,0);
console.log('✓ NFL exact period-history parser regression passed');
