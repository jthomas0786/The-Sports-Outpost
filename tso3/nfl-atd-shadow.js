/* TSO3 experimental 2026 ATD shadow — research only.
   Current live TSO probabilities and A–F grades are untouched.
   NO in-sample calibration or retrospective predictions are claimed. */
(function(root){
'use strict';
const SEASON=2026,VERSION='atd-2026-shadow-v2-rz';
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const team=x=>{const s=String(x||'').toUpperCase().replace(/[^A-Z]/g,'');
 return ({JAX:'JAC',JAGUARS:'JAC',LAR:'LA',RAMS:'LA',WSH:'WAS',WASHINGTON:'WAS',AZ:'ARI',ARIZONA:'ARI',GNB:'GB',SFO:'SF'}[s]||s)};
const rate=(def,pos)=>{
 const t=def?.perGame;
 if(!t)return null;
 const rush=num(t.rushTds),rec=num(t.recTds);
 return rush!==null&&rec!==null?rush+rec:null; // Never count QB passing TDs as ATD.
};
function context(research){
 const refs=new Map(),bad=new Set();
 if(!research||Number(research.season)!==SEASON)return {available:false,ref:new Map(),conflicts:bad,means:new Map()};
 for(const p of research.players||[]){
  const pos=String(p.matchup?.positionGroup||'').toUpperCase(),opp=team(p.matchup?.opponent),
   def=p.matchup?.currentSeasonAllowed,g=num(def?.games),td=rate(def,pos);
  if(!opp||!['QB','RB','WR','TE'].includes(pos)||Number(p.matchup?.season)!==SEASON||g===null||g<3||td===null)continue;
  const k=pos+'|'+opp,old=refs.get(k);
  if(old&&(Math.abs(old.tds-td)>0.03||old.games!==g)){bad.add(k);continue}
  refs.set(k,{tds:td,games:g});
 }
 const means=new Map();
 for(const pos of ['QB','RB','WR','TE']){
  const rows=[...refs].filter(([k])=>k.startsWith(pos+'|')&&!bad.has(k)).map(([,v])=>v.tds);
  if(rows.length>=16){const avg=rows.reduce((a,b)=>a+b,0)/rows.length;
   if(avg>0)means.set(pos,{avg,defenses:rows.length})}
 }
 return {available:true,ref:refs,conflicts:bad,means};
}
function project(input,now=Date.now()){
 const {baseProbability:base,player,game,report,reference,generatedAt,redzone}=input||{};
 if(num(base)===null||base<0||base>1)return {available:false,reason:'No fresh current TSO ATD source'};
 if(!player||!game||!reference?.available)return {available:false,reason:'No verified 2026 research'};
 const pos=String(player.position||'').toUpperCase();
 if(!['QB','RB','WR','TE'].includes(pos))return {available:false,reason:'Unsupported ATD position'};
 if(/^(out|injured reserve|ir|inactive|suspended)$/i.test(String(report?.status||'')))
  return {available:false,reason:'Officially unavailable player'};
 const kickoff=Date.parse(game.startTime||''),asOf=Date.parse(generatedAt||'');
 if(!Number.isFinite(kickoff)||!Number.isFinite(asOf)||kickoff<=now
  ||asOf>now+60000||asOf>kickoff||now-asOf>30*3600000)
  return {available:false,reason:'Research timestamp or game window invalid'};
 if(![team(game.away?.abbr),team(game.home?.abbr)].includes(team(player.team)))
  return {available:false,reason:'Player team does not match official fixture'};
 const opponent=team(player.team)===team(game.home?.abbr)?team(game.away?.abbr):team(game.home?.abbr);
 if(team(player.matchup?.opponent)!==opponent||String(player.matchup?.positionGroup||'').toUpperCase()!==pos
   ||Number(player.matchup?.season)!==SEASON)
   return {available:false,reason:'2026 defense not matched to official opponent'};
 // Only season-2026 dated completed games, never the fixture being forecast.
 const seen=new Set(),logs=[];
 for(const g of (player.logs||[]).slice().sort((a,b)=>Number(b.week)-Number(a.week))){
  if(Number(g.season)!==SEASON||!Number.isInteger(Number(g.week)))continue;
  const end=Date.parse(String(g.date||'')+'T23:59:59Z'),tdRush=num(g.rushTds),tdRec=num(g.recTds);
  if(!Number.isFinite(end)||end>=kickoff-3600000||end>now
    ||tdRush===null||tdRec===null||tdRush<0||tdRec<0
    ||(g.gameId&&String(g.gameId)===String(game.id)))continue;
  const key=String(g.week);if(seen.has(key))continue;seen.add(key);logs.push(g);
  if(logs.length>=10)break;
 }
 if(logs.length<3)return {available:false,reason:'Fewer than three dated 2026 games'};
 const wins=logs.filter(g=>g.rushTds+g.recTds>0).length,n=logs.length;
 const priorGames=8,posterior=(priorGames*base+wins)/(priorGames+n);
 // Small capped observed opportunity adjustment from completed games.
 const prev=player.previousSeason,prevPg=prev?.perGame;
 let roleFactor=1,roleSignal='none';
 if(Number(prev?.games)>=8&&prevPg){
  const recent=logs.slice(0,5);
  const opp=g=>pos==='WR'||pos==='TE'?num(g.targets):
   pos==='QB'?num(g.carries):
   num(g.carries)!==null&&num(g.targets)!==null?g.carries+0.5*g.targets:null;
  const old=pos==='WR'||pos==='TE'?num(prevPg.targets):pos==='QB'?num(prevPg.carries):
   num(prevPg.carries)!==null&&num(prevPg.targets)!==null?prevPg.carries+0.5*prevPg.targets:null;
  const current=recent.map(opp);
  if(old!==null&&old>=2&&current.every(v=>v!==null&&v>=0)){
   const avg=current.reduce((a,b)=>a+b,0)/current.length;
   const ratio=(avg+1)/(old+1);
   roleFactor=1+(clamp(ratio,0.85,1.15)-1)*(n/(n+8))*0.6;
   roleSignal='2026 observed carries/targets vs 2025';
  }
 }
 let defenseFactor=1,defenseGames=null,defenseRate=null,leagueRate=null;
 const key=pos+'|'+opponent,ref=reference.ref.get(key),avg=reference.means.get(pos);
 if(ref&&!reference.conflicts.has(key)&&avg?.avg>0){
  defenseGames=ref.games;defenseRate=ref.tds;leagueRate=avg.avg;
  defenseFactor=1+clamp((ref.tds/avg.avg-1)*(ref.games/(ref.games+8))*0.25,-0.12,0.12);
 }
 // Only source-verified 2026 rush/target opportunity shares. Crosswalk strictly
 // by the stable nflverse GSIS ID and identical team; no player-name guesses.
 let redzoneFactor=1,redzoneGames=null,redzoneShare=null,goalLineShare=null,
  redzoneSourceAt=null,redzoneSignal='not verified';
 const pbpAt=Date.parse(redzone?.generatedAt||''),
  lastGame=Date.parse(String(redzone?.lastObservedGameDate||'')+'T23:59:59Z');
 if(redzone?.available===true&&Number(redzone.season)===SEASON&&player.gsisId
  &&Number.isFinite(pbpAt)&&pbpAt<=now+60000&&pbpAt<=kickoff
  &&now-pbpAt<=10*86400000&&Number.isFinite(lastGame)&&lastGame<=now+86400000
  &&now-lastGame<=8*86400000&&Number(redzone.gamesScanned)>=80){
  const record=redzone.players?.[String(player.gsisId)],a=record?.current,b=record?.previous;
  if(team(record?.team)===team(player.team)&&Number(a?.gamesWithOpportunities)>=3
   &&Number(b?.gamesWithOpportunities)>=8&&Number(a?.redZoneOpps)>=5
   &&Number(b?.redZoneOpps)>=12&&num(a?.redZoneSharePct)!==null
   &&num(b?.redZoneSharePct)!==null&&a.redZoneSharePct<=100&&b.redZoneSharePct<=100){
   redzoneGames=a.gamesWithOpportunities;redzoneShare=a.redZoneSharePct;
   goalLineShare=num(a?.goalLineSharePct);
   const rzRatio=(a.redZoneSharePct+8)/(b.redZoneSharePct+8);
   let glRatio=1;
   if(Number(a?.goalLineOpps)>=3&&Number(b?.goalLineOpps)>=5
    &&num(a.goalLineSharePct)!==null&&num(b.goalLineSharePct)!==null
    &&a.goalLineSharePct<=100&&b.goalLineSharePct<=100)
    glRatio=(a.goalLineSharePct+5)/(b.goalLineSharePct+5);
   const adjust=(0.75*(rzRatio-1)+0.25*(glRatio-1))*0.28*(a.gamesWithOpportunities/(a.gamesWithOpportunities+8));
   redzoneFactor=1+clamp(adjust,-0.10,0.10);
   redzoneSourceAt=redzone.generatedAt;redzoneSignal='verified 2026 inside-20 and inside-5 PBP opportunity shares';
  }
 }
 const probability=clamp(posterior*roleFactor*defenseFactor*redzoneFactor,0.005,0.8);
 return {available:true,probability,version:VERSION,observedGames:n,tdGames:wins,asOf:generatedAt,
  base,posterior,roleFactor,roleSignal,defenseFactor,defenseGames,defenseRate,leagueRate,
  redzoneFactor,redzoneGames,redzoneShare,goalLineShare,redzoneSourceAt,redzoneSignal,
  caveat:'Experimental 2026 observation update; not backtested, calibrated, or an independently validated grade. Where available, 2026 inside-20/inside-5 inputs come strictly from nflverse play-by-play.'};
}
const api={VERSION,context,project};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.TSO3AtdShadow=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:undefined));
