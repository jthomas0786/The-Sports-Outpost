const STYLE_ID='tso-mlb-playstage-concept-v912-style';
const ROOT='.tso-mlb-playstage-v901';
let installed=false,observer=null,raf=0;

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps-stage{overflow:hidden!important}

/* Put a real home-plate visual anchor under the foreground trio. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-home-dirt{position:absolute;left:50%;bottom:-5.5%;width:47%;height:30%;transform:translateX(-50%);z-index:5;pointer-events:none;background:radial-gradient(ellipse at 50% 63%,rgba(196,137,83,.72) 0 19%,rgba(177,113,65,.58) 31%,rgba(117,73,45,.26) 49%,transparent 69%);filter:saturate(.96) contrast(1.03)}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-box{position:absolute;left:50%;bottom:-1px;width:244px;height:116px;transform:translateX(-50%) perspective(430px) rotateX(63deg);transform-origin:50% 100%;z-index:77;pointer-events:none;border:3px solid rgba(245,248,241,.72);border-bottom:0;border-radius:4px 4px 0 0;box-shadow:0 -1px 0 rgba(255,255,255,.18),inset 0 1px 0 rgba(255,255,255,.12)}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-box:before{content:'';position:absolute;left:50%;top:21px;width:78px;height:54px;transform:translateX(-50%);border:2px solid rgba(245,248,241,.55);border-bottom:0}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-plate{position:absolute;left:50%;bottom:24px;width:42px;height:34px;transform:translateX(-50%);z-index:79;pointer-events:none;background:linear-gradient(180deg,#fff,#dce4e8);clip-path:polygon(11% 0,89% 0,100% 54%,50% 100%,0 54%);filter:drop-shadow(0 3px 3px rgba(0,0,0,.45))}

/* The generated foreground pose had a bat that visually disappeared. Add a dedicated broadcast-visible bat tied to the live swing state. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps908-batter{overflow:visible!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-bat{position:absolute;left:4%;top:32%;width:10px;height:93px;border-radius:999px;z-index:-1;pointer-events:none;background:linear-gradient(90deg,#71401f 0 18%,#c58a4c 27%,#efc279 54%,#9a5f30 82%,#5f351b);box-shadow:inset 1px 0 rgba(255,255,255,.22),0 3px 4px rgba(0,0,0,.35);transform:rotate(-63deg);transform-origin:50% 91%}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps908-batter.is-swing .ps912-bat{animation:ps912BatSwing .64s cubic-bezier(.13,.72,.17,1) both}
@keyframes ps912BatSwing{0%{transform:rotate(-63deg)}30%{transform:rotate(-86deg) translateY(-1px)}62%{transform:rotate(40deg) translate(9px,-3px)}100%{transform:rotate(93deg) translate(16px,1px)}}

/* Slightly open the foreground so the plate, chalk and pitch lane remain readable. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps908-batter{left:41.8%!important;width:146px!important;height:201px!important;bottom:-9px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps908-catcher{left:50.7%!important;width:106px!important;height:146px!important;bottom:-8px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps908-umpire{left:58.3%!important;width:91px!important;height:132px!important;bottom:-8px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps-callout{bottom:11px!important;z-index:110!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps-truth{z-index:111!important;bottom:1px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps-ball{z-index:112!important}

@media(max-width:980px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-box{width:214px;height:101px}.ps912-plate{bottom:21px!important;width:37px!important;height:30px!important}.ps908-batter{width:133px!important;height:183px!important}.ps908-catcher{width:99px!important;height:136px!important}.ps908-umpire{width:85px!important;height:123px!important}}
@media(max-width:620px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-box{width:154px;height:73px;border-width:2px;bottom:-6px}.ps912-box:before{top:12px!important;width:51px!important;height:38px!important}.ps912-plate{bottom:11px!important;width:27px!important;height:22px!important}.ps912-home-dirt{width:60%!important;height:32%!important}.ps908-batter{left:41.5%!important;width:101px!important;height:139px!important;bottom:-5px!important}.ps908-catcher{width:78px!important;height:107px!important;bottom:-4px!important}.ps908-umpire{width:66px!important;height:96px!important;bottom:-4px!important}.ps912-bat{width:7px!important;height:64px!important}}
@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v912 .ps912-bat{animation:none!important}}
`;
 document.head.appendChild(s);
}

function addStageFx(stage){
 if(!stage||stage.querySelector(':scope>.ps912-box'))return;
 stage.insertAdjacentHTML('beforeend','<div class="ps912-home-dirt" aria-hidden="true"></div><div class="ps912-box" aria-hidden="true"></div><div class="ps912-plate" aria-hidden="true"></div>');
}
function addBat(root){
 const batter=root.querySelector('.ps908-batter');
 if(batter&&!batter.querySelector(':scope>.ps912-bat'))batter.insertAdjacentHTML('beforeend','<span class="ps912-bat" aria-hidden="true"></span>');
}
function enhance(root){if(!root)return;root.classList.add('tso-mlb-concept-v912');root.dataset.approvedConcept='v912';addStageFx(root.querySelector('.ps-stage'));addBat(root);}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance);}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV912(){ensureStyles();if(installed){queue();return;}installed=true;observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-player-id']});window.addEventListener('hashchange',queue);queue();}
export const __MLB_PLAYSTAGE_CONCEPT_V912_TEST__={STYLE_ID,ROOT};
