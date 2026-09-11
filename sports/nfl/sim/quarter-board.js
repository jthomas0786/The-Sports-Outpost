import { probability, round } from './utils.js';

const QUARTERS=['q1','q2','q3','q4'];
const THRESHOLDS={
  passYds:[24.5,39.5,49.5,59.5,74.5],
  completions:[2.5,3.5,4.5,5.5,6.5],
  rushYds:[4.5,9.5,14.5,19.5,24.5,29.5],
  recYds:[4.5,9.5,14.5,19.5,24.5,29.5],
  receptions:[0.5,1.5,2.5,3.5],
};
const ALLOWED={QB:['passYds','completions','rushYds'],RB:['rushYds','recYds','receptions'],WR:['recYds','receptions'],TE:['recYds','receptions']};
const STAT_LABEL={passYds:'Passing Yards',completions:'Completions',rushYds:'Rushing Yards',recYds:'Receiving Yards',receptions:'Receptions'};

function normName(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');}
function candidateId(gameId,q,p,market,line){return `${gameId}|${q}|${p.team}|${normName(p.name)}|${market}|over|${line}`;}
function packMask(mask,n){
  const bytes=new Uint8Array(Math.ceil(n/8));
  for(let i=0;i<n;i++) if(mask[i]) bytes[i>>3]|=1<<(i&7);
  return Buffer.from(bytes).toString('base64');
}
function hitMask(arr,line,n){
  const mask=new Uint8Array(n);
  for(let i=0;i<n;i++) if(Number(arr[i])>line) mask[i]=1;
  return mask;
}
function nearest(options,target){
  if(!options.length) return null;
  return [...options].sort((a,b)=>Math.abs(a.simProbability-target)-Math.abs(b.simProbability-target)||b.line-a.line)[0];
}
function modeRank(candidates,mode){
  const list=[...candidates];
  if(mode==='safest') return list.sort((a,b)=>b.simProbability-a.simProbability||b.modelEdge-a.modelEdge);
  if(mode==='bestEdge') return list.sort((a,b)=>b.modelEdge-a.modelEdge||b.simProbability-a.simProbability);
  if(mode==='balanced') return list.sort((a,b)=>Math.abs(a.simProbability-.72)-Math.abs(b.simProbability-.72)||b.modelEdge-a.modelEdge);
  if(mode==='aggressive') return list.sort((a,b)=>Math.abs(a.simProbability-.62)-Math.abs(b.simProbability-.62)||b.lineRatio-a.lineRatio);
  if(mode==='longshot') return list.sort((a,b)=>Math.abs(a.simProbability-.56)-Math.abs(b.simProbability-.56)||b.lineRatio-a.lineRatio);
  return list.sort((a,b)=>(b.simProbability*.7+b.modelEdge*.08)-(a.simProbability*.7+a.modelEdge*.08));
}

export function buildPregameQuarterBoard({result,game,config,generatedAt=new Date().toISOString()}){
  const samples=result?._samples;
  const gameId=String(game?.gameId||game?.id||result?.game?.gameId||'');
  const base={
    schemaVersion:1,boardVersion:'v89.3',generatedAt,gameId,
    matchup:`${game?.away?.abbr||result?.game?.away?.abbr||'AWY'} @ ${game?.home?.abbr||result?.game?.home?.abbr||'HME'}`,
    startTimeUTC:game?.startTimeUTC||result?.game?.startTimeUTC||null,
    iterations:result?.iterations||samples?.iterations||0,
    ready:false,quarters:{},
  };
  if(!samples?.quarters||!samples?.iterations) return base;
  const minProb=Number(config?.quarters?.candidateMinProbability??.54);
  const maxProb=Number(config?.quarters?.candidateMaxProbability??.92);
  const maxCandidates=Number(config?.quarters?.maxCandidatesPerQuarter??24);
  const targetA=Number(config?.quarters?.balancedTargetProbability??.72);
  const targetB=Number(config?.quarters?.aggressiveTargetProbability??.60);

  for(const q of QUARTERS){
    const periodSamples=samples.quarters[q];
    const publicPeriod=result?.quarters?.periods?.[q];
    const pool=[];
    for(const p of publicPeriod?.players||[]){
      const rec=periodSamples?.players?.get(String(p.playerId||''));
      if(!rec) continue;
      for(const market of ALLOWED[p.position]||[]){
        const stat=rec.stats?.[market];
        const dist=p?.distributions?.[market];
        if(!stat||!dist) continue;
        const options=[];
        for(const line of THRESHOLDS[market]||[]){
          const sim=probability(stat,v=>v>line,samples.iterations);
          if(sim<minProb||sim>maxProb) continue;
          const mean=Number(dist.mean)||0;
          const spread=Math.max(1,(Number(dist.p75)||mean)-(Number(dist.p25)||mean),Math.sqrt(Math.max(1,mean)));
          const modelEdge=(mean-line)/spread;
          const mask=hitMask(stat,line,samples.iterations);
          options.push({
            id:candidateId(gameId,q,p,market,line),gameId,quarter:q,period:q,
            playerId:String(p.playerId||''),espnId:p.espnId||null,name:p.name,team:p.team,position:p.position,
            market,marketLabel:STAT_LABEL[market]||market,side:'over',line,
            simProbability:round(sim,4),modelEdge:round(modelEdge,3),lineRatio:round(mean>0?line/mean:0,3),
            projectedQuarter:dist,worldMaskB64:packMask(mask,samples.iterations),worldMaskIterations:samples.iterations,
          });
        }
        const picks=[nearest(options,targetA),nearest(options,targetB)].filter(Boolean);
        const seen=new Set();
        for(const c of picks){if(!seen.has(c.id)){pool.push(c);seen.add(c.id);}}
      }
    }
    const candidates=modeRank(pool,'tsoPick').slice(0,maxCandidates);
    const ids=mode=>modeRank(candidates,mode).map(c=>c.id);
    base.quarters[q]={
      ready:candidates.length>=2,candidates,
      rankings:{
        tsoPick:ids('tsoPick'),safest:ids('safest'),bestEdge:ids('bestEdge'),balanced:ids('balanced'),
        aggressive:ids('aggressive'),longshot:ids('longshot'),correlated:ids('tsoPick'),
      },
    };
  }
  base.ready=QUARTERS.some(q=>base.quarters[q]?.ready);
  return base;
}
