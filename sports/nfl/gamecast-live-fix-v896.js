let installed=false,observer=null,lastPlay='';

function gamecastRoot(){return document.querySelector('[data-tso-v886e-gamecast]');}
function currentText(){return String(document.querySelector('[data-v883b-play-text]')?.textContent||'').trim();}

function stripLegacyRerenderFlag(){
  const root=gamecastRoot();
  if(!root) return;
  // v88.6c forced a full Gamecast rebuild on each live update. That is the source
  // of the visible flash. v89.6 leaves the v88.3 incremental DOM patcher in charge.
  root.removeAttribute('data-tso-v886c-gamecast');
}

function inferDirection(actors){
  const qb=actors.find(a=>a.dataset.v888Role==='QB')||actors[0];
  const ol=actors.filter(a=>a.dataset.v888Role==='OL').slice(0,5);
  if(!qb||!ol.length) return 1;
  const q=qb.getBoundingClientRect().left;
  const avg=ol.reduce((s,a)=>s+a.getBoundingClientRect().left,0)/ol.length;
  return q<avg?1:-1;
}

function animatePlay(text){
  const root=gamecastRoot(); if(!root||!text||text===lastPlay) return;
  lastPlay=text;
  const actors=[...root.querySelectorAll('.tso-ps886e__actors > .tso-ps886e__actor:not(.ghost)')];
  const ball=root.querySelector('.tso-ps886e__ball');
  if(actors.length<11) return;
  const offense=actors.slice(0,11),defense=actors.slice(11,22);
  const dir=inferDirection(offense);
  const type=/pass|sacked|scramble/i.test(text)?'pass':/rush|left end|right end|up the middle/i.test(text)?'rush':'other';
  const ease='cubic-bezier(.18,.76,.22,1)';
  offense.forEach((a,i)=>{
    const role=a.dataset.v888Role||'';
    let dx=0,dy=0;
    if(role==='OL'){dx=dir*8;dy=(i%2?3:-3);}
    else if(type==='pass'&&role==='QB'){dx=-dir*18;dy=0;}
    else if(type==='pass'){dx=dir*(role==='WR'?72:role==='TE'?48:32);dy=((i%3)-1)*12;}
    else if(type==='rush'&&role==='RB'){dx=dir*82;dy=0;}
    else if(type==='rush'){dx=dir*(role==='TE'||role==='WR'?30:12);dy=((i%3)-1)*7;}
    else dx=dir*20;
    a.getAnimations?.().forEach(x=>x.cancel());
    a.animate?.([{transform:'translate(0,0)'},{transform:`translate(${dx*.55}px,${dy*.55}px)`,offset:.55},{transform:`translate(${dx}px,${dy}px)`,offset:.82},{transform:'translate(0,0)'}],{duration:2600,easing:ease});
  });
  defense.forEach((a,i)=>{
    const dx=dir*(type==='pass'?24:type==='rush'?46:20),dy=((i%4)-1.5)*5;
    a.getAnimations?.().forEach(x=>x.cancel());
    a.animate?.([{transform:'translate(0,0)'},{transform:`translate(${dx}px,${dy}px)`,offset:.74},{transform:'translate(0,0)'}],{duration:2600,easing:ease});
  });
  if(ball){
    ball.getAnimations?.().forEach(x=>x.cancel());
    const bx=type==='pass'?dir*115:type==='rush'?dir*76:dir*28;
    ball.animate?.([{transform:'translate(0,0) scale(1)'},{transform:`translate(${bx*.35}px,-14px) scale(1.12)`,offset:.45},{transform:`translate(${bx}px,-4px) scale(.92)`,offset:.78},{transform:'translate(0,0) scale(1)'}],{duration:2500,easing:ease});
  }
  root.dataset.tsoReenacting='1';
  setTimeout(()=>{if(root.isConnected)root.dataset.tsoReenacting='0';},2700);
}

function run(){
  stripLegacyRerenderFlag();
  const text=currentText();
  if(text) animatePlay(text);
}

export function installNflGamecastLiveFixV896(){
  if(installed||typeof document==='undefined') return observer;
  installed=true;
  const style=document.createElement('style');
  style.id='tso-gamecast-live-fix-v896';
  style.textContent=`
    [data-tso-v886e-gamecast] .tso-v890-fieldImage{transition:none!important;}
    [data-tso-v886e-gamecast] .tso-ps886e__downlines,[data-tso-v886e-gamecast] .tso-ps886e__routes{transition:all .7s cubic-bezier(.18,.76,.22,1)!important;}
    [data-tso-v886e-gamecast][data-tso-reenacting="1"] .tso-ps886e__actor{will-change:transform,left,top;}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);
  observer=new MutationObserver(()=>requestAnimationFrame(run));
  observer.observe(document.getElementById('nflView')||document.body,{childList:true,subtree:true,characterData:true});
  run();
  return observer;
}

export const __V896_TEST__={inferDirection};
