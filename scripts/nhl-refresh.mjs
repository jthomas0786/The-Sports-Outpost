import {applyLineups,rosterURL} from '../sports/nhl/lineups.js';
import fs from 'node:fs/promises';
import {API,getJSON,loadScoreboard,mergeSummary,athlete,dedupeSlatePlayers} from '../sports/nhl/data.js';
const flag=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const out=flag('--out')||'slates/nhl.json';
const doc=await loadScoreboard(flag('--date'));
const rosters=new Map();
for(const game of doc.games){
 if(['in','post'].includes(game.status)){
  try{Object.assign(game,mergeSummary(game,await getJSON(`${API}/summary?event=${game.id}`)));}catch{game.summaryUnavailable=true;}
 }else{
  for(const team of [game.away,game.home]){
   if(!rosters.has(team.id)){
    try{const r=await getJSON(`${API}/teams/${team.id}/roster`);rosters.set(team.id,(r.athletes||[]).flatMap(g=>g.items||[]));}catch{rosters.set(team.id,[]);}
   }
   game.players.push(...rosters.get(team.id).map(p=>athlete(p,team.abbr,game.id)));
  }
 }
 const evidence={};
 if(game.status!=='pre'||Date.parse(game.startTime)-Date.now()<10800000){
  await Promise.all([game.away,game.home].map(async t=>{try{evidence[t.id]=await getJSON(rosterURL(game,t));}catch{}}));
 }
 Object.assign(game,applyLineups(game,evidence));
}
dedupeSlatePlayers(doc.games);
await fs.mkdir(out.split('/').slice(0,-1).join('/')||'.',{recursive:true});
await fs.writeFile(out,JSON.stringify(doc,null,2)+'\n');
console.log(`NHL ${doc.date}: ${doc.games.length} games, ${doc.games.reduce((n,g)=>n+g.players.length,0)} player entries, ${doc.games.reduce((n,g)=>n+g.players.filter(p=>p.propsEligible!==false).length,0)} Props-eligible`);
