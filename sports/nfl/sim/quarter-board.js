import { probability, round, summarizeTyped } from './utils.js';

const QUARTERS=['q1','q2','q3','q4'];
const HALF_MAP={
  '1h':['q1','q2'],
  '2h':['q3','q4'],
};
const THRESHOLDS={
  passYds:[24.5,39.5,49.5,59.5,74.5],
  completions:[2.5,3.5,4.5,5.5,6.5],
  rushYds:[4.5,9.5,14.5,19.5,24.5,29.5],
  recYds:[4.5,9.5,14.5,19.5,24.5,29.5],
  receptions:[0.5,1.5,2.5,3.5],
};
const HALF_THRESHOLDS={
  passYds:[49.5,74.5,99.5,124.5,149.5],
  completions:[4.5,6.5,8.5,10.5,12.5,14.5],
  rushYds:[9.5,19.5,29.5,39.5,49.5,59.5],
  recYds:[9.5,19.5,29.5,39.5,49.5,59.5],
  receptions:[0.5,1.5,2.5,3.5,4.5,5.5],
};
const ALLOWED={QB:['passYds','completions','rushYds'],RB:['rushYds','recYds','receptions'],WR:['recYds','receptions'],TE:['recYds','receptions']};
const STAT_LABEL={passYds:'Passing Yards',completions:'Completions',rushYds:'Rushing Yards',recYds:'Receiving Yards',receptions:'Receptions'};

function normName(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');}
function candidateId(gameId,period,p,market,line){return `${gameId}|${period}|${p.team}|${normName(p.name)}|${market}|over|${line}`;}
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
function rankingsFor(candidates){
  const ids=mode=>modeRank(candidates,mode).map(c=>c.id);
  return {
    tsoPick:ids('tsoPick'),safest:ids('safest'),bestEdge:ids('bestEdge'),balanced:ids('balanced'),
    aggressive:ids('aggressive'),longshot:ids('longshot'),correlated:ids('tsoPick'),
  };
}
function summedArray(a,b,n){
  const out=new Uint16Array(n);
  for(let i=0;i<n;i++)out[i]=(Number(a?.[i])||0)+(Number(b?.[i])||0);
  return out;
}
function playerMetaMap(publicPeriods,quarterKeys){
  const out=new Map();
  for(const q of quarterKeys){
    for(const p of publicPeriods?.[q]?.players||[]){
      const key=String(p.playerId||`${p.team}|${normName(p.name)}`);
      if(!out.has(key))out.set(key,p);
    }
  }
  return out;
}
function buildPeriod({gameId,period,players,getStat,iterations,thresholds,config,projectedKey='projectedPeriod'}){
  const minProb=Number(config?.quarters?.candidateMinProbability??.54);
  const maxProb=Number(config?.quarters?.candidateMaxProbability??.92);
  const maxCandidates=Number(config?.quarters?.maxCandidatesPerQuarter??24);
  const targetA=Number(config?.quarters?.balancedTargetProbability??.72);
  const targetB=Number(config?.quarters?.aggressiveTargetProbability??.60);
  const pool=[];
  for(const p of players||[]){
    for(const market of ALLOWED[p.position]||[]){
      const rec=getStat(p,market);
      const stat=rec?.stat,dist=rec?.dist;
      if(!stat||!dist)continue;
      const options=[];
      for(const line of thresholds[market]||[]){
        const sim=probability(stat,v=>v>line,iterations);
        if(sim<minProb||sim>maxProb)continue;
        const mean=Number(dist.mean)||0;
        const spread=Math.max(1,(Number(dist.p75)||mean)-(Number(dist.p25)||mean),Math.sqrt(Math.max(1,mean)));
        const modelEdge=(mean-line)/spread;
        const mask=hitMask(stat,line,iterations);
        options.push({
          id:candidateId(gameId,period,p,market,line),gameId,quarter:period.startsWith('q')?period:null,period,
          playerId:String(p.playerId||''),espnId:p.espnId||null,gsisId:p.gsisId||null,name:p.name,team:p.team,position:p.position,
          market,marketLabel:STAT_LABEL[market]||market,side:'over',line,
          simProbability:round(sim,4),modelEdge:round(modelEdge,3),lineRatio:round(mean>0?line/mean:0,3),
          [projectedKey]:dist,projectedPeriod:dist,worldMaskB64:packMask(mask,iterations),worldMaskIterations:iterations,
        });
      }
      const picks=[nearest(options,targetA),nearest(options,targetB)].filter(Boolean);
      const seen=new Set();
      for(const c of picks){if(!seen.has(c.id)){pool.push(c);seen.add(c.id);}}
    }
  }
  const candidates=modeRank(pool,'tsoPick').slice(0,maxCandidates);
  return {ready:candidates.length>=2,iterations,candidates,rankings:rankingsFor(candidates)};
}

export function buildPregameQuarterBoard({result,game,config,generatedAt=new Date().toISOString()}){
  const samples=result?._samples;
  const gameId=String(game?.gameId||game?.id||result?.game?.gameId||'');
  const base={
    schemaVersion:2,boardVersion:'v94.0',generatedAt,gameId,
    matchup:`${game?.away?.abbr||result?.game?.away?.abbr||'AWY'} @ ${game?.home?.abbr||result?.game?.home?.abbr||'HME'}`,
    startTimeUTC:game?.startTimeUTC||result?.game?.startTimeUTC||null,
    iterations:result?.iterations||samples?.iterations||0,
    ready:false,quarters:{},halves:{},periods:{},
  };
  if(!samples?.quarters||!samples?.iterations)return base;
  const iterations=samples.iterations;
  const publicPeriods=result?.quarters?.periods||{};

  for(const q of QUARTERS){
    const periodSamples=samples.quarters[q];
    const publicPeriod=publicPeriods[q];
    const board=buildPeriod({
      gameId,period:q,players:publicPeriod?.players||[],iterations,thresholds:THRESHOLDS,config,projectedKey:'projectedQuarter',
      getStat:(p,market)=>{
        const rec=periodSamples?.players?.get(String(p.playerId||''));
        return {stat:rec?.stats?.[market],dist:p?.distributions?.[market]};
      },
    });
    base.quarters[q]=board;
    base.periods[q]=board;
  }

  for(const [half,quarterKeys] of Object.entries(HALF_MAP)){
    const metas=[...playerMetaMap(publicPeriods,quarterKeys).values()];
    const cache=new Map();
    const board=buildPeriod({
      gameId,period:half,players:metas,iterations,thresholds:HALF_THRESHOLDS,config,
      getStat:(p,market)=>{
        const key=`${p.playerId}|${market}`;
        if(cache.has(key))return cache.get(key);
        const qa=samples.quarters[quarterKeys[0]]?.players?.get(String(p.playerId||''));
        const qb=samples.quarters[quarterKeys[1]]?.players?.get(String(p.playerId||''));
        if(!qa&&!qb){cache.set(key,null);return null;}
        const stat=summedArray(qa?.stats?.[market],qb?.stats?.[market],iterations);
        const dist=summarizeTyped(stat,iterations);
        const value={stat,dist};cache.set(key,value);return value;
      },
    });
    base.halves[half]=board;
    base.periods[half]=board;
  }

  // Preserve the historical Quarter Parlay readiness contract: half-period
  // availability never makes the existing Q1-Q4 parlay CTA ready by itself.
  base.ready=QUARTERS.some(q=>base.quarters[q]?.ready);
  return base;
}

export const __NFL_PERIOD_BOARD_V940_TEST__={QUARTERS,HALF_MAP,THRESHOLDS,HALF_THRESHOLDS,summedArray,modeRank};