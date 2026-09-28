import assert from 'node:assert/strict';
import {clockSeconds,goaliePulled,classifyPuckLineGame,buildPuckLineJesusModel} from '../sports/nhl/puck-line-jesus.js';

const line={gameId:'g1',puckLine:{favoriteAbbr:'EDM',favoriteTeam:'Edmonton Oilers',line:-1.5,price:125,book:'FanDuel',sportsbookCount:5}};
const base={id:'g1',startTime:'2026-09-29T23:00:00Z',away:{id:'1',abbr:'EDM',name:'Edmonton Oilers',score:3},home:{id:'2',abbr:'CGY',name:'Calgary Flames',score:2},status:'in',period:3,clock:'1:41',players:[{id:'edmg',team:'EDM',position:'G'},{id:'cgyg',team:'CGY',position:'G'},{id:'c1',team:'CGY',position:'C'},{id:'c2',team:'CGY',position:'C'},{id:'c3',team:'CGY',position:'LW'},{id:'c4',team:'CGY',position:'RW'},{id:'c5',team:'CGY',position:'D'},{id:'c6',team:'CGY',position:'D'}],onIce:[{teamId:'1',entries:[{athleteid:'edmg',whereabouts:{id:'1'}}]},{teamId:'2',entries:['c1','c2','c3','c4','c5','c6'].map(athleteid=>({athleteid,whereabouts:{id:'1'}}))}],goals:[]};
assert.equal(clockSeconds('5:00'),300);
assert.equal(clockSeconds('1:41'),101);
assert.equal(goaliePulled(base,base.home),true,'six skaters and no goalie must be a verified pulled-goalie state');
assert.equal(goaliePulled({...base,onIce:[]},base.home),false,'missing on-ice evidence must never be guessed as goalie pulled');
assert.equal(classifyPuckLineGame(base,line).code,'PLJ_LIVE');
assert.equal(classifyPuckLineGame({...base,clock:'7:12'},line).code,'ONE_GOAL_SWEAT');
assert.equal(classifyPuckLineGame({...base,away:{...base.away,score:4},clock:'2:11'},line).code,'BACKDOOR_DANGER');

const emptyNetCash={...base,status:'post',away:{...base.away,score:4},home:{...base.home,score:2},clock:'0:00',goals:[{period:3,clock:'0:28',team:'EDM',awayScore:4,homeScore:2,text:'Connor McDavid scores an empty-net goal',strength:'Empty Net'}]};
assert.equal(classifyPuckLineGame(emptyNetCash,line).code,'PLJ_CASHED');
const lateCash={...emptyNetCash,goals:[{period:3,clock:'0:28',team:'EDM',awayScore:4,homeScore:2,text:'Connor McDavid scores',strength:'Even Strength'}]};
assert.equal(classifyPuckLineGame(lateCash,line).code,'LATE_CASH');
const backdoor={...base,status:'post',away:{...base.away,score:4},home:{...base.home,score:3},clock:'0:00',goals:[{period:3,clock:'0:44',team:'CGY',awayScore:4,homeScore:3,text:'Calgary scores'}]};
assert.equal(classifyPuckLineGame(backdoor,line).code,'BACKDOORED');
const model=buildPuckLineJesusModel({date:'2026-09-29',games:[emptyNetCash,backdoor]},{games:[line,{...line,gameId:'g1'}]});
assert.ok(model.tracked.length>=1);

console.log('✓ Puck Line Jesus classification regression passed');
console.log('  ✓ pulled-goalie state requires live on-ice evidence');
console.log('  ✓ PLJ live / empty-net cash / late cash / backdoor states classify correctly');
