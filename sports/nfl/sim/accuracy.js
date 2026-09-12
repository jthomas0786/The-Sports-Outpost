import { normName, normTeam } from './utils.js';
const number=v=>v==null||v===''||typeof v==='boolean'?null:Number.isFinite(Number(String(v).replace(/,/g,'')))?Number(String(v).replace(/,/g,'')):null;
const probability=v=>{const n=number(v);return n!=null&&n>=0&&n<=1?n:null;};
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const stats=['attempts','completions','passYds','passTds','interceptions','carries','rushYds','rushTds','targets','receptions','recYds','recTds'];
function actualStats(row){
  const flat=row.flat||{},out=Object.fromEntries(stats.map(k=>[k,number(flat[k])]));
  const ca=String(flat.compAtt||'').match(/^(\d+)\s*\/\s*(\d+)$/);
  if(ca){out.completions=Number(ca[1]);out.attempts=Number(ca[2]);}
  out.atd=(out.rushTds>0||out.recTds>0)?1:out.rushTds!=null&&out.recTds!=null?0:null;
  return out;
}
function finalRow(player,actual){
  const byId=actual.playerStats?.byId||{};
  const exact=player.espnId?byId[String(player.espnId)]:null;
  if(exact)return normTeam(exact.team)===normTeam(player.team)?exact:null;
  const matches=[...Object.values(byId),...Object.values(actual.playerStats?.byName||{})].filter(r=>normTeam(r.team)===normTeam(player.team)&&normName(r.name)===normName(player.name));
  const ids=new Set(matches.map(r=>String(r.id||r.name)));
  return ids.size===1?matches[0]:null;
}
function point(metric,predicted,actual,extra={}){
  const value=number(actual),p=number(predicted?.mean);
  if(value==null||p==null)return null;
  const low=number(predicted.p10),high=number(predicted.p90);
  return {metric,...extra,actual:value,mean:p,error:p-value,absoluteError:Math.abs(p-value),squaredError:(p-value)**2,
    median:number(predicted.median),medianAbsoluteError:number(predicted.median)==null?null:Math.abs(predicted.median-value),
    interval80:low!=null&&high!=null&&low<=high?{low,high,covered:value>=low&&value<=high}:null};
}
function binary(metric,p,y,extra={}){
  p=probability(p);if(p==null||y==null)return null;
  return {metric,...extra,probability:p,outcome:y,brier:(p-y)**2};
}
function frameAccuracy(frame,actual,gameId){
  const result=frame.result,points=[],probabilities=[],skipped={missingPlayerRows:0,missingStats:0,missingAtdOutcome:0,settledEvents:0,pushes:0};
  for(const side of ['away','home']){
    const row=point(`score:${side}`,result.outcomes?.[side]?.score,actual[`${side}Score`]);if(row)points.push(row);
  }
  const away=number(actual.awayScore),home=number(actual.homeScore),out=result.outcomes||{};
  let winner=null;
  if(away!=null&&home!=null){
    const ps=[out.away?.winProbability,out.home?.winProbability,out.tieProbability].map(probability);
    if(ps.every(v=>v!=null)&&Math.abs(ps.reduce((s,p)=>s+p,0)-1)<.002){
      const sum=ps.reduce((s,p)=>s+p,0),normalized=ps.map(p=>p/sum),outcomes=[away>home?1:0,home>away?1:0,away===home?1:0];
      winner={probabilities:normalized,outcome:outcomes,brier:normalized.reduce((s,p,i)=>s+(p-outcomes[i])**2,0)};
    }
  }
  for(const player of result.players||[]){
    const row=finalRow(player,actual);if(!row){skipped.missingPlayerRows++;continue;}
    const values=actualStats(row),identity={playerId:player.playerId||player.espnId,name:player.name,team:player.team};
    for(const metric of stats){
      if(values[metric]==null){skipped.missingStats++;continue;}
      const value=point(metric,player.distributions?.[metric],values[metric],identity);if(value)points.push(value);
    }
    if((number(player.current?.rushTds)||0)+(number(player.current?.recTds)||0)>0)skipped.settledEvents++;
    else if(values.atd==null)skipped.missingAtdOutcome++;
    else{const value=binary('atd',player.probabilities?.atd,values.atd,identity);if(value)probabilities.push(value);}
    for(const [metric,over] of Object.entries(player.sportsbook?.over||{})){
      const line=number(over.line),observed=values[metric],under=player.sportsbook?.under?.[metric];
      if(line==null||observed==null)continue;
      // Count-based events already reached cannot assess a future forecast.
      // Yardage can decrease on later plays, so it is not treated as settled.
      const current=number(player.current?.[metric]);
      if(['receptions','completions','passTds','rushTds','recTds','attempts','carries','targets','interceptions'].includes(metric)&&current!=null&&current>line){skipped.settledEvents++;continue;}
      if(observed===line){skipped.pushes++;continue;}
      const pOver=probability(over.probability),pUnder=probability(under?.probability);
      if(pOver==null||pUnder==null||number(under.line)!==line||pOver+pUnder<=0||pOver+pUnder>1.002)continue;
      const value=binary(`${metric}:over`,pOver/(pOver+pUnder),observed>line?1:0,{...identity,line,conditionalOnNoPush:true});
      if(value)probabilities.push(value);
    }
  }
  const period=number(result.liveModel?.period);
  return {gameId,at:frame.at,phase:frame.phase,bucket:frame.phase==='live'?`live:${period==null?'unknown':period>4?'OT':`Q${period}`}`:frame.phase,points,probabilities,winner,skipped};
}
export function summarizeAccuracy(frames){
  const points={},events={};
  for(const frame of frames){
    for(const row of frame.points)(points[row.metric]??=[]).push(row);
    for(const row of frame.probabilities)(events[row.metric]??=[]).push(row);
  }
  return {gameCount:new Set(frames.map(f=>f.gameId)).size,forecastCount:frames.length,
    projections:Object.fromEntries(Object.entries(points).map(([metric,rows])=>{const ranges=rows.filter(r=>r.interval80);return [metric,{observations:rows.length,mae:mean(rows.map(r=>r.absoluteError)),rmse:Math.sqrt(mean(rows.map(r=>r.squaredError))),bias:mean(rows.map(r=>r.error)),medianMae:mean(rows.map(r=>r.medianAbsoluteError).filter(v=>v!=null)),intervalObservations:ranges.length,interval80Coverage:mean(ranges.map(r=>Number(r.interval80.covered)))}];})),
    probabilities:Object.fromEntries(Object.entries(events).map(([metric,rows])=>[metric,{observations:rows.length,brier:mean(rows.map(r=>r.brier)),calibration:Array.from({length:10},(_,i)=>{const group=rows.filter(r=>Math.min(9,Math.floor(r.probability*10))===i);return {from:i/10,to:(i+1)/10,observations:group.length,meanProbability:mean(group.map(r=>r.probability)),observedRate:mean(group.map(r=>r.outcome))};})}])),
    winner:{observations:frames.filter(f=>f.winner).length,multiclassBrier:mean(frames.filter(f=>f.winner).map(f=>f.winner.brier))}};
}
export function scoreReplayReports(reports,{allowTest=false}={}){
  if(!reports.length)throw new Error('At least one replay report is required');
  if(reports.some(r=>r.schemaVersion!==1||!Array.isArray(r.frames)))throw new Error('Unsupported replay report schema');
  if(reports.length>1&&reports.some(r=>!r.modelCodeSha256||!r.configSha256))throw new Error('Pooling reports requires model and configuration hashes');
  const seen=new Set(),frames=[],excluded=[];
  const signatures=new Set(reports.map(r=>`${r.modelCodeSha256||'unknown'}|${r.configSha256||'unknown'}`));
  if(signatures.size>1)throw new Error('Cannot pool different model/configuration versions');
  for(const report of reports){
    const id=String(report.gameId||'');if(!id||seen.has(id))throw new Error('Replay reports must have unique game IDs');seen.add(id);
    if(!allowTest&&(report.testIterations||report.frames?.some(f=>f.testIterations)))throw new Error('Test-iteration reports require explicit allowTest');
    const finals=(report.frames||[]).filter(f=>f.phase==='final'&&f.actual?.status==='post'&&Number.isFinite(Date.parse(f.at))).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    if(!finals.length){excluded.push({gameId:id,reason:'No recorded final observation'});continue;}
    const actual=finals.at(-1).actual,cutoff=Date.parse(finals[0].at);
    for(const frame of report.frames||[]){
      if(!frame.result)continue;
      if(!['pregame','live','halftime'].includes(frame.phase)||!Number.isFinite(Date.parse(frame.at))||Date.parse(frame.at)>=cutoff){excluded.push({gameId:id,at:frame.at,reason:'Forecast is not before the first final observation'});continue;}
      if(String(frame.result.game?.gameId)!==id)throw new Error('Forecast game ID does not match report');
      if(['home','away'].some(side=>actual[`${side}Abbr`]&&normTeam(actual[`${side}Abbr`])!==normTeam(frame.result.game?.[side]?.abbr)))throw new Error('Final teams do not match forecast');
      const graded=frameAccuracy(frame,actual,id);
      if(!graded.points.length&&!graded.probabilities.length&&!graded.winner){excluded.push({gameId:id,at:frame.at,reason:'No matched forecast/outcome metrics'});continue;}
      frames.push(graded);
    }
  }
  // One earliest captured forecast per game and phase/quarter. Repeated live
  // snapshots remain visible below but do not receive extra summary weight.
  const selected=new Map();
  for(const frame of [...frames].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))){const key=`${frame.gameId}|${frame.bucket}`;if(!selected.has(key))selected.set(key,frame);}
  const buckets={};for(const frame of selected.values())(buckets[frame.bucket]??=[]).push(frame);
  return {schemaVersion:1,inputGames:reports.length,scoredGames:new Set(frames.map(f=>f.gameId)).size,testIterations:reports.some(r=>r.testIterations||r.frames.some(f=>f.testIterations)),selection:'Earliest archived forecast per game per phase or live quarter; no cross-phase pooling',
    byPhase:Object.fromEntries(Object.entries(buckets).map(([key,values])=>[key,summarizeAccuracy(values)])),frames,excluded,
    limitations:['Repeated player outcomes are dependent; observation counts are not independent game counts.','Missing player rows/stat fields are excluded, never imputed as zero.','ATD requires a known rushing or receiving TD, or explicit zero for both; passing TDs do not count.','Prop Brier scores condition on no push; pushes are excluded. Historical odds are not assumed tradable.','These are descriptive retrospective errors, not out-of-sample validation or betting returns.']};
}
