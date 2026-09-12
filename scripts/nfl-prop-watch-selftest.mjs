import assert from 'node:assert/strict';
import {buildNflCommandCenter,renderNflCommandCenter} from '../sports/nfl/command-center.js';
import {remainingGameText} from '../sports/nfl/prop-watch.js';
export function fixture(){
 const now=Date.parse('2026-09-13T18:30:00Z');
 const player={espnId:'1',gameId:'g',name:'Test Receiver With A Long Name',team:'NE',position:'WR'};
 const live={status:'in',period:3,clockMin:8,awayAbbr:'NE',homeAbbr:'SEA',awayScore:14,homeScore:10,lastFetchedAt:now,possession:'away',yardFromOwn:85,playerStats:{byId:{'1':{...player,flat:{recYds:48,targets:7,receptions:4}}}}};
 const p={...player,current:{recYds:48,targets:7,receptions:4},distributions:{recYds:{mean:65,median:63,p10:48,p25:52,p75:80,p90:90}},sportsbook:{over:{recYds:{line:50.5,probability:.72}},under:{recYds:{line:50.5,probability:.28}}}};
 return {now,liveDoc:{games:{g:live}},research:{players:[player]},odds:{games:[{gameId:'g',players:[{...player,odds:{recYds:{line:50.5,over:{best:{price:-110,ts:now}},under:{best:{price:-110,ts:now}}}}}]}]},sim:{games:[{game:{gameId:'g',away:{abbr:'NE'},home:{abbr:'SEA'},currentScore:{away:14,home:10}},generatedAt:new Date(now).toISOString(),iterations:15000,liveModel:{active:true,period:3,clockMin:8,possession:'away'},players:[p]}]}};
}
const watch=f=>buildNflCommandCenter(f).alerts.find(a=>a.type==='Prop watch');
let f=fixture();const original=JSON.stringify(f);
assert.equal(watch(f).model.tsoProbability,.72);assert.equal(watch(f).model.edgeBasis,'fair-market');assert.equal(watch(f).model.iterations,15000);
assert.match(renderNflCommandCenter(buildNflCommandCenter(f)),/15,000 sims/);assert.equal(JSON.stringify(f),original);
for(const change of [x=>x.sim.games[0].generatedAt=new Date(x.now-361000).toISOString(),x=>x.sim.games[0].liveModel.active=false,x=>x.liveDoc.games.g.period=4,x=>x.liveDoc.games.g.homeScore=17,x=>x.liveDoc.games.g.playerStats.byId['1'].flat.targets++,x=>x.liveDoc.games.g.possession='home']){
 f=fixture();change(f);assert.ok(watch(f));assert.equal(watch(f).model,null);
}
f=fixture();f.odds.games[0].players[0].odds.recYds.line=51;assert.equal(watch(f).model.probabilityMethod,'distribution');assert.match(watch(f).detail,/4 more/);
f=fixture();f.odds.games[0].players[0].odds.recYds.under.best.ts=f.now-700000;assert.equal(watch(f).model.edgeBasis,'implied');
f=fixture();f.sim.games[0].players[0].sportsbook.over.recYds.probability=.3;assert.ok(watch(f).model.edgePoints<0);
f=fixture();f.sim.games[0].iterations=50000;Object.assign(f.sim.games[0].liveModel,{period:2,clockMin:0});Object.assign(f.liveDoc.games.g,{period:2,clockMin:0});assert.match(renderNflCommandCenter(buildNflCommandCenter(f)),/50,000 sims/);
assert.equal(remainingGameText({period:3,clockMin:8}),'23:00 left in regulation');assert.equal(remainingGameText({period:5,clockMin:8}),'Overtime');
for(const change of [x=>x.research.players[0].injury={status:'Out'},x=>x.liveDoc.games.g.status='post',x=>x.odds.games[0].players[0].odds.recYds.over.best.ts=x.now-700000]){f=fixture();change(f);assert.equal(watch(f),undefined);}
console.log('Prop Watches: exact/fallback odds, signed edge, stale-state gates, 15K/50K, injury, final and integer-line scenarios passed');
