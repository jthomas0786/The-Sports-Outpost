import fs from 'node:fs/promises';
import {simulateFullGame} from '../sports/nhl/full-game.js';
import {attachPriors} from '../sports/nhl/research.js';
const slate=JSON.parse(await fs.readFile('slates/nhl.json','utf8')),research=JSON.parse(await fs.readFile('slates/nhl-research.json','utf8'));
const games=slate.games.map(g=>{
 if(g.status==='in'&&(!g.summaryAt||Date.now()-g.summaryAt>120000||[g.away,g.home].some(t=>{const ps=g.players.filter(p=>p.team===t.abbr&&p.position!=='G');return t.shots==null||ps.length<10||ps.some(p=>p.current?.sog==null||p.current?.goals==null||p.current?.assists==null)||ps.reduce((s,p)=>s+p.current.sog,0)!==t.shots||ps.reduce((s,p)=>s+p.current.goals,0)!==t.score;})))return {gameId:g.id,ready:false,reason:'Complete current box score required'};
 if(g.status==='post')return {gameId:g.id,ready:false,reason:'Game completed'};
 const parts=String(g.clock||'20:00').split(':').map(Number),clockSeconds=parts[0]*60+(parts[1]||0);
 const result=simulateFullGame({players:attachPriors(g,research),status:g.status,period:g.status==='pre'?1:g.period,clockSeconds,seasonType:g.seasonType,lineupsConfirmed:g.lineupsConfirmed===true,currentScore:{[g.away.abbr]:g.away.score,[g.home.abbr]:g.home.score},seed:Number(g.id)});
 const {worlds,overtime,shootouts,...publicResult}=result;return {gameId:g.id,state:JSON.stringify({status:g.status,period:g.period,clock:g.clock,away:g.away.score,home:g.home.score,players:g.players.map(p=>[p.id,p.current])}),generatedAt:new Date().toISOString(),...publicResult};
});await fs.writeFile('slates/nhl-sim.json',JSON.stringify({generatedAt:new Date().toISOString(),games},null,2)+'\n');console.log(`NHL full-game simulations: ${games.filter(g=>g.ready).length} ready; remaining games await verified inputs`);
