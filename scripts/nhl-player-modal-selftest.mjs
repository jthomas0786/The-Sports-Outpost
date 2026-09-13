import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lineupState} from '../sports/nhl/lineups.js';
import {eventIdFromLogItem,recentGameFromSummary,recentAverages} from '../sports/nhl/research.js';
import {buildNhlPlayerContext,__NHL_PLAYER_MODAL_V911_TEST__} from '../sports/nhl/player-modal-v911.js';

const now=Date.now();
const player={id:'p1',name:'Test Skater',team:'AWY',position:'C',active:true,availability:'In game roster',current:{goals:0,sog:1,points:0,assists:0,blocks:0}};
const awayGoalie={id:'ga',name:'Away Goalie',team:'AWY',position:'G',active:true,current:{saves:20}};
const homeGoalie={id:'gh',name:'Home Goalie',team:'HME',position:'G',active:true,current:{saves:18}};
const game={id:'g1',status:'pre',period:0,clock:'',startTime:'2026-10-10T23:00:00Z',venue:'Test Arena',away:{abbr:'AWY',score:0},home:{abbr:'HME',score:0},players:[player,awayGoalie,homeGoalie],lineupsConfirmed:true,lineupEvidence:{gameId:'g1',checkedAt:now,teams:[{team:'AWY',confirmed:true,goalieId:'ga',goalieName:'Away Goalie'},{team:'HME',confirmed:true,goalieId:'gh',goalieName:'Home Goalie'}]}};
const recentGames=[
 {eventId:'r1',season:2026,date:'2026-04-12T00:00:00Z',team:'AWY',opponent:'HME',homeAway:'away',result:'W',score:'4-2',stats:{goals:1,assists:1,points:2,sog:4,blocks:1,toi:'18:12'}},
 {eventId:'r2',season:2026,date:'2026-04-10T00:00:00Z',team:'AWY',opponent:'OTH',homeAway:'home',result:'L',score:'2-3',stats:{goals:0,assists:0,points:0,sog:2,blocks:2,toi:'17:48'}},
 {eventId:'r3',season:2026,date:'2026-04-08T00:00:00Z',team:'AWY',opponent:'HME',homeAway:'home',result:'W',score:'5-1',stats:{goals:2,assists:0,points:2,sog:5,blocks:0,toi:'19:01'}},
 {eventId:'r4',season:2026,date:'2026-04-06T00:00:00Z',team:'AWY',opponent:'OTH',homeAway:'away',result:'L',score:'1-3',stats:{goals:0,assists:1,points:1,sog:1,blocks:1,toi:'16:34'}}
];
const research={season:2026,currentSeason:2027,players:{p1:{season:2026,games:82,rates:{goals:.4,sog:3.2,points:.9,assists:.5,blocks:.7},shootingPct:.125,recentGames}}};
const sim={games:[{gameId:'g1',ready:true,generatedAt:new Date(now).toISOString(),iterations:50000,state:lineupState(game),players:[{id:'p1',metrics:{goals:{mean:.8,median:1,atLeastOne:.7,distribution:[[0,.3],[1,.5],[2,.2]]},sog:{mean:3.6,median:3,distribution:[[2,.2],[3,.3],[4,.3],[5,.2]]}}}]}]};
const odds={quotes:[{gameId:'g1',playerId:'p1',market:'atg',line:.5,over:150,under:-180,book:'fanduel',ts:now}]};
const ctx=buildNhlPlayerContext({game,player,researchDoc:research,simDoc:sim,oddsDoc:odds,market:'atg'});
assert.equal(Math.round(ctx.prob*100),70,'ATG probability must come from eligible simulated final-goal distribution');
assert.equal(ctx.grade,'A+','NHL modal must use NFL grade thresholds');
assert.equal(ctx.baseline,.4);assert.equal(ctx.mean,.8);assert.equal(ctx.line,.5);assert.ok(ctx.edge!=null,'current two-sided odds should produce no-vig TSO edge');
assert.equal(ctx.l5Avg,.75,'recent form must use verified completed-game values');
assert.equal(ctx.l10Hit,.5,'hit rate must use actual games against the current line');
assert.deepEqual(__NHL_PLAYER_MODAL_V911_TEST__.marketsFor(player),['atg','sog','points','assists','blocks']);
assert.deepEqual(__NHL_PLAYER_MODAL_V911_TEST__.marketsFor({...player,position:'G'}),['saves']);
const buckets=__NHL_PLAYER_MODAL_V911_TEST__.buckets(ctx);assert.equal(buckets.length,3);assert.equal(buckets[1].lo,1);
const h2h=__NHL_PLAYER_MODAL_V911_TEST__.rangeRows(ctx,game,player,{range:'h2h',venue:'all'});assert.equal(h2h.length,2,'H2H filter must keep only the current opponent');
const home=__NHL_PLAYER_MODAL_V911_TEST__.rangeRows(ctx,game,player,{range:'10',venue:'home'});assert.equal(home.length,2,'venue filter must use verified homeAway values');
const l15=__NHL_PLAYER_MODAL_V911_TEST__.rangeRows(ctx,game,player,{range:'15',venue:'all'});assert.equal(l15.length,4,'L15 must gracefully use all verified rows available');
const season=__NHL_PLAYER_MODAL_V911_TEST__.rangeRows(ctx,game,player,{range:'s:2026',venue:'all'});assert.equal(season.length,4,'season filter must use the verified row season');
const stale={...sim,games:[{...sim.games[0],generatedAt:new Date(now-180000).toISOString()}]};
assert.equal(buildNhlPlayerContext({game,player,researchDoc:research,simDoc:stale,oddsDoc:odds,market:'atg'}).prob,null,'stale simulations must never leak a grade into the modal');

const logItem={event:{$ref:'https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/events/401999999'},teamId:'1',played:true};
assert.equal(eventIdFromLogItem(logItem),'401999999');
const summary={header:{season:{type:2},competitions:[{id:'401999999',date:'2026-04-12T00:00:00Z',competitors:[{id:'1',homeAway:'away',winner:true,score:'4',team:{id:'1',abbreviation:'AWY'}},{id:'2',homeAway:'home',winner:false,score:'2',team:{id:'2',abbreviation:'HME'}}]}]},boxscore:{players:[{team:{id:'1',abbreviation:'AWY'},statistics:[{keys:['goals','assists','shotsTotal','blockedShots','timeOnIce'],athletes:[{athlete:{id:'p1'},stats:['1','1','4','2','18:12']}]}]}]}};
const parsed=recentGameFromSummary(summary,{playerId:'p1',teamId:'1',season:2026,eventId:'401999999'});assert.equal(parsed.opponent,'HME');assert.equal(parsed.stats.points,2);assert.equal(parsed.stats.sog,4);assert.equal(parsed.result,'W');
assert.equal(recentAverages([parsed]).points,2);

const js=fs.readFileSync('sports/nhl/player-modal-v911.js','utf8'),css=fs.readFileSync('sports/nhl/player-modal-v911.css','utf8'),visibility=fs.readFileSync('sports/nhl/player-modal-visibility-v910.css','utf8'),wrapper=fs.readFileSync('sports/nhl/view-v906.js','utf8'),router=fs.readFileSync('sports/router.js','utf8'),researchScript=fs.readFileSync('scripts/nhl-research.mjs','utf8');
for(const marker of ['player-card-v2 tso-nfl-player-card-v70 tso-nfl-player-card-v72','TSO PROP VERDICT','Factors','Production Quality','Matchup Mix','Prop & Matchup Visuals','Recent Opportunities','Why','tsoNhlPropSelect','data-nhl-chart-range','data-nhl-chart-venue','Verified completed games','hk-slate-player','hk-prop-card',"['15','L15']","['30','L30']",'seasonRanges','tso-nhl-game-bar'])assert.ok(js.includes(marker),`missing MLB/NFL-composition NHL modal marker: ${marker}`);
for(const marker of ["@import url('./player-modal-v909.css?v=90.9.1')",'.bars-toolbar','.tso-nhl-history-bars','.tso-nhl-game-bar','height:var(--nhl-bar-h)!important','.b.td2','.tso-nhl-line-marker','@media(max-width:680px)','@media(max-width:390px)'])assert.ok(css.includes(marker),`missing MLB/NFL recent-bar style: ${marker}`);
for(const marker of ['.tso-nhl-scroll>.sec','height:auto!important','max-height:none!important','overflow-y:auto!important','content-visibility:visible!important'])assert.ok(visibility.includes(marker),`missing NHL modal visibility guard: ${marker}`);
assert.ok(researchScript.includes('/eventlog?limit=100'));assert.ok(researchScript.includes('recentGameFromSummary'));assert.ok(researchScript.includes('.slice(0,30)'));assert.ok(researchScript.includes('played.slice(0,36)'));
assert.ok(wrapper.includes("./player-modal-v911.js?v=90.11"));
assert.ok(wrapper.includes('player-modal-visibility-v910.css?v=90.10'));
assert.ok(router.includes("./nhl/view-v906.js?v=90.11"));
console.log('NHL player modal: MLB/NFL bars, L5/L10/L15/L30/season/H2H filters, 30-game verified history, visible sections and mobile layout passed');
