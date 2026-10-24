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
let current=null,currentError='',pending=false,currentArchive=null;
function box(key,value,description){
 return '<div><small>'+esc(key)+'</small><b>'+esc(value)+'</b><span>'+esc(description||'')+'</span></div>';
}
function tableCell(value){return '<td>'+esc(value)+'</td>'}
function detailItem(label,value){return '<div><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>'}
function archiveSummary(a){
 if(!a?.available)return '<section class="nfl-validation-archive"><h3>Scheduled pregame archive</h3><p>'+esc(a?.reason||'Waiting for archive status')+'</p></section>';
 const last=a.lastRun||{};
 return '<section class="nfl-validation-archive"><h3>Scheduled NFL pregame archive · append-only</h3>'
  +'<div class="nfl-validation-archive-metrics">'
  +box('SAVED PREDICTION SNAPSHOTS',a.snapshotCount??0,'Immutable pre-kickoff captures')
  +box('DISTINCT GAMES',a.gameCount??0,'Unique ESPN event IDs')
  +box('SETTLED OUTCOMES',a.outcomeCount??0,'Separate from prediction history')
  +box('MOST RECENT CAPTURE',a.latestCapture?asof(a.latestCapture):'None','Stored source-time snapshots')
  +box('2026 SHADOW FORECASTS',a.shadowForecasts?.snapshots??0,'Ungraded · independent pre-kickoff captures')
  +box('2026 SHADOW GAMES',a.shadowForecasts?.games??0,'No retrospective probabilities')
  +'</div><p class="nba-footnote">Latest capture run: '+esc(last.status||'Awaiting first run')
  +' · '+esc(last.completed_at?asof(last.completed_at):'Not run yet')
  +' · newly saved '+esc(last.inserted_predictions??0)
  +(last.reason?' · '+esc(last.reason):'')+'</p>'
  +'<p class="nba-footnote">Captured predictions are not calibrated or settled results. An unchanged quote/source remains one immutable snapshot; later updates create new records.</p>'
  +'<p class="nba-footnote">The 2026 experimental shadow is archived separately from bookmaker and 50K forecasts. '+esc(a.shadowForecasts?.caveat||'Calibration requires future verified postgame outcomes; there is no independently validated 2026 shadow accuracy score.')+'</p>'
  +slateReadinessSummary(a.slateReadiness)+feedHealthSummary(a.feedHealth)+settlementSummary(a.settlement)+actionSummary(a.sportsbookAction)+reconciliationSummary(a.reconciliation)+'</section>';
}
function slateReadinessSummary(readiness){
 const r=readiness||{},games=r.games||[];
 const statusName={
  READY_FOR_CAPTURE:'Full archived-slate capture coverage',
  PARTIAL_COVERAGE:'Partial sportsbook / model coverage',
  CHECK_DELAYED:'Source monitoring delayed',
  SOURCE_UNAVAILABLE:'Verified sportsbook source unavailable',
  NO_UPCOMING_ARCHIVED_GAMES:'No upcoming archived games'
 }[r.status]||'Awaiting first readiness check';
 let out='<div class="nfl-validation-section"><h3>NFL pregame capture readiness</h3>'
  +'<p>Requires a current sportsbook source and source-fresh exact model matches in <b>both</b> NFL model families for each upcoming game already in the prediction archive. Does not claim betting accuracy, every available player prop, or full NFL schedule completeness.</p>'
  +'<div class="nfl-detail-grid">'
  +detailItem('CAPTURE READINESS',statusName)
  +detailItem('SOURCE + MODEL GAME COVERAGE',(r.readyGames??0)+' / '+(r.expectedGames??0))
  +detailItem('LATEST SOURCE MATCHES',(r.sourceMatchedGames??0)+' / '+(r.expectedGames??0))
  +detailItem('LAST ODDS SOURCE CHECK',r.latestSourceCheck?asof(r.latestSourceCheck):'Not yet checked')
  +'</div>';
 if(games.length){
  out+='<div class="nba-table-scroll"><table class="nba-table nfl-validation-table">'
   +'<thead><tr><th>ESPN GAME</th><th>KICKOFF</th><th>CAPTURE COVERAGE</th><th>QUOTE AGE</th><th>BOOKS</th><th>MARKETS</th><th>EXPLANATION</th></tr></thead><tbody>'
   +games.slice(0,25).map(g=>'<tr>'+tableCell(g.gameId)
    +tableCell(asof(g.kickoff))
    +tableCell(g.eligible?'SOURCE-FRESH':'NEEDS ATTENTION')
    +tableCell(g.quotesAgeMinutes===null?'—':g.quotesAgeMinutes+' / '+g.maxAgeMinutes+' min')
    +tableCell(g.sportsbooks??0)+tableCell(g.markets??0)
    +tableCell(g.reason||'—')+'</tr>').join('')
   +'</tbody></table></div>';
 }
 return out+'<p class="nba-footnote">'+esc(r.note||'Waiting for verified NFL pregame coverage.')+'</p></div>';
}
function feedHealthSummary(health){
 const latest=health?.latest||{},history=health?.history||[],states=health?.recentStates||[];
 const statusLabel=(x,rejected=0)=>x==='fresh'&&Number(rejected)>0?'Partial · games age-gated':({fresh:'At least one quote verified',stale:'Snapshot stale',unavailable:'Source failed',invalid:'Invalid snapshot',no_matching_games:'No verified games',no_model_matches:'No exact model matches'})[x]||'Not checked';
 const recent=states.map(x=>(x.status||'unknown')+': '+(x.checks??0)).join(' · ');
 let body='<div class="nfl-validation-section"><h3>Pregame sportsbook source health</h3>'
  +'<p>This shows whether the upstream published ParlayAPI NFL odds meet TSO’s kickoff-specific freshness requirements. A scheduled capture may succeed while inserting zero unchanged predictions.</p>'
  +'<div class="nfl-detail-grid">'
  +detailItem('SOURCE CHECK',latest.checked_at?asof(latest.checked_at):'Awaiting first check')
  +detailItem('CURRENT SOURCE STATUS',statusLabel(latest.status,latest.games_rejected_for_age))
  +detailItem('ORIGINAL QUOTE TIMESTAMP',latest.source_snapshot_at?asof(latest.source_snapshot_at):'Unavailable')
  +detailItem('QUOTES AGE',num(latest.source_age_minutes)===null?'Unknown':Math.round(Number(latest.source_age_minutes))+' min')
  +detailItem('FRESH VERIFIED QUOTES',latest.eligible_quote_rows??0)
  +detailItem('FRESH OFFICIAL GAMES',latest.verified_games??0)
  +detailItem('GAMES REJECTED FOR AGE',latest.games_rejected_for_age??0)
  +detailItem('RECENT 12 CHECKS',recent||'No checks yet')
  +'</div>';
 if(latest.reason)body+='<p class="nba-footnote">Most recent source check: '+esc(latest.reason)+'</p>';
 if(history.length){
  body+='<div class="nba-table-scroll"><table class="nba-table nfl-validation-table">'
   +'<thead><tr><th>CHECKED</th><th>RESULT</th><th>QUOTE AGE</th><th>VALID QUOTES</th><th>REASON</th></tr></thead><tbody>'
   +history.map(x=>'<tr>'+tableCell(asof(x.checked_at))+tableCell(statusLabel(x.status,x.games_rejected_for_age))
    +tableCell(num(x.source_age_minutes)===null?'—':Math.round(Number(x.source_age_minutes))+' min')
    +tableCell(x.eligible_quote_rows??0)+tableCell(x.reason||'—')+'</tr>').join('')
   +'</tbody></table></div>';
 }
 return body+'<p class="nba-footnote">'+esc(health?.note||'Source diagnostic history will appear after the next scheduled run.')
  +' This monitor is read-only; it never creates odds or changes the upstream provider schedule.</p></div>';
}
function settlementSummary(settlement){
 const recent=settlement?.lastRun||{},metrics=settlement?.byMarket||[],atd=settlement?.atdCoverage||{};
 let body='<div class="nfl-validation-section"><h3>Postgame settlement · verified final box scores</h3>'
  +'<p>Games are graded only after a confirmed final ESPN NFL box score. Missing or unmatched players stay unresolved, never automatic losses. Results are append-only.</p>'
  +'<div class="nfl-detail-grid">'
  +detailItem('LAST SETTLEMENT CHECK',recent.completed_at?asof(recent.completed_at):'Not run yet')
  +detailItem('JOB STATUS',recent.status||'Awaiting first run')
  +detailItem('NEWLY GRADED',recent.inserted_outcomes??0)
  +detailItem('UNRESOLVED',recent.unresolved_predictions??0)
  +detailItem('NON-DUPLICATED GRADED SELECTIONS',settlement?.independentlyCounted??0)
  +detailItem('MODEL READINESS','INSUFFICIENT DATA')
  +'</div>'
  +'<h4>Anytime touchdown · complete scoring evidence</h4>'
  +'<div class="nfl-detail-grid">'
  +detailItem('ARCHIVED ATD SELECTIONS',atd.total??0)
  +detailItem('VERIFIED ATD WINS',atd.wins??0)
  +detailItem('VERIFIED ATD LOSSES',atd.losses??0)
  +detailItem('NOT COMPREHENSIVELY VERIFIED',Math.max(0,Number(atd.total||0)-Number(atd.wins||0)-Number(atd.losses||0)))
  +detailItem('GAMES WITH VERIFIED SCORING',atd.verified_games??0)
  +detailItem('ATD CALIBRATION',Number(atd.verified_games||0)<10?'COLLECTING GAMES':'REVIEW REQUIRED')
  +'</div>'
  +'<p class="nba-footnote">A non-scorer counts as a verified loss only when the final scoring plays reconcile to the scoreboard and player TD statistics. Unknown or ambiguous scoring plays are excluded, not forced into the loss column. Verified individual winners from incomplete games are tracked outside these completeness totals.</p>';
 if(metrics.length){
  const rows=metrics.map(m=>'<tr>'+tableCell(m.model_kind)
   +tableCell(m.market)+tableCell(m.observations)
   +tableCell(m.games)+tableCell(pct(m.mean_probability))
   +tableCell(pct(m.hit_rate))+tableCell(fixed(m.brier,5))+'</tr>').join('');
  body+='<div class="nba-table-scroll"><table class="nba-table nfl-validation-table">'
   +'<thead><tr><th>MODEL</th><th>MARKET</th><th>SELECTIONS</th><th>GAMES</th>'
   +'<th>AVG FORECAST</th><th>ACTUAL HIT RATE</th><th>BRIER ↓</th></tr></thead>'
   +'<tbody>'+rows+'</tbody></table></div>';
 }else body+='<p class="nba-footnote">No final verified outcomes yet. The archive is collecting forward-looking predictions; calibration stays unavailable until actual games finish.</p>';
 return body+'<p class="nba-footnote">'+esc(settlement?.caveat||'One game or repeated same-game props cannot prove calibration or positive betting returns.')+'</p></div>';
}
function actionSummary(a){
 const states=a?.byState||[],books=a?.byBook||[];
 const count=key=>states.find(x=>x.action_state===key)?.observations??0;
 let body='<div class="nfl-validation-section"><h3>Sportsbook participation & void evidence</h3>'
  +'<p>Participation is confirmed from explicit final-game evidence. “Void evidence” means the player was explicitly marked inactive or did-not-play under a mapped sportsbook rule, not that the sportsbook paid or voided a ticket.</p>'
  +'<div class="nfl-detail-grid">'
  +detailItem('CONFIRMED PARTICIPATION',count('action_confirmed'))
  +detailItem('DNP / INACTIVE VOID EVIDENCE',count('void_evidence'))
  +detailItem('REQUIRES REVIEW',count('review_required'))
  +detailItem('RULE MAPPING','FANDUEL · DRAFTKINGS')
  +'</div>';
 if(books.length){
  body+='<div class="nba-table-scroll"><table class="nba-table nfl-validation-table">'
   +'<thead><tr><th>SPORTSBOOK</th><th>PARTICIPATION RESULT</th><th>OBSERVATIONS</th></tr></thead><tbody>'
   +books.slice(0,30).map(x=>'<tr>'+tableCell(x.sportsbook)+tableCell(String(x.action_state||'unknown').replaceAll('_',' '))+tableCell(x.observations??0)+'</tr>').join('')
   +'</tbody></table></div>';
 }
 return body+'<p class="nba-footnote">'+esc(a?.note||'Awaiting first completed games for sportsbook action evidence.')
  +' No automatic void is assigned from a missing player alone. Rules vary by book, state and market.</p></div>';
}
function reconciliationSummary(reconciliation){
 const run=reconciliation?.lastRun||{},audit=reconciliation?.coverage||{},reasons=reconciliation?.unresolvedReasons||[];
 let body='<div class="nfl-validation-section"><h3>Official result reconciliation</h3>'
  +'<p>Rechecks previously finalized ESPN box scores, tracks missing player statistics and records distinct result revisions without overwriting the pregame model or first postgame grade.</p>'
  +'<div class="nfl-detail-grid">'
  +detailItem('LAST RECHECK',run.completed_at?asof(run.completed_at):'Pending')
  +detailItem('RECHECK STATUS',run.status||'Awaiting first cron run')
  +detailItem('FINAL GAMES REVIEWED',audit.games??0)
  +detailItem('PREDICTIONS CHECKED',audit.reviewed??0)
  +detailItem('ALIGNED SETTLEMENTS',audit.aligned??0)
  +detailItem('STAT CONFLICTS',audit.conflicts??0)
  +detailItem('MISSING / UNVERIFIABLE',audit.unresolved??0)
  +detailItem('NEW RESULT OBSERVATIONS',run.new_observations??0)
  +'</div>';
 if(reasons.length){
  body+='<div class="nba-table-scroll"><table class="nba-table nfl-validation-table"><thead>'
   +'<tr><th>FINAL RESULT COVERAGE</th><th>ROWS</th></tr></thead><tbody>'
   +reasons.map(x=>'<tr>'+tableCell(String(x.reason||'unknown').replaceAll('_',' '))+tableCell(x.observations??0)+'</tr>').join('')
   +'</tbody></table></div>';
 }
 body+='<p class="nba-footnote">'+esc(reconciliation?.note||'No official postgame audit recorded yet.')+'</p>'
  +'<p class="nba-footnote">The first real grading/reconciliation test requires completed archived games. Anytime TD losses stay unresolved if the complete scoring log cannot be independently reconciled with the same-provider final box score; do not claim calibration from incomplete or one-week samples.</p></div>';
 return body;
}
function render(data,error='',loading=false,archive=null){
 current=data;currentError=error;pending=loading;currentArchive=archive;
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
  ['currentExactOver','Live exact-line prop Over',String(archive?.snapshotCount??0)+' archived forecasts · '+String(archive?.outcomeCount??0)+' graded']
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
   +archiveSummary(archive)
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
 if(slot)slot.innerHTML=render(current,currentError,pending,currentArchive);
}
function click(e){
 const tab=e.target.closest?.('[data-nfl-validation-scope]');
 if(tab){state.scope=tab.dataset.nflValidationScope;refresh();return true}
 if(e.target.closest?.('[data-nfl-validation-method]')){state.showMethod=!state.showMethod;refresh();return true}
 return false;
}
window.TSO3NflValidation={render,click,refresh,state};
})();