/* TSO 2.0 — NFL Visual Simulation Replay. Model numbers are verified TSO
 * Monte Carlo outputs; field positions and play outcomes are illustrative
 * scenario choreography, NOT optical tracking or replay of a sampled world. */
(() => {
'use strict';
const state={root:null,doc:null,defense:null,game:null,plays:[],index:0,playing:false,speed:1,raf:0,startedAt:0,frame:0,error:'',token:0};
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
 const rng=randomGenerator(seeded(game.gameId+'|tso-sim-football-routes-v2'));
 const plays=[];let away=0,home=0,sequence=0;
 const teams=[game.away.abbr,game.home.abbr];
 const mean=side=>Number(side===game.away.abbr?game.projected.awayScore:game.projected.homeScore)||21;
 const routeNames=['SLANT','OUT','POST','GO','CROSS','CURL','CORNER','FLAT'];
 for(let q=1;q<=4;q++){
  for(let drive=0;drive<4;drive++){
   const side=teams[(q+drive)%2],opp=teams[(q+drive+1)%2];
   let yard=20+Math.floor(rng()*13);
   const numPlays=4+Math.floor(rng()*3);
   for(let n=0;n<numPlays;n++){
    const qb=playerOf(game,side,'qb');
    const pass=Boolean(qb)&&rng()<(mean(side)<16?.53:.61);
    const player=selectedPlayer(game,side,pass?'pass':'rush',rng);
    const playerName=player?.name||'Unlisted '+(pass?'receiver':'runner');
    const passer=qb?.name||'Unlisted quarterback';
    const beforeAway=away,beforeHome=home,route=routeNames[Math.floor(rng()*routeNames.length)];
    const clock=Math.max(1,15-Math.round((drive*3.65+n*3.65/numPlays)*10)/10);
    const down=Math.min(4,1+n%4);
    const rawGain=pass?(rng()<.28?0:2+Math.floor(rng()*24)):(rng()<.12?-2:1+Math.floor(rng()*12));
    const gain=Math.min(rawGain,100-yard),incomplete=pass&&gain===0,touchdown=gain>0&&yard+gain>=100;
    const startYard=yard;
    yard=Math.max(1,Math.min(100,yard+gain));
    if(touchdown){if(side===game.away.abbr)away+=7;else home+=7}
    const action=pass
     ?(incomplete?passer+' drops back and targets '+playerName+' on a '+route.toLowerCase()+' — incomplete.'
       :passer+' drops back, throws to '+playerName+' on a '+route.toLowerCase()+' — '+gain+' yards'+(touchdown?' and a touchdown!':'.'))
     :(passer+' hands off to '+playerName+', who '+(gain<0?'loses '+Math.abs(gain):'gains '+gain)+' yards'+(touchdown?' for a touchdown!':'.'));
    const clockSec=Math.max(0,Math.round(clock*60));
    const slot=pass?(player?.position==='RB'?2:Math.floor(rng()*4)):2;
    plays.push({index:sequence++,quarter:q,clock:Math.floor(clockSec/60)+':'+String(clockSec%60).padStart(2,'0'),
      side,opponent:opp,down,first:10,yard:startYard,gain,kind:pass?'PASS':'RUSH',
      player:playerName,receiver:pass?playerName:null,carrier:pass?null:playerName,
      passer,qb:passer,route,targetSlot:slot,complete:pass&&!incomplete,
      beforeAway,beforeHome,scoreAway:away,scoreHome:home,
      commentary:action+' (Illustrative play)',td:touchdown});
    if(touchdown)break;
   }
   if(yard<100&&rng()<Math.max(.10,Math.min(.40,mean(side)/65))){
    const beforeAway=away,beforeHome=home;
    if(side===game.away.abbr)away+=3;else home+=3;
    plays.push({index:sequence++,quarter:q,clock:(Math.max(0,11-drive*3))+':09',
      side,opponent:opp,down:4,first:10,yard,gain:0,kind:'FIELD GOAL',
      player:'Kicking unit',passer:'',receiver:null,carrier:null,route:null,targetSlot:null,complete:false,
      beforeAway,beforeHome,scoreAway:away,scoreHome:home,
      commentary:side+' kicking unit converts a field goal. Individual kicker not available in model. (Illustrative play)',td:false});
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

function matchupHTML(game){
 const doc=state.defense;
 if(!doc||doc.season!==2026||!doc.teams)return '';
 const teams=[game.away,game.home];
 const info=teams.map(team=>{
  const record=doc.teams?.[teamCode(team.abbr)];
  const group=[
   ['QB','passYds','QB passing yards'],
   ['RB','rushYds','RB rushing yards'],
   ['WR','recYds','WR receiving yards'],
   ['TE','recYds','TE receiving yards']
  ].map(([pos,field,label])=>{
   const stat=record?.byPosition?.[pos];
   return '<div><small>'+esc(label)+'</small><strong>'+number(stat?.perGame?.[field],1)+'</strong></div>';
  }).join('');
  return '<article><h3>'+esc(team.abbr)+' DEFENSE <span>2026</span></h3><p>Yards allowed per game across all opposing players at each position · '+esc(record?.games||'—')+' observed games</p>'
   +'<div class="tso-sim-dvp-positions">'+group+'</div></article>';
 });
 return '<section class="tso-sim-dvp"><div class="tso-sim-dvp-kicker">2026 DEFENSE VS POSITION · OBSERVED ALLOWANCES</div><div class="tso-sim-dvp-grid">'+info.join('')+'</div></section>';
}
function replayHTML(game){
 return '<div class="tso-sim-replay"><div class="tso-sim-scoreboard">'
  +'<span class="tso-sim-scoreteam"><b>'+esc(game.away.abbr)+'</b><strong data-tsos-away>0</strong></span>'
  +'<div class="tso-sim-scoreclock"><b data-tsos-quarter>Q1</b><strong data-tsos-clock>15:00</strong><small data-tsos-possession>ILLUSTRATIVE REPLAY</small></div>'
  +'<span class="tso-sim-scoreteam is-home"><strong data-tsos-home>0</strong><b>'+esc(game.home.abbr)+'</b></span></div>'
  +'<div class="tso-sim-stadium"><aside class="tso-sim-players">'+featured(game,game.away.abbr).map(playerPill).join('')+'<div class="tso-sim-side-name">'+esc(game.away.abbr)+' PLAYER PROJECTIONS</div></aside>'
  +'<div class="tso-sim-field"><canvas data-tsos-canvas width="960" height="480" aria-label="Animated, illustrative top-down football field"></canvas><div class="tso-sim-field-badge">ANIMATED PROJECTION REPLAY · NOT TRACKED MOVEMENT</div><div class="tso-sim-quarter-overlay" data-tsos-quarter-overlay hidden><span>ILLUSTRATIVE REPLAY</span><strong data-tsos-overlay-quarter>QUARTER 1</strong><small>'+esc(game.away.abbr)+' AT '+esc(game.home.abbr)+'</small></div></div>'
  +'<aside class="tso-sim-players">'+featured(game,game.home.abbr).map(playerPill).join('')+'<div class="tso-sim-side-name">'+esc(game.home.abbr)+' PLAYER PROJECTIONS</div></aside></div>'
  +'<div class="tso-sim-commentary"><span class="tso-sim-play-light"></span><span class="tso-sim-play-copy"><small data-tsos-ball-holder>BALL: SET FOR SNAP</small><b data-tsos-play>Start the illustrated replay for '+esc(game.away.abbr)+' at '+esc(game.home.abbr)+'.</b></div>'
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
  +strip(state.game)+matchupHTML(state.game)+replayHTML(state.game)+'</div></div>';
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
 write('[data-tsos-away]',event.beforeAway??event.scoreAway);write('[data-tsos-home]',event.beforeHome??event.scoreHome);
 write('[data-tsos-possession]',event.side+' POSSESSION · '+event.kind);
 write('[data-tsos-ball-holder]',event.kind==='PASS'?'BALL: '+event.passer+' → '+event.receiver:event.kind==='RUSH'?'BALL: '+event.passer+' → '+event.carrier:'BALL: '+event.side+' KICKING UNIT');
 write('[data-tsos-play]',event.commentary);
 write('[data-tsos-seek-label]',(state.index+1)+' / '+state.plays.length);
 const seek=$(el,'[data-tsos-seek]');if(seek)seek.value=String(state.index);
 const control=$(el,'[data-tsos-play]');if(control)control.textContent=state.playing?'Ⅱ PAUSE':'▶ PLAY';
 const last=state.index===state.plays.length-1&&!state.playing;
 const final=$(el,'[data-tsos-final]');if(final){final.hidden=!last;if(last)final.innerHTML=scenarioFinal();}
}
const simClamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const simEase=t=>{const x=simClamp(t,0,1);return x*x*(3-2*x)};
const simMix=(a,b,t)=>a+(b-a)*simClamp(t,0,1);
function routePoint(style,slot,r,depth){
 // Real route names and plausible illustrated geometry. They are intentionally
 // not claimed to be NFL tracking or a fitted defensive-coverage forecast.
 const origin=[.13,.31,.69,.87][slot]??.5;
 const inward=origin<.5?1:-1,near=origin<.5?.07:.93;
 const t=simClamp(r,0,1);
 let x=depth*t,y=origin;
 switch(style){
  case 'SLANT': y=origin+inward*.22*simEase((t-.21)/.79);break;
  case 'OUT':y=simMix(origin,near,simEase((t-.37)/.63));break;
  case 'POST':y=origin+inward*.26*simEase((t-.44)/.56);break;
  case 'CROSS':y=simMix(origin,origin<.5?.78:.22,simEase((t-.25)/.75));x=depth*(.5*t+.5*simEase(t));break;
  case 'CURL':x=depth*(t<.76?t/.76:1-.26*(t-.76)/.24);break;
  case 'CORNER':y=simMix(origin,near,simEase((t-.5)/.5));break;
  case 'FLAT':x=Math.min(depth,7)*t;y=simMix(origin,near,simEase(t));break;
  default:break; // GO / vertical release
 }
 return {u:x,y:simClamp(y,.065,.935)};
}
function sceneFrame(event,progress,game){
 const p=simClamp(progress,0,1),direction=event.side===game.away.abbr?1:-1;
 const scrimmage=direction===1?event.yard:100-event.yard;
 const world=u=>simClamp(scrimmage+direction*u,0,100);
 const off=[],def=[];
 const pass=event.kind==='PASS',kick=event.kind==='FIELD GOAL';
 const targetSlot=Number.isInteger(event.targetSlot)?event.targetSlot:1;
 const qbDrop=pass?simEase(p/.30)*3:simEase(p/.24)*.6;
 const qb={id:'qb',role:'QB',team:event.side,u:kick?-6:-4.5-qbDrop,y:.5,name:event.passer||'Quarterback'};
 const carrierLane=event.index%2===0?.435:.565;
 let rbU=-9,rbY=.61;
 if(!pass&&!kick){
  rbU=p<.30?simMix(-9,-2,simEase(p/.30)):simMix(-2,event.gain,simEase((p-.30)/.65));
  rbY=p<.38?simMix(.61,carrierLane,simEase(p/.38)):carrierLane;
 }else{
  rbU=simMix(-9,-5,simEase(p/.55));
  rbY=.61;
 }
 const rb={id:'rb',role:'RB',team:event.side,u:rbU,y:rbY,name:!pass&&!kick?event.carrier:'Running back'};
 off.push(qb,rb);
 const olLanes=[.36,.43,.50,.57,.64];
 for(let i=0;i<5;i++){
  const advance=pass?simMix(0,-1.4,simEase((p-.15)/.45)):simMix(0,2,simEase((p-.15)/.45));
  off.push({id:'ol'+i,role:'OL',team:event.side,u:-.9+advance+Math.sin(i*2+event.index)*.5*p,y:olLanes[i],name:null});
 }
 const defaultRoutes=['GO','CROSS','OUT','CURL'],routePaths=[];
 const routeProgress=simClamp((p-.09)/.62,0,1);
 const catchProgress=.71;
 for(let i=0;i<4;i++){
  const target=i===targetSlot,style=target?event.route||'SLANT':defaultRoutes[(i+event.index)%4];
  const depth=target&&event.complete?Math.max(2,Math.min(30,event.gain*.75)):12+i*3.2;
  let pos;
  if(pass){
   const r=simClamp(routeProgress/(catchProgress-.09)*.62,0,1); // route run phase
   pos=routePoint(style,i,r,depth);
   if(target&&event.complete&&p>=catchProgress){
    const after=simEase((p-catchProgress)/.25);
    pos.u=simMix(depth,event.gain,after);
   }
  }else{
   pos={u:simMix(-.5,3+(i%2)*2,simEase((p-.12)/.7)),y:[.13,.31,.69,.87][i]};
  }
  off.push({id:'wr'+i,role:target?'TARGET':'RECEIVER',team:event.side,u:pos.u,y:pos.y,
   name:target?event.receiver:null,route:style});
  routePaths.push({slot:i,target,style,depth,y0:[.13,.31,.69,.87][i]});
 }
 // Four rushers, three linebackers and four defensive backs.
 for(let i=0;i<4;i++){
  const nudge=pass?simMix(1.6,-3.0,simEase((p-.12)/.65)):simMix(1.4,-1.8,simEase((p-.14)/.5));
  def.push({id:'dl'+i,role:'DL',team:event.opponent,u:nudge,y:[.38,.46,.54,.62][i],name:null});
 }
 for(let i=0;i<3;i++){
  let u=pass?simMix(5.3,8.6,simEase((p-.16)/.58)):simMix(5,rbU+1.7,simEase((p-.25)/.65));
  let y=pass?[.31,.5,.69][i]:simMix([.32,.5,.68][i],rbY+(i-1)*.075,simEase((p-.30)/.62));
  if(pass&&p>.57&&i===1){u=simMix(u,off[7+targetSlot].u+1,simEase((p-.57)/.33));y=simMix(y,off[7+targetSlot].y,simEase((p-.57)/.33))}
  def.push({id:'lb'+i,role:'LB',team:event.opponent,u,y,name:null});
 }
 for(let i=0;i<4;i++){
  const wr=off[7+i];
  let u=pass?Math.max(4,wr.u+2.1):simMix(7,rbU+2,simEase((p-.47)/.49));
  let y=pass?simMix([.13,.31,.69,.87][i],wr.y+(i%2?.05:-.05),simEase((p-.1)/.75)):
   simMix([.13,.31,.69,.87][i],rbY+(i-1.5)*.06,simEase((p-.5)/.45));
  def.push({id:'db'+i,role:'DB',team:event.opponent,u,y,name:null});
 }
 for(const p of [...off,...def])p.x=world(p.u);
 let ballOwner='QB',ball={u:qb.u,y:qb.y},flight=false;
 if(kick){
  ballOwner=p>.33?'KICK IN FLIGHT':'KICKING UNIT';
  ball=p>.33?{u:simMix(-5,Math.max(65,100-event.yard),simEase((p-.33)/.6)),y:.5-Math.sin(Math.PI*simClamp((p-.33)/.6,0,1))*.20}:{u:-5,y:.5};
  flight=p>.33;
 }else if(pass){
  const receiver=off[7+targetSlot];
  if(p<.41){ballOwner=event.passer||'QUARTERBACK';ball={u:qb.u,y:qb.y}}
  else if(p<catchProgress){
   const t=simEase((p-.41)/(catchProgress-.41));
   const aimU=event.complete?receiver.u+2:(receiver.u+5);
   const aimY=event.complete?receiver.y:simClamp(receiver.y+.09,.07,.93);
   ball={u:simMix(qb.u,aimU,t),y:simMix(qb.y,aimY,t)-Math.sin(Math.PI*t)*.08};
   ballOwner='PASS IN FLIGHT';flight=true;
  }else{
   ball=event.complete?{u:receiver.u,y:receiver.y}:{u:receiver.u+5,y:simClamp(receiver.y+.10,.07,.93)};
   ballOwner=event.complete?event.receiver:'INCOMPLETE PASS';
   flight=!event.complete;
  }
 }else if(p<.28){
  ballOwner=event.passer||'QB';ball={u:qb.u,y:qb.y};
 }else if(p<.36){
  const t=simEase((p-.28)/.08);
  ball={u:simMix(qb.u,rb.u,t),y:simMix(qb.y,rb.y,t)};
  ballOwner='HANDOFF TO '+event.carrier;
 }else{
  ballOwner=event.carrier||'RUNNER';ball={u:rb.u,y:rb.y};
 }
 ball.x=world(ball.u);
 return {direction,scrimmage,p,offense:off,defense:def,ball,ballOwner,flight,routePaths,
  attacking:event.side,defending:event.opponent,pass,run:!pass&&!kick,targetSlot};
}
function draw(progress=0){
 const canvas=$(state.root,'[data-tsos-canvas]'),event=state.plays[state.index];
 if(!canvas||!event||!state.game)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const frame=sceneFrame(event,progress,state.game),p=frame.p;
 const w=canvas.width,h=canvas.height,fx=40,fy=32,fw=w-80,fh=h-82;
 const xOf=yard=>fx+fw*.07+fw*.86*simClamp(yard,0,100)/100;
 const yOf=y=>fy+fh*simClamp(y,0,1);
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#08131b';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#063928';ctx.fillRect(fx,fy,fw,fh);
 for(let n=0;n<10;n++){ctx.fillStyle=n%2===0?'#104737':'#0e3d30';ctx.fillRect(fx+n*fw/10,fy,fw/10,fh)}
 ctx.fillStyle='#113b71';ctx.fillRect(fx,fy,fw*.07,fh);
 ctx.fillStyle='#342f38';ctx.fillRect(fx+fw*.93,fy,fw*.07,fh);
 ctx.strokeStyle='rgba(215,247,225,.33)';ctx.lineWidth=1.5;
 for(let n=0;n<=20;n++){const x=xOf(n*5);ctx.beginPath();ctx.moveTo(x,fy);ctx.lineTo(x,fy+fh);ctx.stroke()}
 ctx.strokeStyle='#bce6cf';ctx.lineWidth=3;ctx.strokeRect(fx,fy,fw,fh);
 ctx.font='bold 21px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(237,246,240,.6)';
 for(let i=1;i<=9;i++){const yds=i<=5?i*10:(10-i)*10,x=xOf(i*10);ctx.fillText(String(yds),x,fy+35);ctx.fillText(String(yds),x,fy+fh-15)}
 ctx.font='bold 42px system-ui';ctx.fillStyle='rgba(241,247,239,.11)';ctx.fillText('TSO',w/2,fy+fh/2+17);
 ctx.font='bold 25px system-ui';ctx.fillStyle='rgba(236,246,255,.80)';
 ctx.save();ctx.translate(fx+fw*.035,fy+fh/2);ctx.rotate(-Math.PI/2);ctx.fillText(state.game.away.abbr,0,0);ctx.restore();
 ctx.save();ctx.translate(fx+fw*.965,fy+fh/2);ctx.rotate(Math.PI/2);ctx.fillText(state.game.home.abbr,0,0);ctx.restore();
 // First-down marker and scrimmage switch sides with the possession.
 const markerY=frame.scrimmage+frame.direction*Math.min(10,100-event.yard);
 ctx.strokeStyle='#ffdc51';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(xOf(markerY),fy);ctx.lineTo(xOf(markerY),fy+fh);ctx.stroke();
 ctx.strokeStyle='#35d7e7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(xOf(frame.scrimmage),fy);ctx.lineTo(xOf(frame.scrimmage),fy+fh);ctx.stroke();
 // Display distinct passing routes, highlighted for the named intended target.
 if(frame.pass){
  for(const route of frame.routePaths){
   ctx.beginPath();ctx.setLineDash(route.target?[]:[4,7]);ctx.lineWidth=route.target?3:1.8;
   ctx.strokeStyle=route.target?'rgba(252,203,82,.85)':'rgba(175,246,232,.38)';
   for(let step=0;step<=24;step++){
    const at=routePoint(route.style,route.slot,step/24,route.depth),x=xOf(frame.scrimmage+frame.direction*at.u),y=yOf(at.y);
    if(step===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }ctx.stroke();
  }ctx.setLineDash([]);
 }
 // Home and away always keep the same team colors: they do not both
 // advance in the same direction, and defense reacts to receiver routes.
 const teamColor=code=>code===state.game.away.abbr?'#ff8f51':'#72c6ff';
 const all=[...frame.defense,...frame.offense];
 for(const actor of all){
  const x=xOf(actor.x),y=yOf(actor.y),highlight=actor.role==='QB'||actor.role==='TARGET'||(frame.run&&actor.role==='RB');
  ctx.beginPath();ctx.arc(x,y,highlight?9:6.2,0,Math.PI*2);
  ctx.fillStyle=teamColor(actor.team);ctx.fill();
  ctx.lineWidth=highlight?2.6:1.3;
  ctx.strokeStyle=highlight?'#ffe29d':'#052129';ctx.stroke();
  if(actor.role==='TARGET'){
   ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.strokeStyle='rgba(255,227,123,.9)';ctx.lineWidth=1.4;ctx.stroke();
  }
  if(highlight&&actor.name){
   const display=String(actor.name).split(' ').slice(-1)[0];
   ctx.font='bold 14px system-ui';ctx.textAlign='left';ctx.lineWidth=3.7;ctx.strokeStyle='#09201d';
   ctx.strokeText(display,x+14,y-9);ctx.fillStyle='#fff8e3';ctx.fillText(display,x+14,y-9);
  }
 }
 // THE FOOTBALL — visible oval, moving from passer to receiver or from QB
 // to runner during handoff. Gold ring marks the current point of possession.
 const ballX=xOf(frame.ball.x),ballY=yOf(frame.ball.y);
 ctx.beginPath();ctx.arc(ballX,ballY,16,0,Math.PI*2);
 ctx.strokeStyle=frame.flight?'#fff3b7':'#ffee68';ctx.lineWidth=2.5;ctx.stroke();
 ctx.save();ctx.translate(ballX,ballY);
 ctx.rotate(frame.flight?-.35:frame.direction===1?-.6:.6);
 ctx.fillStyle='#a65d22';ctx.strokeStyle='#fff2a4';ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(0,0,12,6.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#fff4ca';ctx.lineWidth=1.7;
 ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.stroke();
 for(let i=-2;i<=2;i+=2){ctx.beginPath();ctx.moveTo(i,-2.5);ctx.lineTo(i,2.5);ctx.stroke()}
 ctx.restore();
 ctx.fillStyle='#d7efe6';ctx.font='bold 14px system-ui';ctx.textAlign='left';
 ctx.fillText('PLAY '+String(event.index+1).padStart(3,'0')+'  |  '+event.kind+'  |  '+event.down+' & '+event.first,fx+12,h-16);
 ctx.textAlign='right';ctx.fillStyle='#ffbb76';
 ctx.fillText((frame.direction===1?'→ ':'← ')+event.side+' OFFENSE',w-fx,h-16);
 const holder=$(state.root,'[data-tsos-ball-holder]'),stateLabel='🏈 '+frame.ballOwner+' · '+event.side+' ATTACKING '+(frame.direction===1?'RIGHT →':'← LEFT');
 if(holder&&holder.textContent!==stateLabel)holder.textContent=stateLabel;
 // Score updates at the end of a successful play, not before the ball is snapped.
 const a=$(state.root,'[data-tsos-away]'),b=$(state.root,'[data-tsos-home]');
 if(a)a.textContent=String(p>=.94?event.scoreAway:event.beforeAway??event.scoreAway);
 if(b)b.textContent=String(p>=.94?event.scoreHome:event.beforeHome??event.scoreHome);
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
  const [response,defense]=await Promise.all([
    fetch('/api/tso-simulations-nfl',{cache:'no-store',headers:{accept:'application/json'}}),
    fetch('/api/nfl-defense-2026',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ]);
  if(!response.ok)throw Error('TSO NFL simulation feed HTTP '+response.status);
  const doc=await response.json();
  state.defense=defense?.season===2026&&defense?.available?defense:null;
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
window.TSO2Simulations={pageHTML,mount,dispose,buildPlays,sceneFrame,routePoint};
})();
