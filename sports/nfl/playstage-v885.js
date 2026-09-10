function clamp(n,min,max){ n=Number(n); if(!Number.isFinite(n)) n=0; return Math.max(min,Math.min(max,n)); }
function esc(v){ return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
const TEAM_COLORS={
  ARI:['#97233F','#000000'],ATL:['#A71930','#000000'],BAL:['#241773','#111111'],BUF:['#00338D','#C60C30'],CAR:['#0085CA','#101820'],CHI:['#0B162A','#C83803'],CIN:['#FB4F14','#000000'],CLE:['#311D00','#FF3C00'],DAL:['#003594','#041E42'],DEN:['#FB4F14','#002244'],DET:['#0076B6','#B0B7BC'],GB:['#203731','#FFB612'],HOU:['#03202F','#A71930'],IND:['#002C5F','#A2AAAD'],JAX:['#006778','#101820'],KC:['#E31837','#FFB81C'],LV:['#000000','#A5ACAF'],LAC:['#0080C6','#FFC20E'],LA:['#003594','#FFA300'],MIA:['#008E97','#FC4C02'],MIN:['#4F2683','#FFC62F'],NE:['#002244','#C60C30'],NO:['#D3BC8D','#101820'],NYG:['#0B2265','#A71930'],NYJ:['#125740','#FFFFFF'],PHI:['#004C54','#A5ACAF'],PIT:['#101820','#FFB612'],SF:['#AA0000','#B3995D'],SEA:['#002244','#69BE28'],TB:['#D50A0A','#34302B'],TEN:['#0C2340','#4B92DB'],WAS:['#5A1414','#FFB612']
};
function teamPalette(abbr,fallback=['#0d3e75','#092a52']){ return TEAM_COLORS[String(abbr||'').toUpperCase()] || fallback; }
function teamName(g,side){ return esc(g?.[side]?.displayName || g?.[side]?.name || g?.[side]?.abbr || (side==='away'?'Away':'Home')); }
function teamAbbr(g,side){ return esc(g?.[side]?.abbr || (side==='away'?'AWY':'HOME')); }
function teamLogo(g,side){ const t=g?.[side]||{}; return t.logo || t.logoUrl || t.primaryLogo || t.teamLogo || ''; }
function score(g,side){ return esc(g?.score?.[side] ?? g?.[side]?.score ?? 0); }
function weather(g){ return g?.weather || {}; }
function venue(g){ return g?.venue || {}; }
function qClock(g){ return esc(g?.displayClock || g?.clockDisplay || (g?.period ? `${g.period}` : '')); }
function downDistance(g){ return esc(g?.situation?.downDistanceText || g?.downDistance || `${g?.down || 1}${ordinal(g?.down || 1)} & ${g?.distance || 10}`); }
function fieldPos(g){ return esc(g?.situation?.shortText || g?.fieldPosition || `${teamAbbr(g,'away')} ${g?.yardLine ?? 8}`); }
function possessionSide(g){ const poss = String(g?.possession || g?.situation?.possession || '').toUpperCase(); if(poss && poss===String(g?.home?.abbr||'').toUpperCase()) return 'home'; return 'away'; }
function ordinal(n){ n=Number(n)||0; if(n%100>=11&&n%100<=13) return 'th'; return ({1:'st',2:'nd',3:'rd'}[n%10] || 'th'); }
function currentPlay(g){
  const p = g?.currentPlay || g?.lastPlay || {};
  return {
    title: p.title || p.typeText || p.shortText || 'Current Play',
    description: p.description || p.text || 'Live play animation and player intelligence update as the feed changes.',
    playerName: p.playerName || p.primaryPlayerName || g?.featuredPlayer?.name || 'Featured Player',
    playerPos: p.playerPos || p.primaryPlayerPos || g?.featuredPlayer?.position || '',
    playerNo: p.playerNumber || g?.featuredPlayer?.number || '',
    headshot: p.headshot || g?.featuredPlayer?.headshot || g?.featuredPlayer?.image || '',
    winAway: Number(p.winAway ?? g?.winProb?.away ?? 68),
    drivePlays: Number(g?.drive?.plays ?? 4),
    driveYards: Number(g?.drive?.yards ?? 22),
    driveTime: esc(g?.drive?.time || '2:39'),
    featuredStats: g?.featuredPlayer?.stats || { compAtt:'8/10', yards:'96', td:'0', qbr:'118.3' },
    chart: Array.isArray(g?.winProb?.history) ? g.winProb.history : [52,52,54,53,56,58,61,60,63,66,68],
    driveSummary: Array.isArray(g?.drive?.summary) ? g.drive.summary : [
      {text:'6-yd rush', dd:'1st & 10', fp:'NE 14'},
      {text:'12-yd pass', dd:'1st & 10', fp:'NE 26'},
      {text:'4-yd rush', dd:'1st & 10', fp:'NE 30'},
      {text:'Current Play', dd:downDistance(g), fp:fieldPos(g), current:true}
    ],
    halftimeState: g?.halftimeState || 'warming'
  };
}
function yardPercent(g){ const yard = Number(g?.yardLine ?? g?.situation?.yardLine ?? 8); const poss = possessionSide(g); const fromAway = poss==='away' ? 100 - yard : yard; return clamp(fromAway,0,100); }
function startPercent(g){ const s = Number(g?.currentPlay?.startYardLine ?? g?.drive?.startYardLine ?? (g?.yardLine ?? 8) - 6); const poss = possessionSide(g); const fromAway = poss==='away' ? 100 - s : s; return clamp(fromAway,0,100); }
function firstDownPercent(g){ const ball = yardPercent(g); const need = Number(g?.distance ?? g?.situation?.distance ?? 9); const dir = possessionSide(g)==='away' ? 1 : -1; return clamp(ball + dir*need,0,100); }
function lineLeft(p){ return `calc(9% + ${clamp(p,0,100)}% * .82)`; }
function tokenSet(g){
  const ball = yardPercent(g);
  const onLeft = possessionSide(g)==='away';
  const base = clamp(ball,10,90);
  const offense=[]; const defense=[];
  const dir = onLeft ? 1 : -1;
  const x0 = base + dir * -8;
  const x1 = base + dir * -4;
  for(let i=0;i<5;i++) offense.push({x:x0,y:53 + (i-2)*5});
  offense.push({x:x1,y:51});
  offense.push({x:x1+dir*4,y:44,key:true,label:g?.qbName || 'Maye'});
  offense.push({x:base+dir*2,y:59});
  offense.push({x:base+dir*10,y:41,key:true,label:g?.targetName || '#85'});
  offense.push({x:base+dir*15,y:33,ghost:true});
  offense.push({x:base+dir*8,y:68});
  for(let i=0;i<6;i++) defense.push({x:base+dir*3,y:50 + (i-3)*5});
  defense.push({x:base+dir*8,y:43}); defense.push({x:base+dir*8,y:60}); defense.push({x:base+dir*14,y:50}); defense.push({x:base+dir*11,y:68}); defense.push({x:base+dir*13,y:35});
  return { offense, defense };
}
function chartPath(values){
  const arr=(values||[]).map(v=>clamp(v,0,100));
  if(!arr.length) return 'M0,40 L100,40';
  return arr.map((v,i)=>`${i?'L':'M'} ${i*(100/Math.max(1,arr.length-1))},${78 - v*0.55}`).join(' ');
}
function logoHTML(url,alt,cls){ return url ? `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}">` : ''; }
function initialBadge(name){ return `<span>${esc(String(name||'?').trim().slice(0,1).toUpperCase())}</span>`; }
function makeTokenHTML(t,cls,index){
  const label=t.label ? `<div class="tso-playstage-v885__tokenLabel">${esc(t.label)}</div>` : '';
  const ghost = t.ghost ? ' style="opacity:.35"' : '';
  return `<div class="tso-playstage-v885__token ${cls}${t.key?' tso-playstage-v885__token--key':''}" data-token="${cls.includes('--off')?'off':'def'}-${index}"${ghost} style="left:${t.x}%;top:${t.y}%">${label}</div>`;
}
function hashNumberHTML(){
  let html='';
  [10,20,30,40,50,40,30,20,10].forEach((n,i)=>{
    const p=10 + i*10;
    html += `<div class="tso-playstage-v885__number" style="left:${p}%">${n}</div>`;
    html += `<div class="tso-playstage-v885__number bottom" style="left:${p}%">${n}</div>`;
  });
  return html;
}
function labCopy(state){
  if(state==='ready') return {title:'Halftime Lab Ready', sub:'50K live simulations complete'};
  if(state==='live') return {title:'Halftime Lab Live', sub:'Open multi-game halftime builder'};
  return {title:'Halftime Lab Warming Up', sub:'2:00 warning automation active'};
}
export function renderNflPlaystageV885HTML(game,opts={}){
  const awayPalette=teamPalette(game?.away?.abbr,['#0d3e75','#092a52']);
  const homePalette=teamPalette(game?.home?.abbr,['#0d3e75','#092a52']);
  const play=currentPlay(game);
  const ball=yardPercent(game); const start=startPercent(game); const fd=firstDownPercent(game);
  const poss=possessionSide(game); const wpAway=clamp(play.winAway,0,100); const wpHome=100-wpAway;
  const tokens=tokenSet(game);
  const stageBallTop = 45;
  const pathLeft=Math.min(start,ball), pathWidth=Math.max(2,Math.abs(ball-start));
  const w=weather(game); const v=venue(game); const lab=labCopy(play.halftimeState);
  return `<section class="tso-playstage-v885" data-tso-v885-gamecast>
    <div class="tso-playstage-v885__hero" style="--away-primary:${awayPalette[0]};--away-secondary:${awayPalette[1]};--home-primary:${homePalette[0]};--home-secondary:${homePalette[1]}">
      <div class="tso-playstage-v885__lights"></div>
      <div class="tso-playstage-v885__banner"><span>Football lives here</span><b>The Sports Outpost</b><span>Analyze · Predict · Win</span></div>
      <div class="tso-playstage-v885__fieldWrap">
        <div class="tso-playstage-v885__field">
          <div class="tso-playstage-v885__crowd"></div>
          <div class="tso-playstage-v885__sideline"></div>
          <div class="tso-playstage-v885__surface">
            <div class="tso-playstage-v885__endzone tso-playstage-v885__endzone--away">${logoHTML(teamLogo(game,'away'),teamName(game,'away'),'tso-playstage-v885__logoMark')}<div class="tso-playstage-v885__endzoneName">${teamName(game,'away')}</div></div>
            <div class="tso-playstage-v885__playfield">
              <div class="tso-playstage-v885__hashes">${hashNumberHTML()}</div>
              <div class="tso-playstage-v885__los" style="left:${ball}%"></div>
              <div class="tso-playstage-v885__fd" style="left:${fd}%"></div>
              <div class="tso-playstage-v885__path" style="left:${pathLeft}%;width:${pathWidth}%"><i class="tso-playstage-v885__pathArrow"></i></div>
              ${tokens.offense.map((t,i)=>makeTokenHTML(t,'tso-playstage-v885__token--off',i)).join('')}
              ${tokens.defense.map((t,i)=>makeTokenHTML(t,'tso-playstage-v885__token--def',i)).join('')}
              <div class="tso-playstage-v885__ball" data-v885-ball style="left:${ball}%;top:${stageBallTop}%"></div>
            </div>
            <div class="tso-playstage-v885__endzone tso-playstage-v885__endzone--home">${logoHTML(teamLogo(game,'home'),teamName(game,'home'),'tso-playstage-v885__logoMark')}<div class="tso-playstage-v885__endzoneName">${teamName(game,'home')}</div></div>
          </div>
        </div>
        <div class="tso-playstage-v885__legend"><span><i></i>Line of Scrimmage</span><span><i class="fd"></i>First Down</span><span><i class="path"></i>Play Path</span></div>
      </div>
    </div>
    <div class="tso-playstage-v885__panels">
      <article class="tso-playstage-v885__panel">
        <div class="tso-playstage-v885__panelTitle">Current Play <span class="tso-playstage-v885__liveChip">Live</span></div>
        <div class="tso-playstage-v885__playerLine">
          <div class="tso-playstage-v885__avatar">${play.headshot ? `<img src="${esc(play.headshot)}" alt="${esc(play.playerName)}">` : initialBadge(play.playerName)}</div>
          <div><div class="tso-playstage-v885__name">${downDistance(game)} &nbsp;|&nbsp; ${fieldPos(game)}</div><div class="tso-playstage-v885__sub">${esc(play.playerName)} ${play.playerPos ? `· ${esc(play.playerPos)} ${play.playerNo ? `#${esc(play.playerNo)}`:''}`:''}</div></div>
        </div>
        <div class="tso-playstage-v885__copy">${esc(play.description)}</div>
        <div class="tso-playstage-v885__metrics">
          <div class="tso-playstage-v885__metric"><b>${play.drivePlays} plays</b><small>Drive</small></div>
          <div class="tso-playstage-v885__metric"><b>${play.driveYards} yards</b><small>Yards</small></div>
          <div class="tso-playstage-v885__metric"><b>${play.driveTime}</b><small>Time</small></div>
        </div>
      </article>
      <article class="tso-playstage-v885__panel">
        <div class="tso-playstage-v885__panelTitle">Featured Player ${logoHTML(teamLogo(game, poss), teamName(game, poss), 'tso-playstage-v885__logoMark')}</div>
        <div class="tso-playstage-v885__playerLine">
          <div class="tso-playstage-v885__avatar">${(play.headshot || game?.featuredPlayer?.headshot) ? `<img src="${esc(play.headshot || game?.featuredPlayer?.headshot)}" alt="${esc(play.playerName)}">` : initialBadge(play.playerName)}</div>
          <div><div class="tso-playstage-v885__name">${esc(play.playerName)}</div><div class="tso-playstage-v885__sub">${esc(play.playerPos || game?.featuredPlayer?.position || '')} ${game?.featuredPlayer?.number ? `#${esc(game.featuredPlayer.number)}`:''}</div></div>
        </div>
        <div class="tso-playstage-v885__statline">
          <div class="tso-playstage-v885__metric"><b>${esc(play.featuredStats.compAtt || '8/10')}</b><small>Comp/Att</small></div>
          <div class="tso-playstage-v885__metric"><b>${esc(play.featuredStats.yards || '96')}</b><small>Yds</small></div>
          <div class="tso-playstage-v885__metric"><b>${esc(play.featuredStats.td || '0')}</b><small>TD</small></div>
          <div class="tso-playstage-v885__metric"><b>${esc(play.featuredStats.qbr || play.featuredStats.rtg || '118.3')}</b><small>RTG</small></div>
        </div>
      </article>
      <article class="tso-playstage-v885__panel">
        <div class="tso-playstage-v885__panelTitle">Win Probability</div>
        <div class="tso-playstage-v885__wp"><div class="tso-playstage-v885__wpTeam">${logoHTML(teamLogo(game,'away'),teamName(game,'away'),'tso-playstage-v885__logoMark')}<span class="tso-playstage-v885__wpValue">${wpAway}%</span></div><div class="tso-playstage-v885__wpTeam"><span class="tso-playstage-v885__wpValue">${wpHome}%</span>${logoHTML(teamLogo(game,'home'),teamName(game,'home'),'tso-playstage-v885__logoMark')}</div></div>
        <div class="tso-playstage-v885__chart"><svg viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${chartPath(play.chart)}" fill="none" stroke="#1ea0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="100" cy="${78 - clamp(play.chart[play.chart.length-1]||50,0,100)*0.55}" r="4" fill="#40c4ff"/></svg></div>
      </article>
      <article class="tso-playstage-v885__panel">
        <div class="tso-playstage-v885__panelTitle">Drive Summary <span style="font-weight:800;color:#b7ddff;text-transform:none;letter-spacing:0">View All ›</span></div>
        <div class="tso-playstage-v885__summary">${play.driveSummary.map(row => `<div class="tso-playstage-v885__summaryRow${row.current?' current':''}"><i></i><span>${esc(row.text)}</span><small>${esc(row.dd||'')}</small><small>${esc(row.fp||'')}</small></div>`).join('')}</div>
      </article>
    </div>
    <div class="tso-playstage-v885__footer">
      <div class="tso-playstage-v885__brand"><span>The Sports Outpost</span><strong>Different looks. A higher standard.</strong></div>
      <div class="tso-playstage-v885__footerNav"><span><i>◔</i>Analyze</span><span><i>◎</i>Predict</span><span><i>▷</i>Watch</span><span><i>🏆</i>Win</span></div>
      <div class="tso-playstage-v885__lab"><i>🧪</i><div>${lab.title}<small>${lab.sub}</small></div></div>
    </div>
  </section>`;
}
function findGamecastHost(root){
  const selectors=[
    '[data-tso-gamecast-main]', '.tso-gamecast-main', '.nfl-gamecast-main', '.nfl-gamecast', '.gamecast-view', '.gamecast-shell', '.nfl-preview-gamecast', '.game-view-panel', 'main'
  ];
  for(const sel of selectors){ const node=root.querySelector(sel); if(node) return node; }
  return root;
}
function hideLegacyField(host){
  host.querySelectorAll('.tso-3d-field-wrap,.tso-drive-panel,.nfl-field-overlay,[data-v883b-field],[data-v884-field],[data-v885-hide-old],.tso-gamecast-field,.tso-current-drive-panel').forEach(el=>{ el.style.display='none'; el.dataset.v885HideOld='1'; });
}
function patchPossessionInHeader(root,game){
  root.querySelectorAll('[data-v883a-possession-football],[data-v883b-possession-football],[data-v884-possession-football],[data-v885-possession-football],.tso-possession-football').forEach(el=>el.remove());
  const poss = possessionSide(game);
  const candidates = {
    away:[...root.querySelectorAll('[data-team-name="away"], [data-v883a-team-name="away"], [data-v884-team-name="away"], .team-name.away, .away-team-name')],
    home:[...root.querySelectorAll('[data-team-name="home"], [data-v883a-team-name="home"], [data-v884-team-name="home"], .team-name.home, .home-team-name')]
  };
  const target=(candidates[poss]||[])[0];
  if(!target) return;
  const icon=document.createElement('span');
  icon.dataset.v885PossessionFootball='1';
  icon.className='tso-possession-football';
  icon.textContent='🏈';
  icon.style.margin = poss==='away' ? '0 0 0 8px' : '0 8px 0 0';
  if(poss==='home') target.prepend(icon); else target.append(icon);
}
export function mountOrUpdateNflPlaystageV885(root,game,opts={}){
  if(typeof document==='undefined' || !root || !game) return;
  const host=findGamecastHost(root);
  if(!host) return;
  hideLegacyField(host);
  patchPossessionInHeader(root,game);
  let mount=host.querySelector('[data-tso-v885-gamecast-anchor]');
  if(!mount){
    mount=document.createElement('div');
    mount.dataset.tsoV885GamecastAnchor='1';
    const scoreboard=host.querySelector('[data-score-header], .scoreboard, .tso-scoreboard, .nfl-scoreboard, header');
    if(scoreboard && scoreboard.nextSibling) scoreboard.parentNode.insertBefore(mount,scoreboard.nextSibling);
    else host.prepend(mount);
  }
  const html=renderNflPlaystageV885HTML(game,opts);
  if(!mount.firstElementChild){
    mount.innerHTML=html;
    return;
  }
  const prev=mount.firstElementChild;
  const next=document.createElement('div');
  next.innerHTML=html;
  const fresh=next.firstElementChild;
  // update primary moving elements without hard reflow
  const oldBall=prev.querySelector('[data-v885-ball]');
  const newBall=fresh.querySelector('[data-v885-ball]');
  const oldLos=prev.querySelector('.tso-playstage-v885__los');
  const newLos=fresh.querySelector('.tso-playstage-v885__los');
  const oldFd=prev.querySelector('.tso-playstage-v885__fd');
  const newFd=fresh.querySelector('.tso-playstage-v885__fd');
  if(oldBall && newBall){ oldBall.style.left=newBall.style.left; oldBall.style.top=newBall.style.top; }
  if(oldLos && newLos) oldLos.style.left=newLos.style.left;
  if(oldFd && newFd) oldFd.style.left=newFd.style.left;
  fresh.querySelectorAll('[data-token]').forEach((token,idx)=>{
    const old=prev.querySelector(`[data-token="${token.getAttribute('data-token')}"]`);
    if(old){ old.style.left=token.style.left; old.style.top=token.style.top; }
  });
  setTimeout(()=>{ mount.innerHTML=html; }, 80);
}
