/**
 * sports/nfl-research-ui.js — v72 prop-aware MLB-style NFL player research presentation layer.
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
let oddsData = null;
let oddsLoadPromise = null;
let oddsIndex = null;
let oddsEventBound = false;

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


function buildOddsIndex(data){
  const byPairName=new Map(),byPair=new Map();
  for(const g of data?.games||[]){
    const pair=[normTeam(g.away),normTeam(g.home)].sort().join('|');
    byPair.set(pair,g);
    for(const p of g.players||[]){
      const nk=nameKey(p.name); if(!nk) continue;
      byPairName.set(`${pair}|${nk}`,{game:g,player:p});
    }
  }
  return {byPairName,byPair};
}
async function loadOdds(){
  if(oddsData) return oddsData;
  if(oddsLoadPromise) return oddsLoadPromise;
  oddsLoadPromise=(async()=>{
    try{
      const res=await fetch('./slates/nfl-odds.json',{cache:'no-cache'});
      if(!res.ok) throw new Error(`NFL odds ${res.status}`);
      oddsData=await res.json();
      oddsIndex=buildOddsIndex(oddsData);
      return oddsData;
    }catch(err){
      console.warn('[NFL research UI] odds feed unavailable:',err);
      return null;
    }
  })();
  return oddsLoadPromise;
}
function findOddsGame(r){
  if(!oddsIndex||!r) return null;
  const team=normTeam(r.team),opp=normTeam(r?.matchup?.opponent||r?.opponent||'');
  if(!team||!opp) return null;
  const pair=[team,opp].sort().join('|');
  return oddsIndex.byPair?.get(pair)||null;
}
function findOddsPlayer(r){
  if(!oddsIndex||!r) return null;
  const team=normTeam(r.team),opp=normTeam(r?.matchup?.opponent||r?.opponent||'');
  if(!team||!opp) return null;
  const pair=[team,opp].sort().join('|');
  return oddsIndex.byPairName.get(`${pair}|${nameKey(r.name)}`)||null;
}

function findPreviewWagerMeta(r){
  if(typeof window==='undefined'||!r) return null;
  const store=window.DW_NFL_WAGER_META||null; if(!store) return null;
  const id=r.espnId!=null?String(r.espnId):'';
  if(id&&store.byEspnId?.[id]) return store.byEspnId[id];
  const key=`${normTeam(r.team)}|${nameKey(r.name)}`;
  return store.byTeamName?.[key]||null;
}

function findPreviewPropResult(r,key){
  if(typeof window==='undefined'||!r||!key||typeof window.DW_NFL_PROP_RESULT!=='function') return null;
  try{
    return window.DW_NFL_PROP_RESULT({
      id:r.espnId||r.gsisId||r.id||null,
      name:r.name,
      team:r.team,
      prop:key
    })||null;
  }catch(err){
    console.warn('[NFL research UI] canonical prop result unavailable:',err);
    return null;
  }
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
  if(document.getElementById('tso-nfl-research-ui-v72')) return;
  const style=document.createElement('style');
  style.id='tso-nfl-research-ui-v72';
  style.textContent=`
    /* v86.2 selected-prop sportsbook odds */
    .tso-nfl-prop-odds-strip{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap;margin:10px 0 2px;padding:0}
    .tso-nfl-prop-odds-strip:empty{display:none}
    .tso-nfl-prop-odds-chip{display:flex;flex-direction:column;justify-content:center;min-width:108px;min-height:50px;padding:8px 11px;border:1px solid rgba(120,176,239,.18);border-radius:9px;background:rgba(5,23,49,.58)}
    .tso-nfl-prop-odds-chip span{font:800 7px 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:#7597bf}
    .tso-nfl-prop-odds-chip b{margin-top:3px;font:800 15px/1 'Oswald',sans-serif;color:#fff}
    .tso-nfl-prop-odds-chip em{margin-top:3px;font:700 8px 'JetBrains Mono',monospace;color:#8fb2da;font-style:normal}
    .tso-nfl-prop-odds-chip.best{border-color:rgba(34,197,94,.32);background:rgba(5,63,43,.24)}
    .tso-nfl-prop-odds-chip.best b{color:#58e89a;font-size:18px}
    .tso-nfl-prop-odds-chip.edge b.pos{color:#58e89a}.tso-nfl-prop-odds-chip.edge b.neg{color:#ff9f43}
    .tso-nfl-prop-odds-pending{width:100%;padding:9px 11px;border:1px dashed rgba(120,176,239,.23);border-radius:9px;background:rgba(5,23,49,.34);font:800 8px 'JetBrains Mono',monospace;letter-spacing:.04em;color:#829fc1;text-transform:uppercase}
    @media(max-width:620px){.tso-nfl-prop-odds-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.tso-nfl-prop-odds-chip{min-width:0}.tso-nfl-prop-odds-pending{grid-column:1/-1}}

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

    /* v71 — NFL Player Modal uses the MLB Player Card v2 visual system. */
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
    .tso-nfl-player-card-v70 .tso-nfl-data-viz{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.35fr);gap:12px}
    .tso-nfl-player-card-v70 .tso-nfl-viz-card{border:1px solid var(--border);border-radius:12px;background:linear-gradient(180deg,rgba(12,32,61,.78),rgba(7,22,43,.94));overflow:hidden;min-width:0}
    .tso-nfl-player-card-v70 .tso-nfl-viz-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line)}
    .tso-nfl-player-card-v70 .tso-nfl-viz-head b{font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:.05em;color:var(--accent-bright)}
    .tso-nfl-player-card-v70 .tso-nfl-viz-head span{font:700 8px 'JetBrains Mono',monospace;color:var(--faint);text-transform:uppercase;letter-spacing:.05em}
    .tso-nfl-player-card-v70 .tso-nfl-role-visual{padding:13px}
    .tso-nfl-player-card-v70 .tso-nfl-role-top{display:grid;grid-template-columns:106px 1fr;gap:13px;align-items:center}
    .tso-nfl-player-card-v70 .tso-nfl-role-ring{position:relative;width:98px;height:98px;color:var(--accent-bright)}
    .tso-nfl-player-card-v70 .tso-nfl-role-ring svg{position:absolute;inset:0;width:100%;height:100%}.tso-nfl-player-card-v70 .tso-nfl-role-ring .rt{fill:none;stroke:rgba(255,255,255,.08);stroke-width:8}.tso-nfl-player-card-v70 .tso-nfl-role-ring .rf{fill:none;stroke:currentColor;stroke-width:8;stroke-linecap:round;filter:drop-shadow(0 0 6px currentColor)}
    .tso-nfl-player-card-v70 .tso-nfl-role-ring-copy{position:absolute;inset:0;display:grid;place-items:center;text-align:center;align-content:center}.tso-nfl-player-card-v70 .tso-nfl-role-ring-copy b{font:700 24px 'Oswald',sans-serif;color:#fff;line-height:1}.tso-nfl-player-card-v70 .tso-nfl-role-ring-copy span{margin-top:4px;font:800 8px 'JetBrains Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
    .tso-nfl-player-card-v70 .tso-nfl-role-mini{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.tso-nfl-player-card-v70 .tso-nfl-role-mini div{padding:8px;border:1px solid rgba(255,255,255,.06);border-radius:8px;background:rgba(4,17,38,.45)}.tso-nfl-player-card-v70 .tso-nfl-role-mini span{display:block;font:800 7px 'JetBrains Mono',monospace;color:var(--faint);text-transform:uppercase}.tso-nfl-player-card-v70 .tso-nfl-role-mini b{display:block;margin-top:4px;font:700 16px 'Oswald',sans-serif;color:#fff}
    .tso-nfl-player-card-v70 .tso-nfl-mix{margin-top:12px}.tso-nfl-player-card-v70 .tso-nfl-mix-labels{display:flex;justify-content:space-between;gap:10px;font:800 8px 'JetBrains Mono',monospace;color:var(--muted)}.tso-nfl-player-card-v70 .tso-nfl-mix-labels b{color:#fff}.tso-nfl-player-card-v70 .tso-nfl-mix-track{display:flex;height:12px;margin-top:6px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.06)}.tso-nfl-player-card-v70 .tso-nfl-mix-track i{display:block;height:100%}.tso-nfl-player-card-v70 .tso-nfl-mix-track i:first-child{background:linear-gradient(90deg,var(--accent),var(--accent-bright))}.tso-nfl-player-card-v70 .tso-nfl-mix-track i:last-child{background:linear-gradient(90deg,#c99411,#f5c842)}
    .tso-nfl-player-card-v70 .tso-nfl-compare{padding:12px}.tso-nfl-player-card-v70 .tso-nfl-compare-row{display:grid;grid-template-columns:100px minmax(0,1fr) 58px;gap:9px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.055)}.tso-nfl-player-card-v70 .tso-nfl-compare-row:last-child{border-bottom:0}.tso-nfl-player-card-v70 .tso-nfl-compare-label{font:800 8px 'JetBrains Mono',monospace;color:var(--muted);text-transform:uppercase}.tso-nfl-player-card-v70 .tso-nfl-compare-bars{display:flex;flex-direction:column;gap:5px}.tso-nfl-player-card-v70 .tso-nfl-compare-line{display:grid;grid-template-columns:26px 1fr 42px;gap:6px;align-items:center}.tso-nfl-player-card-v70 .tso-nfl-compare-line small{font:800 7px 'JetBrains Mono',monospace;color:var(--faint)}.tso-nfl-player-card-v70 .tso-nfl-compare-line strong{font:800 9px 'JetBrains Mono',monospace;color:#fff;text-align:right}.tso-nfl-player-card-v70 .tso-nfl-compare-track{height:7px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}.tso-nfl-player-card-v70 .tso-nfl-compare-track i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent-bright))}.tso-nfl-player-card-v70 .tso-nfl-compare-line.opp .tso-nfl-compare-track i{background:linear-gradient(90deg,#c99411,#f5c842)}.tso-nfl-player-card-v70 .tso-nfl-compare-read{font:700 8px 'JetBrains Mono',monospace;text-align:right;color:var(--muted)}.tso-nfl-player-card-v70 .tso-nfl-compare-read.plus{color:var(--green-bright)}.tso-nfl-player-card-v70 .tso-nfl-compare-read.minus{color:#ff7a7a}
    .tso-nfl-player-card-v70 .tso-nfl-chart-host .bars-toolbar{margin-top:0}.tso-nfl-player-card-v70 .tso-nfl-chart-host .clear{min-height:18px}.tso-nfl-player-card-v70 .tso-nfl-chart-host .venue-filters .chip{min-width:58px}
    .tso-nfl-player-card-v70 .ab-res.td{color:var(--green-bright)}
    .tso-nfl-player-card-v70 .ab-res.no-td{color:var(--muted)}
    .tso-nfl-player-card-v70 .tso-nfl-table-note{display:flex;align-items:center;gap:7px;margin-bottom:9px;padding:6px 9px;border-radius:8px;background:rgba(45,127,255,.07);border:1px solid rgba(45,127,255,.16);color:var(--muted);font:700 9.5px 'JetBrains Mono',monospace}
    .tso-nfl-player-card-v70 .tso-nfl-table-note b{color:var(--accent-bright)}
    .tso-nfl-player-card-v70 .tso-nfl-source-note{margin-top:10px;font-size:10.5px;color:var(--faint);line-height:1.5}
    .tso-nfl-player-card-v70 .tso-nfl-source-note b{color:var(--accent-bright)}
    .tso-nfl-player-card-v70 .tso-nfl-prop-disabled{opacity:.62}
    .tso-nfl-player-card-v72 .tso-nfl-prop-switch{display:flex;justify-content:flex-end;align-items:flex-start;align-content:flex-start;gap:5px;flex-wrap:wrap;max-width:315px;margin-left:auto}
    .tso-nfl-player-card-v72 .tso-nfl-prop-switch .pill{min-width:auto;padding:6px 8px;font-size:8px;white-space:nowrap}
    .tso-nfl-player-card-v72 .tso-nfl-prop-switch .pill.active{background:var(--accent);color:#fff;border-color:var(--accent-bright);box-shadow:0 5px 16px var(--accent-glow)}
    .tso-nfl-player-card-v72 #tsoNflSlipHost{margin-top:10px}
    .tso-nfl-player-card-v72 #tsoNflSlipHost .cta{width:100%;margin:0;font-family:'JetBrains Mono',monospace;font-weight:900;letter-spacing:.025em}
    .tso-nfl-player-card-v72 #tsoNflSlipHost .cta.in-slip{background:var(--green-bright);color:#08120c;border-color:var(--green-bright)}
    .tso-nfl-player-card-v72 .hdr-stats{transition:opacity .14s ease}
    @media(max-width:680px){
      .ms-modal-backdrop.tso-mlb-backdrop{padding:8px}
      .ms-modal.tso-mlb-player-shell{max-height:96vh;border-radius:14px}
      .tso-nfl-player-card-v70 .hdr{align-items:center}
      .tso-nfl-player-card-v70 .pill-row{width:100%;max-width:none;justify-content:flex-start;margin-left:0}
      .tso-nfl-player-card-v72 .tso-nfl-prop-switch{width:100%;max-width:none;flex-wrap:nowrap;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}
      .tso-nfl-player-card-v72 .tso-nfl-prop-switch::-webkit-scrollbar{display:none}
      .tso-nfl-player-card-v70 .tso-nfl-split{grid-template-columns:1.2fr repeat(3,.75fr)}
      .tso-nfl-player-card-v70 .tso-nfl-split span:nth-child(5),.tso-nfl-player-card-v70 .tso-nfl-split span:nth-child(6){display:none}
      .tso-nfl-player-card-v70 .tso-nfl-data-viz{grid-template-columns:1fr}
      .tso-nfl-player-card-v70 .tso-nfl-role-top{grid-template-columns:92px 1fr}
      .tso-nfl-player-card-v70 .tso-nfl-role-ring{width:86px;height:86px}
      .tso-nfl-player-card-v70 .tso-nfl-compare-row{grid-template-columns:86px minmax(0,1fr) 52px}
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
function clampNum(v,a,b){ return Math.max(a,Math.min(b,Number(v)||0)); }
function roundHalf(v){ const x=Number(v); return Number.isFinite(x)?Math.round(x*2)/2:null; }
function fmtLine(v){ const x=Number(v); return Number.isFinite(x)?(Number.isInteger(x)?String(x):x.toFixed(1)):'—'; }
function fmtAmericanPrice(v){ const x=Number(v); return Number.isFinite(x)?(x>0?`+${x}`:`${x}`):''; }
function impliedFromAmerican(v){
  const x=Number(v);
  if(!Number.isFinite(x)||x===0) return null;
  return x>0 ? 100/(x+100) : (-x)/((-x)+100);
}

const NFL_PROP_META={
  atd:{button:'ATD',label:'Anytime TD',market:'ANYTIME TD',unit:'TD',oddsKey:'atd'},
  firstTd:{button:'1ST TD',label:'First TD',market:'FIRST TD',unit:'TD',oddsKey:'firstTd'},
  rushYds:{button:'RUSH YDS',label:'Rushing Yards',market:'RUSHING YARDS',unit:'YDS',oddsKey:'rushYds'},
  recYds:{button:'REC YDS',label:'Receiving Yards',market:'RECEIVING YARDS',unit:'YDS',oddsKey:'recYds'},
  receptions:{button:'REC',label:'Receptions',market:'RECEPTIONS',unit:'REC',oddsKey:'receptions'},
  scrimYds:{button:'R+R YDS',label:'Rush + Rec Yards',market:'RUSH + REC YARDS',unit:'YDS',oddsKey:null},
  passYds:{button:'PASS YDS',label:'Passing Yards',market:'PASSING YARDS',unit:'YDS',oddsKey:'passYds'},
  passTds:{button:'PASS TD',label:'Passing TDs',market:'PASSING TDS',unit:'TD',oddsKey:'passTds'},
  completions:{button:'COMP',label:'Completions',market:'COMPLETIONS',unit:'COMP',oddsKey:'completions'},
};
function propsForPosition(pos){
  if(pos==='QB') return ['atd','firstTd','passYds','passTds','completions','rushYds'];
  if(pos==='RB'||pos==='HB'||pos==='FB') return ['atd','firstTd','rushYds','recYds','receptions','scrimYds'];
  return ['atd','firstTd','recYds','receptions','scrimYds'];
}
function recentHistoryRows(r){
  const full=Array.isArray(r?.gameLog)?r.gameLog:[];
  if(full.length) return [...full];
  return [...(r?.last5?.gamesLog||[])];
}
function propGameValue(g,key){
  if(key==='atd'||key==='firstTd') return Number(g.tds)||0;
  if(key==='rushYds') return Number(g.rushYds)||0;
  if(key==='recYds') return Number(g.recYds)||0;
  if(key==='receptions') return Number(g.receptions)||0;
  if(key==='scrimYds') return Number(g.scrimmageYds ?? ((Number(g.rushYds)||0)+(Number(g.recYds)||0)))||0;
  if(key==='passYds') return Number(g.passYds)||0;
  if(key==='passTds') return Number(g.passTds)||0;
  if(key==='completions') return Number(g.completions)||0;
  return 0;
}
function propSeasonPg(r,key){
  const s=r?.previousSeason||{},pg=s.perGame||{},games=Math.max(1,Number(s.games)||1);
  if(key==='atd'||key==='firstTd') return Number(pg.tds ?? ((Number(s.rushTds)||0)+(Number(s.recTds)||0))/games)||0;
  if(key==='rushYds') return Number(pg.rushYds ?? (Number(s.rushYds)||0)/games)||0;
  if(key==='recYds') return Number(pg.recYds ?? (Number(s.recYds)||0)/games)||0;
  if(key==='receptions') return Number(pg.receptions ?? (Number(s.receptions)||0)/games)||0;
  if(key==='scrimYds') return Number(pg.scrimmageYds ?? (Number(s.scrimmageYds)||0)/games)||0;
  if(key==='passYds') return Number(pg.passYds ?? (Number(s.passYds)||0)/games)||0;
  if(key==='passTds') return Number(pg.passTds ?? (Number(s.passTds)||0)/games)||0;
  if(key==='completions') return Number(pg.completions ?? (Number(s.completions)||0)/games)||0;
  return 0;
}
function propSeasonTotal(r,key){
  const s=r?.previousSeason||{};
  if(key==='atd'||key==='firstTd') return Number(s.totalTds)||0;
  if(key==='rushYds') return Number(s.rushYds)||0;
  if(key==='recYds') return Number(s.recYds)||0;
  if(key==='receptions') return Number(s.receptions)||0;
  if(key==='scrimYds') return Number(s.scrimmageYds)||0;
  if(key==='passYds') return Number(s.passYds)||0;
  if(key==='passTds') return Number(s.passTds)||0;
  if(key==='completions') return Number(s.completions)||0;
  return 0;
}
function propRecentAvg(r,key){
  const a=r?.last5?.avg||{};
  if(key==='atd'||key==='firstTd') return Number(a.tds)||0;
  if(key==='rushYds') return Number(a.rushYds)||0;
  if(key==='recYds') return Number(a.recYds)||0;
  if(key==='receptions') return Number(a.receptions)||0;
  if(key==='scrimYds') return Number(a.scrimmageYds)||0;
  if(key==='passYds') return Number(a.passYds)||0;
  if(key==='passTds') return Number(a.passTds)||0;
  if(key==='completions') return Number(a.completions)||0;
  return 0;
}
function propDefenseAvg(r,key){
  const pg=r?.matchup?.previousSeasonAllowed?.perGame||{};
  if(key==='atd'||key==='firstTd') return Number(pg.tds)||0;
  if(key==='rushYds') return Number(pg.rushYds)||0;
  if(key==='recYds') return Number(pg.recYds)||0;
  if(key==='receptions') return Number(pg.receptions)||0;
  if(key==='scrimYds') return Number(pg.yards)||0;
  if(key==='passYds') return Number(pg.passYds)||0;
  if(key==='passTds') return Number(pg.passTds ?? pg.tds)||0;
  if(key==='completions') return Number(pg.completions)||0;
  return 0;
}
function propVolume(r,key){
  const a=r?.last5?.avg||{};
  if(key==='rushYds') return {label:'Carries/G',player:Number(a.carries)||0,def:Number(r?.matchup?.previousSeasonAllowed?.perGame?.carries)||0};
  if(key==='recYds'||key==='receptions') return {label:'Targets/G',player:Number(a.targets)||0,def:Number(r?.matchup?.previousSeasonAllowed?.perGame?.targets)||0};
  if(key==='scrimYds') return {label:'Touches+Tgt/G',player:(Number(a.carries)||0)+(Number(a.targets)||0),def:(Number(r?.matchup?.previousSeasonAllowed?.perGame?.carries)||0)+(Number(r?.matchup?.previousSeasonAllowed?.perGame?.targets)||0)};
  if(key==='passYds'||key==='passTds'||key==='completions') return {label:'Attempts/G',player:Number(a.attempts)||0,def:Number(r?.matchup?.previousSeasonAllowed?.perGame?.attempts)||0};
  return {label:'TD/G',player:Number(a.tds)||0,def:Number(r?.matchup?.previousSeasonAllowed?.perGame?.tds)||0};
}
const NFL_SPORTSBOOKS=/^(bovada|caesars|draftkings|fanduel|fanatics|fliff|hard rock(?: bet)?|parx(?: casino)?|bet365|betmgm|espn bet|pinnacle|betrivers|pmu|unibet|sportsbet|rushbet)$/i;
function isNflSportsbookOffer(o){return !!o&&NFL_SPORTSBOOKS.test(String(o.book||'').trim());}
function bestNflSportsbook(list){return [...(list||[])].filter(isNflSportsbookOffer).filter(x=>Number.isFinite(Number(x.price))).sort((a,b)=>Number(b.price)-Number(a.price))[0]||null;}
function propOddsOffer(r,key){
  const hit=findOddsPlayer(r); if(!hit) return null;
  const game=hit.game||findOddsGame(r);
  const meta=NFL_PROP_META[key], slot=meta?.oddsKey ? hit.player?.odds?.[meta.oddsKey] : null;
  if(!slot) return null;
  const common={source:'Sportsbook',gameId:game?.gameId||null,eventId:game?.fixtureId||null,startDateUTC:game?.startDateUTC||null};
  if(key==='atd'||key==='firstTd'){
    const best=bestNflSportsbook(slot.all)||(isNflSportsbookOffer(slot.best)?slot.best:null);
    return best?{line:.5,...best,...common}:null;
  }
  const best=bestNflSportsbook(slot.over?.all)||(isNflSportsbookOffer(slot.over?.best)?slot.over.best:null);
  return best&&Number.isFinite(Number(slot.line))?{line:Number(slot.line),...best,...common}:null;
}
function defaultResearchLine(key,seasonPg,recent){
  if(key==='atd'||key==='firstTd') return .5;
  if(key==='passTds') return roundHalf(seasonPg||recent||1.5) ?? 1.5;
  const baseline=seasonPg>0?seasonPg:recent;
  if(!(baseline>0)) return ({rushYds:39.5,recYds:34.5,receptions:3.5,scrimYds:59.5,passYds:224.5,completions:20.5}[key] ?? .5);
  return Math.floor(Math.max(0,baseline))+.5;
}
function researchProjection(key,seasonPg,recent){
  if(key==='atd'||key==='firstTd') return recent;
  if(recent>0&&seasonPg>0) return +(recent*.65+seasonPg*.35).toFixed(key==='receptions'||key==='passTds'||key==='completions'?1:1);
  return +(recent||seasonPg||0).toFixed(1);
}
function gradeFromProbability(p){ return p>=70?'A+':p>=65?'A':p>=61?'A-':p>=57?'B+':p>=54?'B':p>=51?'B-':p>=48?'C+':'C'; }
function gradeFromAtdProbability(p){ return p>=48?'A+':p>=41?'A':p>=35?'A-':p>=29?'B+':p>=23?'B':'C+'; }

function propContext(r,key,{atd=0,firstTd=0,edge=50}={}){
  const meta=NFL_PROP_META[key]||NFL_PROP_META.atd;
  const seasonPg=propSeasonPg(r,key), recent=propRecentAvg(r,key), defense=propDefenseAvg(r,key);
  const canonical=findPreviewPropResult(r,key);
  const researchOffer=propOddsOffer(r,key);
  const canonicalOffer=canonical?.offer?.price!=null&&Number.isFinite(Number(canonical.offer.price))?canonical.offer:null;
  const offer=canonicalOffer||researchOffer;
  const fallbackLine=offer?.line ?? defaultResearchLine(key,seasonPg,recent);
  const canonicalLine=canonical?.line!=null&&Number.isFinite(Number(canonical.line))?Number(canonical.line):null;
  const line=canonicalLine!=null?canonicalLine:fallbackLine;

  if(canonical?.prob!=null&&Number.isFinite(Number(canonical.prob))){
    const raw=Number(canonical.prob);
    const prob=clampNum(raw<=1.0001?raw*100:raw,0,99.9);
    const cp=canonical.projection!=null?Number(canonical.projection):NaN;
    const projection=Number.isFinite(cp)?cp:((key==='atd'||key==='firstTd')?prob:researchProjection(key,seasonPg,recent));
    return {
      key,meta,line,projection,prob:+prob.toFixed(1),
      grade:canonical.grade||((key==='atd')?gradeFromAtdProbability(prob):gradeFromProbability(prob)),
      seasonPg,recent,defense,offer,
      lineSource:offer?'Sportsbook':((key==='atd'||key==='firstTd')?'TSO model':'TSO research line'),
      canonical:true,simUsed:!!canonical.simUsed,
      modelProb:canonical.modelProb,simProb:canonical.simProb
    };
  }

  // Fallback only if preview has not mounted yet.
  if(key==='atd'){
    const prob=clampNum(atd,0,99);
    return {key,meta,line,projection:prob,prob,grade:gradeFromAtdProbability(prob),seasonPg,recent,defense,offer,lineSource:offer?'Sportsbook':'TSO model'};
  }
  if(key==='firstTd'){
    const prob=clampNum(firstTd,0,99);
    return {key,meta,line,projection:prob,prob,grade:prob>=18?'A':prob>=13?'B+':prob>=8?'B':'C',seasonPg,recent,defense,offer,lineSource:offer?'Sportsbook':'TSO model'};
  }
  const projection=researchProjection(key,seasonPg,recent);
  const scale=key==='receptions'?1.6:key==='passTds'?0.7:key==='completions'?3.5:Math.max(7,Math.abs(line)*.16);
  const prob=clampNum(50+((projection-line)/Math.max(.5,scale))*15,25,75);
  return {key,meta,line,projection,prob:+prob.toFixed(0),grade:gradeFromProbability(prob),seasonPg,recent,defense,offer,lineSource:offer?'Sportsbook':'TSO research line'};
}
function lineResult(value,ctx){
  if(ctx.key==='atd'||ctx.key==='firstTd') return Number(value)>0;
  return Number(value)>Number(ctx.line);
}
function selectedPropLabel(ctx){ return `${ctx.meta.label}${ctx.key==='atd'||ctx.key==='firstTd'?'':` · O ${fmtLine(ctx.line)}`}`; }
function propHeaderStats(r,ctx,snapPct,rzOpps){
  const seasonTotal=propSeasonTotal(r,ctx.key),vol=propVolume(r,ctx.key);
  if(ctx.key==='atd'||ctx.key==='firstTd') return [
    [ctx.key==='atd'?`${ctx.prob}%`:`${ctx.prob}%`,ctx.meta.button],
    [r?.last5?.tdGames??'—','TD Games L5'],
    [rzOpps||'—','RZ Opps'],
    [Number.isFinite(ctx.defense)?fmt1(ctx.defense):'—','Opp TD/G']
  ];
  return [[fmt1(ctx.recent),'L5 Avg'],[fmtLine(ctx.line),'Line'],[fmt1(ctx.seasonPg),'Season Avg'],[fmt1(ctx.defense),`Opp ${ctx.meta.unit}/G`]];
}

function propOddsStripHTML(ctx){
  const price=ctx?.offer?.price!=null?Number(ctx.offer.price):NaN;
  if(!Number.isFinite(price)){
    return `<div class="tso-nfl-prop-odds-pending">${esc(ctx?.meta?.label||'Prop')} · Sportsbook odds pending</div>`;
  }
  const implied=impliedFromAmerican(price);
  const impliedPct=implied==null?null:implied*100;
  const edge=impliedPct==null?null:Number(ctx.prob)-impliedPct;
  const lineLabel=(ctx.key==='atd'||ctx.key==='firstTd')
    ? ctx.meta.label
    : `Over ${fmtLine(ctx.line)} ${ctx.meta.unit}`;
  return `
    <div class="tso-nfl-prop-odds-chip best"><span>Best sportsbook odds</span><b>${esc(fmtAmericanPrice(price))}</b><em>${esc(ctx.offer?.book||'Sportsbook')}</em></div>
    <div class="tso-nfl-prop-odds-chip"><span>Market</span><b>${esc(lineLabel)}</b><em>Current posted line</em></div>
    <div class="tso-nfl-prop-odds-chip"><span>Book implied</span><b>${impliedPct==null?'—':impliedPct.toFixed(1)+'%'}</b><em>From American odds</em></div>
    <div class="tso-nfl-prop-odds-chip edge"><span>TSO edge</span><b class="${edge!=null&&edge>=0?'pos':'neg'}">${edge==null?'—':(edge>=0?'+':'')+edge.toFixed(1)+' pts'}</b><em>TSO probability vs book</em></div>`;
}

function propVerdictHTML(r,ctx,name,edge,snapPct,rzOpps){
  const col=gradeColor(ctx.grade),last=name.split(' ').slice(-1)[0];
  const source=ctx.offer?`${ctx.offer.book||'Book'} ${fmtAmericanPrice(ctx.offer.price)}`:ctx.lineSource;
  let body;
  if(ctx.key==='atd'||ctx.key==='firstTd') body=`${ctx.prob}% ${ctx.meta.label.toLowerCase()} probability for ${last}. ${depthLabel(r,r.position)} · ${snapPct||'—'}% snap baseline · ${rzOpps||'—'} red-zone opportunities · ${fmt1(ctx.defense)} TD/g allowed by the matchup position group.`;
  else body=`${last} projects for ${fmt1(ctx.projection)} ${ctx.meta.unit.toLowerCase()} against an over line of ${fmtLine(ctx.line)}. L5: ${fmt1(ctx.recent)} · season: ${fmt1(ctx.seasonPg)} · ${r?.matchup?.opponent||'opponent'} allowed: ${fmt1(ctx.defense)} ${ctx.meta.unit.toLowerCase()}/game.`;
  const tag=ctx.key==='atd'||ctx.key==='firstTd'?`${ctx.prob}% ${ctx.meta.button}`:`${ctx.prob}% OVER`;
  return `<div class="verdict"><div class="ring" style="color:${col}">${ringSVG(ctx.prob,100)}<div class="ring-c"><div class="ring-g">${esc(ctx.grade)}</div><div class="ring-tag">${esc(tag)}</div></div></div><div class="vd-right" style="color:${col}"><div class="vd-head">${gradeHeadline(ctx.grade)}</div><div class="vd-body">${esc(body)}</div><div class="vd-honesty-row"><span class="pv-interval">${esc(selectedPropLabel(ctx))}</span><span class="pv-pa-note">${esc(source)}</span><span class="pv-cal-label pv-cal-underconfident">${ctx.key==='atd'||ctx.key==='firstTd'?'TSO model':'Research lean'}</span></div></div></div>`;
}
function recentBarsMLB(r,pos,ctx,range='5',venue='all'){
  const RANGES=[['5','L5'],['10','L10'],['15','L15'],['30','L30'],['26',"'26"],['25',"'25"],['h2h','H2H']];
  const all=recentHistoryRows(r),opp=normTeam(r?.matchup?.opponent||r?.opponent||'');
  const chips=RANGES.map(([k,l])=>`<button class="chip ${String(range)===k?'on':''}" data-nfl-chart-range="${k}">${l}</button>`).join('');
  const hasVenue=all.some(g=>g.homeAway==='home'||g.homeAway==='away');
  const venueChips=hasVenue?['home','away'].map(v=>`<button class="chip ${venue===v?'on':''}" data-nfl-chart-venue="${v}">${v==='home'?'Home':'Away'}</button>`).join(''):'';
  const toolbar=`<div class="bars-toolbar"><div class="filters">${chips}</div>${venueChips?`<div class="venue-filters">${venueChips}</div>`:''}</div>`;
  if(!all.length) return `${toolbar}<div class="clear">Recent game log unavailable.</div>`;
  let rows;
  if(range==='h2h') rows=all.filter(g=>!opp||normTeam(g.opponent)===opp);
  else if(range==='25'||range==='26') rows=all.filter(g=>String(g.season).slice(-2)===range);
  else rows=all.slice(0,Math.max(1,parseInt(range,10)||5));
  if(venue==='home'||venue==='away') rows=rows.filter(g=>g.homeAway===venue);
  rows=[...rows].sort((a,b)=>(Number(a.season||0)-Number(b.season||0))||(Number(a.week||0)-Number(b.week||0)));
  const rangeLabel=range==='h2h'?`H2H${opp?` vs ${opp}`:''}`:range==='25'?'2025':range==='26'?'2026':`Last ${range}`;
  const venueLabel=venue==='home'?'Home':venue==='away'?'Away':'';
  if(!rows.length) return `${toolbar}<div class="clear">No ${[rangeLabel,venueLabel].filter(Boolean).join(' · ')} games available.</div>`;
  const vals=rows.map(g=>propGameValue(g,ctx.key)),mx=Math.max(1,...vals,Number(ctx.line)||0),hits=rows.filter((g,i)=>lineResult(vals[i],ctx)).length;
  const avg=vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length),n=rows.length,gap=n>20?2:n>10?4:6;
  const bars=rows.map((g,i)=>{
    const v=vals[i],h=v>0?Math.max(8,Math.round(v/mx*88)):5,hit=lineResult(v,ctx),big=hit&&v>(Number(ctx.line)||0)*1.35;
    const date=g.date?String(g.date).slice(5):`W${g.week}`;
    const title=[g.date||`Week ${g.week}`,`vs ${g.opponent||'—'}`,g.homeAway?g.homeAway==='home'?'Home':'Away':'',`${v} ${ctx.meta.unit}`,`${hit?'OVER':'UNDER'} ${fmtLine(ctx.line)}`].filter(Boolean).join(' · ');
    return `<div class="b ${big?'td2':hit?'on':''}" title="${esc(title)}"><div class="plot"><div class="bar" style="height:${h}%"><span class="v">${fmt1(v)}</span></div></div><div class="xbottom"><div class="xd">${esc(date)}</div><div class="xo">${esc(g.opponent||'—')}</div></div></div>`;
  }).join('');
  const caveat=ctx.key==='firstTd'?' · completed-game source tracks TDs, not first-TD sequence':'';
  return `${toolbar}<div class="clear">${esc([rangeLabel,venueLabel,`${fmt1(avg)} avg ${ctx.meta.unit.toLowerCase()}`,`${hits}/${rows.length} over ${fmtLine(ctx.line)}`].filter(Boolean).join(' · ')+caveat)}</div><div class="bars" style="gap:${gap}px">${bars}</div><div class="tso-nfl-bar-caption"><i></i><span>Green/gold bars cleared the selected ${esc(ctx.meta.label)} line.</span></div>`;
}
function propFactorsHTML(r,ctx,name,edge,snapPct,rzOpps){
  const vol=propVolume(r,ctx.key),opp=r?.matchup?.opponent||'Opponent';
  if(ctx.key==='atd'||ctx.key==='firstTd') return `<div class="sec-h"><h3>${esc(ctx.meta.label)} Factors</h3></div><div class="eng-grid"><div class="eng"><div class="v">${rzOpps||'—'}</div><div class="t">Red-Zone Opportunities</div><div class="d">High-value scoring workload feeding the touchdown model.</div></div><div class="eng"><div class="v">${fmt1(ctx.defense)}</div><div class="t">${esc(opp)} TD / Game</div><div class="d">Previous-season touchdowns allowed to this position group.</div></div></div><div class="blurb"><b>${esc(name)}</b> carries a ${edge} TSO Edge, ${snapPct||'—'}% snap baseline and ${r?.last5?.tdGames??'—'} touchdown games across the latest five.</div>`;
  const diff=ctx.projection-ctx.line;
  return `<div class="sec-h"><h3>${esc(ctx.meta.label)} Factors</h3><span class="cap">selected prop</span></div><div class="eng-grid"><div class="eng"><div class="v" style="color:${diff>=0?'var(--green-bright)':'var(--gold)'}">${fmt1(ctx.projection)}</div><div class="t">Research Projection</div><div class="d">Blends recent completed-game production with the previous-season per-game baseline.</div></div><div class="eng"><div class="v">${fmt1(ctx.defense)}</div><div class="t">${esc(opp)} Allowed / G</div><div class="d">Previous-season ${esc(ctx.meta.label.toLowerCase())} production allowed to this position group.</div></div></div><div class="blurb"><b>${esc(name)}</b> is ${diff>=0?`${fmt1(diff)} above`:`${fmt1(Math.abs(diff))} below`} the ${fmtLine(ctx.line)} line. Recent ${esc(vol.label.toLowerCase())}: ${fmt1(vol.player)} · defense allowed ${fmt1(vol.def)}.</div>`;
}
function propProductionMetrics(r,ctx,snapPct,rzOpps,edge){
  const vol=propVolume(r,ctx.key),items=[
    ['SEASON AVG',fmt1(ctx.seasonPg)],['L5 AVG',fmt1(ctx.recent)],['LINE',fmtLine(ctx.line)],['PROJ',ctx.key==='atd'||ctx.key==='firstTd'?`${ctx.prob}%`:fmt1(ctx.projection)],
    [String(vol.label).toUpperCase(),fmt1(vol.player)],['SNAP%',snapPct||'—'],['TSO EDGE',edge]
  ];
  return `<div class="metrics">${items.map(([l,v],i)=>`<div class="m ${i===3?'c-green':i===6?'c-gold':''}"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`).join('')}</div><div class="grid-cap">Every metric above is now keyed to ${esc(ctx.meta.label)}. Sportsbook line is used when available; otherwise the line is a clearly labeled TSO research baseline.</div>`;
}
function propMatchupHTML(r,ctx,name,pos,edge,snapPct,playerPhoto,opponentPhoto,opp){
  const vol=propVolume(r,ctx.key),tdPlayer=Number(r?.last5?.avg?.tds)||0,tdDef=Number(r?.matchup?.previousSeasonAllowed?.perGame?.tds)||0;
  return `<div class="sec-h"><h3>Matchup Mix</h3><span class="cap">${esc(ctx.meta.label)} · player vs defense</span></div><div class="hand-matchup"><div class="hm-side"><div class="hm-photo">${playerPhoto}</div><div class="hm-name">${esc(name)}</div><div class="hm-hand-badge hm-bat">${esc(depthLabel(r,pos))} · ${snapPct||'—'}% snap</div></div><div class="hm-vs">VS</div><div class="hm-side"><div class="hm-photo">${opponentPhoto}</div><div class="hm-name">${esc(opp||'Opponent')}</div><div class="hm-hand-badge hm-throw">vs ${esc(pos)}</div></div></div><div class="tso-nfl-matchup-note">The comparison below changes with the selected prop. Player numbers are latest-five averages; defense numbers are previous-season allowed to the position group.</div><div class="tso-nfl-split head"><span>Profile</span><span>${esc(ctx.meta.unit)}/G</span><span>${esc(vol.label)}</span><span>TD/G</span><span>Snap</span><span>Edge</span></div><div class="tso-nfl-split relevant"><b>${esc(name.split(' ').slice(-1)[0])}</b><span>${fmt1(ctx.recent)}</span><span>${fmt1(vol.player)}</span><span>${fmt1(tdPlayer)}</span><span>${snapPct||'—'}%</span><span>${edge}</span></div><div class="tso-nfl-split"><b>${esc(opp||'DEF')} allowed</b><span>${fmt1(ctx.defense)}</span><span>${fmt1(vol.def)}</span><span>${fmt1(tdDef)}</span><span>—</span><span>${ctx.prob>=55?'PLUS':ctx.prob<47?'MINUS':'EVEN'}</span></div>`;
}
function compareRow(label,a,b,opp){
  const av=numeric(a,0),bv=numeric(b,0),mx=Math.max(1,av,bv),aw=av>0?Math.max(4,av/mx*100):0,bw=bv>0?Math.max(4,bv/mx*100):0,diff=av-bv,read=Math.abs(diff)<(.08*mx)?'EVEN':diff>0?'PLAYER +':'DEF +',cls=read==='PLAYER +'?'plus':read==='DEF +'?'minus':'';
  return `<div class="tso-nfl-compare-row"><div class="tso-nfl-compare-label">${esc(label)}</div><div class="tso-nfl-compare-bars"><div class="tso-nfl-compare-line"><small>L5</small><div class="tso-nfl-compare-track"><i style="width:${aw}%"></i></div><strong>${fmt1(av)}</strong></div><div class="tso-nfl-compare-line opp"><small>${esc(opp||'DEF')}</small><div class="tso-nfl-compare-track"><i style="width:${bw}%"></i></div><strong>${fmt1(bv)}</strong></div></div><div class="tso-nfl-compare-read ${cls}">${read}</div></div>`;
}
function propVisualsHTML(r,ctx,snapPct,rzOpps,opp){
  const vol=propVolume(r,ctx.key),tdPlayer=Number(r?.last5?.avg?.tds)||0,tdDef=Number(r?.matchup?.previousSeasonAllowed?.perGame?.tds)||0;
  const line=Math.max(.1,Number(ctx.line)||1),ratio=clampNum(ctx.projection/line*100,0,140),overRate=(()=>{const rows=recentHistoryRows(r).slice(0,10);return rows.length?Math.round(rows.filter(g=>lineResult(propGameValue(g,ctx.key),ctx)).length/rows.length*100):0;})();
  const left=`<div class="tso-nfl-viz-card"><div class="tso-nfl-viz-head"><b>${esc(ctx.meta.label)} Profile</b><span>${esc(ctx.lineSource)}</span></div><div class="tso-nfl-role-visual"><div class="tso-nfl-role-top"><div class="tso-nfl-role-ring">${ringSVG(Math.min(100,ratio),100)}<div class="tso-nfl-role-ring-copy"><b>${ctx.key==='atd'||ctx.key==='firstTd'?`${ctx.prob}%`:`${fmt1(ctx.projection)}`}</b><span>${ctx.key==='atd'||ctx.key==='firstTd'?'probability':'projection'}</span></div></div><div class="tso-nfl-role-mini"><div><span>Line</span><b>${fmtLine(ctx.line)}</b></div><div><span>L5 avg</span><b>${fmt1(ctx.recent)}</b></div><div><span>Season avg</span><b>${fmt1(ctx.seasonPg)}</b></div><div><span>Over rate L10</span><b>${overRate}%</b></div></div></div><div class="tso-nfl-mix"><div class="tso-nfl-mix-labels"><span>Projection <b>${fmt1(ctx.projection)}</b></span><span>Line <b>${fmtLine(ctx.line)}</b></span></div><div class="tso-nfl-mix-track"><i style="width:${Math.min(100,Math.max(4,ratio/2))}%"></i><i style="width:${Math.max(0,100-Math.min(100,Math.max(4,ratio/2)))}%"></i></div></div></div></div>`;
  const right=`<div class="tso-nfl-viz-card"><div class="tso-nfl-viz-head"><b>Player vs Defense</b><span>${esc(ctx.meta.label)}</span></div><div class="tso-nfl-compare">${compareRow(ctx.meta.label,ctx.recent,ctx.defense,opp)}${compareRow(vol.label,vol.player,vol.def,opp)}${compareRow('TD/G',tdPlayer,tdDef,opp)}</div></div>`;
  return `<div class="tso-nfl-data-viz">${left}${right}</div>`;
}
function propRecentTableHTML(r,ctx){
  const rows=recentHistoryRows(r).slice(0,5);
  if(!rows.length) return `<div class="ab-empty">No completed-game log available.</div>`;
  const vals=rows.map(g=>propGameValue(g,ctx.key)),hits=vals.filter(v=>lineResult(v,ctx)).length,avg=vals.reduce((a,b)=>a+b,0)/rows.length;
  const body=rows.map((g,i)=>{const v=vals[i],hit=lineResult(v,ctx);return `<tr class="${hit?'ab-hit':'ab-out'}"><td class="l"><div class="ab-date ${i===0?'new':''}">W${esc(g.week)}<small>vs ${esc(g.opponent||'—')}</small></div></td><td>${fmt1(v)}</td><td>${fmt1(propGameValue(g,'rushYds'))}</td><td>${fmt1(propGameValue(g,'recYds'))}</td><td>${fmt1(propGameValue(g,'receptions'))}</td><td>${fmt1(propGameValue(g,'atd'))}</td><td><span class="ab-res ${hit?'td':'no-td'}"><i></i>${hit?'OVER':'UNDER'} ${fmtLine(ctx.line)}</span></td></tr>`;}).join('');
  return `<div class="ab-sum"><div class="s"><b>${rows.length}</b><small>Games</small></div><div class="s"><b>${hits}</b><small>Overs</small></div><div class="s"><b>${fmt1(avg)}</b><small>Avg ${esc(ctx.meta.unit)}</small></div><div class="s"><b>${fmtLine(ctx.line)}</b><small>Line</small></div></div><div class="tso-nfl-table-note"><b>${esc(ctx.meta.label)}</b><span>· latest completed games against the selected line</span></div><div class="ab-scroll"><table class="ab-table"><thead><tr><th class="l">Game</th><th>${esc(ctx.meta.button)}</th><th>Rush</th><th>Rec Yds</th><th>Rec</th><th>TD</th><th>Result</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function factorRow(label,detail,score,verdict){
  const s=Math.max(0,Math.min(100,Number(score)||50)); const pos=s>=50; const left=pos?50:s; const width=Math.abs(s-50); const cls=pos?'fac-pos':'fac-neg'; const vcls=s>=58?'ver-pos':s<=42?'ver-neg':'ver-neu';
  return `<div class="fac-row"><div><div class="fac-label">${esc(label)}</div><div class="fac-detail">${esc(detail)}</div></div><div class="fac-track"><span class="fac-fill ${cls}" style="left:${left}%;width:${Math.max(2,width)}%"></span></div><div class="fac-verdict ${vcls}">${esc(verdict)}</div></div>`;
}
function propWhyHTML(r,ctx,pos,edge,snapPct,rzOpps){
  const vol=propVolume(r,ctx.key),line=Math.max(.1,Number(ctx.line)||1),recentScore=clampNum(50+((ctx.recent-line)/Math.max(1,line*.18))*14,20,85),matchupScore=clampNum(50+((ctx.defense-line)/Math.max(1,line*.18))*8,25,80),volScore=clampNum(45+numeric(vol.player,0)*2,30,85),snapScore=clampNum(snapPct,25,90);
  const intro=ctx.key==='atd'||ctx.key==='firstTd'?`What's driving tonight's ${ctx.meta.label} projection — TSO scoring model plus source-backed role, recent production and opponent context.`:`What's driving the ${ctx.meta.label} over ${fmtLine(ctx.line)} read — recent production, role volume, defense allowed and TSO matchup signal.`;
  return `<div class="why-intro">${esc(intro)}</div><div class="phead" style="color:${gradeColor(ctx.grade)}"><div class="pgring">${ringSVG(ctx.prob,100)}<div class="pg-c">${esc(ctx.grade)}</div></div><div class="mid"><div class="lbl">${esc(r.name)} <span>· vs ${esc(r?.matchup?.opponent||r?.opponent||'—')}</span></div><div class="sub">${esc(selectedPropLabel(ctx))} · TSO Edge ${esc(edge)} · ${esc(depthLabel(r,pos))}</div></div><div class="pct">${esc(ctx.prob)}%</div></div><div class="fac-head"><span>Factor</span><span></span><span>Read</span></div>${factorRow('Recent vs Line',`${fmt1(ctx.recent)} vs ${fmtLine(ctx.line)}`,recentScore,recentScore>=58?'PLUS':recentScore<=42?'MINUS':'EVEN')}${factorRow('Opponent Allowance',`${fmt1(ctx.defense)} ${ctx.meta.unit}/game allowed`,matchupScore,matchupScore>=58?'PLUS':matchupScore<=42?'MINUS':'EVEN')}${factorRow(vol.label,`${fmt1(vol.player)} recent · ${fmt1(vol.def)} allowed`,volScore,volScore>=60?'PLUS':'EVEN')}${factorRow('Snap Share',`${snapPct}% role baseline`,snapScore,snapScore>=70?'PLUS':'EVEN')}${factorRow('TSO Edge','Composite matchup signal',edge,edge>=60?'PLUS':edge<45?'MINUS':'EVEN')}<div class="fac-foot"><b>Read:</b> ${ctx.key==='atd'||ctx.key==='firstTd'?'Touchdown percentage remains a TSO model output.':'Non-TD prop lean is a research projection against the displayed line, not a sportsbook probability.'} Source-backed inputs include completed-game production, roster/depth/injury and snap history.</div>`;
}
function slipHasLeg(id){
  try{return (JSON.parse(localStorage.getItem('dw_betslip')||'[]')||[]).some(l=>l?.id===id);}catch{return false;}
}
function nflPointSlateDate(utc){
  if(!utc) return null;
  const d=new Date(utc); if(!Number.isFinite(d.getTime())) return null;
  try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}catch{return d.toISOString().slice(0,10);}
}
function propSlipHTML(r,ctx,team,opp,edge){
  const line=Number(ctx.line); if(!Number.isFinite(line)) return `<button class="cta tso-nfl-prop-disabled" type="button" disabled>Line unavailable</button>`;
  const wagerMarket=ctx.key==='atd'?'ATD':ctx.meta.market;
  const preview=findPreviewWagerMeta(r);
  const game=findOddsGame(r)||findOddsPlayer(r)?.game||preview?.game||null;
  const gamePk=Number(ctx.offer?.gameId||game?.gameId||preview?.gameId||r.gameId)||null;
  const eventId=ctx.offer?.eventId||game?.fixtureId||null;
  const playerId=Number(r.espnId||preview?.playerId)||null;
  const slateDate=nflPointSlateDate(ctx.offer?.startDateUTC||game?.startDateUTC||game?.startTimeUTC||preview?.startTimeUTC);
  const id=`${r.name}|${wagerMarket}|${fmtLine(line)}`;
  const leg={id,kind:'prop',sport:'nfl',prop_key:ctx.key,side:'over',player:r.name,player_name:r.name,market:wagerMarket,line,pct:ctx.prob,grade:ctx.grade,game:`${team} vs ${opp||'DEF'}`,game_pk:gamePk,event_id:eventId,player_id:playerId,price:ctx.offer?.price??null,book:ctx.offer?.book??null,link:ctx.offer?.link??null,line_source:ctx.lineSource,slate_date:slateDate};
  const label=`Add ${fmtLine(line)} ${ctx.meta.label} to Slip`,on=slipHasLeg(id);
  if(ctx.key==='atd' && (!gamePk||!playerId||!slateDate)) return `<button class="cta tso-nfl-prop-disabled" type="button" disabled>ATD wager metadata pending</button>`;
  return `<button class="add-leg cta ${on?'in-slip':''}" data-legid="${esc(id)}" data-leg="${encodeURIComponent(JSON.stringify(leg))}" data-cta-label="${esc(label)}">${on?'✓ In Slip':esc(label)}</button>`;
}

function enhanceModal(root){
  const modal=root.querySelector('.ms-modal'); if(!modal || modal.dataset.tsoMlbV72==='1') return;
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
  const opp=normTeam(r?.matchup?.opponent||r?.opponent||sub.split('vs ')[1]?.split('·')[0]?.trim()||'');
  const oppLogo=opponentLogo(root,opp);
  const status=statusLabel(r),statClass=statusClass(r)==='warn'?'warn':'';
  const opponentPhoto=oppLogo?`<img class="tso-nfl-matchup-photo" src="${esc(oppLogo)}" alt="${esc(opp)}">`:`<div class="tso-nfl-matchup-photo" style="display:grid;place-items:center;font:800 13px 'JetBrains Mono',monospace;color:#f5c842">${esc(opp||'DEF')}</div>`;
  const playerPhoto=headshot?`<img class="hm-img" src="${esc(headshot)}" alt="${esc(name)}">`:`<div class="hm-img" style="display:grid;place-items:center">${esc(name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</div>`;
  const props=propsForPosition(pos);
  const chartState={range:'5',venue:'all'};
  let selected=props[0]||'atd';

  modal.closest('.ms-modal-backdrop')?.classList.add('tso-mlb-backdrop');
  modal.classList.add('tso-mlb-player-shell');
  modal.dataset.tsoMlbV72='1';
  modal.innerHTML=`<div class="player-card-v2 tso-nfl-player-card-v70 tso-nfl-player-card-v72">
    <button class="modal-close" type="button" aria-label="Close">&times;</button>
    <div class="hdr">
      <div class="ava-reticle"><div class="ava">${headshot?`<img src="${esc(headshot)}" alt="${esc(name)}">`:`<span style="display:grid;place-items:center;height:100%;font:700 16px 'Oswald',sans-serif">${esc(name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</span>`}</div></div>
      <div class="who"><h2>${esc(name)} <span class="dq-badge sourced">Sourced</span><span class="tso-nfl-hdr-badges"><span class="tso-nfl-hdr-badge ${statClass}">${esc(depthLabel(r,pos))} · ${esc(status)}</span>${edge>=60?`<span class="tso-nfl-hdr-badge edge">TSO Signal ${edge}</span>`:''}</span></h2><div class="sub" id="tsoNflPropSub"></div><div class="hdr-stats" id="tsoNflHeaderStats"></div></div>
      <div class="pill-row tso-nfl-prop-switch" id="tsoNflPropSwitch">${props.map((key,i)=>`<button class="pill ${i===0?'active':''}" data-nfl-modal-prop="${key}" title="${esc(NFL_PROP_META[key]?.label||key)}">${esc(NFL_PROP_META[key]?.button||key)}</button>`).join('')}</div>
      <div class="tso-nfl-prop-odds-strip" id="tsoNflPropOdds"></div>
    </div>
    <div class="sec"><div id="tsoNflVerdict"></div><div class="tso-nfl-chart-host" id="tsoNflRecentChart"></div><div id="tsoNflSlipHost"></div></div>
    <div class="sec" id="tso-nfl-factors"></div>
    <div class="sec"><div class="sec-h"><h3>Production Quality</h3><span class="cap" id="tsoNflProductionCap"></span></div><div id="tsoNflProduction"></div></div>
    <div class="sec matchup-mix-sec" id="tso-nfl-matchup"></div>
    <div class="sec"><div class="sec-h"><h3>Prop & Matchup Visuals</h3><span class="cap" id="tsoNflVisualCap"></span></div><div id="tsoNflVisuals"></div></div>
    <div class="sec"><div class="sec-h"><h3>Recent Opportunities</h3><span class="cap" id="tsoNflRecentCap"></span></div><div id="tsoNflRecentTable"></div></div>
    <div class="sec"><div class="sec-h"><h3>Why</h3></div><div id="tsoNflWhy"></div></div>
    <div class="foot">Select a prop in the upper-right to re-key the entire modal. Sportsbook lines are used when available; otherwise the modal clearly identifies a TSO research line. Roster, depth, injury, snap history and completed-game production are source-backed.</div>
  </div>`;

  const renderSelectedProp=()=>{
    const ctx=propContext(r,selected,{atd,firstTd,edge});
    modal.querySelectorAll('#tsoNflPropSwitch [data-nfl-modal-prop]').forEach(b=>b.classList.toggle('active',b.dataset.nflModalProp===selected));
    const subEl=modal.querySelector('#tsoNflPropSub');
    if(subEl) subEl.innerHTML=`${esc(selectedPropLabel(ctx))} · vs ${esc(opp||'DEF')} · ${esc(team)} ${esc(pos)}${r.jersey?` #${esc(r.jersey)}`:''}`;
    const hs=propHeaderStats(r,ctx,snapPct,rzOpps);
    const hsEl=modal.querySelector('#tsoNflHeaderStats'); if(hsEl) hsEl.innerHTML=hs.map(([v,l])=>`<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('');
    const oddsEl=modal.querySelector('#tsoNflPropOdds'); if(oddsEl) oddsEl.innerHTML=propOddsStripHTML(ctx);
    const verdict=modal.querySelector('#tsoNflVerdict'); if(verdict) verdict.innerHTML=propVerdictHTML(r,ctx,name,edge,snapPct,rzOpps);
    const chart=modal.querySelector('#tsoNflRecentChart'); if(chart) chart.innerHTML=recentBarsMLB(r,pos,ctx,chartState.range,chartState.venue);
    const slip=modal.querySelector('#tsoNflSlipHost'); if(slip) slip.innerHTML=propSlipHTML(r,ctx,team,opp,edge);
    const factors=modal.querySelector('#tso-nfl-factors'); if(factors) factors.innerHTML=propFactorsHTML(r,ctx,name,edge,snapPct,rzOpps);
    const prodCap=modal.querySelector('#tsoNflProductionCap'); if(prodCap) prodCap.textContent=`${ctx.meta.label} · line · recent form`;
    const prod=modal.querySelector('#tsoNflProduction'); if(prod) prod.innerHTML=propProductionMetrics(r,ctx,snapPct,rzOpps,edge);
    const matchup=modal.querySelector('#tso-nfl-matchup'); if(matchup) matchup.innerHTML=propMatchupHTML(r,ctx,name,pos,edge,snapPct,playerPhoto,opponentPhoto,opp);
    const visualCap=modal.querySelector('#tsoNflVisualCap'); if(visualCap) visualCap.textContent=`${ctx.meta.label} · real data`;
    const visuals=modal.querySelector('#tsoNflVisuals'); if(visuals) visuals.innerHTML=propVisualsHTML(r,ctx,snapPct,rzOpps,opp);
    const recentCap=modal.querySelector('#tsoNflRecentCap'); if(recentCap) recentCap.textContent=`${ctx.meta.label} · completed games`;
    const recent=modal.querySelector('#tsoNflRecentTable'); if(recent) recent.innerHTML=propRecentTableHTML(r,ctx);
    const why=modal.querySelector('#tsoNflWhy'); if(why) why.innerHTML=propWhyHTML(r,ctx,pos,edge,snapPct,rzOpps);
  };

  modal.querySelector('.modal-close')?.addEventListener('click',()=>oldClose?.click());
  modal.querySelector('#tsoNflPropSwitch')?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-nfl-modal-prop]'); if(!btn) return;
    selected=btn.dataset.nflModalProp||selected; renderSelectedProp();
  });
  modal.querySelector('#tsoNflRecentChart')?.addEventListener('click',e=>{
    const rangeBtn=e.target.closest('[data-nfl-chart-range]');
    if(rangeBtn){chartState.range=rangeBtn.dataset.nflChartRange||'5';renderSelectedProp();return;}
    const venueBtn=e.target.closest('[data-nfl-chart-venue]');
    if(venueBtn){const v=venueBtn.dataset.nflChartVenue;chartState.venue=chartState.venue===v?'all':v;renderSelectedProp();}
  });
  renderSelectedProp();
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
  await Promise.all([loadResearch(),loadOdds()]);
  if(!research) return;
  scheduleEnhance();
  if(observer) observer.disconnect();
  observer=new MutationObserver(()=>scheduleEnhance());
  observer.observe(rootRef,{childList:true,subtree:true});
  if(!oddsEventBound){
    oddsEventBound=true;
    window.addEventListener('dw-nfl-odds-updated',async()=>{
      oddsData=null; oddsLoadPromise=null; oddsIndex=null;
      await loadOdds();
      const modal=rootRef?.querySelector?.('.ms-modal');
      if(modal) delete modal.dataset.tsoMlbV72;
      scheduleEnhance();
    });
  }
}
