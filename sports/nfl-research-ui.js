/**
 * sports/nfl-research-ui.js — v70 MLB-style NFL player research presentation layer.
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

    /* v70 — NFL Player Modal uses the exact MLB Player Card v2 visual system. */
    .ms-modal-backdrop.tso-mlb-backdrop{background:rgba(5,7,12,.82);backdrop-filter:blur(6px);padding:24px;z-index:1500}
    .ms-modal.tso-mlb-player-shell{width:100%;max-width:760px;max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden;padding:0;background:var(--surface,#081A40);border:1px solid rgba(255,255,255,.10);border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.03) inset}
    .ms-modal.tso-mlb-player-shell>.player-card-v2{width:100%;max-height:100%;flex:1 1 auto;min-height:0}
    .tso-nfl-player-card-v70 .hdr .who{padding-right:6px}
    .tso-nfl-player-card-v70 .hdr{align-items:flex-start}
    .tso-nfl-player-card-v70 .pill-row{max-width:210px;justify-content:flex-end;margin-left:auto}
    .tso-nfl-player-card-v70 .dq-badge.tso{background:rgba(45,127,255,.14);color:#6EDCFF}
    .tso-nfl-player-card-v70 .sec-h .cap{font:700 9px 'JetBrains Mono',monospace;color:var(--faint);letter-spacing:.04em}
    .tso-nfl-player-card-v70 .tso-nfl-hdr-badges{display:inline-flex;gap:5px;vertical-align:middle;margin-left:5px;flex-wrap:wrap}
    .tso-nfl-player-card-v70 .tso-nfl-hdr-badge{display:inline-flex;align-items:center;padding:2px 6px;border-radius:4px;font:800 8px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.04em;background:rgba(62,227,122,.10);color:#3ee37a;border:1px solid rgba(62,227,122,.16)}
    .tso-nfl-player-card-v70 .tso-nfl-hdr-badge.edge{background:rgba(245,200,66,.10);color:#f5c842;border-color:rgba(245,200,66,.18)}
    .tso-nfl-player-card-v70 .tso-nfl-hdr-badge.warn{background:rgba(255,91,91,.10);color:#ff7a7a;border-color:rgba(255,91,91,.18)}
    .tso-nfl-player-card-v70 .bars .b.on .bar{background:linear-gradient(180deg,var(--green-bright),var(--green));box-shadow:0 0 12px rgba(62,227,122,.28)}
    .tso-nfl-player-card-v70 .bars .b.td2 .bar{background:linear-gradient(180deg,#f5c842,#c99411);box-shadow:0 0 12px rgba(245,200,66,.24)}
    .tso-nfl-player-card-v70 .bars .b .bar{background:linear-gradient(180deg,rgba(45,127,255,.55),rgba(45,127,255,.20))}
    .tso-nfl-player-card-v70 .bars .b .v{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.55)}
    .tso-nfl-player-card-v70 .tso-nfl-bar-caption{display:flex;align-items:center;gap:7px;margin-top:8px;font:700 9px 'JetBrains Mono',monospace;color:var(--muted)}
    .tso-nfl-player-card-v70 .tso-nfl-bar-caption i{width:7px;height:7px;border-radius:50%;background:var(--green-bright)}
    .tso-nfl-player-card-v70 .tso-nfl-matchup-photo{width:64px;height:64px;border-radius:50%;object-fit:contain;padding:7px;background:#12294d;border:2px solid rgba(245,200,66,.30)}
    .tso-nfl-player-card-v70 .tso-nfl-matchup-note{font-size:11px;color:var(--muted);line-height:1.5;text-align:center;margin:-3px 0 12px}
    .tso-nfl-player-card-v70 .tso-nfl-split{display:grid;grid-template-columns:1.45fr repeat(5,.7fr);gap:6px;align-items:center;padding:8px;border-radius:6px;background:var(--panel3);font-size:11px;margin-top:2px}
    .tso-nfl-player-card-v70 .tso-nfl-split.head{background:none;color:var(--muted);font:800 8px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.06em;padding-bottom:3px}
    .tso-nfl-player-card-v70 .tso-nfl-split.relevant{background:rgba(45,127,255,.10);border:1px solid rgba(45,127,255,.28)}
    .tso-nfl-player-card-v70 .tso-nfl-split span:not(:first-child){text-align:center;font-family:'JetBrains Mono',monospace;color:#e2e8f0}
    .tso-nfl-player-card-v70 .tso-nfl-split b{color:var(--accent-bright);font-family:'Oswald',sans-serif;font-size:12px}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap{border:1px solid var(--border);border-radius:12px;padding:10px;background:#0a0d14;overflow:hidden}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-map-controls{display:flex;gap:6px;margin:0 0 9px;overflow-x:auto}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-map-controls button{font:700 10px 'JetBrains Mono',monospace;padding:5px 9px;border-radius:6px;background:transparent;color:var(--muted);border:1px solid var(--border);cursor:pointer}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-map-controls button.active{background:var(--accent);color:#fff;border-color:transparent;box-shadow:0 4px 14px var(--accent-glow)}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-nfl-map{height:auto;aspect-ratio:16/9;border-radius:10px;border:1px solid var(--border)}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-route-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-route-stats>div{padding:8px 6px;text-align:center;border:1px solid var(--border);border-radius:8px;background:var(--panel3)}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-route-stats span{display:block;font:800 8px 'JetBrains Mono',monospace;color:var(--muted);text-transform:uppercase}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-route-stats b{display:block;margin-top:4px;font:800 16px 'JetBrains Mono',monospace;color:#fff}
    .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-filtered-note{font-size:10.5px;color:var(--muted);line-height:1.5;margin-top:8px}
    .tso-nfl-player-card-v70 .ab-res.td{color:var(--green-bright)}
    .tso-nfl-player-card-v70 .ab-res.no-td{color:var(--muted)}
    .tso-nfl-player-card-v70 .tso-nfl-table-note{display:flex;align-items:center;gap:7px;margin-bottom:9px;padding:6px 9px;border-radius:8px;background:rgba(45,127,255,.07);border:1px solid rgba(45,127,255,.16);color:var(--muted);font:700 9.5px 'JetBrains Mono',monospace}
    .tso-nfl-player-card-v70 .tso-nfl-table-note b{color:var(--accent-bright)}
    .tso-nfl-player-card-v70 .tso-nfl-source-note{margin-top:10px;font-size:10.5px;color:var(--faint);line-height:1.5}
    .tso-nfl-player-card-v70 .tso-nfl-source-note b{color:var(--accent-bright)}
    .tso-nfl-player-card-v70 .tso-nfl-prop-disabled{opacity:.62}
    @media(max-width:680px){
      .ms-modal-backdrop.tso-mlb-backdrop{padding:8px}
      .ms-modal.tso-mlb-player-shell{max-height:96vh;border-radius:14px}
      .tso-nfl-player-card-v70 .hdr{align-items:center}
      .tso-nfl-player-card-v70 .pill-row{width:100%;max-width:none;justify-content:flex-start;margin-left:0}
      .tso-nfl-player-card-v70 .tso-nfl-split{grid-template-columns:1.2fr repeat(3,.75fr)}
      .tso-nfl-player-card-v70 .tso-nfl-split span:nth-child(5),.tso-nfl-player-card-v70 .tso-nfl-split span:nth-child(6){display:none}
      .tso-nfl-player-card-v70 .tso-nfl-touch-wrap .ms-route-stats{grid-template-columns:repeat(2,1fr)}
    }

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

function textMetric(section,label){
  if(!section) return null;
  for(const div of section.querySelectorAll('.ms-quality>div')){
    const l=div.querySelector('span')?.textContent?.trim().toLowerCase()||'';
    if(l.includes(String(label).toLowerCase())) return div.querySelector('b')?.textContent?.trim()||null;
  }
  return null;
}
function sectionByTitle(modal,title){
  return [...modal.querySelectorAll('.ms-sec')].find(s=>(s.querySelector('.ms-sec-title')?.textContent||'').trim().toLowerCase().startsWith(String(title).toLowerCase()))||null;
}
function numeric(v,fallback=0){ const raw=String(v??'').trim(); if(!raw) return fallback; const x=Number(raw.replace(/[^0-9.-]/g,'')); return Number.isFinite(x)?x:fallback; }
function gradeColor(g){ const u=String(g||'').toUpperCase(); return u.startsWith('A')?'#22c55e':u.startsWith('B')?'#f4c430':u.startsWith('C')?'#ff9f43':'#8b95a8'; }
function gradeHeadline(g){ const u=String(g||'').toUpperCase(); return u.startsWith('A+')?'ELITE SETUP':u.startsWith('A')?'STRONG SPOT':u.startsWith('B')?'PLAYABLE LOOK':u.startsWith('C')?'OK MATCHUP':'TOUGH DRAW'; }
function ringSVG(pct,max=65){
  const C=326.7,M=Math.max(1,max),v=Math.min(M,Math.max(0,Number(pct)||0)),off=(C*Math.max(0,1-v/M)).toFixed(1);
  return `<svg viewBox="0 0 120 120"><circle class="rt" cx="60" cy="60" r="52"/><circle class="rf" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg>`;
}
function pctText(v){ const x=Number(v); return Number.isFinite(x)?`${Math.round(x*100)}%`:'—'; }
function opponentLogo(root,opp){
  const code=normTeam(opp);
  for(const head of root.querySelectorAll('.nfl-team-board-head,.nfl-match-team')){
    const txt=(head.textContent||'').toUpperCase();
    if(!txt.includes(code)) continue;
    const img=head.querySelector('img'); if(img?.src) return img.src;
  }
  return null;
}
function recentValue(g,pos){
  if(pos==='QB') return Number(g.passYds)||0;
  if(pos==='RB') return (Number(g.rushYds)||0)+(Number(g.recYds)||0);
  return Number(g.recYds)||0;
}
function recentBarsMLB(r,pos){
  const rows=[...(r?.last5?.gamesLog||[])].slice(0,5).reverse();
  if(!rows.length) return `<div class="clear">Recent game log unavailable.</div>`;
  const vals=rows.map(g=>recentValue(g,pos)); const mx=Math.max(1,...vals);
  const bars=rows.map((g,i)=>{
    const v=vals[i],h=Math.max(8,Math.round(v/mx*78)),td=Number(g.tds)||0;
    const cls=td>=2?'td2':td===1?'on':'';
    return `<div class="b ${cls}" title="Week ${esc(g.week)} vs ${esc(g.opponent||'—')} · ${v} yards · ${td} TD"><div class="plot"><div class="bar" style="height:${h}%"><span class="v">${v}</span></div></div><div class="xbottom"><div class="xd">W${esc(g.week)}</div><div class="xo">${esc(g.opponent||'—')}</div></div></div>`;
  }).join('');
  return `<div class="bars">${bars}</div><div class="tso-nfl-bar-caption"><i></i><span>Green/gold bars mark games with a touchdown · chart uses source-backed completed-game production.</span></div>`;
}
function productionMetrics(r,pos,snapPct,rzOpps){
  const prev=r?.previousSeason||{},last=r?.last5||{},avg=last.avg||{};
  let items;
  if(pos==='QB') items=[['PASS YDS',prev.passYds],['PASS TD',prev.passTds],['L5 Y/G',avg.passYds],['TD/G',avg.tds],['SNAP%',snapPct],['GAMES',prev.games],['RZ OPPS',rzOpps]];
  else if(pos==='RB') items=[['SCRIM YDS',prev.scrimmageYds],['TD',prev.totalTds],['L5 Y/G',avg.scrimmageYds],['CAR/G',avg.carries],['TGT/G',avg.targets],['SNAP%',snapPct],['RZ OPPS',rzOpps]];
  else items=[['REC YDS',prev.recYds],['TD',prev.totalTds],['L5 Y/G',avg.recYds],['TGT/G',avg.targets],['REC/G',avg.receptions],['SNAP%',snapPct],['RZ OPPS',rzOpps]];
  return `<div class="metrics">${items.map(([l,v],i)=>`<div class="m ${i===1?'c-green':i===5?'c-gold':''}"><div class="v">${esc(v??'—')}${l==='SNAP%'&&v!=='—'?'%':''}</div><div class="l">${esc(l)}</div></div>`).join('')}</div><div class="grid-cap">${esc(String(research?.previousSeason||'Previous season'))} production + latest five completed games + current depth/roster context.</div>`;
}
function recentTableMLB(r,pos){
  const rows=(r?.last5?.gamesLog||[]).slice(0,5);
  if(!rows.length) return `<div class="ab-empty">No completed-game log available.</div>`;
  const tdGames=rows.filter(g=>Number(g.tds)>0).length;
  const totalY=rows.reduce((s,g)=>s+recentValue(g,pos),0);
  const totalTd=rows.reduce((s,g)=>s+(Number(g.tds)||0),0);
  const vol=rows.reduce((s,g)=>s+(pos==='QB'?0:(Number(g.carries)||0)+(Number(g.targets)||0)),0);
  const body=rows.map((g,i)=>`<tr class="${Number(g.tds)>0?'ab-hit':'ab-out'}"><td class="l"><div class="ab-date ${i===0?'new':''}">W${esc(g.week)}<small>vs ${esc(g.opponent||'—')}</small></div></td>${pos==='QB'?`<td>${esc(g.passYds??'—')}</td><td>—</td><td>—</td>`:`<td>${esc(g.carries??'—')}</td><td>${esc(g.targets??'—')}</td><td>${esc(g.receptions??'—')}</td>`}<td>${esc(pos==='QB'?(g.passYds??'—'):(g.rushYds??'—'))}</td><td>${esc(pos==='QB'?'—':(g.recYds??'—'))}</td><td><span class="ab-res ${Number(g.tds)>0?'td':'no-td'}"><i></i>${Number(g.tds)||0} TD</span></td></tr>`).join('');
  return `<div class="ab-sum"><div class="s"><b>${rows.length}</b><small>Games</small></div><div class="s"><b>${tdGames}</b><small>TD Games</small></div><div class="s"><b>${totalY}</b><small>Total Yds</small></div><div class="s"><b>${totalTd}</b><small>Total TD</small></div></div><div class="tso-nfl-table-note"><b>Latest completed games</b><span>· current season + ${esc(String(research?.previousSeason||'previous'))} when needed</span></div><div class="ab-scroll"><table class="ab-table"><thead><tr><th class="l">Game</th>${pos==='QB'?'<th>Pass</th><th>Car</th><th>Tgt</th>':'<th>Car</th><th>Tgt</th><th>Rec</th>'}<th>${pos==='QB'?'Pass Yds':'Rush Yds'}</th><th>Rec Yds</th><th>Result</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function factorRow(label,detail,score,verdict){
  const s=Math.max(0,Math.min(100,Number(score)||50)); const pos=s>=50; const left=pos?50:s; const width=Math.abs(s-50); const cls=pos?'fac-pos':'fac-neg'; const vcls=s>=58?'ver-pos':s<=42?'ver-neg':'ver-neu';
  return `<div class="fac-row"><div><div class="fac-label">${esc(label)}</div><div class="fac-detail">${esc(detail)}</div></div><div class="fac-track"><span class="fac-fill ${cls}" style="left:${left}%;width:${Math.max(2,width)}%"></span></div><div class="fac-verdict ${vcls}">${esc(verdict)}</div></div>`;
}
function whyMLB(r,pos,edge,atd,snapPct,rzOpps){
  const pg=r?.matchup?.previousSeasonAllowed?.perGame||{}, last=r?.last5?.avg||{};
  const snapScore=Math.max(0,Math.min(100,numeric(snapPct,65)));
  const rzScore=Math.max(25,Math.min(90,45+numeric(rzOpps,0)*1.4));
  const formY=pos==='QB'?numeric(last.passYds,0):pos==='RB'?numeric(last.scrimmageYds,0):numeric(last.recYds,0);
  const formScore=Math.max(30,Math.min(85,40+formY/4));
  const matchupScore=Math.max(25,Math.min(85,45+numeric(pg.tds,0)*25));
  return `<div class="why-intro">What's driving tonight's <b>Anytime TD</b> projection — TSO model signal plus source-backed role, recent production and opponent context.</div><div class="phead" style="color:${gradeColor(r?.model?.atdGrade)}"><div class="pgring">${ringSVG(atd,65)}<div class="pg-c">${esc(r?.model?.atdGrade||'—')}</div></div><div class="mid"><div class="lbl">${esc(r.name)} <span>· vs ${esc(r?.matchup?.opponent||r?.opponent||'—')}</span></div><div class="sub">TSO Edge ${esc(edge)} · ${esc(depthLabel(r,pos))} · ${esc(statusLabel(r))}</div></div><div class="pct">${esc(atd)}%</div></div><div class="fac-head"><span>Factor</span><span></span><span>Read</span></div>${factorRow('Snap Share',`${snapPct}% role baseline`,snapScore,snapScore>=70?'PLUS':'EVEN')}${factorRow('Red-Zone Work',`${rzOpps} modeled RZ opportunities`,rzScore,rzScore>=60?'PLUS':'EVEN')}${factorRow('Recent Form',`${fmt1(formY)} yards/game over latest five`,formScore,formScore>=60?'PLUS':'EVEN')}${factorRow('Opponent TD Allowance',`${fmt1(pg.tds)} TD/game allowed to ${esc(pos)}`,matchupScore,matchupScore>=58?'PLUS':'EVEN')}${factorRow('TSO Edge',`Composite matchup signal`,edge,edge>=60?'PLUS':edge<45?'MINUS':'EVEN')}<div class="fac-foot"><b>Read:</b> The scoring probability remains a TSO model output. Roster/depth/injury, completed-game production and snap history are source-backed research inputs.</div>`;
}
function enhanceModal(root){
  const modal=root.querySelector('.ms-modal'); if(!modal || modal.dataset.tsoMlbV70==='1') return;
  const {name,team}=modalIdentity(modal);
  const r=findResearch({name,team}); if(!r) return;
  const pos=String(r.position||'PLAYER').toUpperCase();
  const header=modal.querySelector('header');
  const oldClose=modal.querySelector('[data-nfl-close-modal]');
  const headshot=header?.querySelector('.ms-avatar img')?.src||r.headshot||'';
  const sub=header?.querySelector('p')?.textContent||'';
  const edge=numeric(header?.querySelector('section strong')?.textContent,50);
  const scoring=sectionByTitle(modal,'Scoring Outlook');
  const usage=sectionByTitle(modal,'Usage & Efficiency');
  const atd=numeric(textMetric(scoring,'Anytime TD'),Number(r?.model?.atdProbability||0)*100);
  const firstTd=numeric(textMetric(scoring,'First TD'),0);
  const rzOpps=numeric(textMetric(scoring,'RZ Opportunities'),(Number(r?.model?.rzTargets)||0)+(Number(r?.model?.rzCarries)||0));
  let snapPct=numeric(textMetric(usage,'Snap Share'),Number(r?.model?.snapShare||0)*100);
  if(!snapPct) snapPct=numeric(r?.snapTrend?.avgOffensePct,0);
  const routeHost=modal.querySelector('#nflMapHost'); if(routeHost) routeHost.remove();
  const opp=normTeam(r?.matchup?.opponent||r?.opponent||sub.split('vs ')[1]?.split('·')[0]?.trim()||'');
  const oppLogo=opponentLogo(root,opp);
  const grade=r?.model?.atdGrade||'—'; const col=gradeColor(grade);
  const prev=r?.previousSeason||{},last=r?.last5?.avg||{},pg=r?.matchup?.previousSeasonAllowed?.perGame||{};
  const ydLabel=pos==='QB'?'PASS YDS':pos==='RB'?'SCRIM YDS':'REC YDS';
  const yearYds=pos==='QB'?prev.passYds:pos==='RB'?prev.scrimmageYds:prev.recYds;
  const lastYds=pos==='QB'?last.passYds:pos==='RB'?last.scrimmageYds:last.recYds;
  const status=statusLabel(r); const statClass=statusClass(r)==='warn'?'warn':'';
  const verdictBits=[`${depthLabel(r,pos)} · ${status}`,`${snapPct||'—'}% snap baseline`,`${rzOpps||'—'} red-zone opportunities`];
  if(Number.isFinite(Number(pg.tds))) verdictBits.push(`${fmt1(pg.tds)} TD/g allowed to ${pos}`);
  const opponentPhoto=oppLogo?`<img class="tso-nfl-matchup-photo" src="${esc(oppLogo)}" alt="${esc(opp)}">`:`<div class="tso-nfl-matchup-photo" style="display:grid;place-items:center;font:800 13px 'JetBrains Mono',monospace;color:#f5c842">${esc(opp||'DEF')}</div>`;
  const playerPhoto=headshot?`<img class="hm-img" src="${esc(headshot)}" alt="${esc(name)}">`:`<div class="hm-img" style="display:grid;place-items:center">${esc(name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</div>`;
  modal.closest('.ms-modal-backdrop')?.classList.add('tso-mlb-backdrop');
  modal.classList.add('tso-mlb-player-shell');
  modal.dataset.tsoMlbV70='1';
  modal.innerHTML=`<div class="player-card-v2 tso-nfl-player-card-v70">
    <button class="modal-close" type="button" aria-label="Close">&times;</button>
    <div class="hdr">
      <div class="ava-reticle"><div class="ava">${headshot?`<img src="${esc(headshot)}" alt="${esc(name)}">`:`<span style="display:grid;place-items:center;height:100%;font:700 16px 'Oswald',sans-serif">${esc(name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</span>`}</div></div>
      <div class="who"><h2>${esc(name)} <span class="dq-badge sourced">Sourced</span><span class="tso-nfl-hdr-badges"><span class="tso-nfl-hdr-badge ${statClass}">${esc(depthLabel(r,pos))} · ${esc(status)}</span>${edge>=60?`<span class="tso-nfl-hdr-badge edge">TSO Signal ${edge}</span>`:''}</span></h2><div class="sub">Anytime TD · vs ${esc(opp||'DEF')} · ${esc(team)} ${pos}${r.jersey?` #${esc(r.jersey)}`:''}</div><div class="hdr-stats"><div><b>${snapPct||'—'}${snapPct?'%':''}</b><small>Snap</small></div><div><b>${rzOpps||'—'}</b><small>RZ Opps</small></div><div><b>${esc(yearYds??'—')}</b><small>${esc(ydLabel)}</small></div><div><b>${esc(prev.totalTds??'—')}</b><small>${esc(String(research?.previousSeason||'Prev'))} TD</small></div></div></div>
      <div class="pill-row" id="tsoNflPropSwitch"><button class="pill active" data-mode="atd">ATD</button><button class="pill" data-mode="first">1ST TD</button><button class="pill" data-mode="role">ROLE</button><button class="pill" data-mode="matchup">MATCHUP</button></div>
    </div>
    <div class="sec"><div id="tsoNflVerdict"><div class="verdict"><div class="ring" style="color:${col}">${ringSVG(atd,65)}<div class="ring-c"><div class="ring-g">${esc(grade)}</div><div class="ring-tag">${atd}% ATD</div></div></div><div class="vd-right" style="color:${col}"><div class="vd-head">${gradeHeadline(grade)}</div><div class="vd-body">${atd}% anytime TD for ${esc(name.split(' ').slice(-1)[0])}. ${esc(verdictBits.join(' · '))}.</div><div class="vd-honesty-row"><span class="pv-interval">${esc(String(research?.previousSeason||'Prev'))} baseline</span><span class="pv-pa-note">${esc(freshness())}</span><span class="pv-cal-label pv-cal-underconfident">TSO model</span></div></div></div></div>${recentBarsMLB(r,pos)}<button class="cta" id="tsoNflPropsCta" type="button">Open Anytime TD Board</button></div>
    <div class="sec" id="tso-nfl-factors"><div class="sec-h"><h3>Scoring Factors</h3></div><div class="eng-grid"><div class="eng"><div class="v">${rzOpps||'—'}</div><div class="t">Red-Zone Opportunities</div><div class="d">The highest-value touchdown workload in the model. Carries and targets near the goal line drive scoring access.</div></div><div class="eng"><div class="v" style="color:${numeric(pg.tds,0)>=.7?'var(--green-bright)':'var(--gold)'}">${Number.isFinite(Number(pg.tds))?fmt1(pg.tds):'—'}</div><div class="t">Opponent TD / Game</div><div class="d">${esc(opp||'Opponent')} allowed this many touchdowns per game to the ${esc(pos)} position group in the previous season.</div></div></div><div class="blurb"><b>${esc(name)}</b> combines a ${edge} TSO Edge with a ${snapPct||'—'}% role baseline, ${rzOpps||'—'} red-zone opportunities and ${fmt1(lastYds)} recent yards per game.</div></div>
    <div class="sec"><div class="sec-h"><h3>Production Quality</h3><span class="cap">role · volume · recent form</span></div>${productionMetrics(r,pos,snapPct||'—',rzOpps||'—')}</div>
    <div class="sec matchup-mix-sec" id="tso-nfl-matchup"><div class="sec-h"><h3>Matchup Mix</h3><span class="cap">player role · defense · TSO edge</span></div><div class="hand-matchup"><div class="hm-side"><div class="hm-photo">${playerPhoto}</div><div class="hm-name">${esc(name)}</div><div class="hm-hand-badge hm-bat">${esc(depthLabel(r,pos))} · ${snapPct||'—'}% snap</div></div><div class="hm-vs">VS</div><div class="hm-side"><div class="hm-photo">${opponentPhoto}</div><div class="hm-name">${esc(opp||'Opponent')}</div><div class="hm-hand-badge hm-throw">vs ${esc(pos)}</div></div></div><div class="tso-nfl-matchup-note">Previous-season defense allowed vs this position group, compared with the player's recent role and TSO model signal.</div><div class="tso-nfl-split head"><span>Profile</span><span>Yds/G</span><span>TD/G</span><span>Vol/G</span><span>Snap</span><span>Edge</span></div><div class="tso-nfl-split relevant"><b>${esc(name.split(' ').slice(-1)[0])}</b><span>${fmt1(lastYds)}</span><span>${fmt1(last.tds)}</span><span>${fmt1(pos==='RB'?last.carries:last.targets)}</span><span>${snapPct||'—'}%</span><span>${edge}</span></div><div class="tso-nfl-split"><b>${esc(opp||'DEF')} allowed</b><span>${fmt1(pg.yards)}</span><span>${fmt1(pg.tds)}</span><span>${fmt1(pos==='RB'?pg.carries:pg.targets)}</span><span>—</span><span>${edge>=60?'PLUS':'EVEN'}</span></div></div>
    <div class="sec"><div class="sec-h"><h3>Touch Map</h3><span class="cap">routes · rushes · red zone</span></div><div class="tso-nfl-touch-wrap" id="tsoNflTouchMapHost">${routeHost?'':'<div class="ab-empty">Touch map unavailable.</div>'}</div></div>
    <div class="sec"><div class="sec-h"><h3>Recent Opportunities</h3><span class="cap">completed games</span></div>${recentTableMLB(r,pos)}</div>
    <div class="sec"><div class="sec-h"><h3>Why</h3></div>${whyMLB(r,pos,edge,atd,snapPct||0,rzOpps||0)}</div>
    <div class="foot">Every TSO percentage and grade remains a model output. Roster, depth, injury, snap history and completed-game production are source-backed research inputs.</div>
  </div>`;
  if(routeHost) modal.querySelector('#tsoNflTouchMapHost')?.appendChild(routeHost);
  const newClose=modal.querySelector('.modal-close');
  newClose?.addEventListener('click',()=>oldClose?.click());
  modal.querySelector('#tsoNflPropsCta')?.addEventListener('click',()=>{ oldClose?.click(); setTimeout(()=>window.DW_nflPreviewSelectTab?.('props'),0); });
  modal.querySelectorAll('#tsoNflPropSwitch .pill').forEach(btn=>btn.addEventListener('click',()=>{
    const mode=btn.dataset.mode;
    modal.querySelectorAll('#tsoNflPropSwitch .pill').forEach(b=>b.classList.toggle('active',b===btn));
    if(mode==='role'){ modal.querySelector('#tso-nfl-factors')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if(mode==='matchup'){ modal.querySelector('#tso-nfl-matchup')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    const v=mode==='first'?firstTd:atd;
    const g2=mode==='first'?(v>=18?'A':v>=12?'B+':v>=7?'B':'C'):grade;
    const c2=gradeColor(g2); const tag=mode==='first'?'1ST TD':'ATD';
    const label=mode==='first'?'first touchdown':'anytime touchdown';
    const vh=modal.querySelector('#tsoNflVerdict');
    if(vh) vh.innerHTML=`<div class="verdict"><div class="ring" style="color:${c2}">${ringSVG(v,mode==='first'?30:65)}<div class="ring-c"><div class="ring-g">${esc(g2)}</div><div class="ring-tag">${v}% ${tag}</div></div></div><div class="vd-right" style="color:${c2}"><div class="vd-head">${gradeHeadline(g2)}</div><div class="vd-body">${v}% ${label} probability for ${esc(name.split(' ').slice(-1)[0])}. ${esc(verdictBits.join(' · '))}.</div><div class="vd-honesty-row"><span class="pv-interval">${esc(String(research?.previousSeason||'Prev'))} baseline</span><span class="pv-pa-note">${esc(freshness())}</span><span class="pv-cal-label pv-cal-underconfident">TSO model</span></div></div></div>`;
  }));
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
