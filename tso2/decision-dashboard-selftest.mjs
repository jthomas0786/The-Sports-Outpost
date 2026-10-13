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
// Actual TSO live data format: team abbr LAR, sportsbook uses LA,
// and props supply eventId/commenceTime rather than startTime.
const ramsGame={id:'401872994',league:'nfl',away:{abbr:'BUF'},home:{abbr:'LAR'},startTime:'2026-10-13T00:15:00Z'};
const ramsRows=[
 {sport:'nfl',eventId:'401872994',awayTeam:'BUF',homeTeam:'LA',commenceTime:'2026-10-13T00:15:00Z',key:'same-event'},
 {sport:'nfl',eventId:'401000000',awayTeam:'BUF',homeTeam:'LA',commenceTime:'2026-10-13T00:15:00Z',key:'wrong-event'},
 {sport:'nfl',awayTeam:'BUF',homeTeam:'LA',commenceTime:'2026-10-13T00:15:00Z',key:'alias-and-time'},
 {sport:'nfl',awayTeam:'BUF',homeTeam:'LA',commenceTime:'2026-10-15T00:15:00Z',key:'stale-other-day'},
 {sport:'nhl',eventId:'401872994',key:'wrong-sport'}
];
assert.deepEqual(Array.from(widget.matchedRows(ramsRows,ramsGame),r=>r.key),['same-event','alias-and-time'],
 'Exact ESPN ID and verified aliases must restore BUF–LAR players without other game leakage');

// ESPN schedule IDs and sportsbook provider IDs are DIFFERENT namespaces.
const sampleMLB={id:'401774332',league:'mlb',away:{abbr:'LAD',name:'Los Angeles Dodgers'},home:{abbr:'MIL',name:'Milwaukee Brewers'},startTime:'2026-10-12T21:03:00Z'};
const mlbProps=[
 {sport:'mlb',eventId:'849812',awayTeam:'Los Angeles Dodgers',homeTeam:'Milwaukee Brewers',commenceTime:'2026-10-12T21:03:57Z',key:'matched-mlb'},
 {sport:'mlb',eventId:'849813',awayTeam:'Los Angeles Dodgers',homeTeam:'Milwaukee Brewers',commenceTime:'2026-10-13T21:03:57Z',key:'wrong-day'},
 {sport:'mlb',eventId:'849814',awayTeam:'Milwaukee Brewers',homeTeam:'Los Angeles Dodgers',commenceTime:'2026-10-12T21:03:57Z',key:'reversed'},
 {sport:'mlb',eventId:'849812',awayTeam:'Los Angeles Dodgers',homeTeam:'Milwaukee Brewers',key:'unknown-time'}
];
assert.deepEqual(Array.from(widget.matchedRows(mlbProps,sampleMLB),x=>x.key),['matched-mlb'],
 'MLB joins cross-provider event IDs using both teams and verified start time');
const sampleNBA={id:'401993456',league:'nba',away:{abbr:'BOS',name:'Boston Celtics'},home:{abbr:'DET',name:'Detroit Pistons'},startTime:'2026-10-20T19:00:00Z'};
const nbaRows=[
 {sport:'nba',eventId:'249f6ad5667cc3b1',awayTeam:'Boston Celtics',homeTeam:'Detroit Pistons',commenceTime:'2026-10-20T19:00:00Z',key:'cross-provider'},
 {sport:'nba',eventId:'401993457',awayTeam:'Boston Celtics',homeTeam:'Detroit Pistons',commenceTime:'2026-10-20T19:00:00Z',key:'wrong-espn-id'}
];
assert.deepEqual(Array.from(widget.matchedRows(nbaRows,sampleNBA),x=>x.key),['cross-provider'],
 'NBA feed uses provider event IDs; mismatched ESPN IDs must still be rejected');
const sampleNHL={id:'401993120',league:'nhl',away:{abbr:'TOR',name:'Toronto Maple Leafs'},home:{abbr:'BOS',name:'Boston Bruins'},startTime:'2026-10-13T23:00:00Z'};
assert.equal(widget.matchedRows([{sport:'nhl',eventId:'854320',awayTeam:'Toronto Maple Leafs',homeTeam:'Boston Bruins',commenceTime:'2026-10-13T23:00:00Z'}],sampleNHL).length,1,
 'NHL book IDs join by verified matchup');
const sampleNFL={id:'401993111',league:'nfl',away:{abbr:'BUF',name:'Buffalo Bills'},home:{abbr:'LAR',name:'Los Angeles Rams'},startTime:'2026-10-12T23:15:00Z'};
assert.equal(widget.matchedRows([{sport:'nfl',eventId:'9af65dba',awayTeam:'Buffalo Bills',homeTeam:'Los Angeles Rams',commenceTime:'2026-10-12T23:15:00Z'}],sampleNFL).length,1,
 'NFL book IDs join by verified matchup');

assert.match(widget.exactReason({model:{}}),/not available/,'Missing model reason must be disclosed, not fabricated');

// Background updates must preserve the exact player/detail DOM instance
// even when the live scoreboard value changes.
const fakeDetail={innerHTML:'',dataset:{},scrollLeft:0,scrollTop:0,
 querySelector:()=>null};
const fakeGameList={innerHTML:'',scrollLeft:173,scrollTop:0};
const fakeFinalResult={innerHTML:'',scrollLeft:0,scrollTop:0};
const fakeFinals={hidden:false,querySelector:sel=>sel==='[data-decision-final-count]'?{textContent:''}:fakeFinalResult};
const fakeDock={innerHTML:'',scrollLeft:0,scrollTop:0};
const nodes={
 '[data-decision-game-list]':fakeGameList,
 '[data-decision-final-results]':fakeFinals,
 '[data-decision-game-detail]':fakeDetail,
 '[data-decision-betslip]':fakeDock
};
const fakeRoot={querySelector:sel=>nodes[sel]||null,querySelectorAll:()=>[]};
const isolated={window:{scrollY:450,scrollTo:()=>{throw Error('No scroll-to-top on automatic refresh')},
 TSO2Matchup:{listing:()=>'<span>Verified player panel</span>',bind:()=>{}}},
 document:{querySelector:sel=>sel==='[data-decision-games]'?fakeRoot:null},
 console};
vm.runInNewContext(decision,isolated);
const safe=isolated.window.TSO2Decision;
const baseGame={id:'scroll-game',league:'nba',state:'pre',startTime:'2026-10-13T23:00:00Z',
 away:{abbr:'NYK',name:'New York Knicks',score:0},
 home:{abbr:'BOS',name:'Boston Celtics',score:0}};
const ctx={route:'games',league:'nba',games:[baseGame],rows:[],draftKeys:[],
 liveReady:true,propsReady:true,linesBySport:new Map(),ensureLines:()=>{},
 renderMarkets:()=>'<i>Odds</i>',addProp:()=>{},research:()=>{},history:()=>{}};
safe.render(ctx);
fakeDetail.innerHTML+='<span id="keep-open-details">Expanded analysis stays mounted</span>';
safe.render(ctx);
assert.match(fakeDetail.innerHTML,/keep-open-details/,'Ordinary polling cannot discard open player details');
safe.render({...ctx,games:[{...baseGame,state:'in',detail:'Q1 11:42',
 away:{...baseGame.away,score:14},home:{...baseGame.home,score:15}}]});
assert.match(fakeDetail.innerHTML,/keep-open-details/,'Score ticks cannot rebuild open player details');
assert.equal(fakeGameList.scrollLeft,173,'Scoreboard horizontal scroll must stay in place');
safe.render({...ctx,rows:[{key:'new-prop',sport:'nba',market:'points',
 awayTeam:'New York Knicks',homeTeam:'Boston Celtics',
 commenceTime:baseGame.startTime,price:-110,line:17.5,side:'over'}]});
assert.ok(!fakeDetail.innerHTML.includes('keep-open-details'),'New verified prop may intentionally update the detail');

console.log('TSO decision dashboard, scroll-stable background updates and live score preservation: PASS');
