import { prepareReplayFrame, replayIterations } from './replay.js';
import { isHalftimeState } from './auto.js';
export function analyzeReplayCoverage(archive){
  const valid=[],rejected=[];
  for(let index=0;index<(archive.frames||[]).length;index++){
    try{
      const input=prepareReplayFrame(archive,index),live=input.liveGame;
      const phase=live.status==='post'?'final':live.status==='pre'?'pregame':isHalftimeState(live)?'halftime':'live';
      const bucket=phase==='live'?`live:${live.period>4?'OT':`Q${live.period}`}`:phase;
      valid.push({index,at:archive.frames[index].at,phase,bucket,iterations:replayIterations(live),source:archive.frames[index].source||null});
    }catch(error){rejected.push({index,at:archive.frames[index].at,reason:error.message});}
  }
  const finals=valid.filter(f=>f.phase==='final');
  const cutoff=finals.length?Date.parse(finals[0].at):Infinity;
  const selected=new Map();
  for(const frame of valid){
    if(frame.phase==='final'||Date.parse(frame.at)>=cutoff)continue;
    if(!selected.has(frame.bucket))selected.set(frame.bucket,frame);
  }
  const ready=finals.length>0&&selected.size>0;
  return {gameId:String(archive.game?.gameId||''),matchup:`${archive.game?.away?.abbr||'?'} @ ${archive.game?.home?.abbr||'?'}`,
    ready,reason:!finals.length?'No recorded final':!selected.size?'No eligible forecast before final':null,
    validFrames:valid,rejectedFrames:rejected,importSkips:archive.skipped||[],
    selectedIndices:[...selected.values(),...(finals.length?[finals.at(-1)]:[])].map(f=>f.index).sort((a,b)=>a-b),
    selectedBuckets:[...selected.keys()],hasHalftime:selected.has('halftime'),
    missingBuckets:['pregame','live:Q1','live:Q2','halftime','live:Q3','live:Q4','final'].filter(k=>k==='final'?!finals.length:!selected.has(k))};
}
