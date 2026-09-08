/**
 * sports/nfl-research-ui.js — v69 NFL research presentation layer.
 *
 * This module intentionally sits beside nfl-preview.js instead of replacing its
 * model logic. It reads slates/nfl-research.json and enriches the rendered NFL
 * Slate + Player Modal with source-backed roster/depth/injury/history context.
 */

let research = null;
let loadPromise = null;
let observer = null;
let scheduled = false;
let rootRef = null;
let indexes = null;

const normTeam = t => ({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(t||'').toUpperCase()] || String(t||'').toUpperCase());
const nameKey = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = v => Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US') : '—';
const fmt1 = v => Number.isFinite(Number(v)) ? Number(v).toFixed(1) : '—';
const pct = v => Number.isFinite(Number(v)) ? `${Number(v).toFixed(Number(v)%1 ? 1 : 0)}%` : '—';

function buildIndexes(data){
  const byId=new Map(), byName=new Map(), byTeamName=new Map();
  for(const p of data?.players||[]){
    for(const id of [p.espnId,p.gsisId,p.pfrId]) if(id) byId.set(String(id),p);
    const nk=nameKey(p.name); if(nk && !byName.has(nk)) byName.set(nk,p);
    byTeamName.set(`${normTeam(p.team)}|${nk}`,p);
  }
  return {byId,byName,byTeamName};
}

async function loadResearch(){
  if(research) return research;
  if(loadPromise) return loadPromise;
  loadPromise=(async()=>{
    try{
      const res=await fetch('./slates/nfl-research.json',{cache:'no-cache'});
      if(!res.ok) throw new Error(`NFL research ${res.status}`);
      research=await res.json();
      indexes=buildIndexes(research);
      return research;
    }catch(err){
      console.warn('[NFL research UI] research feed unavailable:',err);
      return null;
    }
  })();
  return loadPromise;
}

function findResearch({id,name,team}={}){
  if(!indexes) return null;
  if(id && indexes.byId.has(String(id))) return indexes.byId.get(String(id));
  const nk=nameKey(name);
  if(team && nk){ const hit=indexes.byTeamName.get(`${normTeam(team)}|${nk}`); if(hit) return hit; }
  return nk ? indexes.byName.get(nk)||null : null;
}

function freshness(){
  if(!research?.generatedAt) return 'Research feed loaded';
  const d=new Date(research.generatedAt);
  if(!Number.isFinite(d.getTime())) return 'Research feed loaded';
  return `Updated ${d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
}

function positionYards(r,pos){
  const s=r?.previousSeason||{};
  return pos==='QB' ? s.passYds : s.scrimmageYds;
}
function lastFiveYards(r,pos){
  const a=r?.last5?.avg||{};
  return pos==='QB' ? a.passYds : a.scrimmageYds;
}
function depthLabel(r,pos){
  const d=r?.depth||{};
  if(d.rank) return `${d.position||pos||''}${d.rank}`;
  return d.position||pos||'—';
}
function statusLabel(r){ return r?.injury?.status || r?.rosterStatus || 'Active'; }
function statusClass(r){
  const s=statusLabel(r).toLowerCase();
  return /out|ir|reserve|doubt|question|injur|pup/.test(s) ? 'warn' : 'ok';
}
function matchupText(r){
  const m=r?.matchup, pg=m?.previousSeasonAllowed?.perGame;
  if(!m||!pg) return null;
  const y=Number.isFinite(Number(pg.yards)) ? `${fmt1(pg.yards)} yds/g` : null;
  const td=Number.isFinite(Number(pg.tds)) ? `${fmt1(pg.tds)} TD/g` : null;
  return [`vs ${m.opponent}`,m.positionGroup,[y,td].filter(Boolean).join(' · ')].filter(Boolean);
}

function ensureStyles(){
  if(document.getElementById('tso-nfl-research-ui-v69')) return;
  const style=document.createElement('style');
  style.id='tso-nfl-research-ui-v69';
  style.textContent=`
    .tso-nfl-research-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px;min-width:0}
    .tso-nfl-research-pill{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:3px 6px;border:1px solid rgba(120,176,239,.20);border-radius:6px;background:rgba(5,23,49,.55);font:800 7px 'JetBrains Mono','Space Mono',monospace;letter-spacing:.025em;color:#b8c9df;white-space:nowrap}
    .tso-nfl-research-pill b{color:#fff;font-weight:900}.tso-nfl-research-pill.ok b{color:#68e29b}.tso-nfl-research-pill.warn{border-color:rgba(255,101,101,.32);background:rgba(86,20,29,.28)}.tso-nfl-research-pill.warn b{color:#ff8b8b}
    .tso-nfl-research-pill.matchup{border-color:rgba(245,158,11,.24);background:rgba(89,55,5,.18)}.tso-nfl-research-pill.matchup b{color:#fbbf24}
    .tso-nfl-board-fresh{display:inline-flex;align-items:center;gap:5px;margin-left:auto;padding:3px 7px;border:1px solid rgba(120,176,239,.18);border-radius:999px;background:rgba(5,23,49,.46);font:800 7px 'JetBrains Mono',monospace;color:#8faecc;white-space:nowrap}.tso-nfl-board-fresh i{width:5px;height:5px;border-radius:50%;background:#4ade80}
    .tso-nfl-research-dashboard{display:flex;flex-direction:column;gap:12px}.tso-nfl-research-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid rgba(120,176,239,.18);border-radius:10px;background:rgba(5,23,49,.46)}
    .tso-nfl-research-identity{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.tso-nfl-research-identity strong{font:700 14px 'Oswald',sans-serif;color:#fff}.tso-nfl-research-identity span{padding:3px 7px;border-radius:999px;border:1px solid rgba(120,176,239,.22);font:800 8px 'JetBrains Mono',monospace;color:#b9cae3}.tso-nfl-research-identity span.ok{color:#68e29b}.tso-nfl-research-identity span.warn{color:#ff8b8b;border-color:rgba(255,101,101,.32)}
    .tso-nfl-research-updated{font:700 8px 'JetBrains Mono',monospace;color:#7997bd}
    .tso-nfl-research-alert2{display:flex;gap:8px;align-items:flex-start;padding:9px 11px;border:1px solid rgba(255,101,101,.30);border-radius:9px;background:rgba(91,22,31,.24)}.tso-nfl-research-alert2 b{font:900 9px 'JetBrains Mono',monospace;color:#ff8b8b;text-transform:uppercase}.tso-nfl-research-alert2 span{font-size:11px;color:#d8e4f5;line-height:1.4}
    .tso-nfl-research-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.tso-nfl-research-kpi{padding:10px;border:1px solid rgba(120,176,239,.16);border-radius:9px;background:rgba(4,17,38,.42);min-width:0}.tso-nfl-research-kpi span{display:block;font:800 7px 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:#7f9dc4}.tso-nfl-research-kpi b{display:block;margin-top:4px;font:700 20px 'Oswald',sans-serif;color:#fff;line-height:1}.tso-nfl-research-kpi small{display:block;margin-top:4px;font-size:9px;color:#8ea5c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tso-nfl-research-subgrid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:10px}.tso-nfl-research-card{border:1px solid rgba(120,176,239,.16);border-radius:9px;background:rgba(4,17,38,.34);overflow:hidden}.tso-nfl-research-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(120,176,239,.14);font:900 8px 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:#49a8ff}.tso-nfl-research-card-head small{color:#6f8daf;font-weight:700;letter-spacing:0;text-transform:none}
    .tso-nfl-role-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0}.tso-nfl-role-grid div{padding:9px 8px;text-align:center;border-right:1px solid rgba(120,176,239,.10);border-bottom:1px solid rgba(120,176,239,.10)}.tso-nfl-role-grid div:nth-child(3n){border-right:0}.tso-nfl-role-grid div:nth-last-child(-n+3){border-bottom:0}.tso-nfl-role-grid span{display:block;font:800 7px 'JetBrains Mono',monospace;text-transform:uppercase;color:#7795bb}.tso-nfl-role-grid b{display:block;margin-top:4px;font:700 15px 'Oswald',sans-serif;color:#fff}
    .tso-nfl-matchup-card{padding:10px}.tso-nfl-matchup-title{font:700 17px 'Oswald',sans-serif;color:#fff}.tso-nfl-matchup-title span{color:#fbbf24}.tso-nfl-matchup-copy{margin-top:3px;font-size:10px;color:#8fa8c8}.tso-nfl-matchup-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:9px}.tso-nfl-matchup-grid div{padding:8px;border-radius:7px;background:rgba(8,31,65,.52);text-align:center}.tso-nfl-matchup-grid span{display:block;font:800 7px 'JetBrains Mono',monospace;text-transform:uppercase;color:#7795bb}.tso-nfl-matchup-grid b{display:block;margin-top:3px;font:700 15px 'Oswald',sans-serif;color:#fff}
    .tso-nfl-games-wrap{overflow-x:auto}.tso-nfl-games{width:100%;border-collapse:collapse;min-width:520px}.tso-nfl-games th,.tso-nfl-games td{padding:7px 8px;border-bottom:1px solid rgba(120,176,239,.10);text-align:right;font-size:9px;color:#b8c9df}.tso-nfl-games th{font:800 7px 'JetBrains Mono',monospace;text-transform:uppercase;color:#6f8daf}.tso-nfl-games th:first-child,.tso-nfl-games td:first-child,.tso-nfl-games th:nth-child(2),.tso-nfl-games td:nth-child(2){text-align:left}.tso-nfl-games td strong{color:#fff}.tso-nfl-games tr:last-child td{border-bottom:0}
    .tso-nfl-research-source2{font:700 8px 'JetBrains Mono',monospace;color:#6f8daf;line-height:1.5}.tso-nfl-research-source2 b{color:#9eb5d2}
    @media(max-width:980px){.tso-nfl-research-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.tso-nfl-research-subgrid{grid-template-columns:1fr}.tso-nfl-research-pill.matchup{display:none}}
    @media(max-width:700px){.tso-nfl-research-row{gap:4px}.tso-nfl-research-pill{font-size:6.5px;padding:3px 5px}.tso-nfl-research-pill:nth-of-type(n+4){display:none}.tso-nfl-board-fresh{display:none}.tso-nfl-research-kpis{grid-template-columns:repeat(2,1fr)}.tso-nfl-role-grid{grid-template-columns:repeat(2,1fr)}.tso-nfl-role-grid div:nth-child(3n){border-right:1px solid rgba(120,176,239,.10)}.tso-nfl-role-grid div:nth-child(2n){border-right:0}.tso-nfl-role-grid div:nth-last-child(-n+3){border-bottom:1px solid rgba(120,176,239,.10)}.tso-nfl-role-grid div:nth-last-child(-n+2){border-bottom:0}}
  `;
  document.head.appendChild(style);
}

function enhanceSlateRows(root){
  for(const row of root.querySelectorAll('.nfl-slate-player')){
    if(row.querySelector('.tso-nfl-research-row')) continue;
    const main=row.querySelector('.nfl-slate-player-main'); if(!main) continue;
    const name=main.querySelector('strong')?.textContent?.trim()||'';
    const r=findResearch({id:row.dataset.nflPlayer,name}); if(!r) continue;
    const pos=String(r.position||'').toUpperCase();
    const prev=r.previousSeason||{}, last=r.last5||{}, snap=r.snapTrend||{};
    const match=matchupText(r);
    const pills=[];
    pills.push(`<span class="tso-nfl-research-pill ${statusClass(r)}"><b>${esc(depthLabel(r,pos))}</b> · ${esc(statusLabel(r))}</span>`);
    pills.push(`<span class="tso-nfl-research-pill"><b>${esc(String(research?.previousSeason||'Prev'))}</b> ${fmt(positionYards(r,pos))} YDS · ${fmt(prev.totalTds)} TD</span>`);
    if(last.games) pills.push(`<span class="tso-nfl-research-pill"><b>L5</b> ${fmt1(lastFiveYards(r,pos))} Y/G · ${fmt(last.tdGames)} TD G</span>`);
    if(Number.isFinite(Number(snap.avgOffensePct))) pills.push(`<span class="tso-nfl-research-pill"><b>SNAP</b> ${pct(snap.avgOffensePct)}</span>`);
    if(match) pills.push(`<span class="tso-nfl-research-pill matchup"><b>${esc(match[0])}</b> ${esc(match[2]||match[1]||'')}</span>`);
    main.insertAdjacentHTML('beforeend',`<div class="tso-nfl-research-row">${pills.join('')}</div>`);
  }
}

function enhanceBoardHeaders(root){
  for(const head of root.querySelectorAll('.nfl-team-board-head')){
    if(head.querySelector('.tso-nfl-board-fresh')) continue;
    head.insertAdjacentHTML('beforeend',`<span class="tso-nfl-board-fresh"><i></i>${esc(freshness())}</span>`);
  }
}

function roleItems(r,pos){
  const a=r?.last5?.avg||{}, s=r?.previousSeason||{}, snap=r?.snapTrend||{};
  if(pos==='QB') return [
    ['Pass Yds/G',a.passYds],['TD/G',a.tds],['Snap %',snap.avgOffensePct!=null?pct(snap.avgOffensePct):'—'],
    ['2025 Pass Yds',s.passYds],['2025 Pass TD',s.passTds],['Games',s.games]
  ];
  if(pos==='RB') return [
    ['Carries/G',a.carries],['Targets/G',a.targets],['Snap %',snap.avgOffensePct!=null?pct(snap.avgOffensePct):'—'],
    ['Rush Yds/G',a.rushYds],['Rec Yds/G',a.recYds],['TD Games L5',r?.last5?.tdGames]
  ];
  return [
    ['Targets/G',a.targets],['Rec/G',a.receptions],['Snap %',snap.avgOffensePct!=null?pct(snap.avgOffensePct):'—'],
    ['Rec Yds/G',a.recYds],['Target Share',s.targetShare!=null?pct(s.targetShare):'—'],['TD Games L5',r?.last5?.tdGames]
  ];
}

function recentGamesHTML(r,pos){
  const rows=(r?.last5?.gamesLog||[]).slice(0,5);
  if(!rows.length) return `<div style="padding:12px;color:#839bb9;font-size:10px;">No completed-game log is available yet.</div>`;
  return `<div class="tso-nfl-games-wrap"><table class="tso-nfl-games"><thead><tr><th>WK</th><th>OPP</th>${pos==='QB'?'<th>PASS</th>':'<th>CAR</th><th>TGT</th><th>REC</th>'}<th>${pos==='QB'?'PASS YDS':'RUSH'}</th>${pos!=='QB'?'<th>REC YDS</th>':''}<th>TD</th></tr></thead><tbody>${rows.map(g=>`<tr><td><strong>${fmt(g.week)}</strong></td><td>${esc(g.opponent||'—')}</td>${pos==='QB'?`<td>—</td>`:`<td>${fmt(g.carries)}</td><td>${fmt(g.targets)}</td><td>${fmt(g.receptions)}</td>`}<td>${fmt(pos==='QB'?g.passYds:g.rushYds)}</td>${pos!=='QB'?`<td>${fmt(g.recYds)}</td>`:''}<td><strong>${fmt(g.tds)}</strong></td></tr>`).join('')}</tbody></table></div>`;
}

function matchupHTML(r,pos){
  const m=r?.matchup, pg=m?.previousSeasonAllowed?.perGame;
  if(!m||!pg) return `<div class="tso-nfl-matchup-card"><div class="tso-nfl-matchup-title">Opponent profile pending</div><div class="tso-nfl-matchup-copy">The previous-season position-group allowance will populate when an opponent is attached to the current slate player.</div></div>`;
  const items=pos==='QB'
    ? [['Pass Yds/G',pg.passYds],['TD/G',pg.tds],['Total Yds/G',pg.yards],['Turnover context','—']]
    : pos==='RB'
      ? [['Rush Yds/G',pg.rushYds],['Carries/G',pg.carries],['TD/G',pg.tds],['Total Yds/G',pg.yards]]
      : [['Rec Yds/G',pg.recYds],['Targets/G',pg.targets],['Rec/G',pg.receptions],['TD/G',pg.tds]];
  return `<div class="tso-nfl-matchup-card"><div class="tso-nfl-matchup-title">vs <span>${esc(m.opponent)}</span> · ${esc(m.positionGroup||pos)}</div><div class="tso-nfl-matchup-copy">Previous-season production allowed to this position group.</div><div class="tso-nfl-matchup-grid">${items.map(([l,v])=>`<div><span>${esc(l)}</span><b>${typeof v==='number'?fmt1(v):esc(v)}</b></div>`).join('')}</div></div>`;
}

function researchDashboardHTML(r){
  const pos=String(r.position||'').toUpperCase();
  const prev=r.previousSeason||{}, last=r.last5||{}, snap=r.snapTrend||{}, cur=r.currentSeason||{};
  const year=research?.previousSeason||'Prev';
  const yards=positionYards(r,pos), l5=lastFiveYards(r,pos);
  const status=statusLabel(r);
  const injury=r.injury?.detail ? `<div class="tso-nfl-research-alert2"><b>${esc(status)}</b><span>${esc(r.injury.detail)}</span></div>` : '';
  const currentActive=Number(cur.games||0)>0;
  const kpis=[
    [`${year} Yards`,yards,pos==='QB'?'Passing':'Scrimmage'],
    [`${year} TD`,prev.totalTds,`${fmt(prev.games)} games`],
    ['Last 5 Yds/G',l5,`${fmt(last.tdGames)} TD games`],
    ['Avg Snap %',snap.avgOffensePct!=null?`${fmt1(snap.avgOffensePct)}%`:'—',snap.lastOffensePct!=null?`Latest ${fmt1(snap.lastOffensePct)}%`:currentActive?`${research.season} active`:'Previous 5']
  ];
  const roles=roleItems(r,pos);
  return `<div class="tso-nfl-research-dashboard">
    <div class="tso-nfl-research-top"><div class="tso-nfl-research-identity"><strong>${esc(r.team)} · ${esc(pos||'PLAYER')}</strong><span>${esc(depthLabel(r,pos))}</span><span class="${statusClass(r)}">${esc(status)}</span>${r.jersey?`<span>#${esc(r.jersey)}</span>`:''}</div><div class="tso-nfl-research-updated">${esc(freshness())}</div></div>
    ${injury}
    <div class="tso-nfl-research-kpis">${kpis.map(([l,v,s])=>`<div class="tso-nfl-research-kpi"><span>${esc(l)}</span><b>${esc(v??'—')}</b><small>${esc(s||'')}</small></div>`).join('')}</div>
    <div class="tso-nfl-research-subgrid"><div class="tso-nfl-research-card"><div class="tso-nfl-research-card-head"><span>Role & Recent Usage</span><small>source-backed</small></div><div class="tso-nfl-role-grid">${roles.map(([l,v])=>`<div><span>${esc(l)}</span><b>${esc(v??'—')}</b></div>`).join('')}</div></div><div class="tso-nfl-research-card"><div class="tso-nfl-research-card-head"><span>Opponent Matchup</span><small>${esc(year)} allowed</small></div>${matchupHTML(r,pos)}</div></div>
    <div class="tso-nfl-research-card"><div class="tso-nfl-research-card-head"><span>Last 5 Completed Games</span><small>${esc(year)} + current when available</small></div>${recentGamesHTML(r,pos)}</div>
    <div class="tso-nfl-research-source2"><b>Research sources:</b> current roster/depth/injury enrichment + nflverse player history/snap counts. TSO Edge, TD Grade and scoring probabilities remain separate model outputs.</div>
  </div>`;
}

function modalIdentity(modal){
  const name=modal.querySelector('header h2')?.textContent?.trim()||'';
  const line=modal.querySelector('header p')?.textContent||'';
  const team=line.split('·')[0]?.trim()||'';
  return {name,team};
}

function enhanceModal(root){
  const modal=root.querySelector('.ms-modal'); if(!modal) return;
  const {name,team}=modalIdentity(modal);
  const r=findResearch({name,team}); if(!r) return;
  const sections=[...modal.querySelectorAll('.ms-sec')];
  const researchSection=sections.find(s=>s.querySelector('.ms-sec-title')?.textContent?.trim().startsWith('Gameday Research'));
  if(!researchSection || researchSection.dataset.tsoResearchV69==='1') return;
  const title=researchSection.querySelector('.ms-sec-title');
  researchSection.innerHTML='';
  researchSection.appendChild(title);
  title.insertAdjacentHTML('afterend',researchDashboardHTML(r));
  researchSection.dataset.tsoResearchV69='1';
}

function enhance(){
  scheduled=false;
  const root=rootRef; if(!root || !research) return;
  enhanceBoardHeaders(root);
  enhanceSlateRows(root);
  enhanceModal(root);
}
function scheduleEnhance(){
  if(scheduled) return; scheduled=true;
  requestAnimationFrame(enhance);
}

export async function mountNflResearchUI(root){
  rootRef=root||document.getElementById('nflView');
  if(!rootRef) return;
  ensureStyles();
  await loadResearch();
  if(!research) return;
  scheduleEnhance();
  if(observer) observer.disconnect();
  observer=new MutationObserver(()=>scheduleEnhance());
  observer.observe(rootRef,{childList:true,subtree:true});
}
