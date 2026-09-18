import { gradeForLean, gradeRingHTML } from './grade.js?v=90.4';
import { historicalPropProjection } from './props-model.js?v=90.1';

let installed=false, observer=null, queued=false, docs=null, docsAt=0, docsPromise=null;
let gameModalId=null, liveBypass=false, goalBaseline=false;
const goalSeen=new Set();
const filters={q:'',team:'ALL',pos:'ALL',game:'ALL',sort:'model'};
const MARKETS={atg:'Anytime Goal',sog:'Shots on Goal',points:'Points',assists:'Assists',blocks:'Blocked Shots',saves:'Goalie Saves'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
const num=v=>Number.isFinite(Number(v))?Number(v):null;
function ensureStyle(){if(document.getElementById('nhl-launch-v922-css'))return;const l=document.createElement('link');l.id='nhl-launch-v922-css';l.rel='stylesheet';l.href='./sports/nhl/launch-v922.css?v=90.22';document.head.appendChild(l);}

async function getJSON(path){
 const r=await fetch(path+'?v=90.22-'+Date.now(),{cache:'no-store'});
 if(!r.ok)throw new Error(path+' '+r.status);
 return r.json();
}
async function loadDocs(force=false){
 if(!force&&docs&&Date.now()-docsAt<30000)return docs;
 if(docsPromise)return docsPromise;
 docsPromise=Promise.all([
   getJSON('./slates/nhl.json'),
   getJSON('./slates/nhl-research.json').catch(()=>null),
   getJSON('./slates/nhl-sim.json').catch(()=>null)
 ]).then(a=>{docs={slate:a[0],research:a[1],sim:a[2]};docsAt=Date.now();return docs;}).finally(()=>docsPromise=null);
 return docsPromise;
}
function gameById(id){return (docs?.slate?.games||[]).find(g=>String(g.id)===String(id))||null;}
function uniquePlayer(name,team=''){
 const hits=[];
 for(const g of docs?.slate?.games||[])for(const p of g.players||[]){
   if(norm(p.name)!==norm(name))continue;
   if(team&&String(p.team||'').toUpperCase()!==String(team).toUpperCase())continue;
   if(p.propsEligible===false)continue;
   hits.push({g,p});
 }
 return hits.length===1?hits[0]:null;
}
function goalProb(g,p){
 const sg=docs?.sim?.games?.find(x=>String(x.gameId)===String(g.id));
 const sp=sg?.ready?sg.players?.find(x=>String(x.id)===String(p.id)):null;
 const live=num(sp?.metrics?.goals?.atLeastOne);
 if(live!=null)return live;
 return num(historicalPropProjection(docs?.research?.players?.[String(p.id)],'atg',docs?.research?.currentSeason)?.metric?.atLeastOne);
}
function timeCopy(g){
 if(g?.status==='in'||g?.status==='post')return g.detail||'Game';
 const d=new Date(g?.startTime||0);
 return Number.isFinite(d.getTime())?d.toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Puck drop TBD';
}
function logo(t){
 return /^https:\/\//.test(String(t?.logo||''))?'<img class="hk-launch-team-logo" src="'+esc(t.logo)+'" alt="'+esc(t.name||t.abbr)+'">':'<span class="hk-launch-team-logo fallback">'+esc(t?.abbr||'NHL')+'</span>';
}
function photo(p){
 return /^https:\/\//.test(String(p?.photo||''))?'<img src="'+esc(p.photo)+'" alt="'+esc(p.name||'Player')+'">':'<span class="hk-launch-avatar">🏒</span>';
}
function lineupCopy(g){
 const teams=g?.lineupEvidence?.teams||[];
 if(!teams.length)return 'Lineups and goalies awaiting event-specific confirmation';
 return teams.map(t=>String(t.team)+': '+(t.confirmed?'roster confirmed':'lineup pending')+' · '+(t.goalieName||'goalie pending')).join(' | ');
}
function assignedPlayers(g,t){
 return (g?.players||[]).filter(p=>p.team===t.abbr&&p.position!=='G'&&p.active!==false&&p.propsEligible!==false)
   .map(p=>({p,prob:goalProb(g,p)}))
   .sort((a,b)=>(b.prob??-1)-(a.prob??-1)||String(a.p.name).localeCompare(String(b.p.name))).slice(0,8);
}
function goalieCopy(g,t){
 const ps=(g?.players||[]).filter(p=>p.team===t.abbr&&p.position==='G'&&p.active!==false);
 const p=ps.find(x=>x.currentGoalie||x.confirmedStarter)||ps[0];
 return p?p.name+' · '+(p.availability||'status pending'):'Goalie assignment pending';
}
function teamModalHTML(g,t){
 const rows=assignedPlayers(g,t);
 return '<section class="hk-launch-modal-team"><div class="hk-launch-modal-team-head">'+logo(t)+'<div><small>'+esc(t.abbr)+'</small><b>'+esc(t.name)+'</b><span>'+esc(goalieCopy(g,t))+'</span></div></div><div class="hk-launch-modal-players">'+
   (rows.length?rows.map(x=>'<button type="button" data-hk-launch-player="'+esc(x.p.id)+'" data-hk-launch-game="'+esc(g.id)+'" data-hk-launch-name="'+esc(x.p.name)+'" data-hk-launch-team="'+esc(x.p.team)+'">'+
     '<span>'+photo(x.p)+'</span><b>'+esc(x.p.name)+'<small>'+esc(x.p.position)+' · '+esc(x.p.availability||'status pending')+'</small></b><em>'+gradeRingHTML(x.prob,gradeForLean(x.prob),'sm')+'</em></button>').join(''):
     '<div class="hk-launch-pending">'+(g.splitSquad?'Event-specific split-squad assignments are pending. TSO will not guess this roster.':'Player pool is loading.')+'</div>')+
   '</div></section>';
}
function closeGameModal(){
 document.getElementById('hkLaunchGameModal')?.remove();
 document.body.classList.remove('tso-nhl-game-modal-open');
 gameModalId=null;
}
async function openGameModal(id){
 await loadDocs(true).catch(()=>null);
 const g=gameById(id);if(!g)return;
 window.closeCommandCenter?.();closeGameModal();gameModalId=String(id);
 const b=document.createElement('div');b.id='hkLaunchGameModal';b.className='hk-launch-modal-backdrop';
 const format=g.splitSquad?'Split-squad preseason':g.seasonType===1?'Preseason':'Regular season';
 b.innerHTML='<section class="hk-launch-modal" role="dialog" aria-modal="true" aria-label="'+esc(g.away?.name)+' at '+esc(g.home?.name)+' matchup">'+
 '<header><div><span>'+esc(format)+' · '+esc(timeCopy(g))+'</span><h2>'+esc(g.away?.name)+' <i>@</i> '+esc(g.home?.name)+'</h2><p>'+esc(g.venue||'Venue TBD')+(g.neutralSite?' · Neutral site':'')+'</p></div><button type="button" data-hk-launch-close aria-label="Close">×</button></header>'+
 '<div class="hk-launch-modal-status"><div><span>Game status</span><b>'+esc(g.status==='in'?'LIVE':g.status==='post'?'FINAL':'UPCOMING')+' · '+esc(g.detail||timeCopy(g))+'</b></div><div><span>Lineups</span><b>'+esc(lineupCopy(g))+'</b></div></div>'+
 '<div class="hk-launch-modal-grid">'+teamModalHTML(g,g.away)+teamModalHTML(g,g.home)+'</div>'+
 '<footer><button type="button" data-hk-launch-close>Close</button><button class="primary" type="button" data-hk-launch-live="'+esc(g.id)+'">'+(g.status==='in'?'Watch Live Gamecast':'Open Gamecast')+'</button></footer></section>';
 document.body.appendChild(b);document.body.classList.add('tso-nhl-game-modal-open');
 b.addEventListener('click',e=>{if(e.target===b)closeGameModal();});
}
function openLive(id){
 closeGameModal();window.closeCommandCenter?.();
 const btn=[...document.querySelectorAll('#nhlView button[data-hk-game]')].find(x=>String(x.dataset.hkGame)===String(id));
 if(btn){liveBypass=true;btn.click();liveBypass=false;return;}
 window.DW_nhlPendingTab='live';if(location.hash!=='#nhl')location.hash='nhl';else window.DW_openNhlTab?.('live');
}
function openPlayer(el){
 const ref={id:el.dataset.hkLaunchPlayer||null,gameId:el.dataset.hkLaunchGame||null,name:el.dataset.hkLaunchName||null,team:el.dataset.hkLaunchTeam||null,market:el.dataset.hkLaunchMarket||null};
 window.closeCommandCenter?.();closeGameModal();window.DW_openNhlPlayerModal?.(ref);
}
function decorateSlate(){
 for(const card of document.querySelectorAll('#nhlView .hk-matchup[data-hk-game]')){
   const g=gameById(card.dataset.hkGame);if(!g)continue;
   card.dataset.hkLaunchModal=String(g.id);
   const status=card.querySelector('.hk-match-status span:last-child');
   if(status&&g.splitSquad&&!/split squad/i.test(status.textContent))status.textContent='Preseason · Split squad · '+timeCopy(g);
   const center=card.querySelector('.hk-game-center span');
   if(center&&g.neutralSite&&!/neutral/i.test(center.textContent))center.textContent='Neutral site · '+center.textContent;
   const foot=card.querySelector('.hk-match-footer');
   const live=foot?.querySelector('button[data-hk-game]');
   if(live){live.dataset.hkLaunchLive=String(g.id);live.textContent=g.status==='in'?'Watch Live':'Open Gamecast';}
   if(foot&&!foot.querySelector('[data-hk-launch-details]')){
     const d=document.createElement('button');d.type='button';d.className='hk-launch-details';d.dataset.hkLaunchDetails=String(g.id);d.textContent='Details';live?.before(d);
   }
 }
 for(const row of document.querySelectorAll('#nhlView .hk-slate-player')){
   const id=row.dataset.hkPlayer,game=row.dataset.hkGame;if(!id||!game)continue;
   row.dataset.hkLaunchPlayer=id;row.dataset.hkLaunchGame=game;
 }
}
function cardInfo(card){
 const name=card.querySelector('.hk-prop-name b')?.textContent?.trim()||'';
 const bits=(card.querySelector('.hk-prop-name span')?.textContent||'').split('·').map(x=>x.trim());
 const team=bits[0]||'',pos=bits[1]||'',match=(card.querySelector('.hk-prop-match')?.textContent||'').split('·')[0].trim();
 const pct=num(String(card.querySelector('.hk-grade-ring .sgr-pv')?.textContent||'').replace('%',''));
 const hit=uniquePlayer(name,team);
 return {card,name,team,pos,match,pct:pct==null?null:pct/100,hit};
}
function fillSelect(sel,values,current,allLabel){
 if(!sel)return;sel.innerHTML='<option value="ALL">All '+allLabel+'</option>'+values.map(v=>'<option value="'+esc(v)+'" '+(String(v)===String(current)?'selected':'')+'>'+esc(v)+'</option>').join('');
}
function sortAndFilterProps(){
 const list=document.querySelector('#nhlView .hk-prop-list');if(!list)return;
 let rows=[...list.querySelectorAll('.hk-prop-card')].map(cardInfo);
 const q=norm(filters.q);let visible=0;
 for(const r of rows){
   const assigned=!r.hit||r.match===(r.hit.g.away.abbr+' @ '+r.hit.g.home.abbr);
   const show=assigned&&(filters.team==='ALL'||r.team===filters.team)&&(filters.pos==='ALL'||r.pos===filters.pos)&&(filters.game==='ALL'||r.match===filters.game)&&(!q||norm(r.name+' '+r.team+' '+r.pos+' '+r.match).includes(q));
   r.card.style.setProperty('display',show?'grid':'none','important');r.show=show;if(show)visible++;
   if(r.hit){r.card.dataset.hkPlayerId=String(r.hit.p.id);r.card.dataset.hkGameId=String(r.hit.g.id);}
 }
 rows=rows.filter(r=>r.show);
 if(filters.sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name));
 else if(filters.sort==='team')rows.sort((a,b)=>a.team.localeCompare(b.team)||a.name.localeCompare(b.name));
 else rows.sort((a,b)=>(b.pct??-1)-(a.pct??-1)||a.name.localeCompare(b.name));
 const frag=document.createDocumentFragment();for(const r of rows)frag.appendChild(r.card);list.prepend(frag);
 const count=document.getElementById('hkLaunchPropCount');if(count)count.textContent=visible+' of '+[...list.querySelectorAll('.hk-prop-card')].length+' players';
 const empty=document.getElementById('hkLaunchPropEmpty');if(empty)empty.hidden=visible>0;
}
function installPropsControls(){
 const toolbar=document.querySelector('#nhlView .hk-prop-toolbar');if(!toolbar)return;
 let host=document.getElementById('hkLaunchPropsControls');
 // Do not rebuild an already-mounted control bar. The launch observer watches
 // child-list changes, and replacing this innerHTML on every scan detached the
 // search field while a user was typing. A real NHL page rerender removes the
 // whole host, so the next scan still rebuilds controls from fresh slate data.
 if(host)return;
 host=document.createElement('section');host.id='hkLaunchPropsControls';host.className='hk-launch-props-controls';toolbar.after(host);
 const rows=[...document.querySelectorAll('#nhlView .hk-prop-card')].map(cardInfo);
 const teams=[...new Set(rows.map(r=>r.team).filter(Boolean))].sort(),pos=[...new Set(rows.map(r=>r.pos).filter(Boolean))].sort(),games=[...new Set(rows.map(r=>r.match).filter(Boolean))].sort();
 const market=document.querySelector('#nhlView #hk-market')?.value||'sog';
 host.innerHTML='<div class="hk-launch-market-tabs">'+Object.entries(MARKETS).map(([k,v])=>'<button type="button" class="'+(k===market?'active':'')+'" data-hk-launch-market="'+k+'">'+esc(v)+'</button>').join('')+'</div>'+
 '<div class="hk-launch-filter-grid"><label class="search">Search<input id="hkLaunchSearch" type="search" value="'+esc(filters.q)+'" placeholder="Player, team, matchup…"></label><label>Team<select id="hkLaunchTeam"></select></label><label>Position<select id="hkLaunchPos"></select></label><label>Game<select id="hkLaunchGame"></select></label><label>Sort<select id="hkLaunchSort"><option value="model">TSO grade</option><option value="name">Player</option><option value="team">Team</option></select></label><button type="button" id="hkLaunchClear">Clear</button></div>'+
 '<div class="hk-launch-filter-status"><b id="hkLaunchPropCount"></b><span>Split-squad duplicates stay hidden until event-roster assignment is confirmed.</span></div><div id="hkLaunchPropEmpty" class="hk-launch-empty" hidden>No players match these filters.</div>';
 fillSelect(host.querySelector('#hkLaunchTeam'),teams,filters.team,'teams');fillSelect(host.querySelector('#hkLaunchPos'),pos,filters.pos,'positions');fillSelect(host.querySelector('#hkLaunchGame'),games,filters.game,'games');
 host.querySelector('#hkLaunchSort').value=filters.sort;sortAndFilterProps();
}
function decorateFeed(){
 const cards=[...document.querySelectorAll('#nhlView .hk-feed-card')];
 for(const card of cards){
   const name=card.querySelector('.hk-feed-name b')?.textContent?.trim();if(!name)continue;
   const hit=uniquePlayer(name);if(!hit)continue;
   card.dataset.hkLaunchPlayer=String(hit.p.id);card.dataset.hkLaunchGame=String(hit.g.id);card.dataset.hkLaunchName=hit.p.name;card.dataset.hkLaunchTeam=hit.p.team;card.tabIndex=0;card.setAttribute('role','button');
 }
 if(!goalBaseline){for(const c of cards)goalSeen.add(goalKey(c));goalBaseline=true;return;}
 for(const c of cards){const key=goalKey(c);if(!key||goalSeen.has(key))continue;goalSeen.add(key);notifyGoal(c);}
}
function goalKey(c){return norm([c.querySelector('.hk-feed-name b')?.textContent,c.querySelector('.hk-feed-time')?.textContent,c.querySelector('.hk-feed-score')?.textContent].join('|'));}
function notifyGoal(card){
 const name=card.querySelector('.hk-feed-name b')?.textContent?.trim()||'NHL Goal',text=card.querySelector('.hk-feed-main p')?.textContent?.trim()||'',score=card.querySelector('.hk-feed-score')?.textContent?.trim()||'';
 const t=document.createElement('button');t.type='button';t.className='hk-launch-goal-toast';
 for(const k of ['hkLaunchPlayer','hkLaunchGame','hkLaunchName','hkLaunchTeam'])if(card.dataset[k])t.dataset[k]=card.dataset[k];
 t.innerHTML='<b>🏒 '+esc(name)+' — GOAL</b><span>'+esc(text)+(score?' · '+esc(score):'')+'</span>';document.body.appendChild(t);setTimeout(()=>t.remove(),7000);
 try{if(typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification('🏒 '+name+' — GOAL',{body:[text,score].filter(Boolean).join('\n'),icon:'icon-192.png'});}catch{}
}
function topGoalRows(limit=6){
 const out=[];for(const g of docs?.slate?.games||[])for(const p of g.players||[]){if(p.position==='G'||p.active===false||p.propsEligible===false)continue;const prob=goalProb(g,p);if(prob!=null)out.push({g,p,prob});}
 return out.sort((a,b)=>b.prob-a.prob).slice(0,limit);
}
function ccExtraHTML(){
 const games=docs?.slate?.games||[],next=games.filter(g=>g.status==='pre').sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime)).slice(0,5),top=topGoalRows();
 return '<div class="hk-launch-cc-extra"><div class="cc-section"><div class="cc-section-label">Launch Slate</div>'+
 (next.length?next.map(g=>'<button type="button" class="cc-target-row" data-hk-launch-details="'+esc(g.id)+'"><span class="cc-target-name">'+esc(g.away.abbr)+' @ '+esc(g.home.abbr)+'<small>'+esc(timeCopy(g))+' · '+esc(g.venue||'Venue TBD')+(g.splitSquad?' · split squad':'')+'</small></span><span class="cc-target-stat">DETAILS →</span></button>').join(''):'<div class="cc-empty-note">No upcoming games on this slate.</div>')+
 '</div><div class="cc-section"><div class="cc-section-label">Top Goal Threats</div>'+
 (top.length?top.map(x=>'<button type="button" class="cc-target-row" data-hk-launch-player="'+esc(x.p.id)+'" data-hk-launch-game="'+esc(x.g.id)+'" data-hk-launch-name="'+esc(x.p.name)+'" data-hk-launch-team="'+esc(x.p.team)+'" data-hk-launch-market="atg"><span class="cc-target-name">'+esc(x.p.name)+'<small>'+esc(x.p.team)+' · '+esc(x.g.away.abbr)+' @ '+esc(x.g.home.abbr)+' · '+Math.round(x.prob*100)+'% baseline goal chance</small></span><span class="cc-target-stat">'+esc(gradeForLean(x.prob))+'</span></button>').join(''):'<div class="cc-empty-note">Goal-threat baselines are loading.</div>')+
 '</div></div>';
}
function wrapCommandCenter(){
 const api=window.DW_NHL_COMMAND_CENTER;if(!api||api.__launchV922)return;
 const html=api.html?.bind(api),refresh=api.refresh?.bind(api);
 api.html=()=>String(html?html():'')+ccExtraHTML();
 api.refresh=()=>{const r=refresh?.();loadDocs(true).then(queue).catch(()=>{});return r;};
 api.__launchV922=true;
}
function decorateOpenCommandCenter(){
 const host=document.getElementById('ccHockeyCol');if(!host?.classList.contains('active'))return;
 if(!host.querySelector('.hk-launch-cc-extra'))host.insertAdjacentHTML('beforeend',ccExtraHTML());
}
function scan(){
 queued=false;wrapCommandCenter();decorateSlate();installPropsControls();decorateFeed();decorateOpenCommandCenter();
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(scan);}
function onClick(e){
 if(liveBypass)return;
 const close=e.target.closest?.('[data-hk-launch-close]');if(close){e.preventDefault();e.stopImmediatePropagation();closeGameModal();return;}
 const player=e.target.closest?.('[data-hk-launch-player]');if(player){e.preventDefault();e.stopImmediatePropagation();openPlayer(player);return;}
 const live=e.target.closest?.('[data-hk-launch-live]');if(live){e.preventDefault();e.stopImmediatePropagation();openLive(live.dataset.hkLaunchLive);return;}
 const details=e.target.closest?.('[data-hk-launch-details]');if(details){e.preventDefault();e.stopImmediatePropagation();openGameModal(details.dataset.hkLaunchDetails);return;}
 const market=e.target.closest?.('[data-hk-launch-market]');if(market){const select=document.querySelector('#nhlView #hk-market');if(select){select.value=market.dataset.hkLaunchMarket;select.dispatchEvent(new Event('change',{bubbles:true}));}return;}
 if(e.target.closest?.('#hkLaunchClear')){Object.assign(filters,{q:'',team:'ALL',pos:'ALL',game:'ALL',sort:'model'});installPropsControls();return;}
 const card=e.target.closest?.('#nhlView .hk-matchup[data-hk-launch-modal]');if(card&&!e.target.closest?.('.hk-slate-player')){e.preventDefault();e.stopImmediatePropagation();openGameModal(card.dataset.hkLaunchModal);}
}
function onInput(e){if(e.target.id!=='hkLaunchSearch')return;filters.q=e.target.value;sortAndFilterProps();}
function onChange(e){
 if(e.target.id==='hkLaunchTeam')filters.team=e.target.value;
 else if(e.target.id==='hkLaunchPos')filters.pos=e.target.value;
 else if(e.target.id==='hkLaunchGame')filters.game=e.target.value;
 else if(e.target.id==='hkLaunchSort')filters.sort=e.target.value;
 else return;
 sortAndFilterProps();
}
function onKey(e){
 if(e.key==='Escape'&&gameModalId){closeGameModal();return;}
 if(!['Enter',' '].includes(e.key))return;
 const card=e.target.closest?.('#nhlView .hk-matchup[data-hk-launch-modal]');if(card){e.preventDefault();openGameModal(card.dataset.hkLaunchModal);}
}
export async function installNhlLaunchV922(){
 ensureStyle();await loadDocs().catch(()=>null);wrapCommandCenter();
 if(!installed){
   installed=true;document.addEventListener('click',onClick,true);document.addEventListener('input',onInput,true);document.addEventListener('change',onChange,true);document.addEventListener('keydown',onKey,true);
   observer=new MutationObserver(rs=>{if(rs.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1)))queue();});observer.observe(document.body,{childList:true,subtree:true});
 }
 queue();
}
export const __NHL_LAUNCH_V922_TEST__={goalProb,uniquePlayer,cardInfo,topGoalRows,filters};
