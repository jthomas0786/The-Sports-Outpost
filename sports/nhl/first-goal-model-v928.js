const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const median=a=>{const x=a.filter(Number.isFinite).slice().sort((p,q)=>p-q);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;};
const teamKey=v=>String(v||'').toUpperCase();

export function americanImplied(price){
 const n=finite(price);if(n==null||Math.abs(n)<100)return null;
 return n>0?100/(n+100):(-n)/((-n)+100);
}
export function fairAmerican(prob){
 const p=finite(prob);if(p==null||p<=0||p>=1)return null;
 return Math.round(p>=.5?-100*p/(1-p):100*(1-p)/p);
}
function clockToMinutes(v){
 const m=String(v||'').match(/^(\d+):(\d{2})$/);return m?Number(m[1])+Number(m[2])/60:null;
}
function validSkaters(game){
 return (game?.players||[]).filter(p=>p&&p.active!==false&&p.propsEligible!==false&&teamKey(p.position)!=='G'&&[teamKey(game?.away?.abbr),teamKey(game?.home?.abbr)].includes(teamKey(p.team)));
}
function quotesFor(odds,gameId,playerId,market){return (odds?.quotes||[]).filter(q=>String(q.gameId)===String(gameId)&&String(q.playerId)===String(playerId)&&q.market===market&&finite(q.over)!=null);}
function marketProbFromQuote(q){
 const over=americanImplied(q?.over),under=americanImplied(q?.under);
 if(over==null)return null;
 return under!=null&&over+under>0?over/(over+under):over;
}
function bestQuote(rows){return rows.slice().sort((a,b)=>Number(b.over)-Number(a.over)||Number(b.ts||0)-Number(a.ts||0))[0]||null;}
function anytimeConsensus(odds,gameId,playerId){
 const rows=quotesFor(odds,gameId,playerId,'atg'),vals=rows.map(marketProbFromQuote).filter(Number.isFinite),best=bestQuote(rows);
 return {prob:median(vals),books:new Set(rows.map(r=>r.book)).size,bestPrice:best?Number(best.over):null,bestBook:best?.book||null};
}
function bestFirstGoalQuote(odds,gameId,playerId){
 const rows=quotesFor(odds,gameId,playerId,'fgs'),best=bestQuote(rows);
 return {price:best?Number(best.over):null,book:best?.book||null,books:new Set(rows.map(r=>r.book)).size};
}
function directFirstGoalShares(odds,game,players){
 const ids=new Set(players.map(p=>String(p.id))),rows=(odds?.quotes||[]).filter(q=>String(q.gameId)===String(game.id)&&q.market==='fgs'&&ids.has(String(q.playerId))&&americanImplied(q.over)!=null);
 const byBook=new Map();
 for(const q of rows){if(!byBook.has(q.book))byBook.set(q.book,[]);byBook.get(q.book).push(q);}
 const minCoverage=Math.min(8,Math.max(6,Math.ceil(players.length*.25))),valid=[...byBook.entries()].filter(([,r])=>new Set(r.map(x=>String(x.playerId))).size>=minCoverage);
 const sums=new Map(players.map(p=>[String(p.id),0])),counts=new Map(players.map(p=>[String(p.id),0]));let coverage=0;
 for(const [,bookRows] of valid){
  const latest=new Map();for(const q of bookRows){const id=String(q.playerId),prev=latest.get(id);if(!prev||Number(q.ts||0)>Number(prev.ts||0))latest.set(id,q);}
  const vals=[...latest.values()].map(q=>[String(q.playerId),americanImplied(q.over)]).filter(([,p])=>Number.isFinite(p));
  const total=vals.reduce((s,[,p])=>s+p,0);if(!(total>0))continue;
  coverage+=vals.length/players.length;
  for(const p of players){const id=String(p.id),row=vals.find(([pid])=>pid===id),share=row?row[1]/total:0;sums.set(id,(sums.get(id)||0)+share);counts.set(id,(counts.get(id)||0)+1);}
 }
 const shares=new Map();for(const p of players){const id=String(p.id),n=counts.get(id)||0;shares.set(id,n?(sums.get(id)||0)/n:0);}
 return {shares,books:valid.length,coverage:valid.length?coverage/valid.length:0,rows};
}
function recentRegularRows(history,startTime){
 const t=Date.parse(startTime||'');return (history?.recentGames||[]).filter(r=>Number(r?.seasonType)===2&&(!Number.isFinite(t)||!Number.isFinite(Date.parse(r?.date))||Date.parse(r.date)<t)).sort((a,b)=>Date.parse(b?.date||0)-Date.parse(a?.date||0));
}
function playerHistoryMetrics(player,research,game,atg){
 const h=research?.players?.[player.id]||{},rows=recentRegularRows(h,game.startTime),l10=rows.slice(0,10);
 const priorGoal=finite(h?.rates?.goals),priorSog=finite(h?.rates?.sog),shooting=finite(h?.shootingPct);
 const pos=teamKey(player.position),fallback=pos==='D'?.07:.15;
 const seasonGoal=priorGoal??fallback,seasonSog=priorSog??(pos==='D'?1.35:1.9),shotGoal=shooting!=null?seasonSog*shooting:seasonGoal;
 const recentGoals=l10.reduce((s,r)=>s+(finite(r?.stats?.goals)||0),0),recentSog=l10.map(r=>finite(r?.stats?.sog)).filter(v=>v!=null),recentSogAvg=mean(recentSog);
 const recentFirstGoals=l10.filter(r=>r?.firstGoal===true).length,n=l10.length;
 const shrunkRecent=(recentGoals+8*seasonGoal)/(n+8),shotForm=recentSogAvg!=null&&seasonSog>0?clamp(recentSogAvg/seasonSog,.75,1.25):1;
 let historyLambda=Math.max(.012,(.55*seasonGoal+.25*shrunkRecent+.20*shotGoal)*Math.pow(shotForm,.2));
 if(atg?.prob!=null){const atgLambda=-Math.log(Math.max(.02,1-clamp(atg.prob,.01,.78)));historyLambda=.58*atgLambda+.42*historyLambda;}
 const toiVals=l10.map(r=>clockToMinutes(r?.stats?.toi)).filter(v=>v!=null);
 return {historyLambda,seasonGoalRate:seasonGoal,seasonSogRate:seasonSog,shootingPct:shooting,recentGames:n,recentGoals,recentSog:recentSogAvg,recentFirstGoals,recentToi:mean(toiVals),priorGames:Number(h?.games||0)};
}
function gameContext(odds,game){
 const line=(odds?.gameLines||[]).find(x=>String(x.gameId)===String(game.id))||{};
 const totalLine=finite(line?.total?.expectedGoals)??finite(line?.total?.line)??6.0;
 let homeWin=finite(line?.moneyline?.homeFair),awayWin=finite(line?.moneyline?.awayFair);
 if(homeWin==null||awayWin==null||homeWin+awayWin<=0){homeWin=.5;awayWin=.5;}else{const s=homeWin+awayWin;homeWin/=s;awayWin/=s;}
 const strength=p=>.75+.5*p;
 const hs=strength(homeWin),as=strength(awayWin),sum=hs+as;
 return {total:clamp(totalLine,4.5,8.5),homeWin,awayWin,homeExpected:clamp(totalLine*hs/sum,1.5,5),awayExpected:clamp(totalLine*as/sum,1.5,5),raw:line};
}
function probabilityLabel(p){return `${(100*p).toFixed(p>=.1?1:2)}%`;}
export function buildFirstGoalGame(game,research,odds){
 const skaters=validSkaters(game);if(!skaters.length)return null;
 const ctx=gameContext(odds,game),direct=directFirstGoalShares(odds,game,skaters),rows=[];
 for(const p of skaters){const atg=anytimeConsensus(odds,game.id,p.id),hist=playerHistoryMetrics(p,research,game,atg),fgs=bestFirstGoalQuote(odds,game.id,p.id);rows.push({player:p,atg,hist,fgs,rawLambda:hist.historyLambda});}
 for(const team of [game.away,game.home]){
  const group=rows.filter(r=>teamKey(r.player.team)===teamKey(team.abbr)),sum=group.reduce((s,r)=>s+r.rawLambda,0),target=team===game.home?ctx.homeExpected:ctx.awayExpected;
  for(const r of group)r.lambda=sum>0?target*r.rawLambda/sum:target/Math.max(1,group.length);
 }
 const totalLambda=rows.reduce((s,r)=>s+(r.lambda||0),0)||ctx.total,goalOccurs=1-Math.exp(-totalLambda),baseShares=new Map(rows.map(r=>[String(r.player.id),(r.lambda||0)/totalLambda]));
 const directWeight=direct.books?clamp((.34+.1*Math.min(3,direct.books))*clamp(direct.coverage/.55,.65,1),.28,.66):0;
 let shareSum=0;
 for(const r of rows){const id=String(r.player.id),base=baseShares.get(id)||0,mkt=direct.shares.get(id)||0;r.finalShare=directWeight*mkt+(1-directWeight)*base;shareSum+=r.finalShare;}
 if(!(shareSum>0))shareSum=1;
 const all=rows.map(r=>{
  const probability=goalOccurs*r.finalShare/shareSum,marketShare=(direct.shares.get(String(r.player.id))||0)*goalOccurs,anytimeProbability=1-Math.exp(-Math.max(0,r.lambda||0));
  const confidence=direct.books>=3&&r.hist.priorGames>=40?'HIGH':direct.books>=1&&r.atg.books>=2?'MED':'MODEL';
  return {id:String(r.player.id),name:r.player.name,team:r.player.team,position:r.player.position,photo:r.player.photo||'',probability,probabilityLabel:probabilityLabel(probability),fairOdds:fairAmerican(probability),bestOdds:r.fgs.price,bestBook:r.fgs.book,firstGoalBooks:r.fgs.books,marketFirstGoalProbability:direct.books?marketShare:null,anytimeProbability,anytimeProbabilityLabel:probabilityLabel(anytimeProbability),fairAtgOdds:fairAmerican(anytimeProbability),bestAtgOdds:r.atg.bestPrice,bestAtgBook:r.atg.bestBook,anytimeMarketProbability:r.atg.prob,anytimeBooks:r.atg.books,confidence,lambda:r.lambda,...r.hist};
 }).sort((a,b)=>b.probability-a.probability);
 const teamBlock=team=>{const group=all.filter(p=>teamKey(p.team)===teamKey(team.abbr));return {id:String(team.id||''),abbr:team.abbr,name:team.name,logo:team.logo||'',expectedGoals:team===game.home?ctx.homeExpected:ctx.awayExpected,winProbability:team===game.home?ctx.homeWin:ctx.awayWin,players:group.slice().sort((a,b)=>b.probability-a.probability).slice(0,3).map((p,i)=>({...p,teamRank:i+1})),atgPlayers:group.slice().sort((a,b)=>b.anytimeProbability-a.anytimeProbability).slice(0,3).map((p,i)=>({...p,teamRank:i+1}))};};
 const away=teamBlock(game.away),home=teamBlock(game.home);
 return {gameId:String(game.id),startTime:game.startTime,status:game.status,venue:game.venue||'',away,home,expectedGoals:totalLambda,noGoalProbability:1-goalOccurs,directFirstGoalBooks:direct.books,directMarketCoverage:direct.coverage,directMarketWeight:directWeight,model:'FGS-Hazard Ensemble v1',method:'Competing Poisson hazards calibrated to sportsbook game total/team strength, blended with de-vigged first-goal consensus when sufficiently covered.',top6:[...away.players,...home.players].sort((a,b)=>b.probability-a.probability),top6Atg:[...away.atgPlayers,...home.atgPlayers].sort((a,b)=>b.anytimeProbability-a.anytimeProbability)};
}
export function buildFirstGoalSlate(slate,research,odds,old=null){
 const preserve=old?.date===slate?.date?new Map((old.games||[]).map(g=>[String(g.gameId),g])):new Map();
 const games=(slate?.games||[]).map(g=>{
  if(g.status!=='pre'&&preserve.has(String(g.id)))return {...preserve.get(String(g.id)),status:g.status,away:{...preserve.get(String(g.id)).away,score:g.away?.score??null},home:{...preserve.get(String(g.id)).home,score:g.home?.score??null}};
  return buildFirstGoalGame(g,research,odds);
 }).filter(Boolean);
 return {version:1,source:'TSO NHL first-goal model',model:'FGS-Hazard Ensemble v1',generatedAt:new Date().toISOString(),date:slate?.date||'',season:slate?.season||'',methodology:{eventModel:'competing Poisson scoring hazards',marketAnchor:'ParlayAPI player_first_goal_scorer + player_anytime_goal',playerInputs:['verified prior-season goals/game','shots/game','regressed shooting percentage','last-10 goals/shots','last-10 first-goal occurrences'],gameInputs:['sportsbook total','de-vigged moneyline team strength'],note:'Probabilities are model estimates, not guarantees. Actual sportsbook prices are displayed only when a verified quote is present.'},games};
}
