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
assert.ok(Math.abs(prepared.config.league.playsPerTeamByTeam.LA-prepared.summary.pace.homeProjected)<.01);
assert.ok(Math.abs(prepared.config.league.playsPerTeamByTeam.SF-prepared.summary.pace.awayProjected)<.01);
assert.notEqual(prepared.config.league.playsPerTeamByTeam.LA,prepared.config.league.playsPerTeamByTeam.SF,'each offense must retain its own observed pace');
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

// Distribution-level proof: with the same live totals and random seed, enabling the
// calibration layer must materially change rest-of-game usage instead of only
// decorating the result with live metadata.
const uncalibratedConfig=structuredClone(config);
uncalibratedConfig.liveModel.usageMaxWeight=0;
uncalibratedConfig.liveModel.paceMaxWeight=0;
const calibrated=simulateGame({game,research,odds,liveGame,config,iterations:4000,seed:91818});
const uncalibrated=simulateGame({game,research,odds,liveGame,config:uncalibratedConfig,iterations:4000,seed:91818});
const calibratedPuka=calibrated.players.find(p=>p.espnId==='wr-la');
const uncalibratedPuka=uncalibrated.players.find(p=>p.espnId==='wr-la');
assert.ok(calibratedPuka.distributions.targets.mean>uncalibratedPuka.distributions.targets.mean+.25,'hot target usage must raise the simulated rest-of-game target distribution');
assert.ok(calibratedPuka.distributions.recYds.mean>uncalibratedPuka.distributions.recYds.mean+2,'hot receiving usage must raise the simulated final-yardage distribution');

// Clock and game script remain core inputs after wrapping: less time must reduce
// residual volume, and the trailing offense must become more pass-heavy.
const lateGame={...liveGame,period:4,clockMin:2,awayScore:10,homeScore:24,possession:'away',yardFromOwn:25,isRedZone:false};
const late=simulateGame({game,research,odds,liveGame:lateGame,config,iterations:4000,seed:91819});
const latePuka=late.players.find(p=>p.espnId==='wr-la');
assert.ok(latePuka.distributions.targets.mean-calibratedPuka.current.targets<calibratedPuka.distributions.targets.mean-calibratedPuka.current.targets,'late clock must reduce remaining player volume');
const latePurdy=late.players.find(p=>p.espnId==='qb-sf');
const lateStafford=late.players.find(p=>p.espnId==='qb-la');
assert.ok(latePurdy.distributions.attempts.mean-latePurdy.current.attempts>lateStafford.distributions.attempts.mean-lateStafford.current.attempts,'trailing offense must receive the more pass-heavy remaining-game script');

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

// Injured starters keep earned stats while eligible backups inherit future work.
const replacementResearch=structuredClone(research);
replacementResearch.players.push(
 {gameId:game.gameId,espnId:'qb2-la',name:'Backup QB',team:'LA',position:'QB',depthRank:2,currentSeason:{perGame:{attempts:5,completions:3,passYds:30,passTds:.1,carries:1,rushYds:3}}},
 {gameId:game.gameId,espnId:'rb2-la',name:'Backup RB',team:'LA',position:'RB',depthRank:2,currentSeason:{perGame:{carries:4,rushYds:16,rushTds:.1,targets:1,receptions:.7,recYds:5,recTds:.02}}},
 {gameId:game.gameId,espnId:'wr2-la',name:'Backup WR',team:'LA',position:'WR',depthRank:2,currentSeason:{perGame:{targets:3,receptions:2,recYds:20,recTds:.1}}},
 {gameId:game.gameId,espnId:'inactive-la',name:'Inactive RB',team:'LA',position:'RB',depthRank:3,active:false},
);
const injuryLive=structuredClone(liveGame);
injuryLive.playerStats.byId['qb-la'].active=false;
injuryLive.playerStats.byId['rb-la'].rosterStatus='Out';
injuryLive.playerStats.byId['wr-la'].injury={status:'Out'};
const savedResearch=JSON.stringify(replacementResearch),savedLive=JSON.stringify(injuryLive);
const injuryArgs={game,research:replacementResearch,odds,liveGame:injuryLive,config};
const injuryInputs=prepareLiveSimulationInputs(injuryArgs);
const {buildGameProfile}=await import('../sports/nfl/sim/profile.js');
const injuryProfile=buildGameProfile(injuryInputs);
const healthyProfile=buildGameProfile(prepareLiveSimulationInputs({...injuryArgs,liveGame}));
assert.equal(injuryProfile.homeTeam.qb.espnId,'qb2-la');
assert.ok(injuryProfile.homeTeam.qb.base.attempts>20,'backup QB inherits starting workload');
assert.equal(injuryProfile.homeTeam.qb.base.yardsPerAttempt,6,'backup keeps own efficiency');
assert.ok(Math.abs(injuryProfile.homeTeam.basePassRate-healthyProfile.homeTeam.basePassRate)<.08,'injuries do not collapse team rush or pass volume');
assert.ok(!injuryInputs.summary.replacements.adjustments.some(p=>p.playerId==='inactive-la'),'inactive teammate receives no redistributed work');
assert.equal(JSON.stringify(replacementResearch),savedResearch);
assert.equal(JSON.stringify(injuryLive),savedLive,'calibration never mutates source box scores');
assert.deepEqual(prepareLiveSimulationInputs(injuryArgs).summary.replacements,injuryInputs.summary.replacements,'refreshing raw inputs does not compound workload');
const healthySim=simulateGame({...injuryArgs,liveGame,iterations:2000,seed:8921});
const injurySim=simulateGame({...injuryArgs,iterations:2000,seed:8921,includeSamples:true});
for(const [id,key,current] of [['qb-la','passYds',231],['rb-la','rushYds',66],['wr-la','recYds',118]]){
 assert.ok([...injurySim._samples.players.get(id).stats[key]].every(v=>v===current),'unavailable starter is frozen in every world');
 const sample=injurySim._samples.players.get(id);
 for(const [stat,values] of Object.entries(sample.stats)){
  const earned=stat==='tds'?(sample.player.current.rushTds||0)+(sample.player.current.recTds||0):(sample.player.current[stat]||0);
  assert.ok([...values].every(v=>v===earned),`${id} keeps only current ${stat}`);
 }
}
for(const [id,key] of [['qb2-la','attempts'],['rb2-la','carries'],['wr2-la','targets']]){
 const a=injurySim.players.find(p=>p.espnId===id),b=healthySim.players.find(p=>p.espnId===id);
 assert.ok(a.distributions[key].mean>b.distributions[key].mean+1,`${id} future ${key} must materially increase`);
}
const samples=[...injurySim._samples.players.values()].filter(r=>r.player.team==='LA');
for(let i=0;i<injurySim.iterations;i++){
 const delta=k=>samples.reduce((sum,r)=>sum+r.stats[k][i]-(r.player.current[k]||0),0);
 assert.equal(delta('targets'),delta('attempts'),'replacement targets and QB attempts remain in the same world');
}
const returned=structuredClone(injuryLive);
returned.playerStats.byId['qb-la'].active=true;
returned.playerStats.byId['rb-la'].rosterStatus='Active';
returned.playerStats.byId['wr-la'].injury.status='Active';
assert.equal(prepareLiveSimulationInputs({...injuryArgs,liveGame:returned}).summary.replacements.adjustments.length,0,'return to action removes replacement boosts');
const noBackup={players:replacementResearch.players.filter(p=>p.team!=='LA'||p.espnId==='qb-la')};
const missing=buildGameProfile(prepareLiveSimulationInputs({...injuryArgs,research:noBackup}));
assert.equal(missing.homeTeam.qb,null,'missing eligible backup does not resurrect unavailable starter');
const changedAvailability=structuredClone(research);changedAvailability.players[0].active=false;
assert.notEqual(gameInputFingerprint({game,research,odds,liveGame,phase:'live'}),gameInputFingerprint({game,research:changedAvailability,odds,liveGame,phase:'live'}),'availability-only research changes trigger recalculation');
console.log('Live injury replacements, return to play, workload balance and same-world allocation passed');
const fallbackGame={...game,players:structuredClone(replacementResearch.players)};
const fallbackBefore=JSON.stringify(fallbackGame);
const fallbackInputs=prepareLiveSimulationInputs({...injuryArgs,game:fallbackGame,research:{players:[]}});
assert.equal(buildGameProfile(fallbackInputs).homeTeam.qb.espnId,'qb2-la','slate roster fallback also respects live injuries');
assert.equal(JSON.stringify(fallbackGame),fallbackBefore,'fallback roster is not mutated');
