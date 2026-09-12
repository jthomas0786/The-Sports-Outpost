import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareLiveSimulationInputs, simulateGame, __V8918_TEST__ as L } from '../sports/nfl/sim/engine-v8918.js';
import { decideAutomaticRun, gameInputFingerprint } from '../sports/nfl/sim/auto.js';

const config=JSON.parse(fs.readFileSync(new URL('../sports/nfl/sim/config.json',import.meta.url),'utf8'));
const game={
  gameId:'401-test',startTimeUTC:'2026-09-12T00:00:00Z',
  away:{abbr:'SF',name:'San Francisco 49ers',score:10},home:{abbr:'LA',name:'Los Angeles Rams',score:17},
};
const research={players:[
  {gameId:'401-test',espnId:'qb-la',name:'Matthew Stafford',team:'LA',opponent:'SF',position:'QB',depthRank:1,currentSeason:{perGame:{attempts:34,completions:22,passYds:250,passTds:1.7,carries:1.5,rushYds:3,rushTds:.02}},last5:{avg:{attempts:35,completions:23,passYds:260,passTds:1.8}},previousSeason:{perGame:{attempts:33,completions:21,passYds:245,passTds:1.6}}},
  {gameId:'401-test',espnId:'wr-la',name:'Puka Nacua',team:'LA',opponent:'SF',position:'WR',depthRank:1,currentSeason:{perGame:{targets:9,receptions:6.2,recYds:82,recTds:.42,carries:.3,rushYds:2}},last5:{avg:{targets:9.5,receptions:6.4,recYds:86,recTds:.45}},previousSeason:{perGame:{targets:9,receptions:6,recYds:80,recTds:.4}}},
  {gameId:'401-test',espnId:'rb-la',name:'Kyren Williams',team:'LA',opponent:'SF',position:'RB',depthRank:1,currentSeason:{perGame:{carries:17,rushYds:74,rushTds:.55,targets:4,receptions:3.1,recYds:24,recTds:.12}},last5:{avg:{carries:18,rushYds:78,targets:4.2,receptions:3.2,recYds:25}},previousSeason:{perGame:{carries:17,rushYds:75,targets:3.8,receptions:3,recYds:23}}},
  {gameId:'401-test',espnId:'qb-sf',name:'Brock Purdy',team:'SF',opponent:'LA',position:'QB',depthRank:1,currentSeason:{perGame:{attempts:31,completions:20,passYds:238,passTds:1.6,carries:4,rushYds:20,rushTds:.15}}},
  {gameId:'401-test',espnId:'rb-sf',name:'Christian McCaffrey',team:'SF',opponent:'LA',position:'RB',depthRank:1,currentSeason:{perGame:{carries:18,rushYds:86,rushTds:.6,targets:6,receptions:5,recYds:42,recTds:.2}}},
]};
const odds={meta:{sample:false},games:[{
  gameId:'401-test',away:'SF',home:'LA',gameLines:{total:{line:47.5},spread:{line:-2.5}},players:[
    {name:'Puka Nacua',team:'LA',odds:{recYds:{line:79.5}}},
    {name:'Matthew Stafford',team:'LA',odds:{passYds:{line:249.5}}},
  ]
}]};
const liveGame={
  status:'in',statusDetail:'3rd Quarter 10:00',period:3,clockMin:10,awayScore:10,homeScore:17,
  awayAbbr:'SF',homeAbbr:'LA',possession:'home',yardFromOwn:84,isRedZone:true,down:1,distance:10,
  playerStats:{byId:{
    'qb-la':{id:'qb-la',name:'Matthew Stafford',team:'LA',flat:{compAtt:'18/25',passYds:'231',passTds:'2',interceptions:'0',carries:'1',rushYds:'2'}},
    'wr-la':{id:'wr-la',name:'Puka Nacua',team:'LA',flat:{receptions:'7',targets:'9',recYds:'118',recTds:'1'}},
    'rb-la':{id:'rb-la',name:'Kyren Williams',team:'LA',flat:{carries:'14',rushYds:'66',rushTds:'0',receptions:'2',targets:'3',recYds:'16',recTds:'0'}},
    'qb-sf':{id:'qb-sf',name:'Brock Purdy',team:'SF',flat:{compAtt:'14/22',passYds:'158',passTds:'1',interceptions:'1',carries:'3',rushYds:'15'}},
    'rb-sf':{id:'rb-sf',name:'Christian McCaffrey',team:'SF',flat:{carries:'16',rushYds:'72',rushTds:'1',receptions:'4',targets:'5',recYds:'31',recTds:'0'}},
  },byName:{}},
  teamStats:{LA:{totalYards:349,passingYards:231,rushingYards:118,turnovers:0},SF:{totalYards:245,passingYards:158,rushingYards:87,turnovers:1}},
};

const elapsed=L.elapsedFraction(liveGame);
assert.ok(elapsed>.58&&elapsed<.59,`elapsed=${elapsed}`);
assert.ok(L.driveBonus(liveGame,'home',config)>1.5);
assert.equal(L.driveBonus(liveGame,'away',config),0);
const laVolume=L.teamObservedPlays(liveGame,'LA');
assert.equal(laVolume.passAttempts,25);
assert.equal(laVolume.carries,15);
assert.equal(laVolume.plays,40);

const prepared=prepareLiveSimulationInputs({game,research,odds,liveGame,config});
assert.equal(prepared.summary.active,true);
assert.equal(prepared.summary.version,'v89.18.0');
assert.equal(prepared.summary.matchedPlayers,5);
assert.equal(prepared.summary.adjustedPlayers,5);
assert.ok(prepared.summary.driveBonus.home>1.5);
assert.ok(prepared.summary.pace.modelPlaysPerTeam>55&&prepared.summary.pace.modelPlaysPerTeam<82);
assert.equal(prepared.config.engineVersion,'v89.18.0');
assert.equal(prepared.config.blend.currentSeason,.82);

const puka=prepared.research.players.find(p=>p.espnId==='wr-la');
assert.ok(puka.currentSeason.perGame.targets>9,'hot live target pace should raise remaining usage prior');
assert.ok(puka.currentSeason.perGame.recYds>82,'hot live receiving pace should raise yardage prior');
const adjustedOdds=prepared.odds.games[0];
assert.ok(adjustedOdds.gameLines.total.line>47.5,'current red-zone possession should add modest expected drive points');
assert.ok(adjustedOdds.gameLines.spread.line<-2.5,'home possession bonus should move home expectation, not away expectation');

const result=simulateGame({game,research,odds,liveGame,config,iterations:500,seed:8918});
assert.equal(result.engineVersion,'v89.18.0');
assert.equal(result.iterations,500);
assert.equal(result.liveModel.active,true);
const simPuka=result.players.find(p=>p.espnId==='wr-la');
assert.ok(simPuka.current.recYds>=118,'live totals must be retained in every world');
assert.ok(simPuka.distributions.recYds.min>=118,'simulated final distribution cannot erase already-earned yards');

const liveDecision=decideAutomaticRun({game,research,odds,liveGame,previousState:null,existingResult:null,config,now:new Date('2026-09-12T01:30:00Z')});
assert.equal(liveDecision.phase,'live');
assert.equal(liveDecision.iterations,15000);
const halftime={...liveGame,statusDetail:'Halftime',period:2,clockMin:0,possession:null,yardFromOwn:null,isRedZone:false};
const halfDecision=decideAutomaticRun({game,research,odds,liveGame:halftime,previousState:null,existingResult:null,config,now:new Date('2026-09-12T01:30:00Z')});
assert.equal(halfDecision.phase,'halftime');
assert.equal(halfDecision.iterations,50000);

const fp1=gameInputFingerprint({game,research,odds,liveGame,phase:'live'});
const fp2=gameInputFingerprint({game,research,odds,liveGame:{...liveGame,possession:'away',yardFromOwn:32},phase:'live'});
assert.notEqual(fp1,fp2,'possession/field-position changes must trigger a new live-state fingerprint');

console.log('v89.18 live simulation calibration tests passed');
