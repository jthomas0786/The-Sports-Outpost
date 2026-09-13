const STYLE_ID='tso-mlb-playstage-concept-v914-style';
const ROOT='.tso-mlb-playstage-v901';
const FIELD_SRC='./images/mlb/playstage-field-v914.jpg';
let installed=false,observer=null,raf=0;

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps907-scene,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps909-scene,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps908-atmosphere,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps908-foreground,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps911-fieldfx,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps911-lens,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps911-homeglow,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps912-home-dirt,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps912-box,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps912-plate{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-center{min-height:650px!important;background:#020914!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-stage{height:650px!important;min-height:650px!important;background:#020914!important;overflow:hidden!important;perspective:1600px!important;perspective-origin:50% 98%!important;isolation:isolate!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-stage:before{content:''!important;position:absolute!important;inset:0!important;z-index:78!important;pointer-events:none!important;background:radial-gradient(ellipse at 50% 66%,transparent 0 57%,rgba(0,0,0,.045) 78%,rgba(0,0,0,.17) 100%),linear-gradient(180deg,rgba(22,77,126,.025),transparent 34%,rgba(0,0,0,.05))!important;box-shadow:inset 0 0 54px rgba(0,0,0,.18)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-stage:after{content:''!important;position:absolute!important;inset:0!important;z-index:79!important;pointer-events:none!important;background:linear-gradient(90deg,rgba(0,0,0,.035),transparent 9% 91%,rgba(0,0,0,.035))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps914-field{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;z-index:1;pointer-events:none;user-select:none}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi{transform:translate(-50%,-91%)!important;transform-origin:50% 100%!important;filter:drop-shadow(0 6px 4px rgba(0,0,0,.5)) drop-shadow(0 1px 1px rgba(255,255,255,.06))!important;transition:left .34s cubic-bezier(.2,.7,.2,1),top .34s cubic-bezier(.2,.7,.2,1)!important;z-index:30!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi>.ps905-rig{filter:saturate(1.08) contrast(1.075) brightness(1.015) drop-shadow(0 1.5px 1px rgba(0,0,0,.36))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi.ps-batter{opacity:1!important;pointer-events:none!important;width:76px!important;height:105px!important;transform:translate(-50%,-90%)!important;z-index:46!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi.ps-catcher{opacity:1!important;pointer-events:none!important;width:61px!important;height:85px!important;transform:translate(-50%,-89%)!important;z-index:43!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi.ps-pitcher{width:58px!important;height:84px!important;z-index:36!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi[data-pos="1B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi[data-pos="3B"]{width:45px!important;height:65px!important;z-index:34!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi[data-pos="2B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi[data-pos="SS"]{width:41px!important;height:60px!important;z-index:33!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi[data-pos="LF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi[data-pos="CF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi[data-pos="RF"]{width:29px!important;height:43px!important;z-index:31!important;filter:drop-shadow(0 4px 3px rgba(0,0,0,.47)) saturate(.98)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi.ps-runner{width:46px!important;height:67px!important;z-index:40!important;filter:drop-shadow(0 5px 3px rgba(0,0,0,.52))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi.ps-batter>.ps907-backrig,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi.ps-catcher>.ps907-backrig{display:block!important;width:100%!important;height:100%!important;filter:saturate(1.08) contrast(1.07) brightness(1.015) drop-shadow(0 2px 1px rgba(0,0,0,.38))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps907-ump{display:block!important;left:52.1%!important;top:90.1%!important;width:44px!important;height:64px!important;transform:translate(-50%,-90%)!important;z-index:41!important;filter:drop-shadow(0 5px 3px rgba(0,0,0,.55))!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-play-banner{z-index:96!important;top:12px!important;left:12px!important;max-width:min(390px,52%)!important;background:rgba(3,16,34,.9)!important;backdrop-filter:blur(9px) saturate(1.05)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-metrics{z-index:96!important;top:12px!important;right:12px!important;background:rgba(3,16,34,.9)!important;backdrop-filter:blur(9px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-callout{z-index:97!important;bottom:11px!important;width:min(650px,74%)!important;padding:9px 15px!important;background:linear-gradient(180deg,rgba(3,18,38,.93),rgba(1,9,21,.94))!important;backdrop-filter:blur(8px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-truth{z-index:98!important;bottom:1px!important;opacity:.65!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-ball,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-balltrail{z-index:99!important}

@media(max-width:980px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-center{min-height:610px!important}html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-stage{height:610px!important;min-height:610px!important}.ps-chibi.ps-batter{width:70px!important;height:97px!important}.ps-chibi.ps-catcher{width:56px!important;height:78px!important}.ps-chibi.ps-pitcher{width:53px!important;height:77px!important}.ps907-ump{width:40px!important;height:58px!important}}
@media(max-width:620px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-center{min-height:445px!important}html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-stage{height:445px!important;min-height:445px!important}.ps-chibi.ps-batter{width:54px!important;height:75px!important}.ps-chibi.ps-catcher{width:43px!important;height:60px!important}.ps-chibi.ps-pitcher{width:40px!important;height:58px!important}.ps-chibi[data-pos="1B"],.ps-chibi[data-pos="3B"]{width:33px!important;height:48px!important}.ps-chibi[data-pos="2B"],.ps-chibi[data-pos="SS"]{width:30px!important;height:44px!important}.ps-chibi[data-pos="LF"],.ps-chibi[data-pos="CF"],.ps-chibi[data-pos="RF"]{width:22px!important;height:32px!important}.ps-chibi.ps-runner{width:34px!important;height:49px!important}.ps907-ump{width:31px!important;height:45px!important}.ps-play-banner{max-width:62%!important}.ps-callout{width:80%!important}}
@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v914 .ps-chibi{transition:none!important}}
`;
 document.head.appendChild(s);
}
function addField(stage){if(!stage||stage.querySelector(':scope>.ps914-field'))return;stage.insertAdjacentHTML('afterbegin',`<img class="ps914-field" src="${FIELD_SRC}" alt="" aria-hidden="true" decoding="async" draggable="false">`);}
function enhance(root){if(!root)return;root.classList.add('tso-mlb-concept-v914');root.dataset.approvedConcept='v914';addField(root.querySelector('.ps-stage'));}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance);}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV914(){ensureStyles();if(installed){queue();return;}installed=true;observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-player-id']});window.addEventListener('hashchange',queue);queue();}
export const __MLB_PLAYSTAGE_CONCEPT_V914_TEST__={STYLE_ID,ROOT,FIELD_SRC};
