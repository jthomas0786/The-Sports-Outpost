/* TSO v3 unified live statistics and full final box score.
 * All reported stats come from the same play events that drive the field.
 */
(function(global){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const num=v=>Number(v||0).toLocaleString();
 const table=(headers,rows)=>'<div class="tso-sim-stat-scroll"><table class="tso-sim-box-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
  (rows.length?rows.map(row=>'<tr>'+row.map((v,i)=>'<td'+(i?' class="tso-sim-statnum"':'')+'>'+esc(v)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'">No recorded attempts</td></tr>')+'</tbody></table></div>';
 const metric=(name,value)=>'<span><small>'+esc(name)+'</small><b>'+esc(value)+'</b></span>';
 const activePlayers=(game,snap,team)=>{
  const t=snap.players[team]||{};
  return Object.values(t).filter(p=>p.passAtt||p.carries||p.targets||p.sacks||p.int).sort((a,b)=>(b.passYds+b.recYds+b.rushYds)-(a.passYds+a.recYds+a.rushYds));
 };
 function live(game,snap,team){
  const stat=snap.teams[team],players=activePlayers(game,snap,team);
  const qbs=players.filter(p=>p.passAtt||p.sacks).sort((a,b)=>b.passAtt-a.passAtt);
  const rush=players.filter(p=>p.carries).sort((a,b)=>b.carries-a.carries).slice(0,4);
  const rec=players.filter(p=>p.targets).sort((a,b)=>b.targets-a.targets).slice(0,5);
  const rows=(values,format)=>values.map(p=>'<div class="tso-sim-live-line"><b>'+esc(p.name)+'</b><span>'+esc(format(p))+'</span></div>').join('')||'<div class="tso-sim-no-stats">No attempts yet</div>';
  return '<div class="tso-sim-side-name">'+esc(team)+' · LIVE SCENARIO</div>'
   +'<div class="tso-sim-live-totals">'+metric('TOTAL YDS',num(stat.totalYds))+metric('FIRST DOWNS',num(stat.firstDowns))+'</div>'
   +'<h4>PASSING</h4>'+rows(qbs,p=>p.passComp+'/'+p.passAtt+' · '+p.passYds+' YDS · '+p.passTd+' TD · '+p.int+' INT')
   +'<h4>RUSHING</h4>'+rows(rush,p=>p.carries+' CAR · '+p.rushYds+' YDS'+(p.rushTd?' · '+p.rushTd+' TD':''))
   +'<h4>RECEIVING</h4>'+rows(rec,p=>p.receptions+'/'+p.targets+' · '+p.recYds+' YDS'+(p.recTd?' · '+p.recTd+' TD':''));
 }
 function full(game,snapshot,events){
  const sides=[game.away.abbr,game.home.abbr];
  const final=events[events.length-1],fields=['Points','Total yards','Passing yards','Rushing yards','First downs','Pass comp/att',
   'Rush attempts','Turnovers','Sacks allowed','Punts','Made field goals'];
  const left=snapshot.teams[sides[0]],right=snapshot.teams[sides[1]];
  const values=t=>[t.points,t.totalYds,t.passing,t.rushing,t.firstDowns,t.passComp+'/'+t.passAtt,t.rushAtt,t.interceptions,t.sacksAllowed,t.punts,t.fieldGoals];
  const a=values(left),b=values(right);
  const statComparison=table(['TEAM STATS',sides[0],sides[1]],fields.map((f,i)=>[f,a[i],b[i]]));
  const quarters=table(['TEAM','Q1','Q2','Q3','Q4','FINAL'],[left,right].map(t=>[t.team,...t.quarter,t.points]));
  const boxTeam=team=>{
   const ps=activePlayers(game,snapshot,team);
   const pass=ps.filter(x=>x.passAtt||x.sacks).sort((a,b)=>b.passAtt-a.passAtt);
   const rush=ps.filter(x=>x.carries).sort((a,b)=>b.carries-a.carries);
   const rec=ps.filter(x=>x.targets).sort((a,b)=>b.targets-a.targets);
   return '<section class="tso-sim-full-team"><h4>'+esc(team)+' PLAYER BOX SCORE</h4><h5>Passing</h5>'
    +table(['PLAYER','CMP/ATT','YDS','TD','INT','SACK'],pass.map(p=>[p.name,p.passComp+'/'+p.passAtt,p.passYds,p.passTd,p.int,p.sacks]))
    +'<h5>Rushing</h5>'+table(['PLAYER','CAR','YDS','TD'],rush.map(p=>[p.name,p.carries,p.rushYds,p.rushTd]))
    +'<h5>Receiving</h5>'+table(['PLAYER','REC/TGT','YDS','TD'],rec.map(p=>[p.name,p.receptions+'/'+p.targets,p.recYds,p.recTd]))
    +'</section>';
  };
  return '<div class="tso-sim-final-heading"><span>ILLUSTRATIVE SCENARIO COMPLETE · NOT OFFICIAL STATS</span>'
   +'<h3>'+esc(game.away.abbr)+' '+left.points+' — '+right.points+' '+esc(game.home.abbr)+'</h3>'
   +'<small>Final box score derived solely from the animated play ledger. It is not the mean result from the 50,000-run model.</small></div>'
   +'<h4 class="tso-sim-stat-heading">SCORING BY QUARTER</h4>'+quarters
   +'<h4 class="tso-sim-stat-heading">TEAM COMPARISON</h4>'+statComparison
   +'<div class="tso-sim-complete-box-grid">'+sides.map(boxTeam).join('')+'</div>'
   +'<p class="tso-sim-boxfootnote">Play calls use 2026 active-roster candidates, role-weighted opportunity and bounded defensive-position allowances where verified. Actual coverage schemes, play tracking and final inactives are not claimed to be verified.</p>';
 }
 global.TSO2StatsUI={live,full};
})(typeof window!=='undefined'?window:globalThis);
