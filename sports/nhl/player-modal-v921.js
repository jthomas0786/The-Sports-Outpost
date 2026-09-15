import {installNhlPlayerModalV918} from './player-modal-v918.js?v=90.18';
import {buildNhlPlayerContext} from './player-modal-v911.js?v=90.11';
import {historicalPropProjection,historicalSourceLabel,propLine,marketStatKey} from './props-model.js?v=90.1';
import {gradeForLean,gradeRingHTML,overProbability} from './grade.js?v=90.4';
import {quoteFor} from './odds.js?v=90.1';

let installed=false,observer=null,queued=false,docsPromise=null,loadedAt=0,docs=null;
const META={
 atg:{label:'Anytime Goal',unit:'G'},
 sog:{label:'Shots on Goal',unit:'SOG'},
 points:{label:'Points',unit:'PTS'},
 assists:{label:'Assists',unit:'AST'},
 blocks:{label:'Blocked Shots',unit:'BLK'},
 saves:{label:'Goalie Saves',unit:'SV'},
};
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,d=2)=>v==null?'—':Number(v).toFixed(d);
const pct=v=>v==null?'—':`${(Number(v)*100).toFixed(Number(v)<.1?1:0)}%`;
const headline=g=>String(g).startsWith('A+')?'ELITE SETUP':String(g).startsWith('A')?'STRONG SPOT':String(g).startsWith('B')?'PLAYABLE LOOK':String(g).startsWith('C')?'OK MATCHUP':'AWAITING SIGNAL';

async function getJSON(path){const r=await fetch(`${path}?v=90.21-${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${path} ${r.status}`);return r.json();}
async function loadDocs(force=false){
 if(!force&&docs&&Date.now()-loadedAt<30000)return docs;
 if(docsPromise)return docsPromise;
 docsPromise=Promise.all([
  getJSON('./slates/nhl.json'),
  getJSON('./slates/nhl-research.json').catch(()=>null),
  getJSON('./slates/nhl-sim.json').catch(()=>null),
  getJSON('./slates/nhl-odds.json').catch(()=>null),
 ]).then(([slate,research,sim,odds])=>{docs={slate,research,sim,odds};loadedAt=Date.now();return docs;}).finally(()=>docsPromise=null);
 return docsPromise;
}
function cleanPlayerName(card){
 const h=card.querySelector('.who h2');if(!h)return '';
 const c=h.cloneNode(true);c.querySelectorAll('span').forEach(x=>x.remove());return c.textContent.trim();
}
function subParts(card){
 const parts=String(card.querySelector('.who .sub')?.textContent||'').split('·').map(x=>x.trim()).filter(Boolean);
 return {opponent:String(parts.find(x=>/^vs\s+/i.test(x))||'').replace(/^vs\s+/i,'').trim(),team:parts.at(-1)||''};
}
function selectedMarket(card){return card.querySelector('#tsoNhlPropSelect')?.value||'atg';}
function liveProbabilityAlreadyShown(card){
 if(card.dataset.nhlHistoricalFallbackV921==='1')return false;
 const raw=String(card.querySelector('.tso-nhl-verdict .hk-grade-ring .sgr-pv')?.textContent||'').trim();
 return /\d/.test(raw);
}
function resolveGamePlayer(card,slate){
 const name=cleanPlayerName(card),{team,opponent}=subParts(card);
 for(const game of slate?.games||[]){
  const teams=[String(game.away?.abbr||''),String(game.home?.abbr||'')];
  if(team&&!teams.includes(team))continue;
  if(opponent&&!teams.includes(opponent))continue;
  const player=(game.players||[]).find(p=>String(p.name||'').toLowerCase()===name.toLowerCase()&&(!team||String(p.team||'').toUpperCase()===team.toUpperCase()));
  if(player)return {game,player};
 }
 return null;
}
export function historicalModalFallback(history,market,currentSeason,quote=null){
 const model=historicalPropProjection(history,market,currentSeason);if(!model)return null;
 const picked=propLine(market,quote),probability=overProbability(model.metric,picked.line);if(probability==null)return null;
 return {metric:model.metric,model,line:picked.line,referenceLine:picked.reference,probability,grade:gradeForLean(probability),source:'historical',sourceLabel:historicalSourceLabel(model)};
}
function projectionFor({game,player,research,sim,odds,market}){
 const quote=quoteFor(odds,game.id,player.id,market);
 const current=buildNhlPlayerContext({game,player,researchDoc:research,simDoc:sim,oddsDoc:odds,market});
 const picked=propLine(market,quote);
 if(current.metric){
  const probability=overProbability(current.metric,picked.line);
  if(probability!=null)return {metric:current.metric,line:picked.line,referenceLine:picked.reference,probability,grade:gradeForLean(probability),source:'simulation',sourceLabel:current.sg?.iterations?`${Number(current.sg.iterations).toLocaleString()} confirmed sims`:'Confirmed simulation',current,quote};
 }
 const fallback=historicalModalFallback(research?.players?.[String(player.id)],market,research?.currentSeason,quote);
 return fallback?{...fallback,current,quote}:null;
}
function historyRows(history){return (history?.recentGames||[]).filter(r=>r?.stats&&Number.isFinite(Date.parse(r.date||''))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));}
function hitRate(rows,key,line){if(line==null||!rows.length)return null;const vals=rows.map(r=>n(r.stats?.[key])).filter(v=>v!=null);return vals.length?vals.filter(v=>v>line).length/vals.length:null;}
function setText(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value);}
function setMetric(card,label,value,newLabel=null){
 for(const m of card.querySelectorAll('.metrics .m')){
  const l=m.querySelector('.l');if(String(l?.textContent||'').trim().toUpperCase()!==label.toUpperCase())continue;
  setText(m.querySelector('.v'),value);if(newLabel)setText(l,newLabel);return;
 }
}
function updateWhy(card,state,marketLabel){
 const why=[...card.querySelectorAll('.sec')].find(sec=>String(sec.querySelector('.sec-h h3')?.textContent||'').trim()==='Why');if(!why)return;
 const pgring=why.querySelector('.pgring');if(pgring)pgring.innerHTML=gradeRingHTML(state.probability,state.grade,'md');
 setText(why.querySelector('.phead .pct'),pct(state.probability));
 setText(why.querySelector('.phead .sub'),`${marketLabel} · ${state.source==='simulation'?'confirmed simulation':'verified historical fallback'}`);
 for(const row of why.querySelectorAll('.fac-row')){
  const label=String(row.querySelector('.fac-label')?.textContent||'').trim();
  const detail=row.querySelector('.fac-detail');
  if(label==='Model Probability')setText(detail,`${pct(state.probability)} · ${state.grade} · ${state.source==='simulation'?'simulation':'historical fallback'}`);
  if(label==='Sportsbook'&&!state.quote)setText(detail,`Current quote pending · TSO reference ${fmt(state.line,1)}`);
 }
 setText(why.querySelector('.fac-foot'),state.source==='simulation'?'Confirmed current-game simulation is driving this probability.':'Current-game simulation remains gated until lineup/goalie checks pass; verified historical fallback is shown in the meantime.');
}
function updateFactors(card,state,history,market){
 const key=marketStatKey(market),baseline=n(history?.rates?.[key]),mean=n(state.metric?.mean),rows=historyRows(history),l10=hitRate(rows.slice(0,10),key,state.line);
 const factors=card.querySelectorAll('.eng-grid .eng');
 if(factors[0])setText(factors[0].querySelector('.v'),mean!=null&&baseline!=null?`${mean-baseline>=0?'+':''}${fmt(mean-baseline)}`:'—');
 if(factors[1]){
  setText(factors[1].querySelector('.v'),mean!=null&&state.line!=null?`${mean-state.line>=0?'+':''}${fmt(mean-state.line)}`:'—');
  if(state.referenceLine){setText(factors[1].querySelector('.t'),'Model vs Reference');setText(factors[1].querySelector('.d'),'Projection compared with the TSO reference threshold; sportsbook line pending.');}
 }
 if(factors[3]&&l10!=null){setText(factors[3].querySelector('.v'),`${Math.round(l10*100)}%`);if(state.referenceLine){setText(factors[3].querySelector('.t'),'L10 vs Reference');setText(factors[3].querySelector('.d'),'Verified games clearing the TSO reference threshold; sportsbook line pending.');}}
 const blurb=card.querySelector('.eng-grid + .blurb');
 if(blurb)setText(blurb,`${state.source==='simulation'?'Confirmed TSO simulation':'Verified historical fallback'} · ${pct(state.probability)} probability · ${state.grade} grade${state.referenceLine?` · TSO reference ${fmt(state.line,1)} while sportsbook line is pending`:''}.`);
 setMetric(card,'TSO MEAN',fmt(mean));
 setMetric(card,'MEDIAN',fmt(state.metric?.median));
 if(state.referenceLine){setMetric(card,'LINE',fmt(state.line,1),'TSO REF');if(l10!=null)setMetric(card,'L10 HIT',`${Math.round(l10*100)}%`);}
 const relevant=card.querySelector('.tso-nfl-split.relevant');if(relevant){const spans=relevant.querySelectorAll('span');const read=spans[spans.length-1];if(read)setText(read,state.probability>=.55?'PLUS':state.probability<.47?'MINUS':'EVEN');}
}
function updateVerdict(card,state,marketLabel){
 const verdict=card.querySelector('.tso-nhl-verdict');if(!verdict)return;
 const ringHost=verdict.firstElementChild;if(ringHost)ringHost.innerHTML=gradeRingHTML(state.probability,state.grade,'lg');
 setText(verdict.querySelector('h3'),headline(state.grade));
 const source=state.source==='simulation'?state.sourceLabel:state.sourceLabel;
 const lineCopy=state.referenceLine?`TSO reference ${fmt(state.line,1)}; sportsbook line pending`:`book line ${fmt(state.line,1)}`;
 setText(verdict.querySelector('.vd-body,.tso-nhl-verdict p'),`${pct(state.probability)} ${state.source==='simulation'?'simulation':'historical fallback'} probability · ${state.grade} grade · ${source} · ${lineCopy}.`);
 const row=verdict.querySelector('.vd-honesty-row');
 if(row){setText(row.querySelector('.pv-interval'),`${marketLabel} · ${state.referenceLine?'TSO ref':'line'} ${fmt(state.line,1)}`);setText(row.querySelector('.pv-pa-note'),state.source==='simulation'?'Confirmed simulation':'Historical fallback');setText(row.querySelector('.pv-cal-label'),state.source==='simulation'?'TSO MODEL':'VERIFIED BASELINE');}
}
async function enhance(card){
 if(!card||liveProbabilityAlreadyShown(card))return;
 const {slate,research,sim,odds}=await loadDocs().catch(()=>({}));if(!card.isConnected||!slate||!research)return;
 const pair=resolveGamePlayer(card,slate);if(!pair)return;
 const market=selectedMarket(card),meta=META[market]||META.atg,state=projectionFor({...pair,research,sim,odds,market});if(!state)return;
 const history=research.players?.[String(pair.player.id)]||null;
 card.dataset.nhlHistoricalFallbackV921='1';
 card.dataset.nhlProjectionSource=state.source;
 updateVerdict(card,state,meta.label);
 updateFactors(card,state,history,market);
 updateWhy(card,state,meta.label);
}
function scan(){queued=false;document.querySelectorAll('.tso-nhl-player-card-v911').forEach(card=>enhance(card));}
function queue(){if(queued)return;queued=true;requestAnimationFrame(scan);}
export function installNhlPlayerModalV921(host=document.getElementById('nhlView')){
 installNhlPlayerModalV918(host);
 if(installed){queue();return;}
 installed=true;
 observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1)))queue();});
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('change',e=>{if(e.target?.id==='tsoNhlPropSelect')setTimeout(queue,0);});
 queue();
}

export const __NHL_PLAYER_MODAL_V921_TEST__={historicalModalFallback,resolveGamePlayer,selectedMarket};
