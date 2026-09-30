import assert from 'node:assert/strict';
import {americanImplied,buildFirstGoalGame} from '../sports/nhl/first-goal-model-v928.js';

assert.equal(Math.round(americanImplied(+300)*1000)/1000,.25);
assert.equal(Math.round(americanImplied(-200)*1000)/1000,.667);
const mk=(id,team,name,pos='C')=>({id:String(id),team,name,position:pos,active:true,propsEligible:true,photo:''});
const away=[mk(1,'AAA','Away One'),mk(2,'AAA','Away Two'),mk(3,'AAA','Away Three'),mk(4,'AAA','Away Four'),mk(5,'AAA','Away Five'),mk(6,'AAA','Away Six')];
const home=[mk(11,'BBB','Home One'),mk(12,'BBB','Home Two'),mk(13,'BBB','Home Three'),mk(14,'BBB','Home Four'),mk(15,'BBB','Home Five'),mk(16,'BBB','Home Six')];
const game={id:'g1',startTime:'2026-09-30T23:00:00Z',status:'pre',venue:'Test Ice',away:{id:'a',abbr:'AAA',name:'Away Team'},home:{id:'b',abbr:'BBB',name:'Home Team'},players:[...away,...home]};
const research={players:{}};
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
console.log('✓ NHL first-goal competing-hazard model regression passed');
console.log('  ✓ exactly 3 first-goal + 3 anytime-goal candidates per team');
console.log('  ✓ one separate high-odds/model-edge risky pick per team for FGS and ATG');
console.log('  ✓ direct FGS market + ATG + scoring/shot history produce ranked probabilities');
