
import {buildNbaProjection,marketFairOver,nbaModelPlayer} from './model-v202.js?v=2.4-injury-preseason';

const ESPN_SCOREBOARD='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const ESPN_SUMMARY='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary';
const ESPN_TEAMS='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams';
const ODDS_URL='./slates/nba-odds.json';
const RESEARCH_URL='./slates/nba-research.json';
const CSS_ID='tso-nba-v201-css';
const REFRESH_MS=30000;
const ODDS_REFRESH_MS=120000;
const RESEARCH_REFRESH_MS=300000;

const state={
  events:[],
  slateDate:'',
  selectedId:'',
  summary:null,
  page:'slate',
  gameView:'gamecast',
  loading:false,
  refreshedAt:null,
  odds:null,
  oddsAt:0,
  research:null,
  researchAt:0,
  propMarket:'points',
  propQuery:'',
  teamDirectory:null,
  rosterCache:new Map(),
  playerDirectory:new Map(),
  identity:new Map(),
  hydration:null,
  poll:null,
  mounted:false
};

const MARKET_LABELS={
  points:'Points',rebounds:'Rebounds',assists:'Assists',pra:'PRA',threes:'3-Pointers'
};
const LINE_BOUNDS={
  points:[5.5,69.5],rebounds:[1.5,29.5],assists:[1.5,24.5],pra:[10.5,99.5],threes:[0.5,14.5]
};

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const finite=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const fmt=v=>Number.isFinite(Number(v))?String(Number(v)):'—';
const initials=v=>String(v||'NBA').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
const rootEl=()=>document.getElementById('nbaView');
const isActive=()=>String(location.hash||'').replace(/^#/,'').toLowerCase()==='nba';

function ensureCss(){
  if(document.getElementById(CSS_ID))return;
  const link=document.createElement('link');
  link.id=CSS_ID;
  link.rel='stylesheet';
  link.href=new URL('./view-v201.css?v=2.5-intelligence',import.meta.url).href;
  document.head.appendChild(link);
}

async function fetchJson(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw new Error(`NBA data request failed (${r.status})`);
  return r.json();
}

function statusInfo(event){
  const st=event?.status?.type||{};
  const comp=event?.competitions?.[0]||{};
  return {
    state:st.state||'pre',
    completed:!!st.completed,
    live:st.state==='in',
    label:st.shortDetail||st.detail||comp.status?.type?.shortDetail||'Scheduled'
  };
}

function teamsFor(event){
  const comp=event?.competitions?.[0]||{};
  const list=Array.isArray(comp.competitors)?comp.competitors:[];
  const away=list.find(x=>x.homeAway==='away')||list[0]||{};
  const home=list.find(x=>x.homeAway==='home')||list[1]||{};
  const map=c=>({
    id:String(c?.id||c?.team?.id||''),
    name:c?.team?.displayName||c?.team?.shortDisplayName||c?.team?.name||'Team',
    short:c?.team?.shortDisplayName||c?.team?.name||'Team',
    abbr:c?.team?.abbreviation||'NBA',
    logo:c?.team?.logo||c?.team?.logos?.[0]?.href||'',
    score:c?.score??'0',
    record:c?.records?.[0]?.summary||''
  });
  return {away:map(away),home:map(home)};
}

function gameLabel(event){
  const s=statusInfo(event);
  if(s.live)return s.label||'LIVE';
  if(s.completed)return 'FINAL';
  const date=new Date(event?.date||Date.now());
  return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}

function gameDateLabel(key){
  if(!key||key.length!==8)return 'NBA Slate';
  const d=new Date(Number(key.slice(0,4)),Number(key.slice(4,6))-1,Number(key.slice(6,8)));
  return d.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
}

function gameCard(event){
  const t=teamsFor(event),s=statusInfo(event),active=String(event?.id)===String(state.selectedId);
  return `<button type="button" class="nba3-game${s.live?' live':''}${active?' active':''}" data-nba-game="${esc(event?.id)}">
    <div class="nba3-game-top"><span>${s.live?'● LIVE':esc(gameLabel(event))}</span><span>${esc(event?.competitions?.[0]?.broadcasts?.[0]?.names?.[0]||'NBA')}</span></div>
    <div class="nba3-mini-team"><img src="${esc(t.away.logo)}" alt=""><b>${esc(t.away.short)}</b><strong>${esc(t.away.score)}</strong></div>
    <div class="nba3-mini-team"><img src="${esc(t.home.logo)}" alt=""><b>${esc(t.home.short)}</b><strong>${esc(t.home.score)}</strong></div>
  </button>`;
}

function statMap(labels,stats){
  const out={};
  (labels||[]).forEach((label,i)=>{out[String(label||'').toUpperCase()]=stats?.[i]??'';});
  return out;
}

function playerRows(summary){
  const groups=summary?.boxscore?.players;
  if(!Array.isArray(groups))return [];
  const rows=[];
  for(const teamGroup of groups){
    const team=teamGroup?.team||{};
    const blocks=Array.isArray(teamGroup?.statistics)?teamGroup.statistics:[];
    const block=blocks.find(b=>Array.isArray(b?.athletes)&&b.athletes.length)||blocks[0];
    if(!block)continue;
    const labels=block.labels||block.names||[];
    for(const row of block.athletes||[]){
      if(row?.didNotPlay)continue;
      const athlete=row?.athlete||{};
      const m=statMap(labels,row?.stats||[]);
      const pts=num(m.PTS??m.POINTS),reb=num(m.REB??m.REBOUNDS),ast=num(m.AST??m.ASSISTS);
      const min=m.MIN??m.MINUTES??'';
      const hasGameStats=pts>0||reb>0||ast>0||(String(min).trim()!==''&&String(min)!=='0');
      rows.push({
        id:String(athlete.id||''),teamId:String(team.id||''),teamAbbr:team.abbreviation||'NBA',
        teamName:team.displayName||team.name||'Team',teamLogo:team.logo||team.logos?.[0]?.href||'',
        name:athlete.displayName||athlete.fullName||'Player',headshot:athlete.headshot?.href||athlete.headshot||'',
        position:athlete.position?.abbreviation||row?.position?.abbreviation||'',min,
        fg:m.FG??m['FGM-A']??'—',three:m['3PT']??m['3PM-A']??'—',ft:m.FT??m['FTM-A']??'—',
        pts,reb,ast,hasGameStats,hotScore:pts+(reb*1.15)+(ast*1.35)
      });
    }
  }
  return rows;
}

function hotPlayer(summary){
  const rows=playerRows(summary).filter(p=>p.hasGameStats);
  if(!rows.length)return null;
  rows.sort((a,b)=>b.hotScore-a.hotScore||b.pts-a.pts||b.ast-a.ast||b.reb-a.reb);
  return rows[0];
}

function selectedEvent(){
  return state.events.find(e=>String(e?.id)===String(state.selectedId))||state.events[0]||null;
}

function scoreCard(event){
  if(!event)return '<div class="nba3-card nba3-loading">Choose a game to open NBA Gamecast.</div>';
  const t=teamsFor(event),s=statusInfo(event);
  return `<section class="nba3-card nba3-score">
    <div class="nba3-team">
      <img src="${esc(t.away.logo)}" alt="${esc(t.away.short)}">
      <div class="nba3-team-copy"><b>${esc(t.away.short)}</b><span>${esc(t.away.record||'')}</span></div>
      <div class="nba3-team-score">${esc(t.away.score)}</div>
    </div>
    <div class="nba3-score-mid"><strong>${esc(s.live?'LIVE':s.completed?'FINAL':gameLabel(event))}</strong><span>${esc(s.label||'')}</span></div>
    <div class="nba3-team home">
      <div class="nba3-team-score">${esc(t.home.score)}</div>
      <div class="nba3-team-copy"><b>${esc(t.home.short)}</b><span>${esc(t.home.record||'')}</span></div>
      <img src="${esc(t.home.logo)}" alt="${esc(t.home.short)}">
    </div>
  </section>`;
}

function watchCard(){
  const p=hotPlayer(state.summary);
  if(!p)return `<section class="nba3-card nba3-watch">
    <div class="nba3-watch-head"><span>✦ Player to Watch</span><span class="nba3-watch-hot">GAME STATS</span></div>
    <div class="nba3-empty-watch">The Player to Watch appears from the actual game box score once live player stats are available. No projected or season stats are substituted here.</div>
  </section>`;
  const photo=p.headshot?`<img src="${esc(p.headshot)}" alt="${esc(p.name)}">`:esc(initials(p.name));
  return `<section class="nba3-card nba3-watch">
    <div class="nba3-watch-head"><span>✦ Player to Watch</span><span class="nba3-watch-hot"><i></i> HOT</span></div>
    <div class="nba3-player"><div class="nba3-player-photo">${photo}</div><div class="nba3-player-copy"><b>${esc(p.name)}</b><span>${esc([p.teamAbbr,p.position].filter(Boolean).join(' · '))} · this game only</span></div></div>
    <div class="nba3-watch-stats"><div class="nba3-watch-stat"><b>${fmt(p.pts)}</b><span>PTS</span></div><div class="nba3-watch-stat"><b>${fmt(p.reb)}</b><span>REB</span></div><div class="nba3-watch-stat"><b>${fmt(p.ast)}</b><span>AST</span></div></div>
  </section>`;
}

function plays(){
  const p=state.summary?.plays;
  return Array.isArray(p)?p:[];
}

function playRows(limit=null){
  let list=plays().slice();
  if(limit)list=list.slice(-limit);
  list.reverse();
  if(!list.length)return '<div class="nba3-empty">Play-by-play will populate when the game starts.</div>';
  return list.map(p=>{
    const period=p?.period?.number||p?.period||'',clock=p?.clock?.displayValue||p?.clock||'';
    const score=p?.awayScore!=null&&p?.homeScore!=null?`${p.awayScore}-${p.homeScore}`:'';
    return `<div class="nba3-play${p?.scoringPlay?' scoring':''}"><div class="nba3-play-time">${esc([period?`Q${period}`:'',clock].filter(Boolean).join(' '))}</div><div class="nba3-play-text">${esc(p?.text||p?.shortText||'Play update')}</div>${score?`<div class="nba3-play-badge">${esc(score)}</div>`:''}</div>`;
  }).join('');
}

function lastPlay(){
  const p=plays().at(-1);
  return p?.text||p?.shortText||'Live play-by-play will appear here.';
}

function court(event){
  const s=statusInfo(event||{});
  return `<div class="nba3-court" aria-hidden="true"><div class="nba3-court-line"></div><div class="nba3-key left"></div><div class="nba3-key right"></div><div class="nba3-arc left"></div><div class="nba3-arc right"></div><div class="nba3-hoop left"></div><div class="nba3-hoop right"></div><div class="nba3-court-overlay"><b>${esc(s.live?s.label:s.completed?'Final':'Pregame')}</b><span>${esc(lastPlay())}</span></div></div>`;
}

function gamecastView(event){
  return `<div class="nba3-topgrid">${scoreCard(event)}${watchCard()}</div>${court(event)}<section class="nba3-card nba3-section"><div class="nba3-section-head"><span>Live Play-by-Play</span><small>Full-width game feed</small></div><div class="nba3-pbp">${playRows(14)}</div></section>`;
}

function groupedPlayers(){
  const rows=playerRows(state.summary),out=new Map();
  for(const p of rows){
    const key=p.teamId||p.teamAbbr;
    if(!out.has(key))out.set(key,{teamId:key,teamName:p.teamName,teamAbbr:p.teamAbbr,teamLogo:p.teamLogo,players:[]});
    out.get(key).players.push(p);
  }
  return [...out.values()];
}

function boxView(){
  const groups=groupedPlayers();
  if(!groups.length)return '<div class="nba3-empty">Box score data is not available yet.</div>';
  return groups.map(g=>`<section class="nba3-card nba3-box-team"><div class="nba3-box-team-head">${g.teamLogo?`<img src="${esc(g.teamLogo)}" alt="">`:''}<span>${esc(g.teamName)}</span></div><div class="nba3-tablewrap"><table class="nba3-table"><thead><tr><th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>3PT</th><th>FT</th></tr></thead><tbody>${g.players.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.min||'—')}</td><td>${fmt(p.pts)}</td><td>${fmt(p.reb)}</td><td>${fmt(p.ast)}</td><td>${esc(p.fg)}</td><td>${esc(p.three)}</td><td>${esc(p.ft)}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
}

function pbpView(){
  return `<section class="nba3-card"><div class="nba3-section-head"><span>Play-by-Play</span><small>Newest play first</small></div><div class="nba3-pbp">${playRows()}</div></section>`;
}

function liveHTML(){
  return `<div class="nba3-rail-shell"><div class="nba3-rail-label"><span>NBA Games</span><span>${esc(gameDateLabel(state.slateDate))}</span></div><div class="nba3-rail">${state.events.length?state.events.map(gameCard).join(''):'<div class="nba3-empty">No NBA games found for this slate.</div>'}</div></div>
  <div class="nba3-card"><div class="nba3-tabs"><button type="button" class="nba3-tab ${state.gameView==='gamecast'?'active':''}" data-nba-gameview="gamecast">Gamecast</button><button type="button" class="nba3-tab ${state.gameView==='box'?'active':''}" data-nba-gameview="box">Box Score</button><button type="button" class="nba3-tab ${state.gameView==='plays'?'active':''}" data-nba-gameview="plays">Play by Play</button></div><div class="nba3-body">${state.loading?'<div class="nba3-loading">Loading live NBA game data…</div>':liveBodyHTML()}</div></div>`;
}

function liveBodyHTML(){
  const event=selectedEvent();
  if(!event)return '<div class="nba3-empty">No NBA game is available for this slate.</div>';
  return state.gameView==='box'?boxView():state.gameView==='plays'?pbpView():gamecastView(event);
}

function slateGameHTML(event){
  const t=teamsFor(event),s=statusInfo(event);
  return `<article class="nba3-card nba3-game-card"><div class="nba3-game-status"><span class="${s.live?'live':''}">${esc(s.live?'● LIVE':s.completed?'FINAL':gameLabel(event))}</span><span>${esc(event?.competitions?.[0]?.venue?.fullName||'NBA')}</span></div>
  <div class="nba3-game-score">
    <div class="nba3-slate-team"><img src="${esc(t.away.logo)}" alt=""><div><b>${esc(t.away.short)}</b><small>${esc(t.away.record||'')}</small></div><strong>${s.state==='pre'?'—':esc(t.away.score)}</strong></div>
    <div class="nba3-game-mid"><b>${esc(s.label)}</b><span>${esc(event?.competitions?.[0]?.broadcasts?.[0]?.names?.[0]||'')}</span></div>
    <div class="nba3-slate-team home"><strong>${s.state==='pre'?'—':esc(t.home.score)}</strong><div><b>${esc(t.home.short)}</b><small>${esc(t.home.record||'')}</small></div><img src="${esc(t.home.logo)}" alt=""></div>
  </div>
  <div class="nba3-game-actions"><button type="button" class="primary" data-nba-open-live="${esc(event.id)}">${s.live?'Watch Live':'Open Gamecast'}</button></div></article>`;
}

function slateHTML(){
  return `<section class="nba3-card nba3-slatebar"><div><b>${esc(gameDateLabel(state.slateDate))}</b><span>${state.events.length} game${state.events.length===1?'':'s'} on the next available NBA slate</span></div><div class="nba3-model-badge"><b>ESPN GAME DATA</b><span>scores · teams · game state</span></div></section>
  <div class="nba3-section-title"><h2>NBA Slate</h2><span>Select any matchup to open its live center.</span></div>
  <div class="nba3-slategrid">${state.events.length?state.events.map(slateGameHTML).join(''):'<div class="nba3-card nba3-empty">No NBA games found in the current search window.</div>'}</div>`;
}

function implied(price){
  const p=finite(price);if(p==null||p===0)return null;
  return p>0?100/(p+100):(-p)/((-p)+100);
}
function noVig(over,under){
  const o=implied(over),u=implied(under);
  if(o==null||u==null||o+u<=0)return null;
  return o/(o+u);
}
function american(v){
  const n=finite(v);return n==null?'—':n>0?`+${n}`:String(n);
}
function validPropRow(r){
  if(!r||!MARKET_LABELS[r.market])return false;
  const line=finite(r.line),bounds=LINE_BOUNDS[r.market];
  if(line==null||!bounds||line<bounds[0]||line>bounds[1])return false;
  const player=String(r.player||'').trim();
  if(!player||player.length<4||/\b(?:alt|team|total|more|less)\b/i.test(player))return false;
  const words=player.match(/[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.'’\-]+/g)||[];
  if(words.length<2)return false;
  return true;
}

function identityKey(row){
  return [norm(row.player),norm(row.homeTeam),norm(row.awayTeam)].join('|');
}

function propIdentityState(row){
  return state.identity.get(identityKey(row))||'unknown';
}

function propGroups(){
  const rows=(state.odds?.rows||[]).filter(validPropRow).filter(r=>propIdentityState(r)!=='mismatch');
  const map=new Map();
  for(const r of rows){
    const key=[norm(r.player),r.market,String(r.line)].join('|');
    if(!map.has(key))map.set(key,{player:r.player,market:r.market,line:Number(r.line),homeTeam:r.homeTeam,awayTeam:r.awayTeam,commenceTime:r.commenceTime,rows:[],identity:propIdentityState(r)});
    map.get(key).rows.push(r);
    if(propIdentityState(r)==='verified')map.get(key).identity='verified';
  }
  const groups=[];
  for(const g of map.values()){
    const fairOver=marketFairOver(g.rows);
    let fallbackOver=fairOver,modelKind='two-sided';
    if(fallbackOver==null){
      const one=g.rows.map(r=>r.overImplied!=null?finite(r.overImplied):implied(r.overPrice)).filter(v=>v!=null);
      if(one.length){fallbackOver=one.reduce((a,b)=>a+b,0)/one.length;modelKind='one-sided';}
    }
    const projection=buildNbaProjection({research:state.research,row:g,market:g.market,line:g.line,fairOverProb:fairOver});
    const overProb=projection?.overProbability??fallbackOver;
    const lean=projection?.lean??(overProb==null?'—':overProb>=.5?'Over':'Under');
    const confidence=projection?.confidence??(overProb==null?null:Math.max(overProb,1-overProb));
    const grade=projection?{letter:projection.grade,cls:projection.gradeTone}:gradeFor(confidence,modelKind);
    const bestOver=[...g.rows].filter(r=>finite(r.overPrice)!=null).sort((a,b)=>Number(b.overPrice)-Number(a.overPrice))[0]||null;
    const bestUnder=[...g.rows].filter(r=>finite(r.underPrice)!=null).sort((a,b)=>Number(b.underPrice)-Number(a.underPrice))[0]||null;
    const chosen=lean==='Under'?bestUnder:bestOver;
    const books=[...new Set(g.rows.map(r=>r.book).filter(Boolean))];
    groups.push({...g,fairOver,overProb,confidence,lean,grade,modelKind:projection?'tso-regression':modelKind,projection,bestOver,bestUnder,chosen,books});
  }
  return groups.sort((a,b)=>{
    const ae=Math.abs(a.projection?.edge??0),be=Math.abs(b.projection?.edge??0);
    return be-ae||(b.confidence??0)-(a.confidence??0)||a.player.localeCompare(b.player);
  });
}

function gradeFor(confidence,kind){
  if(confidence==null)return {letter:'—',cls:'d'};
  if(kind==='one-sided'){
    if(confidence>=.62)return {letter:'B',cls:'b'};
    if(confidence>=.56)return {letter:'C+',cls:'c'};
    return {letter:'C',cls:'c'};
  }
  if(confidence>=.60)return {letter:'A+',cls:'a'};
  if(confidence>=.57)return {letter:'A',cls:'a'};
  if(confidence>=.55)return {letter:'B+',cls:'b'};
  if(confidence>=.53)return {letter:'B',cls:'b'};
  if(confidence>=.51)return {letter:'C',cls:'c'};
  return {letter:'D',cls:'d'};
}

function propPlayerInfo(player){
  return state.playerDirectory.get(norm(player))||null;
}

function matchupLabel(g){
  const base=[g.awayTeam,g.homeTeam].filter(Boolean).join(' @ ');
  if(!base)return 'Matchup not verified';
  return `${base}${g.identity==='verified'?' · roster verified':' · provider event'}`;
}

function propRowHTML(g){
  const researchPlayer=nbaModelPlayer(state.research,g.player),info=propPlayerInfo(g.player),photo=researchPlayer?.headshot||info?.photo;
  const confidence=g.confidence!=null?`${(g.confidence*100).toFixed(1)}%`:'—';
  const projection=g.projection,projectionText=projection?`${projection.projection.toFixed(1)}`:'—';
  const edge=projection?.edge,edgeText=edge==null?'—':`${edge>=0?'+':''}${(edge*100).toFixed(1)} pp`;
  const best=g.chosen,link=g.lean==='Under'?best?.underLink:best?.overLink,price=g.lean==='Under'?best?.underPrice:best?.overPrice;
  const sub=researchPlayer?`${researchPlayer.team} · ${researchPlayer.position||'NBA'}`:(info?.team||matchupLabel(g));
  return `<tr data-nba-prop-player="${esc(g.player)}" data-nba-prop-market="${esc(g.market)}"><td><div class="nba3-prop-player"><div class="nba3-prop-avatar">${photo?`<img src="${esc(photo)}" alt="">`:esc(initials(g.player))}</div><div><b>${esc(g.player)}</b><span>${esc(sub)}</span></div></div></td>
    <td class="nba3-market">${esc(MARKET_LABELS[g.market])}</td><td class="nba3-line">${esc(g.line)}</td><td class="nba3-projection">${esc(projectionText)}<small>${projection?'TSO':'warming'}</small></td>
    <td class="nba3-lean ${g.lean.toLowerCase()}">${esc(g.lean)}</td><td><span class="nba3-grade ${g.grade.cls}">${esc(g.grade.letter)}</span></td>
    <td class="nba3-prob">${esc(confidence)}<small>${projection?'MODEL PROB':g.modelKind==='two-sided'?'NO-VIG':'MARKET FALLBACK'}</small></td><td class="nba3-edge ${edge!=null&&edge>=0?'positive':edge!=null?'negative':''}">${esc(edgeText)}</td>
    <td><div class="nba3-books">${g.books.map(b=>`<span class="nba3-book">${esc(b)}</span>`).join('')}</div></td>
    <td class="nba3-price">${esc(american(price))}<small>${best?esc(best.book):'No price'}</small></td>
    <td><div class="nba3-bet">${link?`<a href="${esc(link)}" target="_blank" rel="noopener">Open book</a>`:'<span class="nba3-book">No native link</span>'}</div></td></tr>`;
}

function propsHTML(){
  const all=propGroups(),q=norm(state.propQuery);
  const filtered=all.filter(g=>(state.propMarket==='all'||g.market===state.propMarket)&&(!q||norm(g.player).includes(q)||norm(g.homeTeam).includes(q)||norm(g.awayTeam).includes(q)));
  const withheld=(state.odds?.rows||[]).filter(validPropRow).filter(r=>propIdentityState(r)==='mismatch').length;
  const projected=all.filter(g=>g.projection).length,researchPlayers=Object.keys(state.research?.players||{}).length;
  const modelReady=projected>0;
  return `<section class="nba3-card nba3-props-hero"><div><div class="nba3-kicker">NBA PLAYER PROP TOOL</div><h2>${modelReady?'TSO NBA Regression v1':'Regression Model Warming Up'}</h2><p>${modelReady?'Real ESPN game history now drives the projection: recent production, minutes, usage proxy, venue split, opponent positional allowance, pace, rest and injury context. Sportsbook prices remain a separate comparison layer.':'Exact sportsbook lines remain live while the ESPN history file is building. Until research is available, rows fall back to transparent market consensus rather than invented projections.'}</p></div><div class="nba3-model-badge"><b>${modelReady?'TSO REGRESSION v1':'MARKET FALLBACK'}</b><span>${modelReady?`${researchPlayers} research players · ${projected} modeled lines`:'waiting for nba-research.json'}</span></div></section>
  <section class="nba3-card nba3-prop-toolbar"><input class="nba3-search" id="nbaPropSearch" value="${esc(state.propQuery)}" placeholder="Search player or matchup…"><div class="nba3-market-chips">${[['all','All'],...Object.entries(MARKET_LABELS)].map(([k,v])=>`<button type="button" class="${state.propMarket===k?'active':''}" data-nba-market="${esc(k)}">${esc(v)}</button>`).join('')}</div><div class="nba3-prop-count">${filtered.length} line${filtered.length===1?'':'s'} · ${projected} TSO modeled</div></section>
  <div class="nba3-prop-tablewrap"><table class="nba3-prop-table"><thead><tr><th>Player</th><th>Market</th><th>Line</th><th>TSO Proj</th><th>Lean</th><th>Grade</th><th>Model Prob</th><th>Edge</th><th>Books</th><th>Best Price</th><th>Link</th></tr></thead><tbody>${filtered.length?filtered.map(propRowHTML).join(''):`<tr><td colspan="11"><div class="nba3-empty">No verified player props match this filter right now.</div></td></tr>`}</tbody></table></div>
  <div class="nba3-source-note"><b>Model policy:</b> TSO Regression v1 never uses sportsbook probability as its projection. ESPN completed-game history supplies the player baseline and contextual factors; fair sportsbook probability is used only to calculate the displayed model edge. ${withheld} row${withheld===1?'':'s'} currently fail event-roster verification and remain hidden.</div>`;
}

function renderMain(){
  const host=document.querySelector('#nbaView .nba3-main');
  if(!host)return;
  host.innerHTML=state.page==='props'?propsHTML():state.page==='live'?liveHTML():slateHTML();
}

function renderFresh(){
  const el=document.querySelector('#nbaView .nba3-fresh span');
  if(!el)return;
  el.textContent=state.refreshedAt?`Updated ${state.refreshedAt.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'})}`:'Live data';
}

function navHTML(){
  return `<div class="nba3-nav"><button type="button" class="${state.page==='slate'?'active':''}" data-nba-page="slate">Slate</button><button type="button" class="${state.page==='live'?'active':''}" data-nba-page="live">Live Center</button><button type="button" class="${state.page==='props'?'active':''}" data-nba-page="props">Player Props</button></div>`;
}

function shell(){
  return `<div class="nba3"><div class="nba3-head"><div><div class="nba3-kicker">The Sports Outpost · NBA 2.0</div><h1 class="nba3-title">NBA</h1><div class="nba3-sub">Slate, live Gamecast and player props built from real NBA game data and verified sportsbook snapshots.</div></div><div class="nba3-fresh"><i></i><span>Live data</span></div></div><div class="nba3-navhost">${navHTML()}</div><main class="nba3-main"><div class="nba3-card nba3-loading">Loading NBA 2.0…</div></main></div>`;
}

function refreshNav(){
  const h=document.querySelector('#nbaView .nba3-navhost');
  if(h)h.innerHTML=navHTML();
  window.DW_nbaTab=state.page;
  window.renderSidebarSports?.();
}

async function findSlate(){
  const base=new Date();
  for(let offset=0;offset<22;offset++){
    const d=new Date(base);d.setDate(base.getDate()+offset);
    const key=dateKey(d),data=await fetchJson(`${ESPN_SCOREBOARD}?limit=100&dates=${key}`);
    if(Array.isArray(data?.events)&&data.events.length)return {key,events:data.events};
  }
  return {key:dateKey(base),events:[]};
}

async function loadSummary(id){
  if(!id){state.summary=null;return;}
  state.loading=true;renderMain();
  try{state.summary=await fetchJson(`${ESPN_SUMMARY}?event=${encodeURIComponent(id)}`);}
  catch(error){console.warn('[NBA 2.0] summary unavailable',error);state.summary=null;}
  finally{state.loading=false;state.refreshedAt=new Date();renderMain();renderFresh();}
}

function bestDefault(events){
  return events.find(e=>statusInfo(e).live)||events.find(e=>!statusInfo(e).completed)||events[0]||null;
}

async function loadOdds(force=false){
  if(!force&&state.odds&&Date.now()-state.oddsAt<ODDS_REFRESH_MS)return;
  try{
    state.odds=await fetchJson(`${ODDS_URL}?v=2.1-${Date.now()}`);
    state.oddsAt=Date.now();
    hydratePropPlayers();
  }catch(error){console.warn('[NBA 2.0] sportsbook snapshot unavailable',error);}
}

async function loadResearch(force=false){
  if(!force&&state.research&&Date.now()-state.researchAt<RESEARCH_REFRESH_MS)return;
  try{
    state.research=await fetchJson(`${RESEARCH_URL}?v=2.2-${Date.now()}`);
    state.researchAt=Date.now();
  }catch(error){
    if(!state.research)console.warn('[NBA 2.0] regression research unavailable; market fallback remains active',error);
  }
}

async function refresh({preserveSelection=true}={}){
  try{
    const existing=preserveSelection?String(state.selectedId||''):'';
    const [slate]=await Promise.all([findSlate(),loadOdds(),loadResearch()]);
    state.events=slate.events;state.slateDate=slate.key;
    const chosen=state.events.find(e=>String(e.id)===existing)||bestDefault(state.events);
    state.selectedId=chosen?String(chosen.id):'';
    state.refreshedAt=new Date();
    if(state.page==='live'&&state.selectedId)await loadSummary(state.selectedId);
    else{renderMain();renderFresh();}
  }catch(error){
    console.error('[NBA 2.0] refresh failed',error);
    const host=document.querySelector('#nbaView .nba3-main');
    if(host)host.innerHTML=`<div class="nba3-error"><b>NBA 2.0 could not load.</b><div>${esc(error?.message||error)}</div></div>`;
  }
}

async function chooseGame(id){
  state.selectedId=String(id||'');
  state.page='live';state.gameView='gamecast';refreshNav();renderMain();
  await loadSummary(state.selectedId);
}

async function selectPage(page){
  if(!['slate','live','props'].includes(page))page='slate';
  state.page=page;window.DW_nbaPendingTab=null;refreshNav();renderMain();
  if(page==='live'&&state.selectedId&&!state.summary)await loadSummary(state.selectedId);
  if(page==='props'){await Promise.all([loadOdds(),loadResearch()]);renderMain();}
}

function parseTeamDirectory(doc){
  const arr=doc?.sports?.[0]?.leagues?.[0]?.teams||doc?.teams||[];
  const map=new Map();
  for(const entry of arr){
    const t=entry?.team||entry;
    if(!t)continue;
    const rec={id:String(t.id||''),name:t.displayName||t.name||'',abbr:t.abbreviation||'',logo:t.logos?.[0]?.href||t.logo||''};
    for(const k of [rec.name,rec.abbr,t.shortDisplayName,t.location&&t.name?`${t.location} ${t.name}`:''])if(k)map.set(norm(k),rec);
  }
  return map;
}

async function ensureTeamDirectory(){
  if(state.teamDirectory)return state.teamDirectory;
  try{state.teamDirectory=parseTeamDirectory(await fetchJson(`${ESPN_TEAMS}?limit=50`));}
  catch{state.teamDirectory=new Map();}
  return state.teamDirectory;
}

function rosterAthletes(doc){
  const groups=[];
  if(Array.isArray(doc?.athletes))groups.push(...doc.athletes);
  if(Array.isArray(doc?.team?.athletes))groups.push(...doc.team.athletes);
  if(Array.isArray(doc?.items))groups.push(...doc.items);
  return groups.flatMap(x=>Array.isArray(x?.items)?x.items:[x]).filter(Boolean);
}

async function rosterForTeam(teamName){
  const key=norm(teamName);
  if(state.rosterCache.has(key))return state.rosterCache.get(key);
  const dir=await ensureTeamDirectory(),team=dir.get(key);
  if(!team?.id){state.rosterCache.set(key,null);return null;}
  try{
    const doc=await fetchJson(`${ESPN_TEAMS}/${encodeURIComponent(team.id)}/roster`);
    const map=new Map();
    for(const a of rosterAthletes(doc)){
      const p=a?.athlete||a;
      const name=p.displayName||p.fullName||a.displayName||a.fullName;
      if(!name)continue;
      map.set(norm(name),{id:String(p.id||''),name,team:team.name||teamName,abbr:team.abbr,photo:p.headshot?.href||p.headshot||'',position:p.position?.abbreviation||a.position?.abbreviation||''});
    }
    state.rosterCache.set(key,map);return map;
  }catch{state.rosterCache.set(key,null);return null;}
}

async function hydratePropPlayers(){
  if(state.hydration||!state.odds)return state.hydration;
  state.hydration=(async()=>{
    const rows=(state.odds.rows||[]).filter(validPropRow);
    const teamNames=[...new Set(rows.flatMap(r=>[r.homeTeam,r.awayTeam]).filter(Boolean))].slice(0,20);
    const rosterEntries=await Promise.all(teamNames.map(async name=>[name,await rosterForTeam(name)]));
    const rosters=new Map(rosterEntries);
    for(const r of rows){
      const key=identityKey(r),pn=norm(r.player),home=rosters.get(r.homeTeam),away=rosters.get(r.awayTeam);
      const player=home?.get(pn)||away?.get(pn)||null;
      if(player){state.identity.set(key,'verified');state.playerDirectory.set(pn,player);}
      else if(home&&away)state.identity.set(key,'mismatch');
      else state.identity.set(key,'unknown');
    }
    if(state.page==='props')renderMain();
  })().finally(()=>{state.hydration=null;});
  return state.hydration;
}


function factorLabel(key){return ({minutes:'Minutes',usage:'Usage',venue:'Venue',opponent:'Opponent',pace:'Pace',rest:'Rest',injury:'Injury'})[key]||key;}
function uiPositionGroup(pos){
  const p=String(pos||'').toUpperCase();
  if(['PG','SG','G'].includes(p))return 'G';
  if(['SF','PF','F'].includes(p))return 'F';
  if(['C','FC','F-C','C-F'].includes(p))return 'C';
  return p||'ALL';
}
function competitiveRecent(p){return (p?.recentGames||[]).filter(g=>g.usedInProjection!==false);}
function recentHitRate(p,count){
  const rows=competitiveRecent(p).slice(0,count);
  if(!rows.length)return null;
  let hits=0,pushes=0;
  for(const r of rows){
    const v=Number(r.value),line=Number(p.line);
    if(!Number.isFinite(v)||!Number.isFinite(line))continue;
    if(v===line){pushes++;continue;}
    if(p.lean==='Under'?v<line:v>line)hits++;
  }
  const decisions=Math.max(1,rows.length-pushes);
  return {hits,games:rows.length,pushes,rate:hits/decisions};
}
function recentModelBars(p){
  const rows=p?.recentGames||[];if(!rows.length)return '<div class="nba3-modal-note">Recent verified games are not available for this market yet.</div>';
  const max=Math.max(...rows.map(r=>Number(r.value)||0),Number(p.line)||1,1);
  return `<div class="nba3-recent-chart">${rows.map(r=>{
    const v=Number(r.value)||0,w=Math.max(3,Math.min(100,v/max*100)),hit=p.lean==='Under'?v<p.line:v>p.line;
    const date=r.date?new Date(r.date).toLocaleDateString([],{month:'short',day:'numeric'}):'—',pre=Number(r.seasonType)===1;
    return `<div class="nba3-recent-row"><span>${esc(date)}${pre?' PRE':''}</span><div class="nba3-recent-track"><i class="${hit?'hit':''}${r.usedInProjection===false?' excluded':''}" style="width:${w.toFixed(1)}%"></i><em style="left:${Math.min(98,p.line/max*100).toFixed(1)}%"></em></div><b>${esc(v)}</b></div>`;
  }).join('')}</div>`;
}
function minutesTrendHTML(p){
  const rows=(p?.recentGames||[]).slice(0,10);
  if(!rows.length)return '<div class="nba3-modal-note">Minutes history is not available yet.</div>';
  return `<div class="nba3-minutes-chart">${rows.map(r=>{
    const min=Number(r.minutes)||0,w=Math.min(100,min/48*100),pre=Number(r.seasonType)===1;
    const date=r.date?new Date(r.date).toLocaleDateString([],{month:'short',day:'numeric'}):'—';
    return `<div class="nba3-min-row"><span>${esc(date)}${pre?' PRE':''}</span><div><i class="${r.usedInProjection===false?'excluded':''}" style="width:${w.toFixed(1)}%"></i></div><b>${min.toFixed(0)}</b></div>`;
  }).join('')}</div>`;
}
function modelFactorHTML(p){
  if(!p?.factors)return '';
  return `<div class="nba3-factor-grid">${Object.entries(p.factors).map(([k,v])=>{
    const pct=(Number(v)-1)*100,tone=pct>1?'up':pct<-1?'down':'flat';
    return `<div class="nba3-factor ${tone}"><span>${esc(factorLabel(k))}</span><b>${pct>=0?'+':''}${pct.toFixed(1)}%</b></div>`;
  }).join('')}</div>`;
}
function defenseRank(p,info){
  if(!p?.opponentId||!state.research)return null;
  const pos=uiPositionGroup(info?.position),market=p.market;
  const rows=Object.entries(state.research.teamDefense||{}).map(([id,v])=>({id,value:finite(v?.byPosition?.[pos]?.[market])}))
    .filter(x=>x.value!=null).sort((a,b)=>a.value-b.value);
  const i=rows.findIndex(x=>String(x.id)===String(p.opponentId));
  if(i<0)return null;
  const rank=i+1,n=rows.length;
  const suffix=rank%10===1&&rank%100!==11?'st':rank%10===2&&rank%100!==12?'nd':rank%10===3&&rank%100!==13?'rd':'th';
  return {rank,n,label:`${rank}${suffix} toughest`,position:pos};
}
function projectionVsLineHTML(p){
  const projection=Number(p?.projection),line=Number(p?.line);
  if(!Number.isFinite(projection)||!Number.isFinite(line))return '';
  const vals=[projection,line,Number(p.last5),Number(p.last10)].filter(Number.isFinite);
  let lo=Math.max(0,Math.min(...vals)*.78),hi=Math.max(...vals)*1.18;
  if(hi-lo<5)hi=lo+5;
  const position=v=>Math.max(3,Math.min(97,(v-lo)/(hi-lo)*100));
  const gap=projection-line;
  return `<div class="nba3-projline">
    <div class="nba3-projline-scale"><span>${lo.toFixed(1)}</span><span>${hi.toFixed(1)}</span></div>
    <div class="nba3-projline-track">
      <i class="line" style="left:${position(line).toFixed(1)}%"><em>LINE ${esc(line)}</em></i>
      <i class="projection" style="left:${position(projection).toFixed(1)}%"><em>TSO ${esc(projection.toFixed(1))}</em></i>
    </div>
    <div class="nba3-projline-foot"><b class="${gap>=0?'over':'under'}">${gap>=0?'+':''}${gap.toFixed(1)}</b><span>projection vs sportsbook line</span></div>
  </div>`;
}
function matchupIntelligenceHTML(p,info){
  const rank=defenseRank(p,info),opp=finite(p.opponentAllowance),league=finite(p.leaguePositionAllowance);
  const diff=opp!=null&&league?((opp/league)-1)*100:null;
  const pace=finite(p.expectedPace),leaguePace=finite(p.leaguePace),paceDiff=pace!=null&&leaguePace?pace-leaguePace:null;
  const pos=rank?.position||uiPositionGroup(info?.position);
  return `<div class="nba3-match-grid">
    <div class="nba3-match-card"><span>Opponent vs ${esc(pos)}</span><b>${opp==null?'—':opp.toFixed(1)}</b><small>${esc(MARKET_LABELS[p.market])} allowed per game to position group</small></div>
    <div class="nba3-match-card"><span>Defensive Rank</span><b>${rank?esc(rank.label):'—'}</b><small>${rank?`of ${rank.n} teams · lower allowance = tougher`:'position rank unavailable'}</small></div>
    <div class="nba3-match-card"><span>vs League</span><b class="${diff!=null&&diff>0?'good':diff!=null&&diff<0?'bad':''}">${diff==null?'—':`${diff>=0?'+':''}${diff.toFixed(1)}%`}</b><small>${league==null?'league baseline unavailable':`league ${league.toFixed(1)}`}</small></div>
    <div class="nba3-match-card"><span>Expected Pace</span><b>${pace==null?'—':pace.toFixed(1)}</b><small>${paceDiff==null?'pace baseline unavailable':`${paceDiff>=0?'+':''}${paceDiff.toFixed(1)} vs league`}</small></div>
  </div>`;
}
function hitRateHTML(p){
  const l5=recentHitRate(p,5),l10=recentHitRate(p,10);
  const card=(label,x)=>`<div class="nba3-hit-card"><span>${label}</span><b>${x?`${Math.round(x.rate*100)}%`:'—'}</b><small>${x?`${x.hits}/${x.games}${x.pushes?` · ${x.pushes} push`:''}`:'no sample'}</small></div>`;
  return `<div class="nba3-hit-grid">${card('L5 HIT RATE',l5)}${card('L10 HIT RATE',l10)}<div class="nba3-hit-card"><span>L5 AVG</span><b>${p.last5==null?'—':esc(p.last5)}</b><small>vs ${esc(p.line)} line</small></div><div class="nba3-hit-card"><span>L10 AVG</span><b>${p.last10==null?'—':esc(p.last10)}</b><small>vs ${esc(p.line)} line</small></div></div>`;
}
function whyTsoHTML(p,info){
  const reasons=[],lean=p.lean||'Lean',gap=Number(p.projection)-Number(p.line),rank=defenseRank(p,info);
  reasons.push(`<b>Projection:</b> TSO has ${esc(info?.name||p.player)} at <strong>${esc(Number(p.projection).toFixed(1))}</strong>, ${Math.abs(gap).toFixed(1)} ${gap>=0?'above':'below'} the ${esc(p.line)} line.`);
  if(p.last5!=null)reasons.push(`<b>Recent form:</b> the competitive L5 average is <strong>${esc(p.last5)}</strong>${p.last10!=null?` and L10 is <strong>${esc(p.last10)}</strong>`:''}.`);
  if(rank&&p.opponentAllowance!=null&&p.leaguePositionAllowance!=null){
    const d=(Number(p.opponentAllowance)/Number(p.leaguePositionAllowance)-1)*100;
    reasons.push(`<b>Matchup:</b> ${esc(p.opponent)} ranks <strong>${esc(rank.label)}</strong> against ${esc(rank.position)} groups in ${esc(MARKET_LABELS[p.market])}, allowing ${esc(Number(p.opponentAllowance).toFixed(1))} (${d>=0?'+':''}${d.toFixed(1)}% vs league).`);
  }
  const pacePct=(Number(p.factors?.pace||1)-1)*100;
  if(Math.abs(pacePct)>=.5)reasons.push(`<b>Pace:</b> expected game pace is ${esc(p.expectedPace??'—')}, applying a ${pacePct>=0?'+':''}${pacePct.toFixed(1)}% pace adjustment.`);
  const venuePct=(Number(p.factors?.venue||1)-1)*100;
  if(Math.abs(venuePct)>=.7)reasons.push(`<b>Venue split:</b> the ${esc(p.venue)} split contributes ${venuePct>=0?'+':''}${venuePct.toFixed(1)}% after shrinkage.`);
  if(info?.injury?.status)reasons.push(`<b>Availability:</b> ESPN lists ${esc(info.injury.status)}${info.injury.detail?` — ${esc(info.injury.detail)}`:''}; the model reduces projection/confidence when appropriate.`);
  const edge=p.edge==null?null:Number(p.edge)*100;
  return `<div class="nba3-why"><div class="nba3-why-title"><span>WHY TSO LIKES ${esc(lean.toUpperCase())}</span><b>${edge==null?'':`${edge>=0?'+':''}${edge.toFixed(1)} pp edge`}</b></div><ul>${reasons.slice(0,5).map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
}
function marketDetailHTML(g,info,active){
  const p=g.projection;
  if(!p)return `<section class="nba3-detail-panel${active?' active':''}" data-nba-detail-panel="${esc(g.market)}"><div class="nba3-modal-note">TSO regression history is not ready for this market yet.</div></section>`;
  return `<section class="nba3-detail-panel${active?' active':''}" data-nba-detail-panel="${esc(g.market)}">
    <div class="nba3-intel-hero">
      <div><span>TSO PROJECTION</span><b>${esc(p.projection.toFixed(1))}</b><small>${esc(MARKET_LABELS[g.market])} · line ${esc(g.line)}</small></div>
      <div><span>MODEL LEAN</span><b class="${String(p.lean).toLowerCase()}">${esc(p.lean)}</b><small>${(p.confidence*100).toFixed(1)}% model confidence</small></div>
      <div><span>MODEL EDGE</span><b>${p.edge==null?'—':`${p.edge>=0?'+':''}${(p.edge*100).toFixed(1)} pp`}</b><small>vs fair sportsbook probability</small></div>
      <div><span>GRADE</span><b>${esc(p.grade)}</b><small>${p.sampleGames} competitive games</small></div>
    </div>
    <div class="nba3-model-section"><div class="nba3-section-head"><span>Projection vs Sportsbook Line</span><small>independent TSO mean</small></div>${projectionVsLineHTML(p)}</div>
    <div class="nba3-intel-grid">
      <div class="nba3-model-section"><div class="nba3-section-head"><span>Recent ${esc(MARKET_LABELS[g.market])}</span><small>line ${esc(g.line)} · PRE dimmed</small></div>${recentModelBars(p)}${hitRateHTML(p)}</div>
      <div class="nba3-model-section"><div class="nba3-section-head"><span>Minutes Trend</span><small>last 10 verified appearances</small></div>${minutesTrendHTML(p)}</div>
    </div>
    <div class="nba3-model-section"><div class="nba3-section-head"><span>Opponent Matchup</span><small>${esc(p.opponent)} · ${esc(p.venue)}</small></div>${matchupIntelligenceHTML(p,info)}</div>
    <div class="nba3-model-section"><div class="nba3-section-head"><span>Projection Factors</span><small>guarded multipliers vs baseline</small></div>${modelFactorHTML(p)}</div>
    ${whyTsoHTML(p,info)}
  </section>`;
}
function playerModal(player,initialMarket=''){
  const groups=propGroups().filter(g=>norm(g.player)===norm(player));
  if(!groups.length)return;
  const info=nbaModelPlayer(state.research,player)||propPlayerInfo(player),match=groups[0];
  const focus=groups.find(g=>g.market===initialMarket&&g.projection)||groups.filter(g=>g.projection).sort((a,b)=>Math.abs(b.projection?.edge??0)-Math.abs(a.projection?.edge??0))[0]||groups[0];
  const photo=info?.headshot||info?.photo||'',team=state.research?.teams?.[String(info?.teamId)]||null;
  const el=document.createElement('div');el.className='nba3-modal-backdrop';
  el.innerHTML=`<section class="nba3-modal nba3-intel-modal" role="dialog" aria-modal="true">
    <div class="nba3-modal-head nba3-intel-head">
      <div class="nba3-intel-person">${photo?`<img src="${esc(photo)}" alt="">`:`<div class="nba3-intel-initials">${esc(initials(player))}</div>`}<div><h3>${esc(player)}</h3><span>${esc(info?.team||matchupLabel(match))}${info?.position?` · ${esc(info.position)}`:''}${info?.injury?.status?` · ${esc(info.injury.status)}`:''}</span></div></div>
      <div class="nba3-intel-team">${team?.logo?`<img src="${esc(team.logo)}" alt="${esc(team.abbr||'')}">`:''}<button type="button" class="nba3-modal-x" data-nba-modal-close>×</button></div>
    </div>
    <div class="nba3-modal-body">
      <div class="nba3-intel-market-tabs">${groups.map(g=>{
        const p=g.projection,active=g.market===focus.market;
        return `<button type="button" class="nba3-intel-market-tab${active?' active':''}" data-nba-detail-market="${esc(g.market)}"><span>${esc(MARKET_LABELS[g.market])} ${esc(g.line)}</span><b>${p?`${esc(p.lean)} · ${esc(p.projection.toFixed(1))}`:'Warming'}</b><small>${p?.edge==null?'':`${p.edge>=0?'+':''}${(p.edge*100).toFixed(1)} pp`}</small></button>`;
      }).join('')}</div>
      <div class="nba3-detail-host">${groups.map(g=>marketDetailHTML(g,info,g.market===focus.market)).join('')}</div>
      <div class="nba3-modal-note"><b>How to read this:</b> TSO projection is generated independently from sportsbook odds using verified ESPN history. The sportsbook's no-vig probability is used only to calculate model edge. Preseason games remain visible for context but are dimmed when excluded from the competitive regression baseline.</div>
    </div>
  </section>`;
  const close=()=>el.remove();
  el.addEventListener('click',e=>{
    if(e.target===el||e.target.closest('[data-nba-modal-close]')){close();return;}
    const btn=e.target.closest('[data-nba-detail-market]');
    if(btn){
      const market=btn.dataset.nbaDetailMarket;
      el.querySelectorAll('[data-nba-detail-market]').forEach(x=>x.classList.toggle('active',x.dataset.nbaDetailMarket===market));
      el.querySelectorAll('[data-nba-detail-panel]').forEach(x=>x.classList.toggle('active',x.dataset.nbaDetailPanel===market));
    }
  });
  document.body.appendChild(el);
}

function bind(root){
  root.addEventListener('click',async e=>{
    const page=e.target.closest('[data-nba-page]');if(page){await selectPage(page.dataset.nbaPage);return;}
    const game=e.target.closest('[data-nba-game]');if(game){await chooseGame(game.dataset.nbaGame);return;}
    const open=e.target.closest('[data-nba-open-live]');if(open){await chooseGame(open.dataset.nbaOpenLive);return;}
    const tab=e.target.closest('[data-nba-gameview]');if(tab){state.gameView=tab.dataset.nbaGameview||'gamecast';renderMain();return;}
    const market=e.target.closest('[data-nba-market]');if(market){state.propMarket=market.dataset.nbaMarket||'all';renderMain();return;}
    const row=e.target.closest('[data-nba-prop-player]');if(row&&!e.target.closest('a'))playerModal(row.dataset.nbaPropPlayer,row.dataset.nbaPropMarket||'');
  });
  root.addEventListener('input',e=>{
    if(e.target.id==='nbaPropSearch'){
      state.propQuery=e.target.value||'';
      const pos=e.target.selectionStart;
      renderMain();
      const next=document.getElementById('nbaPropSearch');
      if(next){next.focus();try{next.setSelectionRange(pos,pos);}catch{}}
    }
  });
}

function startPolling(){
  if(state.poll)clearInterval(state.poll);
  state.poll=setInterval(()=>{
    if(isActive()&&document.visibilityState!=='hidden'&&state.page!=='props')refresh({preserveSelection:true});
    else if(isActive()&&state.page==='props')Promise.all([loadOdds(),loadResearch()]).then(()=>renderMain());
  },REFRESH_MS);
}

export async function mount(){
  ensureCss();
  const root=rootEl();if(!root)throw new Error('NBA view container is missing');
  root.removeAttribute('hidden');
  if(!state.mounted){
    const pending=window.DW_nbaPendingTab;
    if(['slate','live','props'].includes(pending))state.page=pending;
    root.innerHTML=shell();bind(root);state.mounted=true;startPolling();
  }
  refreshNav();
  await refresh({preserveSelection:true});
}

export function selectTab(next){return selectPage(next);}
export function unmount(){if(state.poll){clearInterval(state.poll);state.poll=null;}}

window.DW_openNbaTab=next=>{
  window.DW_nbaPendingTab=next;
  if(location.hash!=='#nba')location.hash='nba';
  else selectPage(next);
};
window.DW_nbaSelectTab=selectPage;
