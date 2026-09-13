const ROOT='#nflView:not([hidden]) .nxg-concept[data-nfl-inline-gamecast]';
const STYLE_ID='tso-nfl-possession-ball-v8922-style';
let installed=false,observer=null,raf=0;

const footballSvg=`<svg viewBox="0 0 64 40" aria-hidden="true" focusable="false"><path class="ball" d="M9 20C12 9 23 4 32 4s20 5 23 16c-3 11-14 16-23 16S12 31 9 20Z"/><path class="seam" d="M32 8v24M24 14h16M23 20h18M24 26h16"/></svg>`;

function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
  #nflView .nxg-concept .nxg-teamblock{position:relative!important}
  #nflView .nxg-concept .nxg-posstext{display:none!important}
  #nflView .nxg-concept .nxg-possession-ball{
    position:absolute!important;top:17px!important;width:50px!important;height:50px!important;
    border:4px solid #a86529!important;border-radius:50%!important;box-sizing:border-box!important;
    display:flex!important;align-items:center!important;justify-content:center!important;
    background:rgba(139,82,32,.04)!important;opacity:.62!important;z-index:7!important;
    box-shadow:inset 0 0 0 1px rgba(255,190,105,.08)!important;pointer-events:none!important;
    transition:opacity .16s ease,background .16s ease,box-shadow .16s ease,transform .16s ease!important;
  }
  #nflView .nxg-concept .nxg-teamblock.away .nxg-possession-ball{right:105px!important}
  #nflView .nxg-concept .nxg-teamblock.home .nxg-possession-ball{left:105px!important}
  #nflView .nxg-concept .nxg-possession-ball svg{width:32px!important;height:22px!important;overflow:visible!important;opacity:0!important;transform:scale(.78)!important;transition:opacity .16s ease,transform .16s ease!important;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}
  #nflView .nxg-concept .nxg-possession-ball .ball{fill:#8a4f20;stroke:#f4eee4;stroke-width:2.4}
  #nflView .nxg-concept .nxg-possession-ball .seam{fill:none;stroke:#f4eee4;stroke-width:2.2;stroke-linecap:round}
  #nflView .nxg-concept .nxg-possession-ball.is-active{opacity:1!important;background:rgba(154,90,35,.16)!important;box-shadow:0 0 14px rgba(180,104,39,.26),inset 0 0 0 1px rgba(255,205,139,.14)!important;transform:scale(1.03)!important}
  #nflView .nxg-concept .nxg-possession-ball.is-active svg{opacity:1!important;transform:scale(1)!important}
  @media(max-width:900px){
    #nflView .nxg-concept .nxg-possession-ball{top:17px!important}
  }
  `;
  document.head.appendChild(style);
}

function activeRoot(){return document.querySelector(ROOT);}
function snapId(s){return String(s?.gameId||s?.id||'');}

function ensureBadge(block,side){
  if(!block)return null;
  let badge=block.querySelector(`.nxg-possession-ball[data-side="${side}"]`);
  if(!badge){
    badge=document.createElement('span');
    badge.className='nxg-possession-ball';
    badge.dataset.side=side;
    badge.setAttribute('role','img');
    badge.setAttribute('aria-label',side==='away'?'Away team possession':'Home team possession');
    badge.innerHTML=footballSvg;
    block.appendChild(badge);
  }
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
