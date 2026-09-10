
import { ensureNflPlaystageV886DStyles } from './gamecast-v886d-styles.js';

const TEAM_COLORS={NE:['#002244','#C60C30'],SEA:['#002244','#69BE28'],BUF:['#00338D','#C60C30'],KC:['#E31837','#FFB81C'],BAL:['#241773','#000000'],CIN:['#FB4F14','#000000'],DAL:['#003594','#041E42'],PHI:['#004C54','#A5ACAF'],SF:['#AA0000','#B3995D'],GB:['#203731','#FFB612'],DET:['#0076B6','#B0B7BC'],CHI:['#0B162A','#C83803'],PIT:['#101820','#FFB612'],NYG:['#0B2265','#A71930'],NYJ:['#125740','#FFFFFF'],MIA:['#008E97','#FC4C02'],TB:['#D50A0A','#34302B'],MIN:['#4F2683','#FFC62F'],NO:['#D3BC8D','#101820'],LAC:['#0080C6','#FFC20E'],DEN:['#FB4F14','#002244'],LV:['#000000','#A5ACAF'],ARI:['#97233F','#000000'],ATL:['#A71930','#000000'],CAR:['#0085CA','#101820'],CLE:['#311D00','#FF3C00'],HOU:['#03202F','#A71930'],IND:['#002C5F','#A2AAAD'],JAX:['#006778','#101820'],LA:['#003594','#FFA300'],TEN:['#0C2340','#4B92DB'],WAS:['#5A1414','#FFB612']};

const SCENE={w:1672,h:415,topY:91,bottomY:402,leftTop:170,rightTop:1502,leftBottom:0,rightBottom:1672};
const FIELD={total:120,leftEnd:10,play:100,rightEnd:10};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const t=(g,s)=>(g&&g[s])||{};
const ab=(g,s)=>esc(t(g,s).abbr||t(g,s).code||(s==='away'?'AWY':'HOME')).toUpperCase();
const name=(g,s)=>esc(t(g,s).name||t(g,s).nickname||ab(g,s));
const logo=(g,s)=>esc(t(g,s).logo||t(g,s).logoUrl||'');
const colors=(g,s)=>TEAM_COLORS[ab(g,s)]||['#0d3b73','#2b7a2f'];
const init=n=>esc(n).trim().slice(0,1).toUpperCase()||'P';

function possessionSide(g){
  const away=ab(g,'away'),home=ab(g,'home');
  const p=String(g?.liveScore?.possession??g?.possession??g?.hasBall??'').toUpperCase();
  if(p==='AWAY'||p===away||p.includes(away)) return 'away';
  if(p==='HOME'||p===home||p.includes(home)) return 'home';
  const note=String(g?.liveNote||g?.statusText||'').toUpperCase();
  if(note.includes(`${away} HAS THE BALL`)||note.includes(`${away} BALL`)) return 'away';
  if(note.includes(`${home} HAS THE BALL`)||note.includes(`${home} BALL`)) return 'home';
  return 'away';
}

function ballState(g){
  const raw=String(g?.liveScore?.ballOn||g?.fieldPosition||g?.ballOn||'').trim();
  const away=ab(g,'away'),home=ab(g,'home');
  let fieldYard=50,labelSide=null,yard=50;
  const m=raw.match(/([A-Z]{2,3})\s*(\d{1,2})/i);
  if(m){
    labelSide=m[1].toUpperCase(); yard=clamp(parseInt(m[2],10),0,50);
    if(labelSide===away) fieldYard=yard;
    else if(labelSide===home) fieldYard=100-yard;
  } else {
    const own=Number(g?.liveScore?.yardFromOwn);
    const poss=g?.liveScore?.possession;
    if(Number.isFinite(own) && (poss==='away'||poss==='home')){
      fieldYard=poss==='away'?clamp(own,0,100):100-clamp(own,0,100);
      labelSide=fieldYard<=50?away:home;
      yard=fieldYard<=50?fieldYard:100-fieldYard;
    }
  }
  return {fieldYard:clamp(fieldYard,0,100),yard,labelSide};
}

const dd=g=>esc(g?.liveScore?.downDistance||g?.downDistance||'1st & 10');
const fp=g=>{const b=ballState(g);return b.labelSide?`${b.labelSide} ${b.yard}`:'50'};

function play(g,opts={}){
  const p=g?.currentPlay||g?.liveScore?.currentPlay||{},f=opts.player||g?.featuredPlayer||{};
  return {
    desc:p.description||g?.liveScore?.description||g?.playText||g?.liveScore?.lastPlayText||'Live play animation updates every snap.',
    name:p.playerName||f.name||'Featured Player',
    pos:p.playerPos||f.pos||f.position||'QB',
    no:p.playerNo||f.number||'',
    head:p.headshot||f.headshot||'',
    target:p.targetName||p.receiverName||'',
    type:String(p.type||p.kind||p.playType||p.description||g?.liveScore?.lastPlayText||'pass').toLowerCase(),
    drivePlays:p.drivePlays||g?.drive?.plays||g?.liveScore?.currentDrive?.plays?.length||4,
    driveYards:p.driveYards||g?.drive?.yards||22,
    driveTime:p.driveTime||g?.drive?.time||g?.liveScore?.currentDrive?.elapsedDisplay||'2:39',
    playYards:p.resultYards??p.yards??0,
    stats:p.featuredStats||f.stats||{compAtt:'—',yards:'—',td:'—',rtg:'—'},
    drive:Array.isArray(p.driveSummary)&&p.driveSummary.length?p.driveSummary:[
      {text:'6-yd rush',dd:'1st & 10',fp:'NE 14'},
      {text:'12-yd pass',dd:'1st & 10',fp:'NE 26'},
      {text:'4-yd rush',dd:'1st & 10',fp:'NE 30'},
      {text:'Current Play',dd:dd(g),fp:fp(g),current:true}
    ],
    chart:Array.isArray(p.chart)&&p.chart.length?p.chart:[44,46,45,48,47,53,49,52,55,58,57,61,63,66,68]
  };
}

function scenePoint(absYard,lateral){
  const u=clamp(absYard,0,120)/120;
  const v=clamp(lateral,0,1);
  const y=SCENE.topY+(SCENE.bottomY-SCENE.topY)*v;
  const left=SCENE.leftTop+(SCENE.leftBottom-SCENE.leftTop)*v;
  const right=SCENE.rightTop+(SCENE.rightBottom-SCENE.rightTop)*v;
  return {x:left+(right-left)*u,y};
}
function lineAt(absYard){
  const a=scenePoint(absYard,0),b=scenePoint(absYard,1);
  return {x1:a.x,y1:a.y,x2:b.x,y2:b.y};
}
function polyForRange(y0,y1){
  const a=scenePoint(y0,0),b=scenePoint(y1,0),c=scenePoint(y1,1),d=scenePoint(y0,1);
  return `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;
}
function fieldYardToAbs(fieldYard){return 10+clamp(fieldYard,0,100)}
function yardLabel(fieldYard){return fieldYard===50?50:Math.min(fieldYard,100-fieldYard)}

function fieldSvg(g){
  const ac=colors(g,'away'),hc=colors(g,'home');
  let lines='',hashes='',nums='';
  for(let fy=0;fy<=100;fy+=5){
    const L=lineAt(10+fy);
    lines+=`<line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="${fy%10===0?'rgba(255,255,255,.75)':'rgba(255,255,255,.38)'}" stroke-width="${fy%10===0?2.2:1.2}"/>`;
  }
  for(let fy=1;fy<100;fy++){
    if(fy%5===0) continue;
    for(const lat of [0.36,0.64]){
      const p=scenePoint(10+fy,lat);
      hashes+=`<line x1="${p.x-3.5}" y1="${p.y}" x2="${p.x+3.5}" y2="${p.y}" stroke="rgba(255,255,255,.72)" stroke-width="1.6"/>`;
    }
  }
  for(let fy=10;fy<=90;fy+=10){
    const label=yardLabel(fy);
    const top=scenePoint(10+fy,0.16),bottom=scenePoint(10+fy,0.88);
    nums+=`<text x="${top.x}" y="${top.y}" fill="rgba(255,255,255,.92)" font-family="Arial Narrow,Impact,sans-serif" font-size="24" font-weight="900" text-anchor="middle" transform="rotate(180 ${top.x} ${top.y})">${label}</text>`;
    nums+=`<text x="${bottom.x}" y="${bottom.y}" fill="rgba(255,255,255,.92)" font-family="Arial Narrow,Impact,sans-serif" font-size="24" font-weight="900" text-anchor="middle">${label}</text>`;
  }

  const awayLogo=logo(g,'away'),homeLogo=logo(g,'home');
  const al=scenePoint(5,0.28),hl=scenePoint(115,0.28);
  const mid=scenePoint(60,.93);
  const topA=scenePoint(0,0),topB=scenePoint(120,0),botB=scenePoint(120,1),botA=scenePoint(0,1);

  return `
  <svg class="tso-ps886d__fieldSvg" viewBox="0 0 ${SCENE.w} ${SCENE.h}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="grass886d" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#347e32"/><stop offset="55%" stop-color="#2f7b30"/><stop offset="100%" stop-color="#235f27"/></linearGradient>
      <linearGradient id="away886d" x1="0" x2="1"><stop offset="0%" stop-color="${ac[0]}"/><stop offset="100%" stop-color="${ac[1]}"/></linearGradient>
      <linearGradient id="home886d" x1="0" x2="1"><stop offset="0%" stop-color="${hc[1]}"/><stop offset="100%" stop-color="${hc[0]}"/></linearGradient>
      <filter id="glow886d"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <polygon points="${topA.x},${topA.y} ${topB.x},${topB.y} ${botB.x},${botB.y} ${botA.x},${botA.y}" fill="url(#grass886d)"/>
    <polygon points="${polyForRange(0,10)}" fill="url(#away886d)"/>
    <polygon points="${polyForRange(110,120)}" fill="url(#home886d)"/>
    ${lines}
    ${hashes}
    ${nums}
    <text x="${scenePoint(5,.57).x}" y="${scenePoint(5,.57).y}" fill="#fff" font-family="Impact,Arial Narrow,sans-serif" font-size="38" font-weight="900" text-anchor="middle" transform="rotate(-90 ${scenePoint(5,.57).x} ${scenePoint(5,.57).y})">${esc(name(g,'away')).toUpperCase()}</text>
    <text x="${scenePoint(115,.57).x}" y="${scenePoint(115,.57).y}" fill="#fff" font-family="Impact,Arial Narrow,sans-serif" font-size="38" font-weight="900" text-anchor="middle" transform="rotate(90 ${scenePoint(115,.57).x} ${scenePoint(115,.57).y})">${esc(name(g,'home')).toUpperCase()}</text>
    ${awayLogo?`<image href="${awayLogo}" x="${al.x-28}" y="${al.y-22}" width="56" height="44" preserveAspectRatio="xMidYMid meet"/>`:''}
    ${homeLogo?`<image href="${homeLogo}" x="${hl.x-28}" y="${hl.y-22}" width="56" height="44" preserveAspectRatio="xMidYMid meet"/>`:''}
    <rect x="${mid.x-35}" y="${mid.y-13}" width="70" height="26" rx="5" fill="rgba(8,46,76,.82)"/>
    <text x="${mid.x}" y="${mid.y+6}" fill="#83d8ff" font-family="Arial,sans-serif" font-size="22" font-weight="900" text-anchor="middle">TSO</text>
  </svg>`;
}

function actorPalette(side,g){
  const c=colors(g,side);
  if(side==='away') return {helmet:'#f5f7fb',jersey:c[0],accent:c[1],pants:'#f4f6fb',sock:c[0]};
  return {helmet:c[0],jersey:c[0],accent:c[1],pants:c[1],sock:c[0]};
}

function chibiSvg(palette,number=''){
  return `
  <svg viewBox="0 0 72 98" aria-hidden="true">
    <defs>
      <linearGradient id="helm" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="42%" stop-color="${palette.helmet}"/><stop offset="100%" stop-color="#808a96"/></linearGradient>
      <linearGradient id="jersey" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="${palette.accent}"/><stop offset="25%" stop-color="${palette.jersey}"/><stop offset="82%" stop-color="${palette.jersey}"/><stop offset="100%" stop-color="#06162b"/></linearGradient>
      <linearGradient id="pants" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${palette.pants}"/><stop offset="100%" stop-color="#b7c0cc"/></linearGradient>
      <radialGradient id="skin" cx="35%" cy="30%"><stop offset="0%" stop-color="#ffd6b9"/><stop offset="100%" stop-color="#b96f50"/></radialGradient>
    </defs>
    <ellipse cx="36" cy="92" rx="19" ry="5.5" fill="rgba(0,0,0,.30)"/>
    <path d="M18 54 C22 41 50 41 54 54 L51 72 C45 80 27 80 21 72Z" fill="url(#jersey)" stroke="rgba(255,255,255,.38)" stroke-width="1.4"/>
    <path d="M22 70 L33 70 L31 89 L22 89Z" fill="url(#pants)"/><path d="M39 70 L50 70 L50 89 L41 89Z" fill="url(#pants)"/>
    <path d="M25 86 L23 94 L32 94 L33 86Z" fill="${palette.sock}"/><path d="M40 86 L40 94 L49 94 L47 86Z" fill="${palette.sock}"/>
    <path d="M18 56 L8 69" stroke="url(#skin)" stroke-width="7" stroke-linecap="round"/><path d="M54 56 L64 69" stroke="url(#skin)" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="36" cy="33" rx="18" ry="20" fill="url(#skin)" stroke="rgba(0,0,0,.15)"/>
    <path d="M17 31 C17 9 55 9 55 31 L55 37 L17 37Z" fill="url(#helm)" stroke="rgba(255,255,255,.75)" stroke-width="1.5"/>
    <path d="M18 29 C24 24 48 24 54 29" fill="none" stroke="#dfe8ee" stroke-width="3.2"/>
    <path d="M21 32 H52 M24 23 V42 M48 23 V42" stroke="#a8b3bd" stroke-width="1.9" fill="none" opacity=".95"/>
    <circle cx="29" cy="35" r="3.4" fill="#0a1422"/><circle cx="43" cy="35" r="3.4" fill="#0a1422"/><circle cx="28" cy="34" r="1.2" fill="#fff"/><circle cx="42" cy="34" r="1.2" fill="#fff"/>
    <path d="M31 43 C34 46 38 46 41 43" fill="none" stroke="#6b2f24" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M20 52 H52" stroke="${palette.accent}" stroke-width="2.6" opacity=".9"/>
    ${number?`<text x="36" y="66" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="15" font-weight="900" fill="#fff" stroke="${palette.accent}" stroke-width=".7">${esc(number)}</text>`:''}
  </svg>`;
}

function formation(g,opts={}){
  const P=play(g,opts),B=ballState(g),poss=possessionSide(g),attack=poss==='away'?1:-1;
  const los=B.fieldYard,dist=clamp(Number(g?.liveScore?.distance)||8,1,30),fd=clamp(los+attack*dist,0,100);
  const qb={fy:clamp(los-7*attack,0,100),lat:.66,label:(P.name||'QB').split(' ').slice(-1)[0],number:P.no||''};
  const off=[
    qb,
    {fy:los-3.8*attack,lat:.56},{fy:los-3.1*attack,lat:.51},{fy:los-2.4*attack,lat:.46},{fy:los-1.7*attack,lat:.41},{fy:los-.8*attack,lat:.36},
    {fy:los+1.5*attack,lat:.76},{fy:los+3.8*attack,lat:.63},
    {fy:los+10*attack,lat:.34},{fy:los+13*attack,lat:.24},{fy:los+14*attack,lat:.82}
  ];
  const def=[
    {fy:los-.3*attack,lat:.34},{fy:los+.6*attack,lat:.40},{fy:los+1.5*attack,lat:.46},{fy:los+2.4*attack,lat:.52},{fy:los+3.3*attack,lat:.58},
    {fy:los+5.2*attack,lat:.30},{fy:los+6.5*attack,lat:.64},{fy:los+10.5*attack,lat:.22},{fy:los+11.3*attack,lat:.42},{fy:los+12.5*attack,lat:.63},{fy:los+13.2*attack,lat:.80}
  ];
  let target=8,routeEnd={fy:off[8].fy,lat:.30};
  if(P.type.includes('screen')){target=10;routeEnd={fy:off[10].fy,lat:.78}}
  else if(P.type.includes('left')){target=9;routeEnd={fy:off[9].fy,lat:.23}}
  else if(P.type.includes('middle')){target=7;routeEnd={fy:clamp(off[7].fy+7*attack,0,100),lat:.50}}
  else if(P.type.includes('run')){target=7;routeEnd={fy:clamp(off[7].fy+8*attack,0,100),lat:.58}}
  off[target]={...off[target],key:true,label:(P.target||P.name||'WR').split(' ').slice(-1)[0]};
  const ghosts=[{fy:routeEnd.fy-2*attack,lat:routeEnd.lat+.02},{fy:routeEnd.fy-4*attack,lat:routeEnd.lat+.04}];
  const ball=P.type.includes('run')?{fy:routeEnd.fy-.7*attack,lat:routeEnd.lat}:{fy:routeEnd.fy,lat:routeEnd.lat-.05};
  return {P,los,fd,off,def,ghosts,ball,poss,attack,routeStart:{fy:qb.fy,lat:qb.lat},routeEnd};
}

function actorHtml(g,side,p,{ghost=false}={}){
  const point=scenePoint(fieldYardToAbs(p.fy),p.lat);
  const scale=(.76+p.lat*.55)*(p.key?1.08:1);
  const pal=actorPalette(side,g);
  return `<div class="tso-ps886d__actor${p.key?' key':''}${ghost?' ghost':''}" style="left:${(point.x/SCENE.w*100).toFixed(4)}%;top:${(point.y/SCENE.h*100).toFixed(4)}%;--scale:${scale.toFixed(3)}">${chibiSvg(pal,p.number||'')}${p.label?`<span class="tso-ps886d__actorLabel">${esc(p.label)}</span>`:''}</div>`;
}

function overlaySvg(g,F){
  const los=lineAt(fieldYardToAbs(F.los)),fd=lineAt(fieldYardToAbs(F.fd));
  const a=scenePoint(fieldYardToAbs(F.routeStart.fy),F.routeStart.lat),b=scenePoint(fieldYardToAbs(F.routeEnd.fy),F.routeEnd.lat);
  const cx=(a.x+b.x)/2,cy=Math.min(a.y,b.y)-42;
  return `<svg class="tso-ps886d__fieldSvg" style="z-index:5;pointer-events:none" viewBox="0 0 ${SCENE.w} ${SCENE.h}" preserveAspectRatio="none" aria-hidden="true">
    <line x1="${los.x1}" y1="${los.y1}" x2="${los.x2}" y2="${los.y2}" stroke="#1da6ff" stroke-width="6" opacity=".95" filter="url(#glow886d)"/>
    <line x1="${fd.x1}" y1="${fd.y1}" x2="${fd.x2}" y2="${fd.y2}" stroke="#ffe200" stroke-width="6" opacity=".95" filter="url(#glow886d)"/>
    <path d="M ${a.x} ${a.y} Q ${cx} ${cy}, ${b.x} ${b.y}" fill="none" stroke="#52c9ff" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round"/>
    <path d="M ${b.x-18*F.attack} ${b.y-6} L ${b.x} ${b.y} L ${b.x-12*F.attack} ${b.y+12}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function buildAvatar(head,n){return head?`<img src="${esc(head)}" alt="${esc(n)}">`:`<span class="init">${init(n)}</span>`}
function winProb(g){const a=clamp(g?.winProbAway??g?.liveScore?.winProbAway??68,0,100);return{away:Math.round(a),home:Math.round(100-a)}}
function chartPath(vals){return vals.map((v,i)=>`${i?'L':'M'}${(i*100/Math.max(1,vals.length-1)).toFixed(2)} ${(80-clamp(v,0,100)*.62).toFixed(2)}`).join(' ')}
function halftime(h){if(h?.ready)return{t:'Halftime Lab Ready',s:`${h.games||h.gameCount||1} games loaded`};if(h?.warming||h?.eligibleGames?.length)return{t:'Halftime Lab Warming Up',s:'2:00 warning automation active'};return{t:'Halftime Lab Monitoring',s:'Auto-arms near the 2:00 mark in Q2'}}

export function renderNflPlaystageV886DHTML(game,opts={}){
  ensureNflPlaystageV886DStyles();
  const F=formation(game,opts),P=F.P,W=winProb(game),H=halftime(opts.halftime),poss=F.poss;
  const ballP=scenePoint(fieldYardToAbs(F.ball.fy),F.ball.lat);
  const offenseSide=poss,defenseSide=poss==='away'?'home':'away';
  const actors=[
    ...F.off.map(p=>actorHtml(game,offenseSide,p)),
    ...F.def.map(p=>actorHtml(game,defenseSide,p)),
    ...F.ghosts.map(p=>actorHtml(game,offenseSide,p,{ghost:true}))
  ].join('');
  return `<section class="tso-ps886d" data-tso-v886d-gamecast>
    <div class="tso-ps886d__scene">
      ${fieldSvg(game)}
      <img class="tso-ps886d__shell" src="/sports/nfl/stadium-shell-v886d.png?v=88.6d" alt="" aria-hidden="true">
      ${overlaySvg(game,F)}
      <div class="tso-ps886d__actors">${actors}<div class="tso-ps886d__ball" style="left:${(ballP.x/SCENE.w*100).toFixed(4)}%;top:${(ballP.y/SCENE.h*100).toFixed(4)}%"></div></div>
    </div>
    <div class="tso-ps886d__panels">
      <article class="tso-ps886d__panel">
        <div class="tso-ps886d__title">Current Play <span class="tso-ps886d__chip">● Live</span></div>
        <div class="tso-ps886d__row"><div class="tso-ps886d__avatar">${buildAvatar(P.head,P.name)}</div><div><div class="tso-ps886d__pname">${dd(game)} &nbsp;|&nbsp; ${fp(game)}</div><div class="tso-ps886d__psub">${esc(P.name)} · ${esc(P.pos)}${P.no?` #${esc(P.no)}`:''}</div></div></div>
        <div class="tso-ps886d__copy">${esc(P.desc)}</div>
        <div class="tso-ps886d__stats"><div><b>${esc(P.drivePlays)}</b><small>Plays</small></div><div><b>${esc(P.driveYards)}</b><small>Yards</small></div><div><b>${esc(P.driveTime)}</b><small>Time</small></div><div><b>${esc(P.playYards)}</b><small>Yds Play</small></div></div>
      </article>
      <article class="tso-ps886d__panel">
        <div class="tso-ps886d__title">Featured Player ${logo(game,poss)?`<img src="${logo(game,poss)}" alt="" style="height:22px;object-fit:contain">`:''}</div>
        <div class="tso-ps886d__row"><div class="tso-ps886d__avatar">${buildAvatar(P.head,P.name)}</div><div><div class="tso-ps886d__pname">${esc(P.name)}</div><div class="tso-ps886d__psub">${esc(P.pos)}${P.no?` #${esc(P.no)}`:''}</div></div></div>
        <div class="tso-ps886d__stats"><div><b>${esc(P.stats.compAtt||'—')}</b><small>Comp/Att</small></div><div><b>${esc(P.stats.yards||'—')}</b><small>Yds</small></div><div><b>${esc(P.stats.td||'—')}</b><small>TD</small></div><div><b>${esc(P.stats.rtg||P.stats.qbr||'—')}</b><small>RTG</small></div></div>
      </article>
      <article class="tso-ps886d__panel">
        <div class="tso-ps886d__title">Win Probability</div>
        <div class="tso-ps886d__wp"><span>${name(game,'away')} ${W.away}%</span><span>${W.home}% ${name(game,'home')}</span></div>
        <div class="tso-ps886d__chart"><svg viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${chartPath(P.chart)}" fill="none" stroke="#22afff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="96" cy="${80-clamp((P.chart||[]).slice(-1)[0]||50,0,100)*.62}" r="3.5" fill="#61c9ff"/></svg></div>
        <div class="tso-ps886d__axis"><span>1st</span><span>2nd</span><span>3rd</span><span>4th</span></div>
      </article>
      <article class="tso-ps886d__panel">
        <div class="tso-ps886d__title">Drive Summary <span style="color:#b9ddff;text-transform:none;letter-spacing:0">View All ›</span></div>
        <div class="tso-ps886d__summary">${P.drive.map(r=>`<div class="tso-ps886d__srow${r.current?' cur':''}"><i></i><span>${esc(r.text)}</span><small>${esc(r.dd||'')}</small><small>${esc(r.fp||'')}</small></div>`).join('')}</div>
      </article>
    </div>
    <div class="tso-ps886d__footer"><div class="tso-ps886d__brand"><span class="tso-ps886d__brandMark">THE SPORTS OUTPOST</span><strong>Different Looks. A Higher Standard.</strong></div><div class="tso-ps886d__nav"><span><i>◔</i>Analyze</span><span><i>◎</i>Predict</span><span><i>▷</i>Watch</span><span><i>🏆</i>Win</span></div><div class="tso-ps886d__lab"><i>🧪</i><div>${H.t}<small>${H.s}</small></div></div></div>
  </section>`;
}


export function mountOrUpdateNflPlaystageV886D(root,game,opts={}){
  // Compatibility hook for the old v88.5 observer. The canonical v88.6d
  // Game View is rendered directly by gamecastDashboardHTML, so this hook
  // intentionally does not inject a second PlayStage into the DOM.
  ensureNflPlaystageV886DStyles();
  return {root,game,opts,directRenderer:true};
}

export const __V886D_TEST__={scenePoint,lineAt,fieldYardToAbs,ballState,yardLabel,FIELD,SCENE};
