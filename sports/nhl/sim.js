import {makeRng,poisson,logNormalFactor} from '../nfl/sim/utils.js';
// Hockey-specific foundation. Regulation-only until overtime/settlement is added;
// never attach these probabilities to a full-game sportsbook market.
export function simulateRegulation({players=[],status='pre',period=1,clockSeconds=1200,iterations,seed=9000}={}){
 const live=status==='in';
 if(live&&period>3)return {ready:false,reason:'Overtime modeling pending'};
 if(!players.length||players.some(p=>p.position!=='G'&&p.active!==false&&(!p.prior||!Number.isFinite(p.prior.sog)||!Number.isFinite(p.prior.shootingPct))))return {ready:false,reason:'Verified season priors required'};
 const count=iterations??(live&&clockSeconds!==0?15000:50000);
 if(!Number.isInteger(count)||count<1||count>50000)throw new Error('Invalid simulation count');
 if(!Number.isInteger(period)||period<1||!Number.isFinite(clockSeconds)||clockSeconds<0||clockSeconds>1200)throw new Error('Invalid regulation clock');
 const remaining=status==='post'?0:live?((3-period)*1200+clockSeconds)/3600:1;
 const rng=makeRng(seed),keys=['goals','assists','points','sog','blocks','saves'];
 const worlds=players.map(p=>({player:p,stats:Object.fromEntries(keys.map(k=>[k,new Uint16Array(count)]))}));
 const teams=[...new Set(players.map(p=>p.team))];
 if(teams.length!==2)throw new Error('Exactly two teams are required');
 for(let w=0;w<count;w++){
  const pace=logNormalFactor(rng,.15),scored={};
  for(const row of worlds)for(const k of keys)row.stats[k][w]=Math.max(0,Number(row.player.current?.[k])||0);
  for(const team of teams){
   const skaters=worlds.filter(r=>r.player.team===team&&r.player.position!=='G'&&r.player.active!==false),goals=[];let shots=0;
   for(const row of skaters){
    const p=row.player,volume=poisson(rng,Math.max(0,p.prior.sog)*remaining*pace);shots+=volume;row.stats.sog[w]+=volume;
    for(let shot=0;shot<volume;shot++)if(rng()<Math.max(0,Math.min(.35,p.prior.shootingPct))){row.stats.goals[w]++;goals.push(row);}
    row.stats.blocks[w]+=poisson(rng,Math.max(0,p.prior.blocks||0)*remaining*pace);
   }
   for(const scorer of goals){
    const pool=skaters.filter(r=>r!==scorer&&r.player.prior.assists>0);
    for(let a=0;a<2&&pool.length;a++){
     if(rng()>(a===0?.85:.65))break;
     const total=pool.reduce((s,r)=>s+r.player.prior.assists,0);let draw=rng()*total,index=pool.length-1;
     for(let i=0;i<pool.length;i++){draw-=pool[i].player.prior.assists;if(draw<=0){index=i;break;}}
     pool.splice(index,1)[0].stats.assists[w]++;
    }
   }
   scored[team]={shots,goals:goals.length};
  }
  for(const row of worlds){
   row.stats.points[w]=row.stats.goals[w]+row.stats.assists[w];
   if(row.player.position==='G'&&row.player.confirmedStarter&&row.player.active!==false){const opp=scored[teams.find(t=>t!==row.player.team)];row.stats.saves[w]+=opp.shots-opp.goals;}
  }
 }
 const distributions=worlds.map(row=>({id:row.player.id,team:row.player.team,metrics:Object.fromEntries(keys.map(k=>{const values=[...row.stats[k]].sort((a,b)=>a-b);return [k,{mean:values.reduce((a,b)=>a+b,0)/count,median:values[Math.floor(count/2)],atLeastOne:values.filter(x=>x>=1).length/count}];}))}));
 return {ready:true,scope:'regulation-only',iterations:count,remainingFraction:remaining,players:distributions,worlds};
}
