import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeScoreboard,mergeSummary,threats} from '../sports/nhl/data.js';
import {simulateRegulation} from '../sports/nhl/sim.js';
import {simulateFullGame} from '../sports/nhl/full-game.js';
import {gradeForLean,gradeColor,gradeRingHTML,overProbability} from '../sports/nhl/grade.js';
const now=Date.now();
const event={id:'g',date:'2026-09-19T23:00Z',competitions:[{status:{type:{state:'in',shortDetail:'2nd'},period:2,displayClock:'10:00'},competitors:[{id:'1',homeAway:'away',score:'2',team:{abbreviation:'TOR',displayName:'Toronto'}},{id:'2',homeAway:'home',score:'1',team:{abbreviation:'MTL',displayName:'Montreal'},powerPlay:true}]}]};
const doc=normalizeScoreboard({events:[event]},now);assert.equal(doc.games[0].away.score,2);assert.equal(doc.date,'2026-09-19');
const goal={id:'goal',scoringPlay:true,type:{text:'Goal'},period:{number:2},participants:[{type:'assister',athlete:{id:'a',displayName:'Assistant'}},{type:'scorer',athlete:{id:'s',displayName:'Scorer'}}],team:{id:'1'},text:'Scorer goal, assisted by Assistant'};
const section={keys:['goals','assists','shotsTotal','blockedShots','shootoutGoals'],athletes:[{athlete:{id:'s',displayName:'Scorer',position:{abbreviation:'C'},active:true},stats:['2','1','5','2','1']}]};
const game=mergeSummary(doc.games[0],{plays:[goal,goal,{...goal,id:'so',period:{number:5,displayValue:'Shootout'}}],boxscore:{players:[{team:{abbreviation:'TOR'},statistics:[section]}]}},now);
assert.equal(game.goals.length,1);assert.equal(game.goals[0].scorer.name,'Scorer');assert.equal(game.players[0].current.sog,5);assert.equal(game.players[0].current.goals,2);assert.equal(game.players[0].current.points,3);
assert.equal(threats({games:[game]},now).length,3);assert.equal(threats({games:[game]},now+121000).length,0);assert.equal(threats({games:[{...game,status:'post'}]},now).length,0);
game.players[0].active=false;assert.equal(threats({games:[game]},now).length,1);
const players=['TOR','MTL'].flatMap(team=>[
 {id:team+'1',team,position:'C',current:{goals:1,assists:1,sog:4},prior:{sog:4,shootingPct:.12,assists:.6,blocks:.8}},
 {id:team+'2',team,position:'LW',prior:{sog:3,shootingPct:.10,assists:.5}},
 {id:team+'g',team,position:'G',confirmedStarter:true,current:{saves:10}},
]);
const live=simulateRegulation({players,status:'in',period:2,clockSeconds:600,seed:1});assert.equal(live.iterations,15000);assert.equal(live.remainingFraction,.5);
const intermission=simulateRegulation({players,status:'in',period:2,clockSeconds:0,seed:1});assert.equal(intermission.iterations,50000);
for(const row of live.worlds)for(const key of ['goals','assists','sog','saves'])assert.ok([...row.stats[key]].every(x=>x>=(row.player.current?.[key]||0)));
for(let w=0;w<live.iterations;w++){
 const offense=live.worlds.filter(r=>r.player.team==='TOR'&&r.player.position!=='G');const goalie=live.worlds.find(r=>r.player.id==='MTLg');
 const newShots=offense.reduce((s,r)=>s+r.stats.sog[w]-(r.player.current?.sog||0),0),newGoals=offense.reduce((s,r)=>s+r.stats.goals[w]-(r.player.current?.goals||0),0);
 assert.equal(goalie.stats.saves[w]-10,newShots-newGoals,'opposing goalie shares the same shooting worlds');
 for(const row of offense)assert.equal(row.stats.points[w],row.stats.goals[w]+row.stats.assists[w]);
}
assert.equal(simulateRegulation({players:[]}).ready,false);assert.equal(simulateRegulation({players,status:'in',period:4}).ready,false);
const injured=structuredClone(players);injured[0].active=false;const frozen=simulateRegulation({players:injured,iterations:100});assert.ok([...frozen.worlds[0].stats.sog].every(x=>x===4));
const full=simulateFullGame({players,status:'pre',seasonType:2,lineupsConfirmed:true,iterations:250,seed:9});assert.equal(full.ready,true);assert.ok(Array.isArray(full.players[0].metrics.sog.distribution));assert.ok(full.players[0].metrics.sog.distribution.length>0);
const dist={distribution:[[0,.2],[1,.3],[2,.5]],atLeastOne:.8};assert.equal(overProbability(dist,.5),.8);assert.equal(overProbability(dist,1.5),.5);assert.equal(overProbability(dist,null),null);
for(const [p,g] of [[.70,'A+'],[.65,'A'],[.61,'A-'],[.57,'B+'],[.54,'B'],[.51,'B-'],[.48,'C+'],[.47,'C']])assert.equal(gradeForLean(p),g);
assert.equal(gradeForLean(null),'—');assert.equal(gradeForLean(undefined),'—');
assert.equal(gradeColor('A+'),'#22c55e');assert.equal(gradeColor('B'),'#f4c430');assert.equal(gradeColor('C+'),'#ff9f43');
const ring=gradeRingHTML(.72,'A+','lg');assert.match(ring,/stroke-dasharray="326.7"/);assert.match(ring,/>A\+</);assert.match(ring,/>72%</);
const pendingRing=gradeRingHTML(null,'—','lg');assert.match(pendingRing,/>—</);assert.doesNotMatch(pendingRing,/>0%</);
const router=fs.readFileSync('sports/router.js','utf8'),view=fs.readFileSync('sports/nhl/view.js','utf8'),css=fs.readFileSync('sports/nhl/style.css','utf8'),gradeCss=fs.readFileSync('sports/nhl/grade.css','utf8'),mobile=fs.readFileSync('tests/nhl-mobile.html','utf8');
assert.ok(router.includes("setVisible(document.getElementById('nhlView'), active === 'nhl')"));
for(const marker of ["slate:'NHL Slate'","live:'NHL Live'","feed:'Goal Feed'","props:'Props'",'hk-matchup-slate','hk-live-scorebar','hk-feed-card','hk-prop-card','hk-prop-grade','gradeRingHTML'])assert.ok(view.includes(marker),`missing NHL/NFL layout parity marker: ${marker}`);
for(const marker of ['@media(max-width:900px)','@media(max-width:620px)','.hk-matchup-slate','.hk-live-grid','.hk-feed-card','.hk-prop-card'])assert.ok(css.includes(marker),`missing NHL responsive layout rule: ${marker}`);
for(const marker of ['.hk-grade-ring-lg','stroke:currentColor','width:76px','width:62px','.hk-prop-grade'])assert.ok(gradeCss.includes(marker),`missing NHL/NFL grade-ring parity rule: ${marker}`);
for(const marker of ['data-tab="slate"','data-tab="live"','data-tab="feed"','data-tab="props"','320','390','768'])assert.ok(mobile.includes(marker),`missing NHL mobile QA control: ${marker}`);
console.log('NHL: schedule, scorer IDs, shootout exclusion, box scores, stale/injury threats, 15K/50K worlds, NFL layout, grade thresholds and progress rings passed');
