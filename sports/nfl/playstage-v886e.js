
import { ensureNflPlaystageV886EStyles } from './gamecast-v886e-styles.js';

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
  <svg class="tso-ps886e__fieldSvg" viewBox="0 0 ${SCENE.w} ${SCENE.h}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="grass886e" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#347e32"/><stop offset="55%" stop-color="#2f7b30"/><stop offset="100%" stop-color="#235f27"/></linearGradient>
      <linearGradient id="away886e" x1="0" x2="1"><stop offset="0%" stop-color="${ac[0]}"/><stop offset="100%" stop-color="${ac[1]}"/></linearGradient>
      <linearGradient id="home886e" x1="0" x2="1"><stop offset="0%" stop-color="${hc[1]}"/><stop offset="100%" stop-color="${hc[0]}"/></linearGradient>
      <filter id="glow886e"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <polygon points="${topA.x},${topA.y} ${topB.x},${topB.y} ${botB.x},${botB.y} ${botA.x},${botA.y}" fill="url(#grass886e)"/>
    ${Array.from({length:10},(_,i)=>i%2?`<polygon points="${polyForRange(10+i*10,20+i*10)}" fill="rgba(0,0,0,.045)"/>`:``).join('')}
    <polygon points="${polyForRange(0,10)}" fill="url(#away886e)"/>
    <polygon points="${polyForRange(110,120)}" fill="url(#home886e)"/>
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
  return {helmet:c[0],jersey:c[0],accent:c[1],pants:c[0],sock:c[1]};
}

function footballPlayerSvg(palette,number='',pose='skill',dir=1,uid='p',ghost=false,teamLogo=''){
  const safe=String(uid).replace(/[^a-z0-9_-]/gi,'');
  const helm=`h${safe}`,jer=`j${safe}`,pants=`p${safe}`,skin=`s${safe}`,metal=`m${safe}`;
  const c=ghost?{helmet:'#d8e0e8',jersey:'#c7d0d8',accent:'#ffffff',pants:'#c5ccd4',sock:'#bfc8d0'}:palette;
  let limbs='';
  if(pose==='line'){
    limbs=`
      <path d="M25 50 L13 63 L20 70 L31 59" stroke="url(#${skin})" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M52 50 L64 61 L58 68 L47 59" stroke="url(#${skin})" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M31 73 L23 87 L18 105" stroke="url(#${pants})" stroke-width="10" stroke-linecap="round"/>
      <path d="M45 73 L52 88 L61 103" stroke="url(#${pants})" stroke-width="10" stroke-linecap="round"/>
      <path d="M14 105 L25 105" stroke="#eef4f8" stroke-width="5" stroke-linecap="round"/>
      <path d="M57 104 L67 104" stroke="#eef4f8" stroke-width="5" stroke-linecap="round"/>`;
  }else if(pose==='qb'){
    limbs=`
      <path d="M27 50 L18 65 L26 72" stroke="url(#${skin})" stroke-width="7" stroke-linecap="round"/>
      <path d="M50 50 L58 61 L52 69" stroke="url(#${skin})" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="53" cy="67" rx="7.5" ry="4.5" fill="#8b451f" stroke="#f3e6d5" stroke-width="1.2" transform="rotate(-22 53 67)"/>
      <path d="M50 65 L56 68" stroke="#f8f0e7" stroke-width="1"/>
      <path d="M33 75 L27 92 L23 108" stroke="url(#${pants})" stroke-width="9" stroke-linecap="round"/>
      <path d="M45 75 L48 91 L56 106" stroke="url(#${pants})" stroke-width="9" stroke-linecap="round"/>
      <path d="M18 108 L28 108" stroke="#eef4f8" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M52 107 L63 107" stroke="#eef4f8" stroke-width="4.5" stroke-linecap="round"/>`;
  }else if(pose==='defense'){
    limbs=`
      <path d="M25 49 L15 61 L8 72" stroke="url(#${skin})" stroke-width="7" stroke-linecap="round"/>
      <path d="M51 49 L61 59 L68 69" stroke="url(#${skin})" stroke-width="7" stroke-linecap="round"/>
      <path d="M32 74 L20 89 L15 106" stroke="url(#${pants})" stroke-width="9" stroke-linecap="round"/>
      <path d="M45 74 L51 89 L63 103" stroke="url(#${pants})" stroke-width="9" stroke-linecap="round"/>
      <path d="M10 106 L22 106" stroke="#eef4f8" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M59 104 L69 104" stroke="#eef4f8" stroke-width="4.5" stroke-linecap="round"/>`;
  }else{
    limbs=`
      <path d="M27 50 L15 62 L9 76" stroke="url(#${skin})" stroke-width="7" stroke-linecap="round"/>
      <path d="M50 49 L58 60 L66 68" stroke="url(#${skin})" stroke-width="7" stroke-linecap="round"/>
      <path d="M34 74 L22 91 L17 108" stroke="url(#${pants})" stroke-width="9" stroke-linecap="round"/>
      <path d="M45 74 L54 88 L66 99" stroke="url(#${pants})" stroke-width="9" stroke-linecap="round"/>
      <path d="M12 108 L24 108" stroke="#eef4f8" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M62 100 L71 100" stroke="#eef4f8" stroke-width="4.5" stroke-linecap="round"/>`;
  }
  const bodyTransform=dir<0?'translate(76 0) scale(-1 1)':'';
  return `
  <svg viewBox="0 0 76 114" aria-hidden="true">
    <defs>
      <linearGradient id="${helm}" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="22%" stop-color="${c.helmet}"/><stop offset="78%" stop-color="${c.helmet}"/><stop offset="100%" stop-color="#56616d"/></linearGradient>
      <linearGradient id="${jer}" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="${c.accent}"/><stop offset="16%" stop-color="${c.jersey}"/><stop offset="74%" stop-color="${c.jersey}"/><stop offset="100%" stop-color="#07111c"/></linearGradient>
      <linearGradient id="${pants}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${c.pants}"/><stop offset="100%" stop-color="#76818d"/></linearGradient>
      <linearGradient id="${skin}" x1="0" x2="1"><stop offset="0%" stop-color="#94563f"/><stop offset="48%" stop-color="#d89973"/><stop offset="100%" stop-color="#7d4637"/></linearGradient>
      <linearGradient id="${metal}" x1="0" x2="1"><stop offset="0%" stop-color="#f6fbff"/><stop offset="100%" stop-color="#8997a4"/></linearGradient>
    </defs>
    <ellipse cx="39" cy="109" rx="21" ry="4.5" fill="rgba(0,0,0,.34)"/>
    <g transform="${bodyTransform}" opacity="${ghost?'.86':'1'}">
      ${limbs}
      <path d="M22 47 C24 39 31 36 39 36 C48 36 55 40 57 48 L53 73 C48 79 29 79 24 73Z" fill="url(#${jer})" stroke="rgba(255,255,255,.42)" stroke-width="1.1"/>
      <path d="M20 48 C28 42 49 42 58 48" fill="none" stroke="${c.accent}" stroke-width="4.2" stroke-linecap="round" opacity=".95"/>
      <path d="M29 74 L37 74 L34 88" fill="none" stroke="${c.accent}" stroke-width="2.1" opacity=".85"/>
      <ellipse cx="40" cy="25" rx="14.5" ry="15.5" fill="url(#${helm})" stroke="rgba(255,255,255,.76)" stroke-width="1.2"/>
      <path d="M30 26 C34 20 45 19 51 24 L49 35 L31 35Z" fill="#111b27" opacity=".82"/>
      <path d="M52 21 Q62 24 61 34 L55 37" fill="none" stroke="url(#${metal})" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M54 25 H65 M55 30 H64 M55 35 H61" stroke="url(#${metal})" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M36 11 Q46 7 54 15" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.3" stroke-linecap="round"/>
      ${teamLogo&&!ghost?`<image href="${esc(teamLogo)}" x="34" y="13" width="15" height="12" preserveAspectRatio="xMidYMid meet" opacity=".95"/>`:''}
      <path d="M29 39 Q39 43 50 39" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2"/>
    </g>
    ${number?`<text x="39" y="62" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="12" font-weight="900" fill="#fff" stroke="rgba(0,0,0,.48)" stroke-width="1">${esc(number)}</text>`:''}
  </svg>`;
}

function formation(g,opts={}){
  const P=play(g,opts),B=ballState(g),poss=possessionSide(g),attack=poss==='away'?1:-1;
  const los=B.fieldYard,dist=clamp(Number(g?.liveScore?.distance)||8,1,30),fd=clamp(los+attack*dist,0,100);
  const last=(P.name||'QB').split(' ').slice(-1)[0];
  const qb={fy:clamp(los-6.2*attack,0,100),lat:.67,label:last,number:P.no||'',pose:'qb',role:'QB',focus:true,dir:attack};
  const off=[
    qb,
    {fy:los-1.3*attack,lat:.43,pose:'line',role:'OL',dir:attack},{fy:los-.9*attack,lat:.49,pose:'line',role:'OL',dir:attack},{fy:los-.55*attack,lat:.55,pose:'line',role:'OL',dir:attack},{fy:los-.25*attack,lat:.61,pose:'line',role:'OL',dir:attack},{fy:los+.1*attack,lat:.67,pose:'line',role:'OL',dir:attack},
    {fy:los-4.5*attack,lat:.56,pose:'skill',role:'RB',dir:attack},
    {fy:los+2.3*attack,lat:.74,pose:'skill',role:'TE',dir:attack},
    {fy:los+7.5*attack,lat:.31,pose:'skill',role:'WR',dir:attack},
    {fy:los+10.5*attack,lat:.18,pose:'skill',role:'WR',dir:attack},
    {fy:los+9*attack,lat:.84,pose:'skill',role:'WR',dir:attack}
  ];
  const def=[
    {fy:los+.7*attack,lat:.42,pose:'defense',role:'DL',dir:-attack},{fy:los+1.1*attack,lat:.49,pose:'defense',role:'DL',dir:-attack},{fy:los+1.4*attack,lat:.56,pose:'defense',role:'DL',dir:-attack},{fy:los+1.8*attack,lat:.63,pose:'defense',role:'DL',dir:-attack},
    {fy:los+4.6*attack,lat:.36,pose:'defense',role:'LB',dir:-attack},{fy:los+5.4*attack,lat:.55,pose:'defense',role:'LB',dir:-attack},{fy:los+5.8*attack,lat:.72,pose:'defense',role:'LB',dir:-attack},
    {fy:los+10.8*attack,lat:.22,pose:'defense',role:'DB',dir:-attack},{fy:los+11.8*attack,lat:.43,pose:'defense',role:'DB',dir:-attack},{fy:los+12.8*attack,lat:.64,pose:'defense',role:'DB',dir:-attack},{fy:los+13.8*attack,lat:.82,pose:'defense',role:'DB',dir:-attack}
  ];
  let target=8;
  if(P.type.includes('screen')) target=10;
  else if(P.type.includes('left')) target=9;
  else if(P.type.includes('middle')) target=7;
  else if(P.type.includes('run')) target=6;
  off[target]={...off[target],key:true,focus:true,label:(P.target||P.name||off[target].role||'WR').split(' ').slice(-1)[0]};
  const tp=off[target];
  const run=P.type.includes('run');
  const routeEnd={fy:clamp(tp.fy+(run?9:16)*attack,0,100),lat:clamp(tp.lat+(P.type.includes('left') ? -.08 : (P.type.includes('right') ? .08 : -.03)),.12,.88)};
  const ghosts=run?[]:[.35,.67,1].map((q,i)=>({
    fy:tp.fy+(routeEnd.fy-tp.fy)*q,
    lat:tp.lat+(routeEnd.lat-tp.lat)*q,
    pose:'skill',role:'ghost',dir:attack,ghost:true,ghostIndex:i
  }));
  const ball=run?{fy:tp.fy+.7*attack,lat:tp.lat}:{fy:tp.fy-1.5*attack,lat:tp.lat-.015};
  return {P,los,fd,off,def,ghosts,ball,poss,attack,throwStart:{fy:qb.fy,lat:qb.lat},targetPoint:{fy:tp.fy,lat:tp.lat},routeEnd,run};
}

function actorHtml(g,side,p,{ghost=false,index=0}={}){
  const point=scenePoint(fieldYardToAbs(p.fy),p.lat);
  const scale=(.72+p.lat*.42)*(p.key?1.06:1);
  const pal=actorPalette(side,g);
  const uid=`${side}-${index}-${Math.round(p.fy*10)}-${Math.round(p.lat*100)}`;
  const isGhost=ghost||p.ghost;
  return `<div class="tso-ps886e__actor${p.key?' key':''}${p.focus?' focus':''}${isGhost?' ghost':''}" style="left:${(point.x/SCENE.w*100).toFixed(4)}%;top:${(point.y/SCENE.h*100).toFixed(4)}%;--scale:${scale.toFixed(3)}">
    ${(p.focus&&!isGhost)?'<span class="tso-ps886e__actorSpot"></span>':''}
    <span class="tso-ps886e__actorGraphic">${footballPlayerSvg(pal,p.number||'',p.pose||'skill',p.dir??1,uid,isGhost,logo(g,side))}</span>
    ${p.label&&!isGhost?`<span class="tso-ps886e__actorLabel">${esc(p.label)}</span>`:''}
  </div>`;
}

function downLineSvg(F){
  const los=lineAt(fieldYardToAbs(F.los)),fd=lineAt(fieldYardToAbs(F.fd));
  const beam=(L,color)=>`
    <line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="${color}" stroke-width="24" opacity=".10"/>
    <line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="${color}" stroke-width="12" opacity=".22"/>
    <line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="${color}" stroke-width="5.4" opacity=".96"/>
    <line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="#fff" stroke-width="1.25" opacity=".72"/>`;
  return `<svg class="tso-ps886e__fieldSvg tso-ps886e__downlines" viewBox="0 0 ${SCENE.w} ${SCENE.h}" preserveAspectRatio="none" aria-hidden="true">
    ${beam(los,'#00a9ff')}
    ${beam(fd,'#ffd900')}
  </svg>`;
}

function routeSvg(F){
  const a=scenePoint(fieldYardToAbs(F.throwStart.fy),F.throwStart.lat);
  const t=scenePoint(fieldYardToAbs(F.targetPoint.fy),F.targetPoint.lat);
  const b=scenePoint(fieldYardToAbs(F.routeEnd.fy),F.routeEnd.lat);
  const throwCx=(a.x+t.x)/2,throwCy=Math.min(a.y,t.y)-34;
  const routeCx=(t.x+b.x)/2,routeCy=Math.min(t.y,b.y)-18;
  const throwPath=F.run?'':`
    <path d="M ${a.x} ${a.y-10} Q ${throwCx} ${throwCy}, ${t.x} ${t.y-12}" fill="none" stroke="#12b7ff" stroke-width="10" opacity=".10"/>
    <path d="M ${a.x} ${a.y-10} Q ${throwCx} ${throwCy}, ${t.x} ${t.y-12}" fill="none" stroke="#44c9ff" stroke-width="3.2" stroke-dasharray="8 7" stroke-linecap="round" opacity=".82"/>`;
  return `<svg class="tso-ps886e__fieldSvg tso-ps886e__routes" viewBox="0 0 ${SCENE.w} ${SCENE.h}" preserveAspectRatio="none" aria-hidden="true">
    ${throwPath}
    <path d="M ${t.x} ${t.y-7} Q ${routeCx} ${routeCy}, ${b.x} ${b.y-7}" fill="none" stroke="#ffffff" stroke-width="7" opacity=".10"/>
    <path d="M ${t.x} ${t.y-7} Q ${routeCx} ${routeCy}, ${b.x} ${b.y-7}" fill="none" stroke="#dbeeff" stroke-width="2.7" stroke-linecap="round" opacity=".90"/>
    <path d="M ${b.x-19*F.attack} ${b.y-15} L ${b.x} ${b.y-7} L ${b.x-13*F.attack} ${b.y+8}" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>
  </svg>`;
}

function buildAvatar(head,n){return head?`<img src="${esc(head)}" alt="${esc(n)}">`:`<span class="init">${init(n)}</span>`}
function winProb(g){const a=clamp(g?.winProbAway??g?.liveScore?.winProbAway??68,0,100);return{away:Math.round(a),home:Math.round(100-a)}}
function chartPath(vals){return vals.map((v,i)=>`${i?'L':'M'}${(i*100/Math.max(1,vals.length-1)).toFixed(2)} ${(80-clamp(v,0,100)*.62).toFixed(2)}`).join(' ')}
function halftime(h){if(h?.ready)return{t:'Halftime Lab Ready',s:`${h.games||h.gameCount||1} games loaded`};if(h?.warming||h?.eligibleGames?.length)return{t:'Halftime Lab Warming Up',s:'2:00 warning automation active'};return{t:'Halftime Lab Monitoring',s:'Auto-arms near the 2:00 mark in Q2'}}

export function renderNflPlaystageV886EHTML(game,opts={}){
  ensureNflPlaystageV886EStyles();
  const F=formation(game,opts),P=F.P,W=winProb(game),H=halftime(opts.halftime),poss=F.poss;
  const ballP=scenePoint(fieldYardToAbs(F.ball.fy),F.ball.lat);
  const offenseSide=poss,defenseSide=poss==='away'?'home':'away';
  const actors=[
    ...F.off.map((p,i)=>actorHtml(game,offenseSide,p,{index:i})),
    ...F.def.map((p,i)=>actorHtml(game,defenseSide,p,{index:20+i})),
    ...F.ghosts.map((p,i)=>actorHtml(game,offenseSide,p,{ghost:true,index:40+i}))
  ].join('');
  return `<section class="tso-ps886e" data-tso-v886e-gamecast>
    <div class="tso-ps886e__scene">
      ${fieldSvg(game)}
      ${downLineSvg(F)}
      <img class="tso-ps886e__shell" src="/sports/nfl/stadium-shell-v886e.png?v=88.6e" alt="" aria-hidden="true">
      ${routeSvg(F)}
      <div class="tso-ps886e__actors">${actors}<div class="tso-ps886e__ball" style="left:${(ballP.x/SCENE.w*100).toFixed(4)}%;top:${(ballP.y/SCENE.h*100).toFixed(4)}%"></div></div>
    </div>
    <div class="tso-ps886e__panels">
      <article class="tso-ps886e__panel">
        <div class="tso-ps886e__title">Current Play <span class="tso-ps886e__chip">● Live</span></div>
        <div class="tso-ps886e__row"><div class="tso-ps886e__avatar">${buildAvatar(P.head,P.name)}</div><div><div class="tso-ps886e__pname">${dd(game)} &nbsp;|&nbsp; ${fp(game)}</div><div class="tso-ps886e__psub">${esc(P.name)} · ${esc(P.pos)}${P.no?` #${esc(P.no)}`:''}</div></div></div>
        <div class="tso-ps886e__copy">${esc(P.desc)}</div>
        <div class="tso-ps886e__stats"><div><b>${esc(P.drivePlays)}</b><small>Plays</small></div><div><b>${esc(P.driveYards)}</b><small>Yards</small></div><div><b>${esc(P.driveTime)}</b><small>Time</small></div><div><b>${esc(P.playYards)}</b><small>Yds Play</small></div></div>
      </article>
      <article class="tso-ps886e__panel">
        <div class="tso-ps886e__title">Featured Player ${logo(game,poss)?`<img src="${logo(game,poss)}" alt="" style="height:22px;object-fit:contain">`:''}</div>
        <div class="tso-ps886e__row"><div class="tso-ps886e__avatar">${buildAvatar(P.head,P.name)}</div><div><div class="tso-ps886e__pname">${esc(P.name)}</div><div class="tso-ps886e__psub">${esc(P.pos)}${P.no?` #${esc(P.no)}`:''}</div></div></div>
        <div class="tso-ps886e__stats"><div><b>${esc(P.stats.compAtt||'—')}</b><small>Comp/Att</small></div><div><b>${esc(P.stats.yards||'—')}</b><small>Yds</small></div><div><b>${esc(P.stats.td||'—')}</b><small>TD</small></div><div><b>${esc(P.stats.rtg||P.stats.qbr||'—')}</b><small>RTG</small></div></div>
      </article>
      <article class="tso-ps886e__panel">
        <div class="tso-ps886e__title">Win Probability</div>
        <div class="tso-ps886e__wp"><span>${name(game,'away')} ${W.away}%</span><span>${W.home}% ${name(game,'home')}</span></div>
        <div class="tso-ps886e__chart"><svg viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${chartPath(P.chart)}" fill="none" stroke="#22afff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="96" cy="${80-clamp((P.chart||[]).slice(-1)[0]||50,0,100)*.62}" r="3.5" fill="#61c9ff"/></svg></div>
        <div class="tso-ps886e__axis"><span>1st</span><span>2nd</span><span>3rd</span><span>4th</span></div>
      </article>
      <article class="tso-ps886e__panel">
        <div class="tso-ps886e__title">Drive Summary <span style="color:#b9ddff;text-transform:none;letter-spacing:0">View All ›</span></div>
        <div class="tso-ps886e__summary">${P.drive.map(r=>`<div class="tso-ps886e__srow${r.current?' cur':''}"><i></i><span>${esc(r.text)}</span><small>${esc(r.dd||'')}</small><small>${esc(r.fp||'')}</small></div>`).join('')}</div>
      </article>
    </div>
    <div class="tso-ps886e__footer"><div class="tso-ps886e__brand"><span class="tso-ps886e__brandMark">THE SPORTS OUTPOST</span><strong>Different Looks. A Higher Standard.</strong></div><div class="tso-ps886e__nav"><span><i>◔</i>Analyze</span><span><i>◎</i>Predict</span><span><i>▷</i>Watch</span><span><i>🏆</i>Win</span></div><div class="tso-ps886e__lab"><i>🧪</i><div>${H.t}<small>${H.s}</small></div></div></div>
  </section>`;
}


export function mountOrUpdateNflPlaystageV886E(root,game,opts={}){
  // Compatibility hook for the old v88.5 observer. The canonical v88.6e
  // Game View is rendered directly by gamecastDashboardHTML, so this hook
  // intentionally does not inject a second PlayStage into the DOM.
  ensureNflPlaystageV886EStyles();
  return {root,game,opts,directRenderer:true};
}

export const __V886E_TEST__={scenePoint,lineAt,fieldYardToAbs,ballState,yardLabel,FIELD,SCENE};
