/* Original screenshot-inspired two-team research sheet tests.
   Does not copy competitor source data or use network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const source=root('role-board.js'),app=root('app.js'),html=root('index.html'),
 worker=root('preview-worker.js'),css=root('styles.css'),other=root('verified-research.js');
const window={},document={addEventListener(){}};
runInNewContext(source,{window,document,Date,Math,Number,String,Map,Set});
const board=window.TSO3RoleBoard;
const future=new Date(Date.now()+86400000).toISOString();
const at=new Date(Date.now()-2*3600000).toISOString();
const players=Array.from({length:20},(_,i)=>{
 const opp=i===0?'ATL':i===1?'SF':'DEF'+i;
 const rec=200-i*6;
 return {id:String(990000+i),name:'Sample '+i,team:i===0?'SF':'DEF'+i,
  position:'WR',depthRank:1,currentSeason:{games:6,perGame:{targets:7,receptions:5,recYds:80,recTds:0.3}},
  logs:[{season:2026,date:'2026-10-18',week:6,targets:10,receptions:7,recYds:90,recTds:1},
   {season:2026,date:'2026-10-11',week:5,targets:4,receptions:3,recYds:60,recTds:0},
   {season:2026,date:'2026-10-04',week:4,targets:8,receptions:6,recYds:100,recTds:1}],
  matchup:{opponent:opp,season:2026,positionGroup:'WR',currentSeasonAllowed:{
   position:'WR',games:6,perGame:{yards:rec,recYds:rec,targets:15-i*0.2,
   receptions:10-i*0.1,recTds:0.5,rushYds:0,passYds:0,tds:0.5}}}};
});
const focal={...players[0],name:'Example Wide Receiver',gsisId:'00-0033280'};
const game={id:'401873017',league:'nfl',state:'pre',startTime:future,
 away:{abbr:'SF'},home:{abbr:'ATL'}};
const rz={available:true,season:2026,generatedAt:at,lastObservedGameDate:new Date(Date.now()-2*86400000).toISOString().slice(0,10),gamesScanned:94,
 players:{'00-0033280':{team:'SF',current:{redZoneOpps:18,gamesWithOpportunities:6,
 goalLineOpps:8,redZoneSharePct:40}}}};
const ctx={games:[game],research:{season:2026,generatedAt:at,
 players:[focal,...players.slice(1)]},redzone:rz,injuries:{entries:[]}};
test('standalone role board supports paired offense-versus-defense panels and all 3 markets',()=>{
 const result=board.render(ctx);
 assert.match(result,/SF offense/);assert.match(result,/ATL defense/);
 assert.match(result,/ATL offense/);assert.match(result,/SF defense/);
 assert.match(result,/Passing/);assert.match(result,/Receiving/);assert.match(result,/Rushing/);
 assert.match(result,/2026 observed/);assert.match(result,/2026 season position-group allowances/);
 assert.match(result,/data-role-game/);assert.match(result,/data-role-range/);
 assert.match(result,/Last 5/);assert.match(result,/Last 10/);
 assert.match(result,/data-role-player=/);assert.match(result,/Example Wide Receiver/);
});
test('observed opponent-defense ranking requires 16+ distinct defenses and uses highest-allowed-first',()=>{
 const def=board.indexDefense(ctx);
 const a=board.allowed(def,'ATL','WR','receiving',board.metrics.receiving[2]);
 assert.equal(a.value,200);assert.deepEqual([a.rank.rank,a.rank.n],[1,20]);
 const no=board.allowed(def,'UNKNOWN','WR','receiving',board.metrics.receiving[2]);
 assert.equal(no.value,null);assert.equal(no.rank,null);
});
test('2026 L5/L10 samples exclude other seasons and season labels remain independent',()=>{
 const season=board.playerStats(ctx,focal,'receiving','season');
 const l5=board.playerStats(ctx,focal,'receiving','l5');
 assert.equal(season.games,6);assert.equal(season.values.recYds,80);
 assert.equal(l5.games,3);assert.equal(l5.values.recYds,(90+60+100)/3);
 assert.equal(l5.values.rz,null);
 assert.equal(season.values.rz,3);
});
test('invalid/mismatched or stale red-zone source never fabricates actual RZ attempts',()=>{
 assert.equal(board.redzone(ctx,focal).pg,3);
 assert.equal(board.redzone({...ctx,redzone:{...rz,players:{...rz.players,
  '00-0033280':{...rz.players['00-0033280'],team:'NO'}}}},focal),null);
 assert.equal(board.redzone({...ctx,redzone:{...rz,generatedAt:'2025-10-01T00:00:00Z'}},focal),null);
});
test('original screenshot layout not reused as proprietary team ranks or source',()=>{
 const view=board.render(ctx);
 assert.match(view,/observed 2026 season position-group allowances/i);
 assert.match(view,/no proprietary PropFinder values/i);
 assert.match(view,/not player rank/i);
 assert.match(view,/Defensive red-zone opportunity columns intentionally show/);
 assert.doesNotMatch(view,/PFF grade|PropFinder ranking|WR1 vs CB1 probability/);
});
test('role board is wired before generic NFL lab and served by preview static bundle',()=>{
 assert.match(html,/role-board\.js/);
 assert.match(worker,/role-board\\\.js/);
 assert.ok(app.indexOf("state.tool==='role-matchups'")<app.indexOf("if(state.sport==='nfl'&&nflLabTool(state.tool))"));
 assert.match(app,/board\.render\(nflResearchContext\(\)\)/);
 assert.match(css,/\.ts-role-comparison/);
});
test('shared cross-sport sheets preserve official sources and drawn-from-observations charts',()=>{
 assert.match(other,/ts-role-comparison tso-observed-matrix/);
 assert.match(other,/tso-observed-spark/);
 assert.match(other,/Official roster membership only/);
 assert.match(other,/data-observed-player/);
 assert.match(other,/api\/athlete-depth/);
});


test('advanced view reveals only observed season role shares and preserves missing values',()=>{
 board.state.advanced=true;
 try{
  const view=board.render(ctx);
  assert.match(view,/TARGET SHARE/);assert.match(view,/AIR YDS SHARE/);
  assert.match(view,/SNAP L5/);assert.match(view,/RZ SHARE/);
  assert.match(view,/No verified defense-wide individual role-share record/);
  assert.match(view,/Advanced columns show real 2026 player season shares/);
 }finally{board.state.advanced=false;}
});
test('player-detail charts reject missing numeric values rather than injecting zero bars',()=>{
 assert.match(source,/filter\(x=>V\(x\[key\]\)!==null\)/);
 assert.match(source,/No verified completed-game observations for this metric/);
});
