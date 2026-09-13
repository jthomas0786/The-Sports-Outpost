const STYLE_ID='tso-mlb-playstage-concept-v910-style';
const ROOT='.tso-mlb-playstage-v901';
let installed=false,observer=null,raf=0;

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-center{display:block!important;min-height:690px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-stage{height:100%!important;min-height:690px!important;position:absolute!important;inset:0!important;perspective:1800px!important;perspective-origin:50% 95%!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps909-scene{inset:0!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps909-scene svg{width:100%!important;height:100%!important;filter:saturate(1.09) contrast(1.055) brightness(.985)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps909-scene:after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 72%,rgba(255,240,208,.055),transparent 37%),radial-gradient(ellipse at 50% 31%,rgba(111,177,228,.07),transparent 44%),linear-gradient(180deg,rgba(0,0,0,.02),transparent 35%,rgba(0,0,0,.07) 82%,rgba(0,0,0,.17));mix-blend-mode:screen}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-foreground{z-index:84!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-batter{left:42.1%!important;width:166px!important;height:230px!important;bottom:17px!important;filter:drop-shadow(0 17px 10px rgba(0,0,0,.56)) drop-shadow(-2px 2px 1px rgba(255,255,255,.07))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-catcher{left:51%!important;width:128px!important;height:176px!important;bottom:15px!important;filter:drop-shadow(0 15px 9px rgba(0,0,0,.58))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-umpire{left:59.1%!important;width:112px!important;height:160px!important;bottom:14px!important;filter:drop-shadow(0 14px 9px rgba(0,0,0,.62))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-hero svg{filter:saturate(1.07) contrast(1.055) brightness(1.01)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-batter svg{filter:saturate(1.08) contrast(1.065) brightness(1.015) drop-shadow(0 2px 1px rgba(0,0,0,.22))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-catcher svg{filter:saturate(1.05) contrast(1.06) drop-shadow(0 2px 1px rgba(0,0,0,.26))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps908-umpire svg{filter:contrast(1.08) drop-shadow(0 2px 1px rgba(0,0,0,.3))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi:not(.ps-batter):not(.ps-catcher){transform-style:preserve-3d!important;filter:drop-shadow(0 12px 7px rgba(0,0,0,.53)) drop-shadow(0 1px 1px rgba(255,255,255,.08))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi:not(.ps-batter):not(.ps-catcher)>.ps905-rig{filter:saturate(1.1) contrast(1.065) brightness(1.015) drop-shadow(0 2px 1px rgba(0,0,0,.32))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi.ps-pitcher{width:102px!important;height:148px!important;z-index:28!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi[data-pos="1B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi[data-pos="3B"]{width:73px!important;height:106px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi[data-pos="2B"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi[data-pos="SS"]{width:66px!important;height:97px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi[data-pos="LF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi[data-pos="CF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi[data-pos="RF"]{width:45px!important;height:67px!important;filter:drop-shadow(0 7px 4px rgba(0,0,0,.46)) saturate(.97) contrast(1.03)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-chibi.ps-runner{filter:drop-shadow(0 11px 7px rgba(0,0,0,.52))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps910-gloss{pointer-events:none;mix-blend-mode:screen;opacity:.95}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps910-gloss .head-hi{fill:rgba(255,255,255,.15)}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps910-gloss .head-rim{fill:none;stroke:rgba(255,228,207,.18);stroke-width:1.5}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps910-gloss .cap-hi{fill:none;stroke:rgba(255,255,255,.2);stroke-width:2.1;stroke-linecap:round}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps910-gloss .jersey-hi{fill:rgba(255,255,255,.09)}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps910-gloss .shoe-hi{fill:none;stroke:rgba(212,237,255,.26);stroke-width:1.4;stroke-linecap:round}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps910-groundglow{position:absolute;left:24%;right:24%;bottom:1.5%;height:11%;z-index:80;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(255,224,181,.07),rgba(21,70,51,.035) 42%,transparent 72%);filter:blur(2px)}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-play-banner{z-index:101!important;backdrop-filter:blur(10px) saturate(1.08)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-metrics{z-index:101!important;backdrop-filter:blur(10px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-callout{z-index:102!important;bottom:13px!important;width:min(720px,82%)!important;padding:11px 18px!important;backdrop-filter:blur(9px) saturate(1.07)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-truth{z-index:103!important;bottom:3px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-ball{z-index:104!important;filter:drop-shadow(0 0 5px rgba(255,255,255,.7))!important}
@media(max-width:980px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-stage{min-height:650px!important}.ps908-batter{width:150px!important;height:208px!important}.ps908-catcher{width:118px!important;height:162px!important}.ps908-umpire{width:102px!important;height:146px!important}}
@media(max-width:620px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-center{min-height:455px!important}html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v910 .ps-stage{min-height:455px!important}.ps908-batter{left:41.4%!important;width:112px!important;height:155px!important;bottom:9px!important}.ps908-catcher{width:88px!important;height:121px!important;bottom:8px!important}.ps908-umpire{width:74px!important;height:106px!important;bottom:8px!important}}
`;
 document.head.appendChild(s);
}

function addGloss(el){
 const svg=el.querySelector(':scope>.ps905-rig');if(!svg||svg.querySelector(':scope>.ps910-gloss'))return;
 const ns='http://www.w3.org/2000/svg';
 const g=document.createElementNS(ns,'g');g.setAttribute('class','ps910-gloss');
 g.innerHTML='<ellipse class="head-hi" cx="47" cy="46" rx="8.5" ry="12"/><ellipse class="head-rim" cx="60" cy="60" rx="29.5" ry="29"/><path class="cap-hi" d="M40 31 Q58 23 77 30"/><path class="jersey-hi" d="M39 84 Q47 79 54 80 L49 121 Q42 120 36 114Z"/><path class="shoe-hi" d="M41 164 L55 164 M65 164 L80 164"/>';
 svg.appendChild(g);
}
function addGroundGlow(stage){if(stage&&!stage.querySelector(':scope>.ps910-groundglow'))stage.insertAdjacentHTML('beforeend','<div class="ps910-groundglow" aria-hidden="true"></div>');}
function enhance(root){if(!root)return;root.classList.add('tso-mlb-concept-v910');root.dataset.approvedConcept='v910';const stage=root.querySelector('.ps-stage');addGroundGlow(stage);root.querySelectorAll('.ps-chibi:not(.ps-batter):not(.ps-catcher)').forEach(addGloss);}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance);}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV910(){ensureStyles();if(installed){queue();return;}installed=true;observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-player-id']});window.addEventListener('hashchange',queue);queue();}
export const __MLB_PLAYSTAGE_CONCEPT_V910_TEST__={STYLE_ID,ROOT};
