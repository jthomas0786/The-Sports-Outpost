import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {seasonPrior} from '../sports/nhl/research.js';
import {normalizeOdds,quoteFor} from '../sports/nhl/odds.js';
import {simulateFullGame} from '../sports/nhl/full-game.js';
const now=Date.now();const prior=seasonPrior({splits:{categories:[{stats:[['games',20],['goals',5],['shotsTotal',60],['shootoutGoals',2],['assists',10]].map(([name,value])=>({name,value}))}]}},2026,now);
assert.equal(prior.rates.sog,3);assert.equal(prior.rates.goals,.25);assert.equal(prior.rates.points,.75);assert.equal(seasonPrior({},2026),null);
const slate={games:[{id:'g',startTime:new Date(now+3600000).toISOString(),away:{name:'Toronto Maple Leafs'},home:{name:'Montreal Canadiens'},players:[{id:'p',name:'Test Player'}]}]};
const row={player:'Test Player',market_key:'player_shots_on_goal',line:2.5,over_price:-110,under_price:-110,bookmaker:'draftkings',away_team:'Toronto Maple Leafs',home_team:'Montreal Canadiens',commence_time:slate.games[0].startTime,last_update:now};
const odds=normalizeOdds([row],slate,now);assert.equal(odds.quotes.length,1);assert.equal(quoteFor(odds,'g','p','sog',now+3600001),null);
for(const change of [{bookmaker:'prizepicks'},{last_update:now-3600001},{home_team:'Other Team'},{player:'Other Player'},{commence_time:new Date(now+86400000).toISOString()},{over_price:0,under_price:null}])assert.equal(normalizeOdds([{...row,...change}],slate,now).quotes.length,0);
const players=['A','B'].flatMap(team=>[{id:team,team,position:'C',prior:{sog:5,shootingPct:.2,assists:.5},current:{goals:1,sog:4}},{id:team+'2',team,position:'LW',prior:{sog:3,shootingPct:.15,assists:.5}},{id:team+'G',team,position:'G',confirmedStarter:true,current:{saves:10}}]);
const args={players,status:'in',period:4,clockSeconds:300,currentScore:{A:1,B:1},seasonType:2,iterations:1000,seed:12};
const result=simulateFullGame(args);assert.equal(result.ready,true);assert.equal(result.scope,'full-game-excluding-shootout');assert.ok([...result.shootouts].some(Boolean));
for(let w=0;w<1000;w++){
 const goals=result.worlds.reduce((s,r)=>s+r.stats.goals[w]-(r.player.current?.goals||0),0);assert.ok(goals===0||goals===1);if(result.shootouts[w])assert.equal(goals,0);
 for(const team of ['A','B']){const offense=result.worlds.filter(r=>r.player.team===team&&r.player.position!=='G'),goalie=result.worlds.find(r=>r.player.position==='G'&&r.player.team!==team);assert.equal(goalie.stats.saves[w]-10,offense.reduce((s,r)=>s+r.stats.sog[w]-(r.player.current?.sog||0)-r.stats.goals[w]+(r.player.current?.goals||0),0));}
}
const playoffs=simulateFullGame({...args,seasonType:3,clockSeconds:1200});assert.ok([...playoffs.shootouts].every(x=>x===0));assert.ok(playoffs.worlds[0].stats.goals.every((v,w)=>playoffs.worlds.reduce((s,r)=>s+r.stats.goals[w]-(r.player.current?.goals||0),0)===1));
assert.equal(simulateFullGame({...args,seasonType:1}).ready,false);assert.equal(simulateFullGame({...args,players:players.map(p=>({...p,confirmedStarter:false}))}).ready,false);
const html=fs.readFileSync('index.html','utf8');for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(m[2].trim()&&!/type="module"|application\/ld\+json/.test(m[1]))new vm.Script(m[2]);
assert.ok(!fs.readFileSync('sports/nhl/view.js','utf8').includes('<nav class="hk-tabs"'));
assert.ok(html.includes("propTabsEl.innerHTML = '';"));assert.ok(html.includes('window.DW_selectTab = selectTab'));
console.log('NHL v90.1: verified field mapping, exact game/player odds, stale quotes, sudden-death OT, shootout exclusion, playoff continuation, goalie correlation and sidebar-only navigation passed');
