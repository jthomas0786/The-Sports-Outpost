import { __NFL_PLAYER_PROP_TOOL_V926_TEST__ as base } from './player-prop-tool-v926.js?v=92.7';

const TOOL_ID='nflPlayerPropTool';
const BUTTON_ID='nflPlayerPropToolBtn';
const STASH_ID='nflPlayerPropToolBaseStash';
const STYLE_ID='nfl-player-prop-tool-snapshot-v928-css';
const POSITIONS=['QB','RB','WR','TE'];
const state=base?.state;

let installed=false;
let snapshotReady=false;
let preparing=false;
let savedState=null;
let prepTimer=null;
let prepPolls=0;
let loadBatches=0;
let waitForTableReplacement=null;
let applyRaf=0;
let parkedTool=null;
let gameKeyById=new Map();

const norm=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const text=el=>String(el?.textContent||'').trim();
const num=v=>{const n=Number(String(v??'').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:null;};
const pairKey=(a,b)=>[String(a||'').toUpperCase(),String(b||'').toUpperCase()].sort().join('|');

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const link=document.createElement('link');
  link.id=STYLE_ID;
  link.rel='stylesheet';
  link.href='./sports/nfl/player-prop-tool-snapshot-v928.css?v=93.1';
  document.head.appendChild(link);
}

function copyState(){
  if(!state)return null;
  return {
    mode:state.mode,game:state.game,market:state.market,team:state.team,search:state.search,
    sort:state.sort,sortDir:state.sortDir,color:state.color,minProb:state.minProb,
    filtersOpen:state.filtersOpen,positions:[...state.positions]
  };
}
function restoreState(snapshot){
  if(!state||!snapshot)return;
  state.mode=snapshot.mode;
  state.game=snapshot.game;
  state.market=snapshot.market;
  state.team=snapshot.team;
  state.search=snapshot.search;
  state.sort=snapshot.sort;
  state.sortDir=snapshot.sortDir;
  state.color=snapshot.color;
  state.minProb=snapshot.minProb;
  state.filtersOpen=snapshot.filtersOpen;
  state.positions=new Set(snapshot.positions||POSITIONS);
}
function neutralizeForSnapshot(){
  if(!state)return;
  state.mode='all';
  state.game='ALL';
  state.market='ALL';
  state.team='ALL';
  state.search='';
  state.positions=new Set(POSITIONS);
}

function marketKeyForLabel(label){
  const needle=norm(label);
  for(const [key,meta] of Object.entries(base?.MARKET_META||{})){
    if(needle===norm(meta?.short)||needle===norm(meta?.label))return key;
  }
  return '';
}
function rateNumber(value){
  const m=String(value||'').match(/(\d+)\s*\/\s*(\d+)/);
  if(!m)return -1;
  const total=Number(m[2])||0;
  return total?Number(m[1])/total:-1;
}
function buildGameMap(tool){
  gameKeyById=new Map();
  tool.querySelectorAll('#nflPptGame option').forEach(option=>{
    if(option.value==='ALL')return;
    const m=text(option).match(/^\s*([A-Z0-9]+)\s*@\s*([A-Z0-9]+)/i);
    if(m)gameKeyById.set(String(option.value),pairKey(m[1],m[2]));
  });
}
function decorateRow(row){
  const playerMeta=text(row.querySelector('.nfl-ppt-player small'));
  const teamMatch=playerMeta.match(/^\s*([A-Z0-9]+)\s+vs\s+([A-Z0-9]+)/i);
  const matchupMeta=text(row.querySelector('.nfl-ppt-match span'));
  const position=(matchupMeta.match(/^\s*([A-Z]+)/i)?.[1]||'').toUpperCase();
  const market=marketKeyForLabel(text(row.querySelector('.nfl-ppt-consensus span')));
  const probLabel=text(row.querySelector('.nfl-ppt-ring-label span'));
  const prob=probLabel?num(probLabel)/100:null;
  const edgeLabel=text(row.querySelector('.nfl-ppt-edge b'));
  const edge=edgeLabel&&edgeLabel!=='—'?num(edgeLabel)/100:null;
  const projection=num(text(row.querySelector('.nfl-ppt-proj b')));
  const defRank=num(text(row.querySelector('.nfl-ppt-def b')));
  const hitCells=[...row.querySelectorAll('.nfl-ppt-hit b')];
  const name=text(row.querySelector('.nfl-ppt-player b')).replace('↗','').trim();
  const team=(teamMatch?.[1]||'').toUpperCase();
  const opp=(teamMatch?.[2]||'').toUpperCase();
  row.dataset.snapshotName=name;
  row.dataset.snapshotTeam=team;
  row.dataset.snapshotOpp=opp;
  row.dataset.snapshotGame=pairKey(team,opp);
  row.dataset.snapshotPosition=position;
  row.dataset.snapshotMarket=market;
  row.dataset.snapshotProb=prob==null?'':String(prob);
  row.dataset.snapshotEdge=edge==null?'':String(edge);
  row.dataset.snapshotProjection=projection==null?'':String(projection);
  row.dataset.snapshotDef=defRank==null?'':String(defRank);
  row.dataset.snapshotL10=String(rateNumber(text(hitCells[1])));
  row.dataset.snapshotSearch=norm(row.textContent);
}

function qualifies(row){
  const d=row.dataset;
  if(!state.positions.has(d.snapshotPosition))return false;
  if(state.game!=='ALL'){
    const gameKey=gameKeyById.get(String(state.game));
    if(gameKey&&d.snapshotGame!==gameKey)return false;
  }
  if(state.market!=='ALL'&&d.snapshotMarket!==state.market)return false;
  if(state.team!=='ALL'&&d.snapshotTeam!==state.team)return false;
  if(state.search&&!(d.snapshotSearch||'').includes(norm(state.search)))return false;
  if(state.mode==='picks'){
    const prob=d.snapshotProb===''?null:Number(d.snapshotProb);
    const edge=d.snapshotEdge===''?null:Number(d.snapshotEdge);
    if(prob!=null&&prob<state.minProb)return false;
    if(edge!=null&&edge<0)return false;
  }
  return true;
}
function sortValue(row,key){
  const d=row.dataset;
  if(key==='name')return d.snapshotName||'';
  if(key==='prob')return d.snapshotProb===''?-1:Number(d.snapshotProb);
  if(key==='projection')return d.snapshotProjection===''?-1:Number(d.snapshotProjection);
  if(key==='def')return d.snapshotDef===''?999:Number(d.snapshotDef);
  if(key==='l10')return Number(d.snapshotL10||-1);
  return d.snapshotEdge===''?-999:Number(d.snapshotEdge);
}
function reorderRows(tool){
  const tbody=tool.querySelector('.nfl-ppt-table tbody');
  if(!tbody)return;
  const rows=[...tbody.querySelectorAll('tr[data-nfl-ppt-row]')];
  const mul=state.sortDir==='asc'?1:-1;
  rows.sort((a,b)=>{
    const av=sortValue(a,state.sort),bv=sortValue(b,state.sort);
    if(state.sort==='name')return String(av).localeCompare(String(bv))*mul;
    const delta=(Number(av)||0)-(Number(bv)||0);
    return delta*mul||String(a.dataset.snapshotName||'').localeCompare(String(b.dataset.snapshotName||''));
  });
  const frag=document.createDocumentFragment();
  rows.forEach(row=>frag.appendChild(row));
  tbody.appendChild(frag);
}
function applySnapshot({reorder=false}={}){
  const tool=document.getElementById(TOOL_ID);
  if(!snapshotReady||!tool)return;
  if(reorder)reorderRows(tool);
  let visible=0;
  const rows=[...tool.querySelectorAll('.nfl-ppt-table tbody tr[data-nfl-ppt-row]')];
  rows.forEach(row=>{const show=qualifies(row);row.hidden=!show;if(show)visible++;});
  const count=tool.querySelector('.nfl-ppt-head-stat b');
  const label=tool.querySelector('.nfl-ppt-head-stat span');
  if(count)count.textContent=String(visible);
  if(label)label.textContent=`matching of ${rows.length} snapshot prop rows`;
  const empty=tool.querySelector('.nfl-ppt-snapshot-empty');
  if(empty)empty.hidden=visible!==0;
}
function requestApply(){
  if(applyRaf)return;
  applyRaf=requestAnimationFrame(()=>{applyRaf=0;applySnapshot();});
}
function syncControls(tool){
  const setValue=(id,value)=>{const el=tool.querySelector(id);if(el&&[...(el.options||[])].some(o=>o.value===String(value)))el.value=String(value);};
  setValue('#nflPptMode',state.mode);
  setValue('#nflPptGame',state.game);
  setValue('#nflPptMarket',state.market);
  setValue('#nflPptTeam',state.team);
  setValue('#nflPptMin',Number(state.minProb).toFixed(2));
  const search=tool.querySelector('#nflPptSearch');if(search)search.value=state.search||'';
  tool.querySelectorAll('[data-nfl-ppt-pos]').forEach(btn=>btn.classList.toggle('active',state.positions.has(btn.dataset.nflPptPos)));
  tool.classList.toggle('ppt-color-off',!state.color);
  tool.querySelector('#nflPptColor')?.classList.toggle('on',state.color);
  const panel=tool.querySelector('#nflPptFilterPanel');if(panel)panel.hidden=!state.filtersOpen;
}
function addSnapshotBadge(tool){
  if(tool.querySelector('.nfl-ppt-snapshot-badge'))return;
  const head=tool.querySelector('.nfl-ppt-head>div:first-child');
  if(!head)return;
  const badge=document.createElement('em');
  badge.className='nfl-ppt-snapshot-badge';
  badge.textContent='STATIC SNAPSHOT · REFRESH TO UPDATE';
  head.appendChild(badge);
}
function ensureEmptyState(tool){
  const wrap=tool.querySelector('.nfl-ppt-table-wrap');
  if(!wrap||wrap.querySelector('.nfl-ppt-snapshot-empty'))return;
  const empty=document.createElement('div');
  empty.className='nfl-ppt-empty nfl-ppt-snapshot-empty';
  empty.textContent='No player props match these filters right now.';
  empty.hidden=true;
  wrap.appendChild(empty);
}
function finishSnapshot(){
  const tool=document.getElementById(TOOL_ID);
  if(!tool)return;
  restoreState(savedState);
  savedState=null;
  preparing=false;
  snapshotReady=true;
  prepPolls=0;
  loadBatches=0;
  waitForTableReplacement=null;
  tool.querySelector('.nfl-ppt-more')?.remove();
  buildGameMap(tool);
  tool.querySelectorAll('.nfl-ppt-table tbody tr[data-nfl-ppt-row]').forEach(decorateRow);
  addSnapshotBadge(tool);
  ensureEmptyState(tool);
  syncControls(tool);
  tool.dataset.nflPptSnapshot='ready';
  tool.dataset.nflPptSnapshotRows=String(tool.querySelectorAll('.nfl-ppt-table tbody tr[data-nfl-ppt-row]').length);
  applySnapshot({reorder:true});
}
function advancePrepare(){
  prepTimer=null;
  if(!preparing)return;
  const tool=document.getElementById(TOOL_ID);
  if(!tool){if(++prepPolls<500)queuePrepare(25);return;}
  tool.dataset.nflPptSnapshot='preparing';
  if(tool.querySelector('.nfl-ppt-error')){
    restoreState(savedState);savedState=null;preparing=false;waitForTableReplacement=null;return;
  }
  const table=tool.querySelector('.nfl-ppt-table');
  if(waitForTableReplacement&&table===waitForTableReplacement){if(++prepPolls<500)queuePrepare(25);return;}
  if(waitForTableReplacement&&table!==waitForTableReplacement){waitForTableReplacement=null;prepPolls=0;}
  const tbody=table?.querySelector('tbody');
  if(!tbody){if(++prepPolls<500)queuePrepare(25);return;}
  const more=tool.querySelector('#nflPptMore');
  if(more&&loadBatches<4){
    loadBatches++;
    for(let i=0;i<100;i++)more.click();
    queuePrepare(80);
    return;
  }
  finishSnapshot();
}
function queuePrepare(delay=0){
  if(prepTimer)clearTimeout(prepTimer);
  prepTimer=setTimeout(advancePrepare,delay);
}
function beginPrepare(previousTable=null){
  if(preparing)return;
  savedState=copyState();
  snapshotReady=false;
  preparing=true;
  prepPolls=0;
  loadBatches=0;
  waitForTableReplacement=previousTable;
  neutralizeForSnapshot();
  const tool=document.getElementById(TOOL_ID);
  if(tool)tool.dataset.nflPptSnapshot='preparing';
  queuePrepare(0);
}

function modalIsOpen(){return !!document.querySelector('#nflView [data-nfl-close-modal],#nflView .tso-nfl-player-card-v70,#nflView .tso-nfl-player-card-v72,#nflView .ms-modal');}
function restoreParkedTool(){
  if(!parkedTool||modalIsOpen())return false;
  const root=document.getElementById('nflView');
  if(!root)return false;
  const generated=root.querySelector(`#${TOOL_ID}`);
  if(generated&&generated!==parkedTool)generated.remove();
  let stash=root.querySelector(`#${STASH_ID}`);
  if(!stash){
    stash=document.createElement('div');
    stash.id=STASH_ID;
    stash.hidden=true;
    while(root.firstChild)stash.appendChild(root.firstChild);
    root.appendChild(stash);
  }
  root.appendChild(parkedTool);
  parkedTool.dataset.nflPptSnapshot='ready';
  document.getElementById(BUTTON_ID)?.classList.add('is-active');
  parkedTool=null;
  snapshotReady=true;
  return true;
}
function scheduleParkedRestore(){
  [0,40,100,220].forEach(delay=>setTimeout(()=>{if(parkedTool)restoreParkedTool();},delay));
}
function parkForPlayerModal(){
  const tool=document.getElementById(TOOL_ID);
  if(!tool||parkedTool)return;
  parkedTool=tool;
  tool.remove();
  setTimeout(()=>{if(parkedTool&&!modalIsOpen())restoreParkedTool();},180);
}

function resetFilters(tool){
  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',mode:'picks',sort:'edge',sortDir:'desc',minProb:.52,filtersOpen:true});
  state.positions=new Set(POSITIONS);
  syncControls(tool);
  applySnapshot({reorder:true});
}
function onClickCapture(e){
  const target=e.target;
  if(target.closest?.('[data-nfl-close-modal]')&&parkedTool){scheduleParkedRestore();return;}
  if(target.closest?.(`#${BUTTON_ID}`)){
    if(!snapshotReady&&!preparing)beginPrepare();
    return;
  }
  const tool=target.closest?.(`#${TOOL_ID}`);
  if(!tool)return;
  if(target.closest?.('#nflPptRefresh')){beginPrepare(tool.querySelector('.nfl-ppt-table'));return;}
  if(target.closest?.('#nflPptRetry')){beginPrepare();return;}
  if(!snapshotReady)return;
  if(target.closest?.('[data-nfl-tool-player]')){parkForPlayerModal();return;}
  if(target.closest?.('#nflPptClear')){
    e.preventDefault();e.stopImmediatePropagation();resetFilters(tool);return;
  }
  const pos=target.closest?.('[data-nfl-ppt-pos]');
  if(pos){
    e.preventDefault();e.stopImmediatePropagation();
    const p=pos.dataset.nflPptPos;
    if(state.positions.has(p)&&state.positions.size>1)state.positions.delete(p);else state.positions.add(p);
    tool.querySelectorAll('[data-nfl-ppt-pos]').forEach(btn=>btn.classList.toggle('active',state.positions.has(btn.dataset.nflPptPos)));
    applySnapshot();return;
  }
  const th=target.closest?.('th[data-sort]');
  if(th){
    e.preventDefault();e.stopImmediatePropagation();
    const key=th.dataset.sort;
    if(state.sort===key)state.sortDir=state.sortDir==='asc'?'desc':'asc';
    else{state.sort=key;state.sortDir=key==='name'?'asc':'desc';}
    applySnapshot({reorder:true});return;
  }
  if(target.closest?.('#nflPptMore')){e.preventDefault();e.stopImmediatePropagation();return;}
}
function onChangeCapture(e){
  if(!snapshotReady)return;
  const t=e.target,tool=t.closest?.(`#${TOOL_ID}`);if(!tool)return;
  if(t.id==='nflPptMode')state.mode=t.value;
  else if(t.id==='nflPptGame')state.game=t.value;
  else if(t.id==='nflPptMarket')state.market=t.value;
  else if(t.id==='nflPptTeam')state.team=t.value;
  else if(t.id==='nflPptMin')state.minProb=Number(t.value)||.52;
  else return;
  e.stopImmediatePropagation();
  applySnapshot();
}
function onInputCapture(e){
  if(!snapshotReady)return;
  const t=e.target;if(t.id!=='nflPptSearch'||!t.closest?.(`#${TOOL_ID}`))return;
  state.search=t.value;
  e.stopImmediatePropagation();
  requestApply();
}
function onHashChange(){
  if(!String(location.hash||'').toLowerCase().startsWith('#nfl')){
    snapshotReady=false;preparing=false;savedState=null;parkedTool=null;waitForTableReplacement=null;
    if(prepTimer)clearTimeout(prepTimer);
  }
}

export function installNflPlayerPropToolSnapshotV928(){
  if(installed)return;
  installed=true;
  ensureStyle();
  document.addEventListener('click',onClickCapture,true);
  document.addEventListener('change',onChangeCapture,true);
  document.addEventListener('input',onInputCapture,true);
  window.addEventListener('hashchange',onHashChange);
}

export const __NFL_PLAYER_PROP_TOOL_SNAPSHOT_V928_TEST__={copyState,restoreState,neutralizeForSnapshot,qualifies,sortValue};
