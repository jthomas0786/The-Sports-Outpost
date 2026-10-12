import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('tso2/index.html','utf8');
const app=readFileSync('tso2/app.js','utf8');
const css=readFileSync('tso2/decision-dashboard.css','utf8');
const decision=readFileSync('tso2/decision-dashboard.js','utf8');

for(const [name,label] of [['home','TODAY'],['games','GAMES'],['parlays','PARLAY PING'],['profile','MY PICKS']])
  assert.match(html,new RegExp('data-route="'+name+'"[^>]*>[\\s\\S]*?<b>'+label+'</b>'),'Primary nav must include '+label);
assert.match(html,/<details class="tso-decision-advanced">/,'Deep features must remain accessible');
for(const route of ['live','research','models','gameedge','props','community','leaderboard'])
  assert.match(html,new RegExp('data-route="'+route+'"'),'Legacy feature '+route+' is not accessible');
const bundledPages=readFileSync('tso2/pages.js','utf8');
const bundledStyles=readFileSync('tso2/styles.css','utf8');
assert.ok(bundledPages.includes(decision.trim()),'pages.js must contain approved decision runtime');
assert.ok(bundledStyles.includes(css.trim()),'styles.css must contain approved decision theme');
assert.ok(!html.includes('src="./decision-dashboard.js"'),'Do not reference blocked Worker asset path');
assert.match(app,/home:'Today', games:'Games'/);
assert.match(app,/window\.TSO2Decision\.todayHTML\(currentLeague\)/);
assert.match(app,/window\.TSO2Decision\.gamesHTML\(currentLeague\)/);
assert.match(app,/renderDecisionDashboard\(\)/);
assert.match(app,/if\(!root&&!requestedLeague\)return Promise\.resolve\(null\)/,'Game hub must load lines without standalone Game Edge route');
assert.match(app,/const TSO_PP_MAX_LEGS=25;/,'25-leg limit must remain intact');
const add=app.slice(app.indexOf('function addPropToParlay(row)'),app.indexOf('function openPropsCompare(row)'));
assert.ok(add.includes('renderDecisionDashboard()'),'Betslip dock must update in place');
assert.ok(!add.includes("setRoute('parlays')"),'Adding a prop should not navigate away from game');
assert.ok(css.includes('.decision-game-columns')&&css.includes('.decision-opportunity'));
assert.ok(!decision.includes('Math.random'),'Predictions must not be fabricated');

const context={window:{},console};vm.runInNewContext(decision,context);
const widget=context.window.TSO2Decision;
assert.ok(widget?.todayHTML&&widget?.gamesHTML&&widget?.matchedRows);
const main=widget.todayHTML('all');
assert.match(main,/data-decision-opportunities/);
assert.match(main,/data-decision-home-games/);
assert.match(main,/data-decision-betslip/);
const hub=widget.gamesHTML('nfl');
assert.match(hub,/data-decision-game-list/);
assert.match(hub,/data-decision-game-detail/);

const game={id:'real-game',league:'nfl',away:{abbr:'DAL',name:'Dallas Cowboys'},home:{abbr:'TB',name:'Tampa Bay Buccaneers'},startTime:'2026-10-12T19:00:00Z'};
const rows=[
 {sport:'nfl',awayTeam:'DAL',homeTeam:'TB',startTime:'2026-10-12T19:00:00Z',key:'exact'},
 {sport:'nfl',awayTeam:'DAL',homeTeam:'NYG',startTime:'2026-10-12T19:00:00Z',key:'wrong-team'},
 {sport:'nba',awayTeam:'DAL',homeTeam:'TB',startTime:'2026-10-12T19:00:00Z',key:'wrong-sport'},
 {sport:'nfl',awayTeam:'DAL',homeTeam:'TB',startTime:'2026-10-15T19:00:00Z',key:'wrong-time'},
 {sport:'nfl',awayTeam:'DAL',key:'missing-opponent'}
];
const matches=widget.matchedRows(rows,game);
assert.equal(matches.length,1,'Game Hub must never conflate different matchups');
assert.equal(matches[0].key,'exact');
assert.match(widget.exactReason({model:{}}),/not available/,'Missing model reason must be disclosed, not fabricated');
console.log('TSO 2.0 decision-first layout, saved deep routes, exact-game filtering and 25-leg handoff: PASS');
