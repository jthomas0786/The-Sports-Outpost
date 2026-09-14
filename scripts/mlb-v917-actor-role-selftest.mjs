import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __MLB_PLAYSTAGE_V901_TEST__ as core } from '../sports/mlb/playstage-v901.js';

const person=(id,fullName)=>({id,fullName});
const homeDefense={
  pitcher:person(101,'Home Pitcher'),catcher:person(102,'Home Catcher'),first:person(103,'Home First'),second:person(104,'Home Second'),
  shortstop:person(105,'Home Short'),third:person(106,'Home Third'),left:person(107,'Home Left'),center:person(108,'Home Center'),right:person(109,'Home Right')
};
const awayDefense={
  pitcher:person(301,'Away Pitcher'),catcher:person(302,'Away Catcher'),first:person(303,'Away First'),second:person(304,'Away Second'),
  shortstop:person(305,'Away Short'),third:person(306,'Away Third'),left:person(307,'Away Left'),center:person(308,'Away Center'),right:person(309,'Away Right')
};
const batter=person(201,'Away Batter'),runner1=person(202,'Away Runner One'),runner2=person(203,'Away Runner Two'),onDeck=person(204,'Away On Deck');
const posOrder=['P','C','1B','2B','SS','3B','LF','CF','RF'];
const mkDefensePlayers=(def)=>Object.fromEntries(Object.values(def).map((p,i)=>[`ID${p.id}`,{person:p,jerseyNumber:String(i+10),position:{abbreviation:posOrder[i]},seasonStats:{},stats:{}}]));
const mkOffensePlayers=()=>Object.fromEntries([batter,runner1,runner2,onDeck].map((p,i)=>[`ID${p.id}`,{person:p,jerseyNumber:String(i+1),position:{abbreviation:i===0?'RF':'OF'},seasonStats:{},stats:{}}]));

// Deliberately model an inning-transition race: the authoritative linescore has
// already flipped to Bottom 7 with the away team on defense, but currentPlay is
// still the just-completed Top 7 three-run homer by the away team.
const play={
  atBatIndex:44,
  matchup:{batter,pitcher:homeDefense.pitcher},
  result:{eventType:'home_run',event:'Home Run',description:'Away Batter homers. Away Runner One scores. Away Runner Two scores.'},
  about:{inning:7,isTopInning:true},count:{balls:0,strikes:0,outs:2},hitData:{launchSpeed:103.4,launchAngle:31,totalDistance:408},
  runners:[
    {movement:{start:'1B',end:'score',isOut:false},details:{runner:runner1,event:'Home Run'}},
    {movement:{start:'2B',end:'score',isOut:false},details:{runner:runner2,event:'Home Run'}},
    {movement:{start:null,end:'score',isOut:false},details:{runner:batter,event:'Home Run'}}
  ],playEvents:[]
};
const feed={
  gamePk:999917,
  gameData:{teams:{away:{id:1,abbreviation:'AWY',name:'Away'},home:{id:2,abbreviation:'HME',name:'Home'}},venue:{name:'Test Park'},status:{detailedState:'In Progress'}},
  liveData:{
    linescore:{inningHalf:'Bottom',isTopInning:false,currentInning:7,inningState:'Bottom',balls:0,strikes:0,outs:0,teams:{away:{runs:5,hits:8,errors:0},home:{runs:2,hits:5,errors:0}},defense:awayDefense,offense:{batter:person(401,'Home Batter')}},
    boxscore:{teams:{away:{players:{...mkDefensePlayers(awayDefense),...mkOffensePlayers()},battingOrder:[201,204]},home:{players:mkDefensePlayers(homeDefense),battingOrder:[]}}},
    plays:{currentPlay:play,allPlays:[play]}
  }
};

const state=core.currentState(feed,null);
assert.equal(state.off,'away','play offense must come from currentPlay, not a flipped linescore');
assert.equal(state.def,'home','play defense must remain the opponent of play offense');
assert.equal(state.sameHalf,false,'transition race must be detected');
assert.equal(state.defenders.length,9,'there must always be exactly nine defensive actors');
assert.deepEqual(state.defenders.map(p=>p.pos),posOrder,'all nine defensive positions must remain present');
assert.deepEqual(state.defenders.map(p=>p.id),Object.values(homeDefense).map(p=>p.id),'transition render must use the play defensive team, not the newly flipped live defense');
assert.equal(state.batter.id,201,'the home-run batter must remain the offensive batter');
assert.equal(state.runners.length,0,'flipped live offense runners must never leak into the previous play state');
assert.equal(core.playerImg('slot-home-2B'),'./images/player-placeholder.png','placeholder defenders must not make invalid MLB image requests');

const src=fs.readFileSync(new URL('../sports/mlb/playstage-v901.js',import.meta.url),'utf8');
const concept=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v917.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const marker of ['data-actor-kind','data-actor-key','function defenderActor','function runnerActor','function batterActor','function baseRoute','function restoreDefense']) assert.ok(src.includes(marker),`missing strict actor marker ${marker}`);
assert.ok(src.includes("actorKind==='runner'?'RUN'"),'offensive runner labels must say RUN, never 1B/2B/3B');
assert.ok(src.includes("el.dataset.actorKind==='defender'"),'runner engine must reject defensive actors');
assert.ok(src.includes("defenderActor(root,receiver.pos,receiver.id)"),'throw receivers must be selected from defense only');
assert.ok(src.includes('finally{await restoreDefense(root,s,240);}'),'all plays must restore all nine defensive positions');
assert.ok(concept.includes('data-actor-kind="runner"'),'v917 must style offense by explicit actor kind');
assert.ok(concept.includes('background:linear-gradient(90deg,var(--c2) 0 10%,var(--c1) 10% 90%,var(--c2) 90%)'),'v917 jerseys must visibly use team colors');
assert.ok(router.includes("./mlb/playstage-v901.js?v=90.45"),'router must cache-bust strict-role MLB PlayStage');
assert.ok(router.includes("./mlb/playstage-concept-v917.js?v=91.72"),'router must load v917 visual layer');
assert.ok(router.includes('installMlbPlaystageConceptV917'),'router must install v917 visual layer');
assert.ok(index.includes('./sports/router.js?v=90.47'),'index must cache-bust v917 router');
console.log('MLB v917 actor-role regression: 9 defenders locked; only batter + true runners may run bases');
