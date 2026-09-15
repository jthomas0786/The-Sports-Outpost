// Halftime boards can prewarm in late Q2, but they only become user-ready
// against the current authoritative halftime state.
const num=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const WINDOW_MINUTES=8,MAX_BOARD_AGE_MS=35*60*1000,MAX_LIVE_AGE_MS=15*60*1000,MAX_ODDS_TOTAL_AGE_SECONDS=35*60;
const HALF_RE=/\bhalf\s*time\b|\bhalftime\b|\bend of (?:the )?(?:2nd|second)(?: quarter)?\b/i;
const POST_RE=/^(?:post|final|closed|complete|completed)$/i;
function clockMinutes(live,game){const direct=num(live?.clockMin??game?.clockMin);if(direct!=null)return direct;const raw=String(live?.clock??game?.clock??'').trim().toLowerCase();if(HALF_RE.test(raw))return 0;const m=raw.match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])+Number(m[2])/60:null;}
function statusValue(live,game){return String(live?.status??game?.status??live?.state??game?.state??'').toLowerCase();}
function authorityText(game,live){return [live?.statusName,live?.statusType,live?.statusDescription,live?.statusDetail,live?.detail,live?.shortDetail,live?.clock,game?.statusName,game?.statusType,game?.statusDescription,game?.statusDetail,game?.detail,game?.shortDetail,game?.clock].filter(Boolean).join(' ');}
function gameId(game){return String(game?.gameId??game?.id??game?.liveScore?.gameId??'');}

export function isOfficialHalftimeState(game){
  if(!game)return false;
  const live=game.liveScore||game,status=statusValue(live,game),period=num(live?.period??game?.period),clock=clockMinutes(live,game);
  if(POST_RE.test(status)||live?.completed===true||game?.completed===true)return false;
  if(live?.isHalftime===true||game?.isHalftime===true)return true;
  if(/(?:^|\b)STATUS_HALFTIME(?:\b|$)/i.test(authorityText(game,live)))return true;
  if(status==='halftime'||status==='half')return true;
  if(HALF_RE.test(authorityText(game,live)))return true;
  const liveish=['in','live'].includes(status);
  return liveish&&period===2&&clock!=null&&clock>=0&&clock<=0.05;
}

export function isHalftimeWarmupState(game,{thresholdMinutes=WINDOW_MINUTES}={}){
  if(isOfficialHalftimeState(game))return true;
  if(!game)return false;
  const live=game.liveScore||game,status=statusValue(live,game),period=num(live?.period??game?.period),clock=clockMinutes(live,game),limit=Math.max(0,num(thresholdMinutes)??WINDOW_MINUTES);
  return ['in','live'].includes(status)&&period===2&&clock!=null&&clock>=0&&clock<=limit;
}

export function halftimeBoardCurrent(board,game,now=Date.now()){
  if(!board?.ready||!game||!isOfficialHalftimeState(game))return false;
  const live=game.liveScore||game,bid=String(board.gameId??''),gid=gameId(game);
  if(bid&&gid&&bid!==gid)return false;
  const generated=Date.parse(board.generatedAt||'');if(!Number.isFinite(generated)||now-generated>MAX_BOARD_AGE_MS||generated>now+60000)return false;
  const liveStamp=num(live.lastFetchedAt??game.lastFetchedAt);if(liveStamp!=null&&(now-liveStamp>MAX_LIVE_AGE_MS||liveStamp>now+60000))return false;
  if(Number(board.state?.period)!==2)return false;
  const boardClock=num(board.state?.clockMin),boardDetail=String(board.state?.statusDetail||'');
  if(!(HALF_RE.test(boardDetail)||(boardClock!=null&&boardClock>=0&&boardClock<=WINDOW_MINUTES+.05)))return false;
  for(const side of ['away','home']){const current=num(live[`${side}Score`]??game[side]?.score);if(current==null||current!==num(board.state?.[`${side}Score`]))return false;}
  const elapsed=Math.max(0,(now-generated)/1000);
  return (board.candidates||[]).length>=2&&board.candidates.every(c=>{const age=num(c.oddsAgeSeconds);return age!=null&&age>=0&&age+elapsed<=MAX_ODDS_TOTAL_AGE_SECONDS;});
}
