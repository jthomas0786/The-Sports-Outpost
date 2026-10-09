// Keep the push watcher from downloading NFL live data from Supabase
// on days when there are no NFL games. Fail open on missing/invalid data.
export function nflLiveWindowOpen(board,now=Date.now()){
  if(!Array.isArray(board?.events)||board.events.length===0)return true;
  return board.events.some(event=>{
    const state=String(event.status?.type?.state||event.status?.type?.name||'').toLowerCase();
    if(state==='in'||state==='status_in_progress'||state==='in_progress')return true;
    if(state!=='pre'&&state!=='status_scheduled')return false;
    const kickoff=Date.parse(event.date||'');
    return Number.isFinite(kickoff)&&kickoff-now<=30*60*1000&&kickoff-now>=-45*60*1000;
  });
}
