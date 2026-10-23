/* TSO 3.0 NFL research: compact table-first, official game identity and actual TSO ATD model. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const tools=['defense-vs-position','coverage-matchups','touchdown-opportunities','rushing-matchups','receiving-matchups','quarterback-research',
 'red-zone-usage','offensive-line-matchups','power-ratings','weather-impact','game-projections'];
const titles={
 'defense-vs-position':'NFL DEFENSE VS POSITION · 2026',
 'coverage-matchups':'RECEIVER VS PASS DEFENSE',
 'touchdown-opportunities':'ANYTIME TOUCHDOWN PROJECTIONS',
 'rushing-matchups':'RUSHING RESEARCH',
 'receiving-matchups':'RECEIVING RESEARCH',
 'quarterback-research':'QUARTERBACK RESEARCH',
 'red-zone-usage':'RED-ZONE TOUCHDOWN OPPORTUNITIES',
 'offensive-line-matchups':'OFFENSIVE LINE MATCHUPS',
 'power-ratings':'NFL TEAM RATINGS',
 'weather-impact':'GAME-DAY WEATHER & VENUES',
 'game-projections':'NFL GAME PROJECTIONS'
};
const notes={
 'defense-vs-position':'Compare each NFL defense against QB, RB, WR, and TE as a position group—not individual players. One row per matchup, defensive team, and position, using verified 2026 defensive allowances.',
 'coverage-matchups':'Verified 2026 receiving usage against the next defense’s positional WR/TE/RB allowances, with current sportsbook Over lines and exact 50K model comparisons. No invented cornerback assignments or man/zone grades.',
 'touchdown-opportunities':'TSO regressed anytime-rushing/receiving-touchdown estimates, 2025 production baseline and 2026 roster/availability context. Passing TDs do not count as quarterback ATDs.',
 'rushing-matchups':'Current NFL player history, carries, rush yards, rushing TDs, recent volume and exact verified sportsbook lines.',
 'receiving-matchups':'Verified target volume, receptions, yards, target share and season game logs. Coverage assignment grades are not inferred.',
 'quarterback-research':'Verified passing attempts, completions, passing yards, passing touchdowns, game logs and opponent context.',
 'red-zone-usage':'2025 baseline red-zone targets and carries from the existing TSO model, compared with observed 2026 role, production and opponent red-zone defense. No unsupported 2026 red-zone splits.',
 'offensive-line-matchups':'Verified 2026 opponent defense allowances as an initial passing/rushing matchup proxy; these are NOT offensive-line pass-block win rates, pressure rates or protection grades.',
 'power-ratings':'Current ESPN records plus event-specific TSO 50K simulation probabilities and model point differentials. A calibrated, independently sourced team power rating remains unavailable.',
 'weather-impact':'Official ESPN kickoff times and roof designation, paired with NOAA National Weather Service hourly forecasts at verified U.S. stadium coordinates. Indoor and international games are labeled; missing forecasts stay blank.',
 'game-projections':'Current official NFL matchups matched to TSO Monte Carlo simulations. Estimated team scores, win probabilities, spread and total shown only for current verified model runs.'
};
const columns={
 'defense-vs-position':['MATCHUP','DEFENSE','FACING OFFENSE','VS POSITION','YDS / GM','REFERENCE AVG','DIFF VS REF','TD / GM','TARGETS / GM','GAMES'],
 'touchdown-opportunities':['PLAYER','MATCHUP','TSO ATD MODEL','50K SIM ATD','MODEL GAP','50K SIM 2+ TD','TSO GRADE','2025 RZ OPP/GM','2026 SNAP L5','2026 TGT SHARE','OPP RZ TD RATE','BEST ATD ODDS'],
 'red-zone-usage':['PLAYER','MATCHUP','2025 RZ CARRIES','2025 RZ TARGETS','2025 RZ/GM','2026 TARGET SHARE','2026 SNAP L5','2026 TD/GM','OPP RZ TD %','TSO ATD'],
 'rushing-matchups':['PLAYER','MATCHUP','L5 RUSH YDS','L10 RUSH YDS','L5 CARRIES','2026 YDS / GM','OPP RUSH YDS/GM','BEST BOOK'],
 'receiving-matchups':['PLAYER','MATCHUP','L5 REC YDS','L10 REC YDS','L5 TARGETS','L5 RECEPTIONS','OPP REC YDS/GM','BEST BOOK'],
 'coverage-matchups':['RECEIVER','MATCHUP','OPP DEFENSE','MARKET','2026 L5 AVG','2026 L10 AVG','TGT SHARE','L5 SNAP %','DEF VS POS / GM','BOOK OVER LINE','L5 OVER','50K EXACT OVER'],
 'quarterback-research':['PLAYER','MATCHUP','L5 PASS YDS','L5 ATTEMPTS','L5 COMPLETIONS','L5 PASS TD','OPP PASS YDS/GM','BEST BOOK'],
 'offensive-line-matchups':['MATCHUP','KICKOFF','AWAY QB: HOME DEF','HOME QB: AWAY DEF','AWAY RB: HOME DEF','HOME RB: AWAY DEF','SAMPLE','TRACKING STATUS'],
 'power-ratings':['MATCHUP','KICKOFF','AWAY RECORD','HOME RECORD','AWAY WIN PROB','HOME WIN PROB','MODEL POINT DIFF','RATING STATUS'],
 'weather-impact':['MATCHUP','KICKOFF','STADIUM','ROOF','KICKOFF TEMP','WIND','WIND GUST','RAIN/SNOW %','FORECAST','SOURCE'],
 'game-projections':['MATCHUP','KICKOFF','AWAY WIN %','HOME WIN %','AWAY SCORE','HOME SCORE','SPREAD / TOTAL','SIM WORLDS']
};
const historyTool={
 'rushing-matchups':'rushYds','receiving-matchups':'recYds','coverage-matchups':'targets','quarterback-research':'passYds',
 'touchdown-opportunities':'tds','red-zone-usage':'tds'
};
const state={tool:'touchdown-opportunities',games:[],positions:[],search:'',minGames:0,conflictsOnly:false,tdOrder:'tso',coverageMarket:'recYds',coverageSort:'model',sort:'model',reverse:false,open:{games:false,positions:false},max:90,all:[],visible:[],context:null,selected:null,version:null};
const modelTools=new Set(['touchdown-opportunities','red-zone-usage']);
const ppGap=(r)=>r.modelProbability===null||r.simAtd===null?null:Math.abs(r.modelProbability-r.simAtd)*100;
const gapLabel=r=>{
 const value=ppGap(r);
 return value===null?'—':value.toFixed(1)+' pp';
};
const divergence=r=>{
 const v=ppGap(r);return v===null?'':v>=20?'HIGH DIVERGENCE':v>=12?'MODEL DISAGREEMENT':'';
};
const gameTools=new Set(['offensive-line-matchups','power-ratings','weather-impact','game-projections']);
const asof=raw=>{const d=new Date(raw||'');return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'unavailable'};
const when=raw=>{const d=new Date(raw||'');return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'—'};
const f=v=>num(v)===null?'—':Number(v).toFixed(1);
const fmtPrice=v=>num(v)===null?'—':(v>0?'+':'')+Number(v);
const percent=v=>num(v)===null?'—':(Number(v)*100).toFixed(1)+'%';
const canonicalTeam=t=>({LAR:'LA',WSH:'WAS',JAX:'JAC',GNB:'GB',SFO:'SF'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
function matchGame(doc,team){
 const now=Date.now();
 return (doc?.games||[]).filter(g=>g.state!=='post'&&Date.parse(g.startTime)>now-15*60000
  &&[g.home?.abbr,g.away?.abbr].map(canonicalTeam).includes(canonicalTeam(team)))
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime))[0]||null;
}
function upcoming(doc){
 return (doc?.games||[]).filter(g=>g.league==='nfl'&&g.state!=='post'
  &&Date.parse(g.startTime)>Date.now()-15*60000)
  .sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
}
function findResearch(ctx,p){
 const players=ctx.research?.players||[];
 return players.find(x=>p.id&&String(x.id)===String(p.id))
  ||players.find(x=>norm(x.name)===norm(p.name)&&canonicalTeam(x.team)===canonicalTeam(p.team))
  ||null;
}
function avg(logs,key,n=5,season=null){
 const xs=(logs||[]).filter(g=>season===null||Number(g.season)===Number(season))
 .slice(0,n===Infinity?undefined:n)
 .map(g=>num(g[key])).filter(x=>x!==null);
 return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
}
function tdHit(logs,n=5,season=null){
 const xs=(logs||[]).filter(g=>season===null||Number(g.season)===Number(season)).slice(0,n);
 return xs.length?{hits:xs.filter(g=>(num(g.rushTds)||0)+(num(g.recTds)||0)>0).length,n:xs.length}:null;
}
function officialAvailability(ctx,player){
 const all=ctx.injuries?.entries||[];
 return all.find(x=>String(x.athleteId)===String(player.id)
  ||(norm(x.name)===norm(player.name)&&canonicalTeam(x.team)===canonicalTeam(player.team)))||null;
}
function cannotPlay(report){
 return /^(out|injured reserve|suspension|inactive)$/i.test(String(report?.status||''));
}
function bestQuote(ctx,game,player,market){
 if(!game)return null;
 const rows=ctx.odds?.rows||[];
 const matches=rows.filter(x=>String(x.verifiedGameId)===String(game.id)
  &&norm(x.player)===norm(player.name)&&x.market===market);
 return matches.sort((a,b)=>Number(b.price)-Number(a.price))[0]||null;
}
function positionalBenchmarks(ctx){
 const benchmark=ctx.research?.positionalBenchmarks||{};
 return new Map(['QB','RB','WR','TE'].map(pos=>{
  const row=benchmark[pos];
  const eligible=row&&Number(row.season)===Number(ctx.research?.season)
   &&Number(row.defenses)>=16&&Number(row.minGames)>=3;
  return [pos,eligible?num(row.yardsPerGame):null];
 }));
}

function defenseAllowed(ctx,team,pos,category){
 const name=canonicalTeam(team);
 const source=(ctx.research?.players||[]).find(p=>canonicalTeam(p.matchup?.opponent)===name
  &&String(p.matchup?.positionGroup||'').toUpperCase()===pos
  &&Number(p.matchup?.season)===Number(ctx.research?.season)
  &&Number(p.matchup?.currentSeasonAllowed?.games)>=3
  &&num(p.matchup?.currentSeasonAllowed?.perGame?.[category])!==null);
 if(!source)return null;
 return {value:num(source.matchup.currentSeasonAllowed.perGame[category]),
  games:num(source.matchup.currentSeasonAllowed.games)};
}
function defensePositionRows(ctx,games,benchmarks){
 const season=Number(ctx.research?.season),index=new Map(),conflicts=new Set();
 for(const p of ctx.research?.players||[]){
  const matchup=p?.matchup,defense=canonicalTeam(matchup?.opponent||''),
   pos=String(matchup?.positionGroup||'').toUpperCase(),d=matchup?.currentSeasonAllowed;
  if(!defense||!['QB','RB','WR','TE'].includes(pos)
   ||Number(matchup?.season)!==season||!d||String(d.position||pos).toUpperCase()!==pos)continue;
  const key=defense+'|'+pos,gs=num(d.games),yards=num(d.perGame?.yards);
  // Only verified season-group allowances count; not individual player outputs.
  if(gs===null||gs<1||yards===null)continue;
  const old=index.get(key);
  if(!old||gs>old.games){
   index.set(key,{perGame:d.perGame,games:gs,defense,position:pos});conflicts.delete(key);
  }else if(gs===old.games&&Math.abs(yards-num(old.perGame?.yards))>0.15){
   // Inconsistent sources for same defense/position must not be averaged or guessed.
   conflicts.add(key);
  }
 }
 const groups=['QB','RB','WR','TE'],rows=[];
 for(const g of games){
  for(const [side,other] of [['away','home'],['home','away']]){
   const dTeam=g[side],offense=g[other];
   if(!dTeam?.abbr||!offense?.abbr)continue;
   for(const pos of groups){
    const team=canonicalTeam(dTeam.abbr),key=team+'|'+pos,
     source=index.get(key),valid=source&&!conflicts.has(key)?source:null;
    const mean=benchmarks.get(pos)??null,yards=valid?num(valid.perGame?.yards):null;
    rows.push({kind:'defense',id:'dvp|'+g.id+'|'+team+'|'+pos,game:g,
     name:team+' vs '+pos,team,offense:canonicalTeam(offense.abbr),position:pos,
     defense:valid,sourceConflict:conflicts.has(key),dvpMean:mean,
     dvpDiff:yards===null||mean===null||mean<=0?null:(yards/mean-1)*100});
   }
  }
 }
 return rows;
}
const COVERAGE_MARKETS={recYds:'Receiving Yards',receptions:'Receptions',targets:'Targets'};
function coverageSample(logs,market,count,season){
 const values=(logs||[]).filter(g=>Number(g.season)===Number(season)).slice(0,count)
  .map(g=>num(g[market])).filter(x=>x!==null);
 return values.length?{n:values.length,values,avg:values.reduce((a,b)=>a+b,0)/values.length}:null;
}
function coverageQuote(ctx,r){
 const found=(ctx.odds?.rows||[]).filter(q=>
  String(q.verifiedGameId)===String(r.game.id)&&canonicalTeam(q.team)===r.team
  &&norm(q.player)===norm(r.name)&&q.market===state.coverageMarket
  &&String(q.side||'').toLowerCase()==='over'&&num(q.line)!==null&&num(q.price)!==null&&q.book);
 if(!found.length)return null;
 const grouped=new Map();
 for(const quote of found){
  const key=String(Number(quote.line)),items=grouped.get(key)||[];
  items.push(quote);grouped.set(key,items);
 }
 const sim=ctx.sim?.games?.find(g=>String(g.id)===String(r.game.id))?.players?.find(p=>
  canonicalTeam(p.team)===r.team&&norm(p.name)===norm(r.name));
 const simLine=num(sim?.exactOver?.[state.coverageMarket]?.line);
 const all=found.map(q=>Number(q.line)).sort((a,b)=>a-b);
 const median=all[Math.floor(all.length/2)];
 const lines=[...grouped.entries()].sort((a,b)=>
  b[1].length-a[1].length
  ||(simLine===null?0:Math.abs(Number(a[0])-simLine)-Math.abs(Number(b[0])-simLine))
  ||Math.abs(Number(a[0])-median)-Math.abs(Number(b[0])-median)
  ||Number(a[0])-Number(b[0]));
 // Compare prices only at the SAME actual sportsbook line.
 return lines[0][1].sort((a,b)=>Number(b.price)-Number(a.price))[0]||null;
}
function coveragePrepare(ctx,r){
 const market=state.coverageMarket,quote=coverageQuote(ctx,r);
 const l5=coverageSample(r.logs,market,5,ctx.research?.season),
  l10=coverageSample(r.logs,market,10,ctx.research?.season);
 const sim=ctx.sim?.games?.find(g=>String(g.id)===String(r.game.id))?.players?.find(p=>
  canonicalTeam(p.team)===r.team&&norm(p.name)===norm(r.name));
 const model=sim?.exactOver?.[market],line=num(quote?.line),value=num(model?.probability);
 const modelProb=!cannotPlay(r.officialReport)&&quote&&line!==null&&num(model?.line)!==null
  &&Math.abs(Number(model.line)-line)<0.000001&&value!==null&&value>=0&&value<=1?value:null;
 const over=sample=>sample&&line!==null?{hits:sample.values.filter(x=>x>line).length,n:sample.n}:null;
 const allowed=market==='recYds'?num(r.defense?.perGame?.recYds):
  market==='receptions'?num(r.defense?.perGame?.receptions):num(r.defense?.perGame?.targets);
 return {...r,market,quote,l5,l10,l5Over:over(l5),l10Over:over(l10),
  modelProb,allowed,defGames:num(r.defense?.games)};
}
function buildCoverage(ctx,games,benchmarks){
 const defenses=new Map(defensePositionRows(ctx,games,benchmarks).map(d=>
  [String(d.game.id)+'|'+d.team+'|'+d.position,d]));
 const rows=[],seen=new Set(),season=Number(ctx.research?.season);
 for(const p of ctx.research?.players||[]){
  const pos=String(p.position||'').toUpperCase();
  if(!['WR','TE','RB'].includes(pos)||!p.name||!p.team)continue;
  const game=games.find(g=>[canonicalTeam(g.away?.abbr),canonicalTeam(g.home?.abbr)].includes(canonicalTeam(p.team)));
  if(!game)continue;
  const team=canonicalTeam(p.team),defTeam=canonicalTeam(gameside(game,team)),id='coverage|'+game.id+'|'+team+'|'+norm(p.name);
  if(seen.has(id))continue;seen.add(id);
  const logs=(p.logs||[]).filter(g=>Number(g.season)===season)
   .sort((a,b)=>Number(b.week)-Number(a.week));
  if(!logs.length&&num(p.currentSeason?.perGame?.targets)===null)continue;
  const def=defenses.get(String(game.id)+'|'+defTeam+'|'+pos);
  rows.push({kind:'coverage',id,game,name:p.name,team,defTeam,position:pos,p,logs,
   officialReport:officialAvailability(ctx,p),defense:def?.defense||null,sourceConflict:Boolean(def?.sourceConflict)});
 }
 return rows;
}
function gameside(game,team){return canonicalTeam(game.away?.abbr)===team?game.home?.abbr:game.away?.abbr}
function coverageSecondary(ctx,row){
 const out=(ctx.research?.players||[]).filter(p=>canonicalTeam(p.team)===row.defTeam
  &&['CB','DB','FS','SS','S'].includes(String(p.position||'').toUpperCase())&&p.name);
 const seen=new Set();
 return out.filter(p=>{const id=norm(p.name);if(seen.has(id))return false;seen.add(id);return true})
  .sort((a,b)=>(num(a.depthRank)??99)-(num(b.depthRank)??99)||a.name.localeCompare(b.name))
  .slice(0,14).map(p=>({name:p.name,position:p.position,depthRank:p.depthRank,
   report:officialAvailability(ctx,p)}));
}
const coverageHit=rate=>rate?rate.hits+'/'+rate.n+' ('+Math.round(rate.hits/rate.n*100)+'%)':'—';

function build(ctx,tool){
 const games=upcoming(ctx),slate=ctx.td?.games||[],benchmarks=positionalBenchmarks(ctx);
 if(tool==='defense-vs-position')return defensePositionRows(ctx,games,benchmarks);
 if(tool==='coverage-matchups')return buildCoverage(ctx,games,benchmarks);
 if(gameTools.has(tool))return games.map(g=>{
  const original=slate.find(x=>String(x.id)===String(g.id));
  return {id:g.id,game:g,original,weather:ctx.weather?.games?.find(x=>String(x.id)===String(g.id))||null,sim:ctx.sim?.games?.find(x=>String(x.id)===String(g.id))||null,
   context:{awayPass:defenseAllowed(ctx,g.home.abbr,'QB','passYds'),
    homePass:defenseAllowed(ctx,g.away.abbr,'QB','passYds'),
    awayRush:defenseAllowed(ctx,g.home.abbr,'RB','rushYds'),
    homeRush:defenseAllowed(ctx,g.away.abbr,'RB','rushYds')},
   kind:'game',name:(g.away?.abbr||'AWAY')+' @ '+(g.home?.abbr||'HOME')};
 });
 const all=slate.flatMap(g=>(g.players||[]).map(p=>({p,g})));
 const modeled=new Map();
 for(const rec of all)modeled.set(String(rec.g.id)+'|'+norm(rec.p.name),rec.p);
 const result=[],seen=new Set(),modeledData=ctx.td?.modelFresh===true;
 const real=ctx.research?.players||[];
 for(const player of real){
  if(!player?.name||!player?.team)continue;
  const game=matchGame(ctx,player.team);if(!game)continue;
  const mid=String(game.id)+'|'+norm(player.name);
  const m=modeled.get(mid)||null;
  const officialReport=officialAvailability(ctx,player);
  const simPlayer=ctx.sim?.games?.find(g=>String(g.id)===String(game.id))?.players?.find(p=>
    norm(p.name)===norm(player.name)&&canonicalTeam(p.team)===canonicalTeam(player.team));
  const simAtd=!cannotPlay(officialReport)?num(simPlayer?.atd):null;
  const simTwo=!cannotPlay(officialReport)?num(simPlayer?.twoPlusTd):null;
  const key=game.id+'|'+norm(player.name);
  if(seen.has(key))continue;seen.add(key);
  const pos=String(player.position||m?.position||'').toUpperCase();
  if(tool==='quarterback-research'&&pos!=='QB')continue;
  if(tool==='rushing-matchups'&&!['QB','RB','WR'].includes(pos))continue;
  if(['receiving-matchups','coverage-matchups'].includes(tool)&&!['WR','TE','RB'].includes(pos))continue;
  if(modelTools.has(tool)&&!['RB','WR','TE','QB'].includes(pos))continue;

  const logs=(player.logs||[]).filter(l=>Number(l.season)===Number(ctx.research?.season)||Number(l.season)===Number(ctx.research?.previousSeason))
   .sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week));
  const quote=bestQuote(ctx,game,player,tool==='touchdown-opportunities'?'atd':tool==='rushing-matchups'?'rushYds':tool==='quarterback-research'?'passYds':'recYds');
  result.push({id:key,kind:'player',name:player.name,team:canonicalTeam(player.team),position:pos,
   p:player,m,game,quote,logs,officialReport,simAtd,simTwo,defense:player.matchup?.opponent&&canonicalTeam(player.matchup.opponent)===canonicalTeam((canonicalTeam(game.home.abbr)===canonicalTeam(player.team)?game.away.abbr:game.home.abbr))?player.matchup.currentSeasonAllowed:null,dvpMean:benchmarks.get(pos)??null,modelProbability:modeledData&&!cannotPlay(officialReport)?num(m?.modelProbability):null});
 }
 // Model-only players absent from research should remain visible, but no historical logs are inferred.
 if(modelTools.has(tool)){
  for(const rec of all){
   const game=games.find(g=>g.id===rec.g.id);if(!game)continue;
   const key=game.id+'|'+norm(rec.p.name);
   if(seen.has(key))continue;seen.add(key);
   const p=rec.p,officialReport=officialAvailability(ctx,p);
   const simPlayer=ctx.sim?.games?.find(g=>String(g.id)===String(game.id))?.players?.find(x=>
     norm(x.name)===norm(p.name)&&canonicalTeam(x.team)===canonicalTeam(p.team));
   const simAtd=!cannotPlay(officialReport)?num(simPlayer?.atd):null;
   const simTwo=!cannotPlay(officialReport)?num(simPlayer?.twoPlusTd):null;
   result.push({id:key,kind:'player',name:p.name,team:canonicalTeam(p.team),position:p.position||'',
     p:null,m:p,game,quote:bestQuote(ctx,game,p,'atd'),logs:[],
     officialReport,simAtd,simTwo,modelProbability:modeledData&&!cannotPlay(officialReport)?num(p.modelProbability):null});
  }
 }
 for(const r of result){
  const yards=num(r.defense?.perGame?.yards),mean=num(r.dvpMean);
  r.dvpDiff=yards===null||mean===null||mean<=0?null:(yards/mean-1)*100;
 }
 return result;
}
function getFiltered(){
 const q=state.search.toLowerCase().trim();
 let list=state.all.filter(r=>
  (!state.games.length||state.games.includes(String(r.game?.id||'')))
  &&(r.kind==='game'||!state.positions.length||state.positions.includes(r.position))
  &&(r.kind==='game'||!state.minGames||(r.kind==='defense'?(num(r.defense?.games)||0)>=state.minGames:r.logs.filter(l=>Number(l.season)===Number(state.context?.research?.season)).length>=state.minGames))
  &&(state.tool!=='touchdown-opportunities'||!state.conflictsOnly||ppGap(r)>=12)
  &&(!q||[r.name,r.team,r.offense,r.position,r.game?.away?.abbr,r.game?.home?.abbr].join(' ').toLowerCase().includes(q)));
 const metric=state.tool,primary=r=>{
  if(metric==='coverage-matchups'){
   const c=coveragePrepare(state.context,r);
   if(state.coverageSort==='model')return c.modelProb;
   if(state.coverageSort==='allowed')return c.allowed;
   if(state.coverageSort==='share')return num(c.p?.currentSeason?.targetShare);
   return c.l5?.avg??null;
  }
  if(metric==='defense-vs-position')return num(r.dvpDiff);
  if(metric==='touchdown-opportunities')return state.tdOrder==='sim'?(r.simAtd??r.modelProbability):state.tdOrder==='gap'?ppGap(r):(r.modelProbability??r.simAtd);
  if(metric==='red-zone-usage')return (num(r.m?.rzCarries)||0)+(num(r.m?.rzTargets)||0);
  if(['rushing-matchups','receiving-matchups','coverage-matchups','quarterback-research'].includes(metric))
   return avg(r.logs,historyTool[metric],5);
  return Date.parse(r.game?.startTime||'');
 };
 list.sort((a,b)=>{const av=primary(a),bv=primary(b);if(av===null&&bv===null)return a.name.localeCompare(b.name);
  if(av===null)return 1;if(bv===null)return -1;return (state.reverse?av-bv:bv-av)||a.name.localeCompare(b.name)});
 state.visible=list;return list;
}
function selectBox(kind,data){
 const chosen=state[kind],label=kind==='games'?'MATCHUPS':'POSITION';
 const textValue=chosen.length?chosen.length+(kind==='games'?' games':' positions'):'All '+(kind==='games'?'Matchups':'Positions');
 const options=[['all','All '+(kind==='games'?'Matchups':'Positions')],...data];
 return '<div class="matchup-filter nfl-select"><span class="matchup-label">'+label+'</span><details class="matchup-picker" data-nfl-picker="'+kind+'" '+(state.open[kind]?'open':'')+'>'
  +'<summary class="matchup-trigger"><span class="matchup-trigger-text">'+esc(textValue)+'</span><span class="matchup-chevron"></span></summary>'
  +'<div class="matchup-options" role="group" aria-label="NFL '+label+'">'+options.map(([id,title])=>
   '<label class="matchup-option"><input type="checkbox" data-nfl-check="'+kind+'" data-nfl-value="'+esc(id)+'" '+((id==='all'?!chosen.length:chosen.includes(id))?'checked':'')+'><span>'+esc(title)+'</span></label>'
  ).join('')+'</div></details></div>';
}
const tdClass=p=>num(p)!==null&&p>=.45?'nfl-high':num(p)!==null&&p>=.3?'nfl-medium':'';
const nameCell=r=>'<td><div class="nfl-player"><b>'+esc(r.name)+'</b><small>'+esc(r.team)+' · '+esc(r.position)+(r.p?.depthRank?' · '+esc(r.p.depthRank):'')+'</small></div></td>';
const matchCell=r=>'<td><b>'+esc(r.game?.away?.abbr||'—')+' @ '+esc(r.game?.home?.abbr||'—')+'</b><small>'+esc(when(r.game?.startTime))+'</small></td>';
const statCell=(n,hint='')=>'<td><b>'+f(n)+'</b>'+(hint?'<small>'+esc(hint)+'</small>':'')+'</td>';
function row(r){
 if(r.kind==='coverage'){
  const c=coveragePrepare(state.context,r),share=num(r.p?.currentSeason?.targetShare),
   snap=num(r.p?.snapTrend?.avgOffensePct),fmt=sample=>sample?f(sample.avg)+' <small>n='+sample.n+'</small>':'—';
  const line=c.quote?'Over '+f(c.quote.line):'—';
  return '<tr data-nfl-row="'+esc(r.id)+'" class="nfl-coverage-row">'
   +nameCell(r)+matchCell(r)
   +'<td><b>'+esc(r.defTeam)+' vs '+esc(r.position)+'</b><small>'+esc(c.defGames??'—')+' DEF GAMES</small></td>'
   +'<td>'+esc(COVERAGE_MARKETS[c.market])+'</td>'
   +'<td>'+fmt(c.l5)+'</td><td>'+fmt(c.l10)+'</td>'
   +'<td><b>'+(share===null?'—':f(share)+'%')+'</b></td>'
   +'<td><b>'+(snap===null?'—':f(snap)+'%')+'</b></td>'
   +'<td><b>'+f(c.allowed)+'</b><small>'+esc(r.position)+' GROUP</small></td>'
   +'<td><b>'+esc(line)+'</b><small>'+esc(c.quote?c.quote.book+' '+fmtPrice(c.quote.price):'NO VERIFIED LINE')+'</small></td>'
   +'<td><b>'+coverageHit(c.l5Over)+'</b></td>'
   +'<td>'+(c.modelProb===null?'<span class="nfl-coverage-missing">—</span>':
    '<div class="nfl-coverage-prob"><b>'+percent(c.modelProb)+'</b><i style="width:'+Math.round(c.modelProb*100)+'%"></i></div>')+'</td></tr>';
 }
 if(r.kind==='defense'){
  const data=r.defense?.perGame||{},diff=r.dvpDiff;
  const cell=value=>'<td><b>'+esc(value)+'</b></td>';
  return '<tr data-nfl-row="'+esc(r.id)+'" class="nfl-defense-row">'
   +matchCell(r)
   +cell(r.team)+cell(r.offense)
   +'<td><b class="nfl-position-pill">'+esc(r.position)+'</b></td>'
   +cell(f(data.yards))+cell(f(r.dvpMean))
   +'<td><b class="'+(diff!==null&&diff>0?'nfl-high':diff!==null&&diff<0?'nfl-low':'')+'">'
    +(diff===null?'—':esc((diff>0?'+':'')+diff.toFixed(1)+'%'))+'</b></td>'
   +cell(f(data.tds))+cell(r.position==='QB'?'—':f(data.targets))
   +cell(r.defense?.games??'—')+'</tr>';
 }
 if(r.kind==='game'){
  const g=r.game,venue=r.original?.venue||'';
  const sample=[r.context?.awayPass?.games,r.context?.homePass?.games,r.context?.awayRush?.games,r.context?.homeRush?.games].filter(Number.isFinite);
  const sourceGames=sample.length?Math.min(...sample):'—';
  const values={
   'offensive-line-matchups':[r.name,when(g.startTime),f(r.context?.awayPass?.value)+' pass yd/g',f(r.context?.homePass?.value)+' pass yd/g',f(r.context?.awayRush?.value)+' rush yd/g',f(r.context?.homeRush?.value)+' rush yd/g',sourceGames,'OL grades not connected'],
   'power-ratings':[r.name,when(g.startTime),g.away?.record||'—',g.home?.record||'—',percent(r.sim?.awayWin),percent(r.sim?.homeWin),r.sim?.awayPoints==null||r.sim?.homePoints==null?'—':(r.sim.awayPoints-r.sim.homePoints).toFixed(1)+' away pts',r.sim?'Game-level simulation; no power rating':'No verified rating'],
   'weather-impact':[r.name,when(g.startTime),g.venueMeta?.name||venue||g.venue||'—',
    g.venueMeta?.indoor===true?'INDOORS':g.venueMeta?.indoor===false?'OUTDOORS':'ROOF UNKNOWN',
    r.weather?.weather?.temperature===null||r.weather?.weather?.temperature===undefined?'—':
     String(r.weather.weather.temperature)+'°'+(r.weather.weather.temperatureUnit==='F'?'F':r.weather.weather.temperatureUnit||''),
    r.weather?.status==='forecast'?r.weather.weather.windSpeed||'—':'—',
    r.weather?.status==='forecast'?r.weather.weather.windGust||'—':'—',
    r.weather?.status==='forecast'&&r.weather.weather.precipitationProbability!==null?
      String(r.weather.weather.precipitationProbability)+'%':'—',
    r.weather?.status==='forecast'?r.weather.weather.condition||'—':
     r.weather?.status==='indoor'?'WEATHER SHIELDED':r.weather?.status==='international'?'NO NOAA COVERAGE':'UNAVAILABLE',
    r.weather?.status==='forecast'?'NOAA/NWS'+(r.weather.issuedAt?' ISSUED':''):
     r.weather?.status==='indoor'?'ESPN VENUE':r.weather?.status==='international'?'INTERNATIONAL':'NO VERIFIED FORECAST'],
   'game-projections':[r.name,when(g.startTime),
    r.sim?.awayWin==null?'—':percent(r.sim.awayWin),r.sim?.homeWin==null?'—':percent(r.sim.homeWin),
    r.sim?.awayPoints==null?'—':f(r.sim.awayPoints),r.sim?.homePoints==null?'—':f(r.sim.homePoints),
    r.sim?.total?.line!=null?('TOTAL '+r.sim.total.line+' · HOME '+(r.sim.spread?.homeLine??'—')):'—',
    r.sim?Number(r.sim.iterations).toLocaleString():'No verified model']
  }[state.tool]||[];
  return '<tr data-nfl-row="'+esc(r.id)+'">'+values.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
 }
 const season=r.p?.currentSeason,atd=r.modelProbability,quote=r.quote;
 const logs=r.logs||[],latest=logs.slice(0,5);
 const projected=atd===null?(cannotPlay(r.officialReport)?'OUT / INACTIVE':'—'):percent(atd);
 const isTD=state.tool==='touchdown-opportunities';
 let cells=[];
 if(isTD)cells=[{html:'<b class="'+tdClass(atd)+'">'+projected+'</b><small>'+esc(r.officialReport?.status||r.m?.confidence||'')+'</small>'},
  {html:'<b>'+percent(r.simAtd)+'</b><small>50K MODEL</small>'},
  {html:'<b class="'+(ppGap(r)>=20?'nfl-low':ppGap(r)>=12?'nfl-medium':'')+'">'+gapLabel(r)+'</b><small>'+esc(divergence(r)||'ESTIMATE DELTA')+'</small>'},
  {html:'<b>'+percent(r.simTwo)+'</b><small>2+ TD</small>'},
  {text:cannotPlay(r.officialReport)?'OUT':(r.modelProbability===null?'—':r.m?.modelGrade||'—')}, {text:f(r.m?.opportunityRate)},
  {text:r.p?.snapTrend?.avgOffensePct===null||r.p?.snapTrend?.avgOffensePct===undefined?'—':f(r.p.snapTrend.avgOffensePct)+'%'},
  {text:r.p?.currentSeason?.targetShare==null?'—':f(r.p.currentSeason.targetShare)+'%'},
  {text:percent(r.m?.opponentRzTdRate)},
  {html:'<b>'+esc(fmtPrice(quote?.price))+'</b><small>'+esc(quote?.book||'NO VERIFIED BOOK')+'</small>'}];
 else if(state.tool==='red-zone-usage')cells=[{text:r.m?.rzCarries??'—'},{text:r.m?.rzTargets??'—'},
  {text:f(r.m?.opportunityRate)},
  {text:r.p?.currentSeason?.targetShare==null?'—':f(r.p.currentSeason.targetShare)+'%'},
  {text:r.p?.snapTrend?.avgOffensePct==null?'—':f(r.p.snapTrend.avgOffensePct)+'%'},
  {text:f(r.p?.currentSeason?.perGame?.tds)},
  {text:percent(r.m?.opponentRzTdRate)},
  {html:'<b class="'+tdClass(atd)+'">'+projected+'</b>'}];
 else if(state.tool==='rushing-matchups')cells=[{text:f(avg(logs,'rushYds',5))},{text:f(avg(logs,'rushYds',10))},
  {text:f(avg(logs,'carries',5))},{text:f(season?.perGame?.rushYds)},
  {text:f(r.p?.matchup?.currentSeasonAllowed?.perGame?.rushYds)},{text:fmtPrice(quote?.price)}];
 else if(state.tool==='quarterback-research')cells=[{text:f(avg(logs,'passYds',5))},{text:f(avg(logs,'attempts',5))},
  {text:f(avg(logs,'completions',5))},{text:f(avg(logs,'passTds',5))},
  {text:f(r.p?.matchup?.currentSeasonAllowed?.perGame?.passYds)},{text:fmtPrice(quote?.price)}];
 else if(state.tool==='coverage-matchups')cells=[{text:f(avg(logs,'targets',5))},
  {text:f(avg(logs,'receptions',5))},{text:f(avg(logs,'recYds',5))},
  {text:season?.targetShare==null?'—':f(season.targetShare)+'%'},
  {text:f(r.defense?.perGame?.targets)},
  {text:f(r.defense?.perGame?.recYds)},
  {text:'Not licensed'}];
 else cells=[{text:f(avg(logs,'recYds',5))},{text:f(avg(logs,'recYds',10))},
  {text:f(avg(logs,'targets',5))},{text:f(avg(logs,'receptions',5))},
  {text:f(r.p?.matchup?.currentSeasonAllowed?.perGame?.recYds)},{text:fmtPrice(quote?.price)}];
 return '<tr data-nfl-row="'+esc(r.id)+'">'+nameCell(r)+matchCell(r)+cells.map(c=>'<td>'+(c.html||'<b>'+esc(c.text)+'</b>')+'</td>').join('')+'</tr>';
}
function render(ctx,tool){
 if(!tools.includes(tool))return '';
 state.tool=tool;state.context=ctx;
 const signature=[tool,ctx.research?.generatedAt,ctx.td?.generatedAt,ctx.odds?.fetchedAt,ctx.sim?.generatedAt,ctx.weather?.fetchedAt,(ctx.games||[]).map(g=>g.id+':'+g.startTime).join(',')].join('|');
 if(state.version!==signature){
  state.version=signature;state.all=build(ctx,tool);state.max=90;
  // Keep user-picked matchups and positions through the automatic live refresh.
  const stillScheduled=new Set(upcoming(ctx).map(g=>String(g.id)));
  state.games=state.games.filter(id=>stillScheduled.has(String(id)));
  state.positions=state.positions.filter(v=>['QB','RB','WR','TE'].includes(v));
 }
 const games=upcoming(ctx),gameOptions=games.map(g=>[String(g.id),
  (g.away?.abbr||'AWAY')+' @ '+(g.home?.abbr||'HOME')+' · '+when(g.startTime)]);
 const source='<div class="nba-depth-source">NFL OFFICIAL SLATE · '+games.length+' UPCOMING GAMES'
  +' · PLAYER RESEARCH '+esc(asof(ctx.research?.generatedAt))
  +' · TSO TD MODEL '+esc(asof(ctx.td?.generatedAt))
  +' · BOOKS '+esc(asof(ctx.odds?.fetchedAt))+' · ESPN INJURIES '+esc(asof(ctx.injuries?.fetchedAt))
  +((modelTools.has(tool)||tool==='game-projections'||tool==='coverage-matchups')?' · 50K SIM '+esc(asof(ctx.sim?.generatedAt)):'')
  +(tool==='weather-impact'?' · NOAA NWS WEATHER '+(ctx.weather?.fetchedAt?esc(asof(ctx.weather.fetchedAt)):ctx.weatherError?'FORECAST UNAVAILABLE':'FETCHING...'):'')+'</div>';
 const modelAlert=ctx.td?.modelFresh===false?'TD MODEL SNAPSHOT EXPIRED — probabilities hidden until refreshed.':
  ctx.td?.modelFresh===true?'TSO ATD uses 2025 production adjusted for 2026 roles; 50K ATD and 2+ TD use a separate game simulation. Gaps of 12+ percentage points are flagged as a comparison prompt—not a validated risk score. Sort by either model.':
  'Verified current NFL touchdown model unavailable.';
 const list=getFiltered().slice(0,state.max);
 const controls='<div class="nba-controls nfl-controls">'+selectBox('games',gameOptions)
  +(gameTools.has(tool)?'':selectBox('positions',(tool==='coverage-matchups'?['WR','TE','RB']:['QB','RB','WR','TE']).map(x=>[x,x])))
  +(tool==='coverage-matchups'?'<div class="nfl-coverage-markets"><span>RECEIVING MARKET</span>'
   +Object.entries(COVERAGE_MARKETS).map(([id,label])=>
    '<button type="button" data-nfl-coverage-market="'+id+'" class="'+(state.coverageMarket===id?'active':'')+'">'+esc(label)+'</button>').join('')
   +'</div><div class="nfl-sort-views"><span>SORT BY</span>'
   +[['model','50K EXACT OVER'],['form','L5 FORM'],['allowed','DEF ALLOWED'],['share','TARGET SHARE']].map(([id,label])=>
    '<button type="button" data-nfl-coverage-sort="'+id+'" class="'+(state.coverageSort===id?'active':'')+'">'+label+'</button>').join('')
   +'</div>':'')
  +(tool==='touchdown-opportunities'?'<div class="nfl-sort-views"><span>SORT BY</span>'
  +[['tso','TSO ATD'],['sim','50K ATD'],['gap','MODEL GAP']].map(([key,label])=>
    '<button type="button" data-nfl-tdorder="'+key+'" class="'+(state.tdOrder===key?'active':'')+'">'+label+'</button>').join('')
   +'</div><label class="nfl-conflict-control"><input type="checkbox" data-nfl-conflicts '+(state.conflictsOnly?'checked':'')+'> Disagreements ≥12 pp</label>':'')
  +'<label>'+(tool==='defense-vs-position'?'MIN DEF GAMES':'MIN GAMES')+'<select data-nfl-min>'+[0,3,5,10].map(x=>'<option value="'+x+'" '+(state.minGames===x?'selected':'')+'>'+(x?x+(tool==='defense-vs-position'?'+ defensive games':'+ player games'):'Any sample')+'</option>').join('')+'</select></label>'
  +'<label class="nba-search-label">SEARCH<input data-nfl-search placeholder="Player or team" value="'+esc(state.search)+'"></label>'
  +'<button type="button" class="nba-sort-direction" data-nfl-sort title="Reverse sorting">'+(state.reverse?'↑':'↓')+'</button></div>';
 return '<section class="nba-lab nfl-lab"><div class="nba-intro"><div><span class="nba-eyebrow">THE SPORTS OUTPOST / NFL VERIFIED RESEARCH</span><h2>'+esc(titles[tool])+'</h2><p>'+esc(notes[tool])+'</p></div></div>'
 +source+(tool==='coverage-matchups'?'<p class="nfl-model-note">2026 opponent allowances measure an entire WR, TE or RB position group, not one receiver’s expected output. L5/L10 are observed 2026 games. The 50K model must match the exact player, matchup, Over market and line. Cornerback assignments and man/zone grades are unavailable.</p>':'')
 +(modelTools.has(tool)?'<p class="nfl-model-note">'+esc(modelAlert)+'</p>':'')
 +controls+'<div class="nba-table-scroll"><table class="nba-table nfl-table'+(tool==='defense-vs-position'?' nfl-dvp-table':tool==='coverage-matchups'?' nfl-coverage-table':'')+'"><thead><tr>'
 +columns[tool].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'
 +(list.map(row).join('')||'<tr><td colspan="'+columns[tool].length+'">No verified records match the selected matchup, position or sample filters. Unavailable defensive, sportsbook and model values are not estimated.</td></tr>')
 +'</tbody></table></div><div class="nba-table-foot"><span>'+list.length+' shown of '+state.visible.length+' verified rows · click any row for details</span>'
 +(list.length<state.visible.length?'<button data-nfl-more type="button">SHOW MORE →</button>':'')+'</div>'
 +'<p class="nba-footnote">Weather Impact uses ESPN venue designation and NOAA/NWS hourly forecasts for the kickoff hour at matched U.S. stadium coordinates. The forecasts are predictive weather, not observed game conditions. For indoor games, outdoor weather is not assigned; outside the United States, no NOAA forecast is claimed. Forecast may be unavailable if the source or stadium match cannot be verified.</p>'
 +(tool==='coverage-matchups'?'<p class="nba-footnote">Coverage research uses current ESPN games, observed nflverse 2026 receiver production, defense-wide allowances to matching WR/TE/RB position groups, and only verified current sportsbook Over prices and exact-line 50K model predictions. The defensive secondary roster is context—not a claimed 1-on-1 coverage assignment.</p>':'')
 +'<p class="nba-footnote">Offensive Line Matchups shows 2026 QB-pass and RB-rush yards allowed by the opposite defense as a matchup proxy only. These are not offensive-line grades, pressure rates or run-block win rates. Power Ratings uses game-specific simulations, not a season-long team rating.</p>'
 +(tool==='defense-vs-position'?'<p class="nba-footnote">One row per upcoming defense and opposing position (two defenses × QB/RB/WR/TE = eight rows per game). Rows are defense-wide position-group allowances, not individual player statistics. Dashes mean data is unavailable or inconsistent. Select multiple games or positions using the filters above.</p>':'')
 +'<p class="nba-footnote">For Defense vs Position, the 2026 reference is an unweighted mean of distinct defenses in the available TSO season dataset, each with three or more observed games (currently 28 defenses, not all 32). Positive differences indicate more yards allowed to the position than the sample reference. Descriptive, not predictive, and not a tracking-based coverage grade.</p>'
 +'<p class="nba-footnote">Data sources: current ESPN NFL scoreboards and 2026 rosters; nflverse verified player game logs (CC BY 4.0); the existing TSO regressed 2025-baseline anytime-touchdown model; ParlayAPI time-limited sportsbook snapshots where available. No sportsbook odds, model percentages, opponent coverage ratings, or forecast measurements are fabricated.</p></section>';
}
function detail(r,ctx){
 if(r.kind==='coverage'){
  const c=coveragePrepare(ctx,r),group=r.defense?.perGame||{},line=num(c.quote?.line);
  const year=Number(ctx.research?.season),unit=state.coverageMarket==='recYds'?'yards':
   state.coverageMarket==='receptions'?'receptions':'targets';
  const stats=[['2026 L5 AVG',f(c.l5?.avg)+' '+unit],
   ['2026 L10 AVG',f(c.l10?.avg)+' '+unit],
   ['2026 TGT SHARE',num(r.p?.currentSeason?.targetShare)===null?'—':f(r.p.currentSeason.targetShare)+'%'],
   ['2026 L5 SNAP',num(r.p?.snapTrend?.avgOffensePct)===null?'—':f(r.p.snapTrend.avgOffensePct)+'%'],
   ['DEF '+r.position+' '+unit.toUpperCase()+'/GM',f(c.allowed)],
   ['DEF VS '+r.position+' TARGETS/GM',f(group.targets)],
   ['DEF VS '+r.position+' RECEPTIONS/GM',f(group.receptions)],
   ['DEF VS '+r.position+' REC YDS/GM',f(group.recYds)],
   ['DEF VS '+r.position+' REC TD/GM',f(group.recTds)],
   ['DEF SAMPLE GAMES',r.defense?.games??'—'],
   ['BOOK OVER LINE',c.quote?'Over '+f(line):'—'],
   ['2026 L5 OVER',coverageHit(c.l5Over)],
   ['2026 L10 OVER',coverageHit(c.l10Over)],
   ['50K EXACT-LINE OVER',c.modelProb===null?'—':percent(c.modelProb)]];
  const logs=r.logs.slice(0,10);
  const observed=logs.map(g=>num(g[c.market]));
  const max=Math.max(1,line||0,...observed.filter(v=>v!==null&&v>0));
  const bars='<div class="nfl-coverage-chart" aria-label="Observed 2026 receiving performance">'
   +logs.slice().reverse().map(g=>{
    const v=num(g[c.market]),height=v===null?0:Math.max(2,Math.round(Math.max(0,v)/max*104));
    return '<div class="nfl-coverage-bar"><b>'+esc(v===null?'—':v)+'</b>'
     +'<i style="height:'+height+'px" class="'+(line!==null&&v!==null&&v>line?'above':'')+'"></i>'
     +'<span>WK '+esc(g.week??'—')+'</span></div>';
   }).join('')+'</div>';
  const secondary=coverageSecondary(ctx,r);
  const defenders=secondary.length?secondary.map(p=>'<div class="nfl-secondary-person"><b>'
   +esc(p.name)+'</b><small>'+esc(p.position||'DB')+(num(p.depthRank)!==null?' · DEPTH '+esc(p.depthRank):'')
   +(p.report&&!/^active$/i.test(String(p.report.status||''))?' · '+esc(p.report.status):'')
   +'</small></div>').join('')
   :'<p class="live-no-stats">Verified opposing DB roster details are not present in this source.</p>';
  const warning=r.sourceConflict?'The defensive positional source contains conflicting records; group values have been withheld.':
   !r.defense?'A reliable 2026 position-group record for this opposing defense is unavailable.':
   'Opponent defensive totals describe production allowed to all '+esc(r.position)+'s as a group; they are not an estimate of this individual receiver’s final game output.';
  const modelMsg=c.modelProb!==null?'The 50K model matches this player, official ESPN event, '+esc(COVERAGE_MARKETS[c.market])+' Over and the exact book line.':
   'No verified 50K Over projection matches this exact game, player, market and sportsbook line. No estimate has been substituted.';
  return '<div class="drawer-contents nfl-details nfl-coverage-details">'
   +'<span class="eyebrow">TSO VERIFIED COVERAGE & RECEIVING MATCHUPS</span>'
   +'<h2>'+esc(r.name)+'</h2><p class="subtitle">'+esc(r.team)+' '+esc(r.position)+' vs '+esc(r.defTeam)
   +' DEFENSE · '+esc(r.game.away?.abbr)+' @ '+esc(r.game.home?.abbr)+' · '+esc(when(r.game.startTime))+'</p>'
   +'<div class="nfl-context-note">'+warning+'</div>'
   +'<h3>'+esc(COVERAGE_MARKETS[c.market])+' · 2026 player trends</h3>'
   +'<div class="nfl-detail-grid">'+stats.map(([name,value])=>
    '<div><small>'+esc(name)+'</small><b>'+esc(value)+'</b></div>').join('')+'</div>'
   +'<h3>Observed 2026 game results'+(line!==null?' · current Over '+esc(f(line)):'')+'</h3>'
   +bars+'<p class="nba-footnote">Bars represent observed results, not predictions. Highlighted bars exceeded the current verified Over line, where available.</p>'
   +'<h3>Current sportsbook and exact-line model</h3><div class="nfl-context-note">'
   +'<b>'+esc(c.quote?'Over '+f(c.quote.line)+' at '+c.quote.book+' '+fmtPrice(c.quote.price):'No currently verified book line')+'</b>. '
   +modelMsg+'</div>'
   +'<h3>Opposing defensive secondary · roster context only</h3>'
   +'<div class="nfl-secondary-grid">'+defenders+'</div>'
   +'<div class="nfl-context-note">These are defensive backs listed in the 2026 opposing-team roster, not confirmed individual coverage assignments. Slot/outside alignment, man/zone rates, shadow coverage and route participation are unavailable without tracking data.</div>'
   +'<h3>2026 game logs</h3><div class="nba-log-scroll"><table class="nba-log">'
   +'<thead><tr><th>WEEK</th><th>OPPONENT</th><th>TARGETS</th><th>RECEPTIONS</th><th>REC YARDS</th><th>REC TD</th><th>VS OVER '+esc(f(line))+'</th></tr></thead><tbody>'
   +(logs.map(g=>{const v=num(g[c.market]);return '<tr><td>'+esc(g.week??'—')+'</td><td>'+esc(g.opponent||'—')
    +'</td><td>'+esc(g.targets??'—')+'</td><td>'+esc(g.receptions??'—')+'</td><td>'+esc(g.recYds??'—')
    +'</td><td>'+esc(g.recTds??'—')+'</td><td>'+(line===null||v===null?'—':v>line?'OVER':'NOT OVER')+'</td></tr>';
   }).join('')||'<tr><td colspan="7">No verified 2026 games available.</td></tr>')
   +'</tbody></table></div>'
   +'<p class="nba-footnote">Player history: '+esc(asof(ctx.research?.generatedAt))
   +' · Book snapshot: '+esc(asof(ctx.odds?.fetchedAt))
   +' · 50K simulation: '+esc(asof(ctx.sim?.generatedAt))
   +' · Injuries: '+esc(asof(ctx.injuries?.fetchedAt))+'. Historical performance is descriptive, not a guarantee of future outcomes.</p></div>';
 }
 if(r.kind==='game'&&state.tool==='weather-impact'){
  const venue=r.game.venueMeta||{},w=r.weather,hour=w?.weather||{},out=w?.status==='forecast';
  const stats=[['VENUE',venue.name||r.game.venue||'—'],['ROOF',venue.indoor===true?'INDOORS':venue.indoor===false?'OUTDOORS':'UNCONFIRMED'],
   ['KICKOFF TEMP',out&&hour.temperature!==null?hour.temperature+'°'+(hour.temperatureUnit||'F'):'—'],
   ['WIND SPEED',out?hour.windSpeed||'—':'—'],['WIND GUST',out?hour.windGust||'—':'—'],
   ['WIND DIRECTION',out?hour.windDirection||'—':'—'],
   ['PRECIPITATION CHANCE',out&&hour.precipitationProbability!==null?hour.precipitationProbability+'%':'—'],
   ['FORECAST',out?hour.condition||'—':'—']];
  return '<div class="drawer-contents nfl-details"><span class="eyebrow">NFL GAME-DAY WEATHER · NOAA/NWS</span>'
   +'<h2>'+esc(r.name)+'</h2><p class="subtitle">'+esc(when(r.game.startTime))
   +' · '+esc(venue.name||r.game.venue||'Unknown venue')+'</p>'
   +'<div class="nfl-detail-grid">'+stats.map(([key,val])=>'<div><small>'+esc(key)+'</small><b>'+esc(val)+'</b></div>').join('')+'</div>'
   +'<div class="nfl-context-note">'+esc(out?'Official NWS hourly forecast valid from '+asof(hour.validFrom)+' to '+asof(hour.validTo)+'. Forecast issued '+asof(w.issuedAt)+'.':
      w?.reason||'Hourly forecast unavailable or still being retrieved.')
   +'</div><p class="nba-footnote">Source: verified ESPN stadium and game; U.S. NOAA/NWS forecast. Forecast conditions may change. The weather is not a calibrated player-prop prediction, and indoor stadiums are not assigned outdoor wind/rain values.</p></div>';
 }
 if(r.kind==='defense'){
  const vals=r.defense?.perGame||{};
  return '<div class="drawer-contents nfl-details"><span class="eyebrow">2026 NFL DEFENSE VS POSITION</span>'
   +'<h2>'+esc(r.team)+' Defense vs '+esc(r.position)+'</h2><p class="subtitle">'
   +esc(r.game.away?.abbr)+' @ '+esc(r.game.home?.abbr)+' · '+esc(when(r.game.startTime))
   +' · Facing '+esc(r.offense)+'</p>'
   +'<div class="nfl-detail-grid">'
   +[['YARDS ALLOWED / GAME',f(vals.yards)],['POSITION REFERENCE / GAME',f(r.dvpMean)],
     ['VS REFERENCE',r.dvpDiff===null?'—':(r.dvpDiff>0?'+':'')+r.dvpDiff.toFixed(1)+'%'],
     ['TD ALLOWED / GAME',f(vals.tds)],['TARGETS ALLOWED / GAME',r.position==='QB'?'Not comparable':f(vals.targets)],
     ['SOURCE GAMES',r.defense?.games??'—']].map(([name,val])=>'<div><small>'+esc(name)+'</small><b>'+esc(val)+'</b></div>').join('')+'</div>'
   +'<p class="nfl-context-note">'
   +(r.sourceConflict?'The available 2026 defense-group records disagree, so the affected values are withheld.':
    r.defense?'Historical 2026 defense-wide allowances to the entire '+esc(r.position)+' position group—not a prediction for any individual player.':
    'No verified 2026 position-group defensive allowance is available for this combination.')
   +' Reference covers distinct defenses with at least three recorded games, not necessarily all 32 NFL teams.</p></div>';
 }
 if(r.kind==='game')return '<div class="drawer-contents"><h2>'+esc(r.name)+'</h2><p>'+esc(when(r.game.startTime))+'</p><h3>Verified TSO Monte Carlo</h3>'
  +'<div class="nfl-detail-grid"><div><small>AWAY WIN</small><b>'+percent(r.sim?.awayWin)+'</b></div><div><small>HOME WIN</small><b>'+percent(r.sim?.homeWin)+'</b></div>'
  +'<div><small>AWAY AVG PTS</small><b>'+f(r.sim?.awayPoints)+'</b></div><div><small>HOME AVG PTS</small><b>'+f(r.sim?.homePoints)+'</b></div></div>'
  +'<p>Simulation run: '+esc(asof(r.sim?.runAt))+' · '+esc(r.sim?.iterations||'—')+' worlds. If missing, the saved TSO model is not verified for this event.</p>'
  +'<p>Weather, tracking grades and specialist ratings are not fabricated.</p></div>';
 const stats=[['OPPONENT YARDS ALLOWED PER GAME',num(r.defense?.perGame?.yards)],['NFL SAME-POSITION YDS / GAME',num(r.dvpMean)],['2026 OPPOSING DEFENSE SAMPLE GAMES',num(r.defense?.games)],['OPPONENT TD ALLOWED PER GAME',num(r.defense?.perGame?.tds)],['L5 rushing yards',avg(r.logs,'rushYds',5)],['L5 receiving yards',avg(r.logs,'recYds',5)],
  ['L5 targets',avg(r.logs,'targets',5)],['L5 carries',avg(r.logs,'carries',5)],['L5 pass yards',avg(r.logs,'passYds',5)]];
 const td=tdHit(r.logs,5,ctx.research?.season),td10=tdHit(r.logs,10,ctx.research?.season);
 const logs=r.logs.filter(l=>Number(l.season)===Number(ctx.research?.season)).slice(0,20);
 const max=Math.max(1,...logs.map(x=>(num(x.tds)||0)));
 const bar='<div class="nfl-bars">'+logs.slice(0,16).reverse().map(g=>'<div><i style="height:'+Math.round((num(g.tds)||0)/max*100)+'%"></i><span>'+esc(g.week||'')+'</span><b>'+esc(g.tds??'—')+'</b></div>').join('')+'</div>';
 return '<div class="drawer-contents nfl-details"><span class="eyebrow">NFL VERIFIED PLAYER RESEARCH</span><h2>'+esc(r.name)+'</h2><p class="subtitle">'+esc(r.team)+' · '+esc(r.position)+' · '+esc(r.game.away?.abbr)+' @ '+esc(r.game.home?.abbr)+' · '+esc(when(r.game.startTime))+'</p>'
  +'<div class="nfl-detail-grid"><div><small>TSO ATD REGRESSED</small><b>'+percent(r.modelProbability)+'</b><small>2025 baseline · 2026 matchup</small></div>'
  +'<div><small>50K SIM ATD</small><b>'+percent(r.simAtd)+'</b></div>'
  +'<div><small>50K SIM 2+ TD</small><b>'+percent(r.simTwo)+'</b></div>'
  +'<div><small>MODEL GAP</small><b>'+gapLabel(r)+'</b><small>'+esc(divergence(r)||'Absolute difference')+'</small></div>'
  +'<div><small>LAST 5 TD GAMES</small><b>'+(td?td.hits+'/'+td.n:'—')+'</b><small>Observed games</small></div>'
  +'<div><small>LAST 10 TD GAMES</small><b>'+(td10?td10.hits+'/'+td10.n:'—')+'</b></div>'
  +'<div><small>2025 BASELINE SNAP SHARE</small><b>'+percent(r.m?.snapShare)+'</b></div>'
  +'<div><small>2026 L5 OFFENSIVE SNAP %</small><b>'+(r.p?.snapTrend?.avgOffensePct==null?'—':f(r.p.snapTrend.avgOffensePct)+'%')+'</b></div>'
  +'<div><small>2026 TARGET SHARE</small><b>'+(r.p?.currentSeason?.targetShare==null?'—':f(r.p.currentSeason.targetShare)+'%')+'</b></div>'
  +'<div><small>RZ CARRIES (BASELINE)</small><b>'+esc(r.m?.rzCarries??'—')+'</b></div>'
  +'<div><small>RZ TARGETS (BASELINE)</small><b>'+esc(r.m?.rzTargets??'—')+'</b></div>'
  +'<div><small>OPP RZ TD ALLOWED</small><b>'+percent(r.m?.opponentRzTdRate)+'</b></div>'
  +'<div><small>INJURY STATUS</small><b>'+esc(r.officialReport?.status||r.p?.status||r.m?.injuryStatus||'Unknown')+'</b></div></div>'
  +'<div class="nfl-context-note">'+(ppGap(r)===null?'Only one or neither current TD model is available for this player.':ppGap(r)>=12?'MODEL DISAGREEMENT: the regressed ATD model and the 50K simulation differ by '+gapLabel(r)+'. Compare their assumptions, current role, injury status and opponent before interpreting either number.':'Two separate models are shown. Their agreement does not prove calibration or guarantee a touchdown.')+'</div>'
  +'<h3>2026 games · observed rushing/receiving touchdowns</h3>'+bar
  +'<h3>2026 player trends</h3><div class="nfl-detail-grid">'+stats.map(([name,value])=>'<div><small>'+esc(name.toUpperCase())+'</small><b>'+f(value)+'</b></div>').join('')+'</div>'
  +'<h3>Game log</h3><div class="nba-log-scroll"><table class="nba-log"><thead><tr><th>WEEK</th><th>SEASON</th><th>OPP</th><th>CARRIES</th><th>TARGETS</th><th>RUSH YDS</th><th>REC YDS</th><th>TD</th></tr></thead><tbody>'
  +(logs.map(g=>'<tr><td>'+esc(g.week)+'</td><td>'+esc(g.season)+'</td><td>'+esc(g.opponent)+'</td><td>'+esc(g.carries)+'</td><td>'+esc(g.targets)+'</td><td>'+esc(g.rushYds)+'</td><td>'+esc(g.recYds)+'</td><td>'+esc((num(g.rushTds)||0)+(num(g.recTds)||0))+'</td></tr>').join('')||'<tr><td colspan="8">No verified game log available.</td></tr>')
  +'</tbody></table></div><p class="nba-footnote">Historical rates are descriptive. TSO probabilities are model estimates, not guarantees. No QB passing touchdowns are counted in anytime TD.</p></div>';
}
function repaint(){
 const slot=document.getElementById('nflLabSlot');
 if(slot&&state.context)slot.innerHTML=render(state.context,state.tool);
}
function click(event){
 const target=event.target;
 const market=target.closest('[data-nfl-coverage-market]');
 if(market){state.coverageMarket=market.dataset.nflCoverageMarket;state.max=90;state.reverse=false;repaint();return true}
 const sort=target.closest('[data-nfl-coverage-sort]');
 if(sort){state.coverageSort=sort.dataset.nflCoverageSort;state.max=90;state.reverse=false;repaint();return true}
 const tdOrder=target.closest('[data-nfl-tdorder]');
 if(tdOrder){state.tdOrder=tdOrder.dataset.nflTdorder;state.reverse=false;repaint();return true}
 if(target.closest('[data-nfl-sort]')){state.reverse=!state.reverse;repaint();return true}
 if(target.closest('[data-nfl-more]')){state.max+=100;repaint();return true}
 const selected=target.closest('[data-nfl-row]');if(selected){
  const r=state.all.find(x=>x.id===selected.dataset.nflRow);if(!r)return true;
  document.getElementById('drawerBody').innerHTML=detail(r,state.context);
  document.getElementById('drawer').setAttribute('aria-label',r.kind==='defense'?'Defensive position research':r.kind==='game'?'Team matchup research':'Player research');
  document.getElementById('drawer').hidden=false;
  document.getElementById('scrim').hidden=false;
  return true;
 }
 return false;
}
function change(event){
 if(event.target.closest('[data-nfl-conflicts]')){state.conflictsOnly=Boolean(event.target.checked);state.max=90;repaint();return true}
 const option=event.target.closest('[data-nfl-check]');
 if(option){
  const kind=option.dataset.nflCheck,id=option.dataset.nflValue;
  if(kind!=='games'&&kind!=='positions')return false;
  if(id==='all')state[kind]=[];
  else{const all=new Set(state[kind]);if(option.checked)all.add(id);else all.delete(id);state[kind]=[...all]}
  state.open[kind]=true;state.max=90;repaint();return true;
 }
 const min=event.target.closest('[data-nfl-min]');
 if(min){state.minGames=Number(min.value)||0;state.max=90;repaint();return true}
 return false;
}
function input(event){
 if(!event.target.matches('[data-nfl-search]'))return false;
 const caret=event.target.selectionStart;
 state.search=event.target.value;
 repaint();
 const target=document.querySelector('[data-nfl-search]');
 target?.focus?.();try{target?.setSelectionRange?.(caret,caret)}catch(_){}
 return true;
}
document.addEventListener('toggle',event=>{
 const type=event.target.dataset?.nflPicker;
 if(type==='games'||type==='positions')state.open[type]=Boolean(event.target.open);
},true);
document.addEventListener('click',event=>{
 for(const k of ['games','positions']){
  if(state.open[k]&&!event.target.closest?.('[data-nfl-picker="'+k+'"]')){
   const picker=document.querySelector('[data-nfl-picker="'+k+'"]');
   if(picker){picker.open=false;state.open[k]=false}
  }
 }
});
window.TSO3NflLab={tools,render,click,change,input,state};
})();