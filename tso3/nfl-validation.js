/* NFL Model Validation: published audit evidence, not live-model calibration. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v===null||v===undefined||!Number.isFinite(Number(v))?null:Number(v);
const fixed=(v,d=2)=>num(v)===null?'—':Number(v).toFixed(d);
const pct=(v,d=1)=>num(v)===null?'—':(Number(v)*100).toFixed(d)+'%';
const asof=v=>{const d=new Date(v||'');return Number.isNaN(d.getTime())?'Unavailable':
 d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT'};
const status={UNVALIDATED:'No independent backtest',INSUFFICIENT:'Insufficient sample',EXPERIMENTAL:'Experimental only'};
const titles={passYds:'Passing yards',rushYds:'Rushing yards',recYds:'Receiving yards',receptions:'Receptions'};
const state={scope:'all',showMethod:false};
let current=null,currentError='',pending=false;
function box(key,value,description){
 return '<div><small>'+esc(key)+'</small><b>'+esc(value)+'</b><span>'+esc(description||'')+'</span></div>';
}
function tableCell(value){return '<td>'+esc(value)+'</td>'}
function detailItem(label,value){return '<div><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>'}
function render(data,error='',loading=false){
 current=data;currentError=error;pending=loading;
 if(!data||data.available!==true)return '<section class="nba-lab nfl-lab nfl-validation"><div class="nba-intro"><div>'
  +'<span class="nba-eyebrow">NFL / RESEARCH QUALITY</span><h2>MODEL BACKTEST & VALIDATION</h2>'
  +'<p>Original archived results only, never a made-up predictive accuracy score.</p></div></div>'
  +'<p class="nfl-model-note">'+esc(loading?'Loading historical audit…':error||'No historical evidence available.')+'</p></section>';
 const td=data.firstTouchdown||{},sim=data.fiftyKReplay||{},pre=sim.pregame||{},gates=data.currentModelGates||{};
 const n=num(td.heldOutGames)||0,b=num(td.baseline?.multiclassBrier),v=num(td.raw?.multiclassBrier);
 const change=b!==null&&v!==null&&b>0?(b-v)/b:null;
 const models=[
  ['firstTd','First TD historical heuristic',String(n)+' held-out games'],
  ['current50k','50K game simulation',String(pre.games??0)+' historic completed game'],
  ['currentAtd','Live regressed Anytime TD','No model-version-controlled holdout'],
  ['currentExactOver','Live exact-line prop Over','No pregame line-outcome archive']
 ];
 const choices='<div class="nfl-validation-tabs">'
  +[['all','All audits'],...models.map(m=>[m[0],m[1]])].map(([key,label])=>
   '<button type="button" data-nfl-validation-scope="'+esc(key)+'" class="'+(state.scope===key?'active':'')+'">'+esc(label)+'</button>').join('')
  +'</div>';
 const indicators=models.filter(m=>state.scope==='all'||m[0]===state.scope).map(m=>{
  const item=gates[m[0]]||{};
  return '<div class="nfl-audit-card"><div><b>'+esc(m[1])+'</b><small>'+esc(m[2])+'</small></div>'
   +'<span class="nfl-audit-status">'+esc(status[item.status]||item.status||'Unvalidated')+'</span>'
   +'<p>'+esc(item.reason||'Insufficient evidence.')+'</p></div>';
 }).join('');
 let body='<section class="nba-lab nfl-lab nfl-validation"><div class="nba-intro"><div>'
  +'<span class="nba-eyebrow">THE SPORTS OUTPOST / NFL QUALITY ASSURANCE</span><h2>MODEL BACKTEST & VALIDATION</h2>'
  +'<p>Historical results against completed NFL games. No conflating First TD, Anytime TD, retrospective simulations, or current sportsbook lines.</p>'
  +'</div></div><div class="nba-depth-source">AUDITED SOURCES · FIRST TD '+esc(asof(td.publishedAt))
  +' · RETROSPECTIVE 50K REPLAY '+esc(sim.historicalPeriod||'—')+' · READ ONLY</div>'
  +'<p class="nfl-model-note"><b>Important:</b> these are different model experiments. Their combined sample does not constitute a live TSO model accuracy grade or a profitable betting system.</p>'
  +'<div class="nfl-validation-stats">'
  +box('HISTORICAL FIRST TD HOLDOUT',n,'Independent completed games')
  +box('HISTORICAL HEURISTIC BRIER',fixed(v,5),'Multiclass, lower is better')
  +box('FIRST TD BASELINE BRIER',fixed(b,5),'On the same 126-game holdout')
  +box('50K REPLAY GAMES',sim.scoredGames??'—','One game cannot establish calibration')
  +'</div><div class="nfl-validation-toolbar"><span>MODEL EVIDENCE</span>'+choices+'</div>'
  +'<div class="nfl-audit-grid">'+indicators+'</div>';
 if(state.scope==='all'||state.scope==='firstTd'){
  body+='<section class="nfl-validation-section"><h3>Historical First-TD model · held-out testing</h3>'
   +'<p>Original first-scoring-player heuristic using chronological nflverse outcomes; <b>not</b> TSO’s current Anytime TD model.</p>'
   +'<div class="nfl-detail-grid">'
   +detailItem('2025 HELD OUT',(td.heldOut2025Games??'—')+' games')
   +detailItem('2026 HELD OUT',(td.heldOut2026Games??'—')+' games')
   +detailItem('MODEL LOG LOSS',fixed(td.raw?.logLoss,5))
   +detailItem('BASELINE LOG LOSS',fixed(td.baseline?.logLoss,5))
   +detailItem('BRIER REDUCTION VS BASELINE',pct(change,2))
   +detailItem('CALIBRATION FOR LIVE','NOT APPROVED')
   +'</div><p class="nfl-context-note">The archived experiment selected a probability-mass multiplier of '
   +esc(fixed(td.selectedScale,2))+', but explicitly states eligibleForLive = false. The 126-game holdout'
   +' is credible historical evidence for that specific heuristic, not proof of profitable current NFL props.</p>'
   +'<p class="nba-footnote">'+esc(td.interpretation||'Experimental, not calibrated.')+'</p></section>';
 }
 if(state.scope==='all'||state.scope==='current50k'){
  const stats=Object.entries(titles).map(([market,label])=>{
   const m=pre.metrics?.[market]||{};
   return '<tr>'+tableCell(label)+tableCell(m.observations??'—')+tableCell(fixed(m.mae))
    +tableCell(fixed(m.rmse))+tableCell(fixed(m.bias))
    +tableCell(pct(m.interval80Coverage))+'</tr>';
  }).join('');
  body+='<section class="nfl-validation-section"><h3>50K historical replay · pregame results</h3>'
   +'<p>The existing TSO simulator was replayed retrospectively using archived inputs. It scored just one'
   +' completed NFL game. This is not an evaluation of the exact model version that originally went live.</p>'
   +'<div class="nfl-detail-grid">'
   +detailItem('COMPLETED GAMES',pre.games??'—')
   +detailItem('PREGAME FORECASTS',pre.forecasts??'—')
   +detailItem('ATD PLAYER OBSERVATIONS',pre.atd?.observations??'—')
   +detailItem('ATD BRIER · ONE GAME',fixed(pre.atd?.brier,4))
   +detailItem('GAME WINNER OBSERVATIONS',pre.winner?.observations??'—')
   +detailItem('GENERAL CALIBRATION','INSUFFICIENT')
   +'</div><div class="nba-table-scroll"><table class="nba-table nfl-validation-table">'
   +'<thead><tr><th>PLAYER STAT</th><th>OBS</th><th>MAE</th><th>RMSE</th><th>BIAS</th><th>80% INTERVAL COVERAGE</th></tr></thead><tbody>'
   +stats+'</tbody></table></div><p class="nba-footnote">'
   +'MAE = average absolute error; RMSE emphasizes big misses; bias = model minus actual.'
   +' Intervals use estimated 10th–90th percentiles. Observations share one game and are not independent.'
   +' The live-Q3 replay is excluded from pregame metrics to avoid look-ahead.</p>'
   +'<p class="nfl-context-note">A Brier score from seven player TD outcomes in one game cannot'
   +' establish the accuracy of a 2026 season-long Anytime TD model. No winning percentage or betting return has been computed.</p>'
   +'</section>';
 }
 body+='<section class="nfl-validation-section"><h3>Requirements before promoting a calibrated NFL model</h3>'
 +'<div class="nfl-validation-checks">'+[
  ['Archive before kickoff','Store immutable timestamps, model version, game/player, book, market, side, exact line and probability.'],
  ['Match official final results','Join by player identity and game ID. Distinguish no-play, void, push, and missing observations.'],
  ['Use chronological held-out evaluation','Never train on later results or re-label a new model’s predictions as archived forecasts.'],
  ['Measure reliability and uncertainty','Compute game-clustered samples, Brier, log loss, calibration bins, baselines and drift by market.'],
  ['Require enough independent games','Do not tune or publish calibrated labels from one replayed game or correlated same-game player props.']
  ].map(([name,description],i)=>'<div><b><span>'+esc(i+1)+'</span>'+esc(name)+'</b><p>'+esc(description)+'</p></div>').join('')
 +'</div><button type="button" data-nfl-validation-method class="nfl-validation-method">'
 +(state.showMethod?'Hide':'Show')+' evidence limitations</button>';
 if(state.showMethod)body+='<div class="nfl-context-note"><p>First TD held-out partitions: '
  +esc((td.holdoutPartitions||[]).join('; '))+'</p>'
  +'<p>50K replay game: '+esc(sim.gameId||'—')+'; '+esc(sim.selection||'earliest archived phase')+'</p>'
  +'<p>Replay limitations:</p><ul>'+(sim.limitations||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'
  +'<p>First TD caveats:</p><ul>'+(td.caveats||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>';
 return body+'</section></section>';
}
function refresh(){
 const slot=document.getElementById('nflValidationSlot');
 if(slot)slot.innerHTML=render(current,currentError,pending);
}
function click(e){
 const tab=e.target.closest?.('[data-nfl-validation-scope]');
 if(tab){state.scope=tab.dataset.nflValidationScope;refresh();return true}
 if(e.target.closest?.('[data-nfl-validation-method]')){state.showMethod=!state.showMethod;refresh();return true}
 return false;
}
window.TSO3NflValidation={render,click,refresh,state};
})();