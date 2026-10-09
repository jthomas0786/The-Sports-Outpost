// TSO 2.0 - use the existing TSO 1.0 Supabase Auth project.
// A hard-coded username or a value in the DOM is never an authenticated identity.
// This module provides the browser UI; private/owner endpoints MUST authorize
// requests independently on the server using a validated bearer token.
const SUPABASE_URL = 'https://hjhfbhpuuxnrexddplxd.supabase.co';
// Existing public anon key from main/social.js. Never use the service_role key here.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGZiaHB1dXhucmV4ZGRwbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTY5ODQsImV4cCI6MjEwMjA3Mjk4NH0.6URv-aSJgFupp1dkO65AsTqPpZF_aUckczhxJZBWVJ0';

const modal=document.querySelector('#tsoAuthDialog');
const form=modal?.querySelector('[data-auth-form]');
const usernameField=form?.querySelector('[data-auth-username]');
const usernameInput=form?.elements.namedItem('username');
const submit=form?.querySelector('[data-auth-submit]');
const message=form?.querySelector('[data-auth-message]');
let mode='signin';
let client=null;
let initError='';
let identityFlight=null;
let resolveClientReady;
const clientReady=new Promise(resolve=>{resolveClientReady=resolve;});

const auth=window.TSO_AUTH={
  status:'loading',
  user:null,
  async signOut(){if(!client)throw new Error('Sign-out service is not connected.');const {error}=await client.auth.signOut();if(error)throw error;auth.user=null;auth.status='guest';renderIdentity();emit();},
  async refresh(){return refreshIdentity();},
  async loadNotifications(limit=24){
    const user=auth.user;
    if(!client||!user?.id)return [];
    const d=new Date();
    const today=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    const {data,error}=await client.from('notifications')
      .select('id,type,payload,read,created_at,slate_date')
      .eq('user_id',user.id)
      .or('slate_date.is.null,slate_date.eq.'+today)
      .order('created_at',{ascending:false})
      .limit(Math.max(1,Math.min(40,Number(limit)||24)));
    if(error)throw new Error(error.message||'Unable to load account notifications');
    return Array.isArray(data)?data:[];
  },
  async markNotificationsRead(ids=null){
    const user=auth.user;
    if(!client||!user?.id)throw new Error('Sign in to mark notifications as read.');
    let query=client.from('notifications').update({read:true}).eq('user_id',user.id).eq('read',false);
    if(Array.isArray(ids)){
      const safeIds=ids.map(Number).filter(x=>Number.isSafeInteger(x)&&x>0);
      if(!safeIds.length)return;
      query=query.in('id',safeIds);
    }
    const {error}=await query;
    if(error)throw new Error(error.message||'Unable to save read status');
  },

  // User-scoped, read-only connection to existing TSO account records.
  // The Supabase RLS policies remain the authorization boundary: nothing
  // in the browser can choose another person's user_id.
  async loadProfileActivity(){
    const user=auth.user;
    if(!client||!user?.id)throw new Error('Sign in to see your saved Outpost activity.');
    const userId=user.id;
    const take=async query=>{
      const {data,error}=await query;
      if(error)throw new Error(error.message||'Account activity could not be loaded.');
      return data;
    };
    const requests=[
      take(client.from('point_balances').select('balance,updated_at').eq('user_id',userId).maybeSingle()),
      take(client.from('wagers').select('id,sport,stake,status,placed_at,settled_at').eq('user_id',userId).order('placed_at',{ascending:false}).limit(8)),
      take(client.from('watchlist').select('id,player_name,team,sport,slate_date,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(8)),
      take(client.from('picks').select('id,player,market,line,side,slate_date,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(8))
    ];
    const results=await Promise.allSettled(requests);
    if(String(auth.user?.id||'')!==userId)throw new Error('Account changed while loading.');
    const names=['points','wagers','watchlist','picks'],issues=[];
    const values=results.map((r,i)=>{
      if(r.status==='fulfilled')return r.value;
      issues.push(names[i]+': '+String(r.reason?.message||'unavailable'));
      return null;
    });
    return {
      userId,points:values[0],wagers:values[1],watchlist:values[2],
      picks:values[3],issues,fetchedAt:new Date().toISOString()
    };
  },

  // Existing database constraints permit over/under selections only.
  // RLS enforces auth.uid() = user_id on every insert/delete. Persist the
  // precise source key so another line or side is never substituted.
  openSignIn(){openSignIn();},
  async savePickSelection(selection){
    const owner=auth.user?.id;
    if(!client||!owner)throw new Error('Sign in to save a pick.');
    const sport=String(selection?.sport||'').toLowerCase();
    const side=String(selection?.side||'').toLowerCase();
    const key=String(selection?.key||'').trim();
    const player=String(selection?.player||'').trim();
    const market=String(selection?.market||'').trim();
    const numericLine=Number(selection?.line);
    if(!['nfl','nhl','nba','mlb'].includes(sport)||!['over','under'].includes(side)
      ||!key||key.length>450||!player||!market||!Number.isFinite(numericLine)
      ||String(selection?.selection||'').toUpperCase()==='YES'){
      throw new Error('Only exact Over/Under prop selections can be saved. Yes/No markets are not supported yet.');
    }
    const date=String(selection?.slateDate||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('A valid save date is required.');
    const parsedPrice=Number(selection?.price);
    const price=Number.isSafeInteger(parsedPrice)&&parsedPrice!==0?parsedPrice:null;
    const note=['TSO 2.0',sport.toUpperCase(),String(selection?.book||'').slice(0,40),
      String(selection?.eventId||'').slice(0,55),
      String(selection?.dateSource==='event'?'event date':'saved on date')]
      .filter(Boolean).join(' · ').slice(0,280);
    const record={user_id:owner,prop_key:key,player:player.slice(0,160),
      market:market.slice(0,100),line:String(selection.line),side,price,
      slate_date:date,note};
    const {error}=await client.from('picks').insert(record);
    if(String(auth.user?.id||'')!==String(owner))throw new Error('Account changed while saving. Check your new account before continuing.');
    if(error?.code==='23505')return {alreadySaved:true};
    if(error)throw new Error(error.message||'Could not save the selection.');
    return {saved:true};
  },
  async saveWatchlistPlayer(selection){
    const owner=auth.user?.id;
    if(!client||!owner)throw new Error('Sign in to save a player.');
    const sport=String(selection?.sport||'').toLowerCase();
    const playerId=Number(selection?.playerId);
    const name=String(selection?.player||'').trim();
    const date=String(selection?.slateDate||'');
    if(!['nfl','nhl','nba','mlb'].includes(sport)
       ||!Number.isSafeInteger(playerId)||playerId<=0||!name
       ||!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      throw new Error('A verified numeric player ID and save date are required for watchlists.');
    }
    const {error}=await client.from('watchlist').insert({
      user_id:owner,sport,player_id:playerId,player_name:name.slice(0,160),
      team:String(selection?.team||'').slice(0,40)||null,slate_date:date
    });
    if(String(auth.user?.id||'')!==String(owner))throw new Error('Account changed while saving. Check your new account before continuing.');
    if(error?.code==='23505')return {alreadySaved:true};
    if(error)throw new Error(error.message||'Could not save this player.');
    return {saved:true};
  },
  async removeSavedActivity(kind,id){
    const owner=auth.user?.id;
    if(!client||!owner)throw new Error('Sign in to remove saved activity.');
    if(!['picks','watchlist'].includes(kind)||!Number.isSafeInteger(Number(id))||Number(id)<=0)
      throw new Error('Unsupported saved activity.');
    const {error}=await client.from(kind).delete().eq('id',Number(id)).eq('user_id',owner);
    if(String(auth.user?.id||'')!==String(owner))throw new Error('Account changed while removing activity.');
    if(error)throw new Error(error.message||'Could not remove saved activity.');
    return {removed:true};
  },
  async rpc(name,args={}){
    if(!client)throw new Error('Account data service is not connected yet.');
    const {data,error}=await client.rpc(name,args);
    if(error)throw new Error(error.message||'Account data request failed');
    return data;
  }
};
function emit(){window.dispatchEvent(new CustomEvent('tso2-auth-changed',{detail:{signedIn:!!auth.user}}));}
function initialsOf(name){const letters=String(name||'').trim().split(/[^a-z0-9]+/i).filter(Boolean);return (letters.length>1?letters.slice(0,2).map(s=>s[0]).join(''):letters[0]?.slice(0,2)||'?').toUpperCase();}
function renderIdentity(){
  const user=auth.user;
  const display=user?'@'+user.username:'Guest';
  const role=user?(user.isOwner?'OWNER ACCOUNT':'MEMBER ACCOUNT'):'NOT SIGNED IN';
  document.querySelectorAll('[data-auth-avatar]').forEach(n=>n.textContent=user?initialsOf(user.username):'?');
  document.querySelectorAll('[data-auth-name]').forEach(n=>n.textContent=display);
  document.querySelectorAll('[data-auth-role]').forEach(n=>n.textContent=role);
  document.querySelectorAll('[data-auth-pill-label]').forEach(n=>n.textContent=user?user.username:'Guest');
  document.querySelectorAll('[data-auth-pill-role]').forEach(n=>n.textContent=user?(user.isOwner?'OWNER':'MEMBER'):'NOT SIGNED IN');
  const pill=document.querySelector('.profile-pill');
  if(pill)pill.setAttribute('aria-label',user?'Account menu for '+user.username:'Account menu, Guest');
  document.querySelectorAll('[data-auth-open]').forEach(n=>n.hidden=!!user);
  document.querySelectorAll('[data-auth-signout]').forEach(n=>n.hidden=!user);
}
function setMessage(text='',error=false){
  if(!message)return;
  message.textContent=text;
  message.classList.toggle('is-error',error);
}
function setMode(next){
  mode=next==='signup'?'signup':'signin';
  form?.reset();
  if(usernameField)usernameField.hidden=mode!=='signup';
  if(usernameInput)usernameInput.required=mode==='signup';
  const password=form?.elements.namedItem('password');
  if(password)password.autocomplete=mode==='signup'?'new-password':'current-password';
  modal?.querySelectorAll('[data-auth-tab]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.authTab===mode)));
  const label=mode==='signup'?'Create account':'Sign in';
  const title=modal?.querySelector('#tsoAuthTitle');
  if(title)title.textContent=label;
  if(submit)submit.textContent=label.toUpperCase();
  setMessage('');
}
function openSignIn(){
  setMode('signin');
  if(initError)setMessage(initError,true);
  if(modal&&!modal.open)modal.showModal();
}
function closeSignIn(){if(modal?.open)modal.close();}
// Auth callbacks and form submissions can both refresh the identity at the
// same time. A successful sign-in MUST wait for a new verified request, rather
// than returning early while an older guest refresh is still running.
async function refreshIdentity(forceAfterInFlight=false){
  if(!client)return null;
  if(identityFlight){
    if(!forceAfterInFlight)return identityFlight;
    try{await identityFlight;}catch(_){}
  }
  const request=(async()=>{
    const {data,error}=await client.auth.getUser();
    if(error||!data?.user){auth.user=null;auth.status='guest';return null;}
    const verified=data.user;
    let profile=null;
    try{
      const result=await client.from('profiles').select('username').eq('id',verified.id).maybeSingle();
      profile=result?.data||null;
    }catch(error){
      // A profile read issue must not prevent a verified Auth session.
      console.warn('[TSO2 auth] Profile name temporarily unavailable:',error?.message||error);
    }
    const displayName=profile?.username||verified.user_metadata?.username||'member';
    const role=String(verified.app_metadata?.role||'').toLowerCase();
    auth.user={id:verified.id,username:String(displayName),isOwner:role==='owner'||role==='admin'};
    auth.status='authenticated';
    return auth.user;
  })();
  identityFlight=request;
  try{return await request;}
  catch(error){
    auth.user=null;auth.status='guest';
    console.warn('[TSO2 auth] Could not verify session',error?.message||error);
    return null;
  }finally{
    if(identityFlight===request)identityFlight=null;
    renderIdentity();emit();
  }
}
async function submitCredentials(event){
  event.preventDefault();
  const email=String(form?.elements.namedItem('email')?.value||'').trim();
  const password=String(form?.elements.namedItem('password')?.value||'');
  const username=String(usernameInput?.value||'').trim();
  // Native HTML form validation can silently cancel submit (including for
  // existing accounts with an older short password). Display an actual error.
  if(!email||!form?.elements.namedItem('email')?.validity?.valid){
    setMessage('Enter a valid email address.',true);return;
  }
  if(!password){setMessage('Enter your password to sign in.',true);return;}
  if(mode==='signup'&&password.length<6){
    setMessage('New passwords must be at least 6 characters.',true);return;
  }
  if(mode==='signup'&&!/^[A-Za-z0-9_]{3,20}$/.test(username)){
    setMessage('Username must be 3–20 letters, numbers, or underscores.',true);return;
  }
  if(!client){
    // The dialog may open while esm.sh/Supabase is still downloading. Keep
    // this submission alive instead of making the user press Sign In twice.
    if(submit){submit.disabled=true;submit.textContent='CONNECTING…';}
    setMessage('Connecting to secure sign-in…');
    const ready=await Promise.race([
      clientReady,
      new Promise(resolve=>setTimeout(()=>resolve(false),12000))
    ]);
    if(!ready||!client){
      setMessage(initError||'The sign-in connection timed out. Please check your connection and try again.',true);
      if(submit){submit.disabled=false;submit.textContent=mode==='signup'?'CREATE ACCOUNT':'SIGN IN';}
      return;
    }
  }
  if(submit){submit.disabled=true;submit.textContent=mode==='signup'?'CREATING ACCOUNT…':'SIGNING IN…';}
  setMessage(mode==='signup'?'Creating your account…':'Verifying your account…');
  try{
    if(mode==='signup'){
      const {data,error}=await client.auth.signUp({email,password,options:{data:{username}}});
      if(error)throw error;
      if(!data?.session){
        setMessage('Account created. Check your email for a confirmation link before signing in.');
      }else{
        await refreshIdentity(true);
        if(auth.user)closeSignIn();
      }
    }else{
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      // Wait out any pre-login getUser() refresh and confirm the NEW token.
      const verified=await refreshIdentity(true);
      if(!verified?.id)throw new Error('Sign-in succeeded but session verification failed. Please try again.');
      closeSignIn();
    }
  }catch(error){setMessage(error?.message||'Could not access account. Please try again.',true);}
  finally{if(submit){submit.disabled=false;submit.textContent=mode==='signup'?'CREATE ACCOUNT':'SIGN IN';}}
}

document.querySelectorAll('[data-auth-open]').forEach(n=>n.addEventListener('click',openSignIn));
modal?.querySelector('[data-auth-close]')?.addEventListener('click',closeSignIn);
modal?.querySelectorAll('[data-auth-tab]').forEach(n=>n.addEventListener('click',()=>setMode(n.dataset.authTab)));
form?.addEventListener('submit',submitCredentials);
document.querySelectorAll('[data-auth-signout]').forEach(n=>n.addEventListener('click',async ()=>{
  const previous=n.disabled;
  n.disabled=true;
  try{await auth.signOut();closeSignIn();}catch(error){openSignIn();setMessage('Sign out failed: '+(error?.message||'Please try again.'),true);}
  finally{n.disabled=previous;}
}));
renderIdentity();emit();

try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  resolveClientReady(true);
  await refreshIdentity();
  client.auth.onAuthStateChange(()=>{setTimeout(()=>{void refreshIdentity();},0);});
}catch(error){
  resolveClientReady(false);
  initError='The sign-in service could not load. Check your connection and try again.';
  auth.user=null;auth.status='unavailable';
  renderIdentity();emit();
  console.error('[TSO2 auth]',error);
}
