import {API,getJSON,loadScoreboard,mergeSummary,text as esc} from './data.js?v=90.23';
import {gradePljCandidate,PLJ_CANDIDATE_ORDER} from './plj-candidate-v927.js?v=90.27';

const LINES_PATH='./slates/nhl-puck-lines.json';
const WATCH_SECONDS=300;
const SWEAT_SECONDS=600;
let installed=false,active=false,observer=null,timer=null,refreshing=false,lastModel=null,lastError='';

const num=v=>Number.isFinite(Number(v))?Number(v):null;
const upper=v=>String(v||'').toUpperCase();
const price=v=>v==null?'—':Number(v)>0?`+${Number(v)}`:String(Number(v));
const logo=t=>/^https:\/\//.test(String(t?.logo||''))?`<img src="${esc(t.logo)}" alt="${esc(t.name||t.abbr||'Team')}">`:`<span>${esc(t?.abbr||'NHL')}</span>`;

export function clockSeconds(clock){
 const m=String(clock||'').trim().match(/^(\d+):(\d{2})$/);
 return m?Number(m[1])*60+Number(m[2]):null;
}
function teamOnIce(game,team){
 const rec=(game?.onIce||[]).find(x=>String(x?.teamId)===String(team?.id));
 if(!rec||!Array.isArray(rec.entries))return null;
 return rec.entries.filter(x=>String(x?.whereabouts?.id||'1')==='1').map(x=>String(x?.athleteid||x?.athleteId||'')).filter(Boolean);
}
export function goaliePulled(game,team){
 if(game?.status!=='in'||!team)return false;
 const ids=teamOnIce(game,team);if(!ids||ids.length<5)return false;
 const goalies=(game.players||[]).filter(p=>upper(p.team)===upper(team.abbr)&&upper(p.position)==='G');
 if(!goalies.length)return false;
 return !goalies.some(g=>ids.includes(String(g.id)));
}
function isLateThird(game,seconds=WATCH_SECONDS){
 const left=clockSeconds(game?.clock);
 return Number(game?.period)===3&&left!=null&&left<=seconds;
}
function lineFor(lines,game){
 return (lines?.games||[]).find(x=>String(x.gameId)===String(game.id))||null;
}
function favoriteSide(game,line){
 const abbr=upper(line?.puckLine?.favoriteAbbr);
 if(!abbr)return null;
 if(upper(game?.away?.abbr)===abbr)return {favorite:game.away,underdog:game.home,favoriteScore:num(game.away.score)??0,underdogScore:num(game.home.score)??0};
 if(upper(game?.home?.abbr)===abbr)return {favorite:game.home,underdog:game.away,favoriteScore:num(game.home.score)??0,underdogScore:num(game.away.score)??0};
 return null;
}
function marginFromScore(game,line,awayScore,homeScore){
 const fav=upper(line?.puckLine?.favoriteAbbr);
 if(fav===upper(game.away?.abbr))return Number(awayScore)-Number(homeScore);
 if(fav===upper(game.home?.abbr))return Number(homeScore)-Number(awayScore);
 return null;
}
function lateSwing(game,line){
 const events=(game.goals||[]).filter(g=>Number(g.period)===3&&clockSeconds(g.clock)!=null&&clockSeconds(g.clock)<=WATCH_SECONDS&&g.awayScore!=null&&g.homeScore!=null);
 let cash=null,backdoor=null;
 for(const g of events){
  const after=marginFromScore(game,line,g.awayScore,g.homeScore);if(after==null)continue;
  const favoriteScored=upper(g.team)===upper(line.puckLine.favoriteAbbr);
  const beforeAway=Number(g.awayScore)-(upper(g.team)===upper(game.away.abbr)?1:0);
  const beforeHome=Number(g.homeScore)-(upper(g.team)===upper(game.home.abbr)?1:0);
  const before=marginFromScore(game,line,beforeAway,beforeHome);
  if(favoriteScored&&before===1&&after===2){
   const emptyNet=/empty[ -]?net|\bEN\b/i.test(`${g.text||''} ${g.strength||''}`);
   cash={...g,emptyNet,before,after};
  }
  if(!favoriteScored&&before>=2&&after===1)backdoor={...g,before,after};
 }
 return {cash,backdoor};
}
function stateMeta(code){
 const all={
  UPCOMING:['UPCOMING','Pregame puck line is locked for tracking.'],
  SAFE_COVER:['SAFE COVER','Favorite is currently covering -1.5.'],
  ONE_GOAL_SWEAT:['ONE GOAL SWEAT','Favorite is up one with the late-game window approaching.'],
  PLJ_WATCH:['PLJ WATCH','One more goal creates the -1.5 cover.'],
  PLJ_LIVE:['PUCK LINE JESUS LIVE','Opponent goalie is pulled. The empty-net cover is live.'],
  BACKDOOR_DANGER:['BACKDOOR DANGER','Favorite is covering by exactly two late. One goal allowed loses the cover.'],
  PLJ_CASHED:['PLJ CASHED','A late empty-net goal turned a one-goal lead into a puck-line cover.'],
  LATE_CASH:['LATE COVER','A late goal turned a one-goal lead into a puck-line cover.'],
  BACKDOORED:['BACKDOORED','A late opponent goal erased the -1.5 cover.'],
  COVERED:['COVERED','Favorite finished with a two-goal-or-better win.'],
  MISSED_ONE:['MISSED BY 1','Favorite won, but not by enough to cover -1.5.'],
  MISSED:['MISSED','Favorite did not cover -1.5.'],
  NEEDS_RALLY:['NEEDS RALLY','Favorite is tied or trailing.'],
 };
 const [label,detail]=all[code]||all.NEEDS_RALLY;return {code,label,detail};
}
export function classifyPuckLineGame(game,line){
 if(!game||!line?.puckLine?.favoriteAbbr)return null;
 const side=favoriteSide(game,line);if(!side)return null;
 const margin=side.favoriteScore-side.underdogScore;
 const swing=lateSwing(game,line);
 const candidate=gradePljCandidate(line);
 let code='UPCOMING';
 if(game.status==='post'){
  if(margin>=2&&swing.cash?.emptyNet)code='PLJ_CASHED';
  else if(margin>=2&&swing.cash)code='LATE_CASH';
  else if(margin===1&&swing.backdoor)code='BACKDOORED';
  else if(margin>=2)code='COVERED';
  else if(margin===1)code='MISSED_ONE';
  else code='MISSED';
 }else if(game.status==='in'){
  if(margin===1&&swing.backdoor)code='BACKDOORED';
  else if(margin>=2&&swing.cash?.emptyNet)code='PLJ_CASHED';
  else if(margin>=2&&swing.cash)code='LATE_CASH';
  else if(margin===1&&isLateThird(game,WATCH_SECONDS)&&goaliePulled(game,side.underdog))code='PLJ_LIVE';
  else if(margin===1&&isLateThird(game,WATCH_SECONDS))code='PLJ_WATCH';
  else if(margin===2&&isLateThird(game,WATCH_SECONDS))code='BACKDOOR_DANGER';
  else if(margin===1&&isLateThird(game,SWEAT_SECONDS))code='ONE_GOAL_SWEAT';
  else if(margin>=2)code='SAFE_COVER';
  else code='NEEDS_RALLY';
 }
 const meta=stateMeta(code);
 return {...meta,game,line,side,margin,swing,candidate,goaliePulled:goaliePulled(game,side.underdog)};
}
export function buildPuckLineJesusModel(slate,lines){
 const tracked=(slate?.games||[]).map(game=>classifyPuckLineGame(game,lineFor(lines,game))).filter(Boolean);
 const live=tracked.filter(x=>x.game.status==='in'&&['ONE_GOAL_SWEAT','PLJ_WATCH','PLJ_LIVE','BACKDOOR_DANGER','SAFE_COVER'].includes(x.code));
 const hot=live.filter(x=>['PLJ_WATCH','PLJ_LIVE','BACKDOOR_DANGER'].includes(x.code));
 const completed=tracked.filter(x=>x.game.status==='post');
 const cashes=tracked.filter(x=>['PLJ_CASHED','LATE_CASH'].includes(x.code));
 const backdoors=tracked.filter(x=>x.code==='BACKDOORED');
 const upcoming=tracked.filter(x=>x.game.status==='pre');
 return {date:slate?.date||lines?.date||'',generatedAt:new Date().toISOString(),tracked,live,hot,completed,cashes,backdoors,upcoming};
}
function gameClock(g){return g.status==='pre'?new Date(g.startTime).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):g.status==='post'?'FINAL':`P${g.period||'—'} · ${esc(g.clock||g.detail||'LIVE')}`;}
function statusCard(x){
 const g=x.game,l=x.line.puckLine,c=x.candidate;
 const pre=g.status==='pre',candidateClass=pre&&c?` plj-candidate-card-${String(c.grade).toLowerCase()}`:'';
 const rightLabel=pre?'PLJ CANDIDATE':'COVER MARGIN';
 const rightValue=pre?(c?`Grade ${c.grade}`:'Pending'):x.margin>=0?`+${x.margin}`:String(x.margin);
 const rightDetail=pre?(c?.label||'Waiting for enough market data'):(x.goaliePulled?'Opponent net empty':'Live state verified');
 const rightClass=pre&&c?` class="plj-candidate-grade plj-candidate-grade-${String(c.grade).toLowerCase()}"`:'';
 const detail=pre&&c?c.detail:x.detail;
 return `<article class="plj-card plj-${x.code.toLowerCase().replaceAll('_','-')}${candidateClass}">
  <div class="plj-card-top"><span class="plj-badge">${esc(x.label)}</span><span>${esc(gameClock(g))}</span></div>
  <div class="plj-match"><div>${logo(g.away)}<b>${esc(g.away.abbr)}</b><strong>${pre?'—':esc(g.away.score??'—')}</strong></div><i>@</i><div>${logo(g.home)}<b>${esc(g.home.abbr)}</b><strong>${pre?'—':esc(g.home.score??'—')}</strong></div></div>
  <div class="plj-line"><div><small>TRACKED FAVORITE</small><b>${esc(l.favoriteAbbr)} -1.5 <em>${esc(price(l.price))}</em></b><span>${esc(l.book||'Sportsbook')} · ${Number(l.sportsbookCount||0)} book${Number(l.sportsbookCount||0)===1?'':'s'}</span></div><div><small>${esc(rightLabel)}</small><b${rightClass}>${esc(rightValue)}</b><span>${esc(rightDetail)}</span></div></div>
  <p>${esc(detail)}</p><button type="button" data-plj-game="${esc(g.id)}">Open NHL Live →</button>
 </article>`;
}
function section(title,subtitle,items,emptyText){return `<section class="plj-section"><div class="plj-section-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div><span>${items.length}</span></div><div class="plj-grid">${items.map(statusCard).join('')||`<div class="plj-empty">${esc(emptyText)}</div>`}</div></section>`;}
function renderModel(model){
 const host=document.getElementById('hkPuckLineJesusBody');if(!host)return;
 const live=model.live.slice().sort((a,b)=>({PLJ_LIVE:0,PLJ_WATCH:1,BACKDOOR_DANGER:2,ONE_GOAL_SWEAT:3,SAFE_COVER:4}[a.code]??9)-({PLJ_LIVE:0,PLJ_WATCH:1,BACKDOOR_DANGER:2,ONE_GOAL_SWEAT:3,SAFE_COVER:4}[b.code]??9));
 const upcoming=model.upcoming.slice().sort((a,b)=>(PLJ_CANDIDATE_ORDER[a.candidate?.grade]??9)-(PLJ_CANDIDATE_ORDER[b.candidate?.grade]??9)||Date.parse(a.game.startTime)-Date.parse(b.game.startTime));
 const gradeA=upcoming.filter(x=>x.candidate?.grade==='A').length;
 host.innerHTML=`<div class="plj-kpis"><div><b>${model.hot.length}</b><span>Live PLJ alerts</span></div><div><b>${model.cashes.filter(x=>x.code==='PLJ_CASHED').length}</b><span>Empty-net cashes</span></div><div><b>${model.backdoors.length}</b><span>Backdoor pain</span></div><div><b>${gradeA}</b><span>A-grade candidates</span></div></div>
 ${section('Live Opportunities','One-goal sweats, pulled-goalie chances and backdoor danger.',live,'No live puck-line sweat is active right now.')}
 ${section('Jesus Cashes Today','Late covers that moved the favorite from +1 to +2.',model.cashes,'No late puck-line cashes recorded yet.')}
 ${section('Backdoor Pain','Late opponent goals that erased a -1.5 cover.',model.backdoors,'No backdoor losses recorded yet.')}
 ${section('Pregame PLJ Candidates','A/B/C market-shape grade from -1.5 pricing, +1.5 resistance and sportsbook breadth — not a win probability.',upcoming,'Pregame puck lines are waiting for sportsbooks to post.')}`;
 const stamp=document.getElementById('hkPuckLineJesusStamp');if(stamp)stamp.textContent=`Updated ${new Date(model.generatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'})}`;
}
function panelHTML(){return `<section id="hkPuckLineJesusPanel" class="plj-panel" aria-label="Puck Line Jesus late empty-net cover tracker"><div class="plj-hero"><div><span class="plj-kicker">🏒 THE SPORTS OUTPOST · NHL</span><h2>Puck Line Jesus</h2><p>Live late empty-net cover tracker with pregame PLJ candidate grading for NHL -1.5 puck lines.</p></div><div class="plj-hero-actions"><span id="hkPuckLineJesusStamp">Loading live state…</span><button type="button" data-plj-close>Back to NHL</button></div></div><div id="hkPuckLineJesusBody"><div class="plj-loading">Loading verified puck lines and live game state…</div></div><footer class="plj-note">Pregame puck lines: ParlayAPI sportsbook snapshot · Candidate grades are market-shape heuristics, not probabilities · Live score/on-ice state: ESPN · “PLJ LIVE” requires a verified late one-goal lead plus no goalie among the trailing team’s current on-ice players.</footer></section>`;}
function ensureStyle(){
 if(!document.getElementById('nhl-puck-line-jesus-css')){const l=document.createElement('link');l.id='nhl-puck-line-jesus-css';l.rel='stylesheet';l.href='./sports/nhl/puck-line-jesus.css?v=90.23';document.head.appendChild(l);}
 if(!document.getElementById('nhl-plj-candidate-v927-css')){const l=document.createElement('link');l.id='nhl-plj-candidate-v927-css';l.rel='stylesheet';l.href='./sports/nhl/plj-candidate-v927.css?v=90.27';document.head.appendChild(l);}
}
function ensureButton(){
 const actions=document.querySelector('#nhlView .hk-head-actions');if(!actions)return;
 let b=document.getElementById('hkPuckLineJesusBtn');
 if(!b){b=document.createElement('button');b.id='hkPuckLineJesusBtn';b.type='button';b.className='plj-open';b.innerHTML='<span>⚡</span> Puck Line Jesus';actions.prepend(b);}
 b.setAttribute('aria-pressed',active?'true':'false');b.classList.toggle('active',active);
}
function syncPanel(){
 const root=document.getElementById('nhlView');if(!root)return;
 ensureButton();
 const content=root.querySelector('.hk-content');
 if(!active){root.querySelector('#hkPuckLineJesusPanel')?.remove();content?.classList.remove('plj-hidden');return;}
 content?.classList.add('plj-hidden');
 let panel=root.querySelector('#hkPuckLineJesusPanel');
 if(!panel){const header=root.querySelector('.hk-head');if(!header)return;header.insertAdjacentHTML('afterend',panelHTML());panel=root.querySelector('#hkPuckLineJesusPanel');if(lastModel)renderModel(lastModel);else if(lastError){const body=document.getElementById('hkPuckLineJesusBody');if(body)body.innerHTML=`<div class="plj-empty">${esc(lastError)}</div>`;}}
}
async function liveSlate(){
 const published=await getJSON(`./slates/nhl.json?t=${Date.now()}`);
 let slate=published;
 try{
  const live=await loadScoreboard();
  const liveById=new Map((live?.games||[]).map(g=>[String(g.id),g]));
  slate={...published,generatedAt:live?.generatedAt||published.generatedAt,games:(published?.games||[]).map(g=>liveById.get(String(g.id))||g)};
 }catch{}
 await Promise.all((slate.games||[]).filter(g=>['in','post'].includes(g.status)).map(async g=>{try{Object.assign(g,mergeSummary(g,await getJSON(`${API}/summary?event=${g.id}`)));}catch{g.summaryUnavailable=true;}}));
 return slate;
}
async function refresh(){
 if(!active||refreshing)return;refreshing=true;
 try{
  const [lines,slate]=await Promise.all([getJSON(`${LINES_PATH}?t=${Date.now()}`),liveSlate()]);
  lastModel=buildPuckLineJesusModel(slate,lines);lastError='';renderModel(lastModel);
 }catch(err){lastError='Puck Line Jesus is waiting for fresh NHL data.';const body=document.getElementById('hkPuckLineJesusBody');if(body)body.innerHTML=`<div class="plj-empty">${esc(lastError)}</div>`;}
 finally{refreshing=false;}
}
function setActive(next){active=Boolean(next);syncPanel();ensureButton();if(active){refresh();if(!timer)timer=setInterval(refresh,10000);}else if(timer){clearInterval(timer);timer=null;}}
function handleClick(e){
 const open=e.target.closest?.('#hkPuckLineJesusBtn');if(open){setActive(!active);return;}
 if(e.target.closest?.('[data-plj-close]')){setActive(false);return;}
 const game=e.target.closest?.('[data-plj-game]');if(game){setActive(false);window.DW_openNhlTab?.('live');}
}
export function installPuckLineJesusV923(){
 if(installed){syncPanel();return;}installed=true;ensureStyle();syncPanel();document.addEventListener('click',handleClick);
 observer=new MutationObserver(()=>{if(document.getElementById('nhlView'))queueMicrotask(syncPanel);});observer.observe(document.body,{childList:true,subtree:true});
 window.DW_openPuckLineJesus=()=>setActive(true);
}

export const __PLJ_TEST__={clockSeconds,goaliePulled,classifyPuckLineGame,buildPuckLineJesusModel,gradePljCandidate};
