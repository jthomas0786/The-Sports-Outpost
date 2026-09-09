/**
 * The Sports Outpost — v88 NFL Halftime Parlay Optimizer
 *
 * Pure browser/Node module. v87/v88 halftime boards contain one packed
 * hit/miss bitset per eligible candidate. That lets v88 evaluate ANY user
 * combination against the exact same 50,000 simulated worlds within a game.
 * Independent games are multiplied only after each game's exact joint is known.
 */

const MARKET_LABELS={
  passYds:'Passing Yards', passTds:'Passing TDs', completions:'Completions',
  rushYds:'Rushing Yards', recYds:'Receiving Yards', receptions:'Receptions',
  interceptions:'Interceptions', atd:'Anytime TD', twoPlusTd:'2+ TDs'
};
const POPCOUNT=Uint8Array.from({length:256},(_,n)=>{
  let x=n,c=0; while(x){c+=x&1;x>>=1;} return c;
});

export function marketLabel(k){ return MARKET_LABELS[k]||String(k||'Prop'); }
export function impliedFromAmerican(price){
  const p=Number(price); if(!Number.isFinite(p)||p===0)return null;
  return p>0?100/(p+100):(-p)/((-p)+100);
}
export function americanToDecimal(price){
  const p=Number(price); if(!Number.isFinite(p)||p===0)return null;
  return p>0?1+p/100:1+100/(-p);
}
export function probabilityToAmerican(prob){
  const p=Number(prob); if(!(p>0&&p<1))return null;
  return p>=.5?Math.round(-100*p/(1-p)):Math.round(100*(1-p)/p);
}
export function formatAmerican(v){
  const n=Number(v); return Number.isFinite(n)?(n>0?`+${Math.round(n)}`:`${Math.round(n)}`):'—';
}
function round(v,n=4){const p=10**n;return Math.round(Number(v)*p)/p}
function decodeBase64(b64){
  if(!b64)return null;
  if(typeof atob==='function'){
    const raw=atob(b64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  if(typeof Buffer!=='undefined') return Uint8Array.from(Buffer.from(b64,'base64'));
  return null;
}
function maskFor(c){
  if(c.__decodedMask)return c.__decodedMask;
  const m=decodeBase64(c.worldMaskB64);
  if(m) Object.defineProperty(c,'__decodedMask',{value:m,enumerable:false,configurable:true});
  return m;
}
function candidateKey(c){return `${c.gameId}|${c.id}`}
function contradictory(a,b){
  return String(a.gameId)===String(b.gameId) &&
    String(a.playerId)===String(b.playerId) &&
    String(a.market)===String(b.market) &&
    String(a.side)!==String(b.side);
}
function gameConflictSet(board){
  const s=new Set();
  for(const x of board?.correlations?.conflicts||[]){
    s.add(`${x.a}|||${x.b}`); s.add(`${x.b}|||${x.a}`);
  }
  return s;
}
function gamePositiveMap(board){
  const m=new Map();
  for(const x of board?.correlations?.positive||[]){
    m.set(`${x.a}|||${x.b}`,Number(x.lift)||0);
    m.set(`${x.b}|||${x.a}`,Number(x.lift)||0);
  }
  return m;
}
function exactGameJoint(board,legs){
  if(!legs.length)return null;
  const iterations=Number(board?.iterations)||Number(legs[0]?.worldMaskIterations)||0;
  if(!(iterations>0))return null;
  const masks=legs.map(maskFor);
  if(masks.some(x=>!x))return null;
  const bytes=Math.ceil(iterations/8);
  let hits=0;
  for(let i=0;i<bytes;i++){
    let v=255;
    for(const m of masks)v&=(m[i]??0);
    if(i===bytes-1 && iterations%8){
      const valid=(1<<(iterations%8))-1;
      v&=valid;
    }
    hits+=POPCOUNT[v];
  }
  return hits/iterations;
}
export function evaluateCombination(legs,boardById){
  if(!legs?.length)return null;
  const groups=new Map();
  for(const c of legs){
    const id=String(c.gameId);
    const a=groups.get(id)||[];a.push(c);groups.set(id,a);
  }
  let joint=1,exact=true;
  for(const [gameId,glegs] of groups){
    const board=boardById.get(String(gameId));
    let gp=exactGameJoint(board,glegs);
    if(gp==null){
      exact=false;
      gp=glegs.reduce((p,c)=>p*Number(c.simProbability||0),1);
    }
    joint*=gp;
  }
  const independent=legs.reduce((p,c)=>p*Number(c.simProbability||0),1);
  const bookFair=legs.reduce((p,c)=>p*Number(c.bookFairProbability||impliedFromAmerican(c.price)||1),1);
  const decimal=legs.reduce((p,c)=>p*(americanToDecimal(c.price)||1),1);
  const marketAmerican=decimal>1?(decimal>=2?Math.round((decimal-1)*100):Math.round(-100/(decimal-1))):null;
  const tsoAmerican=probabilityToAmerican(joint);
  const avgEdge=legs.reduce((a,c)=>a+Number(c.edge||0),0)/legs.length;
  return {
    jointProbability:round(joint,6),
    independentProbability:round(independent,6),
    correlationAdvantage:round(joint-independent,6),
    bookFairProbability:round(bookFair,6),
    parlayEdge:round(joint-bookFair,6),
    averageLegEdge:round(avgEdge,5),
    marketPriceEstimateAmerican:marketAmerican,
    tsoFairAmerican:tsoAmerican,
    exactSameWorld:exact,
    gamesUsed:groups.size,
  };
}
function modeCandidateScore(c,mode,positiveBonus=0){
  const p=Number(c.simProbability||0),e=Number(c.edge||0);
  const dec=americanToDecimal(c.price)||1;
  if(mode==='safest') return p*3+e;
  if(mode==='bestEdge') return e*5+p;
  if(mode==='longshot') return Math.log(Math.max(1.001,dec))*1.3+e*2+p*.25;
  if(mode==='correlated') return positiveBonus*8+e*2+p*.7;
  if(mode==='balanced') return p*1.5+e*3+Math.log(Math.max(1.001,dec))*.25;
  return p*1.8+e*3.7+positiveBonus*3; // TSO Pick
}
function finalScore(ev,mode,positiveLift=0){
  const joint=ev.jointProbability,edge=ev.parlayEdge,corr=ev.correlationAdvantage;
  if(mode==='safest')return joint*8+edge;
  if(mode==='bestEdge')return edge*9+joint*2;
  if(mode==='longshot')return Math.log(Math.max(1.001,(Math.abs(ev.marketPriceEstimateAmerican||0)+100)/100))*2+edge*4+joint;
  if(mode==='correlated')return corr*12+positiveLift*6+edge*3+joint*2;
  if(mode==='balanced')return joint*4+edge*6+corr*3;
  return joint*4.5+edge*6.5+corr*4; // TSO Pick
}
function signature(legs){return legs.map(c=>c.id).sort().join('~~')}

export function optimizeHalftimeParlay({
  boards=[], selectedGameIds=null, legCount=4, maxGames=2, mode='tsoPick',
  excludedSignatures=[], beamSize=700, candidateLimitPerGame=14
}={}){
  legCount=Math.max(2,Math.min(6,Number(legCount)||4));
  maxGames=Math.max(1,Math.min(3,Number(maxGames)||2));
  const selected=new Set((selectedGameIds||boards.map(b=>String(b.gameId))).map(String));
  const active=boards.filter(b=>b?.ready&&selected.has(String(b.gameId))&&Array.isArray(b.candidates)&&b.candidates.length);
  if(!active.length)return {error:'No selected halftime game has a ready candidate pool.'};

  const boardById=new Map(active.map(b=>[String(b.gameId),b]));
  const conflicts=new Map(active.map(b=>[String(b.gameId),gameConflictSet(b)]));
  const positives=new Map(active.map(b=>[String(b.gameId),gamePositiveMap(b)]));

  const candidates=[];
  for(const b of active){
    const byId=new Map((b.candidates||[]).map(c=>[c.id,c]));
    const rankingKey=mode==='bestEdge'?'bestEdge':mode==='safest'?'safest':mode==='longshot'?'longshot':mode==='balanced'?'balanced':'tsoPick';
    const ranked=(b.rankings?.[rankingKey]||[]).map(id=>byId.get(id)).filter(Boolean);
    const pool=[...ranked,...b.candidates.filter(c=>!ranked.includes(c))].slice(0,candidateLimitPerGame);
    for(const c of pool)candidates.push(c);
  }
  if(candidates.length<legCount)return {error:`Only ${candidates.length} eligible halftime legs are available; ${legCount} requested.`};

  // Strongest individual candidates first makes beam search stable and fast.
  candidates.sort((a,b)=>{
    const pa=positives.get(String(a.gameId)),pb=positives.get(String(b.gameId));
    const ba=[...((pa&&pa.values())||[])].reduce((x,y)=>x+y,0);
    const bb=[...((pb&&pb.values())||[])].reduce((x,y)=>x+y,0);
    return modeCandidateScore(b,mode,bb)-modeCandidateScore(a,mode,ba);
  });

  let beam=[{legs:[],rough:0,positiveLift:0}];
  for(let depth=0;depth<legCount;depth++){
    const next=[];
    for(const st of beam){
      const lastIdx=st.lastIdx??-1;
      for(let i=lastIdx+1;i<candidates.length;i++){
        const c=candidates[i];
        const games=new Set(st.legs.map(x=>String(x.gameId)));games.add(String(c.gameId));
        if(games.size>maxGames)continue;
        let bad=false,bonus=0;
        for(const x of st.legs){
          if(contradictory(x,c)){bad=true;break}
          if(String(x.gameId)===String(c.gameId)){
            if(conflicts.get(String(c.gameId))?.has(`${x.id}|||${c.id}`)){bad=true;break}
            bonus+=positives.get(String(c.gameId))?.get(`${x.id}|||${c.id}`)||0;
          }
        }
        if(bad)continue;
        next.push({
          legs:[...st.legs,c],
          lastIdx:i,
          positiveLift:st.positiveLift+bonus,
          rough:st.rough+modeCandidateScore(c,mode,bonus)
        });
      }
    }
    next.sort((a,b)=>b.rough-a.rough);
    beam=next.slice(0,beamSize);
    if(!beam.length)return {error:'No conflict-free combination satisfies those settings.'};
  }

  const excluded=new Set(excludedSignatures||[]);
  const finals=[];
  for(const st of beam){
    const sig=signature(st.legs);
    if(excluded.has(sig))continue;
    const ev=evaluateCombination(st.legs,boardById);
    if(!ev)continue;
    // Correlated mode should actually contain positive same-game lift when possible.
    if(mode==='correlated'&&active.length&&st.positiveLift<=0&&beam.some(x=>x.positiveLift>0))continue;
    finals.push({...st,signature:sig,evaluation:ev,score:finalScore(ev,mode,st.positiveLift)});
  }
  finals.sort((a,b)=>b.score-a.score);
  const best=finals[0];
  if(!best)return {error:'No alternate combination remains for these settings.'};
  return {
    legs:best.legs,
    signature:best.signature,
    evaluation:best.evaluation,
    positiveLift:round(best.positiveLift,6),
    mode,
    legCount,
    maxGames,
    boardById,
  };
}
