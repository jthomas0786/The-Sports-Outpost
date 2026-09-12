import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareReplayFrame, replayIterations, simulateReplayFrame } from '../sports/nfl/sim/replay.js';
import { summaryReplayFrame } from './lib/nfl-summary-replay.mjs';
import { writeReplayFile } from './lib/nfl-replay-io.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../sports/nfl/sim/config.json',import.meta.url)));
const start=Date.parse('2026-09-10T23:00:00Z'),at=m=>new Date(start+m*60000).toISOString();
const game={gameId:'history',startTimeUTC:at(10),away:{abbr:'NE',score:99},home:{abbr:'SEA',score:99},players:[{name:'Future player'}]};
const players=['NE','SEA'].flatMap(team=>['QB','RB','WR'].map((position,i)=>({gameId:'history',espnId:`${team}-${position}`,name:`${team} ${position}`,team,position,depthRank:1})));
const stats={byId:{'NE-QB':{name:'NE QB',team:'NE',flat:{compAtt:'5/8',passYds:60,passTds:1}},'NE-WR':{name:'NE WR',team:'NE',flat:{targets:5,receptions:4,recYds:50,recTds:1}}},byName:{}};
const live={status:'in',period:2,clockMin:4,homeScore:3,awayScore:7,awayAbbr:'NE',homeAbbr:'SEA',possession:'away',yardFromOwn:84,down:2,distance:4,playerStats:stats,lastFetchedAt:start+40*60000};
const archive={schemaVersion:1,game,research:[{availableAt:at(0),source:'pregame-capture',data:{generatedAt:at(0),players}}],odds:[],frames:[
 {at:at(1),liveGame:{status:'pre',awayScore:0,homeScore:0}},
 {at:at(40),liveGame:live},
 {at:at(50),liveGame:{...live,clockMin:0,statusDetail:'Halftime',lastFetchedAt:start+50*60000}},
 {at:at(100),liveGame:{...live,status:'post',period:4,clockMin:0,homeScore:20,awayScore:24,lastFetchedAt:start+100*60000}},
]};
const inputs=prepareReplayFrame(archive,1);
assert.equal(inputs.game.home.score,3);assert.equal(inputs.game.players,undefined);
assert.equal(inputs.liveGame.playerStats.byId['NE-QB'].flat.passYds,60);
assert.deepEqual(prepareReplayFrame(archive,0).odds,{games:[]},'missing historic odds never use current odds');
assert.deepEqual(archive.frames.map(f=>replayIterations(f.liveGame)),[50000,15000,50000,0]);
const before=JSON.stringify(archive);
const early=simulateReplayFrame(archive,1,{config,iterations:300,seed:1});
const changed=structuredClone(archive);
changed.game.away.score=1000;
changed.frames[3].liveGame.playerStats={byId:{'NE-QB':{flat:{passYds:9999}}}};
changed.research.push({availableAt:at(90),data:{players:[{...players[0],currentSeason:{perGame:{passYds:9999}}}]}});
changed.odds.push({availableAt:at(90),data:{games:[{gameId:'history',gameLines:{total:{line:999}}}]}});
assert.deepEqual(simulateReplayFrame(changed,1,{config,iterations:300,seed:1}),early,'future final stats, priors, odds and slate scores cannot change an earlier forecast');
assert.equal(JSON.stringify(archive),before,'replay never mutates archives');
for(const bad of [
 {...archive,research:[{availableAt:at(90),data:{players}}]},
 {...archive,research:[{availableAt:at(0),data:{generatedAt:at(90),players}}]},
 {...archive,odds:[{availableAt:at(0),data:{games:[{offer:{ts:start+90*60000}}]}}]},
])assert.throws(()=>prepareReplayFrame(bad,1),/future|No archived/);
const invalid=structuredClone(archive);invalid.frames[1].liveGame.replayStatsComplete=false;
assert.throws(()=>prepareReplayFrame(invalid,1),/Visual summary/);
invalid.frames[1].liveGame=structuredClone(live);delete invalid.frames[1].liveGame.clockMin;
assert.throws(()=>prepareReplayFrame(invalid,1),/clock/);
invalid.frames[1].at=at(0);assert.throws(()=>prepareReplayFrame(invalid,1),/chronological/);
const half=simulateReplayFrame(archive,2,{config,seed:2});
assert.equal(half.iterations,50000,'halftime runs the production full simulation count');
const receiver=half.result.players.find(p=>p.espnId==='NE-WR');
assert.ok(receiver.distributions.recYds.min>=50);
assert.equal(half.result.liveModel.active,true);
assert.equal(simulateReplayFrame(archive,3,{config}).result,undefined,'finals are observations, not forecasts');
await assert.rejects(writeReplayFile('slates/nfl-live.json',{}),/protect production/);

// Summary QA frames must never reveal the final box score or drive outcome.
const raw={header:{id:'history',competitions:[{competitors:[{homeAway:'home',team:{abbreviation:'SEA'}},{homeAway:'away',team:{abbreviation:'NE'}}]}]},boxscore:{players:[{stats:[999]}]},drives:{previous:[{id:'d',team:{abbreviation:'NE'},result:'Touchdown',yards:90,timeElapsed:{displayValue:'7:30'},plays:[
 {id:'1',text:'First play',period:{number:1},clock:{displayValue:'14:30'},awayScore:0,homeScore:0,start:{down:1},end:{team:{abbreviation:'NE'},yardsToEndzone:70,down:2,distance:5}},
 {id:'2',text:'Touchdown',type:{text:'Passing Touchdown'},scoringPlay:true,period:{number:1},clock:{displayValue:'7:00'},awayScore:7,homeScore:0},
]}]}};
const frame=summaryReplayFrame(raw,0,100);
const future=structuredClone(raw);future.boxscore.players[0].stats=[5555];future.drives.previous[0].result='Interception';future.drives.previous[0].plays[1].awayScore=99;
assert.deepEqual(summaryReplayFrame(future,0,100),frame);
assert.equal(frame.games.history.playerStats,null);assert.equal(frame.games.history.teamStats,null);
assert.equal(frame.games.history.currentDrive.result,null);assert.equal(frame.games.history.currentDrive.yards,null);
assert.equal(frame.games.history.yardFromOwn,30);assert.equal(frame.games.history.down,2);
assert.equal(frame.games.history.scoringPlays.length,0);
console.log('Historical replay: future isolation, archive validation, 50K halftime and visual replay safety passed');
