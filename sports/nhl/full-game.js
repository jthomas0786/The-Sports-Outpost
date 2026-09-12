import {simulateRegulation} from './sim.js';
import {makeRng,poisson} from '../nfl/sim/utils.js';
export function simulateFullGame(args={}){
 const {players=[],status='pre',period=1,clockSeconds=1200,seasonType=2,currentScore={},seed=9010}=args;
 if(![2,3].includes(seasonType))return {ready:false,reason:'Preseason format and lineups unconfirmed'};
 if(status==='pre'&&!args.lineupsConfirmed)return {ready:false,reason:'Lineups unconfirmed'};
 const teams=[...new Set(players.map(p=>p.team))];
 if(teams.length!==2||teams.some(t=>players.filter(p=>p.team===t&&p.position==='G'&&p.active!==false&&p.confirmedStarter).length!==1))return {ready:false,reason:'Current goalies unconfirmed'};
 if(status==='in'&&teams.some(t=>!Number.isFinite(currentScore[t])))return {ready:false,reason:'Current score unavailable'};
 const iterations=args.iterations??(status==='in'&&clockSeconds!==0?15000:50000);
 const inOT=status==='in'&&period>3;
 if(inOT&&(clockSeconds<0||clockSeconds>(seasonType===3?1200:300)))return {ready:false,reason:'Invalid overtime clock'};
 const result=simulateRegulation({...args,iterations,...(inOT?{status:'post',period:3,clockSeconds:0}:{})});if(!result.ready)return result;
 const rng=makeRng(seed+1),shootouts=new Uint8Array(iterations),overtime=new Uint8Array(iterations);
 const skaters=result.worlds.filter(r=>r.player.position!=='G'&&r.player.active!==false);
 const goalies=Object.fromEntries(teams.map(t=>[t,result.worlds.find(r=>r.player.team===t&&r.player.position==='G'&&r.player.confirmedStarter&&r.player.active!==false)]));
 const weight=r=>Math.max(0,r.player.prior?.sog||0);
 const pick=(pool,fn)=>{let draw=rng()*pool.reduce((s,r)=>s+fn(r),0);for(const r of pool){draw-=fn(r);if(draw<=0)return r;}return pool.at(-1);};
 for(let w=0;w<iterations;w++){
  if(status==='post')continue;
  const scores=teams.map(t=>(currentScore[t]||0)+result.worlds.filter(r=>r.player.team===t).reduce((s,r)=>s+r.stats.goals[w]-(r.player.current?.goals||0),0));
  if(scores[0]!==scores[1])continue;
  overtime[w]=1;const rate=skaters.reduce((s,r)=>s+weight(r),0)/3600*(seasonType===2?1.2:1);
  if(!(rate>0))return {ready:false,reason:'Overtime shot rates unavailable'};
  let left=inOT?clockSeconds:seasonType===2?300:1200,goal=false,shots=0;
  while(!goal){
   const wait=-Math.log(Math.max(Number.EPSILON,1-rng()))/rate,elapsed=Math.min(left,wait);
   for(const r of skaters)r.stats.blocks[w]+=poisson(rng,(r.player.prior.blocks||0)*elapsed/3600);
   left-=elapsed;
   if(wait>elapsed||left<=0){if(seasonType===2){shootouts[w]=1;break;}left=1200;continue;}
   if(++shots>2000)return {ready:false,reason:'Overtime convergence guard'};
   const shooter=pick(skaters,weight);shooter.stats.sog[w]++;
   goal=rng()<Math.max(0,Math.min(.35,shooter.player.prior.shootingPct));
   if(!goal){goalies[teams.find(t=>t!==shooter.player.team)].stats.saves[w]++;continue;}
   shooter.stats.goals[w]++;
   const pool=skaters.filter(r=>r!==shooter&&r.player.team===shooter.player.team&&r.player.prior.assists>0);
   for(let i=0;i<2&&pool.length;i++){if(rng()>(i===0?.85:.65))break;const assist=pick(pool,r=>r.player.prior.assists);assist.stats.assists[w]++;pool.splice(pool.indexOf(assist),1);}
  }
  for(const r of result.worlds)r.stats.points[w]=r.stats.goals[w]+r.stats.assists[w];
 }
 result.players=result.worlds.map(r=>({id:r.player.id,team:r.player.team,metrics:Object.fromEntries(Object.entries(r.stats).map(([key,array])=>{
  const values=[...array].sort((a,b)=>a-b),counts=new Map();for(const v of values)counts.set(v,(counts.get(v)||0)+1);
  return [key,{mean:values.reduce((s,v)=>s+v,0)/iterations,median:values[Math.floor(iterations/2)],atLeastOne:values.filter(v=>v>0).length/iterations,distribution:[...counts].map(([value,count])=>[value,count/iterations])}];
 }))}));
 return {...result,scope:'full-game-excluding-shootout',overtime,shootouts};
}
