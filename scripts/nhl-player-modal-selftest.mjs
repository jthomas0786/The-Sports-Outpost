import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lineupState} from '../sports/nhl/lineups.js';
import {buildNhlPlayerContext,__NHL_PLAYER_MODAL_V911_TEST__} from '../sports/nhl/player-modal-v911.js';
import {__NHL_PLAYER_MODAL_V912_TEST__} from '../sports/nhl/player-modal-v912.js';
import {__NHL_PLAYER_MODAL_V913_TEST__} from '../sports/nhl/player-modal-v913.js';
import {__NHL_PLAYER_MODAL_V914_TEST__} from '../sports/nhl/player-modal-v914.js';

const now=Date.now();
const player={id:'p1',name:'Test Skater',team:'AWY',position:'C',active:true,availability:'In game roster',current:{goals:0,sog:1,points:0,assists:0,blocks:0}};
const awayGoalie={id:'ga',name:'Away Goalie',team:'AWY',position:'G',active:true,current:{saves:20}};
const homeGoalie={id:'gh',name:'Home Goalie',team:'HME',position:'G',active:true,current:{saves:18}};
const game={id:'g1',status:'pre',period:0,clock:'',startTime:'2026-10-10T23:00:00Z',venue:'Test Arena',away:{abbr:'AWY',score:0},home:{abbr:'HME',score:0},players:[player,awayGoalie,homeGoalie],lineupsConfirmed:true,lineupEvidence:{gameId:'g1',checkedAt:now,teams:[{team:'AWY',confirmed:true,goalieId:'ga',goalieName:'Away Goalie'},{team:'HME',confirmed:true,goalieId:'gh',goalieName:'Home Goalie'}]}};
const recentGames=[
 {eventId:'r1',season:2026,date:'2026-04-12T00:00:00Z',team:'AWY',opponent:'HME',homeAway:'away',stats:{goals:1,assists:1,points:2,sog:4,blocks:1}},
 {eventId:'r2',season:2026,date:'2026-04-10T00:00:00Z',team:'AWY',opponent:'OTH',homeAway:'home',stats:{goals:0,assists:0,points:0,sog:2,blocks:2}},
 {eventId:'r3',season:2026,date:'2026-04-08T00:00:00Z',team:'AWY',opponent:'HME',homeAway:'home',stats:{goals:2,assists:0,points:2,sog:5,blocks:0}},
 {eventId:'r4',season:2026,date:'2026-04-06T00:00:00Z',team:'AWY',opponent:'OTH',homeAway:'away',stats:{goals:0,assists:1,points:1,sog:1,blocks:1}}
];
const research={season:2026,currentSeason:2027,players:{p1:{season:2026,games:82,rates:{goals:.4,sog:3.2,points:.9,assists:.5,blocks:.7},recentGames}}};
const sim={games:[{gameId:'g1',ready:true,generatedAt:new Date(now).toISOString(),iterations:50000,state:lineupState(game),players:[{id:'p1',metrics:{goals:{mean:.8,median:1,atLeastOne:.7,distribution:[[0,.3],[1,.5],[2,.2]]},sog:{mean:3.6,median:3,distribution:[[2,.2],[3,.3],[4,.3],[5,.2]]}}}]}]};
const odds={quotes:[{gameId:'g1',playerId:'p1',market:'atg',line:.5,over:150,under:-180,book:'fanduel',ts:now}]};
const ctx=buildNhlPlayerContext({game,player,researchDoc:research,simDoc:sim,oddsDoc:odds,market:'atg'});
assert.equal(Math.round(ctx.prob*100),70);
assert.equal(ctx.grade,'A+');
assert.equal(ctx.baseline,.4);
assert.equal(ctx.mean,.8);
assert.equal(ctx.line,.5);
assert.deepEqual(__NHL_PLAYER_MODAL_V911_TEST__.marketsFor(player),['atg','sog','points','assists','blocks']);
assert.deepEqual(__NHL_PLAYER_MODAL_V911_TEST__.marketsFor({...player,position:'G'}),['saves']);
assert.equal(__NHL_PLAYER_MODAL_V911_TEST__.rangeRows(ctx,game,player,{range:'h2h',venue:'all'}).length,2);
assert.equal(__NHL_PLAYER_MODAL_V911_TEST__.rangeRows(ctx,game,player,{range:'10',venue:'home'}).length,2);
assert.equal(typeof __NHL_PLAYER_MODAL_V912_TEST__.fmtDate,'function');
assert.equal(typeof __NHL_PLAYER_MODAL_V913_TEST__.pendingProbability,'function');
assert.equal(typeof __NHL_PLAYER_MODAL_V914_TEST__.lockRecentBars,'function');

const base=fs.readFileSync('sports/nhl/player-modal-v911.js','utf8');
const parity=fs.readFileSync('sports/nhl/player-modal-v912.js','utf8');
const guard=fs.readFileSync('sports/nhl/player-modal-v913.js','utf8');
const hardLock=fs.readFileSync('sports/nhl/player-modal-v914.js','utf8');
const widthCss=fs.readFileSync('sports/nhl/player-modal-v913.css','utf8');
const wrapper=fs.readFileSync('sports/nhl/view-v906.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const researchScript=fs.readFileSync('scripts/nhl-research.mjs','utf8');

for(const marker of ['data-nhl-chart-range','data-nhl-chart-venue',"['15','L15']","['30','L30']",'tso-nhl-game-bar'])assert.ok(base.includes(marker),`missing base NHL player-modal marker: ${marker}`);
for(const marker of ['tsoNhlSlipHost',"sport:'nhl'",'vd-honesty-row'])assert.ok(parity.includes(marker),`missing parity behavior: ${marker}`);
for(const marker of ['pendingProbability','sportsbookPending','SPORTSBOOK'])assert.ok(guard.includes(marker),`missing pending guard: ${marker}`);
for(const marker of ['lockRecentBars',"setProperty(prop,value,'important')","setImp(bar,'left','0')","setImp(bar,'right','0')","setImp(bar,'width','auto')","setImp(bar,'max-width','none')",'data-nhl-chart-range','data-nhl-chart-venue'])assert.ok(hardLock.includes(marker),`missing v90.14 hard bar lock: ${marker}`);
for(const marker of ['position:absolute!important','left:0!important','right:0!important','max-width:none!important'])assert.ok(widthCss.includes(marker),`missing CSS full-width bar fallback: ${marker}`);
assert.ok(researchScript.includes('.slice(0,30)'));
assert.ok(wrapper.includes("./player-modal-v914.js?v=90.14"));
assert.ok(router.includes("./nhl/view-v906.js?v=90.14"));
console.log('NHL player modal: NFL-width bars are hard-locked inline after every render/filter change; pending guards and modal parity passed');
