import assert from 'node:assert/strict';
import {updatePljHistory} from './nhl-plj-history-lib.mjs';

const game=(status='pre',score=[0,0])=>({id:'g1',slateDate:'2026-09-29',startTime:'2026-09-29T21:00:00Z',status,period:status==='pre'?0:3,clock:status==='pre'?'':'1:12',away:{abbr:'FLA',name:'Florida',score:score[0]},home:{abbr:'CAR',name:'Carolina',score:score[1]}});
const line={puckLine:{favoriteAbbr:'CAR',favoriteTeam:'Carolina',line:-1.5,price:200,book:'Book A',sportsbookCount:8}};
const wrap=(code,g,extra={})=>({date:'2026-09-29',season:'2026-27',tracked:[{code,game:g,line,margin:(g.home.score||0)-(g.away.score||0),goaliePulled:code==='PLJ_LIVE',swing:extra.swing||{cash:null,backdoor:null}}]});

let h=updatePljHistory({},wrap('UPCOMING',game()),new Date('2026-09-29T12:00:00Z'));
assert.equal(h.games.length,1);assert.equal(h.games[0].initialPrice,200);assert.equal(h.games[0].transitions.length,1);
line.puckLine.price=185;line.puckLine.book='Book B';
h=updatePljHistory(h,wrap('PLJ_WATCH',game('in',[2,3])),new Date('2026-09-29T23:10:00Z'));
assert.equal(h.games[0].initialPrice,200);assert.equal(h.games[0].latestPrice,185);assert.equal(h.games[0].sawPljWatch,true);
h=updatePljHistory(h,wrap('PLJ_LIVE',game('in',[2,3])),new Date('2026-09-29T23:11:00Z'));
assert.equal(h.games[0].sawPljLive,true);
const cash={period:3,clock:'0:31',team:'CAR',text:'Empty-net goal',strength:'EN',awayScore:2,homeScore:4,emptyNet:true};
h=updatePljHistory(h,wrap('PLJ_CASHED',game('post',[2,4]),{swing:{cash,backdoor:null}}),new Date('2026-09-29T23:15:00Z'));
assert.equal(h.games[0].pljCash,true);assert.equal(h.games[0].outcome,'PLJ_CASHED');assert.equal(h.games[0].decisiveGoal.emptyNet,true);assert.equal(h.summary.pljCashes,1);assert.equal(h.summary.covered,1);
console.log('✓ Puck Line Jesus history persistence scenarios passed');
