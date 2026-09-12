// Shared by the drawer and replay tests. Never infer a live window from an old board.
const num=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
export function halftimeBoardCurrent(board,game,now=Date.now()){
  if(!board?.ready||!game)return false;
  const live=game.liveScore||game;
  const status=String(game.status||live.status||'').toLowerCase();
  const period=num(live.period),clock=num(live.clockMin);
  const detail=`${game.statusDetail||game.detail||''} ${live.statusDetail||''}`;
  if(!['in','live'].includes(status)||period!==2)return false;
  if(!(/half\s*time|end of (?:the )?(?:2nd|second)/i.test(detail)||(clock!=null&&clock<=.05)))return false;
  const generated=Date.parse(board.generatedAt||'');
  if(!Number.isFinite(generated)||now-generated>600000||generated>now+60000)return false;
  const liveStamp=num(live.lastFetchedAt);
  if(liveStamp==null||now-liveStamp>360000||liveStamp>now+60000)return false;
  if(Number(board.state?.period)!==2)return false;
  for(const side of ['away','home']){
    const current=num(game[side]?.score??live[`${side}Score`]);
    if(current==null||current!==num(board.state?.[`${side}Score`]))return false;
  }
  const elapsed=(now-generated)/1000;
  return (board.candidates||[]).length>=2 && board.candidates.every(c=>{
    const age=num(c.oddsAgeSeconds);
    return age!=null&&age>=0&&age+Math.max(0,elapsed)<=600;
  });
}
