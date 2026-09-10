import {
  evaluateLegFromArrays as evaluateBaseLeg,
  jointProbabilityFromResult as jointBase,
  simulateGame as simulateBase,
} from './engine.js';
import { hash32, logNormalFactor, makeRng, probability, round, summarizeTyped } from './utils.js';

const QUARTERS=['q1','q2','q3','q4'];
const TRACKED=['passYds','completions','attempts','passTds','interceptions','rushYds','carries','rushTds','recYds','receptions','targets','recTds','tds'];
const PROP_TO_STAT={
  passYds:'passYds',passTds:'passTds',completions:'completions',attempts:'attempts',
  rushYds:'rushYds',carries:'carries',recYds:'recYds',receptions:'receptions',targets:'targets',
  interceptions:'interceptions',rushTds:'rushTds',recTds:'recTds',tds:'tds',
};

function periodKey(v){
  if(v==null||v==='') return null;
  const s=String(v).toLowerCase().replace(/\s+/g,'');
  const m=s.match(/^(?:q|quarter)?([1-4])(?:q)?$/);
  return m?`q${m[1]}`:null;
}

function splitInteger(total,weights,rng){
  const n=Math.max(0,Math.round(Number(total)||0));
  if(!n) return [0,0,0,0];
  const clean=weights.map(x=>Math.max(0.0001,Number(x)||0.0001));
  const sum=clean.reduce((a,b)=>a+b,0)||1;
  const raw=clean.map(w=>n*w/sum);
  const out=raw.map(Math.floor);
  let rem=n-out.reduce((a,b)=>a+b,0);
  if(rem>0){
    const order=raw.map((x,i)=>({i,frac:x-out[i],tie:rng()})).sort((a,b)=>b.frac-a.frac||b.tie-a.tie);
    for(let i=0;i<rem;i++) out[order[i%order.length].i]++;
  }
  return out;
}

function quarterArrays(players,iterations){
  const periods={};
  for(const q of QUARTERS){
    const map=new Map();
    for(const p of players){
      const stats={};
      for(const k of TRACKED) stats[k]=new Uint16Array(iterations);
      map.set(p.key,{player:p,stats});
    }
    periods[q]={
      players:map,
      awayScores:new Uint16Array(iterations),
      homeScores:new Uint16Array(iterations),
    };
  }
  return periods;
}

function quarterWeights(rng,config){
  const base=config?.quarters?.baseShare||[1.04,.98,.99,.99];
  const sigma=Number(config?.quarters?.teamPaceVolatility??.12);
  return [0,1,2,3].map(i=>Math.max(.05,Number(base[i]??1)*logNormalFactor(rng,sigma)));
}

function playerQuarterWeights(rng,teamWeights,config){
  const sigma=Number(config?.quarters?.playerUsageVolatility??.10);
  return teamWeights.map(w=>Math.max(.01,w*logNormalFactor(rng,sigma)));
}

function buildQuarterSamples(result,config){
  const samples=result?._samples;
  if(!samples?.players||!samples.iterations) return null;
  const iterations=samples.iterations;
  const players=[...samples.players.values()].map(r=>r.player);
  const periods=quarterArrays(players,iterations);
  const awayAbbr=String(result?.game?.away?.abbr||'');
  const homeAbbr=String(result?.game?.home?.abbr||'');
  const rng=makeRng(hash32(`${result.seed}|quarter-v861`));

  for(let i=0;i<iterations;i++){
    const teamWeights={
      [awayAbbr]:quarterWeights(rng,config),
      [homeAbbr]:quarterWeights(rng,config),
    };
    const awayPts=splitInteger(samples.awayScores?.[i]||0,teamWeights[awayAbbr],rng);
    const homePts=splitInteger(samples.homeScores?.[i]||0,teamWeights[homeAbbr],rng);
    for(let q=0;q<4;q++){
      periods[QUARTERS[q]].awayScores[i]=awayPts[q];
      periods[QUARTERS[q]].homeScores[i]=homePts[q];
    }

    for(const [key,rec] of samples.players){
      const team=String(rec.player?.team||'');
      const weights=playerQuarterWeights(rng,teamWeights[team]||[1,1,1,1],config);
      for(const stat of TRACKED){
        if(stat==='tds') continue;
        const total=rec.stats?.[stat]?.[i]||0;
        if(!total) continue;
        const parts=splitInteger(total,weights,rng);
        for(let q=0;q<4;q++) periods[QUARTERS[q]].players.get(key).stats[stat][i]=parts[q];
      }
      for(let q=0;q<4;q++){
        const s=periods[QUARTERS[q]].players.get(key).stats;
        s.tds[i]=(s.rushTds[i]||0)+(s.recTds[i]||0);
      }
    }
  }
  return {iterations,periods};
}

function publicQuarterSummary(result,quarterSamples){
  if(!quarterSamples) return null;
  const {iterations,periods}=quarterSamples;
  const out={
    modelVersion:'v86.1.0',
    method:'within-world quarter allocation constrained to each 50K full-game simulation',
    iterations,
    periods:{},
  };
  for(const q of QUARTERS){
    const period=periods[q];
    const totalScores=new Uint16Array(iterations);
    for(let i=0;i<iterations;i++) totalScores[i]=(period.awayScores[i]||0)+(period.homeScores[i]||0);
    const players=[...period.players.values()].map(rec=>{
      const distributions={};
      for(const k of TRACKED) distributions[k]=summarizeTyped(rec.stats[k],iterations);
      return {
        playerId:rec.player.key,
        espnId:rec.player.espnId,
        gsisId:rec.player.gsisId,
        name:rec.player.name,
        team:rec.player.team,
        position:rec.player.position,
        depthRank:rec.player.depthRank,
        distributions,
        probabilities:{td:round(probability(rec.stats.tds,v=>v>=1,iterations),4)},
      };
    });
    players.sort((a,b)=>(b.probabilities.td||0)-(a.probabilities.td||0)||a.team.localeCompare(b.team)||a.name.localeCompare(b.name));
    out.periods[q]={
      away:{abbr:result.game.away.abbr,score:summarizeTyped(period.awayScores,iterations)},
      home:{abbr:result.game.home.abbr,score:summarizeTyped(period.homeScores,iterations)},
      total:{score:summarizeTyped(totalScores,iterations)},
      players,
    };
  }
  return out;
}

function legSampleRecord(result,leg){
  const samples=result?._samples;
  if(!samples) return null;
  const q=periodKey(leg?.period??leg?.quarter);
  const key=String(leg?.playerId||'');
  if(q) return samples.quarters?.[q]?.players?.get(key)||null;
  return samples.players?.get(key)||null;
}

function legHits(rec,leg,i){
  const market=String(leg.market||leg.prop||'');
  const side=String(leg.side||'over').toLowerCase();
  const line=Number(leg.line);
  if(market==='atd'||market==='td') return (rec.stats.tds[i]||0)>=1;
  if(market==='2td'||market==='twoPlusTd') return (rec.stats.tds[i]||0)>=2;
  const stat=PROP_TO_STAT[market];
  if(!stat||!Number.isFinite(line)) return null;
  const v=Number(rec.stats?.[stat]?.[i]||0);
  return side==='under'?v<line:v>line;
}

export function quarterPropProbability(result,{playerId,quarter='q1',period=null,market,line,side='over'}={}){
  const q=periodKey(period??quarter);
  const samples=result?._samples;
  const rec=q?samples?.quarters?.[q]?.players?.get(String(playerId||'')):null;
  if(!rec) return null;
  const stat=PROP_TO_STAT[String(market||'')];
  if((market==='atd'||market==='td')) return probability(rec.stats.tds,v=>v>=1,samples.iterations);
  if(!stat||!Number.isFinite(Number(line))) return null;
  return probability(rec.stats[stat],v=>String(side).toLowerCase()==='under'?v<Number(line):v>Number(line),samples.iterations);
}

export function jointProbabilityFromResult(result,legs){
  const hasPeriod=(legs||[]).some(l=>periodKey(l?.period??l?.quarter));
  if(!hasPeriod) return jointBase(result,legs);
  const samples=result?._samples;
  if(!samples||!legs?.length) return null;
  const refs=[];
  for(const leg of legs){
    const rec=legSampleRecord(result,leg);
    if(!rec) return null;
    refs.push({rec,leg});
  }
  let hits=0;
  outer:for(let i=0;i<samples.iterations;i++){
    for(const x of refs){
      const hit=legHits(x.rec,x.leg,i);
      if(hit==null) return null;
      if(!hit) continue outer;
    }
    hits++;
  }
  return hits/samples.iterations;
}

export function simulateGame(args){
  const liveStatus=String(args?.liveGame?.status||'pre').toLowerCase();
  const quarterEnabled=args?.config?.quarters?.enabled!==false;
  const eligible=quarterEnabled&&(liveStatus==='pre'||!args?.liveGame);
  const keepSamples=!!args?.includeSamples;
  const result=simulateBase({...args,includeSamples:keepSamples||eligible});
  if(eligible&&result?._samples){
    const qs=buildQuarterSamples(result,args.config||{});
    result.quarters=publicQuarterSummary(result,qs);
    result._samples.quarters=Object.fromEntries(QUARTERS.map(q=>[q,qs.periods[q]]));
    result.notes=[...(result.notes||[]),'v86.1 adds Q1-Q4 player/stat distributions from every pregame simulation world, constrained to each world\'s full-game totals for correlated quarter-prop analysis.'];
  }
  if(!keepSamples&&result?._samples) delete result._samples;
  return result;
}

export function stripPrivateSamples(result){
  if(!result) return result;
  const {_samples,...publicResult}=result;
  return publicResult;
}

export const evaluateLegFromArrays=evaluateBaseLeg;
export const __V861_TEST__={QUARTERS,TRACKED,periodKey,splitInteger};
