const num=v=>Number.isFinite(Number(v))?Number(v):null;

function lockedLineFromHistory(g){
 if(!g?.gameId||!g?.favoriteAbbr||Number(g?.line)!==-1.5)return null;
 const price=num(g.latestPrice)??num(g.initialPrice);
 return {
  gameId:String(g.gameId),
  startTime:g.startTime||null,
  awayAbbr:g.away?.abbr||'',
  homeAbbr:g.home?.abbr||'',
  awayTeam:g.away?.name||'',
  homeTeam:g.home?.name||'',
  puckLine:{
   favoriteAbbr:g.favoriteAbbr,
   favoriteTeam:g.favoriteTeam||g.favoriteAbbr,
   line:-1.5,
   price,
   book:g.latestBook||g.initialBook||'Tracked pregame line',
   sportsbookCount:Number(g.sportsbookCount||0),
   lockedFromHistory:true,
   initialPrice:num(g.initialPrice),
   initialBook:g.initialBook||null
  },
  moneyline:null,
  total:null
 };
}

export function preserveTrackedPuckLines(lines,history){
 const out={...(lines||{}),games:(lines?.games||[]).map(g=>({...g,puckLine:g?.puckLine?{...g.puckLine}:g?.puckLine}))};
 const byId=new Map(out.games.map(g=>[String(g.gameId),g]));
 for(const h of history?.games||[]){
  const locked=lockedLineFromHistory(h);if(!locked)continue;
  const current=byId.get(String(h.gameId));
  if(current?.puckLine)continue;
  if(current){current.puckLine=locked.puckLine;continue;}
  out.games.push(locked);byId.set(String(h.gameId),locked);
 }
 return out;
}

export const __PLJ_LINE_LOCK_TEST__={lockedLineFromHistory};
