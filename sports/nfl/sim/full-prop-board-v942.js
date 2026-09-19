import { probability, round } from './utils.js';

const STYLE_KEYS=['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot'];
const MARKET_META={
  rushYds:{stat:'rushYds',label:'Rushing Yards'},
  recYds:{stat:'recYds',label:'Receiving Yards'},
  receptions:{stat:'receptions',label:'Receptions'},
  passYds:{stat:'passYds',label:'Passing Yards'},
  passTds:{stat:'passTds',label:'Passing TDs'},
  completions:{stat:'completions',label:'Completions'},
  atd:{stat:'tds',label:'Anytime TD',binary:true},
};
const POPCOUNT=Uint8Array.from({length:256},(_,n)=>{let c=0,x=n;while(x){c+=x&1;x>>=1;}return c;});

const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const normName=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const normTeam=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const pairKey=(a,b)=>[normTeam(a),normTeam(b)].sort().join('|');
const americanImplied=price=>{const p=finite(price);if(p==null||p===0)return null;return p>0?100/(p+100):(-p)/((-p)+100);};

function bestOffer(branch){
  const direct=branch?.best;
  if(direct&&finite(direct.price)!=null)return direct;
  return [...(branch?.all||[])].filter(x=>finite(x?.price)!=null).sort((a,b)=>Number(b.price)-Number(a.price))[0]||null;
}
function marketChoices(slot,market){
  if(!slot)return[];
  if(MARKET_META[market]?.binary){
    const offer=bestOffer(slot);
    return offer?[{side:'over',line:.5,offer}]:[];
  }
  const source=Array.isArray(slot.alternates)&&slot.alternates.length?slot.alternates:(finite(slot.line)!=null?[{line:Number(slot.line),over:slot.over,under:slot.under}]:[]);
  const out=[],seen=new Set();
  for(const row of source){
    const line=finite(row?.line);if(line==null)continue;
    for(const side of ['over','under']){
      const offer=bestOffer(row?.[side]);if(!offer)continue;
      const key=`${side}|${line}`;if(seen.has(key))continue;seen.add(key);
      out.push({side,line,offer});
    }
  }
  return out;
}
function matchOddsGame(odds,game){
  const id=String(game?.gameId||game?.id||'');
  const pair=pairKey(game?.away?.abbr,game?.home?.abbr);
  return (odds?.games||[]).find(g=>String(g?.gameId||g?.fixtureId||'')===id||pairKey(g?.away,g?.home)===pair)||null;
}
function buildSampleIndex(samples){
  const byId=new Map(),byName=new Map();
  for(const [key,rec] of samples?.players||[]){
    const p=rec?.player||{};
    for(const id of [key,p.key,p.playerId,p.espnId,p.gsisId])if(id!=null&&String(id))byId.set(String(id),rec);
    byName.set(`${normTeam(p.team)}|${normName(p.name)}`,rec);
  }
  return {byId,byName};
}
function buildPublicIndex(result){
  const byId=new Map(),byName=new Map();
  for(const p of result?.players||[]){
    for(const id of [p.playerId,p.espnId,p.gsisId])if(id!=null&&String(id))byId.set(String(id),p);
    byName.set(`${normTeam(p.team)}|${normName(p.name)}`,p);
  }
  return {byId,byName};
}
function findSample(index,p){
  for(const id of [p?.playerId,p?.espnId,p?.gsisId])if(id!=null&&index.byId.has(String(id)))return index.byId.get(String(id));
  return index.byName.get(`${normTeam(p?.team)}|${normName(p?.name)}`)||null;
}
function findPublic(index,p){
  for(const id of [p?.playerId,p?.espnId,p?.gsisId])if(id!=null&&index.byId.has(String(id)))return index.byId.get(String(id));
  return index.byName.get(`${normTeam(p?.team)}|${normName(p?.name)}`)||null;
}
function exactProbability(rec,market,line,side,iterations){
  const meta=MARKET_META[market],stat=rec?.stats?.[meta?.stat];
  if(!meta||!stat||!iterations)return null;
  if(meta.binary)return probability(stat,v=>Number(v)>=1,iterations);
  return probability(stat,v=>side==='under'?Number(v)<line:Number(v)>line,iterations);
}
function rowKey(p,market){return `${String(p?.playerId||p?.espnId||p?.gsisId||`${normTeam(p?.team)}|${normName(p?.name)}`)}|${market}`;}
function candidateId(gameId,p,market,side,line){return `${gameId}|full|${rowKey(p,market)}|${side}|${line}`;}
function payoutBonus(price){const p=finite(price);if(p==null)return 0;if(p>0)return Math.min(.22,p/1800);return Math.max(-.10,(p+110)/2200);}
function styleScore(c,style){
  const p=c.simProbability,e=c.edge??-.5,payout=payoutBonus(c.price);
  if(style==='safest')return p*1.05+e*.08;
  if(style==='bestEdge')return e*1.2+p*.15+payout*.04;
  if(style==='balanced')return 1-Math.abs(p-.68)*2.7+e*.35+payout*.05;
  if(style==='aggressive')return 1-Math.abs(p-.59)*3.0+e*.30+payout*.18;
  if(style==='longshot')return 1-Math.abs(p-.52)*3.4+e*.24+payout*.34;
  return p*.58+e*.42+payout*.08;
}
function qualifies(c,style){
  const p=c.simProbability,e=c.edge??-1,price=finite(c.price);
  if(style==='safest')return p>=.62&&e>=-.08;
  if(style==='bestEdge')return p>=.46&&e>=.015;
  if(style==='balanced')return p>=.57&&p<=.80&&e>=-.01;
  if(style==='aggressive')return p>=.50&&p<=.67&&e>=-.02;
  if(style==='longshot')return p>=.40&&p<=.59&&price!=null&&price>=100&&e>=-.03;
  return p>=.52&&e>=0;
}
function choose(candidates,style){
  const eligible=candidates.filter(c=>qualifies(c,style));
  if(!eligible.length)return null;
  return [...eligible].sort((a,b)=>styleScore(b,style)-styleScore(a,style)||b.edge-a.edge||b.simProbability-a.simProbability)[0];
}
function hitMask(candidate,iterations){
  const stat=candidate?._sample?.stats?.[MARKET_META[candidate.market]?.stat];
  if(!stat)return null;
  const bytes=new Uint8Array(Math.ceil(iterations/8));
  for(let i=0;i<iterations;i++){
    const v=Number(stat[i]||0);
    const hit=MARKET_META[candidate.market]?.binary?v>=1:(candidate.side==='under'?v<candidate.line:v>candidate.line);
    if(hit)bytes[i>>3]|=1<<(i&7);
  }
  return bytes;
}
function jointProbability(a,b,iterations){
  if(!a||!b||!iterations)return 0;
  let hits=0;const n=Math.min(a.length,b.length);
  for(let i=0;i<n;i++)hits+=POPCOUNT[a[i]&b[i]];
  return hits/iterations;
}
function addCorrelationLift(selected,iterations){
  const ranked=[...selected].sort((a,b)=>styleScore(b,'balanced')-styleScore(a,'balanced')).slice(0,24);
  const masks=new Map(ranked.map(c=>[c.id,hitMask(c,iterations)]));
  for(const c of selected){
    const cm=masks.get(c.id)||hitMask(c,iterations);let best=0,partner=null;
    for(const other of ranked){
      if(other.id===c.id||other.playerId===c.playerId)continue;
      const om=masks.get(other.id);if(!cm||!om)continue;
      const lift=jointProbability(cm,om,iterations)-(c.simProbability*other.simProbability);
      if(lift>best){best=lift;partner=other;}
    }
    c.correlationLift=round(best,4);
    c.correlationPartner=partner?`${partner.name} ${partner.marketLabel}`:null;
  }
}
function publicCandidate(c){
  const {_sample,...rest}=c;
  return rest;
}

export function buildPregameFullPropBoard({result,game,odds,generatedAt=new Date().toISOString()}={}){
  const samples=result?._samples,iterations=Number(samples?.iterations||result?.iterations||0),gameId=String(game?.gameId||game?.id||result?.game?.gameId||'');
  const base={schemaVersion:1,boardVersion:'v94.2',generatedAt,gameId,iterations,ready:false,candidates:[],rankings:Object.fromEntries(STYLE_KEYS.map(k=>[k,[]]))};
  if(!samples?.players||!iterations)return base;
  const oddsGame=matchOddsGame(odds,game||result?.game);if(!oddsGame)return base;
  const sampleIndex=buildSampleIndex(samples),publicIndex=buildPublicIndex(result),groups=new Map();

  for(const op of oddsGame.players||[]){
    const rec=findSample(sampleIndex,op);if(!rec)continue;
    const pub=findPublic(publicIndex,op)||{};
    const identity={
      playerId:String(pub.playerId||rec.player?.key||op.playerId||''),espnId:pub.espnId||rec.player?.espnId||null,gsisId:pub.gsisId||rec.player?.gsisId||null,
      name:pub.name||rec.player?.name||op.name,team:normTeam(pub.team||rec.player?.team||op.team),position:pub.position||rec.player?.position||op.position||'',
    };
    for(const [market,meta] of Object.entries(MARKET_META)){
      const slot=op?.odds?.[market];if(!slot)continue;
      const dist=pub?.distributions?.[meta.stat]||null;
      for(const choice of marketChoices(slot,market)){
        const price=finite(choice.offer?.price),implied=americanImplied(price),sim=exactProbability(rec,market,choice.line,choice.side,iterations);
        if(price==null||implied==null||sim==null)continue;
        const c={
          id:candidateId(gameId,identity,market,choice.side,choice.line),key:rowKey(identity,market),gameId,...identity,
          market,marketLabel:meta.label,side:choice.side,line:Number(choice.line),price,book:choice.offer?.book||'Sportsbook',link:choice.offer?.link||null,
          simProbability:round(sim,4),impliedProbability:round(implied,4),edge:round(sim-implied,4),projection:dist||null,iterations,
          _sample:rec,
        };
        if(!groups.has(c.key))groups.set(c.key,[]);groups.get(c.key).push(c);
      }
    }
  }

  const selectedByStyle={};
  for(const style of STYLE_KEYS.filter(s=>s!=='correlated')){
    const picks=[];
    for(const group of groups.values()){
      const c=choose(group,style);if(c)picks.push(c);
    }
    selectedByStyle[style]=picks.sort((a,b)=>styleScore(b,style)-styleScore(a,style)||b.edge-a.edge||b.simProbability-a.simProbability);
  }
  const correlated=[];
  for(const group of groups.values()){
    const c=choose(group,'balanced')||choose(group,'tsoPick');if(c)correlated.push(c);
  }
  addCorrelationLift(correlated,iterations);
  selectedByStyle.correlated=correlated.sort((a,b)=>(b.correlationLift||0)-(a.correlationLift||0)||styleScore(b,'balanced')-styleScore(a,'balanced'));

  const union=new Map();
  for(const style of STYLE_KEYS){
    const picks=selectedByStyle[style]||[];
    base.rankings[style]=picks.map(c=>{union.set(c.id,c);return c.id;});
  }
  base.candidates=[...union.values()].map(publicCandidate);
  base.ready=base.candidates.length>0&&STYLE_KEYS.some(k=>base.rankings[k].length>0);
  return base;
}

export const __NFL_FULL_PROP_BOARD_V942_TEST__={STYLE_KEYS,MARKET_META,americanImplied,marketChoices,styleScore,qualifies,choose};
