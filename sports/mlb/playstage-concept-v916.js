const STYLE_ID='tso-mlb-playstage-concept-v916-style';
const ROOT='.tso-mlb-playstage-v901';
let installed=false,observer=null,raf=0;

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* v916 keeps the live baseball alignment on the approved field at all times.
   These are the same actors v901 animates during plays — no duplicate player layer. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-batter,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-catcher,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-pitcher,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-runner{
  opacity:.97!important;
  pointer-events:none!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-batter,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-runner{
  opacity:1!important;
  filter:drop-shadow(0 5px 4px rgba(0,0,0,.62)) drop-shadow(0 0 8px rgba(45,127,255,.18))!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-out{opacity:.28!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-actor-label{
  position:absolute!important;
  left:50%!important;
  top:calc(100% - 1px)!important;
  transform:translateX(-50%)!important;
  display:flex!important;
  align-items:center!important;
  gap:3px!important;
  max-width:104px!important;
  padding:2px 4px!important;
  border:1px solid rgba(119,183,247,.42)!important;
  border-radius:999px!important;
  background:rgba(2,13,29,.82)!important;
  -webkit-backdrop-filter:blur(6px)!important;
  backdrop-filter:blur(6px)!important;
  box-shadow:0 3px 9px rgba(0,0,0,.34)!important;
  color:#f5f9ff!important;
  font:800 8.5px/1 'JetBrains Mono',monospace!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  z-index:2!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-actor-label b{
  flex:0 0 auto!important;
  color:#68d8ff!important;
  font:900 7.5px/1 'JetBrains Mono',monospace!important;
  letter-spacing:.02em!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-actor-label span{
  min-width:0!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-batter .ps-actor-label,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-catcher .ps-actor-label{
  top:auto!important;
  bottom:calc(100% - 2px)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-batter .ps-actor-label,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-runner .ps-actor-label{
  border-color:rgba(89,220,255,.62)!important;
  background:rgba(2,21,43,.88)!important;
}

/* Keep the full defensive alignment visually subordinate to the HUD but easy to read. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="LF"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="CF"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="RF"]{z-index:40!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="1B"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="2B"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="SS"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="3B"]{z-index:43!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-pitcher{z-index:45!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-runner{z-index:47!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-catcher{z-index:48!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-batter{z-index:50!important}

@media(max-width:720px){
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi{width:20px!important;height:29px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-batter{width:28px!important;height:40px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-catcher{width:23px!important;height:32px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-pitcher{width:22px!important;height:32px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-runner{width:22px!important;height:32px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="1B"],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="3B"]{width:19px!important;height:28px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="2B"],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="SS"]{width:18px!important;height:26px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="LF"],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="CF"],
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi[data-pos="RF"]{width:15px!important;height:22px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-actor-label{
    gap:2px!important;
    max-width:62px!important;
    padding:1.5px 2.5px!important;
    font-size:7px!important;
    border-radius:5px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-actor-label b{font-size:6px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-batter .ps-actor-label,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v916 .ps-chibi.ps-runner .ps-actor-label{font-size:7.5px!important;max-width:72px!important}
}
`;
  document.head.appendChild(s);
}

function decorateActor(el){
  if(!el) return;
  const name=(el.dataset.playerName||'').trim();
  const role=(el.dataset.actorRole||el.dataset.pos||'').trim();
  if(name) el.setAttribute('aria-label',`${role?`${role} `:''}${name}`.trim());
  if(!el.querySelector(':scope > .ps-actor-label')&&name){
    const last=name.split(/\s+/).filter(Boolean).at(-1)||name;
    const label=document.createElement('span');
    label.className='ps-actor-label';
    label.innerHTML=`<b>${role||'•'}</b><span>${last}</span>`;
    el.appendChild(label);
  }
}
function enhance(root){
  if(!root) return;
  root.classList.add('tso-mlb-concept-v916');
  root.dataset.fieldActors='v916';
  root.querySelectorAll('.ps-chibi').forEach(decorateActor);
}
function scan(){
  raf=0;
  if(document.documentElement.getAttribute('data-sport')!=='mlb') return;
  document.querySelectorAll(ROOT).forEach(enhance);
}
function queue(){if(!raf) raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV916(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-player-id','data-player-name','data-actor-role','data-base']});
  window.addEventListener('hashchange',queue);
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V916_TEST__={STYLE_ID,ROOT};
