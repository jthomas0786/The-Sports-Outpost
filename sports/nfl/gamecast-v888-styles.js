const STYLE_ID='tso-nfl-gamecast-v888-enhancer-styles';

export function ensureNflGamecastV888Styles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
  const css=`
  [data-tso-v886e-gamecast]{--v888-cyan:#1fc8ff;--v888-yellow:#ffd600}
  [data-tso-v886e-gamecast] .tso-ps886e__scene{isolation:isolate;background:#05111e;overflow:hidden}
  [data-tso-v886e-gamecast] .tso-v888-stageWarp{position:absolute;inset:0;transform-origin:50% 100%;transform:perspective(1600px) rotateX(2.6deg) scale(1.022) translateY(-.2%);will-change:transform}
  [data-tso-v886e-gamecast] .tso-v888-stageWarp>.tso-ps886e__fieldSvg,[data-tso-v886e-gamecast] .tso-v888-stageWarp>.tso-ps886e__shell,[data-tso-v886e-gamecast] .tso-v888-stageWarp>.tso-ps886e__routes,[data-tso-v886e-gamecast] .tso-v888-stageWarp>.tso-ps886e__actors{position:absolute;inset:0}
  [data-tso-v886e-gamecast] .tso-v888-basefield{filter:saturate(.98) contrast(1.07) brightness(.93)}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines{z-index:3!important;mix-blend-mode:screen;filter:saturate(1.22) brightness(1.2)}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line{vector-effect:non-scaling-stroke}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(1),[data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(5){opacity:.1!important;stroke-width:34!important}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(2),[data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(6){opacity:.34!important;stroke-width:15!important}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(3),[data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(7){opacity:1!important;stroke-width:5.5!important}
  [data-tso-v886e-gamecast] .tso-ps886e__routes{z-index:6!important;filter:drop-shadow(0 0 5px rgba(36,195,255,.28))}
  [data-tso-v886e-gamecast] .tso-ps886e__shell{z-index:4!important}[data-tso-v886e-gamecast] .tso-ps886e__actors{z-index:7!important}
  .tso-v888-fieldfx{position:absolute;inset:0;z-index:2;pointer-events:none}.tso-v888-fieldfx:before{content:'';position:absolute;left:0;right:0;top:21.8%;bottom:3.1%;clip-path:polygon(10.25% 0,89.75% 0,100% 100%,0 100%);background:linear-gradient(180deg,rgba(255,255,255,.06),transparent 18%,transparent 76%,rgba(0,0,0,.14)),repeating-linear-gradient(90deg,rgba(255,255,255,.02) 0 1px,transparent 1px 10px);mix-blend-mode:soft-light}
  .tso-v888-scrim{position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(180deg,rgba(4,17,34,.07),transparent 18%,transparent 82%,rgba(2,8,16,.08))}
  [data-tso-v886e-gamecast] .tso-ps886e__actor{width:60px!important;height:122px!important;transform:translate(-50%,-98%) scale(var(--scale,1))!important;filter:drop-shadow(0 9px 7px rgba(0,0,0,.5))!important;overflow:visible;transition:left .62s cubic-bezier(.18,.76,.22,1),top .62s cubic-bezier(.18,.76,.22,1),transform .62s cubic-bezier(.18,.76,.22,1),opacity .28s ease!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v888-role='OL'],[data-tso-v886e-gamecast] .tso-ps886e__actor[data-v888-role='DL']{width:66px!important;height:118px!important}[data-tso-v886e-gamecast] .tso-ps886e__actor[data-v888-role='QB']{width:64px!important;height:128px!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actorGraphic,[data-tso-v886e-gamecast] .tso-ps886e__actorGraphic>svg{inset:0!important;width:100%!important;height:100%!important;overflow:visible!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actor.ghost{opacity:.24!important;mix-blend-mode:screen}[data-tso-v886e-gamecast] .tso-ps886e__actor.ghost .v888-player{filter:grayscale(1) brightness(1.6) saturate(.25)}
  [data-tso-v886e-gamecast] .tso-ps886e__actorSpot{bottom:0!important;width:54px!important;height:16px!important;border:2px solid #1fbaff!important;box-shadow:0 0 0 3px rgba(15,157,255,.1),0 0 17px 5px rgba(11,173,255,.56)!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actorLabel{top:117px!important}[data-tso-v886e-gamecast] .tso-ps886e__actor[data-v888-role='QB'] .tso-ps886e__actorLabel{top:123px!important}
  [data-tso-v886e-gamecast] .tso-ps886e__ball{z-index:8!important;transition:left .62s cubic-bezier(.18,.76,.22,1),top .62s cubic-bezier(.18,.76,.22,1)!important}
  .v888-player .v888-jersey-number{paint-order:stroke;stroke:rgba(0,0,0,.56);stroke-width:1.35px}.v888-player .v888-facemask{filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
  [data-tso-v886e-gamecast] .tso-v888-endzone-text{font-size:40px!important;font-weight:900!important;letter-spacing:.04em;paint-order:stroke;stroke:rgba(0,0,0,.15);stroke-width:.8px}[data-tso-v886e-gamecast] .tso-v888-endzone-logo{opacity:.98}
  @media(max-width:760px){[data-tso-v886e-gamecast] .tso-v888-stageWarp{transform:perspective(1200px) rotateX(2.15deg) scale(1.015)}[data-tso-v886e-gamecast] .tso-ps886e__actor{width:44px!important;height:90px!important}[data-tso-v886e-gamecast] .tso-ps886e__actor[data-v888-role='QB']{width:46px!important;height:96px!important}}
  `;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=css;document.head.appendChild(style);
}
