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
if(!gate.due){console.log(`NHL ParlayAPI markets not due; threshold=${Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60000):'n/a'}m next=${gate.hoursToNextStart==null?'none':gate.hoursToNextStart.toFixed(2)+'h'}`);process.exit(0);}
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
   console.warn(`NHL ParlayAPI temporarily busy; retrying (${attempt}/${attempts})...`);
  }catch(error){
   last=error;
   if(attempt===attempts||!/props_temporarily_busy|temporarily busy|board is being rebuilt|HTTP 503/i.test(String(error?.message||error)))throw error;
  }
  await sleep(attempt*1500);
 }
 throw last||new Error('ParlayAPI request failed');
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const bookKey=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const americanPrice=v=>{const n=finite(v);if(n==null)return null;if(Math.abs(n)>=100||n<=-100)return Math.round(n);if(n>1&&n<100)return Math.round(n>=2?(n-1)*100:-100/(n-1));return Math.round(n);};
const best=rows=>rows.filter(x=>Number.isFinite(x.price)).sort((a,b)=>b.price-a.price||String(b.ts||'').localeCompare(String(a.ts||'')))[0]||null;
function matchSlateGame(event){
 const t=Date.parse(event?.commence_time||'');
 const hits=(slate.games||[]).filter(g=>norm(g.home?.name)===norm(event?.home_team)&&norm(g.away?.name)===norm(event?.away_team)&&Number.isFinite(t)&&Math.abs(Date.parse(g.startTime)-t)<=1800000);
 return hits.length===1?hits[0]:null;
}
function puckLineForEvent(event,game){
 const spreadRows=[];
 for(const b of event?.bookmakers||[]){
  const bk=bookKey(b.key||b.title);if(!BOOKS.includes(bk))continue;
  for(const m of b.markets||[]){if(m.key!=='spreads')continue;for(const o of m.outcomes||[]){
   const point=finite(o.point),p=americanPrice(o.price);if(point==null||p==null)continue;
   spreadRows.push({book:b.title||b.key||'Sportsbook',bookKey:bk,team:o.name,point,price:p,ts:b.last_update||m.last_update||null});
  }}
 }
 const favRows=spreadRows.filter(x=>x.point===-1.5);if(!favRows.length)return null;
 const counts=new Map();for(const x of favRows){const k=norm(x.team);counts.set(k,(counts.get(k)||0)+1);}
 const favNorm=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0];if(!favNorm)return null;
 const fav=favRows.filter(x=>norm(x.team)===favNorm),pick=best(fav);if(!pick)return null;
 const favorite=norm(game.away.name)===favNorm?game.away:norm(game.home.name)===favNorm?game.home:null;if(!favorite)return null;
 const underdog=favorite===game.away?game.home:game.away;
 const dog=best(spreadRows.filter(x=>norm(x.team)===norm(underdog.name)&&x.point===1.5));
 return {favoriteAbbr:favorite.abbr,favoriteTeam:favorite.name,line:-1.5,price:pick.price,book:pick.book,underdogAbbr:underdog.abbr,underdogTeam:underdog.name,underdogLine:1.5,underdogPrice:dog?.price??null,underdogBook:dog?.book??null,sportsbookCount:new Set(fav.map(x=>x.bookKey)).size};
}
function buildPuckLines(gameOdds){
 const byGame=new Map();
 for(const event of Array.isArray(gameOdds)?gameOdds:[]){const game=matchSlateGame(event);if(!game)continue;byGame.set(String(game.id),{gameId:String(game.id),startTime:game.startTime,awayAbbr:game.away.abbr,homeAbbr:game.home.abbr,awayTeam:game.away.name,homeTeam:game.home.name,puckLine:puckLineForEvent(event,game)});}
 return (slate.games||[]).map(g=>byGame.get(String(g.id))||{gameId:String(g.id),startTime:g.startTime,awayAbbr:g.away.abbr,homeAbbr:g.home.abbr,awayTeam:g.away.name,homeTeam:g.home.name,puckLine:null});
}
const events=await get('events');const relevant=(Array.isArray(events)?events:[]).some(e=>upcoming.some(g=>Math.abs(Date.parse(g.startTime)-Date.parse(e.commence_time))<=1800000));
let rows=[];if(relevant&&next!=null){rows=await get('props?'+new URLSearchParams({markets:Object.keys(MARKET_MAP).join(','),bookmakers:BOOKS.join(','),maxAgeSec:'3600',limit:'10000',includeLinks:'true',includeSids:'true'}));if(!Array.isArray(rows))throw new Error('Unexpected props response');}
let gameOdds=[];
if(relevant&&upcoming.length){
 const starts=upcoming.map(g=>Date.parse(g.startTime)).filter(Number.isFinite),from=new Date(Math.min(...starts)-3600000).toISOString(),to=new Date(Math.max(...starts)+8*3600000).toISOString();
 gameOdds=await get('odds?'+new URLSearchParams({regions:'us',markets:'h2h,spreads,totals',oddsFormat:'american',commenceTimeFrom:from,commenceTimeTo:to}));
 if(!Array.isArray(gameOdds))throw new Error('Unexpected game odds response');
}
const gameLines=buildPuckLines(gameOdds);
const output=normalizeOdds(rows,slate,now);output.status=relevant?'waiting-for-markets':'no-listed-events';if(output.quotes.length)output.status='available';
output.gameLines=gameLines;
output.meta={...(output.meta||{}),refreshThresholdMinutes:Number.isFinite(gate.thresholdMs)?Math.round(gate.thresholdMs/60000):null,hoursToNextStart:gate.hoursToNextStart,nativeMetadataRequested:{includeLinks:true,includeSids:true},puckLineGames:gameLines.filter(g=>g.puckLine).length};
await fs.writeFile('slates/nhl-odds.json',JSON.stringify(output,null,2)+'\n');
const puckLines={source:'parlayapi',sample:false,generatedAt:new Date(now).toISOString(),date:slate.date,season:slate.season,games:gameLines};
await fs.writeFile('slates/nhl-puck-lines.json',JSON.stringify(puckLines,null,2)+'\n');
console.log(`NHL odds: ${output.quotes.length} matched player quotes; puckLines=${gameLines.filter(g=>g.puckLine).length}/${gameLines.length}; ${output.status}; links=${output.meta.nativeLinkRows||0}; sids=${output.meta.nativeSidRows||0}`);
