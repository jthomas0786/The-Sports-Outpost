/* TSO 3.0 independent full player dashboard.
   Uses only verified ESPN player observations and already verified TSO odds.
   No third-party proprietary ratings are reproduced. */
(function(){
'use strict';
const trim=(v)=>String(v??'');
const esc=(v)=>trim(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(v)=>trim(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const valid=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const date=(v)=>{const d=Date.parse(v||'');return Number.isFinite(d)?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}):'—'};
const money=(v)=>{const n=valid(v);return n===null?'—':(n>0?'+':'')+n};
const mean=(v)=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
const round=(v,n=1)=>v===null?'—':Number(v).toFixed(n);
const model=(q)=>{const m=q?.model;if(!m||m.exactMatch!==true||m.lineMatch!==true)return null;
 const v=valid(m.probabilityPct);return v!==null&&v>=0&&v<=100?v:null;};
const tabs=[['overview','Overview'],['gamelogs','Game Logs'],['splits','Splits & Trends'],['odds','Odds & Alt Lines'],['matchup','Matchup & Advanced']];
function statList(doc){
 const map=new Map();
 for(const ev of doc?.events||[])for(const s of ev.stats||[]){
  if(!s?.name||valid(s.numeric)===null)continue;
  const item=map.get(s.name)||{key:s.name,label:String(s.label||s.name),count:0};
  item.count++;map.set(s.name,item);
 }
 return [...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}
function statRows(doc,metric){
 return (doc?.events||[]).flatMap(ev=>{
  const s=(ev.stats||[]).find(x=>x.name===metric);
  const numeric=s?valid(s.numeric):null;
  if(numeric===null)return [];
  const homeAway=['home','away'].includes(ev.homeAway)?ev.homeAway:null;
  return [{eventId:trim(ev.eventId),date:ev.date,opponent:trim(ev.opponent),opponentId:ev.opponentId||null,
   result:trim(ev.result),homeAway,seasonType:trim(ev.seasonType),value:numeric}];
 }).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
function categoryName(stat){return trim(stat).split(':').at(-1);}
function marketStatMatches(market,metric){
 const k=key(market),m=key(categoryName(metric));
 const maps={
  POINTS:['POINTS'],REBOUNDS:['REBOUNDS','TOTALREBOUNDS'],ASSISTS:['ASSISTS'],
  THREES:['THREEPOINTERSMADE','THREEPOINTFIELDGOALSMADE','THREES'],RECEPTIONS:['RECEPTIONS'],
  RECYDS:['RECEIVINGYARDS','RECYDS'],RUSHYDS:['RUSHINGYARDS','RUSHYDS'],
  PASSYDS:['PASSINGYARDS','PASSYDS'],PASSATTEMPTS:['PASSINGATTEMPTS'],
  COMPLETIONS:['COMPLETIONS'],SOG:['SHOTS','SHOTSONGOAL','SHOTSTOTAL'],
  HITS:['HITS'],HOMERUN:['HOMERUNS'],HOMERUNS:['HOMERUNS'],
  TOTALBASES:['TOTALBASES'],RBIS:['RBI'],RBI:['RBI'],RUNS:['RUNS'],
  STOLENBASES:['STOLENBASES'],PITCHERSTRIKEOUTS:['STRIKEOUTS','PITCHERSTRIKEOUTS'],
  ANYTIMEGOAL:['GOALS'],FIRSTGOAL:[],
  PRA:['POINTSREBOUNDSASSISTS'],PTSREB:['POINTSREBOUNDS'],
  POINTSREBOUNDS:['POINTSREBOUNDS'],POINTSASSISTS:['POINTSASSISTS'],
  REBOUNDSASSISTS:['REBOUNDSASSISTS'],RA:['REBOUNDSASSISTS'],
  HRRBI:['HITSRUNSRBIS'],HRR:['HITSRUNSRBIS'],
  PASSINGRUSHINGYARDS:['PASSINGRUSHINGYARDS'],
  ATD:['TOTALTOUCHDOWNS']
 };
 const named=Object.hasOwn(maps,k)?maps[k]:null;
 // Never infer a scoring-first or multi-stat category from a single unrelated log stat.
 const unsupported=['FIRSTGOAL','ATD'];
 if(unsupported.includes(k)&&!named)return false;
 return named?named.includes(m):k===m;
}
function matchedQuote(odds,metric){
 return odds.filter(q=>marketStatMatches(q.market,metric)&&valid(q.line)!==null)
  .sort((a,b)=>Date.parse(b.snapshotTime||'')-Date.parse(a.snapshotTime||''))[0]||null;
}
function choose(rows,ui){
 const parts=(ui.split||'all').toLowerCase(),opponent=key(ui.opponent||'');
 let selected=rows;
 if(parts==='home'||parts==='away')selected=selected.filter(x=>x.homeAway===parts);
 if(parts==='opponent'&&opponent)selected=selected.filter(x=>key(x.opponent)===opponent||key(x.opponentId)===opponent);
 const n={l5:5,l10:10,l20:20,season:1000}[ui.window]||10;
 return selected.slice(0,n);
}
function analysis(rows,line){
 const nums=rows.map(x=>x.value),total=nums.length;
 const n=mean(nums),sorted=nums.slice().sort((a,b)=>a-b);
 const median=total?(sorted[Math.floor((total-1)/2)]+sorted[Math.floor(total/2)])/2:null;
 const hits=line!==null?nums.filter(x=>x>line).length:null;
 let streak=0;
 if(line!==null&&total){for(const x of nums){if(x>line)streak++;else break;}}
 return {n:total,avg:n,median,min:total?Math.min(...nums):null,max:total?Math.max(...nums):null,
  hits,rate:total&&hits!==null?hits*100/total:null,streak:line!==null?streak:null};
}
function numberCards(label,view,line){
 const stats=analysis(view,line);
 const items=[
  ['Games verified',stats.n,'Observed games, not scheduled'],
  ['Average',round(stats.avg),'Only observed game values'],
  ['Median',round(stats.median),'Middle recorded performance'],
  ['Above line',stats.rate===null?'—':round(stats.rate,0)+'%',stats.hits===null?'No exact verified line':stats.hits+'/'+stats.n+' games'],
  ['Recent streak',stats.streak===null?'—':stats.streak,stats.streak===null?'Line unavailable':'Consecutive games above line'],
  ['High / Low',stats.n?round(stats.max)+' / '+round(stats.min):'—','Selected actual game sample']
 ];
 return '<div class="tso-pd-kpi-grid">'+items.map(([name,value,description])=>
  '<div class="tso-pd-kpi"><span>'+esc(name)+'</span><strong>'+esc(value)+'</strong><small>'+esc(description)+'</small></div>').join('')+'</div>';
}
function graph(rows,line,metric){
 const data=rows.slice(0,20).reverse();if(!data.length)
  return '<p class="page-note">No verified game statistics are available for this selection.</p>';
 const ceiling=Math.max(1,...data.map(x=>x.value),line??0);
 const linePct=line!==null&&line>=0?100*Math.min(1,line/ceiling):null;
 return '<div class="tso-pd-chart" role="img" aria-label="Actual game-by-game '+esc(categoryName(metric))+' values, oldest to newest">'
  +(linePct!==null?'<div class="tso-pd-target" style="bottom:'+linePct+'%"><span>Actual line '+esc(line)+'</span></div>':'')
  +data.map(x=>'<div class="tso-pd-column" title="'+esc(date(x.date)+' vs '+(x.opponent||'unknown')+': '+x.value)+'">'
   +'<span class="tso-pd-bar '+(line!==null?(x.value>line?'above':'below'):'neutral')+'" style="height:'+Math.max(2,100*Math.max(0,x.value)/ceiling)+'%"></span>'
   +'<small>'+esc(x.value)+'</small></div>').join('')
  +'</div><p class="nba-footnote">Bars are recorded results. An orange line is the selected actual sportsbook threshold. Missing events are excluded, not scored as zero.</p>';
}
function gameTable(rows,line,limit=42){
 if(!rows.length)return '<p class="page-note">No official completed-game observations for these filters.</p>';
 return '<div class="table-scroller"><table class="data-table tso-pd-table"><thead><tr>'
  +'<th>GAME DATE</th><th>OPPONENT</th><th>VENUE</th><th>RESULT</th><th>STAT</th><th>LINE RESULT</th></tr></thead><tbody>'
  +rows.slice(0,limit).map(r=>'<tr><td>'+esc(date(r.date))+'</td><td>'+esc(r.opponent||'—')+'</td>'
   +'<td>'+esc(r.homeAway?r.homeAway.toUpperCase():'Not available')+'</td>'
   +'<td>'+esc(r.result||'—')+'</td><td class="tso-pd-number">'+esc(r.value)+'</td>'
   +'<td>'+ (line===null?'<span class="tso-pd-neutral">No exact market</span>':
     '<span class="tso-pd-outcome '+(r.value>line?'positive':'negative')+'">'+(r.value>line?'OVER':'NOT OVER')+'</span>')+'</td></tr>').join('')
  +'</tbody></table></div>';
}
function marketRows(odds){
 const grouped=new Map();
 for(const q of odds){
  if(valid(q.price)===null||valid(q.line)===null||!q.market)continue;
  const k=[key(q.market),Number(q.line),key(q.side||'over')].join('|');
  const group=grouped.get(k)||[];group.push(q);grouped.set(k,group);
 }
 return [...grouped.values()].sort((a,b)=>trim(a[0].market).localeCompare(trim(b[0].market))||Number(a[0].line)-Number(b[0].line));
}
function linesPanel(odds,metric){
 const groups=marketRows(odds);
 if(!groups.length)return '<div class="tso-pd-pending">No currently verified sportsbook lines for this athlete. Player history remains available independently.</div>';
 return '<div class="table-scroller"><table class="data-table"><thead><tr><th>MARKET</th><th>EXACT LINE</th><th>BEST VERIFIED BOOK</th><th>PRICE</th><th>OTHER BOOKS</th><th>QUOTED AT</th><th>TSO MODEL</th></tr></thead><tbody>'
  +groups.slice(0,120).map(group=>{
   const sorted=group.slice().sort((a,b)=>Number(b.price)-Number(a.price)),best=sorted[0],prob=model(best);
   const rank=group.filter(q=>marketStatMatches(q.market,metric)).length?'tso-pd-relevant':'';
   return '<tr class="'+rank+'"><td>'+esc(best.marketLabel||best.market)+'</td><td>'+esc(best.line)+'</td>'
    +'<td>'+esc(best.book||'—')+'</td><td>'+esc(money(best.price))+'</td>'
    +'<td>'+esc(new Set(group.map(x=>x.book)).size)+'</td>'
    +'<td>'+esc(best.snapshotTime?date(best.snapshotTime):'Unverified')+'</td>'
    +'<td>'+esc(prob===null?'Not modeled':round(prob,1)+'%')+'</td></tr>';
  }).join('')+'</tbody></table></div>'
  +'<p class="nba-footnote">Prices are original observed Over/Yes quotes from TSO-verified sources. Comparison is line-specific; no price is synthesized. TSO model percentages are separate from observed rates.</p>';
}
function splitsPanel(all,metric,line,ui){
 const groups=[
  ['All games',all],['Home (verified only)',all.filter(x=>x.homeAway==='home')],
  ['Away (verified only)',all.filter(x=>x.homeAway==='away')]
 ];
 const opponents=new Map();
 for(const ev of all){const k=key(ev.opponent);if(!k)continue;let arr=opponents.get(k)||[];arr.push(ev);opponents.set(k,arr);}
 const byOpponent=[...opponents].sort((a,b)=>b[1].length-a[1].length);
 const rows=groups.concat(byOpponent.slice(0,15).map(([_,list])=>['vs '+list[0].opponent,list]));
 return '<div class="tso-pd-panel"><h3>Verified home / away / opponent splits</h3>'
  +'<p class="page-note">Home/away records appear only when ESPN supplies that designation. No unknown venue is assigned automatically.</p>'
  +'<div class="table-scroller"><table class="data-table"><thead><tr><th>SPLIT</th><th>GAMES</th><th>AVG</th><th>MEDIAN</th><th>ABOVE LINE</th><th>HIGH</th></tr></thead><tbody>'
  +rows.map(([name,values])=>{
   const a=analysis(values,line);
   return '<tr><td>'+esc(name)+'</td><td>'+a.n+'</td><td>'+round(a.avg)+'</td><td>'+round(a.median)+'</td>'
    +'<td>'+esc(a.rate===null?'—':round(a.rate,0)+'% ('+a.hits+'/'+a.n+')')+'</td><td>'+round(a.max)+'</td></tr>';
  }).join('')+'</tbody></table></div>'
  +'<h3>Recorded trend by sample</h3><div class="tso-pd-kpi-grid">'
  +[5,10,20,1000].map(n=>{const values=all.slice(0,n),a=analysis(values,line);
   return '<div class="tso-pd-kpi"><span>'+esc(n===1000?'Season observed':'Last '+n)+'</span><strong>'+round(a.avg)+'</strong>'
    +'<small>'+a.n+' games'+(a.rate!==null?' · '+round(a.rate,0)+'% above line':'')+'</small></div>';
  }).join('')+'</div></div>';
}
function officialSplitPanel(doc){
 const categories=Array.isArray(doc?.officialSplits)?doc.officialSplits:[];
 if(!categories.length)return '<section class="tso-pd-panel"><h3>Official ESPN full-season splits</h3>'
  +'<p class="page-note">ESPN has not supplied verified official split groups for this player and season. The observed-game splits above are separate calculations.</p></section>';
 const groups=categories.slice(0,20).map((category,index)=>
  '<details '+(index<2?'open':'')+'><summary>'+esc(category.name)+' · '+category.splits.length+' published splits</summary>'
  +(category.splits||[]).map(split=>'<div class="tso-pd-official-split"><h4>'
   +esc(split.name)+(split.abbreviation?' ('+esc(split.abbreviation)+')':'')+'</h4>'
   +'<div class="tso-pd-season-grid">'+(split.values||[]).map(v=>
    '<div><small>'+esc(v.label||v.name)+'</small><strong>'+esc(v.value)+'</strong></div>').join('')
   +'</div></div>').join('')+'</details>').join('');
 return '<section class="tso-pd-panel"><h3>Official ESPN full-season splits</h3>'
  +'<p>ESPN-authored statistical splits for this athlete and selected season. These are separate from the L5/L10/L20 game-log calculations; no unavailable denominator or percentage is inferred.</p>'
  +'<div class="tso-pd-season tso-pd-official-groups">'+groups+'</div></section>';
}
function seasonPanel(doc){
 const cats=doc?.seasonStats||[];
 if(!cats.length)return '<p class="page-note">Official season summary statistics unavailable for this athlete.</p>';
 return '<div class="tso-pd-season">'+cats.slice(0,15).map(c=>
  '<details open><summary>'+esc(c.category)+'</summary><div class="tso-pd-season-grid">'
   +(c.values||[]).slice(0,50).map(v=>'<div><small>'+esc(v.label||v.name)+'</small><strong>'+esc(v.value)+'</strong></div>').join('')
  +'</div></details>').join('')+'</div>';
}
function render(ctx){
 const {sport,player,doc,ui,odds=[],game=null}=ctx;
 const name=doc?.athleteName||player?.name||player?.player||'ESPN player';
 const stats=statList(doc),selected=stats.some(x=>x.key===ui.metric)?ui.metric:(stats[0]?.key||null);
 const observed=statRows(doc,selected);
 const hasKnownPhase=observed.some(x=>/regular|postseason|playoff/i.test(x.seasonType||''));
 const phase=['regular','postseason','all'].includes(ui.phase)?ui.phase:(hasKnownPhase?'regular':'all');
 const all=observed.filter(x=>phase==='all'||(phase==='regular'
  ?/regular/i.test(x.seasonType||''):/postseason|playoff/i.test(x.seasonType||'')));
 const possible=odds.filter(q=>marketStatMatches(q.market,selected));
 const defaultQuote=matchedQuote(possible,selected),lineRecord=possible.find(q=>
  [key(q.market),Number(q.line)].join(':')===ui.lineKey)||defaultQuote||null;
 const line=lineRecord?valid(lineRecord.line):null;
 const target=choose(all,ui),a=analysis(target,line),matches=marketRows(odds);
 const options=stats.map(v=>'<option value="'+esc(v.key)+'" '+(v.key===selected?'selected':'')+'>'+esc(v.label||v.key)+' ('+v.count+' games)</option>').join('');
 const split=[['all','All games'],['home','Home'],['away','Away'],['opponent','Specific opponent']];
 const opponentOptions=[...new Set(all.map(x=>x.opponent).filter(Boolean))].sort().map(name=>
  '<option value="'+esc(key(name))+'" '+(key(name)===key(ui.opponent)?'selected':'')+'>'+esc(name)+'</option>').join('');
 const bookOptions=possible.slice().sort((a,b)=>Number(a.line)-Number(b.line)).map(q=>[
  [key(q.market),Number(q.line)].join(':'),trim(q.marketLabel||q.market)+' '+q.line+' · '+trim(q.book)+' '+money(q.price)
 ]);
 const uniq=new Map(bookOptions.map(([k,label])=>[k,label]));
 const tabsHtml='<nav class="tso-pd-tabs" aria-label="Player dashboard sections">'+tabs.map(([id,label])=>
  '<button type="button" data-pd-tab="'+id+'" class="'+(ui.tab===id?'active':'')+'" aria-current="'+(ui.tab===id?'page':'false')+'">'+esc(label)+'</button>').join('')+'</nav>';
 const phaseOptions=[['regular','Regular season'],['postseason','Postseason'],['all','All recorded']];
 const control='<div class="tso-pd-toolbar"><label>Statistic<select data-pd-setting="metric">'+options+'</select></label>'
  +'<label>Game phase<select data-pd-setting="phase">'+phaseOptions.map(([k,v])=>
   '<option value="'+k+'" '+(phase===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'
  +'<label>Window<select data-pd-setting="window">'+[['l5','L5'],['l10','L10'],['l20','L20'],['season','Season']]
   .map(([k,v])=>'<option value="'+k+'" '+(ui.window===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'
  +'<label>Location<select data-pd-setting="split">'+split.map(([k,v])=>
   '<option value="'+k+'" '+(ui.split===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'
  +(ui.split==='opponent'?'<label>Opponent<select data-pd-setting="opponent"><option value="">Select opponent</option>'+opponentOptions+'</select></label>':'')
  +'<label>Published line<select data-pd-setting="lineKey"><option value="">'+(possible.length?'Most recent actual quote':'No verified line')+'</option>'
  +[...uniq].slice(0,60).map(([k,v])=>'<option value="'+esc(k)+'" '+(ui.lineKey===k?'selected':'')+'>'+esc(v)+'</option>').join('')
  +'</select></label></div>';
 const headshot=String(doc?.headshot||'');
 const safeHeadshot=/^https:\/\/(a\.espncdn\.com|cdn\.espn\.com)\//.test(headshot)
  ?'<img class="tso-pd-headshot" src="'+esc(headshot)+'" alt="'+esc(name)+' official ESPN player headshot" loading="lazy">':'';
 const head='<header class="tso-pd-hero">'+safeHeadshot+'<div><span class="eyebrow">'+esc(sport.toUpperCase())+' · TSO VERIFIED PLAYER INTELLIGENCE</span><h2>'+esc(name)+'</h2>'
  +'<p>'+esc(player?.team||doc?.athleteTeam||'Team not verified')+' · '+esc(player?.position||doc?.athletePosition||'Position unavailable')+' · ESPN Athlete #'+esc(doc?.athleteId||player?.playerId||'—')+'</p></div>'
  +'<div class="tso-pd-source"><strong>Official season '+esc(doc?.season||'—')+'</strong><small>'+esc(doc?.sourceIdentification||'Source verification pending')+'</small>'
  +'<small>ESPN observations / independent TSO odds & models</small></div></header>';
 let body='';
 switch(ui.tab){
 case 'gamelogs':
  body='<section class="tso-pd-panel"><h3>Every verified recorded game · '+esc(categoryName(selected||'Statistic'))+'</h3>'
  +'<p>Showing '+target.length+' games for the chosen window, location and opponent.</p>'+gameTable(target,line)+'</section>';
  break;
 case 'splits':
  body=splitsPanel(all,selected,line,ui)+officialSplitPanel(doc);
  break;
 case 'odds':
  body='<section class="tso-pd-panel"><h3>All active verified lines / sportsbooks</h3>'
   +'<p>Market '+esc(possible.length)+' current selections tied to this recorded statistic; '+matches.length+' distinct market/line groups for this player.</p>'
   +linesPanel(odds,selected)+'</section>';
  break;
 case 'matchup':
  body='<div class="tso-pd-two"><section class="tso-pd-panel"><h3>Matchup & availability</h3>'
   +(game?'<p><strong>'+esc(game.away?.name||game.away?.abbr)+' @ '+esc(game.home?.name||game.home?.abbr)+'</strong></p><p>Scheduled '+esc(date(game.startTime))+' · '+esc(game.state||'not verified')+'</p>':
    '<p class="page-note">No current game is verified for this selected athlete. Research is from recorded season history.</p>')
   +'<div class="tso-pd-kpi-grid"><div class="tso-pd-kpi"><span>Current injury/lineup</span><strong>Not verified</strong><small>Official roster membership does not imply availability</small></div>'
   +'<div class="tso-pd-kpi"><span>Opponent rank by position</span><strong>Not verified</strong><small>Sport-specific DvP source required</small></div></div>'
   +'<p class="nba-footnote">Do not infer coverage matchups, confirmed starters, park factors, weather or absence of injuries from a team roster.</p></section>'
   +'<section class="tso-pd-panel"><h3>TSO verified model evidence</h3>'
   +(odds.some(q=>model(q)!==null)?odds.filter(q=>model(q)!==null).slice(0,12).map(q=>
    '<div class="tso-pd-model-row"><strong>'+esc(q.marketLabel||q.market)+' '+esc(q.line)+'</strong><b>'+round(model(q),1)+'%</b>'
    +'<small>'+esc(q.model?.source||'TSO exact-line model')+'</small></div>').join(''):
    '<p class="page-note">No source-verified exact-line model forecast is available for this player and market.</p>')
   +'</section></div><section class="tso-pd-panel"><h3>Official season statistical categories</h3>'+seasonPanel(doc)+'</section>'+officialSplitPanel(doc);
  break;
 default:
  body='<section class="tso-pd-panel"><div class="tso-pd-panel-head"><div><h3>Observed performance · '+esc(categoryName(selected||'Statistic'))+'</h3>'
   +'<p>'+target.length+' matched, recorded games. '+(line===null?'No exact sportsbook line currently available.':'Compared only with actual '+esc(line)+' Over threshold.')+'</p></div>'
   +'<div class="tso-pd-big-rate">'+(a.rate===null?'—':round(a.rate,0)+'%')+'<small>Observed above line</small></div></div>'
   +numberCards('Observed',target,line)+graph(target,line,selected)+gameTable(target.slice(0,10),line,10)+'</section>'
   +'<div class="tso-pd-two"><section class="tso-pd-panel"><h3>Opponent / venue context</h3>'
   +'<p>Verified home/away and specific-opponent results are available in <strong>Splits & Trends</strong>. Unknown locations are excluded.</p>'
   +'<p class="page-note">Defensive rank and starter status require additional validated feeds.</p></section>'
   +'<section class="tso-pd-panel"><h3>Best currently observed sportsbook prices</h3>'
   +linesPanel(odds.slice(0,100),selected)+'</section></div>';
 }
 return '<div class="tso-player-dashboard">'+head+tabsHtml+control
  +(doc?.available||ui.tab==='odds'?body:
   '<p class="tso-pd-pending">Official athlete season data unavailable. '+esc(doc?.reason||'The provider returned no verifiable results.')+'</p>'
   +'<p class="page-note">If current sportsbook quotes exist, select Odds & Alt Lines; those quotes are not athlete game logs.</p>')
  +'<p class="tso-pd-disclaimer">Recorded game metrics use '+esc(phase==='all'?'all phase-labelled games':phase+' only')+
   '. A missing or unlabelled game is not assigned to regular season or playoffs. Full-season ESPN-authored split tables use their own published source period, separately from filtered L5/L10/L20. TSO sportsbook odds and model forecasts are independent sources.</p></div>';
}
window.TSO3PlayerDashboard={render,statList,statRows,analysis,choose,marketStatMatches};
})();
