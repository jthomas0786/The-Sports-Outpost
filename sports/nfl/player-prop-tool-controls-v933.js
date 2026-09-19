import { __NFL_PLAYER_PROP_TOOL_V926_TEST__ as base } from './player-prop-tool-v926.js?v=92.7';

const TOOL_ID='nflPlayerPropTool';
const BUTTON_ID='nflPlayerPropToolBtn';
const state=base?.state;
const markets=base?.MARKET_META||{};
let installed=false;
let patchTimers=[];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function clearPatchTimers(){
  for(const id of patchTimers)clearTimeout(id);
  patchTimers=[];
}

function propOptions(){
  return `<option value="ALL">All Props</option>${Object.entries(markets).map(([key,meta])=>`<option value="${esc(key)}">${esc(meta?.label||meta?.short||key)}</option>`).join('')}`;
}

function patchPropControl(){
  const tool=document.getElementById(TOOL_ID);
  if(!tool)return false;

  let controlReady=false;
  const existingTop=tool.querySelector('.nfl-ppt-selects #nflPptMarket[data-nfl-ppt-top-prop="1"]');
  if(existingTop){
    if(state&&[...existingTop.options].some(o=>o.value===String(state.market)))existingTop.value=String(state.market);
    controlReady=true;
  }else{
    const week=tool.querySelector('.nfl-ppt-selects #nflPptWeek');
    if(!week)return false;
    const weekLabel=week.closest('label');
    if(!weekLabel)return false;

    const oldMarket=tool.querySelector('#nflPptFilterPanel #nflPptMarket');
    oldMarket?.closest('label')?.remove();

    weekLabel.innerHTML=`<span>Prop</span><select id="nflPptMarket" data-nfl-ppt-top-prop="1">${propOptions()}</select>`;
    const select=weekLabel.querySelector('#nflPptMarket');
    if(select&&state&&[...select.options].some(o=>o.value===String(state.market)))select.value=String(state.market);
    tool.dataset.nflPptPropSelector='top';
    controlReady=true;
  }

  const simAuthority=window.__TSO_NFL_PROP_SIM_V939__;
  const simReady=simAuthority?.applyIfReady?.();
  return controlReady&&simReady===true;
}

function schedulePatch(){
  clearPatchTimers();
  for(const delay of [0,40,100,220,450,800,1400,2400,4000]){
    const id=setTimeout(()=>{
      if(patchPropControl())clearPatchTimers();
    },delay);
    patchTimers.push(id);
  }
}

function onClickCapture(e){
  const target=e.target;
  if(target.closest?.(`#${BUTTON_ID}`)||target.closest?.(`#${TOOL_ID} #nflPptRefresh`)||target.closest?.(`#${TOOL_ID} #nflPptRetry`))schedulePatch();
}

export function installNflPlayerPropToolControlsV933(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  document.addEventListener('click',onClickCapture,true);
  schedulePatch();
}

export const __NFL_PLAYER_PROP_TOOL_CONTROLS_V933_TEST__={patchPropControl,schedulePatch,propOptions};