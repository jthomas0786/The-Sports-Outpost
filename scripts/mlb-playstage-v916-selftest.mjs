import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __MLB_PLAYSTAGE_V901_TEST__ as core } from '../sports/mlb/playstage-v901.js';

const person=(id,fullName)=>({id,fullName});
const defense={
  pitcher:person(101,'Pitcher One'),catcher:person(102,'Catcher Two'),first:person(103,'First Three'),second:person(104,'Second Four'),
  shortstop:person(105,'Short Five'),third:person(106,'Third Six'),left:person(107,'Left Seven'),center:person(108,'Center Eight'),right:person(109,'Right Nine')
};
const awayPlayers=[person(201,'Batter Away'),person(202,'Runner First'),person(203,'Runner Third'),person(204,'On Deck Away')];
const homePlayers=Object.values(defense);
const mkPlayers=(players)=>Object.fromEntries(players.map((p,i)=>[`ID${p.id}`,{person:p,jerseyNumber:String(i+1),position:{abbreviation:i===0?'P':'OF'},seasonStats:{},stats:{}}]));
const feed={
  gamePk:999999,
  gameData:{
    teams:{away:{id:1,abbreviation:'AWY',name:'Away'},home:{id:2,abbreviation:'HME',name:'Home'}},
    venue:{name:'Test Ballpark'},status:{detailedState:'In Progress'}
  },
  liveData:{
    linescore:{
      inningHalf:'Top',isTopInning:true,currentInning:5,inningState:'Top',balls:1,strikes:1,outs:1,
      teams:{away:{runs:2,hits:5,errors:0},home:{runs:1,hits:4,errors:0}},
      defense,
      offense:{batter:awayPlayers[0],onDeck:awayPlayers[3],first:awayPlayers[1],third:awayPlayers[2]}
    },
    boxscore:{teams:{
      away:{players:mkPlayers(awayPlayers),battingOrder:awayPlayers.map(p=>p.id)},
      home:{players:mkPlayers(homePlayers),battingOrder:[]}
    }},
    plays:{currentPlay:{
      atBatIndex:12,
      matchup:{batter:awayPlayers[0],pitcher:defense.pitcher},
      result:{eventType:'single',event:'Single',description:'Batter Away singles to center field.'},
      count:{balls:1,strikes:1,outs:1},about:{inning:5,isTopInning:true},playEvents:[],runners:[]
    },allPlays:[]}
  }
};

const state=core.currentState(feed,null);
assert.equal(state.defenders.length,9,'must expose exactly nine current defenders');
assert.deepEqual(state.defenders.map(p=>p.pos),['P','C','1B','2B','SS','3B','LF','CF','RF'],'must preserve the live defensive alignment');
assert.equal(state.batter.id,201,'must expose current batter');
assert.deepEqual(state.runners.map(r=>r.base),['first','third'],'must expose only occupied bases');
assert.deepEqual(state.runners.map(r=>r.id),[202,203],'must expose the actual base runners');

const coreSrc=fs.readFileSync(new URL('../sports/mlb/playstage-v901.js',import.meta.url),'utf8');
const conceptSrc=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v916.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(coreSrc.includes("linescore?.defense"),'v901 must prefer live linescore defense');
assert(coreSrc.includes('ps-actor-label'),'v901 must render actor labels');
assert(coreSrc.includes('data-player-name'),'v901 must expose actor names to v916');
assert(conceptSrc.includes('opacity:.97!important'),'v916 must keep idle field actors visible');
assert(conceptSrc.includes('@media(max-width:720px)'),'v916 must include phone actor sizing');
assert(router.includes("playstage-concept-v916.js?v=91.60"),'router must load v916');
assert(router.includes('installMlbPlaystageConceptV916'),'router must install v916');
assert(index.includes('./sports/router.js?v=90.43'),'index must cache-bust the v916 router');
console.log('MLB PlayStage v916 selftest: 9 defenders + batter + occupied runners OK');
