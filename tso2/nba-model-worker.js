addEventListener('fetch',event=>event.respondWith(handle(event.request)));

const RESEARCH_URL='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nba-research.json';
const ODDS_URL='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nba-odds.json';
const MARKET_KEY={points:'points',rebounds:'rebounds',assists:'assists',threes:'threes',pra:'pra'};
const FLOOR_SD={points:4.5,rebounds:2.1,assists:1.8,threes:.95,pra:6.2};

const finite=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const weighted=(rows,getter,weight)=>{let s=0,w=0;rows.forEach((r,i)=>{const v=finite(getter(r));if(v==null)return;const x=weight(r,i);if(!(x>0))return;s+=v*x;w+=x;});return w?s/w:null;};
const sd=(xs,center=null)=>{const a=xs.map(finite).filter(v=>v!=null);if(a.length<2)return null;const m=center??mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1));};
function erf(x){const sign=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a);const y=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-a*a);return sign*y;}
const cdf=z=>.5*(1+erf(z/Math.SQRT2));
const overProbability=(line,m,s)=>s>0?clamp(1-cdf((line-m)/s),.01,.99):null;
const americanImplied=p=>{const n=finite(p);if(n==null||n===0)return null;return n>0?100/(n+100):(-n)/((-n)+100);};

function positionGroup(pos){
  const p=String(pos||'').toUpperCase();
  if(['PG','SG','G'].includes(p))return 'G';
  if(['SF','PF','F'].includes(p))return 'F';
  if(['C','FC','F-C','C-F'].includes(p))return 'C';
  return p||'ALL';
}
function metric(game,market){return finite(game?.stats?.[MARKET_KEY[market]||market]);}
function gamesFor(player,market){
  const all=(player?.recentGames||[]).filter(g=>metric(g,market)!=null&&finite(g.minutes)!=null&&Number(g.minutes)>=4).sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));
  const competitive=all.filter(g=>Number(g.seasonType)!==1);
  return competitive.length>=6?competitive:all;
}
function gameWeight(g,i,currentSeason){
  const recency=Math.exp(-i/11),season=Number(g.season)===Number(currentSeason)?1:.84,type=Number(g.seasonType)===1?.58:1;
  const mins=finite(g.minutes),role=mins==null?1:clamp(mins/28,.55,1.08);
  return recency*season*type*role;
}
function splitMean(games,market,homeAway){return mean(games.filter(g=>g.homeAway===homeAway).map(g=>metric(g,market)).filter(v=>v!=null));}
function resolvePlayer(research,name){const id=research?.nameIndex?.[norm(name)];return id?research?.players?.[id]||null:null;}
function resolveTeam(research,name){const id=research?.teamIndex?.[norm(name)];return id?research?.teams?.[id]||null:null;}
function matchupFor(research,row,player){
  const home=resolveTeam(research,row?.homeTeam),away=resolveTeam(research,row?.awayTeam);
  if(!home||!away||!player?.teamId)return null;
  const pid=String(player.teamId);
  if(String(home.id)===pid)return {venue:'home',opponent:away};
  if(String(away.id)===pid)return {venue:'away',opponent:home};
  return null;
}
function opponentFactor(research,opponent,player,market){
  const pos=positionGroup(player?.position),allow=research?.teamDefense?.[String(opponent?.id)]?.byPosition?.[pos]?.[market],league=research?.league?.allowByPosition?.[pos]?.[market];
  if(!Number.isFinite(Number(allow))||!Number.isFinite(Number(league))||Number(league)<=0)return {factor:1,value:null,league:null};
  const raw=Number(allow)/Number(league);return {factor:clamp(1+(raw-1)*.5,.96,1.04),value:Number(allow),league:Number(league)};
}
function paceFactor(research,player,opponent){
  const league=finite(research?.league?.pace),own=finite(research?.teamProfiles?.[String(player?.teamId)]?.pace),opp=finite(research?.teamProfiles?.[String(opponent?.id)]?.pace);
  if(league==null||league<=0||own==null||opp==null)return {factor:1,expected:null,league};
  const expected=(own+opp)/2,raw=expected/league;return {factor:clamp(1+(raw-1)*.6,.97,1.03),expected,league};
}
function daysRest(row,games){const start=Date.parse(row?.commenceTime||''),prev=Date.parse(games?.[0]?.date||'');if(!Number.isFinite(start)||!Number.isFinite(prev))return null;return Math.max(0,Math.floor((start-prev)/86400000)-1);}
function injuryFactor(player){
  const text=String(player?.injury?.status||player?.injury?.detail||'').toLowerCase();
  if(/\bout\b|suspension|injured reserve/.test(text))return {available:false,factor:0,confidence:.2,status:player?.injury?.status||'Out'};
  if(/doubtful/.test(text))return {available:true,factor:.90,confidence:.58,status:player?.injury?.status||'Doubtful'};
  if(/questionable|game.?time|day.?to.?day/.test(text))return {available:true,factor:.97,confidence:.78,status:player?.injury?.status||'Questionable'};
  return {available:true,factor:1,confidence:1,status:player?.injury?.status||null};
}
function grade(edge,n,available=true){
  if(!available)return {letter:'OUT',tone:'d'};
  const a=Math.abs(edge??0),sample=n>=20?1:n>=12?.9:n>=7?.75:.55,x=a*sample;
  if(x>=.075)return {letter:'A+',tone:'a'};if(x>=.060)return {letter:'A',tone:'a'};if(x>=.045)return {letter:'B+',tone:'b'};if(x>=.030)return {letter:'B',tone:'b'};if(x>=.015)return {letter:'C+',tone:'c'};return {letter:'C',tone:'c'};
}
function buildProjection({research,row,market,line,fairOverProb=null}){
  const m=market||row?.market,ln=finite(line??row?.line);if(!research||!m||ln==null)return null;
  const player=resolvePlayer(research,row?.player);if(!player)return null;
  const displayGames=(player?.recentGames||[]).filter(g=>metric(g,m)!=null&&finite(g.minutes)!=null&&Number(g.minutes)>=4).sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));
  const games=gamesFor(player,m);if(games.length<4)return null;
  const matchup=matchupFor(research,row,player);if(!matchup)return null;
  const currentSeason=research.currentSeason;
  const base=weighted(games,g=>metric(g,m),(g,i)=>gameWeight(g,i,currentSeason));if(base==null)return null;
  const last5=mean(games.slice(0,5).map(g=>metric(g,m)).filter(v=>v!=null)),last10=mean(games.slice(0,10).map(g=>metric(g,m)).filter(v=>v!=null)),fullMean=mean(games.map(g=>metric(g,m)).filter(v=>v!=null));
  const pos=positionGroup(player.position),leaguePos=finite(research?.league?.playerByPosition?.[pos]?.[m]);
  const weight=clamp(4/(games.length+32),.05,.13),shrink=leaguePos==null?base:(base*(1-weight)+leaguePos*weight);
  const avgMin=weighted(games,g=>g.minutes,(g,i)=>gameWeight(g,i,currentSeason));
  const currentRoleGames=games.filter(g=>Number(g.season)===Number(currentSeason)&&Number(g.seasonType)!==1).slice(0,5);
  const recentMin=currentRoleGames.length>=3?mean(currentRoleGames.map(g=>finite(g.minutes)).filter(v=>v!=null)):avgMin;
  const minuteFactor=currentRoleGames.length>=3&&avgMin&&recentMin?clamp((recentMin/avgMin)**.45,.93,1.07):1;
  const avgUsage=weighted(games,g=>g.usageProxy,(g,i)=>gameWeight(g,i,currentSeason));
  const recentUsage=currentRoleGames.length>=3?mean(currentRoleGames.map(g=>finite(g.usageProxy)).filter(v=>v!=null)):avgUsage;
  const usageFactor=currentRoleGames.length>=3&&avgUsage&&recentUsage?clamp((recentUsage/avgUsage)**.22,.96,1.04):1;
  const split=splitMean(games,m,matchup.venue),rawVenue=split&&fullMean?split/fullMean:1,venueFactor=clamp(1+(rawVenue-1)*.5,.975,1.025);
  const opp=opponentFactor(research,matchup.opponent,player,m),pace=paceFactor(research,player,matchup.opponent),rest=daysRest(row,games),restFactor=rest===0?.96:rest!=null&&rest>=3?1.01:1,injury=injuryFactor(player);
  let projection=Math.max(0,shrink*minuteFactor*usageFactor*venueFactor*opp.factor*pace.factor*restFactor*injury.factor);
  const vals=games.slice(0,20).map(g=>metric(g,m)).filter(v=>v!=null),rawSd=sd(vals,mean(vals)),leagueSd=finite(research?.league?.marketSd?.[m]);
  let sigma=Math.max(FLOOR_SD[m]||1,rawSd||0);if(leagueSd!=null)sigma=sigma*.75+leagueSd*.25;sigma*=1+(1-injury.confidence)*.25;
  const modelOver=injury.available?overProbability(ln,projection,sigma):.01,fair=finite(fairOverProb),edge=fair==null?null:modelOver-fair,lean=modelOver>=.5?'Over':'Under',confidence=Math.max(modelOver,1-modelOver)*injury.confidence,g=grade(edge??(confidence-.5),games.length,injury.available);
  return {
    version:'nba-regression-v1',playerId:player.id,player:player.name,team:player.team,teamId:player.teamId,position:player.position,headshot:player.headshot||null,
    opponent:matchup.opponent.name,opponentId:matchup.opponent.id,venue:matchup.venue,market:m,line:ln,
    projection:+projection.toFixed(2),sigma:+sigma.toFixed(2),overProbability:+modelOver.toFixed(4),underProbability:+(1-modelOver).toFixed(4),
    lean,confidence:+confidence.toFixed(4),fairMarketOver:fair==null?null:+fair.toFixed(4),edge:edge==null?null:+edge.toFixed(4),grade:g.letter,gradeTone:g.tone,
    sampleGames:games.length,last5:last5==null?null:+last5.toFixed(2),last10:last10==null?null:+last10.toFixed(2),seasonBaseline:fullMean==null?null:+fullMean.toFixed(2),
    averageMinutes:avgMin==null?null:+avgMin.toFixed(1),recentMinutes:recentMin==null?null:+recentMin.toFixed(1),usageProxy:avgUsage==null?null:+avgUsage.toFixed(2),
    recentUsageProxy:recentUsage==null?null:+recentUsage.toFixed(2),restDays:rest,injury:player.injury||null,available:injury.available,
    factors:{minutes:+minuteFactor.toFixed(3),usage:+usageFactor.toFixed(3),venue:+venueFactor.toFixed(3),opponent:+opp.factor.toFixed(3),pace:+pace.factor.toFixed(3),rest:+restFactor.toFixed(3),injury:+injury.factor.toFixed(3)},
    opponentAllowance:opp.value==null?null:+opp.value.toFixed(2),leaguePositionAllowance:opp.league==null?null:+opp.league.toFixed(2),expectedPace:pace.expected==null?null:+pace.expected.toFixed(1),leaguePace:pace.league==null?null:+pace.league.toFixed(1),
    recentGames:displayGames.slice(0,10).map(g=>({date:g.date,opponent:g.opponent,homeAway:g.homeAway,minutes:g.minutes,value:metric(g,m),pace:g.pace,season:g.season,seasonType:g.seasonType,usedInProjection:Number(g.seasonType)!==1||games.length<6}))
  };
}
function marketFairOver(rows=[]){
  const probs=rows.map(r=>{const o=americanImplied(r?.overPrice),u=americanImplied(r?.underPrice);return o!=null&&u!=null&&o+u>0?o/(o+u):null;}).filter(v=>v!=null);
  return probs.length?mean(probs):null;
}
async function getJson(url,ttl){
  const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'TheSportsOutpost/2.0'},cf:{cacheTtl:ttl,cacheEverything:true}});
  if(!r.ok)throw new Error('HTTP '+r.status+' '+url);
  return r.json();
}
function keyOf(row){return [row?.eventId,norm(row?.player),row?.market,Number(row?.line)].join('|');}
async function handle(req){
  if(req.method==='OPTIONS')return new Response('',{headers:cors()});
  if(req.method!=='GET')return json({error:'method not allowed'},405);
  try{
    const [research,odds]=await Promise.all([getJson(RESEARCH_URL,120),getJson(ODDS_URL,60)]);
    const groups=new Map();
    for(const row of odds?.rows||[]){
      if(!MARKET_KEY[row?.market]||!Number.isFinite(Number(row?.line)))continue;
      const key=keyOf(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
    }
    const models=[];
    for(const rows of groups.values()){
      const row=rows[0],fair=marketFairOver(rows),projection=buildProjection({research,row,market:row.market,line:row.line,fairOverProb:fair});
      if(!projection)continue;
      models.push({
        key:keyOf(row),eventId:String(row.eventId||''),player:row.player,market:row.market,line:Number(row.line),
        commenceTime:row.commenceTime,homeTeam:row.homeTeam,awayTeam:row.awayTeam,
        researchGeneratedAt:research.generatedAt||null,oddsGeneratedAt:odds?.meta?.fetchedAt||null,
        ...projection
      });
    }
    return json({source:'tso-nba-regression-v1',generatedAt:new Date().toISOString(),researchGeneratedAt:research.generatedAt||null,oddsGeneratedAt:odds?.meta?.fetchedAt||null,models});
  }catch(e){return json({error:String(e?.message||e)},502)}
}
function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'}}
function json(v,status=200){return new Response(JSON.stringify(v),{status,headers:{...cors(),'content-type':'application/json; charset=UTF-8'}})}
