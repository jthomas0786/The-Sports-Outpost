const STYLE_ID='tso-nfl-gamecast-v887-enhancer-styles';

export function ensureNflGamecastV887Styles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
  const css=`
  /* v88.7 — concept-match refinement layer. It intentionally sits on top of
     the v88.6e PlayStage so the live data/render pipeline stays untouched. */
  [data-tso-v886e-gamecast]{--v887-cyan:#20c8ff;--v887-blue:#057dff;--v887-yellow:#ffd60a;--v887-ink:#020b17}
  [data-tso-v886e-gamecast] .tso-ps886e__scene{isolation:isolate;background:#06111f}
  [data-tso-v886e-gamecast] .tso-ps886e__fieldSvg:not(.tso-ps886e__downlines):not(.tso-ps886e__routes){filter:saturate(.94) contrast(1.06) brightness(.94)}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines{z-index:3!important;mix-blend-mode:screen;filter:saturate(1.2) brightness(1.18)}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line{vector-effect:non-scaling-stroke}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(1),
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(5){opacity:.09!important;stroke-width:31!important}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(2),
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(6){opacity:.32!important;stroke-width:13!important}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(3),
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(7){opacity:1!important;stroke-width:5.1!important}
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(4),
  [data-tso-v886e-gamecast] .tso-ps886e__downlines line:nth-of-type(8){opacity:.82!important;stroke-width:1.15!important}
  [data-tso-v886e-gamecast] .tso-ps886e__routes{z-index:6!important;filter:drop-shadow(0 0 4px rgba(38,190,255,.26))}
  [data-tso-v886e-gamecast] .tso-ps886e__routes path{vector-effect:non-scaling-stroke}
  [data-tso-v886e-gamecast] .tso-ps886e__shell{z-index:4!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actors{z-index:7!important}

  .tso-v887-fieldfx{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
  .tso-v887-fieldfx:before{content:'';position:absolute;left:0;right:0;top:21.8%;bottom:3.1%;clip-path:polygon(10.1% 0,89.9% 0,100% 100%,0 100%);background:
      linear-gradient(180deg,rgba(255,255,255,.055),transparent 18%,transparent 76%,rgba(0,0,0,.16)),
      repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0 1px,transparent 1px 9px);mix-blend-mode:soft-light;opacity:.9}
  .tso-v887-fieldfx:after{content:'';position:absolute;left:0;right:0;top:21.8%;bottom:3.1%;clip-path:polygon(10.1% 0,89.9% 0,100% 100%,0 100%);box-shadow:inset 0 16px 22px rgba(1,11,23,.22),inset 0 -16px 24px rgba(0,0,0,.20);background:radial-gradient(ellipse at 50% 54%,transparent 38%,rgba(0,5,12,.10) 78%,rgba(0,5,12,.23) 100%)}
  .tso-v887-scrim{position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(180deg,rgba(4,17,34,.08) 0,transparent 18%,transparent 82%,rgba(2,8,16,.09) 100%)}

  /* Taller, football-shaped player silhouettes. The outer actor remains at the
     exact live-field coordinate produced by v88.6e; only the visual sprite changes. */
  [data-tso-v886e-gamecast] .tso-ps886e__actor{width:58px!important;height:116px!important;transform:translate(-50%,-98%) scale(var(--scale,1))!important;filter:drop-shadow(0 9px 7px rgba(0,0,0,.48))!important;overflow:visible}
  [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="OL"],
  [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="DL"]{width:62px!important;height:112px!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="QB"]{width:61px!important;height:122px!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actor.key{filter:drop-shadow(0 0 8px rgba(27,185,255,.48)) drop-shadow(0 9px 7px rgba(0,0,0,.48))!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actorGraphic{inset:0!important;overflow:visible}
  [data-tso-v886e-gamecast] .tso-ps886e__actorGraphic>svg{width:100%!important;height:100%!important;overflow:visible!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actor.ghost{opacity:.26!important;filter:drop-shadow(0 4px 5px rgba(0,0,0,.2))!important;mix-blend-mode:screen}
  [data-tso-v886e-gamecast] .tso-ps886e__actor.ghost .v887-player{filter:grayscale(1) brightness(1.55) saturate(.35)}
  [data-tso-v886e-gamecast] .tso-ps886e__actorSpot{bottom:0!important;width:52px!important;height:15px!important;border:2px solid #1fbaff!important;background:radial-gradient(ellipse at center,rgba(63,205,255,.22),rgba(7,119,255,.08) 48%,transparent 72%)!important;box-shadow:0 0 0 3px rgba(15,157,255,.10),0 0 17px 5px rgba(11,173,255,.56),inset 0 0 9px rgba(70,213,255,.34)!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actorLabel{top:112px!important;padding:3px 8px!important;background:rgba(1,12,27,.92)!important;border:1px solid rgba(54,170,255,.72)!important;box-shadow:0 4px 10px rgba(0,0,0,.42),0 0 9px rgba(25,169,255,.19)!important;font-size:10px!important;z-index:7!important}
  [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="QB"] .tso-ps886e__actorLabel{top:118px!important}
  [data-tso-v886e-gamecast] .tso-ps886e__ball{z-index:8!important;width:24px!important;height:14px!important;border-radius:72% 48% 72% 48%!important;box-shadow:0 0 0 2px rgba(80,198,255,.10),0 4px 8px rgba(0,0,0,.52),0 0 7px rgba(238,156,88,.22)!important}

  .v887-player .v887-jersey-number{paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:1.25px}
  .v887-player .v887-facemask{filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
  .v887-player .v887-pad-highlight{mix-blend-mode:screen}
  .v887-player .v887-cleat{filter:drop-shadow(0 2px 1px rgba(0,0,0,.45))}

  @media(max-width:760px){
    [data-tso-v886e-gamecast] .tso-ps886e__actor{width:43px!important;height:86px!important}
    [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="OL"],
    [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="DL"]{width:46px!important;height:84px!important}
    [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="QB"]{width:45px!important;height:91px!important}
    [data-tso-v886e-gamecast] .tso-ps886e__actorSpot{width:38px!important;height:11px!important}
    [data-tso-v886e-gamecast] .tso-ps886e__actorLabel{top:84px!important;font-size:8px!important;padding:2px 6px!important}
    [data-tso-v886e-gamecast] .tso-ps886e__actor[data-v887-role="QB"] .tso-ps886e__actorLabel{top:88px!important}
  }
  `;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.appendChild(style);
}
