/* TSO 2.0 — NFL Visual Simulation Replay. Model numbers are verified TSO
 * Monte Carlo outputs; field positions and play outcomes are illustrative
 * scenario choreography, NOT optical tracking or replay of a sampled world. */
(() => {
'use strict';
const state={root:null,doc:null,game:null,plays:[],index:0,playing:false,speed:1,raf:0,startedAt:0,frame:0,error:'',token:0};
const $=(root,selector)=>root?.querySelector(selector);
const $$=(root,selector)=>[...(root?.querySelectorAll(selector)||[])];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(v,d=1)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
const pct=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?number(Number(v)*100,1)+'%':'—';
const teamCode=v=>String(v||'').toUpperCase().replace('LAR','LA').replace('JAC','JAX');
const teamLabel=t=>esc(t?.name||t?.abbr||'TEAM');
const dateText=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d):'Schedule pending'};
const seeded=value=>{let h=2166136261;for(const c of String(value||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
function randomGenerator(seed){let x=seed||1;return ()=>{x=(x+0x6D2B79F5)|0;let n=Math.imul(x^(x>>>15),1|x);n^=n+Math.imul(n^(n>>>7),61|n);return ((n^(n>>>14))>>>0)/4294967296};}
function pageHTML(){
 return '<section class="tso-sim-page" data-tso-simulations>'
  +'<div class="tso-sim-hero"><div><div class="tso-sim-kicker">THE SPORTS OUTPOST / VISUAL SIMULATION LAB</div><h1>TSO Simulations <span>· NFL</span></h1><p>Watch an illustrated four-quarter football scenario alongside actual TSO Monte Carlo projections. Choose any game on the slate.</p></div><div class="tso-sim-hero-pill"><b>2026 NFL</b><small>Other sports coming later</small></div></div>'
  +'<div class="tso-sim-disclosure"><strong>HOW TO READ THIS</strong> Model win chances, mean scores and player projections are sourced from TSO simulations. The animated routes, play calls, individual gains and scenario score are generated for visualization—not real tracking, a recorded simulation world, or a betting recommendation.</div>'
  +'<div class="tso-sim-loading" data-tsos-loading><span class="live-feed-spinner"></span> Loading the NFL simulation slate…</div>'
  +'<div data-tsos-content></div></section>';
}
function sortGames(games){return [...games].sort((a,b)=>(Date.parse(a.kickoff||'')||0)-(Date.parse(b.kickoff||'')||0));}
function gameItem(game){
 const active=String(state.game?.gameId)===String(game.gameId);
 return '<button class="tso-sim-game-choice'+(active?' is-active':'')+'" data-tsos-game="'+esc(game.gameId)+'" aria-pressed="'+active+'">'
  +'<span class="tso-sim-game-short"><b>'+esc(game.away.abbr)+'</b><em>at</em><b>'+esc(game.home.abbr)+'</b></span>'
  +'<span class="tso-sim-game-date">'+esc(dateText(game.kickoff))+'</span>'
  +'<span class="tso-sim-game-result">TSO MODEL · '+number(game.projected.awayScore,1)+' – '+number(game.projected.homeScore,1)+'</span></button>';
}
function playerOf(game,team,role){
 const rows=(game.players||[]).filter(p=>teamCode(p.team)===teamCode(team));
 if(role==='qb')return rows.filter(p=>p.position==='QB').sort((a,b)=>(b.passYds||0)-(a.passYds||0))[0]||null;
 if(role==='rb')return rows.filter(p=>p.position==='RB').sort((a,b)=>(b.carries||0)-(a.carries||0))[0]||null;
 return rows.filter(p=>['WR','TE','RB'].includes(p.position)).sort((a,b)=>(b.recYds||0)-(a.recYds||0))[0]||null;
}
function selectedPlayer(game,team,type,rng){
 const pool=(game.players||[]).filter(p=>teamCode(p.team)===teamCode(team)&&
  (type==='rush'?['RB','QB','WR'].includes(p.position):['WR','TE','RB'].includes(p.position)));
 const weighted=pool.map(p=>({p,w:Math.max(.1,type==='rush'?Number(p.carries||0):Number(p.targets||0))})); 
 const total=weighted.reduce((s,e)=>s+e.w,0);let r=rng()*total;
 for(const item of weighted){r-=item.w;if(r<=0)return item.p}
 return playerOf(game,team,type==='rush'?'rb':'rec')||null;
}
function buildPlays(game){
 const rng=randomGenerator(seeded(game.gameId+'|tso-sim-replay-v1'));
 const plays=[];let away=0,home=0,sequence=0;
 const teams=[game.away.abbr,game.home.abbr];
 const mean=(side)=>Number(side===game.away.abbr?game.projected.awayScore:game.projected.homeScore)||21;
 for(let q=1;q<=4;q++){
  for(let drive=0;drive<4;drive++){
   const side=teams[(q+drive)%2],opp=teams[(q+drive+1)%2];
   let y=20+Math.floor(rng()*13),first=10;
   const numPlays=4+Math.floor(rng()*3);
   for(let n=0;n<numPlays;n++){
    const pass=rng()<(mean(side)<16?.53:.61),qb=playerOf(game,side,'qb');
    const carrier=selectedPlayer(game,side,pass?'pass':'rush',rng);
    const clock=Math.max(1,15-Math.round((drive*3.65+n*3.65/numPlays)*10)/10);
    const down=Math.min(4,1+n%4),gain=pass?(rng()<.28?0:2+Math.floor(rng()*24)):(rng()<.12?-2:1+Math.floor(rng()*12));
    const corrected=Math.min(gain,100-y),incomplete=pass&&gain===0;
    const touchdown=corrected>0&&y+corrected>=100;
    const scoreType=touchdown?'TD':null;
    const before=y;y=Math.min(100,y+corrected);
    if(scoreType){if(side===game.away.abbr)away+=7;else home+=7}
    const receiver=carrier?.name||('No verified '+(pass?'receiver':'rusher')+' in current model');
    let commentary=incomplete?(qb?.name||'Quarterback')+' pass falls incomplete.':
      pass?(qb?.name||'Quarterback')+' completes to '+receiver+' for '+corrected+' yards.':
           receiver+' rushes for '+corrected+' yards.';
    if(corrected<0)commentary=receiver+' is stopped for a loss of '+Math.abs(corrected)+' yards.';
    if(touchdown)commentary='TOUCHDOWN! '+receiver+' scores for '+side+'. (Illustrative play)';
    const clockSec=Math.max(0,Math.round(clock*60));
    plays.push({index:sequence++,quarter:q,clock:Math.floor(clockSec/60)+':'+String(clockSec%60).padStart(2,'0'),
      side,opponent:opp,down,first,yard:before,gain:corrected,kind:pass?'PASS':'RUSH',
      player:receiver,qb:qb?.name||'QB',scoreAway:away,scoreHome:home,commentary,td:touchdown});
    if(touchdown)break;
   }
   if(y<100 && rng()<Math.max(.10,Math.min(.40,mean(side)/65))){
    const before=y;if(side===game.away.abbr)away+=3;else home+=3;
    plays.push({index:sequence++,quarter:q,clock:(Math.max(0,11-drive*3))+':09',side,opponent:opp,down:4,first:10,yard:before,gain:0,
      kind:'FIELD GOAL',player:'Kicking unit',qb:'',scoreAway:away,scoreHome:home,
      commentary:'Field goal good for '+side+'. (Illustrative sequence)',td:false});
   }
  }
 }
 return plays;
}
function featured(game,team){
 const qb=playerOf(game,team,'qb'),rb=playerOf(game,team,'rb'),wr=playerOf(game,team,'rec');
 return [qb,rb,wr].filter((p,i,a)=>p&&a.findIndex(t=>t?.name===p.name)===i).slice(0,3);
}
function playerPill(row){
 const stat=row.position==='QB'?'PASS '+number(row.passYds,0)+' YDS':row.position==='RB'?'RUSH '+number(row.rushYds,0)+' YDS':'REC '+number(row.recYds,0)+' YDS';
 return '<div class="tso-sim-player"><span class="tso-sim-player-dot">'+esc(row.position)+'</span><span><b>'+esc(row.name)+'</b><small>'+stat+' · MODEL MEAN</small></span></div>';
}
function strip(game){
 return '<section class="tso-sim-outlook"><div class="tso-sim-outlook-team"><small>'+teamLabel(game.away)+'</small><strong>'+number(game.projected.awayScore,1)+'</strong><span>PROJECTED MEAN SCORE</span></div>'
  +'<div class="tso-sim-outlook-bridge"><div class="tso-sim-bridge-label">TSO MONTE CARLO</div><b>'+Number(game.iterations||0).toLocaleString()+' RUNS</b><small>'+esc(String(game.generatedAt||'').slice(0,16).replace('T',' '))+' UTC</small></div>'
  +'<div class="tso-sim-outlook-team"><small>'+teamLabel(game.home)+'</small><strong>'+number(game.projected.homeScore,1)+'</strong><span>PROJECTED MEAN SCORE</span></div></section>'
  +'<div class="tso-sim-prob-row"><div><span>'+esc(game.away.abbr)+' WIN</span><b>'+pct(game.projected.awayWin)+'</b><i style="--width:'+Math.max(0,Math.min(100,Number(game.projected.awayWin||0)*100))+'%"></i></div>'
  +'<div><span>'+esc(game.home.abbr)+' WIN</span><b>'+pct(game.projected.homeWin)+'</b><i style="--width:'+Math.max(0,Math.min(100,Number(game.projected.homeWin||0)*100))+'%"></i></div>'
  +'<div><span>MODEL TOTAL</span><b>'+number(game.projected.awayScore+game.projected.homeScore,1)+'</b><i style="--width:65%"></i></div></div>';
}
function replayHTML(game){
 return '<div class="tso-sim-replay"><div class="tso-sim-scoreboard">'
  +'<span class="tso-sim-scoreteam"><b>'+esc(game.away.abbr)+'</b><strong data-tsos-away>0</strong></span>'
  +'<div class="tso-sim-scoreclock"><b data-tsos-quarter>Q1</b><strong data-tsos-clock>15:00</strong><small data-tsos-possession>ILLUSTRATIVE REPLAY</small></div>'
  +'<span class="tso-sim-scoreteam is-home"><strong data-tsos-home>0</strong><b>'+esc(game.home.abbr)+'</b></span></div>'
  +'<div class="tso-sim-stadium"><aside class="tso-sim-players">'+featured(game,game.away.abbr).map(playerPill).join('')+'<div class="tso-sim-side-name">'+esc(game.away.abbr)+' PLAYER PROJECTIONS</div></aside>'
  +'<div class="tso-sim-field"><canvas data-tsos-canvas width="960" height="480" aria-label="Animated, illustrative top-down football field"></canvas><div class="tso-sim-field-badge">ANIMATED PROJECTION REPLAY · NOT TRACKED MOVEMENT</div><div class="tso-sim-quarter-overlay" data-tsos-quarter-overlay hidden><span>ILLUSTRATIVE REPLAY</span><strong data-tsos-overlay-quarter>QUARTER 1</strong><small>'+esc(game.away.abbr)+' AT '+esc(game.home.abbr)+'</small></div></div>'
  +'<aside class="tso-sim-players">'+featured(game,game.home.abbr).map(playerPill).join('')+'<div class="tso-sim-side-name">'+esc(game.home.abbr)+' PLAYER PROJECTIONS</div></aside></div>'
  +'<div class="tso-sim-commentary"><span class="tso-sim-play-light"></span><b data-tsos-play>Start the illustrated replay for '+esc(game.away.abbr)+' at '+esc(game.home.abbr)+'.</b></div>'
  +'<div class="tso-sim-controls"><button type="button" data-tsos-play class="tso-sim-control-primary">▶ PLAY</button><button type="button" data-tsos-reset>↺ RESTART</button>'
  +'<label class="tso-sim-seeker"><span>REPLAY</span><input type="range" data-tsos-seek min="0" max="'+(state.plays.length-1)+'" value="0" step="1" aria-label="Seek through illustrative plays"><small data-tsos-seek-label>1 / '+state.plays.length+'</small></label>'
  +'<label class="tso-sim-speed">SPEED <select data-tsos-speed><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div>'
  +'<div class="tso-sim-final" data-tsos-final hidden></div>'
  +'<div class="tso-sim-disclaimer">The moving markers, play gains, score, clock, and final result are one generated <b>illustrative scenario</b>, not a sampled TSO Monte Carlo world. Only the projections above and listed player averages are outputs of the actual TSO model.</div></div>';
}
function paintPage(){
 if(!state.root||!state.doc)return;
 const games=sortGames(state.doc.games||[]),main=$(state.root,'[data-tsos-content]');
 if(!main)return;
 if(!games.length){main.innerHTML='<div class="tso-sim-empty">No NFL simulations available in the current feed. No games were fabricated.</div>';return}
 if(!state.game||!games.some(g=>g.gameId===state.game.gameId))state.game=games.find(g=>Date.parse(g.kickoff)>Date.now()-12*3600000)||games[0];
 state.plays=buildPlays(state.game);state.index=0;state.playing=false;state.startedAt=0;
 main.innerHTML='<div class="tso-sim-layout"><aside class="tso-sim-matchups"><div class="tso-sim-matchups-head"><span>2026 NFL SLATE</span><b>'+games.length+' GAMES</b></div>'
  +'<div class="tso-sim-game-list">'+games.map(gameItem).join('')+'</div></aside><div class="tso-sim-main">'
  +'<header class="tso-sim-game-title"><div><small>NFL / SIMULATION OUTLOOK</small><h2>'+esc(state.game.away.abbr)+' <span>at</span> '+esc(state.game.home.abbr)+'</h2>'
  +'<p>'+esc(dateText(state.game.kickoff))+' · Model output '+esc(String(state.game.generatedAt||'').slice(0,10))+'</p></div><b class="tso-sim-live-badge">MODEL-BASED VISUALIZATION</b></header>'
  +strip(state.game)+replayHTML(state.game)+'</div></div>';
 $$(main,'[data-tsos-game]').forEach(btn=>btn.addEventListener('click',()=>{const game=games.find(g=>g.gameId===btn.dataset.tsosGame);if(game){stop();state.game=game;paintPage()}}));
 $(main,'[data-tsos-play]')?.addEventListener('click',()=>{state.playing?stop():start()});
 $(main,'[data-tsos-reset]')?.addEventListener('click',()=>{stop();state.index=0;state.frame=0;updatePlay();draw(0)});
 $(main,'[data-tsos-speed]')?.addEventListener('change',e=>{state.speed=Number(e.target.value)||1});
 $(main,'[data-tsos-seek]')?.addEventListener('input',e=>{stop();state.index=Math.max(0,Math.min(state.plays.length-1,Number(e.target.value)||0));state.frame=0;updatePlay();draw(1)});
 updatePlay();draw(0);
}

function showQuarterCard(event){
 const panel=$(state.root,'[data-tsos-quarter-overlay]');
 if(!panel||!event)return;
 const title=$(panel,'[data-tsos-overlay-quarter]');
 if(title)title.textContent='QUARTER '+event.quarter;
 panel.hidden=false;
 const active=event.quarter;
 setTimeout(()=>{
  if(panel.isConnected&&state.plays[state.index]?.quarter===active)panel.hidden=true;
 },1200/Math.max(1,state.speed));
}
function scenarioFinal(){
 const game=state.game,plays=state.plays,end=plays[plays.length-1];
 if(!game||!end)return '';
 const sides=[game.away.abbr,game.home.abbr];
 const figures=sides.map(team=>{
  const events=plays.filter(p=>p.side===team);
  const passes=events.filter(p=>p.kind==='PASS');
  const rushes=events.filter(p=>p.kind==='RUSH');
  const totals={passes:passes.length,completed:passes.filter(p=>p.gain>0).length,
    passing:passes.reduce((sum,p)=>sum+Math.max(0,p.gain),0),
    rushing:rushes.reduce((sum,p)=>sum+p.gain,0),
    rushingAttempts:rushes.length};
  const receivers=new Map(),runners=new Map();
  for(const p of passes){if(p.gain<=0)continue;const val=receivers.get(p.player)||{yards:0,catches:0};val.yards+=p.gain;val.catches++;receivers.set(p.player,val)}
  for(const p of rushes){const val=runners.get(p.player)||{yards:0,carries:0};val.yards+=p.gain;val.carries++;runners.set(p.player,val)}
  const leaders=map=>[...map.entries()].sort((a,b)=>b[1].yards-a[1].yards).slice(0,3);
  const players=(rows,label)=>rows.map(([name,stats])=>'<div><b>'+esc(name)+'</b><span>'+stats.yards+' yds / '+(stats.catches??stats.carries)+' '+label+'</span></div>').join('');
  return '<article><h4>'+esc(team)+' · ILLUSTRATIVE SCENARIO</h4><p><strong>'+totals.completed+' / '+totals.passes+'</strong> PASS · <strong>'+totals.passing+'</strong> PASS YDS · <strong>'+totals.rushing+'</strong> RUSH YDS</p>'
    +'<h5>RECEIVING</h5>'+players(leaders(receivers),'REC')
    +'<h5>RUSHING</h5>'+players(leaders(runners),'CAR')+'</article>';
 });
 return '<div class="tso-sim-final-heading"><span>SCENARIO COMPLETE / NOT OFFICIAL OR MODEL-SAMPLED</span><h3>'+esc(game.away.abbr)+' '+end.scoreAway+' — '+end.scoreHome+' '+esc(game.home.abbr)+'</h3><small>TSO model mean scores: '+number(game.projected.awayScore,1)+' — '+number(game.projected.homeScore,1)+'</small></div>'
   +'<div class="tso-sim-final-grid">'+figures.join('')+'</div>';
}
function updatePlay(){
 const el=state.root,event=state.plays[state.index];if(!el||!event)return;
 const write=(selector,value)=>{const x=$(el,selector);if(x)x.textContent=String(value)};
 write('[data-tsos-quarter]','Q'+event.quarter);write('[data-tsos-clock]',event.clock);
 write('[data-tsos-away]',event.scoreAway);write('[data-tsos-home]',event.scoreHome);
 write('[data-tsos-possession]',event.side+' POSSESSION · '+event.kind);
 write('[data-tsos-play]',event.commentary);
 write('[data-tsos-seek-label]',(state.index+1)+' / '+state.plays.length);
 const seek=$(el,'[data-tsos-seek]');if(seek)seek.value=String(state.index);
 const control=$(el,'[data-tsos-play]');if(control)control.textContent=state.playing?'Ⅱ PAUSE':'▶ PLAY';
 const last=state.index===state.plays.length-1&&!state.playing;
 const final=$(el,'[data-tsos-final]');if(final){final.hidden=!last;if(last)final.innerHTML=scenarioFinal();}
}
function draw(progress=0){
 const canvas=$(state.root,'[data-tsos-canvas]'),event=state.plays[state.index];if(!canvas||!event)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height,fx=40,fy=32,fw=w-80,fh=h-82;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#08131b';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#053827';ctx.fillRect(fx,fy,fw,fh);
 for(let n=0;n<10;n++){ctx.fillStyle=n%2===0?'#104737':'#0e3d30';ctx.fillRect(fx+n*fw/10,fy,fw/10,fh)}
 ctx.fillStyle='#113b71';ctx.fillRect(fx,fy,fw*.07,fh);ctx.fillStyle='#342f38';ctx.fillRect(fx+fw*.93,fy,fw*.07,fh);
 ctx.strokeStyle='rgba(215,247,225,.36)';ctx.lineWidth=1.5;
 for(let n=0;n<=20;n++){const x=fx+fw*.07+n*(fw*.86/20);ctx.beginPath();ctx.moveTo(x,fy);ctx.lineTo(x,fy+fh);ctx.stroke()}
 ctx.strokeStyle='#bce6cf';ctx.lineWidth=3;ctx.strokeRect(fx,fy,fw,fh);
 ctx.font='bold 21px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(237,246,240,.60)';
 for(let i=1;i<=9;i++){const yds=i<=5?i*10:(10-i)*10;const x=fx+fw*.07+fw*.86*i/10;ctx.fillText(String(yds),x,fy+35);ctx.fillText(String(yds),x,fy+fh-15)}
 ctx.font='bold 42px system-ui';ctx.fillStyle='rgba(241,247,239,.11)';ctx.fillText('TSO',w/2,fy+fh/2+17);
 ctx.font='bold 25px system-ui';ctx.fillStyle='rgba(236,246,255,.80)';ctx.save();ctx.translate(fx+fw*.035,fy+fh/2);ctx.rotate(-Math.PI/2);ctx.fillText(state.game.away.abbr,0,0);ctx.restore();
 ctx.save();ctx.translate(fx+fw*.965,fy+fh/2);ctx.rotate(Math.PI/2);ctx.fillText(state.game.home.abbr,0,0);ctx.restore();
 const xOf=yard=>fx+fw*.07+fw*.86*Math.max(0,Math.min(100,yard))/100;
 const start=xOf(event.yard),end=xOf(event.yard+event.gain);
 ctx.strokeStyle='#ffd54c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(xOf(Math.min(100,event.yard+10)),fy);ctx.lineTo(xOf(Math.min(100,event.yard+10)),fy+fh);ctx.stroke();
 ctx.strokeStyle='#42c4ff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(start,fy);ctx.lineTo(start,fy+fh);ctx.stroke();
 const dotsY=[.18,.26,.34,.42,.50,.58,.66,.74,.82,.39,.61];
 const p=Math.max(0,Math.min(1,progress));const direction=event.gain<0?-1:1;
 for(let i=0;i<22;i++){
  const offense=i<11,j=i%11;const spread=(j-5)*7.7;const target=offense?start-15: start+10;
  const travel=offense?(i===0?event.gain:Math.min(20,Math.max(-3,event.gain)))*(p*p*(3-2*p)):(event.gain>0?Math.min(12,event.gain)*p:4*p);
  const x=Math.max(fx+10,Math.min(fx+fw-10,target+spread+travel*fw*.86/100*direction));
  const y=fy+fh*dotsY[j]+(offense?Math.sin(i*17+p*7)*p*4:Math.cos(i*6+p*5)*p*5);
  ctx.beginPath();ctx.arc(x,y,i===0?10:6.2,0,Math.PI*2);ctx.fillStyle=offense?(i===0?'#ffc25d':'#ff8949'):'#8cc6ff';ctx.fill();
  ctx.lineWidth=1.4;ctx.strokeStyle=offense?'#3b1a04':'#0d2542';ctx.stroke();
  if(i===0){ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='left';ctx.fillText(event.player.split(' ').slice(-1)[0]||'BALL',x+13,y-11)}
 }
 ctx.fillStyle='#dae9e3';ctx.font='bold 14px system-ui';ctx.textAlign='left';
 ctx.fillText('PLAY '+String(event.index+1).padStart(3,'0')+'  |  '+event.kind+'  |  '+event.down+' & '+Math.max(1,100-event.yard),fx+12,h-16);
 ctx.textAlign='right';ctx.fillStyle='#ffbb76';ctx.fillText(event.side+' →',w-fx,h-16);
}
function loop(time){
 if(!state.playing||!state.root?.isConnected)return;
 if(!state.startedAt)state.startedAt=time;
 const timePerPlay=2200/state.speed;
 const progress=Math.min(1,(time-state.startedAt)/timePerPlay);
 draw(progress);
 if(progress>=1){
  if(state.index>=state.plays.length-1){stop();draw(1);return}
  const previousQuarter=state.plays[state.index]?.quarter;
  state.index++;state.startedAt=time;updatePlay();
  if(state.plays[state.index]?.quarter!==previousQuarter)showQuarterCard(state.plays[state.index]);
 }
 state.raf=requestAnimationFrame(loop);
}
function stop(){state.playing=false;cancelAnimationFrame(state.raf);state.raf=0;state.startedAt=0;updatePlay()}
function start(){if(state.playing)return;if(state.index>=state.plays.length-1){state.index=0}state.playing=true;state.startedAt=0;updatePlay();state.raf=requestAnimationFrame(loop)}
async function mount(root){
 stop();state.root=root||document.querySelector('[data-tso-simulations]');
 const token=++state.token;const loading=$(state.root,'[data-tsos-loading]');
 if(!state.root)return;
 if(loading)loading.hidden=false;
 try{
  const response=await fetch('/api/tso-simulations-nfl',{cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok)throw Error('TSO NFL simulation feed HTTP '+response.status);
  const doc=await response.json();
  if(!Array.isArray(doc.games)||!doc.games.length)throw Error('No verified NFL simulations available');
  if(token!==state.token||!state.root?.isConnected)return;
  state.doc=doc;
  const remembered=sessionStorage.getItem('tso-sim-last-game');
  state.game=doc.games.find(g=>g.gameId===remembered)||null;
  paintPage();
  $$(state.root,'[data-tsos-game]').forEach(b=>b.addEventListener('click',()=>sessionStorage.setItem('tso-sim-last-game',b.dataset.tsosGame)));
 }catch(e){
  if(token!==state.token||!state.root?.isConnected)return;
  const area=$(state.root,'[data-tsos-content]');if(area)area.innerHTML='<div class="tso-sim-error"><b>Simulation feed unavailable</b><p>'+esc(e?.message||e)+'</p><button type="button" data-tsos-retry>RETRY</button></div>';
  $(area,'[data-tsos-retry]')?.addEventListener('click',()=>mount(state.root));
 }finally{if(token===state.token&&loading)loading.hidden=true}
}
function dispose(){stop();state.token++;state.root=null}
window.TSO2Simulations={pageHTML,mount,dispose,buildPlays};
})();
