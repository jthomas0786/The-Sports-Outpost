const MARKET_ALIASES={
  passing_yards:'passYds',pass_yds:'passYds',passyds:'passYds',passyards:'passYds',passyardsline:'passYds',
  passing_tds:'passTds',pass_tds:'passTds',passtds:'passTds',passing_touchdowns:'passTds',
  completions:'completions',passing_completions:'completions',pass_completions:'completions',
  rushing_yards:'rushYds',rush_yds:'rushYds',rushyds:'rushYds',rushyards:'rushYds',
  rushing_tds:'rushTds',rush_tds:'rushTds',rushtds:'rushTds',rushing_touchdowns:'rushTds',
  receiving_yards:'recYds',rec_yds:'recYds',recyds:'recYds',receivingyards:'recYds',
  receptions:'receptions',reception:'receptions',rec:'receptions',catches:'receptions',
  receiving_tds:'recTds',rec_tds:'recTds',rectds:'recTds',receiving_touchdowns:'recTds',
  anytime_td:'atd',anytime_touchdown:'atd',anytime_td_scorer:'atd',atd:'atd'
};
const SPORTSBOOK_KEYS={passYds:'passYds',passTds:'passTds',completions:'completions',rushYds:'rushYds',recYds:'recYds',receptions:'receptions'};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=4)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(Number(v).toFixed(d)):null;

export function normalizeMarket(value){
  const raw=String(value??'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  if(MARKET_ALIASES[raw])return MARKET_ALIASES[raw];
  const compact=raw.replace(/_/g,'');
  return MARKET_ALIASES[compact]||null;
}
export function metricForMarket(value){const market=normalizeMarket(value)||value;return market==='atd'?null:market||null;}

export function americanToImplied(price){
  const p=finite(price);if(p==null||p===0)return null;
  return p>0?100/(p+100):Math.abs(p)/(Math.abs(p)+100);
}
export function devigTwoWay(overPrice,underPrice){
  const over=americanToImplied(overPrice),under=americanToImplied(underPrice);
  if(over==null||under==null)return null;
  const total=over+under;if(!(total>0))return null;
  return {over:over/total,under:under/total,hold:total-1};
}

function erf(x){
  const sign=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a);
  const y=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-a*a);
  return sign*y;
}
function normalCdf(x,mean,sd){if(!(sd>0))return x<mean?0:1;return clamp(.5*(1+erf((x-mean)/(sd*Math.SQRT2))));}
function robustSd(dist){
  const p10=finite(dist?.p10),p90=finite(dist?.p90),p25=finite(dist?.p25),p75=finite(dist?.p75),min=finite(dist?.min),max=finite(dist?.max);
  const candidates=[];
  if(p10!=null&&p90!=null&&p90>p10)candidates.push((p90-p10)/2.5631031311);
  if(p25!=null&&p75!=null&&p75>p25)candidates.push((p75-p25)/1.3489795004);
  if(candidates.length)return Math.max(.05,candidates.reduce((a,b)=>a+b,0)/candidates.length);
  if(min!=null&&max!=null&&max>min)return Math.max(.05,(max-min)/5.15);
  return null;
}
function exactLineProbability(playerSim,market,line,side){
  const key=SPORTSBOOK_KEYS[market];if(!key)return null;
  const row=playerSim?.sportsbook?.[side]?.[key];
  const rowLine=finite(row?.line),prob=finite(row?.probability);
  if(rowLine==null||prob==null||line==null||Math.abs(rowLine-line)>.001)return null;
  return clamp(prob);
}
function approximateLineProbabilities(dist,line){
  const mean=finite(dist?.mean),sd=robustSd(dist);if(mean==null||line==null)return null;
  if(!(sd>0)){
    const over=mean>line?1:0,under=mean<line?1:0,push=mean===line?1:0;
    return {over,under,push,method:'degenerate'};
  }
  const integer=Math.abs(line-Math.round(line))<1e-9;
  if(integer){
    const under=normalCdf(line-.5,mean,sd),over=1-normalCdf(line+.5,mean,sd),push=clamp(1-over-under);
    return {over:clamp(over),under:clamp(under),push,method:'distribution'};
  }
  const under=normalCdf(line,mean,sd),over=clamp(1-under);
  return {over,under:clamp(under),push:0,method:'distribution'};
}
function simulationProbabilities(playerSim,market,line){
  if(market==='atd'){
    const p=finite(playerSim?.probabilities?.atd);return p==null?null:{over:clamp(p),under:clamp(1-p),push:0,method:'exact-atd'};
  }
  const exactOver=exactLineProbability(playerSim,market,line,'over'),exactUnder=exactLineProbability(playerSim,market,line,'under');
  if(exactOver!=null||exactUnder!=null){
    const over=exactOver??clamp(1-exactUnder),under=exactUnder??clamp(1-exactOver),push=clamp(1-over-under);
    return {over,under,push,method:'exact-line'};
  }
  const dist=playerSim?.distributions?.[market];
  return approximateLineProbabilities(dist,line);
}
function tierFor(edgePoints,tsoProbability){
  if(edgePoints==null)return 'Model';
  if(edgePoints>=7&&tsoProbability>=.58)return 'High edge';
  if(edgePoints>=4&&tsoProbability>=.54)return 'Positive edge';
  if(edgePoints>0)return 'Lean';
  return 'No edge';
}

export function buildTsoPropView({playerSim,market,line=null,side='over',price=null,oppositePrice=null,iterations=null}={}){
  const canonical=normalizeMarket(market);if(!playerSim||!canonical)return null;
  const selectedSide=String(side||'over').toLowerCase()==='under'?'under':'over';
  const resolvedLine=canonical==='atd'?null:finite(line);
  const dist=canonical==='atd'?null:playerSim?.distributions?.[canonical];
  const probs=simulationProbabilities(playerSim,canonical,resolvedLine);if(!probs)return null;
  const tsoProbability=clamp(selectedSide==='under'?probs.under:probs.over);
  const impliedProbability=americanToImplied(price);
  const fair=oppositePrice!=null?devigTwoWay(selectedSide==='over'?price:oppositePrice,selectedSide==='over'?oppositePrice:price):null;
  const fairMarketProbability=fair?(selectedSide==='under'?fair.under:fair.over):null;
  const marketProbability=fairMarketProbability??impliedProbability;
  const edgePoints=marketProbability==null?null:(tsoProbability-marketProbability)*100;
  const mean=finite(dist?.mean),median=finite(dist?.median??dist?.p50),projection=mean??median;
  const projectionEdge=resolvedLine==null||projection==null?null:projection-resolvedLine;
  return {
    market:canonical,line:resolvedLine,side:selectedSide,iterations:finite(iterations),simulationReady:true,
    mean,median,p10:finite(dist?.p10),p25:finite(dist?.p25),p50:finite(dist?.p50??dist?.median),p75:finite(dist?.p75),p90:finite(dist?.p90),
    overProbability:round(probs.over),underProbability:round(probs.under),pushProbability:round(probs.push),tsoProbability:round(tsoProbability),
    impliedProbability:round(impliedProbability),fairMarketProbability:round(fairMarketProbability),marketProbability:round(marketProbability),
    edgePoints:round(edgePoints,2),projection:round(projection,2),projectionEdge:round(projectionEdge,2),probabilityMethod:probs.method,
    edgeBasis:fairMarketProbability!=null?'fair-market':impliedProbability!=null?'implied':'model-only',tier:tierFor(edgePoints,tsoProbability)
  };
}

export const __V8917_PROP_TEST__={robustSd,approximateLineProbabilities,simulationProbabilities,normalCdf};
