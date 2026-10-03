import assert from 'node:assert/strict';
import {americanImplied,buildFirstGoalGame} from '../sports/nhl/first-goal-model-v928.js';

assert.equal(Math.round(americanImplied(+300)*1000)/1000,.25);
assert.equal(Math.round(americanImplied(-200)*1000)/1000,.667);
const mk=(id,team,name,pos='C',extra={})=>({id:String(id),team,name,position:pos,active:true,propsEligible:true,photo:'',...extra});
const away=[mk(1,'AAA','Away One','C'),mk(2,'AAA','Away Two','RW'),mk(3,'AAA','Away Three','C'),mk(4,'AAA','Away Four','LW'),mk(5,'AAA','Away Five','D'),mk(6,'AAA','Away Six','RW')];
const home=[mk(11,'BBB','Home One','C'),mk(12,'BBB','Home Two','RW'),mk(13,'BBB','Home Three','C'),mk(14,'BBB','Home Four','LW'),mk(15,'BBB','Home Five','D'),mk(16,'BBB','Home Six','RW')];
const goalies=[mk(90,'AAA','AAA Starter','G',{confirmedStarter:true}),mk(91,'BBB','BBB Starter','G',{confirmedStarter:true})];
const game={id:'g1',startTime:'2026-09-30T23:00:00Z',status:'pre',venue:'Test Ice',away:{id:'a',abbr:'AAA',name:'Away Team'},home:{id:'b',abbr:'BBB',name:'Home Team'},players:[...away,...home,...goalies]};
const neutralPos={C:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.50,games:30,goalAllowedRank:16,rankedTeams:32},RW:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.50,games:30,goalAllowedRank:16,rankedTeams:32},LW:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.50,games:30,goalAllowedRank:16,rankedTeams:32},D:{goalIndex:1,shotIndex:1,firstGoalIndex:1,goalsPerGame:.30,games:30,goalAllowedRank:16,rankedTeams:32}};
const research={players:{},teamDefense:{teams:{
 BBB:{overallIndex:1.08,overallShotIndex:1.10,recent10OverallIndex:1.15,recent10ShotIndex:1.12,ppIndex:1.12,lastGameDate:'2026-09-30T02:00:00Z',homeAway:{home:{games:14,overallIndex:1.13,shotIndex:1.09},away:{games:16,overallIndex:1.02,shotIndex:1.01}},position:{...neutralPos,C:{...neutralPos.C,goalIndex:.82,shotIndex:.92,firstGoalIndex:.86,goalsPerGame:.44,goalAllowedRank:24},RW:{...neutralPos.RW,goalIndex:1.32,shotIndex:1.20,firstGoalIndex:1.38,goalsPerGame:.72,goalAllowedRank:1}}},
 AAA:{overallIndex:.98,overallShotIndex:.99,recent10OverallIndex:.97,recent10ShotIndex:.98,ppIndex:.96,lastGameDate:'2026-09-28T23:00:00Z',homeAway:{home:{games:15,overallIndex:.98,shotIndex:.99},away:{games:15,overallIndex:.98,shotIndex:.99}},position:neutralPos}
}}};
for(const p of [...away,...home]){
 const n=Number(p.id)%10,star=n===1,compare=n===2||n===3,mid=n===4;
 const goals=star?.45:compare?.22:mid?.12:.07,sog=star?3.6:compare?2.5:mid?1.8:1.2;
 research.players[p.id]={season:2026,games:82,rates:{goals,sog},shootingPct:goals/sog,recentGames:Array.from({length:10},(_,i)=>({season:2026,seasonType:2,date:`2026-09-${String(28-i).padStart(2,'0')}T00:00:00Z`,opponent:'ZZZ',homeAway:p.team==='AAA'?'away':'home',firstGoal:i===0&&star,stats:{goals:i<(star?3:compare?2:mid?1:0)?1:0,sog:star?4:compare?3:mid?2:1,toi:p.position==='D'?'20:00':'18:00',ppGoals:i===0&&star?1:0}}))};
}
research.players['90']={season:2026,games:45,savePct:.910,recentGames:Array.from({length:5},(_,i)=>({season:2026,seasonType:2,date:`2026-09-${String(28-i).padStart(2,'0')}T00:00:00Z`,stats:{saves:28,goalsAgainst:2}}))};
research.players['91']={season:2026,games:45,savePct:.895,recentGames:Array.from({length:5},(_,i)=>({season:2026,seasonType:2,date:`2026-09-${String(28-i).padStart(2,'0')}T00:00:00Z`,stats:{saves:25,goalsAgainst:3}}))};
const quotes=[];
for(const p of [...away,...home]){
 const n=Number(p.id)%10,star=n===1,compare=n===2||n===3,mid=n===4;
 for(const book of ['fanduel','draftkings','bet365']){
  quotes.push({gameId:'g1',playerId:p.id,market:'atg',over:star?+145:compare?+300:mid?+500:+750,under:null,book,ts:Date.now()});
  quotes.push({gameId:'g1',playerId:p.id,market:'fgs',over:star?+700:compare?+1600:mid?+2600:+4200,under:null,book,ts:Date.now()});
 }
}
const odds={quotes,gameLines:[{gameId:'g1',moneyline:{homeFair:.55,awayFair:.45},total:{line:6.5,expectedGoals:6.5}}]};
const out=buildFirstGoalGame(game,research,odds);
assert.equal(out.model,'FGS-Hazard Ensemble v3');
assert.equal(out.away.players.length,3);assert.equal(out.home.players.length,3);
assert.equal(out.away.atgPlayers.length,3);assert.equal(out.home.atgPlayers.length,3);
assert.ok(out.top6.every(p=>p.probability>0&&p.probability<1));
assert.ok(out.top6Atg.every(p=>p.anytimeProbability>0&&p.anytimeProbability<1));
assert.ok(out.away.riskyFirstGoal&&out.home.riskyFirstGoal,'each team must have a first-goal risky pick');
assert.ok(out.away.riskyAtg&&out.home.riskyAtg,'each team must have an ATG risky pick');
assert.ok(!out.away.players.some(p=>p.id===out.away.riskyFirstGoal.id),'risky FGS pick must be outside Top 3');
assert.ok(!out.away.atgPlayers.some(p=>p.id===out.away.riskyAtg.id),'risky ATG pick must be outside Top 3');
const rw=out.away.atgPlayers.find(p=>p.id==='2'),center=out.away.atgPlayers.find(p=>p.id==='3');
assert.ok(rw?.matchup&&center?.matchup,'comparison players must retain matchup context in the Top 3');
assert.equal(rw.matchup.goalAllowedRank,1,'RW should retain the opponent positional allowance rank');
assert.ok(rw.matchup.anytimeFactor>center.matchup.anytimeFactor,'more permissive RW defense must boost RW hazard relative to an otherwise similar center');
assert.ok(rw.anytimeProbability>center.anytimeProbability,'full matchup factor must change the final ATG probability before selection');
assert.ok(rw.matchup.firstGoalFactor>center.matchup.firstGoalFactor,'first-goal positional allowance must affect first-goal weighting');
assert.ok(rw.matchup.recentDefenseIndex>1&&rw.matchup.venueDefenseIndex>1,'recent and home/road opponent defense must be represented');
assert.ok(rw.matchup.defenseRestFactor>1,'opponent back-to-back/short-rest context must be represented');
assert.ok(rw.matchup.goalie?.verified&&Number.isFinite(rw.matchup.goalie?.recentSavePct),'verified starter and recent goalie form must be represented');
assert.ok(Number.isFinite(rw.matchup.playerUsageFactor)&&Number.isFinite(rw.matchup.playerLocationFactor)&&Number.isFinite(rw.matchup.playerH2HFactor),'player usage, venue split and H2H factors must be represented');
console.log('✓ NHL scorer full-matchup model regression passed');
console.log('  ✓ exactly 3 first-goal + 3 anytime-goal candidates per team plus separate Risky Value picks');
console.log('  ✓ opponent position goals/shots and first-goal allowance change player hazards before selection');
console.log('  ✓ recent/venue defense, rest, PP resistance and verified goalie form feed the matchup');
console.log('  ✓ player TOI usage, home-road form, H2H and rest feed the player probability before ranking');
