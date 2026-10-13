// TSO 2.0 device push registration. Permission is requested only on a user click.
const VAPID_PUBLIC_KEY='BB8BacX7NXp-35YfHDBpYGf3sofd6YcS4tt45h7KxDUhTQxSBn5cpGlEKQKg_oPfpLFIx0Lwwmwx7hd7tx1Re2M';
const button=document.querySelector('[data-push-toggle]');
const status=document.querySelector('[data-push-status]');
const supported=()=>Boolean(window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window);
const ios=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const bytes=base64=>Uint8Array.from(atob(base64.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-base64.length%4)%4)),c=>c.charCodeAt(0));

const preferencesHost=document.querySelector('[data-push-preferences]');
const preferencesNote=document.querySelector('[data-push-pref-note]');
const SECTIONS=[
  {sport:'mlb',title:'MLB',options:[['home_runs','Home runs'],['multi_homer','Multi-HR games'],['model_alerts','Model alerts (upcoming)',false]]},
  {sport:'nfl',title:'NFL',options:[['touchdowns','Touchdowns'],['watchlist','Watched player milestones'],['model_alerts','Model alerts (upcoming)',false]]},
  {sport:'nba',title:'NBA',options:[['milestones','Player milestones (20+ PTS, 10+ REB, 10+ AST)'],['model_alerts','Model alerts (upcoming)',false]]},
  {sport:'nhl',title:'NHL',options:[['goals','Goal scorers'],['hat_tricks','Hat tricks'],['game_edge','Puck-line game alerts'],['model_alerts','Model alerts (upcoming)',false]]}
];
const DEFAULTS={
  mlb:{home_runs:true,multi_homer:true,model_alerts:false},
  nfl:{touchdowns:true,watchlist:true,model_alerts:false},
  nba:{milestones:true,model_alerts:false},
  nhl:{goals:true,hat_tricks:true,game_edge:true,model_alerts:false}
};
let preferenceEndpoint='',preferenceLoading=false;
let currentPreferences=null;
function normalizePrefs(value){
  const next={};
  for(const [sport,options] of Object.entries(DEFAULTS)){
    next[sport]={};
    for(const [key,fallback] of Object.entries(options))next[sport][key]=typeof value?.[sport]?.[key]==='boolean'?value[sport][key]:fallback;
  }
  return next;
}
function showPreferences(visible){
  if(preferencesHost)preferencesHost.hidden=!visible;
  if(preferencesNote)preferencesNote.hidden=!visible;
}
function renderPreferences(prefs){
  if(!preferencesHost)return;
  const fragment=document.createDocumentFragment();
  for(const section of SECTIONS){
    const fieldset=document.createElement('fieldset');fieldset.className='push-pref-sport';
    const legend=document.createElement('legend');legend.textContent=section.title;fieldset.append(legend);
    for(const [key,label,available=true] of section.options){
      const item=document.createElement('label');item.className='push-pref-item';
      const input=document.createElement('input');input.type='checkbox';
      input.dataset.sport=section.sport;input.dataset.alert=key;
      input.checked=available&&prefs[section.sport][key];input.disabled=!available;
      const description=document.createElement('span');description.textContent=label;
      if(!available)description.className='push-pref-upcoming';
      item.append(input,description);fieldset.append(item);
    }
    fragment.append(fieldset);
  }
  preferencesHost.replaceChildren(fragment);
}
async function loadPreferences(endpoint,owner,force=false){
  if(!preferencesHost||preferenceLoading||(!force&&endpoint===preferenceEndpoint&&currentPreferences))return;
  preferenceLoading=true;
  try{
    const found=await window.TSO_AUTH.getPushPreferences(endpoint);
    if(String(window.TSO_AUTH?.user?.id||'')!==owner)return;
    if(!found){showPreferences(false);return;}
    currentPreferences=normalizePrefs(found);preferenceEndpoint=endpoint;
    renderPreferences(currentPreferences);showPreferences(true);
  }catch(error){
    showPreferences(false);copy('Alerts active, but preferences could not load: '+String(error?.message||error),'error');
  }finally{preferenceLoading=false;}
}
preferencesHost?.addEventListener('change',async event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=='checkbox'||!currentPreferences||busy)return;
  const sport=input.dataset.sport,key=input.dataset.alert;
  if(!Object.hasOwn(DEFAULTS[sport]||{},key)||key==='model_alerts')return;
  const owner=String(window.TSO_AUTH?.user?.id||'');
  if(!owner||!preferenceEndpoint){input.checked=!input.checked;return;}
  const original=currentPreferences;
  const next=normalizePrefs(currentPreferences);next[sport][key]=input.checked;
  busy=true;
  preferencesHost.querySelectorAll('input').forEach(n=>{n.disabled=true;});
  copy('Saving '+sport.toUpperCase()+' alert settings…');
  try{
    currentPreferences=await window.TSO_AUTH.savePushPreferences(preferenceEndpoint,next);
    copy('Alert settings saved for this device.','enabled');
  }catch(error){
    currentPreferences=original;input.checked=original[sport][key];
    copy('Could not save alert preferences: '+String(error?.message||error),'error');
  }finally{busy=false;renderPreferences(currentPreferences);}
});

let registration=null;
let busy=false;
let registeredOwner='';
let statusTimer=0;
const copy=(text,mode='idle')=>{if(status){status.textContent=text;status.dataset.state=mode;}};
async function setupWorker(){
  if(!supported())return null;
  if(registration)return registration;
  registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
  return registration;
}
async function probe(){
  if(busy)return;
  if(ios()&&!standalone()){
    button.hidden=false;button.disabled=true;button.textContent='ADD TO HOME SCREEN FIRST';
    copy('On iPhone: Safari → Share → Add to Home Screen. Open TSO from that icon.');
    return;
  }
  if(!supported()){button.hidden=true;copy('Background push is not supported on this browser.');return;}
  button.hidden=false;
  const user=window.TSO_AUTH?.user;
  if(!user){currentPreferences=null;preferenceEndpoint='';showPreferences(false);button.disabled=false;button.textContent='SIGN IN TO ENABLE';copy('Sign in to receive device alerts.');return;}
  if(Notification.permission==='denied'){button.disabled=true;button.textContent='BLOCKED IN DEVICE SETTINGS';copy('Allow notifications for TSO in your device settings.');return;}
  let reg,sub;
  try{reg=await setupWorker();sub=await reg.pushManager.getSubscription();}
  catch(error){button.disabled=true;button.textContent='DEVICE ALERTS UNAVAILABLE';copy('Could not register service worker: '+String(error?.message||error),'error');return;}
  if(sub){
    let enabled=false;
    try{enabled=await window.TSO_AUTH?.getPushSubscription?.(sub.endpoint);}
    catch(error){copy('Could not verify registration: '+String(error?.message||error),'error');button.textContent='RETRY DEVICE ALERTS';return;}
    button.disabled=false;
    button.textContent=enabled?'DISABLE DEVICE ALERTS':'ENABLE DEVICE ALERTS';
    copy(enabled?'This device is registered for background push.':'This device has a subscription, but is not registered to your account.',enabled?'enabled':'idle');
    registeredOwner=enabled?String(user.id):'';
    if(enabled)await loadPreferences(sub.endpoint,String(user.id));
    else{currentPreferences=null;preferenceEndpoint='';showPreferences(false);}
  }else{currentPreferences=null;preferenceEndpoint='';showPreferences(false);button.disabled=false;button.textContent='ENABLE DEVICE ALERTS';copy('Notifications work when the app is closed after you allow them.');}
}
async function switchPush(){
  if(busy)return;
  if(!window.TSO_AUTH?.user){window.TSO_AUTH?.openSignIn?.();return;}
  if(ios()&&!standalone()){copy('Add TSO to your Home Screen, then enable alerts inside the installed app.');return;}
  if(!supported())return;
  busy=true;button.disabled=true;
  try{
    // Request permission synchronously from this click; critical for Safari/iOS.
    const permission=Notification.permission==='default'?Notification.requestPermission():Promise.resolve(Notification.permission);
    const result=await permission;
    if(result!=='granted'){copy('Notification permission was not granted.','error');return;}
    const reg=await setupWorker();
    let sub=await reg.pushManager.getSubscription();
    const current=sub?await window.TSO_AUTH.getPushSubscription(sub.endpoint):false;
    if(current){
      await window.TSO_AUTH.removePushSubscription(sub.endpoint);
      // Browser permission remains; user can opt back in later.
      await sub.unsubscribe();
      registeredOwner='';
      currentPreferences=null;preferenceEndpoint='';showPreferences(false);
      copy('Device alerts disabled.','idle');
    }else{
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(VAPID_PUBLIC_KEY)});
      const j=sub.toJSON();
      if(!j.endpoint||!j.keys?.p256dh||!j.keys?.auth)throw Error('Push service returned an incomplete subscription.');
      await window.TSO_AUTH.savePushSubscription(j);
      registeredOwner=String(window.TSO_AUTH?.user?.id||'');
      copy('Background push is enabled for this device.','enabled');
      await loadPreferences(j.endpoint,String(window.TSO_AUTH?.user?.id||''),true);
    }
  }catch(err){console.warn('[TSO2 push]',err);copy('Could not set up push: '+String(err.message||err),'error');}
  finally{busy=false;button.disabled=false;void probe();}
}
button?.addEventListener('click',()=>{void switchPush();});
window.addEventListener('tso2-auth-changed',()=>{void probe();});
navigator.serviceWorker?.addEventListener?.('message',event=>{if(event.data?.type==='tso2-push-subscription-changed')void probe();});
window.addEventListener('focus',()=>{void probe();});
if(supported())void setupWorker().then(()=>probe()).catch(e=>{copy('Service worker unavailable: '+String(e.message||e),'error');});
else void probe();
