import {quoteFor} from './odds.js?v=90.1';
import {gradeForLean,gradeRingHTML,overProbability} from './grade.js?v=90.4';

let installed=false,hostRef=null,slate=null,research=null,sim=null,odds=null,loadPromise=null,activeBackdrop=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const pct=v=>v==null?'—':`${(Number(v)*100).toFixed(Number(v)<.1?1:0)}%`;
const fmt=(v,d=2)=>v==null?'—':Number(v).toFixed(d);
const price=v=>v==null?'—':Number(v)>0?`+${Number(v)}`:String(Number(v));
const marketMeta={
 atg:{label:'Anytime Goal',metric:'goals',rate:'goals',unit:'goals'},
 sog:{label:'Shots on Goal',metric:'sog',rate:'sog',unit:'shots'},
 points:{label:'Points',metric:'points',rate:'points',unit:'points'},
 assists:{label:'Assists',metric:'assists',rate:'assists',unit:'assists'},
 blocks:{label:'Blocked Shots',metric:'blocks',rate:'blocks',unit:'blocks'},
 saves:{label:'Goalie Saves',metric:'saves',rate:'saves',unit:'saves'}
};

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById('nhl-player-modal-v907'))return;
 const link=document.createElement('link');link.id='nhl-player-modal-v907';link.rel='stylesheet';link.href='./sports/nhl/player-modal-v907.css?v=90.7';document.head.appendChild(link);
}
async function getJSON(path){const r=await fetch(`${path}?v=90.7-${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${path} ${r.status}`);return r.json();}
async function loadDocs(){
 if(loadPromise)return loadPromise;
 loadPromise=Promise.all([
  getJSON('./slates/nhl.json'),getJSON('./slates/nhl-research.json').catch(()=>null),getJSON('./slates/nhl-sim.json').catch(()=>null),getJSON('./slates/nhl-odds.json').catch(()=>null)
 ]).then(([s,r,m,o])=>{slate=s;research=r;sim=m;odds=o;return s;}).finally(()=>{loadPromise=null;});
 return loadPromise;
}
function findPlayer(id,gameId,name,team){
 const games=slate?.games||[];
 const candidates=gameId?games.filter(g=>String(g.id)===String(gameId)):games;
 for(const game of candidates){
  const p=(game.players||[]).find(x=>id?String(x.id)===String(id):String(x.name).toLowerCase()===String(name||'').toLowerCase()&&(!team||String(x.team)===String(team)));
  if(p)return {game,player:p};
 }
 return null;
}
function simState(game,player){
 const sg=(sim?.games||[]).find(g=>String(g.gameId)===String(game.id));
 if(!sg?.ready)return {game:sg,player:null,ready:false,reason:sg?.reason||'Simulation pending'};
 const sp=(sg.players||[]).find(p=>String(p.id)===String(player.id));
 return {game:sg,player:sp,ready:!!sp,reason:sp?'':'Player simulation pending'};
}
function impliedAmerican(v){const n=num(v);if(n==null||Math.abs(n)<100)return null;return n>0?100/(n+100):(-n)/((-n)+100);}
function fairProbability(q){const a=impliedAmerican(q?.over),b=impliedAmerican(q?.under);return a!=null&&b!=null?(a/(a+b)):a;}
function contextFor(game,player,market){
 const meta=marketMeta[market]||marketMeta.atg,history=research?.players?.[String(player.id)]||null,state=simState(game,player),metric=state.player?.metrics?.[meta.metric]||null,q=quoteFor(odds,game.id,player.id,market);
 const line=market==='atg'?.5:num(q?.line),prob=metric&&line!=null?overProbability(metric,line):null,grade=gradeForLean(prob),fair=fairProbability(q),edge=prob!=null&&fair!=null?prob-fair:null;
 const current=num(player.current?.[meta.metric]),baseline=num(history?.rates?.[meta.rate]);
 return {market,meta,history,state,metric,q,line,prob,grade,fair,edge,current,baseline,mean:num(metric?.mean),median:num(metric?.median)};
}
export function buildNhlPlayerContext({game,player,researchDoc=research,simDoc=sim,oddsDoc=odds,market}={}){
 const old=[research,sim,odds];research=researchDoc;sim=simDoc;odds=oddsDoc;
 const ctx=contextFor(game,player,market||(player?.position==='G'?'saves':'atg'));
 [research,sim,odds]=old;return ctx;
}
function marketsFor(player){return player.position==='G'?['saves']:['atg','sog','points','assists','blocks'];}
function opponent(game,player){return player.team===game.away.abbr?game.home:game.away;}
function statusText(game){return game.status==='in'?(game.detail||'Live'):game.status==='post'?'Final':new Date(game.startTime).toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
function headline(grade){const u=String(grade);return u.startsWith('A+')?'ELITE SETUP':u.startsWith('A')?'STRONG SPOT':u.startsWith('B')?'PLAYABLE LOOK':u.startsWith('C')?'OK MATCHUP':'AWAITING SIGNAL';}
function oddsHTML(ctx){
 if(!ctx.q)return '<div class="tso-nhl-odds-pending">Sportsbook line not posted yet</div>';
 return `<div class="tso-nhl-odds-chip best"><span>Book</span><b>${esc(ctx.q.book||'Sportsbook')}</b><em>${ctx.market==='atg'?'Goal':`Line ${esc(ctx.line)}`}</em></div><div class="tso-nhl-odds-chip"><span>${ctx.market==='atg'?'Yes':'Over'}</span><b>${esc(price(ctx.q.over))}</b><em>${ctx.fair==null?'Fair % pending':`${pct(ctx.fair)} no-vig`}</em></div><div class="tso-nhl-odds-chip"><span>${ctx.market==='atg'?'No':'Under'}</span><b>${esc(price(ctx.q.under))}</b><em>Pregame price</em></div><div class="tso-nhl-odds-chip edge"><span>TSO Edge</span><b class="${ctx.edge!=null&&ctx.edge>=0?'pos':'neg'}">${ctx.edge==null?'—':`${ctx.edge>=0?'+':''}${(ctx.edge*100).toFixed(1)}%`}</b><em>vs no-vig market</em></div>`;
}
function comparisonHTML(ctx){
 const rows=[['Season avg',ctx.baseline],['TSO mean',ctx.mean],['TSO median',ctx.median],['Sportsbook line',ctx.line],['Current',ctx.current]].filter(([,v])=>v!=null),max=Math.max(1,...rows.map(([,v])=>Number(v)))*1.12;
 if(!rows.length)return '<div class="tso-nhl-empty-chart">Verified comparison data is pending.</div>';
 return `<div class="tso-nhl-compare-chart">${rows.map(([label,v])=>`<div class="tso-nhl-chart-row"><span>${esc(label)}</span><div><i style="width:${Math.max(2,Math.min(100,Number(v)/max*100)).toFixed(1)}%"></i></div><b>${esc(fmt(v,ctx.market==='atg'?2:1))}</b></div>`).join('')}</div>`;
}
function bucketDistribution(metric,line){
 const rows=(metric?.distribution||[]).map(r=>[num(r?.[0]),num(r?.[1])]).filter(r=>r[0]!=null&&r[1]!=null);
 if(!rows.length)return [];
 const maxBars=10,groups=[];for(let i=0;i<rows.length;i+=Math.ceil(rows.length/maxBars)){const part=rows.slice(i,i+Math.ceil(rows.length/maxBars));groups.push({lo:part[0][0],hi:part.at(-1)[0],p:part.reduce((s,r)=>s+r[1],0)});}
 return groups.map(g=>({...g,label:g.lo===g.hi?String(g.lo):`${g.lo}–${g.hi}`,over:line!=null&&g.lo>line}));
}
function distributionHTML(ctx){
 const bars=bucketDistribution(ctx.metric,ctx.line);if(!bars.length)return `<div class="tso-nhl-empty-chart">${esc(ctx.state.reason||'Simulation distribution pending.')}</div>`;
 const max=Math.max(...bars.map(b=>b.p),.01);
 return `<div class="tso-nhl-dist-chart">${bars.map(b=>`<div class="tso-nhl-dist-col ${b.over?'over':''}"><span>${(b.p*100).toFixed(0)}%</span><div><i style="height:${Math.max(3,b.p/max*100).toFixed(1)}%"></i></div><small>${esc(b.label)}</small></div>`).join('')}</div><div class="tso-nhl-dist-legend"><span>Simulated final ${esc(ctx.meta.unit)}</span>${ctx.line!=null?`<b>Book line ${esc(ctx.line)}</b>`:''}</div>`;
}
function productionHTML(ctx,player){
 const r=ctx.history?.rates||{},items=player.position==='G'?[['Saves / game',r.saves],['Games',ctx.history?.games],['Model mean',ctx.mean],['Model median',ctx.median]]:[['Goals / game',r.goals],['SOG / game',r.sog],['Points / game',r.points],['Assists / game',r.assists],['Blocks / game',r.blocks],['Shooting',ctx.history?.shootingPct!=null?`${(ctx.history.shootingPct*100).toFixed(1)}%`:null]];
 return `<div class="tso-nhl-production-grid">${items.map(([l,v])=>`<div><span>${esc(l)}</span><b>${v==null?'—':typeof v==='string'?esc(v):esc(fmt(v,l==='Games'?0:2))}</b></div>`).join('')}</div>`;
}
function whyHTML(ctx,game,player){
 const opp=opponent(game,player),bits=[];
 if(ctx.prob!=null)bits.push(`TSO simulation puts the ${ctx.market==='atg'?'goal':'over'} probability at ${pct(ctx.prob)}.`);
 if(ctx.mean!=null&&ctx.baseline!=null)bits.push(`Projected mean ${fmt(ctx.mean,2)} compares with a verified season baseline of ${fmt(ctx.baseline,2)} per game.`);
 if(ctx.q)bits.push(`${ctx.q.book} is currently posting ${ctx.market==='atg'?'the anytime-goal market':`a ${ctx.line} line`} for this prop.`);
 bits.push(`${player.team} faces ${opp?.abbr||'the opponent'} at ${game.venue||'the listed venue'}; lineup status is ${player.availability||'pending'}.`);
 if(!ctx.metric)bits.push('No model probability is shown until the NHL simulation has valid lineup and goalie evidence.');
 return `<div class="tso-nhl-why">${bits.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`;
}
function teamLogo(t){return /^https:\/\//.test(String(t?.logo||''))?`<img src="${esc(t.logo)}" alt="${esc(t.name||t.abbr)}">`:`<span>${esc(t?.abbr||'NHL')}</span>`;}
function matchupHTML(game,player){const opp=opponent(game,player),team=player.team===game.away.abbr?game.away:game.home;return `<div class="tso-nhl-matchup-card"><div class="tso-nhl-match-team">${teamLogo(team)}<b>${esc(team.abbr)}</b></div><div class="tso-nhl-match-center"><span>${esc(statusText(game))}</span><strong>${esc(game.away.abbr)} @ ${esc(game.home.abbr)}</strong><small>${esc(game.venue||'Venue TBD')}</small></div><div class="tso-nhl-match-team">${teamLogo(opp)}<b>${esc(opp?.abbr||'OPP')}</b></div></div>`;}
function headerStats(ctx){return [['Season',ctx.baseline==null?'—':fmt(ctx.baseline,2)],['TSO Mean',ctx.mean==null?'—':fmt(ctx.mean,2)],['Book Line',ctx.line==null?'—':fmt(ctx.line,1)],['Current',ctx.current==null?'—':fmt(ctx.current,0)]];}
function renderBody(backdrop,game,player,selected){
 const modal=backdrop.querySelector('.ms-modal'),ctx=contextFor(game,player,selected),opp=opponent(game,player),stats=headerStats(ctx),photo=/^https:\/\//.test(String(player.photo||''))?`<img src="${esc(player.photo)}" alt="${esc(player.name)}">`:`<span>${esc(player.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</span>`;
 modal.innerHTML=`<div class="player-card-v2 tso-nfl-player-card-v70 tso-nfl-player-card-v72 tso-nhl-player-card-v907"><button class="modal-close" type="button" aria-label="Close">&times;</button><div class="hdr"><div class="ava-reticle"><div class="ava">${photo}</div></div><div class="who"><h2>${esc(player.name)} <span class="dq-badge sourced">Sourced</span><span class="tso-nhl-hdr-badge">${esc(player.position)} · ${esc(player.availability||'Status pending')}</span></h2><div class="sub">${esc(ctx.meta.label)} · vs ${esc(opp?.abbr||'OPP')} · ${esc(player.team)}</div><div class="hdr-stats">${stats.map(([l,v])=>`<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('')}</div></div><div class="tso-nhl-prop-control"><label for="tsoNhlPropSelect">Player Prop</label><select id="tsoNhlPropSelect">${marketsFor(player).map(k=>`<option value="${k}" ${k===selected?'selected':''}>${esc(marketMeta[k].label)}</option>`).join('')}</select></div></div><div class="tso-nhl-scroll"><div class="sec tso-nhl-verdict"><div class="tso-nhl-verdict-ring">${gradeRingHTML(ctx.prob,ctx.grade,'lg')}</div><div><span>TSO PROP VERDICT</span><h3>${esc(headline(ctx.grade))}</h3><p>${ctx.prob==null?'Probability pending valid simulation + line evidence.':`${pct(ctx.prob)} model probability · grade ${esc(ctx.grade)}`}</p></div></div><div class="tso-nhl-odds-strip">${oddsHTML(ctx)}</div><div class="sec"><div class="sec-h"><h3>Prop Outlook</h3><span class="cap">baseline · model · market</span></div>${comparisonHTML(ctx)}</div><div class="sec"><div class="sec-h"><h3>Outcome Distribution</h3><span class="cap">simulation worlds</span></div>${distributionHTML(ctx)}</div><div class="sec"><div class="sec-h"><h3>Production Quality</h3><span class="cap">verified season data</span></div>${productionHTML(ctx,player)}</div><div class="sec matchup-mix-sec"><div class="sec-h"><h3>Matchup</h3><span class="cap">current slate</span></div>${matchupHTML(game,player)}</div><div class="sec"><div class="sec-h"><h3>Why</h3></div>${whyHTML(ctx,game,player)}</div><div class="foot">NFL-parity player modal. Season baselines come from verified ESPN statistics; TSO probabilities and distributions come from eligible NHL simulations; sportsbook values appear only when a current quote exists.</div></div></div>`;
 modal.querySelector('.modal-close')?.addEventListener('click',()=>closeModal());
 modal.querySelector('#tsoNhlPropSelect')?.addEventListener('change',e=>renderBody(backdrop,game,player,e.currentTarget.value));
}
export function renderNhlPlayerModalHTML(game,player,market){
 if(typeof document==='undefined')return '';
 const div=document.createElement('div');div.className='ms-modal-backdrop tso-mlb-backdrop tso-nhl-modal-backdrop';div.innerHTML='<div class="ms-modal tso-mlb-player-shell" role="dialog" aria-modal="true"></div>';renderBody(div,game,player,market||marketsFor(player)[0]);return div.outerHTML;
}
function closeModal(){if(!activeBackdrop)return;activeBackdrop.remove();activeBackdrop=null;document.body.classList.remove('tso-nhl-modal-open');}
async function openModal(ref){
 await loadDocs();const hit=findPlayer(ref.id,ref.gameId,ref.name,ref.team);if(!hit)return;
 closeModal();const backdrop=document.createElement('div');backdrop.className='ms-modal-backdrop tso-mlb-backdrop tso-nhl-modal-backdrop';backdrop.innerHTML='<div class="ms-modal tso-mlb-player-shell" role="dialog" aria-modal="true"></div>';document.body.appendChild(backdrop);activeBackdrop=backdrop;document.body.classList.add('tso-nhl-modal-open');renderBody(backdrop,hit.game,hit.player,ref.market||marketsFor(hit.player)[0]);backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal();});
}
function refFromTarget(target){
 const row=target.closest?.('.hk-slate-player');if(row)return {id:row.dataset.hkPlayer,gameId:row.dataset.hkGame};
 const card=target.closest?.('.hk-prop-card');if(card){const name=card.querySelector('.hk-prop-name b')?.textContent?.trim(),team=(card.querySelector('.hk-prop-name span')?.textContent||'').split('·')[0].trim();return {name,team,market:document.querySelector('#hk-market')?.value||null};}
 return null;
}
function onClick(e){const ref=refFromTarget(e.target);if(!ref)return;e.preventDefault();e.stopPropagation();openModal(ref);}
function onKey(e){if(e.key==='Escape'&&activeBackdrop)closeModal();}
export function installNhlPlayerModalV907(host=document.getElementById('nhlView')){
 ensureStyle();hostRef=host;if(!host||installed)return;installed=true;host.addEventListener('click',onClick,true);document.addEventListener('keydown',onKey);loadDocs().catch(()=>{});
}
export const __NHL_PLAYER_MODAL_TEST__={contextFor,bucketDistribution,fairProbability,marketsFor};
