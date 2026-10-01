import assert from 'node:assert/strict';
import {clockSeconds,goaliePulled,classifyPuckLineGame,buildPuckLineJesusModel} from '../sports/nhl/puck-line-jesus.js';
import {gradePljCandidate,gradePuckLineDog} from '../sports/nhl/plj-candidate-v927.js';
import {preserveTrackedPuckLines} from '../sports/nhl/plj-line-lock-v929.js';

const line={gameId:'g1',puckLine:{favoriteAbbr:'EDM',favoriteTeam:'Edmonton Oilers',line:-1.5,price:125,book:'FanDuel',underdogAbbr:'CGY',underdogTeam:'Calgary Flames',underdogLine:1.5,underdogPrice:-135,underdogBook:'BetMGM',sportsbookCount:5}};
const base={id:'g1',startTime:'2026-09-29T23:00:00Z',away:{id:'1',abbr:'EDM',name:'Edmonton Oilers',score:3},home:{id:'2',abbr:'CGY',name:'Calgary Flames',score:2},status:'in',period:3,clock:'1:41',players:[{id:'edmg',team:'EDM',position:'G'},{id:'cgyg',team:'CGY',position:'G'},{id:'c1',team:'CGY',position:'C'},{id:'c2',team:'CGY',position:'C'},{id:'c3',team:'CGY',position:'LW'},{id:'c4',team:'CGY',position:'RW'},{id:'c5',team:'CGY',position:'D'},{id:'c6',team:'CGY',position:'D'}],onIce:[{teamId:'1',entries:[{athleteid:'edmg',whereabouts:{id:'1'}}]},{teamId:'2',entries:['c1','c2','c3','c4','c5','c6'].map(athleteid=>({athleteid,whereabouts:{id:'1'}}))}],goals:[]};
assert.equal(clockSeconds('5:00'),300);
assert.equal(clockSeconds('1:41'),101);
assert.equal(goaliePulled(base,base.home),true,'six skaters and no goalie must be a verified pulled-goalie state');
assert.equal(goaliePulled({...base,onIce:[]},base.home),false,'missing on-ice evidence must never be guessed as goalie pulled');
assert.equal(classifyPuckLineGame(base,line).code,'PLJ_LIVE');
assert.equal(classifyPuckLineGame({...base,clock:'7:12'},line).code,'ONE_GOAL_SWEAT');
assert.equal(classifyPuckLineGame({...base,away:{...base.away,score:4},clock:'2:11'},line).code,'BACKDOOR_DANGER');

const aCandidate=gradePljCandidate({puckLine:{favoriteAbbr:'TOR',line:-1.5,price:190,underdogPrice:-180,sportsbookCount:8}});
const bCandidate=gradePljCandidate({puckLine:{favoriteAbbr:'VGK',line:-1.5,price:110,underdogPrice:-120,sportsbookCount:5}});
const cCandidate=gradePljCandidate({puckLine:{favoriteAbbr:'EDM',line:-1.5,price:-160,underdogPrice:140,sportsbookCount:8}});
assert.equal(aCandidate.grade,'A','balanced plus-money -1.5 with tight +1.5 pricing and broad books should grade A');
assert.equal(bCandidate.grade,'B','moderate close-game market shape should grade B');
assert.equal(cCandidate.grade,'C','heavily juiced -1.5 should not be promoted as a PLJ setup');
const strongDogCover=gradePuckLineDog({puckLine:{favoriteAbbr:'BUF',line:-1.5,price:231,underdogAbbr:'CBJ',underdogLine:1.5,underdogPrice:-250,underdogBook:'bet365',sportsbookCount:6}});
const weakDogCover=gradePuckLineDog({puckLine:{favoriteAbbr:'EDM',line:-1.5,price:115,underdogAbbr:'VAN',underdogLine:1.5,underdogPrice:-126,underdogBook:'Pinnacle',sportsbookCount:7}});
assert.equal(strongDogCover.grade,'A+','strong +1.5 market resistance should receive the top dog-cover grade');
assert.equal(weakDogCover.grade,'D','near-balanced +1.5 pricing should receive a low dog-cover grade');
assert.ok(strongDogCover.coverProbability>weakDogCover.coverProbability,'dog-cover grade must order stronger market-implied cover chances above weaker ones');
const pregame={...base,status:'pre',period:0,clock:'',away:{...base.away,score:0},home:{...base.home,score:0},goals:[],onIce:[]};
assert.equal(classifyPuckLineGame(pregame,{...line,puckLine:{...line.puckLine,price:190,underdogPrice:-180,sportsbookCount:8}}).candidate.grade,'A');
assert.equal(classifyPuckLineGame(pregame,line).dogCover.dogAbbr,'CGY','classified pregame games must carry the +1.5 dog-cover grade');

const cashGoal={period:3,clock:'0:28',team:'EDM',awayScore:4,homeScore:2,text:'Connor McDavid scores an empty-net goal',strength:'Empty Net'};
const liveEmptyNetCash={...base,away:{...base.away,score:4},home:{...base.home,score:2},clock:'0:28',goals:[cashGoal]};
assert.equal(classifyPuckLineGame(liveEmptyNetCash,line).code,'PLJ_CASHED','empty-net cover must cash before the final horn');
const liveModel=buildPuckLineJesusModel({date:'2026-09-29',games:[liveEmptyNetCash]},{games:[line]});
assert.equal(liveModel.cashes[0]?.code,'PLJ_CASHED','live cash must surface in Jesus Cashes Today immediately');

const emptyNetCash={...liveEmptyNetCash,status:'post',clock:'0:00'};
assert.equal(classifyPuckLineGame(emptyNetCash,line).code,'PLJ_CASHED');
const lateCash={...emptyNetCash,goals:[{period:3,clock:'0:28',team:'EDM',awayScore:4,homeScore:2,text:'Connor McDavid scores',strength:'Even Strength'}]};
assert.equal(classifyPuckLineGame(lateCash,line).code,'LATE_CASH');
const liveBackdoor={...base,away:{...base.away,score:4},home:{...base.home,score:3},clock:'0:44',goals:[{period:3,clock:'0:44',team:'CGY',awayScore:4,homeScore:3,text:'Calgary scores'}]};
assert.equal(classifyPuckLineGame(liveBackdoor,line).code,'BACKDOORED','late cover loss must fire before the final horn');
const backdoor={...liveBackdoor,status:'post',clock:'0:00'};
assert.equal(classifyPuckLineGame(backdoor,line).code,'BACKDOORED');
const model=buildPuckLineJesusModel({date:'2026-09-29',games:[emptyNetCash,backdoor]},{games:[line,{...line,gameId:'g1'}]});
assert.ok(model.tracked.length>=1);

const torGame={id:'tor',slateDate:'2026-09-29',status:'in',period:3,clock:'3:40',away:{id:'mtl',abbr:'MTL',name:'Montreal Canadiens',score:3},home:{id:'tor-team',abbr:'TOR',name:'Toronto Maple Leafs',score:2},players:[],onIce:[],goals:[]};
const rawLiveLines={date:'2026-09-29',games:[{gameId:'tor',awayAbbr:'MTL',homeAbbr:'TOR',puckLine:null}]};
const history={games:[{gameId:'tor',startTime:'2026-09-29T23:00:00Z',away:{abbr:'MTL',name:'Montreal Canadiens'},home:{abbr:'TOR',name:'Toronto Maple Leafs'},favoriteAbbr:'TOR',favoriteTeam:'Toronto Maple Leafs',line:-1.5,initialPrice:225,initialBook:'BetRivers',latestPrice:220,latestBook:'bet365',sportsbookCount:5}]};
const locked=preserveTrackedPuckLines(rawLiveLines,history);
assert.equal(locked.games[0].puckLine.favoriteAbbr,'TOR','pregame favorite must survive when the live sportsbook feed drops the line');
assert.equal(locked.games[0].puckLine.lockedFromHistory,true);
const torModel=buildPuckLineJesusModel({date:'2026-09-29',games:[torGame]},locked);
assert.equal(torModel.tracked.length,1,'tracked game must stay on PLJ board after line disappears');
assert.equal(torModel.tracked[0].code,'NEEDS_RALLY','trailing tracked favorite should be visible as NEEDS RALLY, not PLJ LIVE');
assert.equal(torModel.liveTracked.length,1,'live tracked section must retain non-opportunity games');

console.log('✓ Puck Line Jesus classification regression passed');
console.log('  ✓ pulled-goalie state requires live on-ice evidence');
console.log('  ✓ PLJ pregame candidate A/B/C grading uses market shape without inventing probability');
console.log('  ✓ +1.5 underdogs receive ranked no-vig market cover grades without claiming simulation probability');
console.log('  ✓ PLJ live / immediate empty-net cash / late cash / immediate backdoor states classify correctly');
console.log('  ✓ tracked pregame -1.5 survives live-market disappearance and remains visible as NEEDS RALLY');
