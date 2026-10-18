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
  // All values are accumulated from completed replay events, not pregame projections.
  const players=activePlayers(game,snap,team);
  const passing=players.filter(p=>p.passAtt||p.sacks).sort((a,b)=>b.passAtt-a.passAtt);
  const rushing=players.filter(p=>p.carries).sort((a,b)=>b.carries-a.carries);
  const receiving=players.filter(p=>p.targets).sort((a,b)=>b.targets-a.targets);
  const rows=(values,format)=>values.map(p=>'<div class="tso-sim-live-line"><b>'+esc(p.name)+'</b><span>'+esc(format(p))+'</span></div>').join('')||'<div class="tso-sim-no-stats">No attempts yet</div>';
  return '<div class="tso-sim-side-name">'+esc(team)+' · LIVE PLAYER BOX</div>'
   +'<h4>PASSING · CMP/ATT · YDS · TD · INT</h4>'+rows(passing,p=>p.passComp+'/'+p.passAtt+' · '+p.passYds+' YDS · '+p.passTd+' TD · '+p.int+' INT')
   +'<h4>RUSHING · ATT · YDS · TD</h4>'+rows(rushing,p=>p.carries+' ATT · '+p.rushYds+' YDS · '+p.rushTd+' TD')
   +'<h4>RECEIVING · REC/TGT · YDS · TD</h4>'+rows(receiving,p=>p.receptions+'/'+p.targets+' · '+p.recYds+' YDS · '+p.recTd+' TD');
 }
 function full(game,snapshot,events){
  const sides=[game.away.abbr,game.home.abbr];
  const fields=['Points','Total yards','Passing yards','Rushing yards','First downs','Pass comp/att',
   'Rush attempts','Turnovers','Sacks allowed','Punts','Made field goals'];
  const left=snapshot.teams[sides[0]],right=snapshot.teams[sides[1]];
  const values=t=>[t.points,t.totalYds,t.passing,t.rushing,t.firstDowns,t.passComp+'/'+t.passAtt,t.rushAtt,t.interceptions,t.sacksAllowed,t.punts,t.fieldGoals];
  const a=values(left),b=values(right);
  const statComparison=table(['TEAM STATS',sides[0],sides[1]],fields.map((f,i)=>[f,a[i],b[i]]));
  const quarters=table(['TEAM','Q1','Q2','Q3','Q4','FINAL'],[left,right].map(t=>[t.team,...t.quarter,t.points]));
  const boxCategory=category=>{
   const spec={
    passing:{title:'PASSING',heads:['PLAYER','CMP/ATT','YDS','TD','INT','SACK'],
     choose:p=>p.passAtt||p.sacks,sort:(a,b)=>b.passAtt-a.passAtt,
     format:p=>[p.name,p.passComp+'/'+p.passAtt,p.passYds,p.passTd,p.int,p.sacks]},
    rushing:{title:'RUSHING',heads:['PLAYER','ATT','YDS','TD'],
     choose:p=>p.carries,sort:(a,b)=>b.carries-a.carries,
     format:p=>[p.name,p.carries,p.rushYds,p.rushTd]},
    receiving:{title:'RECEIVING',heads:['PLAYER','REC/TGT','YDS','TD'],
     choose:p=>p.targets,sort:(a,b)=>b.targets-a.targets,
     format:p=>[p.name,p.receptions+'/'+p.targets,p.recYds,p.recTd]}
   }[category];
   return '<section class="tso-sim-final-market"><h4>'+spec.title+'</h4>'+sides.map(team=>{
    const ps=activePlayers(game,snapshot,team).filter(spec.choose).sort(spec.sort);
    return '<div class="tso-sim-final-market-team"><h5>'+esc(team)+'</h5>'+table(spec.heads,ps.map(spec.format))+'</div>';
   }).join('')+'</section>';
  };
  return '<div class="tso-sim-final-heading"><span>ILLUSTRATIVE SCENARIO COMPLETE · NOT OFFICIAL STATS</span>'
   +'<h3>'+esc(game.away.abbr)+' '+left.points+' — '+right.points+' '+esc(game.home.abbr)+'</h3>'
   +'<small>Final box score derived solely from the animated play ledger. It is not the mean result from the 50,000-run model.</small></div>'
   +'<div class="tso-sim-final-screen" data-tsos-final-team>'
   +'<h4 class="tso-sim-stat-heading">FINAL TEAM STATS · SCREEN 1</h4>'
   +'<h4 class="tso-sim-stat-heading">SCORING BY QUARTER</h4>'+quarters
   +'<h4 class="tso-sim-stat-heading">TEAM COMPARISON</h4>'+statComparison
   +'<button type="button" class="tso-sim-final-next" data-tsos-final-screen="players">NEXT: FULL PLAYER BOX SCORE →</button></div>'
   +'<div class="tso-sim-final-screen" data-tsos-final-players hidden>'
   +'<div class="tso-sim-final-screen-head"><h4 class="tso-sim-stat-heading">FULL PLAYER BOX SCORE · ALL 3 MARKETS · SCREEN 2</h4>'
   +'<button type="button" class="tso-sim-final-next" data-tsos-final-screen="team">← TEAM STATS</button></div>'
   +'<div class="tso-sim-final-market-grid">'+['passing','rushing','receiving'].map(boxCategory).join('')+'</div>'
   +'<p class="tso-sim-boxfootnote">Both teams · every recorded passing, rushing and receiving participant · same completed-play ledger as the animated replay. These are illustrative, not official NFL statistics.</p></div>';
 }
 global.TSO2StatsUI={live,full};
})(typeof window!=='undefined'?window:globalThis);
