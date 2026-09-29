import assert from 'node:assert/strict';
import {mergeSummary} from '../sports/nhl/data.js';

const game={
 id:'test-game',status:'in',period:1,clock:'19:43',
 away:{id:'1',abbr:'FLA',name:'Florida Panthers',score:0,shots:null,powerPlay:false},
 home:{id:'7',abbr:'CAR',name:'Carolina Hurricanes',score:0,shots:null,powerPlay:false},
 players:[
  {id:'101',gameId:'test-game',team:'FLA',name:'Roster One',position:'C',active:true,availability:'In game roster',lineupConfirmed:true},
  {id:'102',gameId:'test-game',team:'FLA',name:'Roster Two',position:'W',active:true,availability:'In game roster'},
  {id:'201',gameId:'test-game',team:'CAR',name:'Roster Three',position:'C',active:true,availability:'In game roster'}
 ]
};
const summary={
 boxscore:{
  players:[{
   team:{id:'1',abbreviation:'FLA'},
   statistics:[{
    keys:['goals','assists','shotsTotal','timeOnIce'],
    athletes:[{athlete:{id:'101',displayName:'Roster One',position:{abbreviation:'C'}},stats:['0','1','2','01:17']}]
   }]
  }],
  teams:[
   {team:{id:'1',abbreviation:'FLA'},statistics:[{name:'shotsTotal',displayValue:'3'}]},
   {team:{id:'7',abbreviation:'CAR'},statistics:[{name:'shotsTotal',displayValue:'5'}]}
  ]
 },
 plays:[],onIce:[]
};

const merged=mergeSummary(game,summary,Date.UTC(2026,8,29,22,45));
assert.equal(merged.players.length,3,'A sparse live summary must not erase roster players');
assert.deepEqual(new Set(merged.players.map(p=>p.id)),new Set(['101','102','201']));
const live=merged.players.find(p=>p.id==='101');
assert.equal(live.current.sog,2);
assert.equal(live.current.assists,1);
assert.equal(live.current.points,1);
assert.equal(live.current.toi,'01:17');
assert.equal(live.lineupConfirmed,true,'Roster/lineup evidence must survive live-stat overlay');
assert.equal(merged.away.shots,3);
assert.equal(merged.home.shots,5);
console.log('✓ NHL sparse live summary preserves the full roster and overlays live stats');
