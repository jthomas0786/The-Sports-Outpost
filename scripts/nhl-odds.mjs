import fs from 'node:fs/promises';
import {MARKET_MAP,BOOKS,normalizeOdds} from '../sports/nhl/odds.js';
const key=process.env.PARLAY_API_KEY;if(!key)throw new Error('PARLAY_API_KEY unavailable');
const slate=JSON.parse(await fs.readFile('slates/nhl.json','utf8'));const now=Date.now();let old=null;try{old=JSON.parse(await fs.readFile('slates/nhl-odds.json','utf8'));}catch{}
const upcoming=slate.games.filter(g=>g.status==='pre'&&Date.parse(g.startTime)>now);
const next=Math.min(...upcoming.map(g=>Date.parse(g.startTime)));
const interval=next-now<10800000?1800000:14400000;
if(old&&now-Date.parse(old.generatedAt)<interval){console.log('NHL odds refresh not due');process.exit(0);}
async function get(path){const r=await fetch('https://parlay-api.com/v1/sports/icehockey_nhl/'+path,{headers:{'X-API-Key':key},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`ParlayAPI HTTP ${r.status}`);return r.json();}
const events=await get('events');const relevant=(Array.isArray(events)?events:[]).some(e=>upcoming.some(g=>Math.abs(Date.parse(g.startTime)-Date.parse(e.commence_time))<=1800000));
let rows=[];if(relevant&&next-now<86400000){rows=await get('props?'+new URLSearchParams({markets:Object.keys(MARKET_MAP).join(','),bookmakers:BOOKS.join(','),maxAgeSec:'3600',limit:'10000'}));if(!Array.isArray(rows))throw new Error('Unexpected props response');}
const output=normalizeOdds(rows,slate,now);output.status=relevant?'waiting-for-markets':'no-listed-events';if(output.quotes.length)output.status='available';
await fs.writeFile('slates/nhl-odds.json',JSON.stringify(output,null,2)+'\n');console.log(`NHL odds: ${output.quotes.length} matched sportsbook quotes; ${output.status}`);
