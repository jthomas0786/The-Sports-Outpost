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
assert.match(app,/destination-hero rg2-destination-hero/,'Research must reuse native destination hero');
assert.match(app,/rg2-leagues segmented destination-segmented/,'Research sport controls match TSO 2.0');
assert.match(app,/destination-section rg2-game-section/,'Research uses shared destination section hierarchy');
assert.match(css,/RESEARCH \/ TSO 2\.0 BROADCAST SHELL PARITY/,'Native Research shell override is present');
assert.match(css,/\.rg2-page \.rg2-game-card\{/,'Research cards inherit consistent design layer');
assert.match(css,/\.broadcast-main:has\(> \.rg2-page\)/,'Research fills the TSO shell with no blank gutter');
assert.match(css,/--rg-orange:var\(--outpost-blue/);
assert.match(css,/\.rg2-view button\.is-active\{background:#2d7fff/);
// Guard the FINAL cascade, not an earlier obsolete blue Research declaration.
const paletteTail=css.slice(css.lastIndexOf('TSO2 RESEARCH — native broadcast colors'));
assert.ok(paletteTail.length>4500,'Final Research charcoal theme is present');
assert.match(paletteTail,/--rg-orange:var\(--outpost-orange/,'Research inherits the actual brand orange');
assert.match(paletteTail,/--rg-gold:var\(--outpost-gold/,'Research inherits the actual brand gold');
assert.match(paletteTail,/\.rg2-page \.rg2-table td\{\s*background:#0e1219/,
  'Research table rows use charcoal instead of bright navy');
assert.match(paletteTail,/rg2-atd--history/,'Historical rates remain visually distinct');
assert.match(app,/HIST · ['"]?\+info\.sample/,'Historical source is labeled beside each rate');

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
assert.match(root.innerHTML,/rg2-status-deck/,'Native TSO status deck appears on landing');
assert.match(root.innerHTML,/destination-hero rg2-destination-hero/,'Landing uses native header');
assert.match(root.innerHTML,/rg2-game-card/);
assert.match(root.innerHTML,/NHL/);
assert.doesNotMatch(root.innerHTML,/2025 1ST/,'Do not show columns before selecting a game');
const nflId='nfl|001|NO|KC|'+schedule;
click('data-rg2-game',{rg2Game:nflId});
assert.match(root.innerHTML,/2025 1ST/,'NFL touchdown columns match the reference video');
assert.match(root.innerHTML,/rg2-destination-hero--detail/,'Selected game keeps native TSO destination header');
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

// NFL ANYTIME TD research must distinguish model forecasts, the exact
// bookmaker's implied percentage (including vig), and verified historical
// game-log touchdown occurrence. No rate may be silently mislabeled a model.
{
  const g={id:'td-source-fixture',league:'nfl',state:'pre',startTime:schedule,
    away:{abbr:'TB',name:'Tampa Bay Buccaneers'},
    home:{abbr:'DAL',name:'Dallas Cowboys'}};
  const picks=[
    {...row('nfl','modeled-atd','Model Player','DAL','TB','atd',43.7),
      team:'DAL',price:-110,impliedPct:52.4},
    {...row('nfl','market-atd','Market Player','DAL','TB','atd',null),
      team:'DAL',price:180,impliedPct:35.7},
    {...row('nfl','historical-atd','History Player','DAL','TB','atd',null),
      team:'DAL',price:null,impliedPct:null,model:null},
    {...row('nfl','missing-atd','No Data Player','DAL','TB','atd',null),
      team:'DAL',price:null,impliedPct:null,model:null}
  ];
  const ctx={window:{},URLSearchParams,setTimeout,console,
    fetch:async url=>{
      const value=String(url);
      if(value.includes('nfl-td-opportunities.json'))
        return {ok:false,status:503};
      const params=new URL('https://fixture.test'+value).searchParams;
      const name=params.get('name');
      const games=name==='History Player'?[
        {date:'2026-10-06',tds:1},{date:'2026-09-29',tds:0},
        {date:'2026-09-22',tds:1},{date:'2026-09-15',tds:0},
        {date:'2026-09-08',tds:1}
      ]:[];
      return {ok:true,json:async()=>({
        available:true,player:{name,team:'DAL',position:'RB',gameLog:games}
      })};
    }};
  vm.runInNewContext(app.slice(0,seam),ctx);
  const flow=ctx.window.TSO2ResearchGameFlow;
  const root={innerHTML:'',isConnected:true,contains:()=>true,scrollIntoView(){},querySelector(){return null}};
  flow.render(root,{league:'nfl',games:[g],rows:picks});
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-game',
    dataset:{rg2Game:'nfl|td-source-fixture|TB|DAL|'+schedule}})}});
  await new Promise(resolve=>setTimeout(resolve,1100));
  assert.match(root.innerHTML,/ANYTIME TD %/,'Exact NFL touchdown column label');
  assert.match(root.innerHTML,/rg2-atd--model">43\.7%<\/strong><small>MODEL/,
    'A validated exact model outranks other odds and game logs');
  assert.match(root.innerHTML,/rg2-atd--market">35\.7%<\/strong><small>MARKET/,
    'Exact sportsbook-implied price is labeled MARKET, not MODEL');
  assert.match(root.innerHTML,/rg2-atd--history">60%<\/strong><small>HIST · 5G/,
    'Three actual touchdown games out of five show 60%, clearly historical');
  assert.match(root.innerHTML,/HIST: actual TD game rate \(not a prediction\)/,
    'The source legend prohibits interpreting historical hit rate as a forecast');
  assert.match(root.innerHTML,/No Data Player[\s\S]*?rg2-val-atd"><span class="rg2-na"/,
    'Absent sources remain unavailable and are not fabricated');
  assert.doesNotMatch(root.innerHTML,/rg2-atd--history">100%/,
    'No guaranteed touchdown probability inferred from historical outcomes');
}

// A real nflverse-only player is named "J.Williams", not "Javonte Williams".
// The GSIS join must hydrate verified completed-game statistics and a full
// headshot without requiring an exact sportsbook price or guessing identity.
{
  const gsis='00-0036997';
  const source={schemaVersion:1,source:'nflverse fixture',
    generatedAt:new Date().toISOString(),seasons:{
      '2025':{players:{[gsis]:{name:'J.Williams',team:'DAL',firstTdGames:1}}},
      '2026':{players:{[gsis]:{name:'J.Williams',team:'DAL',
        carries:62,targets:17,gamesWithOpportunities:4,firstTdGames:2}}}
    }};
  let seenPlayerId='';
  const sandbox={window:{},URLSearchParams,setTimeout,console,
    fetch:async url=>{
      if(String(url).includes('nfl-td-opportunities.json'))
        return {ok:true,json:async()=>source};
      const u=new URL('https://fixture.test'+url);
      seenPlayerId=u.searchParams.get('playerId')||'';
      if(seenPlayerId!==gsis)return {ok:true,json:async()=>({available:false})};
      return {ok:true,json:async()=>({available:true,player:{
        name:'Javonte Williams',gsisId:gsis,team:'DAL',position:'RB',
        headshot:'https://a.espncdn.com/i/headshots/nfl/players/full/4361579.png',
        currentSeason:{totalTds:6},previousSeason:{totalTds:13,games:16},
        gameLog:[
          {date:'2026-10-04',tds:3},{date:'2026-09-27',tds:1},
          {date:'2026-09-20',tds:0},{date:'2026-09-13',tds:2}
        ]
      }})};
    }};
  vm.runInNewContext(app.slice(0,seam),sandbox);
  const flow=sandbox.window.TSO2ResearchGameFlow;
  const root={innerHTML:'',dataset:{},isConnected:true,contains:()=>true,
    scrollIntoView(){},querySelector(){return null}};
  const game={id:'gsis-join',league:'nfl',state:'pre',startTime:schedule,
    away:{abbr:'TB',name:'Tampa Bay Buccaneers'},
    home:{abbr:'DAL',name:'Dallas Cowboys'}};
  flow.render(root,{league:'nfl',games:[game],rows:[]});
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-game',
    dataset:{rg2Game:'nfl|gsis-join|TB|DAL|'+schedule}})}});
  await new Promise(resolve=>setTimeout(resolve,1050));
  assert.equal(seenPlayerId,gsis,'Correct verified GSIS ID is used for NFL detail');
  assert.match(root.innerHTML,/Javonte Williams/,'Use source-verified full name, not short initial');
  assert.match(root.innerHTML,/headshots\/nfl\/players\/full\/4361579\.png/,
    'Use player-linked ESPN headshot from verified GSIS record');
  assert.match(root.innerHTML,/rg2-val-atd"><span class="rg2-atd-stack"[^>]*>[\s\S]*?75%<\/strong><small>HIST · 4G/,
    'Three touchdowns-scoring games out of four render 75% as historical');
  assert.match(root.innerHTML,/rg2-val-yearTD">6/,'Actual current-season TD total is populated');
  assert.match(root.innerHTML,/rg2-val-prevTD">13/,'Actual prior-season TD total is populated');
}

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


// Alias reconciliation and bookmaker-independent NFL PBP must work on the real
// NHL/NFL game-first module, with no false player associations from coincident IDs.
{
  const source={
    schemaVersion:1,generatedAt:new Date().toISOString(),source:'nflverse fixture',
    seasons:{'2025':{players:{'00-0000001':{name:'A.Runner',team:'WAS',firstTdGames:2}}},
      '2026':{players:{
        '00-0000001':{name:'A.Runner',team:'WAS',gamesWithOpportunities:4,carries:53,targets:12,
          goalLineSharePct:25,targetSharePct:8.1},
        '00-0000002':{name:'B.Receiver',team:'WAS',gamesWithOpportunities:4,carries:0,targets:34}
      }}}
  };
  const sb={window:{},setTimeout,console,URLSearchParams,
    fetch:async url=>String(url).includes('nfl-td-opportunities.json')
      ?{ok:true,json:async()=>source}:{ok:false,status:404}};
  vm.runInNewContext(app.slice(0,seam),sb);
  const flow=sb.window.TSO2ResearchGameFlow;
  const root={innerHTML:'',dataset:{},isConnected:true,contains:()=>true,scrollIntoView(){},querySelector(){return null}};
  const g={id:'local-1',league:'nfl',state:'pre',startTime:schedule,
    away:{abbr:'NYG',name:'New York Giants'},home:{abbr:'WSH',name:'Washington Commanders'}};
  const wrong={...row('nfl','collision','Wrong Game Player','BAL','CIN','atd',91),eventId:g.id};
  flow.render(root,{league:'nfl',games:[g],rows:[wrong]});
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-game',
    dataset:{rg2Game:'nfl|local-1|NYG|WSH|'+schedule}})}});
  await new Promise(resolve=>setTimeout(resolve,750));
  assert.match(root.innerHTML,/A.Runner/,'WSH/WAS maps to verified NFL fallback');
  assert.match(root.innerHTML,/B.Receiver/,'Multiple verified fallback players appear without sportsbook markets');
  assert.doesNotMatch(root.innerHTML,/Wrong Game Player/,'Matching event ID cannot bypass team verification');
  assert.match(root.innerHTML,/2026 OPPS/,'Exact carries plus targets remain accessible in Lab');
  assert.match(root.innerHTML,/rg2-val-opps\">65/,'Verified 2026 opportunities are 53 carries plus 12 targets');
  assert.match(root.innerHTML,/as of \d{4}-\d\d-\d\d/,'Historical feed date remains visible');
  assert.doesNotMatch(root.innerHTML,/91%/,'Do not show wrong-game probability');
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-view',dataset:{rg2View:'board'}})}});
  assert.match(root.innerHTML,/2026 VERIFIED OPPORTUNITIES/,'Board shows actual opportunity totals not unavailable model %');
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-view',dataset:{rg2View:'rank'}})}});
  assert.match(root.innerHTML,/Ranked by verified 2026 carries \+ targets/,'Ranking is source-backed rather than alphabetical');
  assert.match(root.innerHTML,/2026 OPPS/,'Rank shows correctly labeled historical counts');
}

// NBA roster/history must render from real-source-shaped ESPN data even when
// no sportsbook odds exist for a selected NBA game. Historical rows are not bets.
{
  const sb={window:{},setTimeout,console,URLSearchParams,
    fetch:async url=>{
      const address=String(url);
      if(address.includes('/roster')){
        const isBos=address.includes('/BOS/roster');
        return {ok:true,json:async()=>({
          timestamp:'2026-10-08T12:00:00Z',team:{id:isBos?'2':'5',abbreviation:isBos?'BOS':'CLE'},
          athletes:[{id:isBos?'nba-bos-1':'nba-cle-1',displayName:isBos?'Verified Boston Player':'Verified Cleveland Player',
            position:{abbreviation:'G'},headshot:{href:'https://example.com/nba-player.png'}}]})};
      }
      const params=new URL('https://fixture.test'+address).searchParams;
      const name=params.get('name');
      return {ok:true,json:async()=>({available:true,sport:'nba',player:{
        id:params.get('playerId'),name,team:name.includes('Boston')?'Boston Celtics':'Cleveland Cavaliers',
        position:'G',recentGames:Array.from({length:5},(_,i)=>({
          date:'2026-10-0'+(7-i)+'T00:00:00Z',minutes:30,
          stats:{points:15,rebounds:6,assists:4,threes:2}
        }))}})};
    }};
  vm.runInNewContext(app.slice(0,seam),sb);
  const flow=sb.window.TSO2ResearchGameFlow;
  const root={innerHTML:'',dataset:{},isConnected:true,contains:()=>true,scrollIntoView(){},querySelector(){return null}};
  const g={id:'nba-zero-props',league:'nba',state:'pre',startTime:schedule,
    away:{abbr:'BOS',name:'Boston Celtics'},home:{abbr:'CLE',name:'Cleveland Cavaliers'}};
  let added=0;
  flow.render(root,{league:'nba',games:[g],rows:[],addSelection:()=>added++});
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-game',
    dataset:{rg2Game:'nba|nba-zero-props|BOS|CLE|'+schedule}})}});
  await new Promise(resolve=>setTimeout(resolve,1100));
  assert.match(root.innerHTML,/Verified Boston Player/,'ESPN Boston roster fills NBA Research');
  assert.match(root.innerHTML,/Verified Cleveland Player/,'ESPN Cleveland roster fills NBA Research');
  assert.match(root.innerHTML,/ESPN NBA ROSTER/,'Source is correctly labeled');
  assert.match(root.innerHTML,/L5 PTS/,'Sport-specific sourced history column appears');
  assert.match(root.innerHTML,/rg2-val-nbaL5Pts">15/,'Last-five verified points per game not fake forecast');
  assert.match(root.innerHTML,/disabled title="No verified exact sportsbook selection"/,'Historical NBA rows cannot be added as bets');
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-add',
    dataset:{rg2Add:'0'}})}});
  assert.equal(added,0,'No fake sportsbook selection added');
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-view',
    dataset:{rg2View:'rank'}})}});
  assert.match(root.innerHTML,/Ranked by verified last-five game averages/,'NBA rank uses verified production');
  assert.doesNotMatch(root.innerHTML,/VERIFIED MODEL CHANCE/,'Unpriced NBA history is not a model');
}

// Network failures must not strand mobile NBA Research on an endless spinner.
{
  const sandbox={window:{},setTimeout,console,URLSearchParams,fetch:async()=>{throw Error('ESPN fixture offline')}};
  vm.runInNewContext(app.slice(0,seam),sandbox);
  const flow=sandbox.window.TSO2ResearchGameFlow;
  const root={innerHTML:'',dataset:{},isConnected:true,contains:()=>true,scrollIntoView(){},querySelector(){return null}};
  const game={id:'nba-offline',league:'nba',state:'pre',startTime:schedule,
    away:{abbr:'BOS',name:'Boston Celtics'},home:{abbr:'CLE',name:'Cleveland Cavaliers'}};
  flow.render(root,{league:'nba',games:[game],rows:[]});
  root.onclick({target:{closest:()=>({hasAttribute:k=>k==='data-rg2-game',
    dataset:{rg2Game:'nba|nba-offline|BOS|CLE|'+schedule}})}});
  await new Promise(resolve=>setTimeout(resolve,620));
  assert.match(root.innerHTML,/PLAYER FEED UNAVAILABLE/,'Unavailable ESPN source clearly identified');
  assert.doesNotMatch(root.innerHTML,/Loading verified NBA rosters/,'No infinite loading screen on failure');
}

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
