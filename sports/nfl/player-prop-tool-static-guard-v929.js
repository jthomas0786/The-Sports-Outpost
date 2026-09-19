import {suspendNflBackgroundFreezeV930,resumeNflBackgroundFreezeV930,snapshotNflBackgroundFreezeV930} from './player-prop-tool-background-freeze-v930.js?v=93.0';

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
const SOURCE_PATHS=[
  '/slates/nfl.json',
  '/slates/nfl-odds.json',
  '/slates/nfl-sim.json',
  '/slates/nfl-research.json'
];

let installed=false;
let installBase=null;
let upstreamFetch=null;
let guardActive=false;
let retryTimers=[];
let sidebarObserver=null;
let sidebarObserverTarget=null;
const sourceCache=new Map();
const sourceInflight=new Map();
const sourceRefreshBudget=new Set();
const sourceNetworkCounts=new Map();

function requestUrl(input){
  if(typeof input==='string')return input;
  if(input instanceof URL)return input.href;
  return String(input?.url||'');
}
function requestPath(input){
  try{return new URL(requestUrl(input),location.href).pathname;}
  catch{return requestUrl(input).split('?')[0];}
}
function shouldBlock(input){const path=requestPath(input);return BLOCKED_PATHS.includes(path);}
function sourcePath(input){const path=requestPath(input);return SOURCE_PATHS.includes(path)?path:'';}
function blockedResponse(){return Promise.resolve(new Response('',{status:503,statusText:'NFL Prop Tool static snapshot',headers:{'x-tso-prop-static':'1'}}));}
async function fetchSource(path,input,init,{force=false}={}){
  if(!force&&sourceCache.has(path))return sourceCache.get(path).clone();
  if(!force&&sourceInflight.has(path))return (await sourceInflight.get(path)).clone();
  const promise=Promise.resolve(upstreamFetch.call(window,input,init)).then(response=>{
    sourceNetworkCounts.set(path,(sourceNetworkCounts.get(path)||0)+1);
    if(response?.ok)sourceCache.set(path,response.clone());
    return response;
  }).finally(()=>sourceInflight.delete(path));
  sourceInflight.set(path,promise);
  return (await promise).clone();
}
async function guardedFetch(input,init){
  if(!guardActive)return upstreamFetch.call(window,input,init);
  const path=sourcePath(input);
  if(path){
    const force=sourceRefreshBudget.delete(path);
    return fetchSource(path,input,init,{force});
  }
  if(shouldBlock(input))return blockedResponse();
  return upstreamFetch.call(window,input,init);
}
function clearRetryTimers(){retryTimers.forEach(clearTimeout);retryTimers=[];}
function armSourceRefresh(){SOURCE_PATHS.forEach(path=>sourceRefreshBudget.add(path));}
function enableStaticMode(){
  if(typeof window==='undefined')return;
  window[STATIC_FLAG]=true;
  document.documentElement.dataset.nflPropSnapshot='static';
  clearRetryTimers();
  suspendNflBackgroundFreezeV930('nfl-player-prop-tool');
  if(guardActive)return;
  upstreamFetch=window.fetch;
  guardActive=true;
  window.fetch=guardedFetch;
}
function disableStaticMode(){
  if(typeof window==='undefined')return;
  window[STATIC_FLAG]=false;
  delete document.documentElement.dataset.nflPropSnapshot;
  sourceRefreshBudget.clear();
  if(guardActive&&window.fetch===guardedFetch&&upstreamFetch)window.fetch=upstreamFetch;
  guardActive=false;
  upstreamFetch=null;
  resumeNflBackgroundFreezeV930();
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
    host=document.createElement('div');host.id='sbSportAccordion';host.hidden=true;document.body.appendChild(host);tempHost=true;
  }
  let compatAnchor=host.querySelector('[data-nfl-preview-tab="props"],[data-nfl-tab="props"]');
  let tempAnchor=false;
  if(!compatAnchor){
    compatAnchor=document.createElement('button');compatAnchor.type='button';compatAnchor.hidden=true;compatAnchor.dataset.nflTab='props';host.appendChild(compatAnchor);tempAnchor=true;
  }
  installBase();
  btn=document.getElementById(BUTTON_ID);
  if(btn)moveButtonToSideNav(btn,sideAnchor);
  if(tempAnchor)compatAnchor.remove();
  if(tempHost)host.remove();
  return !!btn;
}
function scheduleEnsureButton(){
  clearRetryTimers();
  if(guardActive)return;
  for(const delay of [0,80,220,500,1000,2000])retryTimers.push(setTimeout(()=>ensureButton(),delay));
}
function onClickCapture(e){
  const target=e.target;
  if(target.closest?.(`#${BUTTON_ID}`)){enableStaticMode();return;}
  if(target.closest?.(`#${TOOL_ID} #nflPptRefresh`)){
    armSourceRefresh();
    return;
  }
  const nav=target.closest?.('#sbSportAccordion [data-nfl-preview-tab],#sbSportAccordion [data-nfl-tab],#nflSideNav [data-nfl-tab],#nflSideNav [data-nfl-preview-tab]');
  if(nav){
    disableStaticMode();
    scheduleEnsureButton();
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
  window.__nflPlayerPropToolStaticGuardV929Test={
    enableStaticMode,disableStaticMode,armSourceRefresh,
    sourcePaths:[...SOURCE_PATHS],blockedPaths:[...BLOCKED_PATHS],
    sourceNetworkCounts:()=>Object.fromEntries(sourceNetworkCounts),
    sourceCacheSize:()=>sourceCache.size,
    backgroundSnapshot:snapshotNflBackgroundFreezeV930
  };
}

export const __NFL_PLAYER_PROP_TOOL_STATIC_GUARD_V929_TEST__={
  BLOCKED_PATHS,SOURCE_PATHS,shouldBlock,sourcePath,enableStaticMode,disableStaticMode,armSourceRefresh,ensureButton
};
