/* NBA First Basket · evidence-first design for TSO 2.0 */
(()=>{
'use strict';
const ENDPOINT='https://tso2-nba-first-basket.jthomas0786-tso.workers.dev/';
const cache=new Map(),inflight=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const code=v=>String(v||'').toUpperCase().replace(/[^A-Z]/g,'');
const key=g=>[code(g.home?.abbr),code(g.away?.abbr),String(g.startTime||'')].join('|');
const result=r=>r&&Number(r.n)>0;
const meter=r=>'<i class="fb-meter"><i style="width:'+(result(r)?Math.max(0,Math.min(100,Number(r.pct)||0)):0)+'%"></i></i>';
function team(t,side){
 const url=String(t?.logo||'');
 return '<span class="fb-team"><span class="fb-team-logo">'+(/^https:\/\//.test(url)?'<img src="'+esc(url)+'" alt="" loading="lazy">':'')+'</span><b>'+esc(t?.abbr||'—')+'</b><small>'+side.toUpperCase()+'</small></span>';
}
function stat(r){
 return result(r)?'<b>'+esc(r.pct)+'%</b><small>'+esc(r.won)+' / '+esc(r.n)+' GAMES</small>':'<b>—</b><small>NO VERIFIED SAMPLE</small>';
}
function grid(home,away,type){
 return '<div class="fb-metric-grid">'+['last5','last10','season'].map(window=>{
 const label={last5:'LAST 5',last10:'LAST 10',season:'SEASON'}[window];
 const a=home?.[type]?.[window],b=away?.[type]?.[window];
 return '<div class="fb-metric"><div class="fb-metric-label">'+label+'</div><div class="fb-metric-sides">'
  +'<div class="fb-metric-side fb-home">'+stat(a)+meter(a)+'</div>'
  +'<div class="fb-metric-side fb-away">'+stat(b)+meter(b)+'</div></div></div>';
 }).join('')+'</div>';
}
function header(){
 return '<header class="fb-header"><div><small>NBA · OPENING POSSESSION INTELLIGENCE</small><h3>First Basket <em>/ Tip-Off Lab</em></h3><p>Opening-tip history, first field-goal trends and player-specific evidence.</p></div><span class="fb-stamp">PLAY-BY-PLAY VERIFIED</span></header>';
}
function markup(g){
 return '<section class="gb2-panel fb-root" data-fb-key="'+esc(key(g))+'">'+header()
 +'<div class="fb-body" aria-live="polite" data-fb-body><div class="fb-loading"><span class="live-feed-spinner"></span><div><b>Retrieving verified opening possessions…</b><small>Analyzing both teams from completed NBA games.</small></div></div></div></section>';
}
function score(p,i){
 const id=String(p.id||'').replace(/[^0-9]/g,'');
 const n=Math.max(1,Number(p.games)||1),v=Math.round((Number(p.firstBaskets)||0)/n*100);
 const photo=id?'<img alt="" src="https://a.espncdn.com/i/headshots/nba/players/full/'+id+'.png" loading="lazy" onerror="this.hidden=true">':'';
 return '<article class="fb-player"><div class="fb-player-head"><i>'+String(i+1).padStart(2,'0')+'</i><span class="fb-photo">'+photo+'</span>'
  +'<div><b>'+esc(p.name||'Player')+'</b><small>TEAM FIRST-FG FREQUENCY</small></div><strong>'+v+'%</strong></div>'
  +'<div class="fb-player-meter"><i style="width:'+v+'%"></i></div>'
  +'<div class="fb-evidence"><span><small>FIRST MADE FG</small><b>'+esc(p.firstBaskets)+' / '+esc(p.games)+'</b></span>'
  +'<span><small>FIRST SHOT TAKEN</small><b>'+esc(p.firstShots)+' / '+esc(p.games)+'</b></span>'
  +'<span><small>VERIFIED STARTS</small><b>'+esc(p.starts)+' / '+esc(p.games)+'</b></span></div>'
  +'<p>'+esc(p.firstBaskets)+' observed opening baskets; '+esc(p.firstShots)+' opening shot attempts and '+esc(p.starts)+' recorded starts. These are past events, not a player probability forecast.</p></article>';
}
function column(g,side,info,other){
 const opponent=other?.basket?.last10;
 const conceded=result(opponent)?String(opponent.n-opponent.won)+' / '+opponent.n:'—';
 const conversion=info?.conversion;
 const players=Array.isArray(info?.players)?info.players:[];
 return '<div class="fb-column '+(side==='home'?'fb-column-home':'fb-column-away')+'">'
  +'<div class="fb-column-top">'+team(g[side],side)+'<span>'+esc(info?.games||0)+' games sampled</span></div>'
  +'<div class="fb-team-factors"><span>WON TIP + SCORED FIRST <b>'+(result(conversion)?esc(conversion.won)+'/'+esc(conversion.n):'—')+'</b></span>'
  +'<span>OPP CONCEDED FIRST FG <b>'+conceded+'</b> <small>L10</small></span></div>'
  +'<div class="fb-list-title"><b>FIRST-BASKET CANDIDATES</b><span>HISTORICAL RANKING</span></div>'
  +(players.length?players.slice(0,6).map(score).join(''):
  '<div class="fb-empty"><b>Insufficient verified player data</b><p>Player rankings require first-quarter play-by-play with an identifiable shooter.</p></div>')
  +'</div>';
}
function present(g,doc){
 if(!doc?.available)return '<div class="fb-empty fb-error"><b>First Basket data unavailable</b><p>'+esc(doc?.error||'Historical play-by-play could not be retrieved.')+'</p></div>';
 if(code(doc.home?.abbr)!==code(g.home?.abbr)||code(doc.away?.abbr)!==code(g.away?.abbr))
  return '<div class="fb-empty fb-error"><b>Source matchup mismatch</b><p>We will not display another team’s first-basket data here.</p></div>';
 const h=doc.home,a=doc.away;
 return '<div class="fb-stage"><div class="fb-stage-head"><div><b>01 · OPENING TIP</b><small>Each team against its past opponents, not head-to-head odds</small></div></div>'
  +'<div class="fb-versus">'+team(g.home,'home')+'<strong>VS</strong>'+team(g.away,'away')+'</div>'
  +grid(h,a,'tip')+'</div>'
  +'<div class="fb-stage"><div class="fb-stage-head"><div><b>02 · WHO GETS THE FIRST FIELD GOAL?</b><small>Made basket only · free throws excluded</small></div></div>'
  +grid(h,a,'basket')+'</div>'
  +'<div class="fb-stage-head fb-candidate-head"><div><b>03 · FIRST-BASKET PLAYERS</b><small>Home left · Away right · most observed involvement first</small></div></div>'
  +'<div class="fb-columns">'+column(g,'home',h,a)+column(g,'away',a,h)+'</div>'
  +'<footer class="fb-notes"><strong>SAMPLE & METHOD:</strong> ESPN completed regular-season play-by-play, '+esc(doc.seasonLabel)+' season (up to '+esc(doc.recentSampleCap||20)+' recent games per team).'
  +' L5 and L10 may include the previous season. Season figures can be a partial season sample. These observed frequencies are <b>not calibrated betting probabilities</b>. '
  +'Starting lineups, injuries and sportsbook settlement rules must be checked separately. </footer>';
}
async function fetchGame(g){
 const k=key(g),previous=cache.get(k);
 if(previous&&Date.now()-previous.at<900000)return previous.doc;
 if(inflight.has(k))return inflight.get(k);
 const qs=new URLSearchParams({home:code(g.home?.abbr),away:code(g.away?.abbr)});
 if(g.startTime&&!Number.isNaN(Date.parse(g.startTime)))qs.set('before',g.startTime);
 const task=fetch(ENDPOINT+'?'+qs.toString(),{cache:'no-store'})
  .then(async r=>{const d=await r.json();if(!r.ok||!d?.available)throw Error(d.error||'Feed unavailable');cache.set(k,{doc:d,at:Date.now()});return d})
  .finally(()=>inflight.delete(k));
 inflight.set(k,task);return task;
}
async function bind(root,g){
 if(g?.league!=='nba')return;
 const node=root.querySelector('[data-fb-key]'),body=node?.querySelector('[data-fb-body]');
 if(!node||!body)return;
 try{const doc=await fetchGame(g);if(body.isConnected&&node.dataset.fbKey===key(g))body.innerHTML=present(g,doc)}
 catch(error){if(body.isConnected)body.innerHTML=present(g,{available:false,error:String(error?.message||error)})}
}
window.TSO2FirstBasket={markup,bind,present,cache};
})();