// NHL v90.6.1 slate enhancement: NFL-style single-column matchups with expanding team player pools.
let installed=false,observer=null,refreshTimer=null,helpers={};
let slate=null,research=null,sim=null,dataStamp='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const img=u=>/^https:\/\//.test(String(u||''))?String(u):'';

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById('nhl-slate-v9061'))return;
 document.getElementById('nhl-slate-v906')?.remove();
 const link=document.createElement('link');link.id='nhl-slate-v9061';link.rel='stylesheet';link.href='./sports/nhl/slate-v906.css?v=90.6.1';document.head.appendChild(link);
}
function goalProbability(gameId,playerId,simDoc=sim){
 const g=simDoc?.games?.find(x=>String(x.gameId)===String(gameId));
 if(!g?.ready)return null;
 const p=g.players?.find(x=>String(x.id)===String(playerId));
 const v=num(p?.metrics?.goals?.atLeastOne);
 return v==null?null:Math.max(0,Math.min(1,v));
}
function historyFor(player,researchDoc=research){return researchDoc?.players?.[String(player?.id)]||null;}
function skaterScore(player,gameId,researchDoc=research,simDoc=sim){
 const prob=goalProbability(gameId,player.id,simDoc),h=historyFor(player,researchDoc),r=h?.rates||{};
 if(prob!=null)return 1000+prob*100;
 return (num(r.goals)||0)*100+(num(r.sog)||0)*7+(num(r.points)||0)*10+(player.active===false?-500:0);
}
export function rankNhlSlatePlayers(players=[],gameId,researchDoc=null,simDoc=null){
 return players.filter(p=>p&&p.position!=='G'&&p.active!==false).slice().sort((a,b)=>{
  const d=skaterScore(b,gameId,researchDoc,simDoc)-skaterScore(a,gameId,researchDoc,simDoc);
  return d||String(a.name||'').localeCompare(String(b.name||''));
 });
}
function rate(v,d=2){const n=num(v);return n==null?'—':n.toFixed(d);}
function playerProfile(player,gameId,researchDoc=research,simDoc=sim){
 const h=historyFor(player,researchDoc),r=h?.rates||{},prob=player.position==='G'?null:goalProbability(gameId,player.id,simDoc);
 if(player.position==='G')return {prob:null,primary:player.confirmedStarter?'Confirmed starter':player.currentGoalie?'Current goalie':'Goalie',secondary:`${rate(r.saves,1)} saves/g`};
 return {prob,primary:prob==null?`${rate(r.goals)} G/G`:`${(prob*100).toFixed(prob<.1?1:0)}% goal chance`,secondary:`${rate(r.sog,1)} SOG/G · ${rate(r.points)} PTS/G`};
}
function playerPhoto(player){const src=img(player.photo);return src?`<img src="${esc(src)}" alt="${esc(player.name||'Player')}" loading="lazy" decoding="async">`:`<span>🏒</span>`;}
function teamLogo(team){const src=img(team?.logo);return src?`<img src="${esc(src)}" alt="${esc(team?.name||team?.abbr||'Team')}">`:`<span>${esc(team?.abbr||'NHL')}</span>`;}
function gradeRing(prob){
 const grade=helpers.gradeForLean?helpers.gradeForLean(prob):(prob==null?'—':prob>=.70?'A+':prob>=.65?'A':prob>=.61?'A-':prob>=.57?'B+':prob>=.54?'B':prob>=.51?'B-':prob>=.48?'C+':'C');
 if(helpers.gradeRingHTML)return helpers.gradeRingHTML(prob,grade,'sm');
 return `<span class="hk-slate-grade-fallback"><b>${esc(grade)}</b><small>${prob==null?'—':Math.round(prob*100)+'%'}</small></span>`;
}
function playerRow(player,game){
 const p=playerProfile(player,game.id),availability=player.availability||'Status pending';
 return `<div class="hk-slate-player"><div class="hk-slate-player-photo">${playerPhoto(player)}</div><div class="hk-slate-player-main"><b>${esc(player.name||'Player')}</b><span>${esc(player.position||'—')} · ${esc(availability)}</span></div><div class="hk-slate-player-model"><strong>${esc(p.primary)}</strong><small>${esc(p.secondary)}</small></div><div class="hk-slate-player-grade">${gradeRing(p.prob)}</div></div>`;
}
function teamPlayers(game,team){return (game.players||[]).filter(p=>String(p.team).toUpperCase()===String(team.abbr).toUpperCase());}
function goaliesFor(all){return all.filter(p=>p.position==='G'&&p.active!==false).sort((a,b)=>Number(b.confirmedStarter)-Number(a.confirmedStarter)||Number(b.currentGoalie)-Number(a.currentGoalie)||String(a.name||'').localeCompare(String(b.name||'')));}
function teamBoard(game,team){
 const all=teamPlayers(game,team),ranked=rankNhlSlatePlayers(all,game.id,research,sim),top=ranked.slice(0,5),rest=[...ranked.slice(5),...goaliesFor(all)];
 return `<section class="hk-slate-team-board"><div class="hk-slate-team-head">${teamLogo(team)}<div><b>${esc(team.name)}</b><span>Top Goal Threats · ${ranked.length} skaters</span></div></div><div class="hk-slate-team-cols"><span>Player</span><span>Model / baseline</span><span>Grade</span></div><div class="hk-slate-top-five">${top.map(p=>playerRow(p,game)).join('')||'<div class="hk-slate-no-players">Player pool is loading.</div>'}</div><div class="hk-slate-rest" aria-label="Remaining ${esc(team.name)} player pool">${rest.map(p=>playerRow(p,game)).join('')}</div></section>`;
}
export function renderNhlSlatePoolsHTML(game,{research:researchDoc=null,sim:simDoc=null,gradeForLean=null,gradeRingHTML=null}={}){
 const priorResearch=research,priorSim=sim,priorHelpers=helpers;research=researchDoc;sim=simDoc;helpers={...helpers,gradeForLean,gradeRingHTML};
 const html=`<div class="hk-slate-matchup-pools" role="region" aria-label="${esc(game.away?.name)} at ${esc(game.home?.name)} player pools"><div class="hk-slate-featured-grid">${teamBoard(game,game.away)}${teamBoard(game,game.home)}</div><button type="button" class="hk-slate-pool-toggle" data-hk-pool-toggle aria-expanded="false"><span class="closed-label">View Full Player Pools</span><span class="open-label">Hide Full Player Pools</span><i>⌄</i></button></div>`;
 research=priorResearch;sim=priorSim;helpers=priorHelpers;return html;
}
async function getJSON(path){const r=await fetch(`${path}${path.includes('?')?'&':'?'}v=90.6.1-${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
async function refreshData(){
 try{
  const [s,r,m]=await Promise.all([getJSON('./slates/nhl.json'),getJSON('./slates/nhl-research.json').catch(()=>null),getJSON('./slates/nhl-sim.json').catch(()=>null)]);
  slate=s;if(r)research=r;if(m)sim=m;dataStamp=`${slate?.generatedAt||''}|${research?.generatedAt||''}|${sim?.generatedAt||''}`;enhance();
 }catch(e){console.warn('[NHL slate pools] data unavailable:',e);}
}
function setExpanded(pool,expanded){
 pool.classList.toggle('is-expanded',expanded);
 const button=pool.querySelector('[data-hk-pool-toggle]');
 if(button)button.setAttribute('aria-expanded',String(expanded));
}
function wirePool(pool){
 if(pool.dataset.hkPoolWired)return;pool.dataset.hkPoolWired='1';
 pool.addEventListener('click',e=>{
  e.stopPropagation();
  const button=e.target.closest?.('[data-hk-pool-toggle]');
  if(button)setExpanded(pool,!pool.classList.contains('is-expanded'));
 });
 pool.addEventListener('keydown',e=>e.stopPropagation());
}
function enhance(){
 if(typeof document==='undefined'||!slate)return;
 const host=document.getElementById('nhlView');if(!host||host.hasAttribute('hidden'))return;
 for(const card of host.querySelectorAll('.hk-matchup[data-hk-game]')){
  const game=slate.games?.find(g=>String(g.id)===String(card.dataset.hkGame));if(!game)continue;
  const old=card.querySelector('.hk-slate-matchup-pools');
  if(old?.dataset.stamp===dataStamp){wirePool(old);continue;}
  const wasExpanded=old?.classList.contains('is-expanded')||false;
  old?.remove();
  const footer=card.querySelector('.hk-match-footer'),body=card.querySelector('.hk-match-body');
  const wrap=document.createElement('div');wrap.innerHTML=renderNhlSlatePoolsHTML(game,{research,sim,gradeForLean:helpers.gradeForLean,gradeRingHTML:helpers.gradeRingHTML});
  const pool=wrap.firstElementChild;pool.dataset.stamp=dataStamp;setExpanded(pool,wasExpanded);
  if(footer)card.insertBefore(pool,footer);else if(body)body.after(pool);else card.appendChild(pool);
  wirePool(pool);
 }
}
export function installNhlSlateV906(nextHelpers={}){
 helpers={...helpers,...nextHelpers};ensureStyle();
 if(installed){enhance();return;}
 installed=true;
 const start=()=>{const host=document.getElementById('nhlView');if(!host)return;observer=new MutationObserver(()=>queueMicrotask(enhance));observer.observe(host,{childList:true,subtree:true});refreshData();refreshTimer=setInterval(refreshData,60000);enhance();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
export const __NHL_SLATE_V906_TEST__={goalProbability,playerProfile,skaterScore};
