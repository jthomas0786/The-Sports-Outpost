// NHL Props historical fallback model.
// The strict lineup-confirmed simulation remains the highest-confidence path.
// Until the active regular season has enough completed games, props use the
// last completed season as their verified baseline. Preseason never changes
// the current-season weight.

export const NHL_PROP_REFERENCE_LINES=Object.freeze({
  atg:0.5,
  sog:2.5,
  points:0.5,
  assists:0.5,
  blocks:1.5,
  saves:24.5,
});

export function marketStatKey(market){return market==='atg'?'goals':market;}

export function currentSeasonWeight(games){
  const n=Math.max(0,Number(games)||0);
  if(n<=5)return 0;
  if(n>=20)return 1;
  return (n-5)/15;
}

export function propLine(market,quote){
  const quoted=market==='atg'?(quote?0.5:null):Number(quote?.line);
  if(quoted!=null&&Number.isFinite(quoted)&&quoted>=0)return {line:quoted,reference:false};
  const line=Number(NHL_PROP_REFERENCE_LINES[market]);
  return {line:Number.isFinite(line)?line:null,reference:true};
}

function poissonMetric(mean){
  const lambda=Number(mean);if(!Number.isFinite(lambda)||lambda<0)return null;
  const distribution=[];let p=Math.exp(-lambda),cdf=0,median=0,medianSet=false;
  const hardMax=Math.max(12,Math.ceil(lambda+10*Math.sqrt(lambda+1)+12));
  for(let k=0;k<=hardMax;k++){
    if(k>0)p*=lambda/k;
    if(!Number.isFinite(p)||p<0)break;
    distribution.push([k,p]);cdf+=p;
    if(!medianSet&&cdf>=0.5){median=k;medianSet=true;}
    if(k>=Math.ceil(lambda)+8&&cdf>=0.999999)break;
  }
  // Preserve probability mass if floating-point truncation leaves a tiny tail.
  const total=distribution.reduce((sum,row)=>sum+row[1],0);
  if(total>0&&Math.abs(total-1)>1e-12)for(const row of distribution)row[1]/=total;
  return {mean:lambda,median,atLeastOne:1-Math.exp(-lambda),distribution};
}

export function historicalPropProjection(history,market,currentSeason){
  const key=marketStatKey(market),priorMean=Number(history?.rates?.[key]);
  if(!Number.isFinite(priorMean)||priorMean<0)return null;
  const activeSeason=Number(currentSeason)||Number(history?.season)+1;
  const rows=(history?.recentGames||[]).filter(row=>
    Number(row?.season)===activeSeason&&Number(row?.seasonType)===2&&Number.isFinite(Number(row?.stats?.[key]))
  );
  const currentGames=rows.length;
  const currentMean=currentGames?rows.reduce((sum,row)=>sum+Number(row.stats[key]),0)/currentGames:null;
  const weight=currentSeasonWeight(currentGames);
  const mean=weight>0&&currentMean!=null?priorMean*(1-weight)+currentMean*weight:priorMean;
  const metric=poissonMetric(mean);if(!metric)return null;
  return {
    metric,
    priorSeason:Number(history?.season)||null,
    priorGames:Number(history?.games)||0,
    priorMean,
    currentSeason:activeSeason,
    currentGames,
    currentMean,
    currentWeight:weight,
    source:weight>0?'historical-blend':'historical-prior',
  };
}

export function historicalSourceLabel(model){
  if(!model)return 'Historical data pending';
  const prior=model.priorSeason?`${model.priorSeason-1}–${String(model.priorSeason).slice(-2)}`:'Previous season';
  if(model.currentWeight>0){
    const pct=Math.round(model.currentWeight*100);
    return `${prior} baseline + ${model.currentGames} current GP (${pct}% current)`;
  }
  return `${prior} baseline · current regular season ${model.currentGames}/5 GP`;
}
