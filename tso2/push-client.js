// TSO 2.0 device push registration. Permission is requested only on a user click.
const VAPID_PUBLIC_KEY='BB8BacX7NXp-35YfHDBpYGf3sofd6YcS4tt45h7KxDUhTQxSBn5cpGlEKQKg_oPfpLFIx0Lwwmwx7hd7tx1Re2M';
const button=document.querySelector('[data-push-toggle]');
const status=document.querySelector('[data-push-status]');
const supported=()=>Boolean(window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window);
const ios=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const bytes=base64=>Uint8Array.from(atob(base64.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-base64.length%4)%4)),c=>c.charCodeAt(0));
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
  if(!supported()){button.hidden=true;copy('Background push is not supported on this browser.');return;}
  button.hidden=false;
  const user=window.TSO_AUTH?.user;
  if(!user){button.disabled=false;button.textContent='SIGN IN TO ENABLE';copy('Sign in to receive device alerts.');return;}
  if(ios()&&!standalone()){button.disabled=true;button.textContent='ADD TO HOME SCREEN FIRST';copy('On iPhone: Safari → Share → Add to Home Screen. Open TSO from that icon.');return;}
  if(Notification.permission==='denied'){button.disabled=true;button.textContent='BLOCKED IN DEVICE SETTINGS';copy('Allow notifications for TSO in your device settings.');return;}
  const reg=await setupWorker();
  const sub=await reg.pushManager.getSubscription();
  if(sub){
    const enabled=await window.TSO_AUTH?.getPushSubscription?.(sub.endpoint);
    button.disabled=false;
    button.textContent=enabled?'DISABLE DEVICE ALERTS':'ENABLE DEVICE ALERTS';
    copy(enabled?'This device is registered for background push.':'This device has a subscription, but is not registered to your account.',enabled?'enabled':'idle');
    registeredOwner=enabled?String(user.id):'';
  }else{button.disabled=false;button.textContent='ENABLE DEVICE ALERTS';copy('Notifications work when the app is closed after you allow them.');}
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
      copy('Device alerts disabled.','idle');
    }else{
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(VAPID_PUBLIC_KEY)});
      const j=sub.toJSON();
      if(!j.endpoint||!j.keys?.p256dh||!j.keys?.auth)throw Error('Push service returned an incomplete subscription.');
      await window.TSO_AUTH.savePushSubscription(j);
      registeredOwner=String(window.TSO_AUTH?.user?.id||'');
      copy('Background push is enabled for this device.','enabled');
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
