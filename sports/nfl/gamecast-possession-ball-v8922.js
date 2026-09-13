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
  #nflView .nxg-concept .nxg-teamcopy b{display:inline-block!important;vertical-align:middle!important}
  #nflView .nxg-concept .nxg-possession-ball{
    display:none!important;
    width:27px!important;height:18px!important;
    margin-left:8px!important;
    vertical-align:middle!important;
    align-items:center!important;justify-content:center!important;
    background:none!important;border:0!important;border-radius:0!important;
    padding:0!important;box-shadow:none!important;
    opacity:1!important;pointer-events:none!important;
    transform:none!important;
  }
  #nflView .nxg-concept .nxg-possession-ball.is-active{display:inline-flex!important}
  #nflView .nxg-concept .nxg-possession-ball svg{
    display:block!important;width:27px!important;height:18px!important;overflow:visible!important;
    opacity:1!important;transform:rotate(-8deg)!important;
    filter:drop-shadow(0 2px 2px rgba(0,0,0,.38))!important;
  }
  #nflView .nxg-concept .nxg-possession-ball .ball{fill:#8a4f20;stroke:#f4eee4;stroke-width:2.4}
  #nflView .nxg-concept .nxg-possession-ball .seam{fill:none;stroke:#f4eee4;stroke-width:2.2;stroke-linecap:round}
  @media(max-width:900px){
    #nflView .nxg-concept .nxg-possession-ball{width:24px!important;height:16px!important;margin-left:6px!important}
    #nflView .nxg-concept .nxg-possession-ball svg{width:24px!important;height:16px!important}
  }
  `;
  document.head.appendChild(style);
}

function activeRoot(){return document.querySelector(ROOT);}
function snapId(s){return String(s?.gameId||s?.id||'');}

function ensureBadge(block,side){
  if(!block)return null;
  const copy=block.querySelector('.nxg-teamcopy');
  const name=copy?.querySelector('b');
  if(!copy||!name)return null;
  let badge=copy.querySelector(`.nxg-possession-ball[data-side="${side}"]`);
  if(!badge){
    badge=document.createElement('span');
    badge.className='nxg-possession-ball';
    badge.dataset.side=side;
    badge.setAttribute('role','img');
    badge.setAttribute('aria-label',side==='away'?'Away team possession':'Home team possession');
    badge.innerHTML=footballSvg;
  }
  if(name.nextSibling!==badge)name.insertAdjacentElement('afterend',badge);
  return badge;
}

function applyPossession(root,side){
  if(!root)return;
  const away=ensureBadge(root.querySelector('.nxg-teamblock.away'),'away');
  const home=ensureBadge(root.querySelector('.nxg-teamblock.home'),'home');
  const valid=side==='away'||side==='home'?side:'';
  away?.classList.toggle('is-active',valid==='away');
  home?.classList.toggle('is-active',valid==='home');
  if(away)away.setAttribute('aria-current',valid==='away'?'true':'false');
  if(home)home.setAttribute('aria-current',valid==='home'?'true':'false');
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
  if(!root.dataset.possessionBall)seedFromCurrent(root);
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
