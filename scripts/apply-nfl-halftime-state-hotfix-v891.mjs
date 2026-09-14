#!/usr/bin/env node
import fs from 'node:fs';

function replaceOrThrow(file, oldText, newText){
  const src=fs.readFileSync(file,'utf8');
  if(!src.includes(oldText)) throw new Error(`${file}: hotfix anchor not found`);
  fs.writeFileSync(file,src.replace(oldText,newText));
}

replaceOrThrow(
  'sports/nfl/sim/auto.js',
`export function isHalftimeState(liveGame){
  if(!liveGame || !['in','live'].includes(String(liveGame.status||'').toLowerCase())) return false;
  const detail=\`${'${liveGame.statusDetail||\'\'}'} ${'${liveGame.detail||\'\'}'}\`.toLowerCase();
  if(/half\\s*time|halftime|end of (?:the )?2nd|end of second/.test(detail)) return true;
  const period=Number(liveGame.period);
  const clock=Number(liveGame.clockMin);
  return period===2 && Number.isFinite(clock) && clock<=0.05;
}

export function isHalftimeWarmupState(liveGame,thresholdMinutes=HALFTIME_WARMUP_MINUTES){
  if(isHalftimeState(liveGame)) return true;
  if(!liveGame || !['in','live'].includes(String(liveGame.status||'').toLowerCase())) return false;
  const period=Number(liveGame.period),clock=Number(liveGame.clockMin),limit=Math.max(0,Number(thresholdMinutes)||0);
  return period===2 && Number.isFinite(clock) && clock>=0 && clock<=limit;
}

export function automationPhase(liveGame){
  const status=String(liveGame?.status||'pre').toLowerCase();
  if(status==='post') return 'post';
  if(isHalftimeWarmupState(liveGame,HALFTIME_WARMUP_MINUTES)) return 'halftime';
  if(status==='in'||status==='live') return 'live';
  return 'pregame';
}
`,
`function livePeriod(liveGame){
  return Number(liveGame?.period ?? liveGame?.quarter ?? liveGame?.status?.period);
}
function liveClockMinutes(liveGame){
  const direct=Number(liveGame?.clockMin);
  if(Number.isFinite(direct)) return direct;
  const seconds=Number(liveGame?.secondsRemaining ?? liveGame?.status?.seconds ?? liveGame?.seconds);
  if(Number.isFinite(seconds)) return seconds/60;
  const raw=String(liveGame?.clock ?? liveGame?.lastPlay?.clock ?? '').trim();
  const m=raw.match(/^(\\d{1,2}):(\\d{2})$/);
  return m ? Number(m[1])+Number(m[2])/60 : NaN;
}

export function isHalftimeState(liveGame){
  if(!liveGame) return false;
  const status=String(liveGame.status ?? liveGame.state ?? liveGame.status?.state ?? '').toLowerCase();
  const detail=\`${'${liveGame.statusDetail||\'\'}'} ${'${liveGame.status?.detail||\'\'}'} ${'${liveGame.detail||\'\'}'} ${'${liveGame.clock||\'\'}'}\`.toLowerCase();
  if(status==='halftime'||status==='half') return true;
  if(/half\\s*time|halftime|end of (?:the )?2nd|end of second/.test(detail)) return true;
  const active=['in','live'].includes(status);
  const period=livePeriod(liveGame);
  const clock=liveClockMinutes(liveGame);
  return active && period===2 && Number.isFinite(clock) && clock<=0.05;
}

export function isHalftimeWarmupState(liveGame,thresholdMinutes=HALFTIME_WARMUP_MINUTES){
  if(isHalftimeState(liveGame)) return true;
  if(!liveGame) return false;
  const status=String(liveGame.status ?? liveGame.state ?? liveGame.status?.state ?? '').toLowerCase();
  if(!['in','live'].includes(status)) return false;
  const period=livePeriod(liveGame),clock=liveClockMinutes(liveGame),limit=Math.max(0,Number(thresholdMinutes)||0);
  return period===2 && Number.isFinite(clock) && clock>=0 && clock<=limit;
}

export function automationPhase(liveGame){
  const status=String(liveGame?.status ?? liveGame?.state ?? liveGame?.status?.state ?? 'pre').toLowerCase();
  if(['post','final','closed'].includes(status)) return 'post';
  if(isHalftimeWarmupState(liveGame,HALFTIME_WARMUP_MINUTES)) return 'halftime';
  if(status==='in'||status==='live') return 'live';
  return 'pregame';
}
`
);

replaceOrThrow(
  'scripts/nfl-halftime-window-refresh.mjs',
`const ids=Object.entries(liveGames)
  .filter(([,g])=>{
    const status=String(g?.status||'');
    const q=Number(g?.quarter);
    const clock=Number(g?.clockMin);
    return (status==='in'||status==='live') && q===2 && Number.isFinite(clock) && clock<=START_MIN && clock>=0;
  })
  .map(([id])=>String(id));`,
`const ids=Object.entries(liveGames)
  .filter(([,g])=>{
    const status=String(g?.status ?? g?.state ?? g?.status?.state ?? '').toLowerCase();
    const detail=\`${'${g?.statusDetail||\'\'}'} ${'${g?.status?.detail||\'\'}'} ${'${g?.detail||\'\'}'} ${'${g?.clock||\'\'}'}\`.toLowerCase();
    const q=Number(g?.quarter ?? g?.period ?? g?.status?.period);
    const direct=Number(g?.clockMin);
    const seconds=Number(g?.secondsRemaining ?? g?.status?.seconds ?? g?.seconds);
    const raw=String(g?.clock ?? g?.lastPlay?.clock ?? '').trim();
    const m=raw.match(/^(\\d{1,2}):(\\d{2})$/);
    const clock=Number.isFinite(direct)?direct:Number.isFinite(seconds)?seconds/60:m?Number(m[1])+Number(m[2])/60:NaN;
    const halftime=status==='halftime'||status==='half'||/half\\s*time|halftime|end of (?:the )?2nd|end of second/.test(detail);
    return halftime || ((status==='in'||status==='live') && q===2 && Number.isFinite(clock) && clock<=START_MIN && clock>=0);
  })
  .map(([id])=>String(id));`
);

console.log('✓ applied NFL official-halftime state hotfix');
