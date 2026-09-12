import {num} from './data.js';
export function seasonPrior(doc,season,now=Date.now()){
 const categories=doc?.splits?.categories;if(!Array.isArray(categories))return null;
 const stats=Object.fromEntries(categories.flatMap(c=>c.stats||[]).map(s=>[s.name,num(s.value)]));
 const games=stats.games;if(!(games>0))return null;
 const rates={};for(const [key,source] of Object.entries({sog:'shotsTotal',goals:'goals',assists:'assists',blocks:'blockedShots',saves:'saves'}))if(stats[source]!=null&&stats[source]>=0)rates[key]=stats[source]/games;
 if(rates.goals!=null&&rates.assists!=null)rates.points=rates.goals+rates.assists;
 const shootingPct=stats.shotsTotal>0&&stats.goals>=0&&stats.goals<=stats.shotsTotal?(stats.goals+10)/(stats.shotsTotal+100):null;
 return {season,games,rates,shootingPct,source:'ESPN season statistics',fetchedAt:now};
}
export function attachPriors(game,research){return game.players.map(p=>{const prior=research?.players?.[p.id];return {...p,prior:prior?.rates?.sog!=null&&prior.shootingPct!=null?{...prior.rates,shootingPct:prior.shootingPct}:null};});}
