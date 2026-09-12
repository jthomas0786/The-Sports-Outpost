import assert from 'node:assert/strict';
import { evaluateCombination, optimizeHalftimeParlay } from '../sports/nfl/halftime-optimizer-v884.js';
import { halftimeBoardCurrent } from '../sports/nfl/halftime-validity.js';
import { buildNflCommandCenter, renderNflCommandCenter } from '../sports/nfl/command-center.js';
const now=Date.parse('2026-09-13T18:30:00Z'),n=101;
const mask=hits=>{const b=Buffer.alloc(Math.ceil(n/8));for(const i of hits)b[i>>3]|=1<<(i%8);return b.toString('base64');};
const hits=count=>Array.from({length:count},(_,i)=>i);
const leg=(id,indices)=>({id,gameId:'g',playerId:id,name:id,team:'NE',market:'recYds',side:'over',line:50.5,price:100,book:'Book',simProbability:indices.length/n,bookFairProbability:.5,edge:.15,oddsAgeSeconds:10,worldMaskB64:mask(indices),worldMaskIterations:n});
const a=leg('QB',hits(80)),b=leg('WR',hits(70)),c=leg('WR2',Array.from({length:61},(_,i)=>i+40));
const board={gameId:'g',ready:true,iterations:n,generatedAt:new Date(now).toISOString(),state:{period:2,clockMin:0,awayScore:7,homeScore:10},candidates:[a,b,c]};
const map=new Map([['g',board]]);
assert.equal(evaluateCombination([a,b],map).jointProbability,Number((70/n).toFixed(8)));
assert.equal(evaluateCombination([b,c],map).jointProbability,Number((30/n).toFixed(8)),'competing receivers use shared worlds');
assert.equal(evaluateCombination([a,a],map),null,'duplicate legs rejected');
assert.equal(evaluateCombination([{...a,line:99.5},b],map),null,'stale line cannot borrow masks');
assert.equal(evaluateCombination([{...a,price:200},b],map),null,'stale quote rejected');
for(const change of [{worldMaskB64:null},{worldMaskB64:'?'},{worldMaskB64:'AA=='},{worldMaskIterations:100}]){
 const bad={...a,...change},bm=new Map([['g',{...board,candidates:[bad,b]}]]);
 assert.equal(evaluateCombination([bad,b],bm),null,'invalid worlds never fall back to independence');
}
const under={...a,id:'under',side:'under'};
assert.equal(evaluateCombination([a,under],new Map([['g',{...board,candidates:[a,under]}]])),null);
const d={...leg('Other',hits(60)),gameId:'other'};
const cross=evaluateCombination([a,b,d],new Map([...map,['other',{...board,gameId:'other',candidates:[d]}]]));
assert.equal(cross.jointProbability,Number(((70/n)*(60/n)).toFixed(8)));
assert.equal(optimizeHalftimeParlay({boards:[board],legCount:2}).evaluation.exactSameWorld,true);
const liveGame={status:'in',statusDetail:'Halftime',away:{score:7},home:{score:10},liveScore:{period:2,clockMin:0,lastFetchedAt:now}};
assert.equal(halftimeBoardCurrent(board,liveGame,now),true);
assert.equal(halftimeBoardCurrent(board,{...liveGame,liveScore:{...liveGame.liveScore,period:3,clockMin:15}},now),false,'Q3 expires even on a one-game slate');
assert.equal(halftimeBoardCurrent(board,{...liveGame,home:{score:17}},now),false,'score correction expires board');
assert.equal(halftimeBoardCurrent(board,liveGame,now+601000),false);
assert.equal(halftimeBoardCurrent(board,null,now),false,'orphan cache is not a live halftime board');

const research={players:[{gameId:'g',espnId:'p',team:'NE',name:'Test Receiver',position:'WR',last5:{avg:{targets:8}},model:{atdProbability:.4}}]};
const base={status:'in',statusDetail:'2nd Quarter',period:2,clockMin:3,awayAbbr:'NE',homeAbbr:'SEA',awayScore:7,homeScore:10,lastFetchedAt:now,possession:'away',yardFromOwn:85,down:2,distance:4,currentDrive:{id:'drive-1'},playerStats:{byId:{p:{name:'Test Receiver',team:'NE',flat:{targets:8,receptions:5,recYds:48}}}}};
const odds={meta:{fetchedAt:new Date(now).toISOString()},games:[{gameId:'g',players:[{name:'Test Receiver',team:'NE',odds:{recYds:{line:50.5,over:{best:{price:-110,ts:now}}}}}]}]};
const run=live=>buildNflCommandCenter({liveDoc:{games:{g:live}},research,odds,now});
const active=run(base);
assert.deepEqual(new Set(active.alerts.map(a=>a.type)),new Set(['Touchdown watch','Prop watch','Usage surge']));
assert.deepEqual(run({...base,lastFetchedAt:now+1000}).alerts.map(a=>a.key),active.alerts.map(a=>a.key),'polling does not recreate unseen alerts');
assert.equal(run({...base,possession:'home'}).alerts.some(a=>a.type==='Touchdown watch'),false,'turnover removes previous offense threat');
assert.equal(run({...base,period:2,clockMin:0,statusDetail:'Halftime'}).alerts.some(a=>a.type==='Touchdown watch'),false);
assert.equal(run({...base,status:'post'}).alerts.length,0);
assert.equal(run({...base,currentDrive:{id:'drive-1',result:'Touchdown'}}).alerts.some(a=>a.type==='Touchdown watch'),false,'completed scoring drive removes threat');
assert.equal(run({...base,lastFetchedAt:now-121000}).alerts.length,0);
assert.equal(buildNflCommandCenter({liveDoc:{games:{g:base}},research:{players:[{...research.players[0],injury:{status:'Out'}}]},odds,now}).alerts.length,1,'injured player excluded while team opportunity remains');
const unknown=run({...base,yardFromOwn:null});assert.equal(unknown.alerts.some(a=>a.type==='Touchdown watch'),false);
const staleOdds=structuredClone(odds);staleOdds.games[0].players[0].odds.recYds.over.best.ts=now-700000;
assert.equal(buildNflCommandCenter({liveDoc:{games:{g:base}},research,odds:staleOdds,now}).alerts.some(a=>a.type==='Prop watch'),false);
assert.ok(!renderNflCommandCenter({...active,alerts:[{...active.alerts[0],name:'<script>alert(1)</script>'}]}).includes('<script>'));
assert.ok(!/rerun|failed jobs|admin|Week 1|preview mode/i.test(renderNflCommandCenter(active)));
const tdPlays=['Passing Touchdown','Rushing Touchdown','Interception Return Touchdown','Kickoff Return Touchdown','Field Goal Good','Safety','Extra Point Good'].map((type,i)=>({id:String(i),type}));
const tdGame={...base,scoringPlays:[...tdPlays,tdPlays[0]]};
assert.equal(run(tdGame).touchdowns,4,'offense, defense and returns count once; other scores and duplicate plays do not');
assert.equal(run({...tdGame,scoringPlays:tdPlays.slice(1)}).touchdowns,3,'corrected scoring feed replaces the count');
assert.equal(buildNflCommandCenter({liveDoc:{games:{g:tdGame,final:{...tdGame,status:'post',lastFetchedAt:now-86400000},pre:{status:'pre'}}},now}).touchdowns,8,'completed games stay in the slate total');
assert.equal(run({...base,scoringPlays:[]}).touchdowns,0);
assert.equal(run(base).touchdowns,null,'missing scoring data is not reported as zero');
assert.equal(buildNflCommandCenter().touchdowns,null);
assert.match(renderNflCommandCenter(run(tdGame)),/<b>4<\/b><span>Touchdowns<\/span>/);
assert.match(renderNflCommandCenter(run(base)),/<b>—<\/b><span>Touchdowns<\/span>/);
console.log('NFL v89.20 same-world, halftime validity, and live threat replay checks passed');

// Actual engine -> halftime board -> browser optimizer bridge, including current
// totals and a receiver ruled out during the game. These are synthetic fixtures.
const { simulateGame, jointProbabilityFromResult }=await import('../sports/nfl/sim/engine-v8918.js');
const { buildHalftimeBoard }=await import('../sports/nfl/sim/halftime.js');
const fs=await import('node:fs');
const config=JSON.parse(fs.readFileSync('sports/nfl/sim/config.json','utf8'));
const simGame={gameId:'engine',away:{abbr:'NE'},home:{abbr:'SEA'}};
const simResearch={players:[
 {gameId:'engine',espnId:'q',name:'Test QB',team:'NE',position:'QB'},
 {gameId:'engine',espnId:'r',name:'Test WR',team:'NE',position:'WR'},
 {gameId:'engine',espnId:'out',name:'Injured WR',team:'NE',position:'WR',injury:{status:'Out'}},
 {gameId:'engine',espnId:'back',name:'Test RB',team:'NE',position:'RB'},
]};
const simLive={status:'in',statusDetail:'Halftime',period:2,clockMin:0,awayScore:7,homeScore:10,playerStats:{byId:{
 q:{name:'Test QB',team:'NE',flat:{compAtt:'10/15',passYds:100,passTds:1}},
 r:{name:'Test WR',team:'NE',flat:{targets:5,receptions:4,recYds:40,recTds:0}},
 out:{name:'Injured WR',team:'NE',flat:{targets:4,receptions:3,recYds:35,recTds:1}},
}}};
const sim=simulateGame({game:simGame,research:simResearch,odds:{games:[]},liveGame:simLive,config,iterations:1000,seed:8920,includeSamples:true});
const injured=sim._samples.players.get('out');
assert.ok([...injured.stats.recYds].every(v=>v===35));
assert.ok([...injured.stats.receptions].every(v=>v===3));
for(const rec of sim._samples.players.values()){
 for(const key of ['passYds','rushYds','recYds','receptions','attempts'])assert.ok([...rec.stats[key]].every(v=>v>=(rec.player.current[key]||0)));
}
const offer={price:300,book:'Test',ageSeconds:0};
const bridge=buildHalftimeBoard({result:sim,game:simGame,liveGame:simLive,config:{halftime:{candidateMinProbability:0,candidateMinEdge:-1}},liveOdds:{games:[{gameId:'engine',players:[
 {name:'Test QB',team:'NE',odds:{passYds:{line:180.5,over:{best:offer}}}},
 {name:'Test WR',team:'NE',odds:{recYds:{line:90.5,over:{best:offer}}}},
]}]}});
assert.equal(bridge.candidates.length,2);
const evaluated=evaluateCombination(bridge.candidates,new Map([['engine',bridge]]));
assert.equal(evaluated.jointProbability,jointProbabilityFromResult(sim,bridge.candidates));
console.log('Engine-to-parlay bridge and injured-player stat preservation passed');
