import { createHash } from 'node:crypto';
import { normTeam } from '../../sports/nfl/sim/utils.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function stable(x){
 if(Array.isArray(x))return x.map(stable);
 if(!x||typeof x!=='object')return x;
 return Object.fromEntries(Object.keys(x).sort().filter(k=>!['lastFetchedAt','generatedAt','summaryError'].includes(k)).map(k=>[k,stable(x[k])]));
}
export function captureInputs({slate,liveDoc,research,odds,liveOdds,now=Date.now(),source=null}){
 const captures=[],skipped=[];
 for(const [id,live] of Object.entries(liveDoc?.games||{})){
  const game=slate?.games?.find(g=>String(g.gameId||g.id)===id);
  if(!game){skipped.push({id,reason:'Missing slate game'});continue;}
  if(!['pre','in','post'].includes(live.status))continue;
  const stamp=live.lastFetchedAt??liveDoc.lastFetchedAt,time=typeof stamp==='number'?stamp:Date.parse(stamp);
  if(!Number.isFinite(time)||time>now||now-time>120000){skipped.push({id,reason:'Stale or missing observation time'});continue;}
  if(live.summaryError){skipped.push({id,reason:'Summary fetch failed'});continue;}
  if(live.status==='pre'){
   const minutes=(Date.parse(game.startTimeUTC)-now)/60000;
   if(!Number.isFinite(minutes)||minutes<0||minutes>180)continue;
  }else if(!live.playerStats){skipped.push({id,reason:'Missing player box score'});continue;}
  const teams=[normTeam(game.away?.abbr),normTeam(game.home?.abbr)];
  const match=p=>String(p.gameId||'')===id||(!p.gameId&&teams.includes(normTeam(p.team)));
  const researchData=research?{generatedAt:research.generatedAt,players:(research.players||[]).filter(match)}:null;
  const filterOdds=doc=>doc?{meta:doc.meta,games:(doc.games||[]).filter(g=>String(g.gameId||'')===id||(!g.gameId&&normTeam(g.away)===teams[0]&&normTeam(g.home)===teams[1]))}:null;
  const inputs={research:researchData,odds:filterOdds(odds),liveOdds:filterOdds(liveOdds)};
  const refs=Object.fromEntries(Object.entries(inputs).filter(([,data])=>data!=null).map(([kind,data])=>[kind,hash(data)]));
  const state=stable(live);
  // Keep final corrections but avoid repeatedly archiving an unchanged final.
  const key=hash({gameId:id,state,refs:live.status==='post'?null:refs,checkpoint:live.status==='pre'?Math.floor(now/900000):null});
  captures.push({key,inputs,frame:{schemaVersion:1,gameId:id,at:new Date(now).toISOString(),source,refs,
   game:{gameId:id,startTimeUTC:game.startTimeUTC,away:{abbr:teams[0],name:game.away?.name},home:{abbr:teams[1],name:game.home?.name}},liveGame:live}});
 }
 return {captures,skipped};
}
