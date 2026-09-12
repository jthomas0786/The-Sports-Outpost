/**
 * The Sports Outpost — v88.4 rolling multi-game halftime parlay optimizer.
 *
 * Changes from v88:
 * - no arbitrary 6-leg cap;
 * - no arbitrary 3-game cap;
 * - can require at least one leg from every selected READY game;
 * - exact same-world evaluation stays intact inside each game;
 * - separate games are multiplied only after each game's exact joint is known.
 */
const MARKET_LABELS={
  passYds:'Passing Yards',passTds:'Passing TDs',completions:'Completions',
  rushYds:'Rushing Yards',recYds:'Receiving Yards',receptions:'Receptions',
  interceptions:'Interceptions',atd:'Anytime TD',twoPlusTd:'2+ TDs',longestRec:'Longest Reception'
};
const POPCOUNT=Uint8Array.from({length:256},(_,n)=>{let x=n,c=0;while(x){c+=x&1;x>>=1;}return c;});

export function marketLabel(k){return MARKET_LABELS[k]||String(k||'Prop');}
export function impliedFromAmerican(price){const p=Number(price);if(!Number.isFinite(p)||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);}
export function americanToDecimal(price){const p=Number(price);if(!Number.isFinite(p)||p===0)return null;return p>0?1+p/100:1+100/(-p);}
export function probabilityToAmerican(prob){const p=Number(prob);if(!(p>0&&p<1))return null;return p>=.5?Math.round(-100*p/(1-p)):Math.round(100*(1-p)/p);}
export function formatAmerican(v){const n=Number(v);return Number.isFinite(n)?(n>0?`+${Math.round(n)}`:`${Math.round(n)}`):'—';}
const round=(v,n=4)=>{const p=10**n;return Math.round(Number(v)*p)/p;};
function decodeBase64(b64){
  if(!b64)return null;
  if(typeof atob==='function'){
    const raw=atob(b64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(b64,'base64'));
  return null;
}
function maskFor(c){
  try { return decodeBase64(c.worldMaskB64); } catch { return null; }
}
function sameCandidate(a,b){
  return !!b && ['id','gameId','playerId','market','side','line','price','book','worldMaskB64','worldMaskIterations','simProbability','bookFairProbability','edge'].every(k=>a[k]===b[k]);
}
function contradictory(a,b){
  return String(a.gameId)===String(b.gameId)&&String(a.playerId)===String(b.playerId)&&String(a.market)===String(b.market)&&String(a.side)!==String(b.side);
}
function gameConflictSet(board){
  const s=new Set();
  for(const x of board?.correlations?.conflicts||[]){s.add(`${x.a}|||${x.b}`);s.add(`${x.b}|||${x.a}`);}
  return s;
}
function gamePositiveMap(board){
  const m=new Map();
  for(const x of board?.correlations?.positive||[]){m.set(`${x.a}|||${x.b}`,Number(x.lift)||0);m.set(`${x.b}|||${x.a}`,Number(x.lift)||0);}
  return m;
}
function exactGameJoint(board,legs){
  if(!legs.length)return null;
  const iterations=Number(board?.iterations)||Number(legs[0]?.worldMaskIterations)||0;
  if(!Number.isInteger(iterations)||iterations<=0)return null;
  if(legs.some(c=>Number(c.worldMaskIterations)!==iterations))return null;
  const masks=legs.map(maskFor);if(masks.some(x=>!x||x.length!==Math.ceil(iterations/8)))return null;
  const bytes=Math.ceil(iterations/8);let hits=0;
  for(let i=0;i<bytes;i++){
    let v=255;for(const m of masks)v&=(m[i]??0);
    if(i===bytes-1&&iterations%8)v&=(1<<(iterations%8))-1;
    hits+=POPCOUNT[v];
  }
  return hits/iterations;
}
export function evaluateCombination(legs,boardById){
  if(!legs?.length || new Set(legs.map(c=>c.id)).size!==legs.length)return null;
  for(let i=0;i<legs.length;i++){
    const c=legs[i],board=boardById.get(String(c.gameId));
    if(!sameCandidate(c,board?.candidates?.find(x=>x.id===c.id)))return null;
    if(legs.slice(0,i).some(x=>contradictory(x,c)))return null;
  }
  const groups=new Map();
  for(const c of legs){const id=String(c.gameId),a=groups.get(id)||[];a.push(c);groups.set(id,a);}
  let joint=1,exact=true;
  for(const [gameId,glegs] of groups){
    const board=boardById.get(String(gameId));
    let gp=exactGameJoint(board,glegs);
    if(gp==null)return null;
    joint*=gp;
  }
  const independent=legs.reduce((p,c)=>p*Number(c.simProbability||0),1);
  const bookFair=legs.reduce((p,c)=>p*Number(c.bookFairProbability||impliedFromAmerican(c.price)||1),1);
  const decimal=legs.reduce((p,c)=>p*(americanToDecimal(c.price)||1),1);
  const marketAmerican=decimal>1?(decimal>=2?Math.round((decimal-1)*100):Math.round(-100/(decimal-1))):null;
  const tsoAmerican=probabilityToAmerican(joint);
  const avgEdge=legs.reduce((a,c)=>a+Number(c.edge||0),0)/legs.length;
  return {
    jointProbability:round(joint,8),independentProbability:round(independent,8),
    correlationAdvantage:round(joint-independent,8),bookFairProbability:round(bookFair,8),
    parlayEdge:round(joint-bookFair,8),averageLegEdge:round(avgEdge,5),
    marketPriceEstimateAmerican:marketAmerican,tsoFairAmerican:tsoAmerican,
    exactSameWorld:exact,gamesUsed:groups.size,
  };
}
function modeCandidateScore(c,mode,positiveBonus=0){
  const p=Number(c.simProbability||0),e=Number(c.edge||0),dec=americanToDecimal(c.price)||1;
  if(mode==='safest')return p*3+e;
  if(mode==='bestEdge')return e*5+p;
  if(mode==='longshot')return Math.log(Math.max(1.001,dec))*1.3+e*2+p*.25;
  if(mode==='correlated')return positiveBonus*8+e*2+p*.7;
  if(mode==='balanced')return p*1.5+e*3+Math.log(Math.max(1.001,dec))*.25;
  return p*1.8+e*3.7+positiveBonus*3;
}
function finalScore(ev,mode,positiveLift=0){
  const joint=ev.jointProbability,edge=ev.parlayEdge,corr=ev.correlationAdvantage;
  if(mode==='safest')return joint*8+edge;
  if(mode==='bestEdge')return edge*9+joint*2;
  if(mode==='longshot')return Math.log(Math.max(1.001,(Math.abs(ev.marketPriceEstimateAmerican||0)+100)/100))*2+edge*4+joint;
  if(mode==='correlated')return corr*12+positiveLift*6+edge*3+joint*2;
  if(mode==='balanced')return joint*4+edge*6+corr*3;
  return joint*4.5+edge*6.5+corr*4;
}
const signature=legs=>legs.map(c=>c.id).sort().join('~~');

export function optimizeHalftimeParlay({
  boards=[],selectedGameIds=null,legCount=4,maxGames=null,mode='tsoPick',
  requireEverySelectedGame=true,excludedSignatures=[],beamSize=null,candidateLimitPerGame=null
}={}){
  const selected=new Set((selectedGameIds||boards.map(b=>String(b.gameId))).map(String));
  const active=boards.filter(b=>b?.ready&&selected.has(String(b.gameId))&&Array.isArray(b.candidates)&&b.candidates.length);
  if(!active.length)return {error:'No selected halftime game has a ready candidate pool.'};

  const allAvailable=active.reduce((n,b)=>n+(b.candidates?.length||0),0);
  legCount=Math.max(2,Math.floor(Number(legCount)||4));
  if(legCount>allAvailable)return {error:`Only ${allAvailable} qualified halftime legs are available; ${legCount} requested.`};
  if(requireEverySelectedGame&&legCount<active.length){
    return {error:`${active.length} ready games are selected. Choose at least ${active.length} legs to include every selected game.`};
  }
  const gameCap=maxGames==null?Infinity:Math.max(1,Math.floor(Number(maxGames)||1));
  const boardById=new Map(active.map(b=>[String(b.gameId),b]));
  const conflicts=new Map(active.map(b=>[String(b.gameId),gameConflictSet(b)]));
  const positives=new Map(active.map(b=>[String(b.gameId),gamePositiveMap(b)]));

  const candidates=[];
  for(const b of active){
    const byId=new Map((b.candidates||[]).map(c=>[c.id,c]));
    const rankingKey=mode==='bestEdge'?'bestEdge':mode==='safest'?'safest':mode==='longshot'?'longshot':mode==='balanced'?'balanced':mode==='correlated'?'correlated':'tsoPick';
    const ranked=(b.rankings?.[rankingKey]||[]).map(id=>byId.get(id)).filter(Boolean);
    const remainder=(b.candidates||[]).filter(c=>!ranked.includes(c));
    const combined=[...ranked,...remainder];
    const pool=candidateLimitPerGame!=null&&Number.isFinite(Number(candidateLimitPerGame))?combined.slice(0,Math.max(1,Number(candidateLimitPerGame))):combined;
    for(const c of pool)candidates.push(c);
  }
  if(candidates.length<legCount)return {error:`Only ${candidates.length} optimizer candidates remain; ${legCount} requested.`};

  candidates.sort((a,b)=>{
    const pa=positives.get(String(a.gameId)),pb=positives.get(String(b.gameId));
    const ba=[...((pa&&pa.values())||[])].reduce((x,y)=>x+y,0),bb=[...((pb&&pb.values())||[])].reduce((x,y)=>x+y,0);
    return modeCandidateScore(b,mode,bb)-modeCandidateScore(a,mode,ba);
  });

  const adaptiveBeam=Number.isFinite(Number(beamSize))?Math.max(50,Number(beamSize)):(legCount<=6?700:legCount<=10?500:legCount<=16?350:240);
  const activeGameIds=new Set(active.map(b=>String(b.gameId)));
  let beam=[{legs:[],rough:0,positiveLift:0,lastIdx:-1,games:new Set()}];

  for(let depth=0;depth<legCount;depth++){
    const next=[];
    const remainingAfter=legCount-(depth+1);
    for(const st of beam){
      for(let i=st.lastIdx+1;i<candidates.length;i++){
        const c=candidates[i],gid=String(c.gameId);
        const games=new Set(st.games);const isNew=!games.has(gid);games.add(gid);
        if(games.size>gameCap)continue;
        if(requireEverySelectedGame){
          let missing=0;for(const id of activeGameIds)if(!games.has(id))missing++;
          if(missing>remainingAfter)continue;
        }
        let bad=false,bonus=0;
        for(const x of st.legs){
          if(contradictory(x,c)){bad=true;break;}
          if(String(x.gameId)===gid){
            if(conflicts.get(gid)?.has(`${x.id}|||${c.id}`)){bad=true;break;}
            bonus+=positives.get(gid)?.get(`${x.id}|||${c.id}`)||0;
          }
        }
        if(bad)continue;
        const coverageBonus=requireEverySelectedGame&&isNew?.45:0;
        next.push({legs:[...st.legs,c],lastIdx:i,games,positiveLift:st.positiveLift+bonus,rough:st.rough+modeCandidateScore(c,mode,bonus)+coverageBonus});
      }
    }
    next.sort((a,b)=>b.rough-a.rough);
    beam=next.slice(0,adaptiveBeam);
    if(!beam.length)return {error:'No conflict-free combination satisfies those settings.'};
  }

  const excluded=new Set(excludedSignatures||[]),finals=[];
  for(const st of beam){
    if(requireEverySelectedGame&&st.games.size<activeGameIds.size)continue;
    const sig=signature(st.legs);if(excluded.has(sig))continue;
    const ev=evaluateCombination(st.legs,boardById);if(!ev||ev.jointProbability<=0)continue;
    if(mode==='correlated'&&active.length&&st.positiveLift<=0&&beam.some(x=>x.positiveLift>0))continue;
    finals.push({...st,signature:sig,evaluation:ev,score:finalScore(ev,mode,st.positiveLift)});
  }
  finals.sort((a,b)=>b.score-a.score);
  const best=finals[0];
  if(!best)return {error:'No alternate combination remains for these settings.'};
  return {
    legs:best.legs,signature:best.signature,evaluation:best.evaluation,
    positiveLift:round(best.positiveLift,6),mode,legCount,
    maxGames:Number.isFinite(gameCap)?gameCap:null,requireEverySelectedGame,
    selectedReadyGames:active.length,boardById,
  };
}
