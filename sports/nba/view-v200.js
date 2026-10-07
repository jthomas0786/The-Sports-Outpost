
const ESPN_SCOREBOARD='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const ESPN_SUMMARY='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary';
const CSS_ID='tso-nba-v200-css';
const REFRESH_MS=30000;

const state={
  events:[],
  slateDate:'',
  selectedId:'',
  summary:null,
  view:'gamecast',
  loading:false,
  refreshedAt:null,
  poll:null,
  mounted:false
};

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=v=>Number.isFinite(Number(v))?String(Number(v)):'—';
const initials=v=>String(v||'NBA').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
const rootEl=()=>document.getElementById('nbaView');
const isActive=()=>String(location.hash||'').replace(/^#/,'').toLowerCase()==='nba';

function ensureCss(){
  if(document.getElementById(CSS_ID)) return;
  const link=document.createElement('link');
  link.id=CSS_ID;
  link.rel='stylesheet';
  link.href=new URL('./view-v200.css?v=2.0',import.meta.url).href;
  document.head.appendChild(link);
}

async function fetchJson(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error(`NBA data request failed (${r.status})`);
  return r.json();
}

function statusInfo(event){
  const st=event?.status?.type||{};
  const comp=event?.competitions?.[0]||{};
  const short=st.shortDetail||st.detail||event?.status?.displayClock||'';
  return {
    state:st.state||'pre',
    completed:!!st.completed,
    live:st.state==='in',
    label:short||comp.status?.type?.shortDetail||'Scheduled'
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
  if(s.live) return s.label||'LIVE';
  if(s.completed) return 'FINAL';
  const date=new Date(event?.date||Date.now());
  return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}

function gameDateLabel(key){
  if(!key||key.length!==8) return 'NBA Slate';
  const d=new Date(Number(key.slice(0,4)),Number(key.slice(4,6))-1,Number(key.slice(6,8)));
  return d.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
}

function gameCard(event){
  const t=teamsFor(event),s=statusInfo(event),active=String(event?.id)===String(state.selectedId);
  return `<button type="button" class="nba2-game${s.live?' live':''}${active?' active':''}" data-nba-game="${esc(event?.id)}">
    <div class="nba2-game-top"><span>${s.live?'● LIVE':esc(gameLabel(event))}</span><span>${esc(event?.competitions?.[0]?.broadcasts?.[0]?.names?.[0]||'NBA')}</span></div>
    <div class="nba2-mini-team"><img src="${esc(t.away.logo)}" alt=""><b>${esc(t.away.short)}</b><strong>${esc(t.away.score)}</strong></div>
    <div class="nba2-mini-team"><img src="${esc(t.home.logo)}" alt=""><b>${esc(t.home.short)}</b><strong>${esc(t.home.score)}</strong></div>
  </button>`;
}

function renderRail(){
  const el=document.querySelector('#nbaView .nba2-rail');
  const label=document.querySelector('#nbaView .nba2-rail-label span:last-child');
  if(!el) return;
  el.innerHTML=state.events.length?state.events.map(gameCard).join(''):`<div class="nba2-empty">No NBA games found for this slate.</div>`;
  if(label) label.textContent=gameDateLabel(state.slateDate);
}

function statMap(labels,stats){
  const out={};
  (labels||[]).forEach((label,i)=>{out[String(label||'').toUpperCase()]=stats?.[i]??'';});
  return out;
}

function playerRows(summary){
  const groups=summary?.boxscore?.players;
  if(!Array.isArray(groups)) return [];
  const rows=[];
  for(const teamGroup of groups){
    const team=teamGroup?.team||{};
    const blocks=Array.isArray(teamGroup?.statistics)?teamGroup.statistics:[];
    const block=blocks.find(b=>Array.isArray(b?.athletes)&&b.athletes.length)||blocks[0];
    if(!block) continue;
    const labels=block.labels||block.names||[];
    for(const row of block.athletes||[]){
      if(row?.didNotPlay) continue;
      const athlete=row?.athlete||{};
      const m=statMap(labels,row?.stats||[]);
      const pts=num(m.PTS??m.POINTS);
      const reb=num(m.REB??m.REBOUNDS);
      const ast=num(m.AST??m.ASSISTS);
      const min=m.MIN??m.MINUTES??'';
      const hasGameStats=pts>0||reb>0||ast>0||(String(min).trim()!==''&&String(min)!=='0');
      rows.push({
        id:String(athlete.id||''),
        teamId:String(team.id||''),
        teamAbbr:team.abbreviation||'NBA',
        teamName:team.displayName||team.name||'Team',
        teamLogo:team.logo||team.logos?.[0]?.href||'',
        name:athlete.displayName||athlete.fullName||'Player',
        shortName:athlete.shortName||athlete.displayName||'Player',
        headshot:athlete.headshot?.href||athlete.headshot||'',
        position:athlete.position?.abbreviation||row?.position?.abbreviation||'',
        starter:!!row?.starter,
        min,
        fg:m.FG??m['FGM-A']??'—',
        three:m['3PT']??m['3PM-A']??'—',
        ft:m.FT??m['FTM-A']??'—',
        pts,reb,ast,
        hasGameStats,
        hotScore:pts+(reb*1.15)+(ast*1.35)
      });
    }
  }
  return rows;
}

function hotPlayer(summary){
  const rows=playerRows(summary).filter(p=>p.hasGameStats);
  if(!rows.length) return null;
  rows.sort((a,b)=>b.hotScore-a.hotScore||b.pts-a.pts||b.ast-a.ast||b.reb-a.reb);
  return rows[0];
}

function selectedEvent(){
  return state.events.find(e=>String(e?.id)===String(state.selectedId))||state.events[0]||null;
}

function scoreCard(event){
  if(!event) return '<div class="nba2-card nba2-loading">Choose a game to open NBA Gamecast.</div>';
  const t=teamsFor(event),s=statusInfo(event);
  return `<section class="nba2-card nba2-score">
    <div class="nba2-team">
      <img src="${esc(t.away.logo)}" alt="${esc(t.away.short)}">
      <div class="nba2-team-copy"><b>${esc(t.away.short)}</b><span>${esc(t.away.record||'')}</span></div>
      <div class="nba2-team-score">${esc(t.away.score)}</div>
    </div>
    <div class="nba2-score-mid"><strong>${esc(s.live?'LIVE':s.completed?'FINAL':gameLabel(event))}</strong><span>${esc(s.label||'')}</span></div>
    <div class="nba2-team home">
      <div class="nba2-team-score">${esc(t.home.score)}</div>
      <div class="nba2-team-copy"><b>${esc(t.home.short)}</b><span>${esc(t.home.record||'')}</span></div>
      <img src="${esc(t.home.logo)}" alt="${esc(t.home.short)}">
    </div>
  </section>`;
}

function watchCard(){
  const p=hotPlayer(state.summary);
  if(!p) return `<section class="nba2-card nba2-watch">
    <div class="nba2-watch-head"><span>✦ Player to Watch</span><span class="nba2-watch-hot"><i></i> GAME STATS</span></div>
    <div class="nba2-empty-watch">The Player to Watch appears from the actual game box score once live player stats are available. No projected or season stats are substituted here.</div>
  </section>`;
  const photo=p.headshot?`<img src="${esc(p.headshot)}" alt="${esc(p.name)}">`:esc(initials(p.name));
  return `<section class="nba2-card nba2-watch">
    <div class="nba2-watch-head"><span>✦ Player to Watch</span><span class="nba2-watch-hot"><i></i> HOT</span></div>
    <div class="nba2-player">
      <div class="nba2-player-photo">${photo}</div>
      <div class="nba2-player-copy"><b>${esc(p.name)}</b><span>${esc([p.teamAbbr,p.position].filter(Boolean).join(' · '))} · this game only</span></div>
    </div>
    <div class="nba2-watch-stats">
      <div class="nba2-watch-stat"><b>${fmt(p.pts)}</b><span>PTS</span></div>
      <div class="nba2-watch-stat"><b>${fmt(p.reb)}</b><span>REB</span></div>
      <div class="nba2-watch-stat"><b>${fmt(p.ast)}</b><span>AST</span></div>
    </div>
  </section>`;
}

function plays(){
  const p=state.summary?.plays;
  return Array.isArray(p)?p:[];
}

function playRows(limit=null){
  let list=plays().slice();
  if(limit) list=list.slice(-limit);
  list.reverse();
  if(!list.length) return '<div class="nba2-empty">Play-by-play will populate when the game starts.</div>';
  return list.map(p=>{
    const period=p?.period?.number||p?.period||'';
    const clock=p?.clock?.displayValue||p?.clock||'';
    const score=p?.awayScore!=null&&p?.homeScore!=null?`${p.awayScore}-${p.homeScore}`:'';
    return `<div class="nba2-play${p?.scoringPlay?' scoring':''}">
      <div class="nba2-play-time">${esc([period?`Q${period}`:'',clock].filter(Boolean).join(' '))}</div>
      <div class="nba2-play-text">${esc(p?.text||p?.shortText||'Play update')}</div>
      ${score?`<div class="nba2-play-badge">${esc(score)}</div>`:''}
    </div>`;
  }).join('');
}

function lastPlay(){
  const p=plays().at(-1);
  return p?.text||p?.shortText||'Live play-by-play will appear here.';
}

function court(event){
  const s=statusInfo(event||{});
  return `<div class="nba2-court" aria-hidden="true">
    <div class="nba2-court-line"></div>
    <div class="nba2-key left"></div><div class="nba2-key right"></div>
    <div class="nba2-arc left"></div><div class="nba2-arc right"></div>
    <div class="nba2-hoop left"></div><div class="nba2-hoop right"></div>
    <div class="nba2-court-overlay"><b>${esc(s.live?s.label:s.completed?'Final':'Pregame')}</b><span>${esc(lastPlay())}</span></div>
  </div>`;
}

function gamecastView(event){
  return `<div class="nba2-topgrid">${scoreCard(event)}${watchCard()}</div>
    ${court(event)}
    <section class="nba2-card nba2-section">
      <div class="nba2-section-head"><span>Live Play-by-Play</span><small>Full-width game feed</small></div>
      <div class="nba2-pbp">${playRows(14)}</div>
    </section>`;
}

function groupedPlayers(){
  const rows=playerRows(state.summary);
  const out=new Map();
  for(const p of rows){
    const key=p.teamId||p.teamAbbr;
    if(!out.has(key)) out.set(key,{teamId:key,teamName:p.teamName,teamAbbr:p.teamAbbr,teamLogo:p.teamLogo,players:[]});
    out.get(key).players.push(p);
  }
  return [...out.values()];
}

function boxView(){
  const groups=groupedPlayers();
  if(!groups.length) return '<div class="nba2-empty">Box score data is not available yet.</div>';
  return groups.map(g=>`<section class="nba2-card nba2-box-team">
    <div class="nba2-box-team-head">${g.teamLogo?`<img src="${esc(g.teamLogo)}" alt="">`:''}<span>${esc(g.teamName)}</span></div>
    <div class="nba2-tablewrap"><table class="nba2-table">
      <thead><tr><th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>3PT</th><th>FT</th></tr></thead>
      <tbody>${g.players.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.min||'—')}</td><td>${fmt(p.pts)}</td><td>${fmt(p.reb)}</td><td>${fmt(p.ast)}</td><td>${esc(p.fg)}</td><td>${esc(p.three)}</td><td>${esc(p.ft)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>`).join('');
}

function pbpView(){
  return `<section class="nba2-card">
    <div class="nba2-section-head"><span>Play-by-Play</span><small>Newest play first</small></div>
    <div class="nba2-pbp">${playRows()}</div>
  </section>`;
}

function renderSelected(){
  const host=document.querySelector('#nbaView .nba2-body');
  if(!host) return;
  if(state.loading){host.innerHTML='<div class="nba2-card nba2-loading">Loading live NBA game data…</div>';return;}
  const event=selectedEvent();
  if(!event){host.innerHTML='<div class="nba2-card nba2-empty">No NBA game is available for this slate.</div>';return;}
  host.innerHTML=state.view==='box'?boxView():state.view==='plays'?pbpView():gamecastView(event);
  document.querySelectorAll('#nbaView .nba2-tab').forEach(b=>b.classList.toggle('active',b.dataset.nbaView===state.view));
}

function renderFresh(){
  const el=document.querySelector('#nbaView .nba2-fresh span');
  if(!el) return;
  el.textContent=state.refreshedAt?`Updated ${state.refreshedAt.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'})}`:'Live data';
}

async function findSlate(){
  const base=new Date();
  for(let offset=0;offset<8;offset++){
    const d=new Date(base);
    d.setDate(base.getDate()+offset);
    const key=dateKey(d);
    const data=await fetchJson(`${ESPN_SCOREBOARD}?limit=100&dates=${key}`);
    if(Array.isArray(data?.events)&&data.events.length) return {key,events:data.events};
  }
  return {key:dateKey(base),events:[]};
}

async function loadSummary(id){
  if(!id){state.summary=null;return;}
  state.loading=true;
  renderSelected();
  try{
    state.summary=await fetchJson(`${ESPN_SUMMARY}?event=${encodeURIComponent(id)}`);
  }catch(error){
    console.warn('[NBA 2.0] summary unavailable',error);
    state.summary=null;
  }finally{
    state.loading=false;
    state.refreshedAt=new Date();
    renderSelected();
    renderFresh();
  }
}

async function chooseGame(id){
  state.selectedId=String(id||'');
  renderRail();
  await loadSummary(state.selectedId);
}

function bestDefault(events){
  return events.find(e=>statusInfo(e).live)||events.find(e=>!statusInfo(e).completed)||events[0]||null;
}

async function refresh({preserveSelection=true}={}){
  try{
    const existing=preserveSelection?String(state.selectedId||''):'';
    const slate=await findSlate();
    state.events=slate.events;
    state.slateDate=slate.key;
    const chosen=state.events.find(e=>String(e.id)===existing)||bestDefault(state.events);
    state.selectedId=chosen?String(chosen.id):'';
    state.refreshedAt=new Date();
    renderRail();
    renderFresh();
    if(state.selectedId) await loadSummary(state.selectedId);
    else renderSelected();
  }catch(error){
    console.error('[NBA 2.0] scoreboard unavailable',error);
    const host=document.querySelector('#nbaView .nba2-body');
    if(host) host.innerHTML=`<div class="nba2-error"><b>NBA Live Center could not load.</b><div>${esc(error?.message||error)}</div></div>`;
  }
}

function shell(){
  return `<div class="nba2">
    <div class="nba2-top">
      <div><div class="nba2-kicker">The Sports Outpost · NBA 2.0</div><h1 class="nba2-title">NBA Live Center</h1><div class="nba2-sub">Live score, real game-only Player to Watch stats, box score and full play-by-play.</div></div>
      <div class="nba2-fresh"><i></i><span>Live data</span></div>
    </div>
    <div class="nba2-rail-shell">
      <div class="nba2-rail-label"><span>NBA Games</span><span>Loading slate…</span></div>
      <div class="nba2-rail"><div class="nba2-loading">Loading NBA slate…</div></div>
    </div>
    <div class="nba2-card">
      <div class="nba2-tabs">
        <button type="button" class="nba2-tab active" data-nba-view="gamecast">Gamecast</button>
        <button type="button" class="nba2-tab" data-nba-view="box">Box Score</button>
        <button type="button" class="nba2-tab" data-nba-view="plays">Play by Play</button>
      </div>
      <div class="nba2-body"><div class="nba2-loading">Loading NBA 2.0…</div></div>
    </div>
  </div>`;
}

function bind(root){
  root.addEventListener('click',async e=>{
    const game=e.target.closest('[data-nba-game]');
    if(game){await chooseGame(game.dataset.nbaGame);return;}
    const tab=e.target.closest('[data-nba-view]');
    if(tab){state.view=tab.dataset.nbaView||'gamecast';renderSelected();}
  });
}

function startPolling(){
  if(state.poll) clearInterval(state.poll);
  state.poll=setInterval(()=>{
    if(isActive()&&document.visibilityState!=='hidden') refresh({preserveSelection:true});
  },REFRESH_MS);
}

export async function mount(){
  ensureCss();
  const root=rootEl();
  if(!root) throw new Error('NBA view container is missing');
  root.removeAttribute('hidden');
  if(!state.mounted){
    root.innerHTML=shell();
    bind(root);
    state.mounted=true;
    startPolling();
  }
  await refresh({preserveSelection:true});
}

export function unmount(){
  if(state.poll){clearInterval(state.poll);state.poll=null;}
}
