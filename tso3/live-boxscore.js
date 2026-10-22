/* TSO 3.0 verified live game stats — ESPN official box score. */
(()=>{
'use strict';
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const cache=new Map();
function markup(game,doc){
 if(String(doc?.eventId)!==String(game?.id))return '<p class="live-no-stats">Game identity was not verified.</p>';
 const fetched=Date.parse(doc.fetchedAt||'');
 const asof=Number.isFinite(fetched)?new Date(fetched).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})+' CT':'Time unavailable';
 const cards=[['away',game.away],['home',game.home]].map(([side,team])=>{
  const id=String(team?.id||''),record=doc.teams?.find(x=>String(x.id)===id),
   summary=doc.teamStats?.find(x=>String(x.teamId)===id),
   group=doc.players?.find(x=>String(x.teamId)===id);
  const stats=(summary?.stats||[]).slice(0,10).map(st=>'<div class="live-box-stat"><span>'+h(st.name)+'</span><b>'+h(st.value)+'</b></div>').join('');
  const panels=(group?.groups||[]).slice(0,5).map(g=>
   '<div class="live-box-group"><h4>'+h(g.name)+'</h4><div class="live-box-scroll"><table><thead><tr><th>Player</th>'
   +(g.labels||[]).map(l=>'<th>'+h(l)+'</th>').join('')+'</tr></thead><tbody>'
   +(g.athletes||[]).slice(0,25).map(a=>'<tr><td>'+h(a.name)+'</td>'+(a.stats||[]).map(v=>'<td>'+h(v)+'</td>').join('')+'</tr>').join('')
   +'</tbody></table></div></div>').join('');
  return '<div class="live-box-team"><div class="live-box-teamhead"><strong>'+h(team?.abbr||'TEAM')+'</strong><span>'+side.toUpperCase()+'</span><b>'+h(record?.score??team?.score??'—')+'</b></div>'
   +(stats?'<div class="live-box-statgrid">'+stats+'</div>':'')
   +(panels||'<p class="live-no-stats">No in-game player statistics have been published yet.</p>')+'</div>';
 }).join('');
 return '<div class="live-box-updated">ESPN OFFICIAL GAME RECORD · '+h(doc.state==='post'?'FINAL':doc.state==='in'?'LIVE':'PREGAME')+' · CHECKED '+h(asof)+'</div><div class="live-box-grid">'+cards+'</div>';
}
async function render(game,sport){
 const slot=document.getElementById('liveGameStats');
 if(!slot||!game?.id)return;
 const key=sport+':'+game.id,prior=cache.get(key);
 if(prior&&Date.now()-prior.at<24000){slot.innerHTML=markup(game,prior.doc);return}
 try{
  const url='/api/game-summary?sport='+encodeURIComponent(sport)+'&event='+encodeURIComponent(game.id);
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw Error('No official box score');
  const doc=await r.json();
  if(String(doc.eventId)!==String(game.id))throw Error('Wrong game');
  cache.set(key,{at:Date.now(),doc});
  const current=document.getElementById('liveGameStats');
  if(current&&current.dataset.game===key)current.innerHTML=markup(game,doc);
 }catch(_){
  const current=document.getElementById('liveGameStats');
  if(current&&current.dataset.game===key)current.innerHTML='<p class="live-no-stats">Official game stats are not available yet. No estimates are shown.</p>';
 }
}
window.TSO3LiveBoxscore={render,markup};
})();