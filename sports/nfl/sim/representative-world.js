/* Representative Monte Carlo world selection.
 * Select one *actual* index from the same joint 50,000 worlds and retain
 * the observed player outcomes at that index. Do not independently pick
 * score / props from marginal distributions.
 * This is a central outcome, NOT a guarantee or the uniquely "most likely" game.
 */
export function representativeWorldFromArrays({awayScores,homeScores,arrays,game,iterations}){
 if(!awayScores||!homeScores||iterations<100||!arrays?.size)return null;
 const finite=x=>Number.isFinite(Number(x))?Number(x):0;
 const avg=values=>{let sum=0;for(let i=0;i<iterations;i++)sum+=finite(values[i]);return sum/iterations};
 const awayMean=avg(awayScores),homeMean=avg(homeScores);
 const expectedTotal=awayMean+homeMean,expectedMargin=homeMean-awayMean;
 const ranked=[...arrays.values()].filter(rec=>
   (rec.player?.position==='QB'||rec.player?.position==='RB'||rec.player?.position==='WR'||rec.player?.position==='TE')&&
   (avg(rec.stats?.targets||[])>3||avg(rec.stats?.carries||[])>5||avg(rec.stats?.attempts||[])>15))
   .sort((a,b)=>{
    const weight=p=>p.player?.position==='QB'?70:0;
    const volume=r=>weight(r)+avg(r.stats?.targets||[])*2+avg(r.stats?.carries||[]);
    return volume(b)-volume(a)
   }).slice(0,16);
 // Only precompute a handful of player means; keep 50K scan O(iterations).
 const playerFeatures=ranked.map(rec=>{
  const stats=rec.stats||{};
  const key=rec.player?.position==='QB'?'attempts':
   ['RB','FB'].includes(rec.player?.position)?'carries':'targets';
  const vals=stats[key],mean=avg(vals);
  let variance=0;
  for(let i=0;i<iterations;i++)variance+=(finite(vals[i])-mean)**2;
  const sd=Math.max(1.5,Math.sqrt(variance/iterations));
  return {rec,key,mean,sd};
 });
 const plausible=[];
 for(let i=0;i<iterations;i++){
  const away=finite(awayScores[i]),home=finite(homeScores[i]);
  if(away<9||home<9||away>45||home>45)continue;
  const dist=Math.pow((away-awayMean)/8,2)+Math.pow((home-homeMean)/8,2)+
   Math.pow(((home-away)-expectedMargin)/13,2);
  // Only choose near-center scorelines; avoid selecting a 6-point outlier.
  if(dist>5.5)continue;
  plausible.push({i,score:dist});
 }
 if(!plausible.length)return null;
 plausible.sort((a,b)=>a.score-b.score||a.i-b.i);
 const candidates=plausible.slice(0,Math.min(256,plausible.length));
 let best=null;
 for(const candidate of candidates){
  let usage=0;
  for(const f of playerFeatures){
   const z=(finite(f.rec.stats[f.key][candidate.i])-f.mean)/f.sd;
   usage+=Math.min(12,z*z)*.085;
  }
  const margin=homeScores[candidate.i]-awayScores[candidate.i];
  const closeness=Math.abs(expectedMargin)<3&&margin===0?.33:0;
  const grade=candidate.score+usage+closeness;
  if(!best||grade<best.grade)best={i:candidate.i,grade};
 }
 const index=best.i;
 const players=[...arrays.values()].map(rec=>{
  const stats={};
  for(const [k,values]of Object.entries(rec.stats||{})){
   stats[k]=finite(values[index]);
  }
  return {playerId:String(rec.player.key||''),name:rec.player.name,
   team:rec.player.team,position:rec.player.position,stats};
 }).filter(p=>p.name&&p.team);
 return {
  schemaVersion:1,selection:'central-correlated-sampled-world',
  description:'One actual simulation iteration nearest the 50K joint scoring center with realistic player opportunity',
  sampledIndex:index,iterations,grade:Number(best.grade.toFixed(4)),
  awayScore:finite(awayScores[index]),homeScore:finite(homeScores[index]),
  meanAway:Number(awayMean.toFixed(2)),meanHome:Number(homeMean.toFixed(2)),
  players
 };
}
