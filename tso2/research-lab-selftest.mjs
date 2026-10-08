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
assert.match(css,/\.rg2-rank-list/,'Distinct Rank list uses the native TSO theme');
assert.match(css,/\.broadcast-main:has\(> \.rg2-page\)/,'Research fills the TSO shell with no blank gutter');
assert.match(css,/--rg-orange:var\(--outpost-blue/);
assert.match(css,/\.rg2-view button\.is-active\{background:#2d7fff/);
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
assert.match(root.innerHTML,/Key players/,'Video-style key players tab');
assert.match(root.innerHTML,/Defense/,'Video-style defense tab');
click('data-rg2-tab',{rg2Tab:'defense'});
assert.match(root.innerHTML,/OPP TD \/ GM/,'Defense uses verified opponent allowance columns');
click('data-rg2-tab',{rg2Tab:'props'});
assert.match(root.innerHTML,/EXACT PICK/,'Props tab renders exact markets');
click('data-rg2-view',{rg2View:'board'});
assert.match(root.innerHTML,/rg2-player-grid/,'Board view works');
assert.match(root.innerHTML,/rg2-player-card-actions/,'Board can open Intel and add the exact selection');
click('data-rg2-view',{rg2View:'rank'});
assert.match(root.innerHTML,/rg2-rank-list/,'Rank view has its own layout');
assert.doesNotMatch(root.innerHTML,/rg2-table-scroll/,'Rank is not the Lab table');
click('data-rg2-view',{rg2View:'lab'});
assert.match(root.innerHTML,/rg2-table-scroll/,'Lab restores dense sortable research table');
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
// Verify the actual player-data enrichment path, not just the column headings.
// Fixture-only values are isolated to this unit test and are never displayed by the site.
const deepSandbox={
  window:{},URLSearchParams,setTimeout,
  fetch:async requested=>{
    if(String(requested).includes('nfl-td-opportunities.json'))
      return {ok:true,json:async()=>({
        schemaVersion:1,source:'nflverse fixture',
        seasons:{
          '2025':{players:{GSIS1:{firstTdGames:3}}},
          '2026':{players:{GSIS1:{goalLineSharePct:55,carrySharePct:61.2,
            redZoneSharePct:44.9,redZoneTdYieldPct:27.3}}}
        }
      })};
    const params=new URL('https://fixture.test'+requested).searchParams;
    return {ok:true,json:async()=>({
      available:true,player:{
        gsisId:'GSIS1',name:params.get('name'),team:params.get('team'),position:'RB',
        previousSeason:{totalTds:13,games:16},
        currentSeason:{totalTds:6,targetShare:11.8,perGame:{tds:1.5}},
        last5:{avg:{tds:1.6}},depth:{rank:1}
      }
    })};
  }
};
vm.runInNewContext(app.slice(0,seam),deepSandbox);
const deepFlow=deepSandbox.window.TSO2ResearchGameFlow;
const enrichedRoot={
  innerHTML:'',isConnected:true,contains:()=>true,scrollIntoView:()=>{},
  querySelector(){return null},querySelectorAll(){return []}
};
const enrichedGame={
  id:'enrichment-fixture',league:'nfl',state:'pre',startTime:schedule,
  away:{abbr:'TB',name:'Tampa Bay Buccaneers'},
  home:{abbr:'DAL',name:'Dallas Cowboys'}
};
deepFlow.render(enrichedRoot,{
  league:'nfl',games:[enrichedGame],
  rows:[{...row('nfl','enriched-player','Javonte Williams','DAL','TB','atd',52.2),team:'DAL'}]
});
enrichedRoot.onclick({target:{closest:()=>({
  hasAttribute:k=>k==='data-rg2-game',
  dataset:{rg2Game:'nfl|enrichment-fixture|TB|DAL|'+schedule}
})}});
await new Promise(resolve=>setTimeout(resolve,1000));
assert.match(enrichedRoot.innerHTML,/rg2-val-prevTD">13</,'Real 2025 TD value from deep research');
assert.match(enrichedRoot.innerHTML,/rg2-val-yearTD">6</,'Real 2026 TD value from deep research');
assert.match(enrichedRoot.innerHTML,/rg2-val-target">11\.8%/,'Real target share from deep research');
assert.match(enrichedRoot.innerHTML,/<small>RB1 - DAL<\/small>/,'Role and team share the player name cell');
assert.doesNotMatch(enrichedRoot.innerHTML,/<th[^>]*>ROLE(?:\s|<)/,'No separate role column');

assert.match(enrichedRoot.innerHTML,/rg2-val-prevFirst">3\/16/,'PBP-backed first TD count / 2025 games');
assert.match(enrichedRoot.innerHTML,/rg2-val-gl">55%/,'PBP-backed goal-line share');
assert.match(enrichedRoot.innerHTML,/rg2-val-carry">61\.2%/,'PBP-backed carry share');
assert.match(enrichedRoot.innerHTML,/rg2-val-rz">44\.9%/,'PBP-backed red-zone share');
assert.match(enrichedRoot.innerHTML,/rg2-val-yield">27\.3%/,'PBP-backed red-zone TD yield');
assert.match(enrichedRoot.innerHTML,/rg2-val-firstTd"><span class="rg2-na"/,'Predictive First TD missing without a verified model');

// Verified NBA, NHL and MLB game logs fill historical L5 hit rates. These
// rates are NOT model win probabilities and never replace model percentages.
for(const sportCase of [
  {sport:'nba',market:'points',game:games[1],player:'NBA Star',team:'BOS',
    extra:{recentGames:[
      {date:'2026-10-07',minutes:30,stats:{points:28}},
      {date:'2026-10-06',minutes:31,stats:{points:22}},
      {date:'2026-10-05',minutes:32,stats:{points:26}},
      {date:'2026-10-04',minutes:29,stats:{points:27}},
      {date:'2026-10-03',minutes:28,stats:{points:18}}
    ]},expectedRate:'60%',expectedExtra:'30'},
  {sport:'nhl',market:'atg',game:games[3],player:'NHL Star',team:'NYR',
    extra:{recentGames:[
      {date:'2026-10-07',stats:{goals:1,toi:'18:30'}},
      {date:'2026-10-06',stats:{goals:0,toi:'17:30'}},
      {date:'2026-10-05',stats:{goals:0,toi:'19:00'}},
      {date:'2026-10-04',stats:{goals:1,toi:'19:30'}},
      {date:'2026-10-03',stats:{goals:0,toi:'18:00'}}
    ]},expectedRate:'40%',expectedExtra:'18.5'},
  {sport:'mlb',market:'hr',game:games[2],player:'MLB Star',team:'NYY',
    extra:{statcast:{barrelPct:14.2,hardHitPct:50.8},
      gameLog:[
        {date:'2026-10-07',hr:1},{date:'2026-10-06',hr:0},
        {date:'2026-10-05',hr:1},{date:'2026-10-04',hr:0},
        {date:'2026-10-03',hr:1}
      ]},expectedRate:'60%',expectedExtra:'14.2%'}
]){
  const sandbox={window:{},URLSearchParams,setTimeout,console,
    fetch:async requested=>{
      const params=new URL('https://fixture.test'+requested).searchParams;
      return {ok:true,json:async()=>({available:true,player:{
        name:params.get('name'),team:params.get('team'),...sportCase.extra
      }})};
    }};
  vm.runInNewContext(app.slice(0,seam),sandbox);
  const flow=sandbox.window.TSO2ResearchGameFlow;
  const root={innerHTML:'',isConnected:true,contains:()=>true,scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []}};
  const g=sportCase.game;
  const selection={...row(sportCase.sport,'sport-case',sportCase.player,g.home.abbr,g.away.abbr,sportCase.market,55),line:sportCase.market==='points'?24.5:null};
  flow.render(root,{league:sportCase.sport,games:[g],rows:[selection]});
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-game',
    dataset:{rg2Game:sportCase.sport+'|'+g.id+'|'+g.away.abbr+'|'+g.home.abbr+'|'+schedule}})}});
  await new Promise(resolve=>setTimeout(resolve,600));
  assert.match(root.innerHTML,new RegExp('rg2-val-l5">'+sportCase.expectedRate.replace('%','%')),'Verified '+sportCase.sport+' L5 hit rate');
  assert.ok(root.innerHTML.includes(sportCase.expectedExtra),'Verified '+sportCase.sport+' minutes/TOI/barrel context');
  assert.match(root.innerHTML,/rg2-val-purity"><strong class="rg2-purity"[^>]*>\d+\/100<\/strong>/, 'Sourced '+sportCase.sport+' TSO Purity displays a labeled 0-100 score');
}


// Experimental TSO FIRST TD is a model estimate, not historical hit rate
// or a substituted sportsbook market price. Purity is a 0-100 signal.
const modelFixture={
  schemaVersion:1,generatedAt:new Date().toISOString(),source:'nflverse fixture',
  seasons:{
    '2025':{
      gamesScanned:272,offensiveFirstTdGames:250,
      teams:{DAL:{gamesPlayed:17,firstTdOffenseGames:9},TB:{gamesPlayed:17,firstTdOffenseGames:8}},
      players:{GSIS1:{team:'DAL',firstTdGames:3},GSIS2:{team:'DAL',firstTdGames:2},
        GSIS3:{team:'TB',firstTdGames:3}}
    },
    '2026':{
      gamesScanned:64,offensiveFirstTdGames:60,
      teams:{
        DAL:{gamesPlayed:4,firstTdOffenseGames:2,redZoneOpps:49,goalLineOpps:20,carries:94,targets:145},
        TB:{gamesPlayed:4,firstTdOffenseGames:2,redZoneOpps:40,goalLineOpps:18,carries:100,targets:140}
      },
      players:{
        GSIS1:{team:'DAL',gamesWithOpportunities:4,firstTdGames:1,redZoneOpps:22,
          goalLineOpps:11,carries:62,targets:17,goalLineSharePct:55,
          redZoneSharePct:44.9,carrySharePct:66,targetSharePct:11.8,redZoneTdYieldPct:27.3},
        GSIS2:{team:'DAL',gamesWithOpportunities:4,firstTdGames:1,redZoneOpps:8,
          goalLineOpps:2,carries:12,targets:27},
        GSIS3:{team:'TB',gamesWithOpportunities:4,firstTdGames:1,redZoneOpps:10,
          goalLineOpps:3,carries:30,targets:15}
      }
    }
  }
};
const modelSandbox={
  window:{},URLSearchParams,setTimeout,console,
  fetch:async url=>{
    if(String(url).includes('nfl-td-opportunities.json'))
      return {ok:true,json:async()=>modelFixture};
    const params=new URL('https://fixture.test'+url).searchParams;
    return {ok:true,json:async()=>({available:true,player:{
      gsisId:params.get('name')==='Javonte Williams'?'GSIS1':'GSIS2',
      name:params.get('name'),team:params.get('team'),position:'RB',depth:{rank:1},
      previousSeason:{totalTds:13,games:16},currentSeason:{totalTds:6}
    }})};
  }
};
vm.runInNewContext(app.slice(0,seam),modelSandbox);
const modeledFlow=modelSandbox.window.TSO2ResearchGameFlow;
const modeledRoot={innerHTML:'',isConnected:true,contains:()=>true,scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []}};
modeledFlow.render(modeledRoot,{league:'nfl',games:[enrichedGame],rows:[
  {...row('nfl','modeled-first','Javonte Williams','DAL','TB','atd',52.2),team:'DAL'},
  {...row('nfl','modeled-other','Backup Runner','DAL','TB','atd',18.2),team:'DAL'}
]});
modeledRoot.onclick({target:{closest:()=>({
  hasAttribute:k=>k==='data-rg2-game',
  dataset:{rg2Game:'nfl|enrichment-fixture|TB|DAL|'+schedule}
})}});
await new Promise(resolve=>setTimeout(resolve,950));
assert.match(modeledRoot.innerHTML,/<small>RB1 - DAL<\/small>/,'Role is inline beneath player name');
assert.doesNotMatch(modeledRoot.innerHTML,/<th[^>]*>ROLE(?:\s|<)/,'No role column remains');
assert.match(modeledRoot.innerHTML,/rg2-val-firstTd"><strong class="rg2-highlight"[^>]*>\d+(?:\.\d+)?%<\/strong>/,
  'First TD forecast shows a clean percentage');
assert.doesNotMatch(modeledRoot.innerHTML,/class="rg2-experimental">EST\./,'No EST badge');
assert.match(modeledRoot.innerHTML,/rg2-val-purity"><strong class="rg2-purity"[^>]*>41\/100<\/strong>/,
  'Independent transparent TSO Purity score and sample-size adjustment');
assert.match(modeledRoot.innerHTML,/uncalibrated|not calibrated/,'Experimental label does not represent sportsbook-calibrated probabilities');
// The model may not assign >=100% to any known player or imply that only
// the listed offensive players account for all first-TD outcomes.
const firstForecasts=[...modeledRoot.innerHTML.matchAll(/rg2-val-firstTd"><strong[^>]*>([\d.]+)%/g)].map(m=>Number(m[1]));
assert.ok(firstForecasts.length>=1 && firstForecasts.every(p=>p>0&&p<52.3));
assert.ok(firstForecasts.reduce((a,b)=>a+b,0) < 100,'Reserve probability for other scorers and no touchdown');


// The existing NHL FGS/ATG scorer model should fill a matchup even when
// sportsbook props are missing. A model row must never become a fake
// sportsbook add-to-slip selection.
{
  const root={innerHTML:'',dataset:{},isConnected:true,contains:()=>true,
    scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []}};
  const sb={window:{}};
  vm.runInNewContext(app.slice(0,seam),sb);
  const nhlFlow=sb.window.TSO2ResearchGameFlow;
  const g=games[3];
  const player={id:'n-1',name:'Source Verified Skater',team:'NYR',position:'RW',
    probability:0.071,anytimeProbability:0.291,photo:'https://example.com/player.png',
    seasonGoalRate:0.52,seasonSogRate:3.18,recentGoals:5,recentFirstGoals:2,
    bestOdds:null,bestAtgOdds:null};
  const scorerGames=[{gameId:'nhl-fixture',startTime:schedule,
    away:{abbr:'NYR',players:[player],atgPlayers:[player]},
    home:{abbr:'TOR',players:[],atgPlayers:[]}}];
  let adds=0;
  nhlFlow.render(root,{league:'nhl',games:[g],rows:[],scorerGames,addSelection:()=>adds++});
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-game',
    dataset:{rg2Game:'nhl|004|NYR|TOR|'+schedule}})}});
  assert.match(root.innerHTML,/Source Verified Skater/,'Existing scorer engine fills otherwise-empty NHL Research');
  assert.match(root.innerHTML,/29\.1%/,'TSO ATG engine output is displayed as a model percentage');
  assert.match(root.innerHTML,/7\.1%/,'TSO FGS engine output is displayed as a model percentage');
  assert.match(root.innerHTML,/TSO SCORER MODEL/,'Source is identified without claiming sportsbook odds');
  assert.match(root.innerHTML,/GOALS\/GP/,'NHL goal rate column is named for the real stat');
  assert.match(root.innerHTML,/SHOTS\/GP/,'NHL shots rate column is named for the real stat');
  assert.match(root.innerHTML,/rg2-val-goalsGp\">0\.52/,'Season goal rate comes from the scorer feed');
  assert.match(root.innerHTML,/rg2-val-sogGp\">3\.18/,'Season shots rate comes from the scorer feed');
  assert.match(root.innerHTML,/rg2-val-l10Goals\">5/,'L10 goals comes from scorer source');
  assert.match(root.innerHTML,/rg2-val-l10First\">2/,'L10 first goals comes from scorer source');
  assert.match(root.innerHTML,/disabled title="No verified exact sportsbook selection"/,'No add-to-slip action for model-only NHL rows');
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-add',dataset:{rg2Add:'0'}})}});
  assert.equal(adds,0,'Disabled scorer-only selection cannot be added to Parlay Lab');
  assert.doesNotMatch(root.innerHTML,/Verified example/,'Synthetic sportsbook odds are never introduced into model fallback');
}

console.log('PASS TSO 2.0 Research: game-card flow, all sports, native theme, verified deep-data columns, navigation and actions');
