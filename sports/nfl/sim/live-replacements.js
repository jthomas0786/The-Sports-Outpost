import { buildGameProfile } from './profile.js';

// Adjust input workloads only. The existing engine still allocates every team's
// opportunities together inside each world, with each replacement's own efficiency.
export function calibrateLiveReplacements({originalResearch,...args}){
  const profile=buildGameProfile(args);
  const original=buildGameProfile({...args,research:originalResearch});
  const prior=new Map(original.players.map(p=>[p.key,p]));
  const changes=[];
  const donors=profile.players.filter(p=>p.availabilityFactor===0&&(
    prior.get(p.key)?.availabilityFactor>0||
    ['attempts','carries','targets','receptions'].some(k=>p.current[k]>0)
  ));
  const additions=new Map();
  const add=(p,metric,amount)=>{
    if(!(amount>0))return;
    const entry=additions.get(p)||{};
    entry[metric]=(entry[metric]||0)+amount;
    additions.set(p,entry);
  };
  for(const donor of donors){
    const teammates=profile.players.filter(p=>p.team===donor.team&&p.availabilityFactor>0);
    for(const metric of ['carries','targets']){
      const eligible=teammates.filter(p=>metric==='targets'?['RB','WR','TE'].includes(p.position):['RB','QB','WR','TE'].includes(p.position));
      const weights=eligible.map(p=>Math.max(.1,p.base[metric])*p.availabilityFactor*(p.position===donor.position?1.5:1));
      const sum=weights.reduce((a,b)=>a+b,0);
      if(!sum)continue;
      eligible.forEach((p,i)=>add(p,metric,donor.base[metric]*weights[i]/sum));
    }
  }
  // Replace the starting QB's workload, not the sum of all inactive QBs' priors.
  for(const team of [profile.awayTeam,profile.homeTeam]){
    const donor=donors.filter(p=>p.team===team.abbr&&p.position==='QB').sort((a,b)=>(a.depthRank??99)-(b.depthRank??99))[0];
    if(donor&&team.qb&&((donor.depthRank??99)<(team.qb.depthRank??99)||
      (donor.depthRank==null&&donor.current.attempts>0&&donor.base.attempts>team.qb.base.attempts))){
      add(team.qb,'attempts',Math.max(0,donor.base.attempts-team.qb.base.attempts));
    }
  }
  const groups={attempts:['attempts','completions','passYds','passTds'],carries:['carries','rushYds','rushTds'],targets:['targets','receptions','recYds','recTds']};
  for(const [player,volume] of additions){
    const scale={};
    for(const [metric,extra] of Object.entries(volume)){
      // A missing role prior cannot establish efficiency; retain the core fallback.
      if(!(player.base[metric]>0))continue;
      const factor=(player.base[metric]+extra)/player.base[metric];
      for(const key of groups[metric])scale[key]=factor;
    }
    player.source.model={...(player.source.model||{}),liveReplacementScale:scale};
    changes.push({playerId:player.key,team:player.team,addedWorkload:volume});
  }
  return {unavailablePlayers:donors.map(p=>p.key),adjustments:changes};
}
