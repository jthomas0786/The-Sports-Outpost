import assert from 'node:assert/strict';
import {americanImplied,buildFirstGoalGame} from '../sports/nhl/first-goal-model-v928.js';

assert.equal(Math.round(americanImplied(+300)*1000)/1000,.25);
assert.equal(Math.round(americanImplied(-200)*1000)/1000,.667);
const mk=(id,team,name,pos='C')=>({id:String(id),team,name,position:pos,active:true,propsEligible:true,photo:''});
const away=[mk(1,'AAA','Away One','C'),mk(2,'AAA','Away Two','RW'),mk(3,'AAA','Away Three','C'),mk(4,'AAA','Away Four','LW'),mk(5,'AAA','Away Five','D'),mk(6,'AAA','Away Six','RW')];
const home=[mk(11,'BBB','Home One','C'),mk(12,'BBB','Home Two','RW'),mk(13,'BBB','Home Three','C'),mk(14,'BBB','Home Four','LW'),mk(15,'BBB','Home Five','D'),mk(16,'BBB','Home Six','RW')];
const game={id:'g1',startTime:'2026-09-30T23:00:00Z',status:'pre',venue:'Test Ice',away:{id:'a',abbr:'AAA',name:'Away Team'},home:{id:'b',abbr:'BBB',name:'Home Team'},players:[...away,...home]};
const research={players:{},teamDefense:{teams:{
 BBB:{overallIndex:1.05,ppIndex:1.12,position:{C:{goalIndex:.82,shotIndex:.92,firstGoalIndex:.86,goalsPerGame:.44,games:30,goalAllowedRank:24,rankedTeams:32},RW:{goalIndex:1.32,shotIndex:1.20,firstGoalIndex:1.38,goalsPerGame:.72,games:30,goalAllowedRank:1,rankedTeams:32},LW:{goalIndex:1.05,shotIndex:1.02,firstGoalIndex:1.08,goalsPerGame:.55,games:30,goalAllowedRank:12,rankedTeams:32},D:{goalIndex:.95,shotIndex:1.01,firstGoalIndex:.94,goalsPerGame:.31,games:30,goalAllowedRank:17,rankedTeams:32}}},
 AAA:{overallIndex:.98,ppIndex:.96,position:{C:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.50,games:30,goalAllowedRank:16,rankedTeams:32},RW:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.50,games:30,goalAllowedRank:16,rankedTeams:32},LW:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.50,games:30,goalAllowedRank:16,rankedTeams:32},D:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.30,games:30,goalAllowedRank:16,rankedTeams:32}}}
}}};
for(const p of game.players){
 const n=Number(p.id)%10,star=n===1,mid=n===4;
 research.players[p.id]={season:2026,games:82,rates:{goals:star?.45:mid?.24:.18,sog:star?3.6:mid?2.7:2.0},shootingPct:star?.125:mid?.1:.09,recentGames:Array.from({length:10},(_,i)=>({season:2026,seasonType:2,date:`2026-03-${String(20-i).padStart(2,'0')}T00:00:00Z`,firstGoal:i===0&&star,stats:{goals:i<(star?3:mid?2:1)?1:0,sog:star?4:mid?3:2,toi:'18:00'}}))};
}
const quotes=[];
for(const p of game.players){
 const n=Number(p.id)%10,star=n===1,mid=n===4;for(const book of ['fanduel','draftkings','bet365']){
  quotes.push({gameId:'g1',playerId:p.id,market:'atg',over:star?+145:mid?+425:+330,under:null,book,ts:Date.now()});
  quotes.push({gameId:'g1',playerId:p.id,market:'fgs',over:star?+700:mid?+2200:+1600,under:null,book,ts:Date.now()});
 }
}
const odds={quotes,gameLines:[{gameId:'g1',moneyline:{homeFair:.55,awayFair:.45},total:{line:6.5,expectedGoals:6.5}}]};
const out=buildFirstGoalGame(game,research,odds);
assert.equal(out.away.players.length,3);assert.equal(out.home.players.length,3);
assert.equal(out.away.atgPlayers.length,3);assert.equal(out.home.atgPlayers.length,3);
assert.equal(out.away.players[0].name,'Away One');assert.equal(out.home.players[0].name,'Home One');
assert.equal(out.away.atgPlayers[0].name,'Away One');assert.equal(out.home.atgPlayers[0].name,'Home One');
assert.ok(out.top6.every(p=>p.probability>0&&p.probability<1));
assert.ok(out.top6Atg.every(p=>p.anytimeProbability>0&&p.anytimeProbability<1));
assert.ok(out.away.riskyFirstGoal&&out.home.riskyFirstGoal,'each team must have a first-goal risky pick');
assert.ok(out.away.riskyAtg&&out.home.riskyAtg,'each team must have an ATG risky pick');
assert.ok(!out.away.players.some(p=>p.id===out.away.riskyFirstGoal.id),'risky FGS pick must be outside Top 3');
assert.ok(!out.away.atgPlayers.some(p=>p.id===out.away.riskyAtg.id),'risky ATG pick must be outside Top 3');
assert.ok(out.away.riskyFirstGoal.riskyReason&&out.away.riskyAtg.riskyReason);
assert.ok(out.directFirstGoalBooks>=3);
const awayRw=out.away.atgPlayers.find(p=>p.id==='2')||out.away.riskyAtg;
const allAway=[...out.away.players,...out.away.atgPlayers,out.away.riskyFirstGoal,out.away.riskyAtg].filter(Boolean);
const rw=allAway.find(p=>p.id==='2'),center=allAway.find(p=>p.id==='3');
assert.ok(rw?.matchup&&center?.matchup,'matchup context must be attached to ranked players');
assert.equal(rw.matchup.goalAllowedRank,1,'RW should retain the opponent positional allowance rank');
assert.ok(rw.matchup.anytimeFactor>center.matchup.anytimeFactor,'more permissive RW defense must boost RW hazard relative to an otherwise similar center');
assert.ok(rw.anytimeProbability>center.anytimeProbability,'matchup factor must change the final ATG probability before selection');
assert.ok(rw.matchup.firstGoalFactor>center.matchup.firstGoalFactor,'first-goal positional allowance must affect first-goal weighting');
assert.ok(awayRw,'RW matchup player should remain eligible for team selections');
console.log('✓ NHL first-goal competing-hazard model regression passed');
console.log('  ✓ exactly 3 first-goal + 3 anytime-goal candidates per team');
console.log('  ✓ one separate high-odds/model-edge risky pick per team for FGS and ATG');
console.log('  ✓ direct FGS market + ATG + scoring/shot history produce ranked probabilities');
console.log('  ✓ opponent goals/shots/first-goal allowance by position changes player hazards before Top 3 + Risky selection');
