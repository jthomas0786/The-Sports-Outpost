const ROOT='#nflView:not([hidden]) .nxg-concept[data-nfl-inline-gamecast]';
const STYLE_ID='tso-nfl-possession-ball-v8922-style';
let installed=false,observer=null,raf=0;

const footballSvg=`<svg viewBox="0 0 64 40" aria-hidden="true" focusable="false"><path class="ball" d="M9 20C12 9 23 4 32 4s20 5 23 16c-3 11-14 16-23 16S12 31 9 20Z"/><path class="seam" d="M32 8v24M24 14h16M23 20h18M24 26h16"/></svg>`;

function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
  #nflView .nxg-concept .nxg-posstext{display:none!important}
  #nflView .nxg-concept .nxg-teamcopy .nxg-team-name-line{
    display:flex!important;align-items:center!important;gap:8px!important;
    margin:0!important;padding:0!important;line-height:1!important;
    color:inherit!important;font:inherit!important;white-space:nowrap!important;
  }
  #nflView .nxg-concept .nxg-teamblock.away .nxg-team-name-line{justify-content:flex-start!important}
  #nflView .nxg-concept .nxg-teamblock.home .nxg-team-name-line{justify-content:flex-end!important}
  #nflView .nxg-concept .nxg-teamcopy .nxg-team-name-line>b{
    display:inline-block!important;margin:0!important;vertical-align:middle!important;
  }
  #nflView .nxg-concept .nxg-teamcopy .nxg-possession-ball{
    display:none!important;flex:0 0 auto!important;
    width:27px!important;height:18px!important;
    margin:0!important;padding:0!important;vertical-align:middle!important;
    align-items:center!important;justify-content:center!important;
    background:none!important;border:0!important;border-radius:0!important;
    box-shadow:none!important;opacity:1!important;pointer-events:none!important;
    transform:none!important;color:inherit!important;font:inherit!important;
  }
  #nflView .nxg-concept .nxg-teamcopy .nxg-possession-ball.is-active{display:inline-flex!important}
  #nflView .nxg-concept .nxg-teamcopy .nxg-possession-ball svg{
    display:block!important;width:27px!important;height:18px!important;overflow:visible!important;
    opacity:1!important;transform:rotate(-8deg)!important;
    filter:drop-shadow(0 2px 2px rgba(0,0,0,.38))!important;
  }
  #nflView .nxg-concept .nxg-possession-ball .ball{fill:#8a4f20;stroke:#f4eee4;stroke-width:2.4}
  #nflView .nxg-concept .nxg-possession-ball .seam{fill:none;stroke:#f4eee4;stroke-width:2.2;stroke-linecap:round}
  @media(max-width:900px){
    #nflView .nxg-concept .nxg-teamcopy .nxg-team-name-line{gap:6px!important}
    #nflView .nxg-concept .nxg-teamcopy .nxg-possession-ball{width:24px!important;height:16px!important}
    #nflView .nxg-concept .nxg-teamcopy .nxg-possession-ball svg{width:24px!important;height:16px!important}
  }
  `;
  document.head.appendChild(style);
}

function activeRoot(){return document.querySelector(ROOT);}
function snapId(s){return String(s?.gameId||s?.id||'');}

function ensureNameLine(block,side){
  if(!block)return null;
  const copy=block.querySelector('.nxg-teamcopy');
  if(!copy)return null;
  let line=copy.querySelector(':scope > .nxg-team-name-line');
  let name=line?.querySelector(':scope > b')||copy.querySelector(':scope > b');
  if(!name)return null;
  if(!line){
    line=document.createElement('span');
    line.className='nxg-team-name-line';
    copy.insertBefore(line,name);
    line.appendChild(name);
  }
  line.dataset.side=side;
  return {copy,line,name};
}

function ensureBadge(block,side){
  const parts=ensureNameLine(block,side);
  if(!parts)return null;
  const {copy,line,name}=parts;

  /* Remove badges left behind by older possession layouts. A live remount can keep
     old DOM nodes around briefly, so the current line owns exactly one football. */
  copy.querySelectorAll('.nxg-possession-ball').forEach(el=>{
    if(el.parentElement!==line||el.dataset.side!==side)el.remove();
  });

  let badge=line.querySelector(`:scope > .nxg-possession-ball[data-side="${side}"]`);
  if(!badge){
    badge=document.createElement('span');
    badge.className='nxg-possession-ball';
    badge.dataset.side=side;
    badge.setAttribute('role','img');
    badge.setAttribute('aria-label',side==='away'?'Away team possession':'Home team possession');
    badge.innerHTML=footballSvg;
  }

  /* "Inside" means toward midfield: after the away-team name, before the home-team name. */
  if(side==='away'){
    if(name.nextElementSibling!==badge)name.insertAdjacentElement('afterend',badge);
  }else{
    if(name.previousElementSibling!==badge)name.insertAdjacentElement('beforebegin',badge);
  }
  return badge;
}

function applyPossession(root,side){
  if(!root)return;

  /* Hard exclusivity: clear every current or stale possession football first. */
  root.querySelectorAll('.nxg-possession-ball').forEach(el=>{
    el.classList.remove('is-active');
    el.removeAttribute('aria-current');
  });

  const away=ensureBadge(root.querySelector('.nxg-teamblock.away'),'away');
  const home=ensureBadge(root.querySelector('.nxg-teamblock.home'),'home');
  const valid=side==='away'||side==='home'?side:'';
  const active=valid==='away'?away:valid==='home'?home:null;
  active?.classList.add('is-active');
  active?.setAttribute('aria-current','true');
  if(away&&away!==active)away.setAttribute('aria-current','false');
  if(home&&home!==active)home.setAttribute('aria-current','false');
  root.dataset.possessionBall=valid||'none';
}

function seedFromCurrent(root){
  if(!root)return;
  const id=String(root.getAttribute('data-nfl-inline-gamecast')||'');
  const snap=window.__TSO_NFL_LIVE_LATEST__;
  if(id&&snap&&snapId(snap)===id&&(snap.possession==='away'||snap.possession==='home')){
    applyPossession(root,snap.possession);
    return;
  }
  const old=String(root.querySelector('.nxg-posstext')?.textContent||'').trim();
  if(!old)return applyPossession(root,'');
  const awayName=String(root.querySelector('.nxg-teamblock.away .nxg-teamcopy b')?.textContent||'').toUpperCase();
  const homeName=String(root.querySelector('.nxg-teamblock.home .nxg-teamcopy b')?.textContent||'').toUpperCase();
  const token=old.split(/\s+/)[0]?.toUpperCase()||'';
  if(awayName.startsWith(token)||awayName.includes(token))applyPossession(root,'away');
  else if(homeName.startsWith(token)||homeName.includes(token))applyPossession(root,'home');
  else applyPossession(root,'');
}

function scan(){
  raf=0;
  const root=activeRoot();if(!root)return;
  ensureBadge(root.querySelector('.nxg-teamblock.away'),'away');
  ensureBadge(root.querySelector('.nxg-teamblock.home'),'home');
  const live=window.__TSO_NFL_LIVE_LATEST__;
  const id=String(root.getAttribute('data-nfl-inline-gamecast')||'');
  if(id&&live&&snapId(live)===id&&(live.possession==='away'||live.possession==='home')){
    applyPossession(root,live.possession);
  }else if(!root.dataset.possessionBall){
    seedFromCurrent(root);
  }else{
    /* Re-assert exclusivity after DOM mutations without changing the known side. */
    applyPossession(root,root.dataset.possessionBall);
  }
}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}

function onLive(e){
  const root=activeRoot();if(!root)return;
  const snap=e?.detail;if(!snap)return;
  const activeId=String(root.getAttribute('data-nfl-inline-gamecast')||'');
  if(!activeId||snapId(snap)!==activeId)return;
  applyPossession(root,snap?.possession);
}

export function installNflGamecastPossessionBallV8922(){
  ensureStyles();
  if(installed){queue();return observer;}
  installed=true;
  window.addEventListener('tso:nfl-live-snapshot',onLive,true);
  const host=document.getElementById('nflView')||document.body;
  observer=new MutationObserver(queue);
  observer.observe(host,{childList:true,subtree:true});
  queue();
  return observer;
}

export const __V8922_TEST__={ROOT,STYLE_ID,applyPossession};
