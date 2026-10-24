/* TSO3 six-league full player dashboard regression.
   Run: node --test tso3/tests/player-dashboard.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const moduleCode=readFileSync(new URL('../player-dashboard.js',import.meta.url),'utf8');
const appCode=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const workerCode=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const sandbox={window:{}};
runInNewContext(moduleCode,sandbox);
const dash=sandbox.window.TSO3PlayerDashboard;
assert.ok(dash?.render&&dash?.choose&&dash?.analysis);
const doc={available:true,season:2026,athleteId:'40884',athleteName:'Test Athlete',
 sourceIdentification:'ESPN numeric ID confirmed',headshot:null,
 events:[
  {eventId:'4019901',date:'2026-10-21',opponent:'BOS',homeAway:'home',stats:[{name:'Offense:hits',label:'Hits',numeric:2}]},
  {eventId:'4019902',date:'2026-10-20',opponent:'NYY',homeAway:'away',stats:[{name:'Offense:hits',label:'Hits',numeric:0}]},
  {eventId:'4019903',date:'2026-10-19',opponent:'BOS',homeAway:null,stats:[{name:'Offense:hits',label:'Hits',numeric:1}]},
  {eventId:'4019904',date:'2026-10-18',opponent:'NYY',homeAway:'away',stats:[]}
 ],seasonStats:[{category:'Batting',values:[{name:'hits',label:'H',value:'43'}]}]};
const odds=[{player:'Test Athlete',market:'hits',marketLabel:'Hits',side:'over',line:0.5,
 price:-130,book:'FanDuel',snapshotTime:'2026-10-23T16:00:00Z',
 model:null},{player:'Test Athlete',market:'hits',marketLabel:'Hits',
 side:'over',line:1.5,price:125,book:'DraftKings',
 snapshotTime:'2026-10-23T16:05:00Z',model:{probabilityPct:58,exactMatch:true,lineMatch:true,source:'TSO'}}];
const ctx={sport:'mlb',player:{name:'Test Athlete',team:'TB',position:'RF',playerId:'40884'},
 doc,odds,game:null,ui:{tab:'overview',metric:'Offense:hits',window:'l10',split:'all',opponent:'',lineKey:'HITS:0.5'}};
test('all six sports have a full player route with a source-backed module',()=>{
 assert.match(appCode,/function pageFullPlayerDashboard\(/);
 assert.match(appCode,/function hydrateFullPlayerDashboard\(/);
 for(const name of ['nfl','nba','mlb','nhl','wnba','cfb'])
  assert.ok(appCode.includes(name+':{label:'),'missing '+name);
 assert.match(appCode,/data-open-full-dashboard/);
 assert.match(workerCode,/\/api\/athlete-depth/);
});
test('actual stats exclude missing games but keep recorded zeros',()=>{
 const entries=dash.statRows(doc,'Offense:hits');
 assert.equal(entries.length,3);
 assert.equal(entries[1].value,0);
 assert.equal(dash.analysis(entries,0.5).hits,2);
 assert.equal(dash.analysis(entries,0.5).rate,200/3);
});
test('venue filter never invents home status on unknown game',()=>{
 const entries=dash.statRows(doc,'Offense:hits');
 const home=dash.choose(entries,{split:'home',window:'l10'});
 const away=dash.choose(entries,{split:'away',window:'l10'});
 assert.equal(home.length,1);assert.equal(away.length,1);
});
test('only documented opponent games enter opponent-specific split',()=>{
 const entries=dash.statRows(doc,'Offense:hits');
 const boston=dash.choose(entries,{split:'opponent',opponent:'BOS',window:'l20'});
 assert.equal(boston.length,2);
});
test('first-goal and partial touchdown categories never masquerade as hit rates',()=>{
 assert.equal(dash.marketStatMatches('firstGoal','Offense:goals'),false);
 assert.equal(dash.marketStatMatches('atd','Offense:rushingTouchdowns'),false);
 assert.equal(dash.marketStatMatches('atd','Offense:totalTouchdowns'),true);
});
test('sport-specific sportsbook lines and charts are rendered with real quotes',()=>{
 const html=dash.render(ctx);
 assert.match(html,/tso-pd-chart/);
 assert.match(html,/Verified/);
 assert.match(html,/FanDuel/);
 assert.match(html,/L10/);
 assert.match(html,/Test Athlete/);
});
test('all five dashboard sections are actionable tabs',()=>{
 for(const tab of ['overview','gamelogs','splits','odds','matchup'])
  assert.ok(dash.render({...ctx,ui:{...ctx.ui,tab}}).includes('data-pd-tab="'+tab+'"'));
});
test('game logs absent does not suppress independently verified bookmaker quotes',()=>{
 const html=dash.render({...ctx,doc:{available:false,reason:'ESPN game log not returned'},
  ui:{...ctx.ui,tab:'odds'}});
 assert.match(html,/FanDuel/);
 assert.match(html,/DraftKings/);
});
test('HTML inputs from a player profile cannot inject untrusted markup',()=>{
 const x=dash.render({...ctx,player:{...ctx.player,name:'<script>alert("x")</script>'},
  doc:{...doc,athleteName:null}});
 assert.doesNotMatch(x,/<script>alert/);
 assert.match(x,/&lt;script&gt;/);
});
