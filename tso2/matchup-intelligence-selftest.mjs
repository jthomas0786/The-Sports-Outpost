import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('tso2/matchup-intelligence.js','utf8');
const bundled=readFileSync('tso2/pages.js','utf8');
const bundledCss=readFileSync('tso2/styles.css','utf8');
const css=readFileSync('tso2/matchup-intelligence.css','utf8');
const app=readFileSync('tso2/app.js','utf8');
assert.ok(bundled.includes(source.trim()),'Real staged pages.js must contain matchup intelligence runtime');
assert.ok(bundledCss.includes(css.trim()),'Real staged styles.css must contain matchup styles');
assert.match(app,/research:row=>propResearchPayload\(row\)/,'Inline research must use existing authenticated/data-backed worker');
assert.match(app,/history:\(row,book\)=>propHistoryPayload\(row,book\)/,'Inline odds history must use existing verified snapshot endpoint');
assert.ok(!source.includes('Math.random'),'No fake player ranking or model probabilities');
assert.ok(!source.includes('CHEAT CODE'),'Do not copy third-party proprietary score names');
assert.ok(css.includes('.mi-player.is-open') && css.includes('.mi-teams'),'Expandable player cards + two-sided team breakdown required');
const context={window:{},console};
vm.runInNewContext(source,context);
const view=context.window.TSO2Matchup;
assert.ok(view?.listing && view?.bind && view?.matchedStats);
const g={id:'g1',league:'nfl',away:{name:'Buffalo',abbr:'BUF'},home:{name:'Los Angeles',abbr:'LA'}};
const rows=[
 {key:'k1',sport:'nfl',player:'Test Back',team:'BUF',market:'atd',marketLabel:'Anytime TD',side:'over',book:'Verified Book',price:125,model:{probabilityPct:42,edgePct:4.5}},
 {key:'k2',sport:'nfl',player:'Test WR',team:'LA',market:'recYds',marketLabel:'Receiving yards',side:'over',line:54.5,book:'Verified Book',price:-110,model:{probabilityPct:60,edgePct:7}},
 {key:'k3',sport:'nfl',player:'Test TE',team:'LA',market:'recYds',marketLabel:'Receiving yards',side:'under',selection:'Under 21.5',line:21.5,book:'Verified Book',price:-105},
 {key:'k4',sport:'nfl',player:'Test Quarterback',team:'BUF',market:'passYds',marketLabel:'Passing yards',side:'over',selection:'Over 250.5',line:250.5,book:'Verified Book',price:-115}
];
const html=view.listing(g,rows);
assert.match(html,/What BUF gives up/);
assert.match(html,/What LA gives up/);
assert.match(html,/Test WR/);
assert.match(html,/Test Back/);
assert.match(html,/MODEL %/);
assert.match(html,/60.0%/);
assert.match(html,/42.0%/);
assert.match(html,/MARKET ONLY/);
assert.ok(!html.includes('Test TE'),'Under selections must not be featured in Game Hub');
assert.ok(!html.includes('Under 21.5'),'Under thresholds must never leak to featured cards');
assert.match(html,/ALL PROPS/);
assert.match(html,/Passing Yards/);
assert.match(html,/Receiving Yards/);
assert.match(html,/Anytime TD/);
assert.ok(!html.includes('OTHER PROPS'),'Market categories must be specific to actual player props');
assert.equal(view.eligibleOver(rows[2]),false);
assert.equal(view.eligibleOver(rows[1]),true);
assert.equal(view.eligibleOver({key:'xx',player:'Test',market:'atd',selection:'Yes'}),true);
assert.equal(view.eligibleOver({key:'xx',player:'Test',market:'atd',selection:'No'}),false);
assert.equal(view.eligibleOver({key:'xx',player:'Test',market:'recYds',selection:'N/A'}),false);

assert.ok(html.indexOf('Test WR')<html.indexOf('Test Back'),'Rank rows by verified positive edge, not an invented score');
assert.match(html,/data-mi-expand/);
assert.match(html,/data-mi-add/);
assert.match(html,/data-mi-filter/);
assert.ok(!html.includes('Venom'),'TSO branding must remain independent');
assert.match(view.listing({id:'g2',league:'nba',away:{abbr:'NYK'},home:{abbr:'BOS'}},[]),/No verified Over\/Yes selections/);
function fixture(sport,market,player,expected){
 const result=view.matchedStats({available:true,player}, {sport,market});
 assert.deepEqual([...result.map(g=>g.value)],expected);
}
fixture('nfl','atd',{gameLog:[{date:'2026-10-10',tds:1},{date:'2026-10-02',tds:0}]},[1,0]);
fixture('nba','points',{recentGames:[{date:'2026-10-10',stats:{points:28}}]},[28]);
fixture('nhl','sog',{recentGames:[{date:'2026-10-10',stats:{sog:4}}]},[4]);
fixture('mlb','hr',{gameLog:[{date:'2026-10-10',hr:1}]},[1]);
fixture('nfl','atd',{gameLog:[]},[]);
const observed=[{date:'2026-10-09',value:120},{date:'2026-10-02',value:72},{date:'2026-09-25',value:95}];
const chart=view.recentGamesChart(observed,rows[1]);
assert.match(chart,/mi-games-chart/,'Exact game log renders visual SVG');
assert.match(chart,/<rect/,'Observed results are actual SVG bars');
assert.match(chart,/PROP LINE 54.5/,'The same sportsbook selection line is overlaid');
assert.match(chart,/LAST 3 OBSERVED GAMES/);
assert.match(view.hitRateVisual(observed,rows[1],5),/mi-hit-track/,'Hit rates include progress gauges');
assert.match(view.lineMovementChart({available:true,open:{price:-110},current:{price:-125},points:[{price:-110},{price:-115},{price:-125}]},rows[1]),/mi-movement-chart/,'Two or more recorded odds snapshots yield a real trend');
assert.ok(!view.lineMovementChart({available:true,open:{price:-110},current:{price:-110},points:[{price:-110}]},rows[1]).includes('mi-movement-chart'),'Do not fake a movement chart from one recorded snapshot');
assert.ok(!view.recentGamesChart([],rows[1]).includes('mi-games-chart'),'No manufactured bars for missing research data');

console.log('TSO matchup intelligence source, defensively labeled probabilities, independent sports logs, and inline expansion: PASS');
