import fs from 'node:fs/promises';
import {getJSON} from '../sports/nhl/data.js';
import {seasonPrior} from '../sports/nhl/research.js';
const slate=JSON.parse(await fs.readFile('slates/nhl.json','utf8'));
// Use the last completed season; never interpret a future season as observed data.
const season=Number(slate.season.slice(0,4));if(!Number.isInteger(season)||season<2020)throw new Error('Unknown NHL season');
let cache={players:{},checked:{}};try{cache=JSON.parse(await fs.readFile('slates/nhl-research.json','utf8'));}catch{}
if(cache.season!==season)cache={players:{},checked:{}};cache.checked??={};
const ids=[...new Set(slate.games.flatMap(g=>g.players.map(p=>p.id)))];let index=0,failures=0;
await Promise.all(Array.from({length:6},async()=>{while(index<ids.length){const id=ids[index++];if(Date.now()-(cache.checked[id]||0)<86400000)continue;
 try{const doc=await getJSON(`https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/seasons/${season}/types/2/athletes/${id}/statistics`);const p=seasonPrior(doc,season);if(p)cache.players[id]=p;cache.checked[id]=Date.now();}
 catch(e){if(/404/.test(e.message))cache.checked[id]=Date.now();else failures++;}
}}));
cache.season=season;cache.generatedAt=new Date().toISOString();
await fs.writeFile('slates/nhl-research.json',JSON.stringify(cache,null,2)+'\n');
console.log(`NHL season ${season}: ${Object.keys(cache.players).length} verified player histories; ${failures} temporary fetch failures`);
