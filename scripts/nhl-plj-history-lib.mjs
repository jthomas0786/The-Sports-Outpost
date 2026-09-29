const ALERT_CODES=new Set(['PLJ_WATCH','PLJ_LIVE','BACKDOOR_DANGER','PLJ_CASHED','LATE_CASH','BACKDOORED']);
const FINAL_CODES=new Set(['PLJ_CASHED','LATE_CASH','BACKDOORED','COVERED','MISSED_ONE','MISSED']);
const LIVE_RESULT_CODES=new Set(['PLJ_CASHED','LATE_CASH','BACKDOORED']);
const iso=v=>{const d=v instanceof Date?v:new Date(v);return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString();};
const scoreOf=g=>({away:Number.isFinite(Number(g?.away?.score))?Number(g.away.score):null,home:Number.isFinite(Number(g?.home?.score))?Number(g.home.score):null});
const goalCopy=g=>g?{period:g.period??null,clock:g.clock||'',team:g.team||'',scorer:g.scorer?.name||'',text:g.text||'',strength:g.strength||'',awayScore:g.awayScore??null,homeScore:g.homeScore??null,emptyNet:Boolean(g.emptyNet)}:null;

function seedRecord(x,at){
 const g=x.game,l=x.line?.puckLine||{};
 return {
  gameId:String(g.id),date:g.slateDate||x.line?.date||'',startTime:g.startTime||null,
  away:{abbr:g.away?.abbr||'',name:g.away?.name||''},home:{abbr:g.home?.abbr||'',name:g.home?.name||''},
  favoriteAbbr:l.favoriteAbbr||'',favoriteTeam:l.favoriteTeam||'',line:Number(l.line??-1.5),
  initialPrice:l.price??null,initialBook:l.book||'',sportsbookCount:Number(l.sportsbookCount||0),
  createdAt:at,updatedAt:at,status:g.status||'pre',lastState:null,lastStateAt:null,
  sawPljWatch:false,sawPljLive:false,sawBackdoorDanger:false,pljCash:false,lateCash:false,backdoored:false,
  liveOutcome:null,outcome:null,finalScore:null,decisiveGoal:null,transitions:[]
 };
}

function transitionFor(x,at){
 const g=x.game;
 return {at,code:x.code,period:g.period??null,clock:g.clock||'',score:scoreOf(g),margin:x.margin??null,goaliePulled:Boolean(x.goaliePulled)};
}

export function updatePljHistory(history,model,now=new Date()){
 const at=iso(now),prior=history&&typeof history==='object'?history:{};
 const byId=new Map((Array.isArray(prior.games)?prior.games:[]).map(g=>[String(g.gameId),g]));
 for(const x of model?.tracked||[]){
  const id=String(x.game?.id||'');if(!id)continue;
  const old=byId.get(id)||seedRecord(x,at),l=x.line?.puckLine||{},g=x.game;
  const rec={...old};
  rec.date=rec.date||g.slateDate||model.date||'';rec.startTime=rec.startTime||g.startTime||null;
  rec.away=rec.away?.abbr?rec.away:{abbr:g.away?.abbr||'',name:g.away?.name||''};
  rec.home=rec.home?.abbr?rec.home:{abbr:g.home?.abbr||'',name:g.home?.name||''};
  rec.favoriteAbbr=rec.favoriteAbbr||l.favoriteAbbr||'';rec.favoriteTeam=rec.favoriteTeam||l.favoriteTeam||'';rec.line=-1.5;
  if(rec.initialPrice==null&&l.price!=null)rec.initialPrice=l.price;
  if(!rec.initialBook&&l.book)rec.initialBook=l.book;
  rec.latestPrice=l.price??rec.latestPrice??null;rec.latestBook=l.book||rec.latestBook||'';rec.sportsbookCount=Number(l.sportsbookCount||rec.sportsbookCount||0);
  rec.status=g.status||rec.status||'pre';rec.updatedAt=at;rec.lastScore=scoreOf(g);rec.lastMargin=x.margin??null;
  rec.sawPljWatch=Boolean(rec.sawPljWatch||['PLJ_WATCH','PLJ_LIVE','PLJ_CASHED'].includes(x.code));
  rec.sawPljLive=Boolean(rec.sawPljLive||x.code==='PLJ_LIVE'||x.code==='PLJ_CASHED');
  rec.sawBackdoorDanger=Boolean(rec.sawBackdoorDanger||['BACKDOOR_DANGER','BACKDOORED'].includes(x.code));
  rec.pljCash=Boolean(rec.pljCash||x.code==='PLJ_CASHED');rec.lateCash=Boolean(rec.lateCash||x.code==='LATE_CASH');rec.backdoored=Boolean(rec.backdoored||x.code==='BACKDOORED');
  if(rec.lastState!==x.code){
   const transitions=Array.isArray(rec.transitions)?rec.transitions.slice(-31):[];transitions.push(transitionFor(x,at));rec.transitions=transitions;rec.lastState=x.code;rec.lastStateAt=at;
  }
  const decisive=x.swing?.cash||x.swing?.backdoor||null;
  if(LIVE_RESULT_CODES.has(x.code)){
   rec.liveOutcome=x.code;
   if(decisive)rec.decisiveGoal=goalCopy(decisive);
  }
  if(g.status==='post'){
   rec.status='post';rec.outcome=x.code;rec.finalScore=scoreOf(g);rec.liveOutcome=rec.liveOutcome||x.code;
   if(decisive)rec.decisiveGoal=goalCopy(decisive);
  }
  byId.set(id,rec);
 }
 const games=[...byId.values()].sort((a,b)=>Date.parse(b.startTime||0)-Date.parse(a.startTime||0));
 const completed=games.filter(g=>g.status==='post');
 const summary={
  tracked:games.length,completed:completed.length,
  pljLive:games.filter(g=>g.sawPljLive).length,pljCashes:games.filter(g=>g.pljCash).length,
  lateCashes:games.filter(g=>g.lateCash).length,backdoors:games.filter(g=>g.backdoored).length,
  covered:completed.filter(g=>['PLJ_CASHED','LATE_CASH','COVERED'].includes(g.outcome)).length
 };
 return {version:1,updatedAt:at,season:prior.season||model?.season||'',summary,games};
}

export const __PLJ_HISTORY_TEST__={ALERT_CODES,FINAL_CODES,LIVE_RESULT_CODES};
