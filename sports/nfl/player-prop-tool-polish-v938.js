const STYLE_ID='nfl-player-prop-tool-polish-v938-css';
const TOOL_ID='nflPlayerPropTool';
const BUTTON_ID='nflPlayerPropToolBtn';
const BAR_CLASS='nfl-ppt-xscroll-v938';
const INNER_CLASS='nfl-ppt-xscroll-inner-v938';
let installed=false;
let retryTimers=[];

function clearRetries(){
  for(const id of retryTimers)clearTimeout(id);
  retryTimers=[];
}

function loadStyle(){
  if(document.getElementById(STYLE_ID))return;
  const link=document.createElement('link');
  link.id=STYLE_ID;
  link.rel='stylesheet';
  link.href='./sports/nfl/player-prop-tool-polish-v938.css?v=93.8';
  document.head.appendChild(link);
}

function bindScrollSync(bar,wrap){
  if(bar.__nflPptWrap===wrap)return;
  if(bar.__nflPptBarHandler)bar.removeEventListener('scroll',bar.__nflPptBarHandler);
  if(bar.__nflPptWrap&&bar.__nflPptWrapHandler)bar.__nflPptWrap.removeEventListener('scroll',bar.__nflPptWrapHandler);

  let syncing=false;
  const fromBar=()=>{
    if(syncing)return;
    syncing=true;
    wrap.scrollLeft=bar.scrollLeft;
    syncing=false;
  };
  const fromWrap=()=>{
    if(syncing)return;
    syncing=true;
    bar.scrollLeft=wrap.scrollLeft;
    syncing=false;
  };

  bar.addEventListener('scroll',fromBar,{passive:true});
  wrap.addEventListener('scroll',fromWrap,{passive:true});
  bar.__nflPptWrap=wrap;
  bar.__nflPptBarHandler=fromBar;
  bar.__nflPptWrapHandler=fromWrap;
}

export function ensureNflPlayerPropToolScrollerV938(){
  const tool=document.getElementById(TOOL_ID);
  const wrap=tool?.querySelector('.nfl-ppt-table-wrap');
  const table=wrap?.querySelector('.nfl-ppt-table');
  if(!tool||!wrap||!table)return false;

  let bar=tool.querySelector(`.${BAR_CLASS}`);
  if(!bar){
    bar=document.createElement('div');
    bar.className=BAR_CLASS;
    bar.setAttribute('role','scrollbar');
    bar.setAttribute('aria-label','Scroll player prop table horizontally');
    const inner=document.createElement('div');
    inner.className=INNER_CLASS;
    bar.appendChild(inner);
    wrap.before(bar);
  }

  const inner=bar.querySelector(`.${INNER_CLASS}`);
  const width=Math.max(table.scrollWidth,table.offsetWidth,wrap.scrollWidth);
  if(inner)inner.style.width=`${Math.max(width,wrap.clientWidth+1)}px`;
  bar.style.display=width>wrap.clientWidth+2?'block':'none';
  bindScrollSync(bar,wrap);
  if(Math.abs(bar.scrollLeft-wrap.scrollLeft)>1)bar.scrollLeft=wrap.scrollLeft;
  return true;
}

function scheduleScroller(){
  clearRetries();
  for(const delay of [0,40,100,220,450,800,1400,2400,4000]){
    const id=setTimeout(()=>{
      if(ensureNflPlayerPropToolScrollerV938())clearRetries();
    },delay);
    retryTimers.push(id);
  }
}

function onClickCapture(e){
  const target=e.target;
  if(target.closest?.(`#${BUTTON_ID}`)||target.closest?.(`#${TOOL_ID} #nflPptRefresh`)||target.closest?.(`#${TOOL_ID} #nflPptRetry`))scheduleScroller();
}

export function installNflPlayerPropToolPolishV938(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  loadStyle();
  document.addEventListener('click',onClickCapture,true);
  window.addEventListener('resize',scheduleScroller,{passive:true});
  scheduleScroller();
}

export const __NFL_PLAYER_PROP_TOOL_POLISH_V938_TEST__={ensureNflPlayerPropToolScrollerV938,scheduleScroller};
