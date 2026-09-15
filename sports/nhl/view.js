import {applyLineups,rosterURL,lineupLabel,lineupState,lineupReady} from './lineups.js?v=90.2';
import {quoteFor} from './odds.js?v=90.1';
import {gradeForLean,gradeRingHTML,overProbability} from './grade.js?v=90.4';
import {historicalPropProjection,historicalSourceLabel,propLine} from './props-model.js?v=90.1';
import {renderNhlGamecastHTML} from './gamecast.js?v=90.5';
import {API,getJSON,loadScoreboard,mergeSummary,freshGame,threats,text as esc,imageUrl} from './data.js?v=90.5';
let research=null,odds=null,sim=null;
let doc=null,tab='slate',gameId=null,market='sog',gamecastTab='game',busy=false,error=false,timer=null;
const tabs={slate:'NHL Slate',live:'NHL Live',feed:'Goal Feed',props:'Props'};
const subtitles={
 slate:'Pregame matchup cards, lineup status and one-tap access to the full hockey Gamecast.',
 live:'NFL-style live Gamecast with a functional hockey rink, box score and play-by-play.',
 feed:'A goal stream built to match the NFL touchdown feed, with scorer context and stored pregame goal prices.',
 props:'Ranked hockey player markets with current stats, historical baselines, TSO projections, NFL-parity grades and sportsbook prices.',
};
const markets={atg:'Anytime Goal',sog:'Shots on Goal',points:'Points',assists:'Assists',blocks:'Blocked Shots',saves:'Goalie Saves'};
function ensureStyle(){
 if(document.getElementById('nhl-layout-v904'))return;
 document.getElementById('nhl-layout-v903')?.remove();
 const link=document.createElement('link');link.id='nhl-layout-v904';link.rel='stylesheet';link.href='./sports/nhl/style.css?v=90.4';document.head.appendChild(link);
}
const empty=s=>`<div class="hk-empty"><b>${esc(s)}</b></div>`;
const photo=p=>imageUrl(p?.photo)?`<img src="${esc(p.photo)}" alt="${esc(p.name||'Player')}" loading="lazy" decoding="async">`:'<span class="hk-avatar">🏒</span>';
const teamLogo=t=>imageUrl(t?.logo)?`<img class="hk-team-logo" src="${esc(t.logo)}" alt="${esc(t.name||t.abbr||'Team')}" loading="lazy" decoding="async">`:`<span class="hk-team-logo hk-team-fallback">${esc(t?.abbr||'NHL')}</span>`;
const score=g=>`${esc(g.away.abbr)} ${g.away.score??'—'} · ${esc(g.home.abbr)} ${g.home.score??'—'}`;
const time=g=>g.status==='pre'?new Date(g.startTime).toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):g.detail;
const statusText=g=>g.status==='in'?(freshGame(g)?'Live':'Updating'):g.status==='post'?'Final':'Game Preview';
const periodText=g=>g.status==='pre'?'Puck drop':g.status==='post'?'Final':g.detail||`Period ${g.period||'—'}`;
const priceFmt=v=>v==null?'—':Number(v)>0?'+'+Number(v):String(v);
export function selectTab(next){if(!tabs[next])return;tab=next;window.DW_nhlTab=tab;render();window.renderSidebarSports?.();}
function headerHTML(){
 const updated=error?'Waiting for fresh hockey data':doc?`Updated ${new Date(doc.generatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:'Loading hockey…';
 return `<header class="hk-head"><div><div class="hk-kicker"><span>🏒</span>NHL${doc?.season?' · '+esc(doc.season):''}</div><h2>${esc(tabs[tab])}</h2><p>${esc(subtitles[tab])}</p></div><div class="hk-head-actions"><span class="hk-date-chip">${doc?.date?esc(doc.date)+' slate':'NHL'}</span><span>${esc(updated)}</span></div></header>`;
}
function lineupStateClass(g){const s=lineupState(g);return s==='confirmed'?'ready':s==='pending'?'pending':'waiting';}
function gameCards(games){return games.map(g=>`<article class="hk-matchup ${g.status==='in'?'is-live':g.status==='post'?'is-final':'is-pre'}" data-hk-game="${esc(g.id)}" tabindex="0" role="button" aria-label="Open ${esc(g.away.name)} at ${esc(g.home.name)} hockey Gamecast">
 <div class="hk-match-status"><span class="hk-status-pill">${esc(statusText(g))}</span><span>${g.seasonType===1?'Preseason · ':''}${esc(time(g))}</span></div>
 <div class="hk-scorebar">
   <div class="hk-team away">${teamLogo(g.away)}<div class="hk-team-copy"><small>${esc(g.away.abbr)}</small><b>${esc(g.away.name)}</b></div><strong>${g.status==='pre'?'—':esc(g.away.score??'—')}</strong></div>
   <div class="hk-game-center"><b>${esc(periodText(g))}</b><span>${g.status==='pre'?'Matchup preview':freshGame(g)?'Live game data':'Waiting for fresh game data'}</span></div>
   <div class="hk-team home"><strong>${g.status==='pre'?'—':esc(g.home.score??'—')}</strong><div class="hk-team-copy"><small>${esc(g.home.abbr)}</small><b>${esc(g.home.name)}</b></div>${teamLogo(g.home)}</div>
 </div>
 <div class="hk-match-body"><div><span>Venue</span><b>${esc(g.venue||'Venue TBD')}</b></div><div><span>Lineup</span><b class="${lineupStateClass(g)}">${esc(lineupLabel(g))}</b></div><div><span>Goal Feed</span><b>${g.goals?.length||0} reported</b></div></div>
 <div class="hk-match-footer"><span>${g.status==='in'&&!freshGame(g)?'Refreshing live state…':g.status==='post'?'Open final Gamecast':'Open Gamecast'}</span><button type="button" data-hk-game="${esc(g.id)}">${g.status==='in'?'Watch Live':'Open →'}</button></div>
 </article>`).join('');}
function atgPrice(g,scorer){
 if(!scorer?.id)return '<div class="hk-feed-price pending"><span>Pregame ATG</span><b>Odds pending</b></div>';
 const q=quoteFor(odds,g.id,scorer.id,'atg');
 if(!q)return '<div class="hk-feed-price pending"><span>Pregame ATG</span><b>Odds pending</b></div>';
 return `<div class="hk-feed-price"><span>Pregame ATG</span><b>${esc(priceFmt(q.over))}</b><em>${esc(q.book||'Sportsbook')}</em></div>`;
}
function goals(){
 const rows=(doc?.games||[]).flatMap(g=>(g.goals||[]).map(p=>({g,p}))).sort((a,b)=>Date.parse(b.p.timestamp||b.g.startTime)-Date.parse(a.p.timestamp||a.g.startTime));
 if(!rows.length){const liveNow=(doc?.games||[]).some(g=>g.status==='in');return `<div class="hk-feed">${empty(liveNow?'No goals yet. The first reported goal will appear here automatically.':'Goal Feed is standing by. Live scoring plays will populate here once an NHL game begins.')}</div>`;}
 return `<div class="hk-feed">${rows.map(({g,p})=>`<article class="hk-feed-card"><div class="hk-feed-time">P${esc(p.period||'?')}<br>${esc(p.clock||'')}</div><div class="hk-feed-photo">${photo(p.scorer)}</div><div class="hk-feed-main"><div class="hk-feed-name"><b>${esc(p.scorer?.name||'Goal')}</b><span>${esc(p.team||'NHL')} · GOAL${p.strength?` · ${esc(p.strength)}`:''}</span></div><p>${esc(p.text||'Goal')}</p><div class="hk-feed-score">${score({...g,away:{...g.away,score:p.awayScore},home:{...g.home,score:p.homeScore}})}</div></div><div class="hk-feed-prices">${atgPrice(g,p.scorer)}</div></article>`).join('')}</div>`;
}
function simulationMetric(p){
 const game=sim?.games?.find(g=>g.gameId===p.game.id);
 if(!game?.ready||!Number.isFinite(Date.parse(game.generatedAt))||Date.now()-Date.parse(game.generatedAt)>120000||Date.parse(game.generatedAt)>Date.now()+60000)return null;
 const g=p.game;if(game.state!==lineupState(g)||!lineupReady(g))return null;
 const metric=game.players?.find(x=>x.id===p.id)?.metrics?.[market==='atg'?'goals':market];
 return metric?{game,metric}:null;
}
function projectionState(p){
 const simulated=simulationMetric(p);
 if(simulated)return {...simulated,source:'simulation',historical:null};
 const historical=historicalPropProjection(research?.players?.[p.id],market,research?.currentSeason);
 return historical?{game:null,metric:historical.metric,source:'historical',historical}:null;
}
function forecast(p,state=projectionState(p)){
 if(!state)return '';
 const {game,metric}=state;
 if(state.source==='simulation')return `${market==='atg'?'Goal chance '+(metric.atLeastOne*100).toFixed(1)+'% · ':''}Mean ${metric.mean.toFixed(2)} · Median ${metric.median} · ${game.iterations.toLocaleString()} sims`;
 const source=historicalSourceLabel(state.historical);
 return market==='atg'?`Baseline goal chance ${(metric.atLeastOne*100).toFixed(1)}% · ${source}`:`Historical model · Mean ${metric.mean.toFixed(2)} · Median ${metric.median} · ${source}`;
}
function baseline(p){const history=research?.players?.[p.id];const key=market==='atg'?'goals':market;const rate=history?.rates?.[key];return rate==null?'Season baseline pending':`${history.season-1}–${String(history.season).slice(-2)} avg ${Number(rate).toFixed(2)}/game (${history.games} GP)`;}
function priceText(p,q=quoteFor(odds,p.game.id,p.id,market)){
 if(p.game.status==='post')return 'Market closed';
 if(q)return `${q.book} · ${market==='atg'?'Goal':q.line} · ${market==='atg'?'Yes':'O'} ${priceFmt(q.over)} / ${market==='atg'?'No':'U'} ${priceFmt(q.under)}`;
 const picked=propLine(market,null),label=market==='atg'?'Goal 0.5':`O ${picked.line}`;
 if(!Number.isFinite(picked.line))return p.game.status==='in'?'Live odds pending':'Odds pending';
 return `TSO reference ${label} · ${p.game.status==='in'?'live sportsbook odds pending':'sportsbook odds pending'}`;
}
function gradeState(p,state=projectionState(p)){
 const q=quoteFor(odds,p.game.id,p.id,market),picked=propLine(market,q);
 const probability=state&&Number.isFinite(picked.line)?overProbability(state.metric,picked.line):null;
 return {probability,grade:gradeForLean(probability),q,line:picked.line,referenceLine:picked.reference,source:state?.source||null,historical:state?.historical||null,game:state?.game||null};
}
function props(){
 const ps=(doc?.games||[]).flatMap(g=>g.players.map(p=>({...p,game:g}))).filter(p=>market==='saves'?p.position==='G':p.position!=='G');
 const ranked=ps.map(p=>{const state=projectionState(p);return {p,state,grade:gradeState(p,state)};}).sort((a,b)=>(b.grade.probability??-1)-(a.grade.probability??-1));
 return `<div class="hk-prop-toolbar"><label>Player market<select id="hk-market">${Object.entries(markets).map(([k,v])=>`<option value="${k}" ${k===market?'selected':''}>${v}</option>`).join('')}</select></label><div class="hk-prop-note"><b>${ps.length}</b><span>players on this slate</span></div></div><div class="hk-list-head"><span>${esc(markets[market])}</span><small>Same NFL grade thresholds + progress rings · confirmed simulations when ready · verified 2025–26 historical fallback · sportsbook lines when listed</small></div><div class="hk-prop-list">${ranked.map(({p,state,grade},i)=>{
 const key=market==='atg'?'goals':market,model=forecast(p,state),book=priceText(p,grade.q);
 const ring=gradeRingHTML(grade.probability,grade.grade,'lg');
 let gradeNote='Historical baseline pending';
 if(grade.probability!=null){
  const pct=(grade.probability*100).toFixed(grade.probability<.1?1:0)+'%';
  gradeNote=grade.source==='simulation'?`TSO grade · ${pct} model hit · ${grade.game.iterations.toLocaleString()} sims${grade.referenceLine?' · TSO reference line':''}`:`TSO grade · ${pct} model hit · ${historicalSourceLabel(grade.historical)} · ${grade.referenceLine?'TSO reference line':'sportsbook line'}`;
 }
 return `<article class="hk-prop-card"><div class="hk-prop-rank">${i+1}</div><div class="hk-prop-avatar">${photo(p)}</div><div class="hk-prop-main"><div class="hk-prop-name"><b>${esc(p.name)}</b><span>${esc(p.team)} · ${esc(p.position)}</span></div><div class="hk-prop-match">${esc(p.game.away.abbr)} @ ${esc(p.game.home.abbr)} · ${esc(p.availability||'Status pending')}</div><div class="hk-prop-detail"><span>CURRENT<b>${esc(p.current?.[key]??'—')}</b></span><span>BASELINE<b>${esc(baseline(p))}</b></span><span>LINEUP<b>${esc(lineupLabel(p.game))}</b></span></div></div><div class="hk-prop-market"><span>${esc(markets[market])}</span><strong>${model?esc(model):'Projection pending'}</strong><small>${esc(book)}</small></div><div class="hk-prop-grade">${ring}<small>${esc(gradeNote)}</small></div></article>`;
 }).join('')||empty('Player rosters are not available yet.')}</div>`;
}
function scorebar(g){return `<div class="hk-live-scorebar"><div class="hk-live-team">${teamLogo(g.away)}<div><small>${esc(g.away.abbr)}</small><b>${esc(g.away.name)}</b></div><strong>${esc(g.away.score??'—')}</strong></div><div class="hk-live-center"><span>${esc(statusText(g))}</span><b>${esc(periodText(g))}</b><small>${esc(lineupLabel(g))}</small></div><div class="hk-live-team home"><strong>${esc(g.home.score??'—')}</strong><div><small>${esc(g.home.abbr)}</small><b>${esc(g.home.name)}</b></div>${teamLogo(g.home)}</div></div>`;}
function gamecastPlays(g){return g.summaryUnavailable?empty('Play-by-play is temporarily unavailable.'):g.plays.map(p=>`<div class="hk-play"><small>${p.type?esc(p.type)+' · ':''}P${esc(p.period||'?')} · ${esc(p.clock)}</small><p>${esc(p.text)}</p></div>`).join('')||empty(g.status==='pre'?'Play-by-play begins at puck drop.':'Waiting for the first reported play.');}
function gamecastBox(g){return `<div class="hk-gc-box"><div class="hk-table"><table><thead><tr><th>Player</th><th>G</th><th>A</th><th>SOG</th><th>BLK</th><th>SV</th><th>TOI</th></tr></thead><tbody>${g.players.map(p=>`<tr><th>${esc(p.name)} <small>${esc(p.team)}</small></th>${['goals','assists','sog','blocks','saves','toi'].map(k=>`<td>${esc(p.current?.[k]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${g.players.length?'':empty(g.status==='pre'?'Box score opens at puck drop.':'Player box score is not available yet.')}</div>`;}
function live(){
 const games=doc?.games||[],g=games.find(g=>g.id===gameId)||games.find(g=>g.status==='in')||games[0];if(!g)return empty('No NHL games are scheduled for this slate.');
 const body=gamecastTab==='box'?gamecastBox(g):gamecastTab==='pbp'?`<div class="hk-gc-list">${gamecastPlays(g)}</div>`:renderNhlGamecastHTML(g);
 return `<div class="hk-live-toolbar"><label>Game<select id="hk-game">${games.map(x=>`<option value="${esc(x.id)}" ${x.id===g.id?'selected':''}>${esc(x.away.abbr)} @ ${esc(x.home.abbr)}</option>`).join('')}</select></label><span>${g.status==='in'&&freshGame(g)?'● LIVE · auto-refreshing':esc(time(g))}</span></div>${scorebar(g)}<div class="hk-gc-tabs" role="tablist" aria-label="Hockey Gamecast views"><button type="button" class="hk-gc-tab ${gamecastTab==='game'?'active':''}" data-hk-gc-tab="game">Game</button><button type="button" class="hk-gc-tab ${gamecastTab==='box'?'active':''}" data-hk-gc-tab="box">Box Score</button><button type="button" class="hk-gc-tab ${gamecastTab==='pbp'?'active':''}" data-hk-gc-tab="pbp">Play-by-Play</button></div><div class="hk-gc-body">${body}</div>`;
}
export function commandCenterHTML(){const games=doc?.games||[],liveGames=games.filter(g=>freshGame(g)),alerts=threats(doc);return `<div class="cc-col-title">Hockey</div><div class="cc-kpi-row"><div class="cc-kpi-tile"><b>${liveGames.length}</b><span>Live Now</span></div><div class="cc-kpi-tile"><b>${games.some(g=>g.summaryUnavailable)?'—':games.reduce((n,g)=>n+(g.goals?.length||0),0)}</b><span>Goals</span></div><div class="cc-kpi-tile"><b>${alerts.length}</b><span>Threat Alerts</span></div></div><div class="cc-section"><div class="cc-section-label">Threat Alerts</div>${alerts.map(a=>`<button class="cc-alert-row hk-alert" data-hk-game="${esc(a.gameId)}"><span class="cc-alert-text">${esc(a.title)}<small>${esc(a.detail)}</small></span><span class="cc-alert-time">WATCH →</span></button>`).join('')||empty(error?'Waiting for fresh hockey data.':liveGames.length?'No active threats right now.':'No live NHL games right now. Power-play, shot and hat-trick watches appear during games.')}</div>`;}
function contentHTML(){if(!doc)return empty('Connecting to the NHL feed…');if(tab==='slate')return `<div class="hk-matchup-slate">${gameCards(doc.games)}</div>${doc.games.length?'':empty('No games are scheduled for this slate.')}`;if(tab==='feed')return goals();if(tab==='props')return props();return live();}
function render(){ensureStyle();const host=document.getElementById('nhlView');if(host){host.innerHTML=`${headerHTML()}<div class="hk-content">${contentHTML()}</div><footer class="hk-footer"><b>NHL data:</b> ESPN. Shootout attempts are excluded from the Goal Feed and player goal totals.</footer>`;}
 const cc=document.getElementById('ccHockeyCol');if(cc?.classList.contains('active'))cc.innerHTML=commandCenterHTML();window.refreshCommandCenterAlertState?.();}
export async function refresh(){if(busy||document.hidden)return;busy=true;try{
 const [next,r,o,s]=await Promise.all([loadScoreboard(),getJSON('./slates/nhl-research.json').catch(()=>null),getJSON('./slates/nhl-odds.json').catch(()=>null),getJSON('./slates/nhl-sim.json').catch(()=>null)]);if(r)research=r;if(o)odds=o;if(s)sim=s;
 for(const g of next.games){const prior=doc?.games?.find(x=>x.id===g.id);g.players=prior?.players||[];
  if(['in','post'].includes(g.status)){try{Object.assign(g,mergeSummary(g,await getJSON(`${API}/summary?event=${g.id}`)));}catch{g.summaryUnavailable=true;}}
  const evidence={};
  if(g.status!=='pre'||Date.parse(g.startTime)-Date.now()<10800000)await Promise.all([g.away,g.home].map(async t=>{try{evidence[t.id]=await getJSON(rosterURL(g,t));}catch{}}));
  Object.assign(g,applyLineups(g,evidence));
 }
 doc=next;error=false;
 }catch{error=true;}finally{busy=false;render();}}
export async function mount(){ensureStyle();if(!doc){try{doc=await getJSON('./slates/nhl.json');}catch{error=true;}}selectTab(window.DW_nhlPendingTab||tab);window.DW_nhlPendingTab=null;render();if(!timer){refresh();timer=setInterval(()=>{if(location.hash==='#nhl'||document.getElementById('ccHockeyCol')?.classList.contains('active'))refresh();},30000);}}
window.DW_NHL_COMMAND_CENTER={html:commandCenterHTML,alerts:()=>threats(doc),refresh:()=>mount()};
window.DW_openNhlTab=next=>{window.DW_nhlPendingTab=next;if(location.hash!=='#nhl')location.hash='nhl';else selectTab(next);};
document.addEventListener('click',e=>{const gc=e.target.closest('[data-hk-gc-tab]');if(gc){gamecastTab=gc.dataset.hkGcTab;render();return;}const b=e.target.closest('[data-hk-game]');if(!b)return;gameId=b.dataset.hkGame;gamecastTab='game';window.closeCommandCenter?.();window.DW_openNhlTab('live');});
document.addEventListener('keydown',e=>{const b=e.target.closest?.('[data-hk-game]');if(!b||!['Enter',' '].includes(e.key))return;e.preventDefault();gameId=b.dataset.hkGame;gamecastTab='game';window.DW_openNhlTab('live');});
document.addEventListener('change',e=>{if(e.target.id==='hk-market'){market=e.target.value;render();}if(e.target.id==='hk-game'){gameId=e.target.value;gamecastTab='game';render();}});
