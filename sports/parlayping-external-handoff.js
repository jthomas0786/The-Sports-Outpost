const SUPABASE_URL='https://hjhfbhpuuxnrexddplxd.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJoamhmYmhwdXV4bnJleGRkcGx4ZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2NDk2OTg0LCJleHAiOjIxMDIwNzI5ODR9.6URv-aSJgFupp1dkO65AsTqPpZF_aUckczhxJZBWVJ0';
const MAX_LEGS=25;
const LEGACY_GAMBLY_BUTTON_ID='bsBuild';
const LEGACY_GAMBLY_STYLE_ID='pp-hide-legacy-gambly';
const BOOK_ODDS_PREFIX='PP_BOOK_ODDS:';
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

function normalizeBookName(value){
  const raw=String(value??'').trim();
  const key=raw.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(!key)return null;
  if(key==='draftkings'||key==='dk')return 'DraftKings';
  if(key==='fanduel'||key==='fd')return 'FanDuel';
  if(key==='bet365'||key==='365')return 'bet365';
  if(key==='caesars'||key==='williamhill'||key==='caesarssportsbook')return 'Caesars';
  if(key==='espnbet'||key==='espn')return 'ESPN BET';
  return null;
}
function normalizedText(value){return String(value??'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');}
function normalizedMarket(value){
  const key=normalizedText(value);
  if(['hr','homerun','homeruns','batterhomerun','batterhomeruns'].includes(key))return 'hr';
  if(['atd','anytimetd','anytimetouchdown','anytimetouchdownscorer'].includes(key))return 'atd';
  if(['atg','anytimegoal','anytimegoalscorer'].includes(key))return 'atg';
  return key;
}
function validAmericanPrice(value){
  const n=num(value);
  if(n==null||n===0||Math.abs(n)<100||Math.abs(n)>100000)return null;
  return Math.round(n);
}
function sameExactSelection(row,offer){
  if(!offer||typeof offer!=='object'||Array.isArray(offer))return true;
  const rowPlayer=first(row,['player','player_name','name']);
  const offerPlayer=first(offer,['player','player_name','athlete','participant','name']);
  if(rowPlayer&&offerPlayer&&normalizedText(rowPlayer)!==normalizedText(offerPlayer))return false;

  const rowMarket=first(row,['market','prop_key','prop','marketKey','market_key']);
  const offerMarket=first(offer,['market','prop_key','prop','marketKey','market_key']);
  if(rowMarket&&offerMarket&&normalizedMarket(rowMarket)!==normalizedMarket(offerMarket))return false;

  const rowSide=first(row,['side','selection']);
  const offerSide=first(offer,['side','selection']);
  if(rowSide&&offerSide&&normalizedText(rowSide)!==normalizedText(offerSide))return false;

  const rowLine=num(first(row,['line','threshold','point']));
  const offerLine=num(first(offer,['line','threshold','point']));
  if(rowLine!=null&&offerLine!=null&&Math.abs(rowLine-offerLine)>0.000001)return false;

  const rowEvent=first(row,['event_id','eventId','gameId','game_pk','gamePk']);
  const offerEvent=first(offer,['event_id','eventId','gameId','game_pk','gamePk']);
  if(rowEvent&&offerEvent&&String(rowEvent)!==String(offerEvent))return false;
  return true;
}
function offerBook(offer,fallback=null){
  if(!offer||typeof offer!=='object'||Array.isArray(offer))return normalizeBookName(fallback);
  return normalizeBookName(first(offer,['sportsbook','book','bookName','book_name','bookTitle','book_title','sportsbookName','sportsbook_name']))||normalizeBookName(fallback);
}
function offerPrice(offer){
  if(offer===null||offer===undefined)return null;
  if(typeof offer!=='object')return validAmericanPrice(offer);
  return validAmericanPrice(first(offer,['oddsAmerican','americanOdds','american_odds','price','odds']));
}
function collectBookOdds(row){
  const out={};
  const exactContainers=['bookOdds','book_odds','oddsByBook','odds_by_book','pricesByBook','prices_by_book','sportsbookPrices','sportsbook_prices','offersByBook','offers_by_book','offers','books','sportsbooks'];

  for(const field of exactContainers){
    const container=row?.[field];
    if(!container||typeof container!=='object')continue;
    const offers=Array.isArray(container)?container:Object.entries(container).map(([key,value])=>({key,value}));
    for(const entry of offers){
      if(Array.isArray(container)){
        const offer=entry;
        const book=offerBook(offer);
        const price=offerPrice(offer);
        if(book&&price!=null&&sameExactSelection(row,offer))out[book]=price;
        continue;
      }
      const {key,value}=entry;
      const keyedBook=normalizeBookName(key);
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        const book=offerBook(value,keyedBook);
        const price=offerPrice(value);
        if(book&&price!=null&&sameExactSelection(row,value))out[book]=price;
      }else if(keyedBook){
        const price=offerPrice(value);
        if(price!=null)out[keyedBook]=price;
      }
    }
  }

  /* The row itself is the selected exact leg, so its own book/price is authoritative. */
  const topBook=normalizeBookName(first(row,['sportsbook','book','bookName']));
  const topPrice=validAmericanPrice(first(row,['oddsAmerican','price','americanOdds']));
  if(topBook&&topPrice!=null)out[topBook]=topPrice;
  return out;
}
function bookOddsEnvelope(row){
  const map=collectBookOdds(row);
  return Object.keys(map).length?`${BOOK_ODDS_PREFIX}${JSON.stringify(map)}`:first(row,['originalText']);
}
function findStartTime(row){
  const aliases=['startTimeUTC','start_time_utc','startTime','start_time','commenceTime','commence_time','kickoff','firstPitch','first_pitch','gameTimeUTC','game_time_utc','scheduledAt','scheduled_at'];
  const direct=first(row,aliases);if(direct)return direct;
  const seen=new Set();
  function scan(value,depth=0){
    if(depth>3||!value||typeof value!=='object'||seen.has(value))return null;seen.add(value);
    for(const key of aliases){if(value[key]!==null&&value[key]!==undefined&&value[key]!=='')return value[key];}
    for(const key of ['gameData','event','gameInfo','fixture','game','match']){const found=scan(value[key],depth+1);if(found)return found;}
    return null;
  }
  return scan(row);
}
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
    startTimeUTC:findStartTime(row),
    originalText:bookOddsEnvelope(row),
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

export const __PARLAYPING_EXTERNAL_HANDOFF_TEST__={readSlip,normalizeLeg,currentReturnUrl,cleanupLegacyGamblyUi,collectBookOdds,findStartTime,sameExactSelection,MAX_LEGS,LEGACY_GAMBLY_BUTTON_ID};
