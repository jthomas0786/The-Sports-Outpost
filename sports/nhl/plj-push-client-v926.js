const SUPABASE_URL='https://hjhfbhpuuxnrexddplxd.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGZiaHB1dXhucmV4ZGRwbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTY5ODQsImV4cCI6MjEwMjA3Mjk4NH0.6URv-aSJgFupp1dkO65AsTqPpZF_aUckczhxJZBWVJ0';
const VAPID_PUBLIC_KEY='BB8BacX7NXp-35YfHDBpYGf3sofd6YcS4tt45h7KxDUhTQxSBn5cpGlEKQKg_oPfpLFIx0Lwwmwx7hd7tx1Re2M';
let clientPromise=null;

function b64ToBytes(value){
 const padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
 const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
async function client(){
 if(!clientPromise)clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_ANON_KEY));
 return clientPromise;
}
async function sessionUser(){
 const sb=await client(),{data:{session}}=await sb.auth.getSession();
 return {sb,session,user:session?.user||null};
}
async function registration(){
 if(!('serviceWorker' in navigator)||!('PushManager' in window))return null;
 try{return await navigator.serviceWorker.register('sw.js');}catch{return null;}
}
async function subscription(reg,create){
 let sub=await reg.pushManager.getSubscription();
 if(!sub&&create&&Notification.permission==='granted'){
  sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(VAPID_PUBLIC_KEY)});
 }
 return sub;
}

export async function setPljRemotePushEnabled(enabled){
 if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))return {ok:false,reason:'unsupported'};
 const {sb,user}=await sessionUser();
 if(!user)return {ok:false,reason:'signin'};
 const reg=await registration();if(!reg)return {ok:false,reason:'service-worker'};
 const sub=await subscription(reg,Boolean(enabled));
 if(!sub)return enabled?{ok:false,reason:Notification.permission==='denied'?'denied':'permission'}:{ok:true,remote:false};
 const json=sub.toJSON(),keys=json.keys||{};
 if(!json.endpoint||!keys.p256dh||!keys.auth)return {ok:false,reason:'subscription'};
 const row={user_id:user.id,endpoint:json.endpoint,p256dh:keys.p256dh,auth_key:keys.auth,user_agent:navigator.userAgent||null,plj_enabled:Boolean(enabled),updated_at:new Date().toISOString()};
 const {error}=await sb.from('push_subscriptions').upsert(row,{onConflict:'endpoint'});
 return error?{ok:false,reason:'database',error:error.message}:{ok:true,remote:Boolean(enabled),endpoint:json.endpoint};
}

export async function getPljRemotePushStatus(){
 try{
  const {sb,user}=await sessionUser();if(!user)return {enabled:false,reason:'signin'};
  const reg=await registration();if(!reg)return {enabled:false,reason:'unsupported'};
  const sub=await subscription(reg,false);if(!sub)return {enabled:false,reason:'unsubscribed'};
  const {data,error}=await sb.from('push_subscriptions').select('plj_enabled').eq('user_id',user.id).eq('endpoint',sub.endpoint).maybeSingle();
  if(error)return {enabled:false,reason:'database'};
  return {enabled:data?.plj_enabled===true};
 }catch{return {enabled:false,reason:'error'};}
}
