import {nhlPositionGroup} from './research.js';
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
 const recentGoals=l10.reduce((s,r)=>s+(finite(r?.stats?.goals)||0),0),recentPowerPlayGoals=l10.reduce((s,r)=>s+(finite(r?.stats?.ppGoals)||0),0),recentSog=l10.map(r=>finite(r?.stats?.sog)).filter(v=>v!=null),recentSogAvg=mean(recentSog);
 const recentFirstGoals=l10.filter(r=>r?.firstGoal===true).length,n=l10.length;
 const shrunkRecent=(recentGoals+8*seasonGoal)/(n+8),shotForm=recentSogAvg!=null&&seasonSog>0?clamp(recentSogAvg/seasonSog,.75,1.25):1;
 let historyLambda=Math.max(.012,(.55*seasonGoal+.25*shrunkRecent+.20*shotGoal)*Math.pow(shotForm,.2));
 if(atg?.prob!=null){const atgLambda=-Math.log(Math.max(.02,1-clamp(atg.prob,.01,.78)));historyLambda=.58*atgLambda+.42*historyLambda;}
 const toiVals=l10.map(r=>clockToMinutes(r?.stats?.toi)).filter(v=>v!=null);
 return {historyLambda,seasonGoalRate:seasonGoal,seasonSogRate:seasonSog,shootingPct:shooting,recentGames:n,recentGoals,recentPowerPlayGoals,recentSog:recentSogAvg,recentFirstGoals,recentToi:mean(toiVals),priorGames:Number(h?.games||0)};
}
function opponentFor(game,player){
 const own=teamKey(player?.team);return [game?.away,game?.home].find(t=>teamKey(t?.abbr)!==own)||null;
}
function goalieContext(game,research,opponent){
 const goalies=(game?.players||[]).filter(p=>teamKey(p?.team)===teamKey(opponent?.abbr)&&teamKey(p?.position)==='G'&&p?.active!==false);
 const goalie=goalies.find(p=>p?.confirmedStarter||p?.currentGoalie)||null;if(!goalie)return {factor:1,id:null,name:null,savePct:null,verified:false};
 const prior=research?.players?.[goalie.id]||{},savePct=finite(prior?.savePct);
 if(savePct==null)return {factor:1,id:String(goalie.id),name:goalie.name||'',savePct:null,verified:true};
 return {factor:clamp(1+(.905-savePct)*2.4,.94,1.07),id:String(goalie.id),name:goalie.name||'',savePct,verified:true};
}
function playerMatchupContext(player,research,game,hist){
 const opponent=opponentFor(game,player),pos=nhlPositionGroup(player?.position),profile=research?.teamDefense?.teams?.[teamKey(opponent?.abbr)]||null,metric=profile?.position?.[pos]||null,goalie=goalieContext(game,research,opponent);
 const goalIndex=finite(metric?.goalIndex)??1,shotIndex=finite(metric?.shotIndex)??1,firstIndex=finite(metric?.firstGoalIndex)??1,overallIndex=finite(profile?.overallIndex)??1,ppIndex=finite(profile?.ppIndex)??1;
 const ppShare=hist?.recentGoals>0?clamp((hist?.recentPowerPlayGoals||0)/hist.recentGoals,0,.75):0;
 const anytimeFactor=clamp(1+.55*(goalIndex-1)+.20*(shotIndex-1)+.10*(overallIndex-1)+(.08+.12*ppShare)*(ppIndex-1),.78,1.28);
 const firstGoalFactor=clamp(anytimeFactor*(1+.30*(firstIndex-1)),.76,1.32);
 const firstFormFactor=clamp(1+((hist?.recentFirstGoals||0)-Number(hist?.recentGames||0)*.06)*.035,.94,1.10);
 const teamFactor=clamp(1+.20*(overallIndex-1)+.30*(goalie.factor-1),.94,1.06);
 const rank=finite(metric?.goalAllowedRank),ranked=finite(metric?.rankedTeams),rate=finite(metric?.goalsPerGame),sample=finite(metric?.games)||0;
 const label=anytimeFactor>=1.08?'Favorable':anytimeFactor<=.93?'Tough':'Neutral';
 const rankText=rank&&ranked?`#${rank} of ${ranked} in ${pos} goals allowed`:'position allowance near league baseline';
 const detail=profile&&metric?`${pos} vs ${teamKey(opponent?.abbr)} · ${rankText}${rate!=null?` · ${rate.toFixed(2)} G/GP`:''}`:`${pos} vs ${teamKey(opponent?.abbr)||'opponent'} · matchup sample pending`;
 return {opponent:teamKey(opponent?.abbr),position:pos,label,detail,sampleGames:sample,goalAllowedRank:rank,rankedTeams:ranked,goalsAllowedPerGame:rate,goalIndex,shotIndex,firstGoalIndex:firstIndex,overallDefenseIndex:overallIndex,powerPlayDefenseIndex:ppIndex,anytimeFactor,firstGoalFactor,firstFormFactor,teamFactor,goalie};
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
function riskyPick(group,topIds,{probKey,oddsKey,minOdds,minProb}){
 const candidates=group.filter(p=>!topIds.has(p.id)&&Number.isFinite(Number(p[oddsKey]))&&Number(p[oddsKey])>=minOdds&&Number(p[probKey])>=minProb).map(p=>{
  const market=americanImplied(p[oddsKey])||.01,edge=p[probKey]/market;
  const longshot=Math.log2(2+Math.max(0,Number(p[oddsKey]))/100),score=p[probKey]*Math.pow(clamp(edge,.6,3),.7)*longshot;
  return {...p,riskyEdge:edge,riskyScore:score,riskyReason:`${probabilityLabel(p[probKey])} model vs ${(100*market).toFixed(1)}% implied at ${Number(p[oddsKey])>0?'+':''}${p[oddsKey]}`};
 }).sort((a,b)=>b.riskyScore-a.riskyScore||b[probKey]-a[probKey]);
 if(candidates.length)return candidates[0];
 const fallback=group.filter(p=>!topIds.has(p.id)&&Number.isFinite(Number(p[probKey]))).sort((a,b)=>b[probKey]-a[probKey])[0]||null;
 return fallback?{...fallback,riskyEdge:null,riskyScore:null,riskyReason:'Best model longshot with verified price pending'}:null;
}
export function buildFirstGoalGame(game,research,odds){
 const skaters=validSkaters(game);if(!skaters.length)return null;
 const ctx=gameContext(odds,game),direct=directFirstGoalShares(odds,game,skaters),rows=[];
 for(const p of skaters){const atg=anytimeConsensus(odds,game.id,p.id),hist=playerHistoryMetrics(p,research,game,atg),fgs=bestFirstGoalQuote(odds,game.id,p.id),matchup=playerMatchupContext(p,research,game,hist);rows.push({player:p,atg,hist,fgs,matchup,rawLambda:hist.historyLambda*matchup.anytimeFactor});}
 for(const team of [game.away,game.home]){
  const group=rows.filter(r=>teamKey(r.player.team)===teamKey(team.abbr)),sum=group.reduce((s,r)=>s+r.rawLambda,0),baseTarget=team===game.home?ctx.homeExpected:ctx.awayExpected,teamFactor=median(group.map(r=>r.matchup?.teamFactor).filter(Number.isFinite))??1,target=clamp(baseTarget*teamFactor,baseTarget*.94,baseTarget*1.06);
  for(const r of group)r.lambda=sum>0?target*r.rawLambda/sum:target/Math.max(1,group.length);
 }
 const totalLambda=rows.reduce((s,r)=>s+(r.lambda||0),0)||ctx.total,goalOccurs=1-Math.exp(-totalLambda),firstWeights=rows.map(r=>[String(r.player.id),(r.lambda||0)*(r.matchup?.firstGoalFactor||1)/(r.matchup?.anytimeFactor||1)*(r.matchup?.firstFormFactor||1)]),firstWeightTotal=firstWeights.reduce((s,[,v])=>s+v,0)||totalLambda,baseShares=new Map(firstWeights.map(([id,v])=>[id,v/firstWeightTotal]));
 const directWeight=direct.books?clamp((.34+.1*Math.min(3,direct.books))*clamp(direct.coverage/.55,.65,1),.28,.66):0;
 let shareSum=0;
 for(const r of rows){const id=String(r.player.id),base=baseShares.get(id)||0,mkt=direct.shares.get(id)||0;r.finalShare=directWeight*mkt+(1-directWeight)*base;shareSum+=r.finalShare;}
 if(!(shareSum>0))shareSum=1;
 const all=rows.map(r=>{
  const probability=goalOccurs*r.finalShare/shareSum,marketShare=(direct.shares.get(String(r.player.id))||0)*goalOccurs,anytimeProbability=1-Math.exp(-Math.max(0,r.lambda||0));
  const confidence=direct.books>=3&&r.hist.priorGames>=40?'HIGH':direct.books>=1&&r.atg.books>=2?'MED':'MODEL';
  return {id:String(r.player.id),name:r.player.name,team:r.player.team,position:r.player.position,photo:r.player.photo||'',probability,probabilityLabel:probabilityLabel(probability),fairOdds:fairAmerican(probability),bestOdds:r.fgs.price,bestBook:r.fgs.book,firstGoalBooks:r.fgs.books,marketFirstGoalProbability:direct.books?marketShare:null,anytimeProbability,anytimeProbabilityLabel:probabilityLabel(anytimeProbability),fairAtgOdds:fairAmerican(anytimeProbability),bestAtgOdds:r.atg.bestPrice,bestAtgBook:r.atg.bestBook,anytimeMarketProbability:r.atg.prob,anytimeBooks:r.atg.books,confidence,lambda:r.lambda,matchup:r.matchup,...r.hist};
 }).sort((a,b)=>b.probability-a.probability);
 const teamBlock=team=>{
  const group=all.filter(p=>teamKey(p.team)===teamKey(team.abbr)),players=group.slice().sort((a,b)=>b.probability-a.probability).slice(0,3).map((p,i)=>({...p,teamRank:i+1})),atgPlayers=group.slice().sort((a,b)=>b.anytimeProbability-a.anytimeProbability).slice(0,3).map((p,i)=>({...p,teamRank:i+1}));
  const riskyFirst=riskyPick(group,new Set(players.map(p=>p.id)),{probKey:'probability',oddsKey:'bestOdds',minOdds:900,minProb:.025});
  const riskyAtg=riskyPick(group,new Set(atgPlayers.map(p=>p.id)),{probKey:'anytimeProbability',oddsKey:'bestAtgOdds',minOdds:250,minProb:.10});
  return {id:String(team.id||''),abbr:team.abbr,name:team.name,logo:team.logo||'',expectedGoals:group.reduce((sum,p)=>sum+Number(p.lambda||0),0),winProbability:team===game.home?ctx.homeWin:ctx.awayWin,players,atgPlayers,riskyFirstGoal:riskyFirst,riskyAtg};
 };
 const away=teamBlock(game.away),home=teamBlock(game.home);
 return {gameId:String(game.id),startTime:game.startTime,status:game.status,venue:game.venue||'',away,home,expectedGoals:totalLambda,noGoalProbability:1-goalOccurs,directFirstGoalBooks:direct.books,directMarketCoverage:direct.coverage,directMarketWeight:directWeight,model:'FGS-Hazard Ensemble v2',method:'Competing Poisson hazards anchored to sportsbook totals and scorer markets, then matchup-adjusted by opponent position scoring/shot allowance, first-goal allowance, power-play defense and verified goalie context.',top6:[...away.players,...home.players].sort((a,b)=>b.probability-a.probability),top6Atg:[...away.atgPlayers,...home.atgPlayers].sort((a,b)=>b.anytimeProbability-a.anytimeProbability)};
}
export function buildFirstGoalSlate(slate,research,odds,old=null){
 const preserve=old?.date===slate?.date?new Map((old.games||[]).map(g=>[String(g.gameId),g])):new Map();
 const games=(slate?.games||[]).map(g=>{
  if(g.status!=='pre'&&preserve.has(String(g.id)))return {...preserve.get(String(g.id)),status:g.status,away:{...preserve.get(String(g.id)).away,score:g.away?.score??null},home:{...preserve.get(String(g.id)).home,score:g.home?.score??null}};
  return buildFirstGoalGame(g,research,odds);
 }).filter(Boolean);
 return {version:2,source:'TSO NHL first-goal model',model:'FGS-Hazard Ensemble v2',generatedAt:new Date().toISOString(),date:slate?.date||'',season:slate?.season||'',methodology:{eventModel:'competing Poisson scoring hazards with player-specific matchup redistribution',marketAnchor:'ParlayAPI player_first_goal_scorer + player_anytime_goal',playerInputs:['verified prior-season goals/game','shots/game','regressed shooting percentage','last-10 goals/shots','last-10 first-goal occurrences','recent power-play scoring'],matchupInputs:['opponent goals allowed by C/LW/RW/D','opponent shots allowed by position','opponent first-goal scorer position','opponent PP goals allowed','recent overall defensive form','verified starting-goalie save rate when available'],gameInputs:['sportsbook total','de-vigged moneyline team strength','opponent defensive profile'],selection:'Top 3 and Risky Value are selected only after matchup-adjusted FGS and ATG probabilities are calculated.',riskyPick:'One additional player per team chosen outside the top three for a combination of long verified odds, matchup-adjusted model probability and price-vs-model edge.',note:'Sportsbook markets remain the anchor. Matchup factors are sample-shrunk and capped so small samples cannot overwhelm market and player-history evidence.'},games};
}
