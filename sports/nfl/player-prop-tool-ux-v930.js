const TOOL_ID='nflPlayerPropTool';
const BUTTON_ID='nflPlayerPropToolBtn';
const STASH_ID='nflPlayerPropToolBaseStash';
const STYLE_ID='nfl-player-prop-tool-smooth-v932';
const CLOSE_SELECTOR='[data-nfl-close-modal],.modal-close,.ms-modal-x';
let installed=false;
let returnState=null;
let restoreRaf=0;
let restoreFrames=0;
let pendingStamp=0;
let stampRaf=0;

function tool(){return document.getElementById(TOOL_ID);}
function tableWrap(root=tool()){return root?.querySelector('.nfl-ppt-table-wrap')||null;}
function ensureSmoothStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    html:has(#${TOOL_ID}),body:has(#${TOOL_ID}){scroll-behavior:auto!important}
    body:has(#${TOOL_ID}){background-attachment:scroll!important}
    #nflView #${TOOL_ID} .nfl-ppt-table tbody tr[data-nfl-ppt-row]{contain:layout paint!important}
  `;
  document.head.appendChild(style);
}
function modalNodeVisible(node){
  if(!node||node.hidden||node.getAttribute?.('aria-hidden')==='true')return false;
  const style=getComputedStyle(node);
  return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)!==0&&node.getClientRects().length>0;
}
function modalIsOpen(){
  return [...document.querySelectorAll('#nflView .tso-nfl-player-card-v70,#nflView .tso-nfl-player-card-v72,#nflView .ms-modal')].some(modalNodeVisible);
}
function stampSnapshot(root,at,label){
  if(!root||!at)return false;
  const head=root.querySelector('.nfl-ppt-head p');
  if(!head)return false;
  let marker=head.querySelector('.nfl-ppt-client-updated');
  if(!marker){
    head.append(document.createTextNode(' · '));
    marker=document.createElement('span');
    marker.className='nfl-ppt-client-updated';
    head.append(marker);
  }
  marker.textContent=`${label} ${new Date(at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'})}`;
  root.dataset.nflPptClientUpdatedAt=new Date(at).toISOString();
  return true;
}
function queueStamp(label='snapshot loaded',previousTable=null){
  if(stampRaf)cancelAnimationFrame(stampRaf);
  let frames=0;
  const run=()=>{
    stampRaf=0;
    const root=tool();
    const currentTable=root?.querySelector('.nfl-ppt-table');
    if(root?.dataset.nflPptSnapshot==='ready'&&(!previousTable||currentTable!==previousTable)&&stampSnapshot(root,pendingStamp,label))return;
    if(++frames<900)stampRaf=requestAnimationFrame(run);
  };
  stampRaf=requestAnimationFrame(run);
}
function captureReturnState(){
  const root=tool(),wrap=tableWrap(root);
  if(!root)return;
  returnState={x:window.scrollX,y:window.scrollY,tableX:wrap?.scrollLeft||0,toolRef:root};
}
function recoverSavedTool(){
  if(!returnState?.toolRef||tool()||modalIsOpen())return false;
  const root=document.getElementById('nflView');
  if(!root)return false;
  const savedTool=returnState.toolRef;
  const generated=root.querySelector(`#${TOOL_ID}`);
  if(generated&&generated!==savedTool)generated.remove();
  let stash=root.querySelector(`#${STASH_ID}`);
  if(!stash){
    stash=document.createElement('div');
    stash.id=STASH_ID;
    stash.hidden=true;
    while(root.firstChild)stash.appendChild(root.firstChild);
    root.appendChild(stash);
  }
  root.appendChild(savedTool);
  savedTool.dataset.nflPptSnapshot='ready';
  document.getElementById(BUTTON_ID)?.classList.add('is-active');
  return true;
}
function restoreReturnState(){
  restoreRaf=0;
  if(!returnState)return;
  recoverSavedTool();
  const root=tool(),wrap=tableWrap(root);
  if(!root||root.dataset.nflPptSnapshot!=='ready'){
    if(++restoreFrames<480)restoreRaf=requestAnimationFrame(restoreReturnState);
    return;
  }
  const saved=returnState;
  returnState=null;
  restoreFrames=0;
  if(wrap)wrap.scrollLeft=saved.tableX;
  window.scrollTo(saved.x,saved.y);
  requestAnimationFrame(()=>{
    const currentWrap=tableWrap();
    if(currentWrap)currentWrap.scrollLeft=saved.tableX;
    window.scrollTo(saved.x,saved.y);
  });
}
function queueReturnRestore(){
  if(restoreRaf)cancelAnimationFrame(restoreRaf);
  restoreFrames=0;
  restoreRaf=requestAnimationFrame(restoreReturnState);
}
function onClickCapture(event){
  const target=event.target;
  if(target.closest?.(`#${BUTTON_ID}`)){
    if(!pendingStamp){pendingStamp=Date.now();queueStamp('snapshot loaded');}
    return;
  }
  const root=target.closest?.(`#${TOOL_ID}`);
  if(root&&target.closest?.('[data-nfl-tool-player]')){captureReturnState();return;}
  if(root&&target.closest?.('#nflPptRefresh')){
    pendingStamp=Date.now();
    queueStamp('snapshot updated',root.querySelector('.nfl-ppt-table'));
    return;
  }
  if(target.closest?.(CLOSE_SELECTOR)&&returnState)queueReturnRestore();
}
function onKeyDown(event){
  if(event.key==='Escape'&&returnState)queueReturnRestore();
}

export function installNflPlayerPropToolUxV930(){
  if(typeof document==='undefined'||installed)return;
  installed=true;
  ensureSmoothStyle();
  document.addEventListener('click',onClickCapture,true);
  document.addEventListener('keydown',onKeyDown,true);
}

export const __NFL_PLAYER_PROP_TOOL_UX_V930_TEST__={captureReturnState,queueReturnRestore,stampSnapshot,recoverSavedTool,modalNodeVisible};
