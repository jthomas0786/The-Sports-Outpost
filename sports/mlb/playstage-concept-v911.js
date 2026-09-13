const STYLE_ID='tso-mlb-playstage-concept-v911-style';
const ROOT='.tso-mlb-playstage-v901';
let installed=false,observer=null,raf=0;

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-center{min-height:690px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-stage{min-height:690px!important;perspective:1550px!important;perspective-origin:50% 100%!important;background:#03101d!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps909-scene svg{filter:saturate(.99) contrast(1.075) brightness(.985)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps909-scene:after{background:radial-gradient(ellipse at 50% 68%,rgba(255,233,194,.05),transparent 35%),linear-gradient(180deg,rgba(1,8,18,.04),transparent 30%,rgba(1,8,18,.02) 67%,rgba(0,0,0,.16))!important;mix-blend-mode:normal!important}

/* Match the approved broadcast reference: foreground characters frame home plate instead of dominating it. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps908-batter{left:42.3%!important;width:151px!important;height:208px!important;bottom:-7px!important;filter:drop-shadow(0 15px 9px rgba(0,0,0,.55))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps908-catcher{left:50.9%!important;width:111px!important;height:153px!important;bottom:-6px!important;filter:drop-shadow(0 13px 8px rgba(0,0,0,.58))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps908-umpire{left:58.7%!important;width:95px!important;height:137px!important;bottom:-6px!important;filter:drop-shadow(0 13px 8px rgba(0,0,0,.62))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps908-hero svg{filter:saturate(1.025) contrast(1.07) brightness(1.005)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps910-gloss{opacity:.72!important}

/* Stronger depth falloff from home plate to the wall. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi.ps-pitcher{width:86px!important;height:125px!important;z-index:28!important;filter:drop-shadow(0 9px 6px rgba(0,0,0,.5))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi[data-pos="1B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi[data-pos="3B"]{width:60px!important;height:88px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi[data-pos="2B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi[data-pos="SS"]{width:54px!important;height:80px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi[data-pos="LF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi[data-pos="CF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi[data-pos="RF"]{width:37px!important;height:55px!important;filter:drop-shadow(0 5px 3px rgba(0,0,0,.43)) saturate(.94) contrast(1.02)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-chibi.ps-runner{width:59px!important;height:86px!important;filter:drop-shadow(0 9px 5px rgba(0,0,0,.49))!important}

/* Broadcast-field texture: subtle mow lines, dirt warmth and lens falloff without obscuring live objects. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps911-fieldfx{position:absolute;left:0;right:0;bottom:0;height:49%;z-index:4;pointer-events:none;opacity:.54;mix-blend-mode:soft-light;background:repeating-linear-gradient(101deg,rgba(235,255,228,.09) 0 34px,rgba(0,24,8,.07) 34px 68px),radial-gradient(ellipse at 50% 77%,rgba(255,219,164,.18) 0 11%,transparent 29%),repeating-radial-gradient(circle at 40% 45%,rgba(255,255,255,.055) 0 1px,transparent 1px 5px);mask-image:linear-gradient(to bottom,transparent,rgba(0,0,0,.7) 19%,#000 100%)}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps911-lens{position:absolute;inset:0;z-index:83;pointer-events:none;background:radial-gradient(ellipse at 50% 57%,transparent 43%,rgba(1,7,14,.06) 70%,rgba(0,4,10,.18) 100%),linear-gradient(180deg,rgba(82,146,198,.035),transparent 34%);box-shadow:inset 0 -22px 40px rgba(0,0,0,.12)}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps911-homeglow{position:absolute;left:28%;right:28%;bottom:-2%;height:24%;z-index:79;pointer-events:none;background:radial-gradient(ellipse at 50% 60%,rgba(226,174,119,.14),rgba(79,112,66,.035) 48%,transparent 72%);filter:blur(3px)}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-play-banner{background:linear-gradient(180deg,rgba(4,22,42,.96),rgba(2,13,28,.95))!important;box-shadow:0 10px 26px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.035)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-metrics{background:rgba(3,17,34,.95)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-callout{bottom:15px!important;width:min(700px,80%)!important;padding:10px 16px!important;background:linear-gradient(180deg,rgba(4,22,42,.97),rgba(2,10,22,.97))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-truth{opacity:.58!important}

@media(max-width:980px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-stage{min-height:650px!important}.ps908-batter{width:137px!important;height:189px!important}.ps908-catcher{width:104px!important;height:143px!important}.ps908-umpire{width:89px!important;height:128px!important}}
@media(max-width:620px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-center{min-height:455px!important}html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v911 .ps-stage{min-height:455px!important}.ps908-batter{left:41.8%!important;width:105px!important;height:145px!important;bottom:-3px!important}.ps908-catcher{width:82px!important;height:113px!important;bottom:-3px!important}.ps908-umpire{width:69px!important;height:100px!important;bottom:-3px!important}.ps911-fieldfx{height:52%!important}}
`;
 document.head.appendChild(s);
}
function addFx(stage){
 if(!stage)return;
 if(!stage.querySelector(':scope>.ps911-fieldfx'))stage.insertAdjacentHTML('beforeend','<div class="ps911-fieldfx" aria-hidden="true"></div><div class="ps911-homeglow" aria-hidden="true"></div><div class="ps911-lens" aria-hidden="true"></div>');
}
function enhance(root){if(!root)return;root.classList.add('tso-mlb-concept-v911');root.dataset.approvedConcept='v911';addFx(root.querySelector('.ps-stage'));}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance);}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV911(){ensureStyles();if(installed){queue();return;}installed=true;observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-player-id']});window.addEventListener('hashchange',queue);queue();}
export const __MLB_PLAYSTAGE_CONCEPT_V911_TEST__={STYLE_ID,ROOT};
