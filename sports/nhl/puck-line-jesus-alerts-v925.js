import {API,getJSON,loadScoreboard,mergeSummary,text as esc} from './data.js?v=90.23';
import {buildPuckLineJesusModel} from './puck-line-jesus.js?v=90.29';
import {preserveTrackedPuckLines} from './plj-line-lock-v929.js?v=90.29';
import {setPljRemotePushEnabled,getPljRemotePushStatus} from './plj-push-client-v926.js?v=90.26';

const ALERT_PREF='tso.plj.alerts.v1';
const ALERTED_PREF='tso.plj.alerted.v1';
const HISTORY_PATH='./slates/nhl-plj-history.json';
const LINES_PATH='./slates/nhl-puck-lines.json';
const POLL_MS=10000;
let installed=false,timer=null,refreshing=false,observer=null,queued=false,historyAt=0,lastHistory=null,remoteState='unknown';
const states=new Map();

const alertsEnabled=()=>{try{return localStorage.getItem(ALERT_PREF)==='1';}catch{return false;}};
const setAlertsEnabled=v=>{try{localStorage.setItem(ALERT_PREF,v?'1':'0');}catch{}};
const alertedKeys=()=>{try{const v=JSON.parse(localStorage.getItem(ALERTED_PREF)||'[]');return Array.isArray(v)?v:[];}catch{return [];}};
const hasAlerted=k=>alertedKeys().includes(k);
const markAlerted=k=>{try{const next=[...alertedKeys().filter(x=>x!==k),k].slice(-160);localStorage.setItem(ALERTED_PREF,JSON.stringify(next));}catch{}};
const score=x=>`${x.game.away?.abbr||'AWAY'} ${x.game.away?.score??'—'} · ${x.game.home?.abbr||'HOME'} ${x.game.home?.score??'—'}`;
const clock=x=>x.game.status==='post'?'FINAL':`P${x.game.period||'—'} · ${x.game.clock||x.game.detail||'LIVE'}`;

function ensureStyle(){
 if(document.getElementById('nhl-plj-alerts-v925-css'))return;
 const l=document.createElement('link');l.id='nhl-plj-alerts-v925-css';l.rel='stylesheet';l.href='./sports/nhl/puck-line-jesus-alerts-v925.css?v=90.25';document.head.appendChild(l);
}
function toast(title,body,tone='live'){
 let host=document.getElementById('hkPljAlertStack');
 if(!host){host=document.createElement('div');host.id='hkPljAlertStack';host.className='plj-alert-stack';host.setAttribute('aria-live','polite');document.body.appendChild(host);}
 const el=document.createElement('button');el.type='button';el.className=`plj-alert-toast tone-${tone}`;el.innerHTML=`<b>${esc(title)}</b><span>${esc(body)}</span><small>Open Puck Line Jesus →</small>`;
 el.addEventListener('click',()=>{window.DW_openPuckLineJesus?.();el.remove();});host.appendChild(el);setTimeout(()=>el.remove(),12000);
}
async function browserNotice(title,body,tag){
 if(!('Notification' in window)||Notification.permission!=='granted')return;
 const options={body,tag,renotify:true,icon:'./icon-hockey.png',badge:'./icon-hockey.png'};
 try{
  const reg=await navigator.serviceWorker?.getRegistration?.();
  if(reg?.showNotification){await reg.showNotification(title,options);return;}
 }catch{}
 try{new Notification(title,options);}catch{}
}
function alertCopy(x){
 const fav=x.line?.puckLine?.favoriteAbbr||x.side?.favorite?.abbr||'Favorite';
 if(x.code==='PLJ_WATCH')return {title:'⚡ Puck Line Jesus Watch',body:`${fav} -1.5 is up one with ${clock(x)}. Empty-net window approaching.`,tone:'watch'};
 if(x.code==='PLJ_LIVE')return {title:'⚡ PUCK LINE JESUS LIVE',body:`${fav} -1.5 · ${score(x)} · ${clock(x)} · opponent net empty.`,tone:'live'};
 if(x.code==='BACKDOOR_DANGER')return {title:'Backdoor Danger',body:`${fav} -1.5 is covering by exactly two with ${clock(x)}.`,tone:'danger'};
 if(x.code==='PLJ_CASHED')return {title:'⚡ PLJ CASHED',body:`${fav} -1.5 got the late empty-net cover · ${score(x)}.`,tone:'cash'};
 if(x.code==='LATE_CASH')return {title:'Late Puck-Line Cover',body:`${fav} -1.5 moved from a one-goal lead to a cover late · ${score(x)}.`,tone:'cash'};
 if(x.code==='BACKDOORED')return {title:'Backdoor Pain',body:`${fav} -1.5 lost the late cover · ${score(x)}.`,tone:'danger'};
 return null;
}
async function emitAlert(x){
 const copy=alertCopy(x);if(!copy)return;
 const key=`${x.game.slateDate||''}:${x.game.id}:${x.code}`;if(hasAlerted(key))return;markAlerted(key);
 toast(copy.title,copy.body,copy.tone);await browserNotice(copy.title,copy.body,`plj-${x.game.id}-${x.code}`);
}
function processModel(model){
 for(const x of model?.tracked||[]){
  const id=String(x.game.id),prev=states.get(id);states.set(id,x.code);
  const alertable=['PLJ_WATCH','PLJ_LIVE','BACKDOOR_DANGER','PLJ_CASHED','LATE_CASH','BACKDOORED'].includes(x.code);
  if(!alertable||prev===x.code)continue;
  if(x.code==='PLJ_WATCH'&&prev==='PLJ_LIVE')continue;
  emitAlert(x);
 }
}
async function liveSlate(){
 const published=await getJSON(`./slates/nhl.json?t=${Date.now()}`);let slate=published;
 try{
  const live=await loadScoreboard();const byId=new Map((live?.games||[]).map(g=>[String(g.id),g]));
  slate={...published,generatedAt:live?.generatedAt||published.generatedAt,games:(published?.games||[]).map(g=>byId.get(String(g.id))||g)};
 }catch{}
 await Promise.all((slate.games||[]).filter(g=>['in','post'].includes(g.status)).map(async g=>{try{Object.assign(g,mergeSummary(g,await getJSON(`${API}/summary?event=${g.id}`)));}catch{g.summaryUnavailable=true;}}));
 return slate;
}
async function refreshAlerts(){
 if(!alertsEnabled()||refreshing)return;refreshing=true;
 try{
  const [rawLines,history,slate]=await Promise.all([getJSON(`${LINES_PATH}?t=${Date.now()}`),getJSON(`${HISTORY_PATH}?t=${Date.now()}`).catch(()=>null),liveSlate()]);
  processModel(buildPuckLineJesusModel(slate,preserveTrackedPuckLines(rawLines,history)));
 }
 catch(err){console.warn('PLJ alert refresh',err);}
 finally{refreshing=false;}
}
function startPolling(){if(timer||!alertsEnabled())return;refreshAlerts();timer=setInterval(refreshAlerts,POLL_MS);}
function stopPolling(){if(timer){clearInterval(timer);timer=null;}}

function outcomeLabel(g){return ({PLJ_CASHED:'PLJ CASHED',LATE_CASH:'LATE COVER',BACKDOORED:'BACKDOORED',COVERED:'COVERED',MISSED_ONE:'MISSED BY 1',MISSED:'MISSED'})[g.outcome]||g.outcome||'TRACKING';}
function historyCard(g){
 const final=g.finalScore?`${g.away?.abbr||'AWAY'} ${g.finalScore.away??'—'} · ${g.home?.abbr||'HOME'} ${g.finalScore.home??'—'}`:'Final pending';
 const decisive=g.decisiveGoal?`${g.decisiveGoal.clock||''} P${g.decisiveGoal.period||3} · ${g.decisiveGoal.text||'Late goal'}`:'No late swing recorded';
 return `<article class="plj-history-card ${g.pljCash?'is-cash':g.backdoored?'is-pain':''}"><div><span>${esc(outcomeLabel(g))}</span><small>${esc(g.date||'')}</small></div><h4>${esc(g.away?.abbr||'')} @ ${esc(g.home?.abbr||'')}</h4><p><b>${esc(g.favoriteAbbr||'')} -1.5 ${g.initialPrice==null?'':esc((Number(g.initialPrice)>0?'+':'')+g.initialPrice)}</b><span>${esc(g.initialBook||'Sportsbook')}</span></p><strong>${esc(final)}</strong><em>${esc(decisive)}</em></article>`;
}
function renderHistory(history){
 const panel=document.getElementById('hkPuckLineJesusPanel');if(!panel)return;
 let host=document.getElementById('hkPuckLineJesusHistory');
 if(!host){host=document.createElement('section');host.id='hkPuckLineJesusHistory';host.className='plj-history';document.getElementById('hkPuckLineJesusBody')?.after(host);}
 const s=history?.summary||{},completed=(history?.games||[]).filter(g=>g.status==='post').slice(0,8);
 const stamp=[history?.updatedAt||'',s.tracked||0,s.completed||0,s.pljLive||0,s.pljCashes||0,s.backdoors||0,completed.map(g=>`${g.gameId}:${g.outcome}:${g.updatedAt}`).join('|')].join('::');
 if(host.dataset.pljHistoryStamp===stamp)return;
 host.dataset.pljHistoryStamp=stamp;
 host.innerHTML=`<div class="plj-history-head"><div><span>PERMANENT LEDGER</span><h3>${esc(history?.season||'NHL')} Puck Line Jesus History</h3><p>First tracked price, live trigger history, final result and decisive late goal are preserved by the NHL bot.</p></div><small>${history?.updatedAt?`Updated ${esc(new Date(history.updatedAt).toLocaleString())}`:'Waiting for first history refresh'}</small></div><div class="plj-history-kpis"><div><b>${Number(s.completed||0)}</b><span>Finals</span></div><div><b>${Number(s.pljLive||0)}</b><span>PLJ Live</span></div><div><b>${Number(s.pljCashes||0)}</b><span>EN Cashes</span></div><div><b>${Number(s.backdoors||0)}</b><span>Backdoors</span></div></div><div class="plj-history-grid">${completed.map(historyCard).join('')||'<div class="plj-history-empty">Opening-night results will begin filling this ledger automatically.</div>'}</div>`;
}
async function refreshHistory(force=false){
 if(!document.getElementById('hkPuckLineJesusPanel'))return;
 if(!force&&lastHistory&&Date.now()-historyAt<30000){renderHistory(lastHistory);return;}
 try{lastHistory=await getJSON(`${HISTORY_PATH}?t=${Date.now()}`);historyAt=Date.now();renderHistory(lastHistory);}catch{}
}
function syncControls(){
 const panel=document.getElementById('hkPuckLineJesusPanel');if(!panel)return;
 const actions=panel.querySelector('.plj-hero-actions');if(actions&&!document.getElementById('hkPuckLineJesusAlertToggle')){
  const b=document.createElement('button');b.type='button';b.id='hkPuckLineJesusAlertToggle';b.dataset.pljAlertToggle='1';actions.insertBefore(b,actions.querySelector('[data-plj-close]'));
 }
 const b=document.getElementById('hkPuckLineJesusAlertToggle');
 if(b){
  const on=alertsEnabled(),suffix=on&&remoteState==='on'?' · Push':on&&remoteState==='signin'?' · Sign in for Push':'';
  const copy=on?`🔔 Alerts On${suffix}`:'🔕 Enable Alerts';
  b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',on?'true':'false');if(b.textContent!==copy)b.textContent=copy;
 }
 document.getElementById('hkPuckLineJesusBtn')?.classList.toggle('plj-alerts-enabled',alertsEnabled());
 refreshHistory();
}
async function syncRemotePreference(enabled){
 try{
  const result=await setPljRemotePushEnabled(enabled);
  remoteState=result.ok&&result.remote?'on':result.reason==='signin'?'signin':result.ok?'off':result.reason||'off';
  syncControls();return result;
 }catch{remoteState='error';syncControls();return {ok:false,reason:'error'};}
}
async function toggleAlerts(){
 const next=!alertsEnabled();setAlertsEnabled(next);
 if(next){
  let permission='unsupported';
  if('Notification' in window){permission=Notification.permission;try{if(permission==='default')permission=await Notification.requestPermission();}catch{}}
  syncControls();startPolling();
  const remote=await syncRemotePreference(true);
  let body='In-site PLJ alerts are on while The Sports Outpost is open.';
  if(remote.ok&&remote.remote)body='Remote PLJ push and in-site alerts are on — you can close The Sports Outpost and still get the alert.';
  else if(remote.reason==='signin')body='In-site alerts are on. Sign in to The Sports Outpost to enable background push when the site is closed.';
  else if(permission==='denied')body='Browser notifications are blocked, but in-site PLJ alerts are on while The Sports Outpost is open.';
  toast('Puck Line Jesus Alerts On',body,'live');
 }else{
  stopPolling();await syncRemotePreference(false);syncControls();toast('Puck Line Jesus Alerts Off','PLJ push and in-site alerts are paused for this device.','watch');
 }
}
async function hydrateRemoteState(){
 if(!alertsEnabled())return;
 try{const s=await getPljRemotePushStatus();remoteState=s.enabled?'on':s.reason==='signin'?'signin':'off';if(Notification.permission==='granted'&&!s.enabled)await syncRemotePreference(true);else syncControls();}catch{}
}
function queueSync(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;syncControls();});}
function click(e){if(e.target.closest?.('[data-plj-alert-toggle]')){e.preventDefault();e.stopImmediatePropagation();toggleAlerts();}}
function openFromPushUrl(){
 try{
  const url=new URL(location.href);if(url.searchParams.get('plj')!=='1')return;
  url.searchParams.delete('plj');history.replaceState({},'',url.pathname+(url.searchParams.size?`?${url.searchParams}`:'')+url.hash);
  setTimeout(()=>window.DW_openPuckLineJesus?.(),250);
 }catch{}
}

export function installPuckLineJesusAlertsV925(){
 if(installed){queueSync();if(alertsEnabled())startPolling();return;}installed=true;ensureStyle();document.addEventListener('click',click,true);
 observer=new MutationObserver(queueSync);observer.observe(document.body,{childList:true,subtree:true});queueSync();if(alertsEnabled())startPolling();
 window.DW_pljAlerts={enabled:alertsEnabled,refresh:refreshAlerts,history:()=>lastHistory,remote:()=>remoteState};
 openFromPushUrl();hydrateRemoteState();
}
