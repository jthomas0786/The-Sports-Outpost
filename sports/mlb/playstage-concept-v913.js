const STYLE_ID='tso-mlb-playstage-concept-v913-style';
const ROOT='.tso-mlb-playstage-v901';
let installed=false,observer=null,raf=0;
function ensureStyles(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
/* v913 corrects the foreground framing after visual QA: bat stays attached to the hands and the plate reads above the lower callout. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-bat{left:-16%!important;top:48%!important;width:96px!important;height:9px!important;border-radius:999px!important;z-index:6!important;transform:rotate(18deg)!important;transform-origin:92% 50%!important;background:linear-gradient(180deg,#efc77f 0 28%,#b9793f 50%,#71401f 100%)!important;box-shadow:inset 0 1px rgba(255,255,255,.3),0 3px 4px rgba(0,0,0,.38)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps908-batter.is-swing .ps912-bat{animation:ps913BatSwing .64s cubic-bezier(.13,.72,.17,1) both!important}
@keyframes ps913BatSwing{0%{transform:rotate(18deg)}28%{transform:rotate(-10deg) translateX(1px)}58%{transform:rotate(-82deg) translate(5px,-1px)}100%{transform:rotate(-138deg) translate(10px,2px)}}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-plate{bottom:72px!important;width:38px!important;height:31px!important;z-index:80!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-box{bottom:18px!important;width:232px!important;height:128px!important;z-index:76!important;opacity:.78!important;transform:translateX(-50%) perspective(450px) rotateX(64deg)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-box:before{top:18px!important;width:72px!important;height:61px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-home-dirt{bottom:-1%!important;height:33%!important;opacity:.92!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps-callout{bottom:9px!important;width:min(690px,79%)!important}
@media(max-width:980px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-bat{width:86px!important;height:8px!important;left:-15%!important}.ps912-plate{bottom:64px!important;width:34px!important;height:28px!important}.ps912-box{width:208px!important;height:113px!important;bottom:16px!important}}
@media(max-width:620px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-bat{width:60px!important;height:6px!important;left:-14%!important;top:49%!important}.ps912-plate{bottom:42px!important;width:25px!important;height:20px!important}.ps912-box{width:145px!important;height:82px!important;bottom:7px!important}.ps912-box:before{top:10px!important;width:48px!important;height:39px!important}}
@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v913 .ps912-bat{animation:none!important}}
`;document.head.appendChild(s)}
function enhance(root){if(!root)return;root.classList.add('tso-mlb-concept-v913');root.dataset.approvedConcept='v913';}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance)}
function queue(){if(!raf)raf=requestAnimationFrame(scan)}
export function installMlbPlaystageConceptV913(){ensureStyles();if(installed){queue();return}installed=true;observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-player-id']});window.addEventListener('hashchange',queue);queue()}
export const __MLB_PLAYSTAGE_CONCEPT_V913_TEST__={STYLE_ID,ROOT};
