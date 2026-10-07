#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildNbaProjection,marketFairOver,__NBA_MODEL_V202_TEST__} from '../sports/nba/model-v202.js';

const games=Array.from({length:20},(_,i)=>({
  date:new Date(Date.UTC(2026,3,20-i)).toISOString(),
  season:2026,seasonType:2,homeAway:i%2?'away':'home',minutes:35+(i%3),usageProxy:22+(i%4),pace:99+(i%5),
  opponent:'Opponent',
  stats:{points:24+(i%7),rebounds:7+(i%4),assists:5+(i%5),threes:2+(i%3),pra:36+(i%9)}
}));
const research={
  currentSeason:2027,priorSeason:2026,
  teams:{
    '1':{id:'1',name:'Boston Celtics',abbr:'BOS'},
    '2':{id:'2',name:'Detroit Pistons',abbr:'DET'}
  },
  teamIndex:{'boston celtics':'1','bos':'1','detroit pistons':'2','det':'2'},
  nameIndex:{'test player':'p1'},
  players:{
    p1:{id:'p1',name:'Test Player',teamId:'1',team:'Boston Celtics',position:'SF',injury:null,recentGames:games}
  },
  teamProfiles:{'1':{pace:100},'2':{pace:102}},
  teamDefense:{'2':{byPosition:{F:{points:44,rebounds:18,assists:10,threes:5,pra:72}}}},
  league:{
    pace:99,
    allowByPosition:{F:{points:40,rebounds:17,assists:9,threes:4.5,pra:66}},
    playerByPosition:{F:{points:16,rebounds:5,assists:3,threes:1.5,pra:24}},
    marketSd:{points:7.2,rebounds:3.4,assists:2.8,threes:1.4,pra:9}
  }
};
const row={player:'Test Player',homeTeam:'Boston Celtics',awayTeam:'Detroit Pistons',commenceTime:'2026-10-20T23:00:00Z'};
const fair=marketFairOver([{overPrice:-110,underPrice:-110},{overPrice:-105,underPrice:-115}]);
assert.ok(fair>.48&&fair<.52,'fair market should be near 50%');

const p=buildNbaProjection({research,row,market:'points',line:24.5,fairOverProb:fair});
assert.ok(p,'projection should build');
assert.equal(p.player,'Test Player');
assert.equal(p.opponent,'Detroit Pistons');
assert.equal(p.venue,'home');
assert.equal(p.market,'points');
assert.ok(p.projection>15&&p.projection<40);
assert.ok(p.sigma>=4.5);
assert.ok(p.overProbability>0&&p.overProbability<1);
assert.ok(p.sampleGames>=15);
assert.ok(p.factors.opponent>=1,'above-league opponent allowance should not reduce projection');

const preseason=structuredClone(research);
preseason.players.p1.recentGames=[
  {
    date:'2026-10-05T00:00:00Z',season:2027,seasonType:1,homeAway:'home',minutes:8,usageProxy:3,pace:101,
    opponent:'Preseason',stats:{points:2,rebounds:1,assists:1,threes:0,pra:4}
  },
  ...games
];
const pre=buildNbaProjection({research:preseason,row,market:'points',line:24.5,fairOverProb:fair});
assert.ok(Math.abs(pre.projection-p.projection)<.05,'preseason cameo must not distort a full competitive projection sample');

const injured=structuredClone(research);
injured.players.p1.injury={status:'Out'};
const out=buildNbaProjection({research:injured,row,market:'points',line:24.5,fairOverProb:fair});
assert.equal(out.available,false);
assert.equal(out.grade,'OUT');
assert.ok(out.overProbability<=.01);

const dayToDay=structuredClone(research);
dayToDay.players.p1.injury={status:'Day-To-Day'};
const dtd=buildNbaProjection({research:dayToDay,row,market:'points',line:24.5,fairOverProb:fair});
assert.equal(dtd.available,true);
assert.ok(dtd.factors.injury<1,'Day-To-Day should reduce projection');
assert.ok(dtd.confidence<p.confidence,'Day-To-Day should reduce confidence');

assert.equal(__NBA_MODEL_V202_TEST__.positionGroup('PG'),'G');
assert.equal(__NBA_MODEL_V202_TEST__.positionGroup('PF'),'F');
assert.equal(__NBA_MODEL_V202_TEST__.positionGroup('C'),'C');

console.log('✓ NBA regression v1 self-test passed');
