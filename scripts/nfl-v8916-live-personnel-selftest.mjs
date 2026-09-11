import assert from 'node:assert/strict';
import { __LIVE_TEST__ as T } from '../sports/nfl/live.js';

const game={
  gameId:'qa-turnover',
  away:{abbr:'SF'},
  home:{abbr:'LA'}
};
const players={
  '1':{id:'1',name:'Matthew Stafford',team:'LA',position:'QB',jersey:'9'},
  '2':{id:'2',name:'Puka Nacua',team:'LA',position:'WR',jersey:'17'},
  '3':{id:'3',name:'Fred Warner',team:'SF',position:'LB',jersey:'54'},
  '4':{id:'4',name:'Kyren Williams',team:'LA',position:'RB',jersey:'23'},
  '5':{id:'5',name:'Nick Bosa',team:'SF',position:'DE',jersey:'97'}
};

const interception={
  id:'int-1',
  text:'Matthew Stafford pass intended for Puka Nacua INTERCEPTED by Fred Warner and returned 18 yards',
  type:'Interception',team:'LA',startTeam:'LA',endTeam:'SF',
  startDown:2,startDistance:8,startYardsToEndzone:65,
  endDown:1,endDistance:10,endYardsToEndzone:72,
  participants:[
    {type:'passer',id:'1'},
    {type:'receiver',id:'2'},
    {type:'interceptor',id:'3'}
  ]
};
const glInt={
  possession:'away',yardFromOwn:28,down:1,distance:10,
  plays:[interception],playerStats:{byId:players},boxScore:{teams:{}}
};
const cpInt=T.currentPlayFrom(glInt,'away',game);
assert.equal(cpInt.kind,'turnover');
assert.equal(cpInt.passer.name,'Matthew Stafford');
assert.equal(cpInt.target.name,'Puka Nacua');
assert.equal(cpInt.turnoverPlayer.name,'Fred Warner');
const stateInt=T.buildGamecastState(glInt,'away',game,cpInt);
assert.equal(stateInt.playOffenseSide,'home');
assert.equal(stateInt.startYardFromOwn,35);
assert.equal(stateInt.endYardFromOwn,72); // new offense YTE maps directly to old offense axis
assert.equal(stateInt.currentYardFromOwn,28); // current possession remains on its own axis
assert.equal(stateInt.exactEnd,true);
assert.equal(stateInt.turnover,true);

const fumble={
  id:'fum-1',
  text:'Kyren Williams left tackle for 8 yards, FUMBLES, recovered by Nick Bosa',
  type:'Fumble',team:'LA',startTeam:'LA',endTeam:'SF',
  startDown:1,startDistance:10,startYardsToEndzone:55,
  endDown:1,endDistance:10,endYardsToEndzone:60,
  participants:[
    {type:'rusher',id:'4'},
    {type:'recoverer',id:'5'}
  ]
};
const glFumble={
  possession:'away',yardFromOwn:40,down:1,distance:10,
  plays:[fumble],playerStats:{byId:players},boxScore:{teams:{}}
};
const cpFumble=T.currentPlayFrom(glFumble,'away',game);
assert.equal(cpFumble.kind,'turnover');
assert.equal(cpFumble.runner.name,'Kyren Williams');
assert.equal(cpFumble.turnoverPlayer.name,'Nick Bosa');
const stateFumble=T.buildGamecastState(glFumble,'away',game,cpFumble);
assert.equal(stateFumble.startYardFromOwn,45);
assert.equal(stateFumble.endYardFromOwn,60);
assert.equal(stateFumble.currentYardFromOwn,40);
assert.equal(stateFumble.exactEnd,true);

assert.equal(T.exactPlayEndFromOriginalOffense({startTeam:'LA',endTeam:'SF',endYardsToEndzone:72}),72);
assert.equal(T.exactPlayEndFromOriginalOffense({startTeam:'LA',endTeam:'LA',endYardsToEndzone:42}),58);

console.log('v89.16 live personnel + turnover-coordinate tests passed');
