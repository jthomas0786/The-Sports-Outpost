// One-time, single-device smoke test for an opted-in TSO 2.0 subscriber.
// GitHub Actions secrets stay server-side. Do not log subscription endpoints or keys.
import webpush from 'web-push';
import {checkVapidKeysMatch} from '../../send-push.js';

const expectedPublic='BB8BacX7NXp-35YfHDBpYGf3sofd6YcS4tt45h7KxDUhTQxSBn5cpGlEKQKg_oPfpLFIx0Lwwmwx7hd7tx1Re2M';
const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_SUBJECT}=process.env;
const targetId=Number(process.env.TSO2_TEST_SUBSCRIPTION_ID);
if(!Number.isSafeInteger(targetId)||targetId<=0)throw Error('Valid target subscription ID required.');
if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!VAPID_PRIVATE_KEY||VAPID_PUBLIC_KEY!==expectedPublic)throw Error('Server secrets incomplete or incompatible with TSO 2.0 public VAPID key.');
if(!checkVapidKeysMatch())throw Error('VAPID public and private key mismatch.');
const base=SUPABASE_URL.replace(/\/rest\/v1\/?$/,'').replace(/\/+$/,'');
const url=base+'/rest/v1/push_subscriptions?select=id,user_id,endpoint,p256dh,auth_key,created_at&limit=1&id=eq.'+targetId;
const response=await fetch(url,{headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+SUPABASE_SERVICE_ROLE_KEY},signal:AbortSignal.timeout(12000)});
if(!response.ok)throw Error('Subscription lookup HTTP '+response.status);
const rows=await response.json();
if(rows.length!==1)throw Error('No matching registered device. Test NOT sent.');
const sub=rows[0];
if(!sub?.endpoint?.startsWith('https://web.push.apple.com/')||!sub.p256dh||!sub.auth_key)throw Error('Selected subscription is not a complete Apple Web Push registration.');
if(!Number.isFinite(Date.parse(sub.created_at))||Date.now()-Date.parse(sub.created_at)>60*60*1000)throw Error('Device registration is not recent enough for this targeted one-time test.');
webpush.setVapidDetails(VAPID_SUBJECT||'mailto:noreply@thesportsoutpost.com',VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
const message={key:'tso2-device-test:'+Date.now(),kind:'device-test',sport:'system',title:'🔔 The Sports Outpost',body:'Test successful! Your TSO 2.0 background notifications are connected.',url:'/#live',ts:Date.now()};
try{
  const result=await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},JSON.stringify(message),{TTL:300,urgency:'high'});
  console.log('TSO 2.0 Apple Web Push test accepted by push provider, status HTTP '+result.statusCode+' (device display is not directly observable from server).');
}catch(error){
  console.error('Apple Web Push provider rejected the test: HTTP '+(error.statusCode||'unknown')+' '+String(error.message||error).slice(0,170));
  process.exitCode=1;
}
