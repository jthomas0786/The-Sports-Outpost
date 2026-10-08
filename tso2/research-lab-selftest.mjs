// Regression test for TSO 2.0 game-first Research, native theme, verified data.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app=fs.readFileSync('tso2/app.js','utf8');
const pages=fs.readFileSync('tso2/pages.js','utf8');
const css=fs.readFileSync('tso2/styles.css','utf8');
const shell=fs.readFileSync('tso2/index.html','utf8');
const seam=app.indexOf('\n\n(() => {');
assert.ok(seam>2000,'Game-first module must bundle before main app');
const sandbox={window:{}};
vm.runInNewContext(app.slice(0,seam),sandbox);
const flow=sandbox.window.TSO2ResearchGameFlow;
assert.equal(typeof flow?.render,'function');
assert.match(pages,/class="rg2-page broadcast-destination" data-research-route/);
assert.match(css,/\.rg2-game-card/);
assert.match(css,/--rg-orange:var\(--outpost-orange/);
assert.match(css,/--rg-gold:var\(--outpost-gold/);
assert.doesNotMatch(css,/\.tso2-lab\{/,'Old blue template must be removed');
assert.match(app,/requestResearchMarkets\(false\)/);
assert.match(app,/openDetail:row=>row&&openResearchDetail\(row\)/);
assert.match(app,/addSelection:row=>row&&addPropToParlay\(row\)/);
assert.doesNotMatch(shell,/research-gameflow\.js/,'Bundled through existing Cloudflare paths');

const dom={};
const root={
  innerHTML:'',contains:()=>true,scrollIntoView:()=>{},
  querySelector(s){return dom[s]||(dom[s]={value:'all',innerHTML:'',textContent:'',focus(){},setSelectionRange(){}})},
  querySelectorAll(){return []}
};
const schedule='2026-10-11T19:00:00Z';
const games=[
 {id:'001',league:'nfl',state:'pre',startTime:schedule,away:{abbr:'NO',name:'New Orleans Saints'},home:{abbr:'KC',name:'Kansas City Chiefs'}},
 {id:'002',league:'nba',state:'pre',startTime:schedule,away:{abbr:'BOS',name:'Boston Celtics'},home:{abbr:'NYK',name:'New York Knicks'}},
 {id:'003',league:'mlb',state:'pre',startTime:schedule,away:{abbr:'NYY',name:'New York Yankees'},home:{abbr:'BOS',name:'Boston Red Sox'}},
 {id:'004',league:'nhl',state:'pre',startTime:schedule,away:{abbr:'NYR',name:'New York Rangers'},home:{abbr:'TOR',name:'Toronto Maple Leafs'}}
];
const row=(sport,key,player,homeTeam,awayTeam,market,probabilityPct)=>({
 sport,key,player,team:awayTeam,homeTeam,awayTeam,market,marketLabel:market,
 side:'over',price:210,book:'Verified example',impliedPct:32.3,commenceTime:schedule,
 ...(probabilityPct==null?{}:{model:{probabilityPct,edgePct:probabilityPct-32.3,sourceLabel:'Test fixture'}})
});
const rows=[
 row('nfl','1','Player One','KC','NO','atd',44.5),
 row('nfl','2','Player One','KC','NO','firstTd',9.5),
 row('nfl','3','Player Two','KC','NO','atd',null),
 row('nfl','4','Other Fixture','BAL','CIN','atd',30),
 row('nba','5','NBA Star','NYK','BOS','points',57),
 row('mlb','6','MLB Star','BOS','NYY','hr',25),
 row('nhl','7','NHL Star','TOR','NYR','atg',35)
];
let added=[],intel=[],switched=[],refreshed=0;
const context={league:'all',games,rows,openDetail:r=>intel.push(r.key),
 addSelection:r=>added.push(r.key),changeLeague:l=>switched.push(l),refresh:()=>refreshed++,
 lineFor:g=>g.league==='nfl'?{spread:{home:{point:-3.5}},total:{line:45.5},moneyline:{homeBest:-165}}:null};
const click=(attr,data)=>root.onclick({target:{closest:()=>({hasAttribute:k=>k===attr,dataset:data||{}})}});
flow.render(root,context);
assert.match(root.innerHTML,/Game Research/);
assert.match(root.innerHTML,/rg2-game-card/);
assert.match(root.innerHTML,/NHL/);
assert.doesNotMatch(root.innerHTML,/2025 1ST/,'Do not show columns before selecting a game');
const nflId='nfl|001|NO|KC|'+schedule;
click('data-rg2-game',{rg2Game:nflId});
assert.match(root.innerHTML,/2025 1ST/,'NFL touchdown columns match the reference video');
assert.match(root.innerHTML,/2025 TDs/);
assert.match(root.innerHTML,/CARRY %/);
assert.match(root.innerHTML,/FIRST %/);
assert.match(root.innerHTML,/Player One/);
assert.doesNotMatch(root.innerHTML,/Other Fixture/,'No unrelated-game players in matchup');
assert.match(root.innerHTML,/44.5%/,'Verified model is shown in column');
assert.match(root.innerHTML,/45.5/,'Verified market total is shown in header');
assert.match(root.innerHTML,/—/,'Unknown season statistics are not invented');
click('data-rg2-intel',{rg2Intel:'0'});
click('data-rg2-add',{rg2Add:'0'});
assert.equal(intel.length,1,'Intel action wired to Deep Research');
assert.equal(added.length,1,'Add action wired to existing Parlay Lab');
click('data-rg2-tab',{rg2Tab:'all'});
assert.match(root.innerHTML,/EXACT PICK/,'All Props tab renders exact markets');
click('data-rg2-view',{rg2View:'board'});
assert.match(root.innerHTML,/rg2-player-grid/,'Board view works');
click('data-rg2-back');
assert.match(root.innerHTML,/rg2-game-card/);
assert.doesNotMatch(root.innerHTML,/rg2-table-scroll/,'Back goes to cards, not table');
click('data-rg2-league',{rg2League:'nhl'});
assert.equal(switched[0],'nhl','Sport tabs use existing TSO shell');
click('data-rg2-refresh');
assert.equal(refreshed,1);
for(const league of ['nfl','nba','mlb','nhl']){
  flow.reset();
  flow.render(root,{...context,league});
  assert.match(root.innerHTML,/rg2-game-card/,'Game cards first for '+league);
  const game=games.find(x=>x.league===league);
  click('data-rg2-game',{rg2Game:league+'|'+game.id+'|'+game.away.abbr+'|'+game.home.abbr+'|'+schedule});
  assert.match(root.innerHTML,/rg2-table-scroll/,'Columns after selecting '+league+' game');
}
flow.reset();
flow.render(root,{...context,league:'nhl',games:[]});
assert.match(root.innerHTML,/No games currently listed/,'No fabricated off-season games');
console.log('PASS TSO 2.0 Research: cards first, game detail, native theme, video NFL columns, 4 sports, exact source-only metrics, back/tabs/add/Intel');
