const TOOL_ID='nflPlayerPropTool';
const BUTTON_ID='nflPlayerPropToolBtn';
const STATIC_FLAG='__TSO_NFL_PROP_SNAPSHOT_ACTIVE__';
const BLOCKED_PATHS=[
  '/slates/nfl-live.json',
  '/slates/nfl-halftime.json',
  '/slates/nfl-live-odds.json',
  '/slates/nfl-quarter.json',
  '/functions/v1/nfl-live'
];

let installed=false;
let installBase=null;
let upstreamFetch=null;
let guardActive=false;
let retryTimers=[];
let sidebarObserver=null;
let sidebarObserverTarget=null;

function requestUrl(input){
  if(typeof input==='string')return input;
  if(input instanceof URL)return input.href;
  return String(input?.url||'');
}
function shouldBlock(input){
  const url=requestUrl(input);
  return BLOCKED_PATHS.some(path=>url.includes(path));
}
function blockedResponse(){
  return Promise.resolve(new Response('',{status:503,statusText:'NFL Prop Tool static snapshot'}));
}
function guardedFetch(input,init){
  if(guardActive&&shouldBlock(input))return blockedResponse();
  return upstreamFetch.call(window,input,init);
}
function enableStaticMode(){
  if(typeof window==='undefined')return;
  window[STATIC_FLAG]=true;
  document.documentElement.dataset.nflPropSnapshot='static';
  if(guardActive)return;
  upstreamFetch=window.fetch;
  guardActive=true;
  window.fetch=guardedFetch;
}
function disableStaticMode(){
  if(typeof window==='undefined')return;
  window[STATIC_FLAG]=false;
  delete document.documentElement.dataset.nflPropSnapshot;
  if(guardActive&&window.fetch===guardedFetch&&upstreamFetch)window.fetch=upstreamFetch;
  guardActive=false;
  upstreamFetch=null;
}
function sidePropsAnchor(){
  const accordion=document.querySelector('#sbSportAccordion [data-nfl-preview-tab="props"],#sbSportAccordion [data-nfl-tab="props"]');
  if(accordion)return accordion;
  const legacy=document.querySelector('#nflSideNav [data-nfl-tab="props"],#nflSideNav [data-nfl-preview-tab="props"]');
  const legacyNav=legacy?.closest?.('#nflSideNav');
  return legacyNav&&!legacyNav.hasAttribute('hidden')?legacy:null;
}
function watchSidebar(){
  if(typeof MutationObserver==='undefined')return;
  const host=document.getElementById('sbSportAccordion');
  const target=host?.parentElement||host;
  if(!target||sidebarObserverTarget===target)return;
  sidebarObserver?.disconnect();
  sidebarObserverTarget=target;
  sidebarObserver=new MutationObserver(()=>{
    if(!document.getElementById(BUTTON_ID))queueMicrotask(()=>ensureButton());
  });
  sidebarObserver.observe(target,{childList:true,subtree:true});
}
function moveButtonToSideNav(btn,anchor){
  if(!btn||!anchor||btn.previousElementSibling===anchor)return;
  const classes=String(anchor.className||'').split(/\s+/).filter(Boolean).filter(x=>x!=='is-active');
  btn.className=[...new Set([...classes,'nfl-player-prop-tool-trigger'])].join(' ');
  btn.removeAttribute('data-nfl-tab');
  btn.removeAttribute('data-nfl-preview-tab');
  anchor.insertAdjacentElement('afterend',btn);
}
function ensureButton(){
  if(typeof installBase!=='function')return false;
  watchSidebar();
  const sideAnchor=sidePropsAnchor();
  installBase();
  let btn=document.getElementById(BUTTON_ID);
  if(btn){if(sideAnchor)moveButtonToSideNav(btn,sideAnchor);return true;}
  if(!sideAnchor)return false;

  let host=document.getElementById('sbSportAccordion');
  let tempHost=false;
  if(!host){
    host=document.createElement('div');
    host.id='sbSportAccordion';
    host.hidden=true;
    document.body.appendChild(host);
    tempHost=true;
  }
  let compatAnchor=host.querySelector('[data-nfl-preview-tab="props"],[data-nfl-tab="props"]');
  let tempAnchor=false;
  if(!compatAnchor){
    compatAnchor=document.createElement('button');
    compatAnchor.type='button';
    compatAnchor.hidden=true;
    compatAnchor.dataset.nflTab='props';
    host.appendChild(compatAnchor);
    tempAnchor=true;
  }
  installBase();
  btn=document.getElementById(BUTTON_ID);
  if(btn)moveButtonToSideNav(btn,sideAnchor);
  if(tempAnchor)compatAnchor.remove();
  if(tempHost)host.remove();
  return !!btn;
}
function scheduleEnsureButton(){
  retryTimers.forEach(clearTimeout);
  retryTimers=[];
  for(const delay of [0,80,220,500,1000,2000]){
    retryTimers.push(setTimeout(()=>ensureButton(),delay));
  }
}
function onClickCapture(e){
  const target=e.target;
  if(target.closest?.(`#${BUTTON_ID}`)){
    enableStaticMode();
    return;
  }
  const nav=target.closest?.('#sbSportAccordion [data-nfl-preview-tab],#sbSportAccordion [data-nfl-tab],#nflSideNav [data-nfl-tab],#nflSideNav [data-nfl-preview-tab]');
  if(nav){
    disableStaticMode();
    setTimeout(ensureButton,0);
    setTimeout(ensureButton,120);
  }
}
function onHashChange(){
  if(!String(location.hash||'').toLowerCase().startsWith('#nfl'))disableStaticMode();
  scheduleEnsureButton();
}

export function installNflPlayerPropToolStaticGuardV929({installPlayerPropTool}={}){
  if(typeof installPlayerPropTool==='function')installBase=installPlayerPropTool;
  ensureButton();
  if(installed)return;
  installed=true;
  document.addEventListener('click',onClickCapture,true);
  window.addEventListener('hashchange',onHashChange);
  window.addEventListener('pagehide',disableStaticMode);
  scheduleEnsureButton();
}

export const __NFL_PLAYER_PROP_TOOL_STATIC_GUARD_V929_TEST__={
  BLOCKED_PATHS,shouldBlock,enableStaticMode,disableStaticMode,ensureButton
};
