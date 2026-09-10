import { ensureNflPlaystageV886Styles } from './gamecast-v886-styles.js?v=88.6';

function esc(x){return String(x ?? '')}
function clamp(x,a,b){return Math.max(a,Math.min(b,Number.isFinite(+x)?+x:a))}
const TEAM_COLORS={
  ARI:['#97233F','#000000'],ATL:['#A71930','#000000'],BAL:['#241773','#000000'],BUF:['#00338D','#C60C30'],CAR:['#0085CA','#101820'],CHI:['#0B162A','#C83803'],CIN:['#FB4F14','#000000'],CLE:['#311D00','#FF3C00'],DAL:['#003594','#041E42'],DEN:['#FB4F14','#002244'],DET:['#0076B6','#B0B7BC'],GB:['#203731','#FFB612'],HOU:['#03202F','#A71930'],IND:['#002C5F','#A2AAAD'],JAX:['#006778','#101820'],KC:['#E31837','#FFB81C'],LV:['#000000','#A5ACAF'],LAC:['#0080C6','#FFC20E'],LA:['#003594','#FFA300'],MIA:['#008E97','#FC4C02'],MIN:['#4F2683','#FFC62F'],NE:['#002244','#C60C30'],NO:['#D3BC8D','#101820'],NYG:['#0B2265','#A71930'],NYJ:['#125740','#FFFFFF'],PHI:['#004C54','#A5ACAF'],PIT:['#101820','#FFB612'],SF:['#AA0000','#B3995D'],SEA:['#002244','#69BE28'],TB:['#D50A0A','#34302B'],TEN:['#0C2340','#4B92DB'],WAS:['#5A1414','#FFB612']
};
function teamObj(game,side){return (game && game[side]) || {abbr: side==='away'?'AWY':'HOME', name: side==='away'?'Away':'Home', logo:'', record:'0-0'}}
function teamAbbr(game,side){return esc(teamObj(game,side).abbr || teamObj(game,side).code || (side==='away'?'AWY':'HOME')).toUpperCase()}
function teamName(game,side){return esc(teamObj(game,side).name || teamObj(game,side).nickname || teamAbbr(game,side))}
function teamLogo(game,side){return esc(teamObj(game,side).logo || teamObj(game,side).logoUrl || '')}
function teamRecord(game,side){return esc(teamObj(game,side).record || teamObj(game,side).standing || '0-0')}
function getColors(game,side){return TEAM_COLORS[teamAbbr(game,side)] || (side==='away' ? ['#0b345f','#bf2548'] : ['#0d3b73','#218043'])}
function initial(name){return esc(name).trim().slice(0,1).toUpperCase() || 'P'}
function possessionSide(game){
  const raw=String(game?.possession || game?.liveScore?.possession || game?.gamecast?.possession || game?.status?.possession || game?.hasBall || '').toUpperCase();
  const away=teamAbbr(game,'away'); const home=teamAbbr(game,'home');
  if(raw.includes(away) || raw==='AWAY') return 'away';
  if(raw.includes(home) || raw==='HOME') return 'home';
  const text=String(game?.liveNote || game?.statusText || game?.liveScore?.statusText || '').toUpperCase();
  if(text.includes(`${away} HAS THE BALL`) || text.includes(`${away} BALL`)) return 'away';
  if(text.includes(`${home} HAS THE BALL`) || text.includes(`${home} BALL`)) return 'home';
  return 'away';
}
function parseBallOn(game){
  const raw=String(game?.liveScore?.ballOn || game?.fieldPosition || game?.gamecast?.ballOn || game?.ballOn || '').trim();
  const away=teamAbbr(game,'away'); const home=teamAbbr(game,'home');
  let side=possessionSide(game), yard=50;
  const m=raw.match(/([A-Z]{2,3})\s*(\d{1,2})/i);
  if(m){
    const ab=m[1].toUpperCase(); yard=clamp(parseInt(m[2],10),0,50);
    if(ab===away) side='away'; else if(ab===home) side='home';
  } else {
    const m2=raw.match(/(\d{1,2})/); if(m2) yard=clamp(parseInt(m2[1],10),0,50);
  }
  const pct = side==='away' ? 50-yard : 50+yard;
  return {side,yard,pct:clamp(pct,1,99)};
}
function downDistance(game){return esc(game?.liveScore?.downDistance || game?.downDistance || game?.situation || '1st & 10')}
function fieldPos(game){const b=parseBallOn(game); return `${teamAbbr(game,b.side)} ${b.yard}`}
function currentPlay(game){
  const src=game?.currentPlay || game?.liveScore?.currentPlay || game?.gamecast?.currentPlay || {};
  const featured=game?.featuredPlayer || {};
  const playerName=src.playerName || featured.name || game?.liveScore?.playerName || 'Featured Player';
  return {
    title: src.title || game?.liveScore?.playTitle || 'Current Play',
    description: src.description || game?.liveScore?.description || game?.playText || 'Live play-by-play updates animate on the field as each snap comes in.',
    playerName,
    playerPos: src.playerPos || featured.position || game?.liveScore?.playerPos || '',
    playerNo: src.playerNo || featured.number || game?.liveScore?.playerNo || '',
    headshot: src.headshot || featured.headshot || '',
    drivePlays: src.drivePlays || game?.liveScore?.drivePlays || game?.drive?.plays || 4,
    driveYards: src.driveYards || game?.liveScore?.driveYards || game?.drive?.yards || 22,
    driveTime: src.driveTime || game?.liveScore?.driveTime || game?.drive?.time || '2:39',
    featuredStats: src.featuredStats || featured.stats || {},
    driveSummary: Array.isArray(src.driveSummary) && src.driveSummary.length ? src.driveSummary : [
      {text:'6-yd rush',dd:'1st & 10',fp:'NE 14'},
      {text:'12-yd pass',dd:'1st & 10',fp:'NE 26'},
      {text:'4-yd rush',dd:'1st & 10',fp:'NE 30'},
      {text:'Current Play',dd:downDistance(game),fp:fieldPos(game),current:true}
    ],
    chart: Array.isArray(src.chart) && src.chart.length ? src.chart : [44,44,45,46,45,44,49,52,46,43,47,48,49,50,49,53,54,56,58,55,59,61,63,65,68],
    type: String(src.type || src.kind || src.playType || src.category || src.description || '').toLowerCase(),
    targetName: src.targetName || src.receiverName || '',
    resultYards: src.resultYards ?? src.yards ?? game?.liveScore?.yards ?? 0
  }
}
function winProb(game){
  const a = clamp(game?.winProbAway ?? game?.liveScore?.winProbAway ?? game?.prediction?.awayWinPct ?? game?.awayWinPct ?? 68,0,100);
  return {away:Math.round(a), home:Math.round(100-a)};
}
function chartPath(values){
  const pts=(values||[]).map((v,i)=>[i*((100)/Math.max(1,(values.length-1))),78-clamp(v,0,100)*0.58]);
  return pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
}
function hashMarks(){
  const arr=[];
  for(let i=10;i<100;i+=10){
    const n=i===50?50:(i<50?i:100-i);
    arr.push(`<div class="tso-playstage-v886__num" style="left:${i}%">${n}</div>`);
    arr.push(`<div class="tso-playstage-v886__num bottom" style="left:${i}%">${n}</div>`);
  }
  return arr.join('');
}
function defaultFormations(ball){
  const offense=[], defense=[];
  const leftBase=ball-5.5;
  const rightBase=ball+4.8;
  const offRows=[50,46,54,42,58,39,61,34,66,28,72];
  const defRows=[49,44,54,39,59,34,64,28,70,23,76];
  for(let i=0;i<11;i++) offense.push({x:leftBase-(i<5?2.8:0)+(Math.floor(i/3)*0.3), y:offRows[i]});
  for(let i=0;i<11;i++) defense.push({x:rightBase+(i<4?0.8:2.6)-(Math.floor(i/4)*0.18), y:defRows[i]});
  return {offense, defense};
}
function stageGeometry(game){
  const play=currentPlay(game); const poss=possessionSide(game); const ball=parseBallOn(game).pct; const fd=clamp(ball + (poss==='away'? 6 : -6),1,99);
  const base=defaultFormations(ball);
  const type=play.type;
  let route={x1:ball,y1:49,x2:ball+8,y2:30};
  let motion=null;
  let keyIndex=0;
  if(type.includes('run')){ route={x1:ball,y1:48,x2:ball+5,y2:type.includes('left')?36:type.includes('right')?62:48}; keyIndex=3; }
  else if(type.includes('scramble')){ route={x1:ball,y1:50,x2:ball+7,y2:40}; keyIndex=0; }
  else if(type.includes('screen')){ route={x1:ball,y1:50,x2:ball+10,y2:60}; keyIndex=5; motion={x1:ball-4,y1:68,x2:ball-1.2,y2:58}; }
  else if(type.includes('deep')){ route={x1:ball,y1:50,x2:ball+18,y2:26}; keyIndex=8; }
  else if(type.includes('left')){ route={x1:ball,y1:49,x2:ball+10,y2:35}; keyIndex=7; }
  else if(type.includes('middle')){ route={x1:ball,y1:49,x2:ball+9,y2:48}; keyIndex=6; }
  else if(type.includes('right')){ route={x1:ball,y1:49,x2:ball+12,y2:63}; keyIndex=9; }
  else if(type.includes('field goal')){ route={x1:ball,y1:50,x2:ball+17,y2:48}; keyIndex=0; }
  const off=base.offense.map((p,i)=>({ ...p, role:i===0?'qb':(i===keyIndex?'key':'off') }));
  const def=base.defense.map((p,i)=>({ ...p, role:i===3?'key':'def' }));
  const ghosts=[{x:route.x2-4,y:route.y2-4},{x:route.x2-2,y:route.y2-2}];
  const receiver=off[keyIndex] || off[6];
  if(receiver){ receiver.x=route.x2; receiver.y=route.y2; receiver.role='key'; }
  if(off[0]){ off[0].x=ball-2.2; off[0].y=50; }
  const football={x:type.includes('pass')||type.includes('screen')||type.includes('deep')?route.x2-1:ball+1.4, y:type.includes('pass')||type.includes('screen')||type.includes('deep')?route.y2-6:(route.y2||49)-2};
  return {ball,fd,off,def,route,motion,ghosts,football,play};
}
function figureHTML(p,cls,label=''){
  return `<div class="tso-playstage-v886__figure ${cls}" style="left:${p.x}%;top:${p.y}%"><span class="helmet"></span><span class="head"></span><span class="body"></span><span class="arm a1"></span><span class="arm a2"></span><span class="leg l1"></span><span class="leg l2"></span>${label?`<span class="tso-playstage-v886__playerTag">${esc(label)}</span>`:''}</div>`;
}
function logoHTML(url,name){return url?`<img src="${esc(url)}" alt="${esc(name)}">`:''}
function avatarHTML(headshot,name){return headshot?`<img src="${esc(headshot)}" alt="${esc(name)}">`:`<span class="tso-playstage-v886__initial">${initial(name)}</span>`}
function labState(halftime){
  if(halftime?.ready) return {title:'Halftime Lab Ready',sub:`${halftime.games||halftime.gameCount||1} games loaded`};
  if(halftime?.warming || halftime?.eligibleGames?.length) return {title:'Halftime Lab Warming Up',sub:'2:00 warning automation active'};
  return {title:'Halftime Lab Monitoring',sub:'Auto-arms near the 2:00 mark in Q2'};
}
export function renderNflPlaystageV886HTML(game,opts={}){
  ensureNflPlaystageV886Styles();
  const away=teamObj(game,'away'), home=teamObj(game,'home');
  const awayColors=getColors(game,'away'), homeColors=getColors(game,'home');
  const wp=winProb(game); const stage=stageGeometry(game); const play=stage.play; const poss=possessionSide(game); const lab=labState(opts.halftime);
  const routeLeft=Math.min(stage.route.x1,stage.route.x2), routeWidth=Math.abs(stage.route.x2-stage.route.x1);
  const motionLeft=stage.motion?Math.min(stage.motion.x1,stage.motion.x2):0, motionWidth=stage.motion?Math.abs(stage.motion.x2-stage.motion.x1):0;
  return `
  <section class="tso-playstage-v886" data-tso-v886-gamecast style="--away-primary:${awayColors[0]};--away-secondary:${awayColors[1]};--home-primary:${homeColors[0]};--home-secondary:${homeColors[1]}">
    <div class="tso-playstage-v886__hero">
      <div class="tso-playstage-v886__lightsL"></div><div class="tso-playstage-v886__lightsR"></div>
      <div class="tso-playstage-v886__banner"><span>Football lives here</span><b>The Sports Outpost</b><span>Analyze · Predict · Win</span></div>
      <div class="tso-playstage-v886__fieldWrap">
        <div class="tso-playstage-v886__stadium">
          <div class="tso-playstage-v886__crowd"></div>
          <div class="tso-playstage-v886__boards">
            <div class="tso-playstage-v886__board">Football Lives Here</div>
            <div class="tso-playstage-v886__board"><strong>The Sports Outpost</strong></div>
            <div class="tso-playstage-v886__board">Analyze · Predict · Win</div>
          </div>
          <div class="tso-playstage-v886__field">
            <div class="tso-playstage-v886__lightTower tso-playstage-v886__lightTower--left"></div>
            <div class="tso-playstage-v886__lightTower tso-playstage-v886__lightTower--right"></div>
            <div class="tso-playstage-v886__goal tso-playstage-v886__goal--left"><i></i><i></i></div>
            <div class="tso-playstage-v886__goal tso-playstage-v886__goal--right"><i></i><i></i></div>
            <div class="tso-playstage-v886__stage">
              <div class="tso-playstage-v886__shadow"></div>
              <div class="tso-playstage-v886__surface"></div>
              <div class="tso-playstage-v886__endzone tso-playstage-v886__endzone--away"><div class="tso-playstage-v886__endzoneWord">${esc(teamName(game,'away'))}</div></div>
              <div class="tso-playstage-v886__endzone tso-playstage-v886__endzone--home"><div class="tso-playstage-v886__endzoneWord">${esc(teamName(game,'home'))}</div></div>
              <div class="tso-playstage-v886__playfield">
                ${hashMarks()}
                <div class="tso-playstage-v886__los" style="left:${stage.ball}%"></div>
                <div class="tso-playstage-v886__fd" style="left:${stage.fd}%"></div>
                <div class="tso-playstage-v886__route" style="left:${routeLeft}%;top:${Math.min(stage.route.y1,stage.route.y2)}%;width:${Math.max(2,routeWidth)}%;transform:rotate(${Math.atan2(stage.route.y2-stage.route.y1,stage.route.x2-stage.route.x1)}rad)"></div>
                ${stage.motion ? `<div class="tso-playstage-v886__motion" style="left:${motionLeft}%;top:${Math.min(stage.motion.y1,stage.motion.y2)}%;width:${Math.max(1.4,motionWidth)}%;transform:rotate(${Math.atan2(stage.motion.y2-stage.motion.y1,stage.motion.x2-stage.motion.x1)}rad)"></div>`:''}
                ${stage.off.map((p,i)=>figureHTML(p,`offense ${p.role==='key'?'key':''}`, i===0?((play.playerName||'').split(' ').slice(-1)[0]||'QB'):(p.role==='key'?((play.targetName||play.playerName||'').split(' ').slice(-1)[0]||'WR'):''))).join('')}
                ${stage.def.map((p)=>figureHTML(p,`defense ${p.role==='key'?'key':''}`)).join('')}
                ${stage.ghosts.map(g=>figureHTML(g,'offense ghost')).join('')}
                <div class="tso-playstage-v886__ball" style="left:${stage.football.x}%;top:${stage.football.y}%"></div>
              </div>
            </div>
          </div>
          <div class="tso-playstage-v886__legend"><span><i></i>Line of Scrimmage</span><span><i class="fd"></i>First Down</span><span><i class="path"></i>Play Path</span></div>
        </div>
      </div>
    </div>
    <div class="tso-playstage-v886__panels">
      <article class="tso-playstage-v886__panel">
        <div class="tso-playstage-v886__panelTitle">Current Play <span class="tso-playstage-v886__chip">Live</span></div>
        <div class="tso-playstage-v886__playRow"><div class="tso-playstage-v886__avatar">${logoHTML(teamLogo(game, poss), teamName(game, poss)) || avatarHTML(play.headshot,play.playerName)}</div><div><div class="tso-playstage-v886__name">${esc(downDistance(game))} &nbsp;|&nbsp; ${esc(fieldPos(game))}</div><div class="tso-playstage-v886__sub">${esc(play.playerName)} ${play.playerPos ? `· ${esc(play.playerPos)}`:''} ${play.playerNo ? `#${esc(play.playerNo)}`:''}</div></div></div>
        <div class="tso-playstage-v886__copy">${esc(play.description)}</div>
        <div class="tso-playstage-v886__stats"><div class="tso-playstage-v886__stat"><b>${esc(play.drivePlays)}</b><small>Plays</small></div><div class="tso-playstage-v886__stat"><b>${esc(play.driveYards)}</b><small>Yards</small></div><div class="tso-playstage-v886__stat"><b>${esc(play.driveTime)}</b><small>Time</small></div><div class="tso-playstage-v886__stat"><b>${esc(play.resultYards)}</b><small>Yds play</small></div></div>
      </article>
      <article class="tso-playstage-v886__panel">
        <div class="tso-playstage-v886__panelTitle">Featured Player ${logoHTML(teamLogo(game, poss), teamName(game, poss))}</div>
        <div class="tso-playstage-v886__playRow"><div class="tso-playstage-v886__avatar">${avatarHTML(play.headshot,play.playerName)}</div><div><div class="tso-playstage-v886__name">${esc(play.playerName)}</div><div class="tso-playstage-v886__sub">${esc(play.playerPos || 'Skill Player')} ${play.playerNo ? `#${esc(play.playerNo)}`:''}</div></div></div>
        <div class="tso-playstage-v886__stats"><div class="tso-playstage-v886__stat"><b>${esc(play.featuredStats.compAtt || '8/10')}</b><small>Comp/Att</small></div><div class="tso-playstage-v886__stat"><b>${esc(play.featuredStats.yards || '96')}</b><small>Yds</small></div><div class="tso-playstage-v886__stat"><b>${esc(play.featuredStats.td || '0')}</b><small>TD</small></div><div class="tso-playstage-v886__stat"><b>${esc(play.featuredStats.rtg || play.featuredStats.qbr || '118.3')}</b><small>RTG</small></div></div>
      </article>
      <article class="tso-playstage-v886__panel">
        <div class="tso-playstage-v886__panelTitle">Win Probability</div>
        <div class="tso-playstage-v886__wpHeader"><span>${esc(teamName(game,'away'))} ${wp.away}%</span><span>${wp.home}% ${esc(teamName(game,'home'))}</span></div>
        <div class="tso-playstage-v886__chart"><svg viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${chartPath(play.chart)}" fill="none" stroke="#21a9ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="96" cy="${78-clamp((play.chart||[]).slice(-1)[0]||50,0,100)*0.58}" r="4" fill="#4fd2ff"/></svg></div>
        <div class="tso-playstage-v886__wpAxis"><span>1st</span><span>2nd</span><span>3rd</span><span>4th</span></div>
      </article>
      <article class="tso-playstage-v886__panel">
        <div class="tso-playstage-v886__panelTitle">Drive Summary <span style="font-weight:800;color:#b7ddff;text-transform:none;letter-spacing:0">View All ›</span></div>
        <div class="tso-playstage-v886__drive">${play.driveSummary.map(row=>`<div class="tso-playstage-v886__driveRow ${row.current?'current':''}"><i></i><span>${esc(row.text)}</span><small>${esc(row.dd||'')}</small><small>${esc(row.fp||'')}</small></div>`).join('')}</div>
      </article>
    </div>
    <div class="tso-playstage-v886__footer">
      <div class="tso-playstage-v886__brand"><span>The Sports Outpost</span><strong>Different Looks. A Higher Standard.</strong></div>
      <div class="tso-playstage-v886__nav"><span><i>◔</i>Analyze</span><span><i>◎</i>Predict</span><span><i>▷</i>Watch</span><span><i>🏆</i>Win</span></div>
      <div class="tso-playstage-v886__lab"><i>🧪</i><div>${lab.title}<small>${lab.sub}</small></div></div>
    </div>
  </section>`;
}
function patchPossessionInHeader(root,game){
  if(!root || typeof document==='undefined') return;
  root.querySelectorAll('[data-v883a-possession-football],[data-v883b-possession-football],[data-v884-possession-football],[data-v885-possession-football],[data-v886-possession-football],.tso-possession-football').forEach(el=>el.remove());
  const poss=possessionSide(game);
  const selectors= poss==='away'
    ? ['[data-team-name="away"]','[data-v883a-team-name="away"]','[data-v884-team-name="away"]','.team-name.away','.away-team-name']
    : ['[data-team-name="home"]','[data-v883a-team-name="home"]','[data-v884-team-name="home"]','.team-name.home','.home-team-name'];
  let target=null;
  for(const sel of selectors){ target=root.querySelector(sel); if(target) break; }
  if(!target) return;
  const icon=document.createElement('span'); icon.dataset.v886PossessionFootball='1'; icon.className='tso-possession-football'; icon.textContent='🏈';
  if(poss==='home') target.prepend(icon); else target.append(icon);
}
export function mountOrUpdateNflPlaystageV886(root,game,opts={}){
  if(typeof document==='undefined' || !root || !game) return;
  ensureNflPlaystageV886Styles();
  patchPossessionInHeader(root,game);
  const mount=root.querySelector('[data-tso-v886-gamecast-anchor]') || (()=>{
    const el=document.createElement('div'); el.dataset.tsoV886GamecastAnchor='1';
    const host=root.querySelector('[data-tso-gamecast-main], .tso-gamecast-main, .nfl-gamecast-main, .nfl-gamecast, .gamecast-view, main') || root;
    const scoreboard=host.querySelector('[data-score-header], .scoreboard, .tso-scoreboard, .nfl-scoreboard, header');
    if(scoreboard && scoreboard.nextSibling) scoreboard.parentNode.insertBefore(el, scoreboard.nextSibling); else host.prepend(el);
    return el;
  })();
  mount.innerHTML=renderNflPlaystageV886HTML(game,opts);
}
