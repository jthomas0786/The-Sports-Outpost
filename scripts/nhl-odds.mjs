import fs from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {MARKET_MAP,BOOKS,normalizeOdds} from '../sports/nhl/odds.js';
import {nextFutureStartMs,refreshState} from './parlayapi-pregame-cadence.mjs';
const key=process.env.PARLAY_API_KEY;if(!key)throw new Error('PARLAY_API_KEY unavailable');
const now=Date.now(),force=process.env.NHL_ODDS_FORCE==='1'||process.argv.includes('--force');
const slate=JSON.parse(await fs.readFile('slates/nhl.json','utf8'));let old=null;try{old=JSON.parse(await fs.readFile('slates/nhl-odds.json','utf8'));}catch{}
const upcoming=slate.games.filter(g=>g.status==='pre'&&Date.parse(g.startTime)>now);
const next=nextFutureStartMs(upcoming.map(g=>g.startTime),now);
const gate=refreshState({lastFetchedAt:old?.meta?.fetchedAt||old?.generatedAt,nextStartMs:next,nowMs:now,force});
if(!gate.due){console.log(`NHL ParlayAPI props not due; threshold=${Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60000):'n/a'}m next=${gate.hoursToNextStart==null?'none':gate.hoursToNextStart.toFixed(2)+'h'}`);process.exit(0);}
function transient(status,text=''){return status===503||/props_temporarily_busy|temporarily busy|board is being rebuilt/i.test(text);}
async function get(path,{attempts=path.startsWith('props?')?4:2}={}){
  let last=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const r=await fetch('https://parlay-api.com/v1/sports/icehockey_nhl/'+path,{headers:{'X-API-Key':key},signal:AbortSignal.timeout(30000)});
      const text=await r.text();
      if(r.ok)return text?JSON.parse(text):null;
      last=new Error(`ParlayAPI HTTP ${r.status}: ${text.slice(0,300)}`);
      if(!transient(r.status,text)||attempt===attempts)throw last;
      console.warn(`NHL ParlayAPI temporarily busy; retrying props board (${attempt}/${attempts})...`);
    }catch(error){
      last=error;
      if(attempt===attempts||!/props_temporarily_busy|temporarily busy|board is being rebuilt|HTTP 503/i.test(String(error?.message||error)))throw error;
    }
    await sleep(attempt*1500);
  }
  throw last||new Error('ParlayAPI request failed');
}
const events=await get('events');const relevant=(Array.isArray(events)?events:[]).some(e=>upcoming.some(g=>Math.abs(Date.parse(g.startTime)-Date.parse(e.commence_time))<=1800000));
let rows=[];if(relevant&&next!=null){rows=await get('props?'+new URLSearchParams({markets:Object.keys(MARKET_MAP).join(','),bookmakers:BOOKS.join(','),maxAgeSec:'3600',limit:'10000',includeLinks:'true',includeSids:'true'}));if(!Array.isArray(rows))throw new Error('Unexpected props response');}
const output=normalizeOdds(rows,slate,now);output.status=relevant?'waiting-for-markets':'no-listed-events';if(output.quotes.length)output.status='available';
output.meta={...(output.meta||{}),refreshThresholdMinutes:Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60000):null,hoursToNextStart:gate.hoursToNextStart,nativeMetadataRequested:{includeLinks:true,includeSids:true}};
await fs.writeFile('slates/nhl-odds.json',JSON.stringify(output,null,2)+'\n');console.log(`NHL odds: ${output.quotes.length} matched sportsbook quotes; ${output.status}; links=${output.meta.nativeLinkRows||0}; sids=${output.meta.nativeSidRows||0}`);
