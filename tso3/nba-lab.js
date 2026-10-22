/* TSO 3.0 NBA research cheatsheets.
 * Current sportsbook/model lines are joined only to exact player + market + line.
 * Source-game histories are real completed games. Unknown means —.
 * Opponent DVP is descriptive position-group production, not prediction. */
(()=>{
'use strict';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const code=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const market=v=>{const x=code(v);if(['points','playerpoints'].includes(x))return 'points';if(['rebounds','playerrebounds'].includes(x))return 'rebounds';if(['assists','playerassists'].includes(x))return 'assists';if(['threes','threepointersmade','3pointersmade','playerthrees'].includes(x))return 'threes';if(['pra','pointsreboundsassists','playerpra'].includes(x))return 'pra';return null};
const MARKETS={points:'Points',rebounds:'Rebounds',assists:'Assists',threes:'3-Pointers Made',pra:'PTS + REB + AST'};
const statLabel=(n,precision=1)=>number(n)===null?'—':Number(n).toFixed(precision);
const posGroup=pos=>['PG','SG','G'].includes(String(pos||'').toUpperCase())?'G':['SF','PF','F'].includes(String(pos||'').toUpperCase())?'F':['C','F-C','C-F','FC'].includes(String(pos||'').toUpperCase())?'C':null;
const fmtDate=t=>{const dt=new Date(t||'');return Number.isFinite(dt.getTime())?dt.toLocaleDateString(undefined,{month:'short',day:'numeric'}):'—'};
const fmtOdds=n=>number(n)===null?'—':(Number(n)>0?'+':'')+Number(n);
const slugParts=m=>market(m)||null;
const view={metric:'points',position:'all',game:'all',minSample:'0',sort:'l10',direction:'desc',search:'',lineFilter:'auto',limit:90,rows:[],lastResults:[],dataError:'',date:null};
const stateCtx={};
function isAvailable(ctx){return Boolean(ctx?.research?.players&&Object.keys(ctx.research.players).length)}
function statGame(g,m){
 const st=g?.stats;
 if(!st)return null;
 if(m==='pra'){
  const explicit=number(st.pra);
  if(explicit!==null)return explicit;
  const pts=number(st.points),reb=number(st.rebounds),ast=number(st.assists);
  return pts===null||reb===null||ast===null?null:pts+reb+ast;
 }
 return number(st[m]);
}
function history(player,m){
 const seen=new Set();
 const games=(Array.isArray(player?.recentGames)?player.recentGames:[])
  .filter(g=>g?.date&&Number.isFinite(Date.parse(g.date))&&number(g.minutes)!==null&&Number(g.minutes)>=4&&Number(g.seasonType)!==1)
  .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
  .filter(g=>{const key=String(g.date).slice(0,10)+'|'+(g.opponent||'');if(seen.has(key))return false;seen.add(key);return true})
  .map(g=>({...g,value:statGame(g,m)})).filter(g=>g.value!==null);
 return games;
}
function summary(games,line,currentSeason,n){
 const l=games.filter(x=>n==='season'?Number(x.season)===Number(currentSeason):true).slice(0,n==='season'?999:n);
 if(!l.length)return null;
 const values=l.map(x=>x.value);
 const total=values.reduce((a,b)=>a+b,0);
 const isLine=number(line)!==null;
 const hits=isLine?values.filter(x=>x>Number(line)).length:null;
 return {n:l.length,mean:total/l.length,hits,rate:isLine?hits/l.length*100:null,values,all:l};
}
function lookupPerson(research,m){
 if(!research?.players||!m)return null;
 const id=String(m.playerId||'');
 if(id&&research.players[id])return research.players[id];
 return Object.values(research.players).find(p=>norm(p.name)===norm(m.player)&&(m.teamId?String(p.teamId)===String(m.teamId):true))||null;
}
function byName(research,name,id){
 if(!research?.players||!name)return null;
 if(id&&research.players[String(id)])return research.players[String(id)];
 return Object.values(research.players).find(p=>norm(p.name)===norm(name))||null;
}
function teamName(team,research){
 const t=research?.teams?.[String(team)]||{};
 return t.abbreviation||t.abbr||t.name||String(team||'');
}
function resolveGame(person,models,games,research){
 if(!person)return null;
 const entry=models?.find(m=>String(m.playerId||'')===String(person.id))||null;
 let game=entry&&games.find(g=>String(g.id)===String(entry.eventId));
 if(game)return game;
 game=games.find(g=>String(g.home?.id)===String(person.teamId)||String(g.away?.id)===String(person.teamId));
 if(game)return game;
 if(entry?.homeTeam&&entry?.awayTeam){
  const x=games.find(g=>norm(g.home?.name)===norm(entry.homeTeam)&&norm(g.away?.name)===norm(entry.awayTeam));
  if(x)return x;
 }
 return null;
}
function opponentId(person,game){
 if(!game)return null;
 const team=String(person.teamId);
 if(String(game.home?.id)===team)return String(game.away?.id);
 if(String(game.away?.id)===team)return String(game.home?.id);
 return null;
}
function defensiveAllowance(research,opponent,position,m){
 if(!opponent||!position||!m||!research)return null;
 const allow=number(research.teamDefense?.[String(opponent)]?.byPosition?.[position]?.[m]);
 const league=number(research.league?.allowByPosition?.[position]?.[m]);
 if(allow===null||league===null||league<=0)return null;
 const all=Object.values(research.teamDefense||{}).map(d=>number(d?.byPosition?.[position]?.[m])).filter(x=>x!==null).sort((a,b)=>b-a);
 const rank=all.length>=25?all.indexOf(allow)+1:null;
 return {allowed:allow,league,ratio:allow/league,rank,coverage:all.length,position};
}
function modelIndex(models){
 const idx=new Map();
 for(const m of models||[]){
  if(!m?.player||!m?.eventId||!market(m.market)||number(m.line)===null)continue;
  idx.set([String(m.eventId),norm(m.player),market(m.market),String(Number(m.line))].join('|'),m);
 }
 return idx;
}
function quoteKey(row){return [String(row.eventId||row.gameId||''),norm(row.player),market(row.marketLabel||row.market),String(Number(row.line))].join('|')}
function prices(rows){
 const m=new Map();
 for(const r of rows||[]){
  if(String(r.sport||r.league||'').toLowerCase()!=='nba'||!market(r.marketLabel||r.market)||number(r.line)===null||!['over','yes','true'].includes(String(r.side||'over').toLowerCase())||r.available===false||r.active===false||r.suspended===true||r.preserved===true||!number(r.price)||!(r.book||r.bookName||r.sportsbook))continue;
  const k=quoteKey(r),old=m.get(k);
  if(!old||number(r.price)!==null&&(number(old.price)===null||Number(r.price)>Number(old.price)))m.set(k,r);
 }
 return m;
}
function rankedRows(ctx){
 const research=ctx.research,games=(ctx.games||[]).filter(g=>g.league==='nba'),mod=ctx.models?.models||[];
 const odds=prices(ctx.props?.rows||[]);
 const marks=modelIndex(mod);
 const rows=[],seen=new Set(),byPerson=new Map();
 // Preserve real model lines even when book prices are unavailable.
 for(const m of mod){
  const metric=market(m.market);if(!metric||number(m.line)===null)continue;
  const person=lookupPerson(research,m);if(!person)continue;
  const key=[String(m.eventId),String(person.id),metric,String(Number(m.line))].join('|');
  if(seen.has(key))continue;seen.add(key);
  const game=resolveGame(person,[m],games,research);
  const opp=m.opponentId?String(m.opponentId):opponentId(person,game);
  const quote=odds.get([String(m.eventId),norm(m.player),metric,String(Number(m.line))].join('|'));
  const dvp=defensiveAllowance(research,opp,posGroup(person.position),metric);
  rows.push({id:key,player:person,game,market:metric,line:Number(m.line),quote,model:m,defense:dvp,opponent:opp,log:history(person,metric),from:'exact model line'});
  byPerson.set(String(person.id)+'|'+metric,true);
 }
 // Additional sportsbook lines appear only if the player identity and market can be verified.
 for(const quote of odds.values()){
  const metric=market(quote.marketLabel||quote.market);
  const person=byName(research,quote.player,quote.playerId);
  if(!metric||!person)continue;
  const key=[String(quote.eventId||quote.gameId||''),String(person.id),metric,String(Number(quote.line))].join('|');
  if(seen.has(key))continue;seen.add(key);
  const game=resolveGame(person,[],games,research);
  const opp=opponentId(person,game);
  const mi=marks.get(quoteKey(quote))||null;
  rows.push({id:key,player:person,game,market:metric,line:Number(quote.line),quote,model:mi,defense:defensiveAllowance(research,opp,posGroup(person.position),metric),opponent:opp,log:history(person,metric),from:'verified sportsbook line'});
  byPerson.set(String(person.id)+'|'+metric,true);
 }
 // With no active book line, still show verifiable player averages. Never create synthetic odds or lines.
 if(research?.players){
  const gameTeams=new Set(games.flatMap(g=>[String(g.home?.id||''),String(g.away?.id||'')]));
  const eligible=Object.values(research.players).filter(p=>p?.name&&Array.isArray(p.recentGames)&&p.recentGames.length>0);
  const scoped=eligible.filter(p=>gameTeams.has(String(p.teamId)));
  // If scoreboard IDs differ, retain history but do not claim a verified matchup.
  const sorted=(scoped.length?scoped:eligible).sort((a,b)=>norm(a.name).localeCompare(norm(b.name)));
  for(const person of sorted){
   const game=resolveGame(person,[],games,research),opp=opponentId(person,game);
   for(const metric of Object.keys(MARKETS)){
    const log=history(person,metric);
    if(!log.length||byPerson.has(String(person.id)+'|'+metric))continue;
    rows.push({id:'history|'+person.id+'|'+metric,player:person,game,market:metric,line:null,quote:null,model:null,defense:defensiveAllowance(research,opp,posGroup(person.position),metric),opponent:opp,log,from:'history only'});
   }
  }
 }
 return rows;
}
function visibleRows(ctx){
 const all=view.rows,query=(view.search||'').toLowerCase(),hasLines=all.some(r=>r.line!==null);
 let list=all.filter(r=>(view.lineFilter==='all'||(view.lineFilter==='auto'?(!hasLines||r.line!==null):(view.lineFilter==='lines'?r.line!==null:r.line===null)))
 &&(view.metric==='all'||r.market===view.metric)
 &&(view.position==='all'||posGroup(r.player.position)===view.position)
 &&(view.game==='all'||String(r.game?.id||'')===view.game)
 &&(view.minSample==='0'||r.log.length>=Number(view.minSample))
 &&(!query||[r.player.name,r.player.team,r.player.position,r.model?.opponent,r.game?.home?.abbr,r.game?.away?.abbr].join(' ').toLowerCase().includes(query)));
 const sort=view.sort,descending=view.direction==='desc'?1:-1;
 const value=r=>{
  const recent=summary(r.log,r.line,ctx.research?.currentSeason,sort==='l5'?5:sort==='l10'?10:sort==='l20'?20:'season');
  if(['l5','l10','l20','season'].includes(sort))return number((hasLines&&view.lineFilter==='all')?recent?.rate:(recent?.rate??recent?.mean));
  if(sort==='dvp')return number(r.defense?.ratio);
  if(sort==='model')return r.model?.overProbability!=null?Number(r.model.overProbability)*100:null;
  if(sort==='minutes')return summary(r.log.map(g=>({...g,value:number(g.minutes)})).filter(g=>g.value!==null),null,ctx.research?.currentSeason,5)?.mean??null;
  if(sort==='price')return number(r.quote?.price);
  return null;
 };
 list.sort((a,b)=>{
  if(sort==='name')return descending*norm(b.player.name).localeCompare(norm(a.player.name));
  const av=value(a),bv=value(b);
  if(av===null&&bv===null)return norm(a.player.name).localeCompare(norm(b.player.name));
  if(av===null)return 1;if(bv===null)return -1;
  return descending*(bv-av)||norm(a.player.name).localeCompare(norm(b.player.name));
 });
 view.lastResults=list;
 return list;
}
const chip=(v,cls='')=>'<span class="nba-chip '+cls+'">'+e(v)+'</span>';
const rateCell=(sum,line)=>!sum?'<span class="nba-muted">—</span>':number(line)===null?'<b>'+statLabel(sum.mean)+'</b><small>AVG · '+sum.n+' GM</small>':
 '<b class="'+(sum.rate>=70?'nba-good':sum.rate<=30?'nba-low':'')+'">'+Math.round(sum.rate)+'%</b><small>'+sum.hits+'/'+sum.n+' OVER</small>';
function tpl(ctx,tool){
 if(!isAvailable(ctx)){
  return '<section class="nba-lab"><div class="nba-lab-alert"><b>Verified NBA history not connected</b><p>'+e(ctx.error||'The ESPN-derived player history is unavailable; TSO will not show fake hit rates or opponent rankings.')+'</p></div></section>';
 }
 const title=tool==='player-form'?'NBA PLAYER FORM':'NBA MATCHUP VS POSITION';
 const desc=tool==='player-form'?'Every available player, one research table: minutes, averages, game-by-game hit rates and exact sportsbook lines.':
  'Compare players with their actual opponents using positional production allowed by each defense. Higher ratio = more allowed than the league benchmark.';
 const games=(ctx.games||[]).filter(g=>g.league==='nba');
 const date=ctx.research.generatedAt?new Date(ctx.research.generatedAt):null;
 const dateText=date&&Number.isFinite(date.getTime())?date.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'source timestamp unavailable';
 const rows=visibleRows(ctx);
 const options=(items,chosen)=>items.map(([value,label])=>'<option value="'+e(value)+'" '+(value===chosen?'selected':'')+'>'+e(label)+'</option>').join('');
 const matchupOptions=games.map(g=>[String(g.id),String(g.away?.abbr||'AWAY')+' @ '+String(g.home?.abbr||'HOME')]);
 const first=rows.slice(0,view.limit);
 const header=tool==='player-form'
  ?'<th data-nba-sort="name">PLAYER</th><th>MATCHUP</th><th>MARKET / LINE</th><th data-nba-sort="l5">L5</th><th data-nba-sort="l10">L10</th><th data-nba-sort="l20">L20</th><th data-nba-sort="season">SEASON</th><th data-nba-sort="minutes">L5 MIN</th><th data-nba-sort="dvp">VS POS</th><th data-nba-sort="price">BEST BOOK</th>'
  :'<th data-nba-sort="name">PLAYER</th><th>MATCHUP</th><th>POSITION</th><th>MARKET / LINE</th><th data-nba-sort="dvp">OPP ALLOW / GM</th><th>LEAGUE / GM</th><th data-nba-sort="dvp">VS AVG</th><th data-nba-sort="l10">L10 FORM</th><th data-nba-sort="minutes">L5 MIN</th><th data-nba-sort="model">MODEL OVER</th>';
 const body=first.map(r=>{
  const id=String(r.id),line=r.line===null?'No current line':'Over '+statLabel(r.line),
   mins=summary(r.log.map(g=>({...g,value:number(g.minutes)})).filter(g=>g.value!==null),null,ctx.research.currentSeason,5),
   l5=summary(r.log,r.line,ctx.research.currentSeason,5),l10=summary(r.log,r.line,ctx.research.currentSeason,10),
   l20=summary(r.log,r.line,ctx.research.currentSeason,20),season=summary(r.log,r.line,ctx.research.currentSeason,'season'),
   opponent= r.model?.opponent||(r.opponent?teamName(r.opponent,ctx.research):null),
   d=r.defense, ratio=d?d.ratio:null;
  const photo=/^https:\/\//i.test(r.player.headshot||'')?'<img src="'+e(r.player.headshot)+'" alt="" loading="lazy">':'<span>'+e((r.player.name||'P').split(' ').map(p=>p[0]).slice(0,2).join(''))+'</span>';
  const playerCell='<td><div class="nba-person">'+photo+'<div><b>'+e(r.player.name)+'</b><small>'+e(r.player.team||'—')+' · '+e(r.player.position||'—')+'</small></div></div></td>';
  const oppCell='<td><b>'+e(opponent||'—')+'</b><small>'+e(r.game?String(r.game.away?.abbr)+' @ '+String(r.game.home?.abbr):'MATCHUP UNVERIFIED')+'</small></td>';
  const marketCell='<td><b>'+e(MARKETS[r.market])+'</b><small>'+e(line)+'</small></td>';
  const lastMinutes='<td><b>'+statLabel(mins?.mean)+'</b><small>'+(mins?mins.n+' games':'NO LOG')+'</small></td>';
  const dvpCell='<td><b class="'+(ratio!==null?(ratio>=1.08?'nba-good':ratio<=.92?'nba-low':''):'')+'">'+(d?statLabel(d.allowed):'—')+'</b><small>'+(d?.rank?'#'+d.rank+' MOST ALLOWED':'POSITION SAMPLE')+'</small></td>';
  const oddsCell='<td><b>'+e(fmtOdds(r.quote?.price))+'</b><small>'+e(r.quote?.book||'NO BOOK QUOTE')+'</small></td>';
  const rowBody=tool==='player-form'
    ?playerCell+oppCell+marketCell+'<td>'+rateCell(l5,r.line)+'</td><td>'+rateCell(l10,r.line)+'</td><td>'+rateCell(l20,r.line)+'</td><td>'+rateCell(season,r.line)+'</td>'+lastMinutes
     +'<td><b class="'+(ratio!==null&&ratio>=1.08?'nba-good':'')+'">'+(ratio===null?'—':statLabel(ratio,2)+'×')+'</b><small>'+e(d?.position||'')+'</small></td>'+oddsCell
    :playerCell+oppCell+'<td>'+e(r.player.position||'—')+'</td>'+marketCell+dvpCell
      +'<td><b>'+statLabel(d?.league)+'</b><small>'+e(d?.position||'—')+' GROUP</small></td>'
      +'<td><b class="'+(ratio!==null?(ratio>=1.08?'nba-good':ratio<=.92?'nba-low':''):'')+'">'+(ratio===null?'—':statLabel(ratio,2)+'×')+'</b><small>'+(ratio===null?'NO SOURCE':ratio>1?'ABOVE AVG':'BELOW AVG')+'</small></td>'
      +'<td>'+rateCell(l10,r.line)+'</td>'+lastMinutes
      +'<td><b>'+ (number(r.model?.overProbability)===null?'—':statLabel(r.model.overProbability*100,1)+'%')+'</b><small>'+(r.model?'EXACT LINE':'NO MODEL')+'</small></td>';
  return '<tr tabindex="0" data-nba-row="'+e(id)+'" aria-label="Open '+e(r.player.name)+' research">'+rowBody+'</tr>';
 }).join('');
 const controls='<div class="nba-controls">'
  +'<label>GAME<select data-nba-filter="game">'+options([['all','All matchups'],...matchupOptions],view.game)+'</select></label>'
  +'<label>MARKET<select data-nba-filter="metric">'+options([['all','All markets'],...Object.entries(MARKETS)],view.metric)+'</select></label>'
  +'<label>POSITION<select data-nba-filter="position">'+options([['all','All positions'],['G','Guards'],['F','Forwards'],['C','Centers']],view.position)+'</select></label>'
  +'<label>DATA<select data-nba-filter="lineFilter">'+options([['auto','Current lines / fallback'],['all','All verified players'],['lines','Only players with lines'],['history','No current lines']],view.lineFilter)+'</select></label>'
  +'<label>MIN. GAMES<select data-nba-filter="minSample">'+options([['0','Any sample'],['5','5+ games'],['10','10+ games'],['15','15+ games'],['20','20+ games']],view.minSample)+'</select></label>'
  +'<label>SORT<select data-nba-filter="sort">'+options([['l5','Last 5'],['l10','Last 10'],['l20','Last 20'],['season','Season'],['dvp','Opp. allowance'],['minutes','Minutes'],['model','Model over'],['price','Best price'],['name','Player name']],view.sort)+'</select></label>'
  +'<label class="nba-search-label">FIND PLAYER<input data-nba-search type="search" value="'+e(view.search)+'" placeholder="Player or team…"></label>'
  +'<button class="nba-sort-direction" type="button" data-nba-reverse title="Reverse sorting">'+(view.direction==='desc'?'↓':'↑')+'</button></div>';
 const age=date&&Number.isFinite(date.getTime())?Date.now()-date.getTime():null;
 const sourceLabel=age===null?'NBA SOURCE — TIMESTAMP UNAVAILABLE':age>3*86400000?'HISTORICAL NBA SOURCE — CHECK FRESHNESS':'TSO VERIFIED NBA HISTORY';
 const status='<div class="nba-data-strip"><span class="nba-data-dot"></span><span>'+sourceLabel+'</span><span>'+e(dateText)+'</span><span>'+rows.length+' qualifying research rows</span><span>'+rows.filter(r=>r.line!==null).length+' exact prop lines</span></div>';
 const cols=tool==='player-form'?10:10;
 const table='<div class="nba-table-scroll"><table class="nba-table"><thead><tr>'+header+'</tr></thead><tbody>'
  +(body||'<tr class="nba-no-rows"><td colspan="'+cols+'">No verified players match these filters. Try another market or position.</td></tr>')
  +'</tbody></table></div><div class="nba-table-foot"><span>Showing '+first.length+' / '+rows.length+' · Select any row for game logs, trends and matchup context</span>'
  +(first.length<rows.length?'<button type="button" data-nba-more>SHOW MORE →</button>':'')+'</div>';
 return '<section class="nba-lab"><div class="nba-intro"><div><span class="nba-eyebrow">THE SPORTS OUTPOST / NBA INTELLIGENCE</span><h2>'+e(title)+'</h2><p>'+e(desc)+'</p></div><div class="nba-view-switch"><a class="'+(tool==='player-form'?'active':'')+'" href="#/nba/cheatsheets/player-form">PLAYER FORM</a><a class="'+(tool==='matchup-vs-position'?'active':'')+'" href="#/nba/cheatsheets/matchup-vs-position">VS POSITION</a></div></div>'
  +status+controls
  +'<div class="nba-legend"><span><i class="nba-legend-high"></i>Strong historical rate / more allowed</span><span><i class="nba-legend-low"></i>Lower historical rate / less allowed</span><span>— means not verified · Rates only against an observed exact line</span></div>'
  +table
  +'<p class="nba-footnote">Source: TSO ESPN-derived game history and NBA regression feed. L5/L10/L20 may bridge seasons; “Season” uses the source’s current season only. Defense vs position aggregates guards (G), forwards (F) and centers (C); a 1.10× rate means 10% more points or other selected stat allowed than its league positional benchmark, <strong>not a 10% betting edge</strong>. Older feeds are marked by their source timestamp. Sportsbook lines and odds appear only when verified.</p></section>';
}
function detail(ctx,row){
 const g=row.log,cs=ctx.research?.currentSeason;
 const a5=summary(g,row.line,cs,5),a10=summary(g,row.line,cs,10),a20=summary(g,row.line,cs,20),season=summary(g,row.line,cs,'season');
 const r5=summary(g.map(x=>({...x,value:number(x.minutes)})).filter(x=>x.value!==null),null,cs,5);
 const home=summary(g.filter(x=>x.homeAway==='home'),row.line,cs,20),away=summary(g.filter(x=>x.homeAway==='away'),row.line,cs,20);
 const bars=g.slice(0,20).reverse();
 const high=Math.max(1,...bars.map(x=>x.value),row.line||0);
 const chips=[['L5',a5],['L10',a10],['L20',a20],['SEASON',season]].map(([label,s])=>'<div class="nba-snapshot"><small>'+label+'</small><b>'+(s?(row.line===null?statLabel(s.mean):Math.round(s.rate)+'%'):'—')+'</b><span>'+(s?(row.line===null?'AVG '+s.n+' games':s.hits+'/'+s.n+' over · AVG '+statLabel(s.mean)):'NO VERIFIED GAMES')+'</span></div>').join('');
 const chart=bars.length?'<div class="nba-trend-chart"><div class="nba-chart-bars">'+bars.map(g=>{
  const height=Math.max(3,Math.min(100,g.value/high*100));
  return '<div class="nba-bar-wrap"><div class="nba-bar '+(row.line!==null&&g.value>row.line?'over':'under')+'" style="height:'+height+'%" title="'+e(fmtDate(g.date)+' '+g.value)+'"></div><small>'+e(fmtDate(g.date))+'</small><b>'+e(statLabel(g.value,0))+'</b></div>'
 }).join('')+'</div>'+(row.line!==null?'<p>Orange bars exceeded <b>Over '+statLabel(row.line)+'</b>; gray bars did not. Recent games shown left-to-right in chronological order.</p>':'<p>Historical game totals only — no currently verified sportsbook line.</p>')+'</div>':'<div class="nba-lab-alert">No completed games were available to chart.</div>';
 const logs=g.slice(0,30).map(x=>'<tr><td>'+e(fmtDate(x.date))+'</td><td>'+e(x.opponent||'—')+'</td><td>'+e(x.homeAway||'—')+'</td><td><b>'+e(statLabel(x.value))+'</b></td><td>'+e(statLabel(x.minutes))+'</td><td>'+e(row.line===null?'—':x.value>row.line?'OVER':'NOT OVER')+'</td></tr>').join('');
 const d=row.defense;
 return '<div class="drawer-contents nba-drawer"><span class="eyebrow">NBA / VERIFIED PLAYER RESEARCH</span><h2>'+e(row.player.name)+'</h2><p class="subtitle">'+e(row.player.team||'—')+' · '+e(row.player.position||'—')+' · '+e(MARKETS[row.market])+' · '+e(row.line===null?'NO CURRENT PROP LINE':'OVER '+statLabel(row.line))+'</p>'
  +'<div class="nba-detail-tags">'+(row.quote?chip(fmtOdds(row.quote.price)+' '+(row.quote.book||'BOOK')):chip('NO VERIFIED BOOK'))+(row.model?chip('EXACT-LINE TSO MODEL'):chip('MODEL NOT MATCHED'))
  +(row.player.injury?.status?chip('INJURY: '+row.player.injury.status,'warning'):'')+'</div>'
  +'<h3>Actual game performance</h3><div class="nba-snapshots">'+chips+'</div><h3>Recent game chart</h3>'+chart
  +'<h3>Minutes and matchup</h3><div class="nba-detail-metrics">'
  +'<div><small>L5 MINUTES</small><b>'+statLabel(r5?.mean)+'</b></div><div><small>VS POS ALLOWED</small><b>'+statLabel(d?.allowed)+'</b></div>'
  +'<div><small>LEAGUE POS AVG</small><b>'+statLabel(d?.league)+'</b></div><div><small>OPP / LEAGUE</small><b>'+(d?statLabel(d.ratio,2)+'×':'—')+'</b></div>'
  +'<div><small>HOME AVG (UP TO 20)</small><b>'+statLabel(home?.mean)+'</b></div><div><small>AWAY AVG (UP TO 20)</small><b>'+statLabel(away?.mean)+'</b></div>'
  +'<div><small>MODEL PROJECTION</small><b>'+statLabel(row.model?.projection)+'</b></div><div><small>MODEL OVER</small><b>'+(number(row.model?.overProbability)===null?'—':statLabel(row.model.overProbability*100,1)+'%')+'</b></div></div>'
  +'<p class="nba-context-note">'+(d?'Opponent allows '+statLabel(d.allowed)+' '+e(MARKETS[row.market])+' per game to the '+e(d.position)+' group, compared with a league benchmark of '+statLabel(d.league)+'. '+(d.rank?'Ranked #'+d.rank+' of '+d.coverage+' by most allowed.':'Insufficient league coverage to publish a rank.'):'Opponent positional rate not independently verified for this matchup.')
  +' Observed rates are not model probabilities. Verify lineup status before making decisions.</p>'
  +'<h3>Verified game log</h3><div class="nba-log-scroll"><table class="nba-log"><thead><tr><th>DATE</th><th>OPP</th><th>H/A</th><th>'+e(MARKETS[row.market])+'</th><th>MIN</th><th>RESULT</th></tr></thead><tbody>'+(logs||'<tr><td colspan="6">No verified games</td></tr>')+'</tbody></table></div>'
  +'<div class="drawer-actions"><button class="btn subtle" type="button" data-nba-close>Close research</button></div></div>';
}
function render(ctx,tool){
 if(!ctx||ctx.sport!=='nba'||!['player-form','matchup-vs-position'].includes(tool))return '';
 stateCtx.value=ctx;
 const key=ctx.research?.generatedAt+'|'+ctx.models?.generatedAt+'|'+ctx.props?.rows?.length+'|'+ctx.games?.length;
 if(stateCtx.key!==key){
  view.rows=rankedRows(ctx);stateCtx.key=key;view.limit=90;
 }
 return tpl(ctx,tool);
}
function repaint(){
 const root=document.getElementById('nbaLabSlot'),ctx=stateCtx.value;
 if(root&&ctx)root.innerHTML=tpl(ctx,ctx.tool);
}
function click(event){
 const target=event.target;
 const reverse=target.closest('[data-nba-reverse]');if(reverse){view.direction=view.direction==='desc'?'asc':'desc';repaint();return true}
 const sort=target.closest('[data-nba-sort]');if(sort){const key=sort.dataset.nbaSort;
  if(view.sort===key)view.direction=view.direction==='desc'?'asc':'desc';else{view.sort=key;view.direction='desc'}
  repaint();return true}
 const more=target.closest('[data-nba-more]');if(more){view.limit+=100;repaint();return true}
 const row=target.closest('[data-nba-row]');if(row){
  const item=view.rows.find(r=>r.id===row.dataset.nbaRow);
  const ctx=stateCtx.value;
  if(!item||!ctx)return true;
  document.getElementById('drawerBody').innerHTML=detail(ctx,item);
  document.getElementById('drawer').hidden=false;
  document.getElementById('scrim').hidden=false;
  document.getElementById('closeDrawer')?.focus();
  return true;
 }
 const close=target.closest('[data-nba-close]');
 if(close){document.getElementById('closeDrawer')?.click();return true}
 return false;
}
function change(event){
 const node=event.target,filter=node.closest('[data-nba-filter]');
 if(filter){view[filter.dataset.nbaFilter]=filter.value;view.limit=90;repaint();return true}
 return false;
}
function input(event){
 if(!event.target.matches('[data-nba-search]'))return false;
 const old=event.target,caret=old.selectionStart;
 view.search=old.value;
 const root=document.getElementById('nbaLabSlot');
 if(root){root.innerHTML=tpl(stateCtx.value,stateCtx.value.tool);
  const next=root.querySelector('[data-nba-search]');if(next){next.focus();try{next.setSelectionRange(caret,caret)}catch(_){}}}
 return true;
}
window.TSO3NbaLab={render,click,change,input,summary,history,defensiveAllowance,rankedRows,view};
})();