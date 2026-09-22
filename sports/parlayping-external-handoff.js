const SUPABASE_URL='https://hjhfbhpuuxnrexddplxd.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGZiaHB1dXhucmV4ZGRwbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTY5ODQsImV4cCI6MjEwMjA3Mjk4NH0.6URv-aSJgFupp1dkO65AsTqPpZF_aUckczhxJZBWVJ0';
const MAX_LEGS=25;
const LEGACY_GAMBLY_BUTTON_ID='bsBuild';
const LEGACY_GAMBLY_STYLE_ID='pp-hide-legacy-gambly';
let installed=false;
let busy=false;
let clientPromise=null;

function client(){
  if(!clientPromise)clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_ANON_KEY));
  return clientPromise;
}
function readSlip(){try{const rows=JSON.parse(localStorage.getItem('dw_betslip')||'[]');return Array.isArray(rows)?rows.slice(0,MAX_LEGS):[];}catch{return[];}}
function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function probability(v){const n=num(v);if(n==null)return null;const p=n>1&&n<=100?n/100:n;return p>=0&&p<=1?p:null;}
function first(row,keys){for(const key of keys){const value=row?.[key];if(value!==null&&value!==undefined&&value!=='')return value;}return null;}
function normalizeLeg(row,index){
  return {
    id:String(first(row,['id'])||`tso-leg-${index+1}`),
    sport:String(first(row,['sport'])||window.DW_SPORT||'NFL').toUpperCase(),
    player:first(row,['player','player_name','name']),
    playerId:first(row,['playerId','player_id','espnId']),
    playerImageUrl:first(row,['playerImageUrl','headshotUrl','headshot_url','headshot','photoUrl','photo']),
    team:first(row,['team']),
    teamLogoUrl:first(row,['teamLogoUrl','team_logo_url','logoUrl']),
    gameId:first(row,['gameId','eventId','event_id','game_pk','gamePk']),
    matchup:first(row,['matchup','game']),
    market:first(row,['market','prop_key','prop']),
    displayMarket:first(row,['displayMarket','selectionText']),
    side:first(row,['side','selection'])||'over',
    line:num(first(row,['line','threshold'])),
    inclusive:Boolean(row?.inclusive),
    oddsAmerican:num(first(row,['oddsAmerican','odds','price'])),
    sportsbook:first(row,['sportsbook','book','bookName']),
    sportsbookLink:first(row,['sportsbookLink','deepLink','link']),
    status:String(first(row,['status','state'])||'PENDING').toUpperCase(),
    pregameProbability:probability(first(row,['pregameProbability','probability','pct','modelProbability','fairProbability'])),
    startTimeUTC:first(row,['startTimeUTC','kickoff']),
  };
}
function currentReturnUrl(){
  try{
    const u=new URL(location.href);
    if(u.protocol!=='https:'||!['thesportsoutpost.com','www.thesportsoutpost.com'].includes(u.hostname.toLowerCase()))return 'https://thesportsoutpost.com/';
    return u.toString();
  }catch{return 'https://thesportsoutpost.com/';}
}
function note(text){const el=document.getElementById('bsNote');if(el)el.textContent=text;}
function button(){return document.getElementById('bsText');}
function setButton(text,disabled=false){const btn=button();if(!btn)return;if(btn.tagName==='INPUT')btn.value=text;else btn.textContent=text;btn.disabled=disabled;}
function renameButton(){const btn=button();if(!btn)return false;setButton('Open ParlayPing',false);btn.setAttribute('aria-label','Open this betslip on ParlayPing.net');return true;}
function installLegacyGamblyStyle(){
  if(document.getElementById(LEGACY_GAMBLY_STYLE_ID))return;
  const style=document.createElement('style');
  style.id=LEGACY_GAMBLY_STYLE_ID;
  style.textContent='#bsBuild{display:none!important}';
  (document.head||document.documentElement)?.appendChild(style);
}
function cleanupLegacyGamblyUi(){
  const legacy=document.getElementById(LEGACY_GAMBLY_BUTTON_ID);
  if(legacy)legacy.remove();
  renameButton();
  const noteEl=document.getElementById('bsNote');
  if(noteEl&&/gambly/i.test(noteEl.textContent||''))noteEl.textContent='Open this betslip on ParlayPing to share and track it.';
}
function wrapBetslipRenderer(){
  const render=window.renderBetslipBar;
  if(typeof render!=='function'||render.__parlayPingExternalHandoffWrapped)return;
  const wrapped=function(...args){
    const result=render.apply(this,args);
    queueMicrotask(cleanupLegacyGamblyUi);
    return result;
  };
  Object.defineProperty(wrapped,'__parlayPingExternalHandoffWrapped',{value:true});
  window.renderBetslipBar=wrapped;
}
async function createExternalSlip(){
  if(busy)return;
  const rows=readSlip();
  if(!rows.length){note('Add at least one pick before opening ParlayPing.');return;}
  busy=true;setButton('Opening ParlayPing…',true);note('Creating your ParlayPing betslip…');
  try{
    const sb=await client();
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)throw new Error('Sign in to The Sports Outpost to open this betslip in ParlayPing.');
    const returnUrl=currentReturnUrl();
    const response=await fetch(`${SUPABASE_URL}/functions/v1/parlayping-share`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        apikey:SUPABASE_ANON_KEY,
        Authorization:`Bearer ${session.access_token}`,
        'X-Request-Id':`tso-browser-${crypto.randomUUID?.()||Date.now()}`,
      },
      body:JSON.stringify({
        sourceReference:returnUrl,
        returnUrl,
        returnLabel:'The Sports Outpost',
        legs:rows.map(normalizeLeg),
      }),
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload?.error||'Unable to create the ParlayPing betslip.');
    const launchUrl=payload?.share?.launchUrl;
    if(!launchUrl||!/^https:\/\/parlayping\.net\/build\/s1\./i.test(launchUrl))throw new Error('ParlayPing returned an invalid builder URL.');
    location.assign(launchUrl);
  }catch(error){
    note(error?.message||'Unable to open ParlayPing right now.');
    busy=false;cleanupLegacyGamblyUi();
  }
}
export function installParlayPingExternalHandoff(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  installLegacyGamblyStyle();
  wrapBetslipRenderer();
  cleanupLegacyGamblyUi();
  requestAnimationFrame(()=>{wrapBetslipRenderer();cleanupLegacyGamblyUi();});
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('#bsText');
    if(!btn)return;
    event.preventDefault();event.stopImmediatePropagation();
    createExternalSlip();
  },true);
}

export const __PARLAYPING_EXTERNAL_HANDOFF_TEST__={readSlip,normalizeLeg,currentReturnUrl,cleanupLegacyGamblyUi,MAX_LEGS,LEGACY_GAMBLY_BUTTON_ID};
