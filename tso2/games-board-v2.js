/* TSO 2.0 Games Board — card overview -> single-game scouting.
 * Reference-inspired composition with the existing TSO design tokens/data.
 * Never turn bookmaker implied % into an unlabelled model probability. */
(()=>{
'use strict';
const old=window.TSO2Decision;
if(!old)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const round=(v,d=1)=>n(v)===null?'—':Number(v).toFixed(d).replace(/\.0$/,'');
const canonical=v=>String(v||'').trim().toUpperCase().replace(/^LAR$/,'LA').replace(/^GNB$/,'GB').replace(/^JAC$/,'JAX');
const code=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const prettyLine=v=>n(v)===null?'—':(Number(v)>0?'+':'')+round(v,1);
const prob=v=>n(v)===null?'—':(n(v)*100).toFixed(0)+'%';
const pct=v=>n(v)===null?'—':n(v).toFixed(0)+'%';
const normOdds=value=>{const v=n(value);return v===null?null:v<0?(-v)/((-v)+100):100/(v+100)};
const fair=(a,b)=>{const p=normOdds(a),q=normOdds(b);return p===null||q===null||p+q<=0?null:[p/(p+q),q/(p+q)]};
const state={openId:null,lastFilter:'all',model:null,modelLoadedAt:0,modelInFlight:false,requested:new Set(),teamStats:new Map(),teamStatsPending:new Set(),detailSignature:'',boundRoot:null,ctx:null};
const originalRender=old.render.bind(old);
const labels={all:'ALL',nfl:'NFL',nba:'NBA',nhl:'NHL',mlb:'MLB'};
function status(g){
 if(g?.state==='in')return g.detail||'LIVE';
 if(g?.state==='post')return 'FINAL';
 const d=Date.parse(g?.startTime||'');
 return Number.isFinite(d)?new Intl.DateTimeFormat(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(d)):'Time pending';
}
function logo(t){
 const uri=String(t?.logo||'');
 return '<span class="gb2-logo">'+(/^https:\/\//i.test(uri)?'<img src="'+esc(uri)+'" alt="" loading="lazy">':'<b>'+esc(String(t?.abbr||'?').slice(0,3))+'</b>')+'</span>';
}
function filters(league){
 return '<nav class="gb2-tabs" aria-label="Filter games by league">'+Object.keys(labels).map(k=>
 '<button type="button" data-gb2-league="'+k+'" class="'+(league===k?'is-active':'')+'" aria-pressed="'+(league===k?'true':'false')+'">'+labels[k]+'</button>').join('')+'</nav>';
}
function html(league){
 return '<section class="decision-page gb2-root" data-gb2-root>'
  +'<header class="gb2-page-head"><div><small>MODEL INTELLIGENCE · VERIFIED SPORTSBOOK MARKETS</small><h1>Games Board</h1><p>Pick a matchup for team context, spread and total, and source-backed player props.</p></div></header>'
  +filters(league)
  +'<div data-gb2-grid class="gb2-grid" aria-live="polite"><div class="gb2-empty">Connecting the real game slate…</div></div>'
  +'<section data-gb2-detail class="gb2-detail" hidden></section>'
  +'<div data-gb2-dock class="gb2-dock"></div></section>';
}
function marketFor(g,ctx){
 const cache=ctx.linesBySport?.get?.(g.league);
 const related=cache?.games?.find(x=>String(x.id)===String(g.id)||
   (canonical(x.away?.abbr)===canonical(g.away?.abbr)&&canonical(x.home?.abbr)===canonical(g.home?.abbr)));
 const data=g.league==='nhl'?(cache?.linesById?.[String(related?.id||g.id)]||related?.gameLines||g.gameLines):related?.gameLines||g.gameLines;
 return data||null;
}
function modelFor(g){
 if(g.league!=='nfl'||!state.model?.games)return null;
 const row=state.model.games.find(x=>String(x.gameId)===String(g.id));
 if(!row||!row.availability?.rosterVerified||row.availability?.requiresRerun||row.iterations!==50000)return null;
 const issued=Date.parse(row.generatedAt||state.model.generatedAt||''),kick=Date.parse(g.startTime||'');
 if(!Number.isFinite(issued)||Date.now()-issued>72*3600000)return null;
 // Protect against reused team names across weeks or an outdated slate.
 const modelKick=Date.parse(row.kickoff||'');
 if(Number.isFinite(kick)&&Number.isFinite(modelKick)&&Math.abs(kick-modelKick)>3*3600000)return null;
 return row;
}
function info(g,ctx){
 const lines=marketFor(g,ctx),model=modelFor(g),ml=lines?.moneyline||null;
 const awayPrice=ml?.awayBest??ml?.away?.price,homePrice=ml?.homeBest??ml?.home?.price;
 const implied=fair(awayPrice,homePrice);
 const mw=model?.projected,modelProb=n(mw?.awayWin),homeProb=n(mw?.homeWin);
 const modelGood=modelProb!==null&&homeProb!==null&&modelProb>=0&&homeProb>=0&&modelProb<=1&&homeProb<=1;
 const chances=modelGood?[modelProb,homeProb]:(n(ml?.awayFair)!==null&&n(ml?.homeFair)!==null?
 [n(ml.awayFair),n(ml.homeFair)]:implied);
 const probSource=modelGood?'TSO 50K MODEL':chances?'MARKET IMPLIED':'WIN CHANCE PENDING';
 const spread=lines?.spread;
 const puck=lines?.puckLine;
 const spreadAway=n(spread?.away?.point)!==null?n(spread?.away?.point):
  puck?(canonical(puck.favoriteAbbr)===canonical(g.away?.abbr)?n(puck.line):n(puck.underdogLine)):null;
 const spreadHome=n(spread?.home?.point)!==null?n(spread?.home?.point):
  puck?(canonical(puck.favoriteAbbr)===canonical(g.home?.abbr)?n(puck.line):n(puck.underdogLine)):null;
 const modelSpread=n(mw?.awayScore)!==null&&n(mw?.homeScore)!==null?n(mw.homeScore)-n(mw.awayScore):null;
 const appliedSpread=spreadAway!==null?spreadAway:modelSpread;
 const spreadSource=spreadAway!==null?'BOOK SPREAD':modelSpread!==null?'TSO MODEL MARGIN':'SPREAD PENDING';
 const total=n(lines?.total?.line)!==null?n(lines.total.line):
  n(mw?.awayScore)!==null&&n(mw?.homeScore)!==null?n(mw.awayScore)+n(mw.homeScore):null;
 const totalSource=n(lines?.total?.line)!==null?'BOOK TOTAL':total!==null?'TSO MODEL TOTAL':'TOTAL PENDING';
 const favorite=appliedSpread===null?null:appliedSpread<0?g.away:appliedSpread>0?g.home:null;
 return {lines,model,chances,probSource,awayPrice,homePrice,spreadAway:appliedSpread,
  spreadHome:spreadHome!==null?spreadHome:appliedSpread===null?null:-appliedSpread,
  spreadSource,total,totalSource,favorite};
}
function chanceBar(p){
 const value=n(p);return '<span class="gb2-prob-track"><i style="width:'+(value===null?'0':Math.max(0,Math.min(100,value*100)).toFixed(1))+'%"></i></span><span class="gb2-prob-label">'+prob(value)+'</span>';
}
function matchupText(g){return esc(g.away?.abbr||'AWAY')+' @ '+esc(g.home?.abbr||'HOME')}
function gameCard(g,ctx){
 const d=info(g,ctx),playing=g.state==='in',score=g.state==='pre'?'':(' · '+esc(g.away?.score??'—')+'–'+esc(g.home?.score??'—'));
 const teamRow=(t,p,spreadVal)=>'<div class="gb2-team-row">'+logo(t)+'<strong>'+esc(t?.abbr||'—')+'</strong>'+
 (spreadVal!==null?'<span class="gb2-team-spread">'+esc(prettyLine(spreadVal))+'</span>':'')+
 '<div class="gb2-prob-cell">'+chanceBar(p)+'</div></div>';
 return '<button class="gb2-card" type="button" data-gb2-game="'+esc(g.id)+'" aria-label="Open '+matchupText(g)+' matchup details">'
  +'<div class="gb2-card-top"><span class="gb2-league">'+esc(String(g.league||'').toUpperCase())+'</span><span class="gb2-card-time '+(playing?'is-live':'')+'">'+esc(status(g))+score+'</span></div>'
  +'<div class="gb2-teams">'+teamRow(g.away,d.chances?.[0],d.spreadAway)+teamRow(g.home,d.chances?.[1],d.spreadHome)+'</div>'
  +'<div class="gb2-card-source">'+esc(d.probSource)+'</div>'
  +'<div class="gb2-card-bottom"><div><small>'+esc(d.spreadSource)+'</small><b>'+esc(d.favorite?d.favorite.abbr+' '+prettyLine(d.favorite===g.away?d.spreadAway:d.spreadHome):d.spreadAway===0?'PICK’EM':'—')+'</b></div>'
  +'<div><small>'+esc(d.totalSource)+'</small><b>'+esc(round(d.total,1))+'</b></div><span aria-hidden="true" class="gb2-card-arrow">↗</span></div>'
  +'</button>';
}
function row(label,away,home,prefer='high'){
 const numeric=v=>n(v)!==null?n(v):/^[-+]?\d+(?:\.\d+)?%$/.test(String(v||'').trim())?Number(String(v).trim().slice(0,-1)):null;
 const a=numeric(away),b=numeric(home);
 const fa=String(away??'').trim().endsWith('%')?esc(String(away)):a===null?esc(String(away??'—')):esc(round(a,1));
 const fb=String(home??'').trim().endsWith('%')?esc(String(home)):b===null?esc(String(home??'—')):esc(round(b,1));
 const winner=a===null||b===null?'':a===b?'':prefer==='low'?(a<b?'away':'home'):(a>b?'away':'home');
 return '<div class="gb2-compare-row"><span>'+esc(label)+'</span><b class="'+(winner==='away'?'is-best':'')+'">'+fa+'</b><i class="'+(winner==='away'?'is-away':winner==='home'?'is-home':'')+'"></i><b class="'+(winner==='home'?'is-best':'')+'">'+fb+'</b></div>';
}
function formatPct01(v){return n(v)===null?'—':prob(v)}
function teamCode(league,abbr){
 const code=canonical(abbr);
 return league==='nhl'?({NJ:'NJD',TB:'TBL',LA:'LAK',SJ:'SJS',MON:'MTL'}[code]||code):code;
}
function teamStatsKey(g){return String(g.league||'')+'|'+teamCode(g.league,g.away?.abbr)+'|'+teamCode(g.league,g.home?.abbr);}
function loadMatchupStats(game){
 if(!['nfl','nhl'].includes(game?.league))return;
 const key=teamStatsKey(game),old=state.teamStats.get(key);
 if(state.teamStatsPending.has(key)||old&&Date.now()-old.fetchedAt<15*60000)return;
 state.teamStatsPending.add(key);
 const away=encodeURIComponent(teamCode(game.league,game.away?.abbr)),home=encodeURIComponent(teamCode(game.league,game.home?.abbr));
 const season=game.league==='nhl'?20262027:2026;
 const endpoint=game.league==='nhl'?'/api/tso2-nhl-team-stats':'/api/tso2-matchup-team-stats';
 fetch(endpoint+'?away='+away+'&home='+home,{headers:{accept:'application/json'},cache:'no-store'})
  .then(async response=>{
   const doc=await response.json();
   if(!response.ok||doc?.available!==true||doc.season!==season)throw Error(doc?.error||'Current-season team stats unavailable');
   if(doc.teams?.[teamCode(game.league,game.away?.abbr)]?.season!==season||doc.teams?.[teamCode(game.league,game.home?.abbr)]?.season!==season)throw Error('Team/season mismatch');
   state.teamStats.set(key,{...doc,fetchedAt:Date.now()});
  }).catch(err=>state.teamStats.set(key,{available:false,error:String(err?.message||err),fetchedAt:Date.now()}))
  .finally(()=>{
   state.teamStatsPending.delete(key);
   if(state.openId===String(game.id)&&state.ctx){
    state.detailSignature='';render(state.ctx);
   }
  });
}
function referenceComparisonRows(game){
 if(game.league!=='nfl')return '';
 const doc=state.teamStats.get(teamStatsKey(game)),aa=canonical(game.away?.abbr),bb=canonical(game.home?.abbr);
 if(!doc)return '<div class="gb2-source-note">Retrieving verified 2026 NFL team statistics…</div>';
 if(!doc.available)return '<div class="gb2-source-note">2026 team statistics currently unavailable: '+esc(doc.error||'data source offline')+'</div>';
 const a=doc.teams?.[aa]?.stats||{},b=doc.teams?.[bb]?.stats||{};
 const pairs=[
  ['Points per game','pointsPerGame','high'],
  ['Total yards per game','yardsPerGame','high'],
  ['Passing yards per game','passYardsPerGame','high'],
  ['Rushing yards per game','rushYardsPerGame','high'],
  ['Third-down conversion','thirdDownPct','high','%'],
  ['Defensive points allowed / game','defPointsAllowed','low'],
  ['Defensive yards allowed / game','defYardsAllowed','low'],
  ['Turnover differential','turnoverDifferential','high']
 ];
 const value=(x,k,suffix='')=>n(x[k])===null?'—':round(x[k],1)+suffix;
 return '<div class="gb2-comparison-stats">'+pairs.map(([label,key,prefer,suffix])=>
  row(label,value(a,key,suffix),value(b,key,suffix),prefer)).join('')+'</div>'
  +'<p class="gb2-source-note">ESPN 2026 regular season · '+esc(String(doc.teams?.[aa]?.games||'—'))+' / '+esc(String(doc.teams?.[bb]?.games||'—'))+' completed team games. Blank fields are unavailable, not zero. Lower defensive allowances are better. Values are historic averages, not future-game projections.</p>';
}

/* NHL reference layout — only real 2026–27 official data, never illustrative
 * attached-image values substituted across matchups. */
function nhlComparisonRows(game){
 const doc=state.teamStats.get(teamStatsKey(game));
 if(!doc)return '<div class="gb2-source-note">Retrieving official NHL 2026–27 statistics…</div>';
 if(!doc.available)return '<div class="gb2-source-note">NHL team stats unavailable: '+esc(doc.error||'data source offline')+'</div>';
 const away=teamCode(game.league,game.away?.abbr),home=teamCode(game.league,game.home?.abbr);
 const left=doc.teams?.[away]?.stats||{},right=doc.teams?.[home]?.stats||{};
 const fields=[
  ['Goals Per Game','goalsPerGame','high'],
  ['Shots Per Game','shotsPerGame','high'],
  ['Power Play %','powerPlayPct','high'],
  ['Penalty Kill %','penaltyKillPct','high'],
  ['Goals Against/G','goalsAgainstPerGame','low'],
  ['Shots Allowed/G','shotsAllowedPerGame','low'],
  ['Faceoff %','faceoffPct','high'],
  ['Corsi %','corsiPct','high']
 ];
 const display=(data,key)=>n(data[key])===null?'—':round(data[key],2);
 return '<div class="gb2-comparison-stats gb2-nhl-stats">'+fields.map(([label,key,better])=>row(label,display(left,key),display(right,key),better)).join('')+'</div>'
  +'<p class="gb2-source-note">'+esc(doc.source||'NHL Stats REST')+' · '+esc(doc.teams?.[away]?.games||'—')+' / '+esc(doc.teams?.[home]?.games||'—')+' observed team games. Corsi % is unavailable without a verified shot-attempt source. Lower opponent goals/shots allowed is better.</p>';
}
function comparison(g,d){
 const team=t=>logo(t)+'<b>'+esc(t?.abbr||'—')+'</b>';
 return '<section class="gb2-panel gb2-matchup"><header><h3>Matchup Breakdown</h3><div class="gb2-matchup-identities">'+team(g.away)+'<em>@</em>'+team(g.home)+'</div></header>'
 +'<div class="gb2-compare-heading"><span>STAT</span><b>'+esc(g.away?.abbr||'AWAY')+'</b><b>EDGE</b><b>'+esc(g.home?.abbr||'HOME')+'</b></div>'
 +(g.league==='nfl'?referenceComparisonRows(g):g.league==='nhl'?nhlComparisonRows(g):
 row('Season record',g.away?.record||'—',g.home?.record||'—')+
 '<p class="gb2-source-note">Sport-specific official team comparison not yet verified; no sample figures are shown.</p>')
 +'</section>';
}
function hero(g,d){
 const side=(t,ch,away)=>'<div class="gb2-hero-team">'+logo(t)+'<div><small>'+(away?'AWAY':'HOME')+'</small><h2>'+esc(t?.abbr||'—')+'</h2><span>'+esc(t?.name||'')+'</span><em>'+prob(ch)+' win chance</em></div></div>';
 return '<section class="gb2-hero"><small>'+esc(g.league?.toUpperCase())+' · '+esc(status(g))+' · '+esc(d.probSource)+'</small><div class="gb2-hero-teams">'
  +side(g.away,d.chances?.[0],true)+'<div class="gb2-hero-center"><span>SPREAD</span><strong>'+esc(d.favorite?d.favorite.abbr+' '+prettyLine(d.favorite===g.away?d.spreadAway:d.spreadHome):'—')+'</strong><span>TOTAL</span><strong>'+esc(round(d.total,1))+'</strong></div>'+side(g.home,d.chances?.[1],false)
  +'</div><div class="gb2-hero-foot">'+esc(g.venue||'Venue not reported')+' · '+esc(d.spreadSource)+' · '+esc(d.totalSource)+'</div></section>';
}
function dock(ctx){
 const count=ctx.draftKeys?.length||0;
 return '<div><strong>PARLAY PING</strong><span>'+count+' / 25 legs · '+(count?'Your picks stay saved while you compare games.':'Add verified props from a player breakdown.')+'</span></div>'
  +'<button type="button" data-gb2-parlays>OPEN BETSLIP →</button>';
}
function detail(g,ctx){
 const d=info(g,ctx);
 const rows=old.matchedRows(ctx.rows||[],g);
 const intel=window.TSO2Matchup;
 return '<div class="gb2-detail-top"><button type="button" class="gb2-back" data-gb2-back>← ALL GAMES</button>'
  +'<span>'+esc(g.league?.toUpperCase())+' · VERIFIED DATA · '+esc(status(g))+'</span>'
  +'<button type="button" class="gb2-live" data-gb2-live>PLAY BY PLAY & BOX SCORE ↗</button></div>'
  +hero(g,d)+comparison(g,d)
  +'<section class="gb2-panel gb2-props"><div class="gb2-mi-host mi-embedded">'+(intel?intel.listing(g,rows,{showScouting:false}):'<div class="gb2-empty">Verified player props are connecting…</div>')+'</div></section>'
  +'<div class="gb2-footnote">Prop candidates use existing TSO player-market grades and verified over/yes selections; no unders or fabricated recommendations. Open a player for recent form, matchup and opponent context.</div>';
}
function render(ctx){
 const root=document.querySelector('[data-gb2-root]');if(!root)return;
 state.ctx=ctx;
 const games=ctx.games||[];
 if(state.lastFilter!==ctx.league){state.lastFilter=ctx.league;state.openId=null;state.detailSignature='';}
 const grid=root.querySelector('[data-gb2-grid]'),view=root.querySelector('[data-gb2-detail]');
 const current=games.find(g=>String(g.id)===String(state.openId));
 if(state.openId&&!current){state.openId=null;state.detailSignature='';}
 if(!state.openId){
  view.hidden=true;grid.hidden=false;
  const visible=games.filter(g=>g.state!=='post');
  const shown=visible.length?visible:games;
  const markup=!ctx.liveReady?'<div class="gb2-empty">Connecting the live scoreboard…</div>':
   shown.length?shown.map(g=>gameCard(g,ctx)).join(''):'<div class="gb2-empty">No scheduled games for this league right now. Try another sport.</div>';
  if(grid.innerHTML!==markup)grid.innerHTML=markup;
 }else{
  grid.hidden=true;view.hidden=false;
  // Preserve open player analysis across periodic scoreboard and prop refreshes.
  const g=current,d=info(g,ctx),rows=old.matchedRows(ctx.rows||[],g);
  loadMatchupStats(g);
  const sig=JSON.stringify([g.id,g.league,g.startTime,g.away?.abbr,g.home?.abbr,
   g.away?.record,g.home?.record,marketFor(g,ctx),d.model?.generatedAt,
   state.teamStats.get(teamStatsKey(g))?.checkedAt||state.teamStats.get(teamStatsKey(g))?.error||'',
   rows.map(x=>[x.key,x.price,x.line,x.model?.probabilityPct,x.model?.edgePct])]);
  if(sig!==state.detailSignature){
   view.innerHTML=detail(g,ctx);
   state.detailSignature=sig;
   window.TSO2Matchup?.bind?.(view,{game:g,rows,addProp:ctx.addProp,research:ctx.research,history:ctx.history,
    refresh:()=>{state.detailSignature='';render(state.ctx)}});
  }
 }
 const panel=root.querySelector('[data-gb2-dock]');
 if(panel){const markup=dock(ctx);if(panel.innerHTML!==markup)panel.innerHTML=markup;}
 // One root-level delegated listener survives dashboard polling and DOM replacement.
 if(!state.boundRoot||state.boundRoot!==root){
  state.boundRoot=root;
  root.addEventListener('click',event=>{
   const node=event.target?.closest?.('[data-gb2-game],[data-gb2-back],[data-gb2-league],[data-gb2-live],[data-gb2-parlays]');
   if(!node||!root.contains(node)||!state.ctx)return;
   if(node.matches('[data-gb2-game]')){
    state.openId=node.dataset.gb2Game;state.detailSignature='';render(state.ctx);
    root.querySelector('[data-gb2-detail]')?.scrollIntoView?.({block:'start',behavior:'instant'});
   }else if(node.matches('[data-gb2-back]')){
    state.openId=null;state.detailSignature='';render(state.ctx);
    root.querySelector('.gb2-page-head')?.scrollIntoView?.({block:'start',behavior:'instant'});
   }else if(node.matches('[data-gb2-league]')){
    state.openId=null;state.detailSignature='';state.ctx.selectLeague(node.dataset.gb2League);
   }else if(node.matches('[data-gb2-live]')){
    const g=(state.ctx.games||[]).find(x=>String(x.id)===String(state.openId));
    if(g)state.ctx.openLive(g);
   }else if(node.matches('[data-gb2-parlays]'))state.ctx.navigate('parlays');
  });
 }
 for(const btn of root.querySelectorAll('[data-gb2-league]')){
  btn.classList.toggle('is-active',btn.dataset.gb2League===ctx.league);
  btn.setAttribute('aria-pressed',String(btn.dataset.gb2League===ctx.league));
 }
 // Populate actual booked game lines per league; never mutate active league.
 if(ctx.liveReady){
  const leagues=[...new Set(games.map(g=>g.league))];
  for(const league of leagues){
   if(!ctx.linesBySport?.has(league)&&!state.requested.has(league)){
    state.requested.add(league);
    ctx.ensureLines?.(league);
   }
  }
 }
 if(games.some(g=>g.league==='nfl')&&!state.modelInFlight&&Date.now()-state.modelLoadedAt>180000){
  state.modelInFlight=true;state.modelLoadedAt=Date.now();
  fetch('/api/tso-simulations-nfl',{cache:'no-store',headers:{accept:'application/json'}})
   .then(r=>r.ok?r.json():null).then(doc=>{
    if(doc?.engineVersion==='v89.18.0'&&Array.isArray(doc.games)&&
       doc.games.every(x=>x.availability?.rosterVerified&&!x.availability?.requiresRerun))state.model=doc;
   }).catch(()=>{}).finally(()=>{state.modelInFlight=false;if(state.ctx)render(state.ctx)});
 }
}
old.gamesHTML=html;
old.render=ctx=>ctx.route==='games'?render(ctx):originalRender(ctx);
window.TSO2GamesBoardV2={state,html,render,info};
})();
