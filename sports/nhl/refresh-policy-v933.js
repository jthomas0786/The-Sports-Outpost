export const NHL_PREGAME_WINDOW_MS=60*60*1000;
export const NHL_LIVE_REFRESH_MS=10*1000;
export const NHL_IDLE_PROBE_MS=15*60*1000;
export const NHL_POST_START_GRACE_MS=20*60*1000;

function startMs(game){
 const value=Date.parse(game?.startTime||'');
 return Number.isFinite(value)?value:null;
}

export function nhlShouldLiveRefresh(games=[],now=Date.now()){
 return (games||[]).some(game=>{
  if(game?.status==='in')return true;
  if(game?.status!=='pre')return false;
  const start=startMs(game);if(start==null)return false;
  const delta=start-now;
  return delta<=NHL_PREGAME_WINDOW_MS&&delta>=-NHL_POST_START_GRACE_MS;
 });
}

export function nhlNextRefreshDelay(games=[],now=Date.now()){
 if(nhlShouldLiveRefresh(games,now))return NHL_LIVE_REFRESH_MS;
 const next=(games||[])
  .filter(game=>game?.status==='pre')
  .map(startMs)
  .filter(start=>start!=null&&start-now>NHL_PREGAME_WINDOW_MS)
  .sort((a,b)=>a-b)[0];
 if(next==null)return NHL_IDLE_PROBE_MS;
 return Math.max(1000,Math.min(NHL_IDLE_PROBE_MS,next-now-NHL_PREGAME_WINDOW_MS));
}

export function nhlSlateFingerprint(slate){
 return `${slate?.date||''}|${(slate?.games||[]).map(game=>`${game?.id||''}:${game?.status||''}:${game?.startTime||''}`).join('|')}`;
}
