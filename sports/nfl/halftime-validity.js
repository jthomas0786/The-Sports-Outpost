// Shared by the drawer and replay tests. Never infer a live window from an old board.
const num=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const WINDOW_MINUTES=8;
export function halftimeBoardCurrent(board,game,now=Date.now()){
  if(!board?.ready||!game)return false;
  const live=game.liveScore||game;
  const status=String(live.status||game.status||'').toLowerCase();
  const period=num(live.period),clock=num(live.clockMin);
  const detail=`${game.statusDetail||game.detail||''} ${live.statusDetail||''}`;
  if(!['in','live'].includes(status)||period!==2)return false;
  if(!(/half\s*time|end of (?:the )?(?:2nd|second)/i.test(detail)||(clock!=null&&clock>=0&&clock<=WINDOW_MINUTES+.05)))return false;
  const generated=Date.parse(board.generatedAt||'');
  if(!Number.isFinite(generated)||now-generated>600000||generated>now+60000)return false;
  const liveStamp=num(live.lastFetchedAt);
  if(liveStamp==null||now-liveStamp>360000||liveStamp>now+60000)return false;
  if(Number(board.state?.period)!==2)return false;
  const boardClock=num(board.state?.clockMin);
  const boardDetail=String(board.state?.statusDetail||'');
  if(!(/half\s*time|end of (?:the )?(?:2nd|second)/i.test(boardDetail)||(boardClock!=null&&boardClock>=0&&boardClock<=WINDOW_MINUTES+.05)))return false;
  for(const side of ['away','home']){
    const current=num(live[`${side}Score`]??game[side]?.score);
    if(current==null||current!==num(board.state?.[`${side}Score`]))return false;
  }
  const elapsed=(now-generated)/1000;
  return (board.candidates||[]).length>=2 && board.candidates.every(c=>{
    const age=num(c.oddsAgeSeconds);
    return age!=null&&age>=0&&age+Math.max(0,elapsed)<=600;
  });
}
