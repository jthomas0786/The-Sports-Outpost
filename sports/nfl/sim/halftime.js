import { evaluateLegFromArrays, jointProbabilityFromResult } from './engine.js';
import { normName, normTeam, round } from './utils.js';

const PROP_KEYS = ['passYds','passTds','completions','rushYds','recYds','receptions','atd'];

export function impliedFromAmerican(price){
  const p=Number(price);
  if(!Number.isFinite(p)||p===0) return null;
  return p>0 ? 100/(p+100) : (-p)/((-p)+100);
}

function finite(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
function bestPrice(slot,side='over'){
  if(!slot) return null;
  if(side==='atd') return slot?.best || null;
  return slot?.[side]?.best || null;
}
function matchOddsGame(game,liveOdds){
  const id=String(game?.gameId||game?.id||'');
  const away=normTeam(game?.away?.abbr||game?.away);
  const home=normTeam(game?.home?.abbr||game?.home);
  return (liveOdds?.games||[]).find(g=>
    String(g?.gameId||'')===id ||
    [normTeam(g?.away),normTeam(g?.home)].sort().join('|')===[away,home].sort().join('|')
  )||null;
}
function matchOddsPlayer(player,oddsGame){
  const nk=normName(player?.name);
  const team=normTeam(player?.team);
  return (oddsGame?.players||[]).find(p=>normName(p?.name)===nk && (!team || normTeam(p?.team)===team))
    || (oddsGame?.players||[]).find(p=>normName(p?.name)===nk)
    || null;
}
function twoWayFair(side,sidePrice,otherPrice){
  const a=impliedFromAmerican(sidePrice), b=impliedFromAmerican(otherPrice);
  if(a==null) return null;
  if(b==null) return a;
  const sum=a+b;
  return sum>0 ? a/sum : a;
}
function ageSeconds(offer,generatedAt){
  const direct=finite(offer?.ageSeconds);
  if(direct!=null) return direct;
  const raw=offer?.ts;
  let t=finite(raw);
  if(t!=null && t<1e12) t*=1000;
  if(t==null && raw) t=Date.parse(raw);
  const now=Date.parse(generatedAt);
  return Number.isFinite(t)&&Number.isFinite(now)?Math.max(0,(now-t)/1000):null;
}
function candidateGrade(prob,edge){
  if(prob>=.65&&edge>=.08) return 'A+';
  if(prob>=.62&&edge>=.06) return 'A';
  if(prob>=.59&&edge>=.045) return 'A-';
  if(prob>=.56&&edge>=.035) return 'B+';
  if(prob>=.53&&edge>=.02) return 'B';
  return 'C+';
}
function candidateId(gameId,p,market,side,line){
  return `${gameId}|${p.team}|${normName(p.name)}|${market}|${side}|${line}`;
}
function legMask(samples,playerRec,leg){
  const n=samples.iterations;
  const out=new Uint8Array(n);
  const market=String(leg.market||''),side=String(leg.side||'over').toLowerCase(),line=Number(leg.line);
  const statKey={passYds:'passYds',passTds:'passTds',completions:'completions',rushYds:'rushYds',recYds:'recYds',receptions:'receptions',interceptions:'interceptions'}[market];
  for(let i=0;i<n;i++){
    let hit=false;
    if(market==='atd') hit=playerRec.stats.tds[i]>=1;
    else if(market==='2td'||market==='twoPlusTd') hit=playerRec.stats.tds[i]>=2;
    else if(statKey&&Number.isFinite(line)){
      const v=playerRec.stats[statKey][i];
      hit=side==='under'?v<line:v>line;
    }
    if(hit) out[i]=1;
  }
  return out;
}
function pairJoint(a,b,n){
  let hits=0;
  for(let i=0;i<n;i++) if(a[i]&&b[i]) hits++;
  return hits/n;
}
function packMaskBase64(mask,n){
  // 50,000 worlds -> 6,250 bytes/candidate before base64. This is the minimum
  // derived data v88 needs to evaluate arbitrary user parlays exactly without
  // publishing the private per-player stat arrays.
  const bytes=new Uint8Array(Math.ceil(n/8));
  for(let i=0;i<n;i++) if(mask[i]) bytes[i>>3]|=1<<(i&7);
  return Buffer.from(bytes).toString('base64');
}
function longshotValue(c){
  const plus=Math.max(0,Number(c.price)||0);
  const payoutBoost=plus>0?Math.min(2,plus/250):0;
  return c.edge*2.5+c.simProbability*.45+payoutBoost*.12;
}

export function buildHalftimeBoard({result,game,liveGame,liveOdds,config,generatedAt=new Date().toISOString()}){
  const samples=result?._samples;
  const gameId=String(game?.gameId||game?.id||result?.game?.gameId||'');
  const oddsGame=matchOddsGame(game,liveOdds);
  const cfg=config?.halftime||{};
  const minProb=Number(cfg.candidateMinProbability??.53);
  const minEdge=Number(cfg.candidateMinEdge??.02);
  const maxAge=Number(cfg.maxOddsAgeSeconds??600);
  const maxCandidates=Number(cfg.maxCandidatesPerGame??40);
  const corrLimit=Number(cfg.correlationCandidateLimit??24);
  const positiveLift=Number(cfg.positiveLift??.015);
  const conflictLift=Number(cfg.conflictLift??-.015);

  const base={
    schemaVersion:1,
    orchestrationVersion:'v88.0.0',
    generatedAt,
    gameId,
    matchup:`${game?.away?.abbr||result?.game?.away?.abbr||'AWY'} @ ${game?.home?.abbr||result?.game?.home?.abbr||'HME'}`,
    state:{
      status:liveGame?.status||null,
      statusDetail:liveGame?.statusDetail||null,
      period:liveGame?.period??null,
      clockMin:liveGame?.clockMin??null,
      awayScore:liveGame?.awayScore??result?.game?.currentScore?.away??null,
      homeScore:liveGame?.homeScore??result?.game?.currentScore?.home??null,
    },
    iterations:result?.iterations||samples?.iterations||0,
    simGeneratedAt:result?.generatedAt||null,
    oddsFetchedAt:liveOdds?.meta?.fetchedAt||null,
    ready:false,
    readiness:{hasSamples:!!samples,hasLiveOdds:!!oddsGame,eligibleCandidates:0,rejectedCandidates:0},
    candidates:[],
    rankings:{safest:[],bestEdge:[],balanced:[],longshot:[],tsoPick:[]},
    correlations:{pairCount:0,positive:[],conflicts:[],neutralCount:0},
  };
  if(!samples||!oddsGame) return base;

  const publicPlayers=result?.players||[];
  const all=[];
  const rejected=[];
  for(const p of publicPlayers){
    const sampleRec=samples.players.get(String(p.playerId||''));
    if(!sampleRec) continue;
    const op=matchOddsPlayer(p,oddsGame);
    if(!op) continue;
    for(const market of PROP_KEYS){
      const slot=op?.odds?.[market];
      if(!slot) continue;
      const sides=market==='atd'?['atd']:['over','under'];
      for(const side of sides){
        const offer=bestPrice(slot,side);
        const price=finite(offer?.price);
        const line=market==='atd'?.5:finite(slot?.line);
        if(price==null||line==null) continue;
        // A full-game ATD is already resolved once the player has scored. Never
        // surface a stale "anytime" live row as a fresh halftime candidate.
        if(market==='atd' && (Number(p?.current?.rushTds||0)+Number(p?.current?.recTds||0)>0 || Number(p?.current?.tds||0)>0)) continue;
        const leg={playerId:String(p.playerId||''),market,side:side==='atd'?'over':side,line};
        const sim=evaluateLegFromArrays(sampleRec,leg,samples.iterations);
        if(sim==null) continue;
        let fair;
        if(market==='atd') fair=impliedFromAmerican(price);
        else{
          const other=side==='over'?bestPrice(slot,'under'):bestPrice(slot,'over');
          fair=twoWayFair(side,price,finite(other?.price));
        }
        if(fair==null) continue;
        const edge=sim-fair;
        const age=ageSeconds(offer,generatedAt);
        const issues=[];
        if(sim<minProb) issues.push('simulation below minimum');
        if(edge<minEdge) issues.push('edge below minimum');
        if(age!=null&&age>maxAge) issues.push('sportsbook price stale');
        const id=candidateId(gameId,p,market,side,line);
        const c={
          id,gameId,playerId:String(p.playerId||''),espnId:p.espnId||null,name:p.name,team:p.team,position:p.position,
          market,side:side==='atd'?'over':side,line,book:offer?.book||null,price,link:offer?.link||null,
          oddsAgeSeconds:age,
          simProbability:round(sim,4),
          bookFairProbability:round(fair,4),
          edge:round(edge,4),
          grade:candidateGrade(sim,edge),
          current:p.current||null,
          projectedFinal:p?.distributions?.[market]||null,
          eligible:issues.length===0,
          issues,
        };
        (c.eligible?all:rejected).push(c);
      }
    }
  }

  all.sort((a,b)=>b.edge-a.edge||b.simProbability-a.simProbability);
  const candidates=all.slice(0,maxCandidates);
  const byId=new Map(candidates.map(c=>[c.id,c]));
  const masks=new Map();
  // v88 stores ONLY packed candidate hit/miss worlds, never the raw private
  // simulated stat arrays. Browser optimizer can therefore calculate exact
  // same-world joint probability for any 2–6 leg combination instantly.
  for(const c of candidates){
    const rec=samples.players.get(String(c.playerId));
    if(!rec) continue;
    const mask=legMask(samples,rec,c);
    masks.set(c.id,mask);
    c.worldMaskB64=packMaskBase64(mask,samples.iterations);
    c.worldMaskIterations=samples.iterations;
  }
  const corrPool=candidates.slice(0,corrLimit);
  const positive=[],conflicts=[];
  let neutralCount=0,pairCount=0;
  for(let i=0;i<corrPool.length;i++){
    for(let j=i+1;j<corrPool.length;j++){
      const a=corrPool[i],b=corrPool[j],ma=masks.get(a.id),mb=masks.get(b.id);
      if(!ma||!mb) continue;
      const joint=pairJoint(ma,mb,samples.iterations);
      const independent=a.simProbability*b.simProbability;
      const lift=joint-independent;
      const ratio=independent>0?joint/independent:null;
      const row={
        a:a.id,b:b.id,
        jointProbability:round(joint,4),
        independentProbability:round(independent,4),
        lift:round(lift,4),
        ratio:ratio==null?null:round(ratio,3),
      };
      pairCount++;
      if(lift>=positiveLift) positive.push(row);
      else if(lift<=conflictLift) conflicts.push(row);
      else neutralCount++;
    }
  }
  positive.sort((a,b)=>b.lift-a.lift);
  conflicts.sort((a,b)=>a.lift-b.lift);

  const ids=(arr)=>arr.map(x=>x.id);
  const safest=[...candidates].sort((a,b)=>b.simProbability-a.simProbability||b.edge-a.edge);
  const bestEdge=[...candidates].sort((a,b)=>b.edge-a.edge||b.simProbability-a.simProbability);
  const balanced=[...candidates].sort((a,b)=>(b.simProbability*.65+b.edge*1.75)-(a.simProbability*.65+a.edge*1.75));
  const longshot=[...candidates].sort((a,b)=>longshotValue(b)-longshotValue(a));
  const positiveScore=new Map();
  for(const p of positive.slice(0,30)){
    positiveScore.set(p.a,(positiveScore.get(p.a)||0)+p.lift);
    positiveScore.set(p.b,(positiveScore.get(p.b)||0)+p.lift);
  }
  const tsoPick=[...candidates].sort((a,b)=>{
    const sa=a.simProbability*.50+a.edge*1.65+(positiveScore.get(a.id)||0)*.7;
    const sb=b.simProbability*.50+b.edge*1.65+(positiveScore.get(b.id)||0)*.7;
    return sb-sa;
  });

  base.candidates=candidates;
  base.rankings={
    safest:ids(safest.slice(0,12)),
    bestEdge:ids(bestEdge.slice(0,12)),
    balanced:ids(balanced.slice(0,12)),
    longshot:ids(longshot.slice(0,12)),
    tsoPick:ids(tsoPick.slice(0,12)),
  };
  base.correlations={pairCount,positive:positive.slice(0,80),conflicts:conflicts.slice(0,80),neutralCount};
  base.readiness.eligibleCandidates=candidates.length;
  base.readiness.rejectedCandidates=rejected.length;
  base.ready=candidates.length>=2;
  return base;
}

export function jointAcrossGames(gameBoards,legsByGame){
  // Separate NFL games are modeled as independent environments. Same-game legs
  // must use their board's exact same-world joint probability; v88's optimizer
  // will multiply those game-level joints across independent games.
  let p=1;
  for(const [gameId,prob] of Object.entries(legsByGame||{})){
    if(!Number.isFinite(Number(prob))) return null;
    p*=Number(prob);
  }
  return round(p,6);
}
