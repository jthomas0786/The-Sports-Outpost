import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const base=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const boardText=base('nba-matchup-board.js'),app=base('app.js'),worker=base('preview-worker.js'),html=base('index.html');
const window={},document={addEventListener(){}};
runInNewContext(boardText,{window,document,Date,Math,Number,String,Map,Set});
const board=window.TSO3NbaMatchupBoard;
const future=new Date(Date.now()+36*3600000).toISOString();
const played=new Date(Date.now()-36*3600000).toISOString();
const opponent=new Date(Date.now()-60*3600000).toISOString();
const player=(id,teamId)=>({id:String(id),name:'Verified Athlete '+id,teamId:String(teamId),position:'PG',
  recentGames:[{season:2027,seasonType:2,date:played,minutes:35,stats:{points:21,rebounds:5,assists:7,threes:3,pra:33}},
    {season:2027,seasonType:2,date:opponent,minutes:32,stats:{points:14,rebounds:4,assists:8,threes:2,pra:26}},
    {season:2026,seasonType:2,date:'2026-03-11',minutes:35,stats:{points:40,rebounds:5,assists:5,threes:5,pra:50}}]});
const game={league:'nba',id:'401999999',state:'pre',startTime:future,
 away:{id:'20',abbr:'PHI'},home:{id:'16',abbr:'MIL'}};
const ctx={games:[game],research:{currentSeason:2027,generatedAt:new Date(Date.now()-3600000).toISOString(),
 teams:{'20':{abbr:'PHI'},'16':{abbr:'MIL'}},
 players:{'1':player('1','20'),'2':player('2','16')},
 teamDefense:{'16':{byPosition:{G:{points:999}}}}},injuries:{entries:[]}};
test('paired NBA board renders official scheduled teams, tabs and player log samples',()=>{
 const v=board.render(ctx);
 assert.match(v,/PHI/);assert.match(v,/MIL/);
 assert.match(v,/PHI player form/);assert.match(v,/MIL player form/);
 assert.match(v,/data-nba-board-range/);assert.match(v,/data-nba-board-market="points"/);
 assert.match(v,/2026–27/);assert.match(v,/Verified Athlete 1/);
 assert.match(v,/ts-role-comparison/);
});
test('current 2027 regular-season window does not backfill 2026 games',()=>{
 board.state.ctx=ctx;
 const p=ctx.research.players['1'];
 assert.equal(board.observations(p).length,2);
 assert.equal(board.historical(p,'points','season').mean,17.5);
 assert.equal(board.historical(p,'points','l5').mean,17.5);
 assert.equal(board.historical(p,'points','l10').games,2);
});
test('older mixed season opponent defense source cannot be shown as 2027 defensive data',()=>{
 board.state.defense=null;
 assert.equal(board.positional(ctx,'16','G','points').value,null);
 const r=board.render(ctx);
 assert.doesNotMatch(r,/>999\.0</);
});
test('current defensive group output requires verified current season and robust ranks',()=>{
 const now=new Date().toISOString();
 board.state.defense={available:true,season:2027,coverageComplete:true,updatedAt:now,groups:[
  {teamId:'16',position:'G',games:2,perGame:{points:48.5,rebounds:14.5,assists:10,threes:4.5,pra:73}}
 ]};
 const observed=board.positional(ctx,'16','G','points');
 assert.equal(observed.value,48.5);
 assert.equal(observed.games,2);
 assert.equal(observed.rank,null);
 board.state.defense={...board.state.defense,season:2026};
 assert.equal(board.positional(ctx,'16','G','points').value,null);
 board.state.defense=null;
});
test('cannot render stale research from a previous NBA season as current',()=>{
 const text=board.render({...ctx,research:{...ctx.research,currentSeason:2026}});
 assert.match(text,/Verified 2026–27 NBA athlete history is unavailable/);
});
test('new NBA matchup board is routed before legacy flat table and fetches its own official source',()=>{
 assert.match(html,/nba-matchup-board\.js/);
 assert.match(worker,/nba-matchup-board\\\.js/);
 assert.match(app,/state\.tool==='matchup-vs-position'/);
 assert.match(app,/TSO3NbaMatchupBoard\.hydrate/);
 assert.match(worker,/async function verifiedNbaCurrentDefense/);
 assert.match(worker,/u\.pathname==='\/api\/nba-current-dvp'/);
 assert.match(worker,/Missing official ESPN daily NBA scoreboard prevents complete current-season coverage/);
 assert.match(worker,/status.*completed.*true/);
});
test('server refuses mixed-season cached aggregates, and requires complete official season box scores',()=>{
 const from=worker.indexOf('async function verifiedNbaCurrentDefense()');
 const to=worker.indexOf('\nfunction sanitizeNbaResearch(',from);
 assert.ok(from>=0&&to>from);
 const body=worker.slice(from,to);
 assert.doesNotMatch(body,/teamDefense|nba-research\.json/);
 assert.match(body,/current!==season\|\|kind!==2/);
 assert.match(body,/played\.get\(t\)\.length<7/);
 assert.match(body,/summary\.some\(x=>!x\)/);
});


test('shared NBA feed suppresses old cached opponent defense and pace unless explicit 2027 evidence is supplied',()=>{
 const lo=worker.indexOf('function sanitizeNbaResearch('),hi=worker.indexOf('\n/* NFL data sourced',lo);
 assert.ok(lo>=0&&hi>lo);
 const fun=runInNewContext(worker.slice(lo,hi)+';sanitizeNbaResearch',{Date,Number,String,Object,Math});
 const legacy={currentSeason:2027,generatedAt:new Date().toISOString(),
  teams:{'8':{name:'Example'}},players:{'9':{id:'9',name:'Example',teamId:'8',recentGames:[]}},
  teamDefense:{'8':{byPosition:{G:{points:57.6}}}},teamProfiles:{'8':{games:83,pace:100}},
  league:{pace:100,allowByPosition:{G:{points:56}}}};
 const current=fun(legacy);
 assert.deepEqual(Object.keys(current.teamDefense),[]);
 assert.deepEqual(Object.keys(current.teamProfiles),[]);
 assert.deepEqual(Object.keys(current.league),[]);
 assert.equal(current.defenseDataQuality.verified,false);
 const sourced=fun({...legacy,teamDefenseSeason:2027,teamDefenseScope:'current_season_completed_games'});
 assert.equal(sourced.defenseDataQuality.verified,true);
 assert.equal(sourced.teamDefense['8'].byPosition.G.points,57.6);
});
