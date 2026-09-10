const STYLE_ID='tso-nfl-gamecast-v890-layer-styles';

export function ensureNflGamecastV890Styles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
  const css=`
  /* v89.0 — one visible field, one invisible logic field, separate gameplay layers. */
  [data-tso-v886e-gamecast] .tso-ps886e__scene{position:relative!important;isolation:isolate!important;background:#06111f!important;overflow:hidden!important;perspective:none!important}

  /* The original generated field stays mounted as the geometry/data source but is never painted. */
  [data-tso-v886e-gamecast] .tso-ps886e__fieldSvg:not(.tso-ps886e__downlines):not(.tso-ps886e__routes){opacity:0!important;visibility:hidden!important;pointer-events:none!important}
  [data-tso-v886e-gamecast] .tso-ps886e__shell{display:none!important}

  /* Approved clean art is the only visible stadium/field surface. */
  [data-tso-v886e-gamecast] .tso-v890-fieldImage{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;z-index:1;pointer-events:none;user-select:none;-webkit-user-drag:none;transform:none!important;filter:none!important;opacity:0;transition:opacity .16s ease}
  [data-tso-v886e-gamecast] .tso-v890-fieldImage.is-ready{opacity:1}

  /* Team marks stay dynamic per matchup and occupy the blank end-zone logo boxes. */
  [data-tso-v886e-gamecast] .tso-v890-teamLogo{position:absolute;z-index:2;display:block;object-fit:contain;pointer-events:none;transform:translate(-50%,-50%);filter:drop-shadow(0 2px 2px rgba(0,0,0,.34));max-height:42px}
  [data-tso-v886e-gamecast] .tso-v890-teamLogo--away{left:10.58%;top:32.1%;width:6.1%}
  [data-tso-v886e-gamecast] .tso-v890-teamLogo--home{left:87.03%;top:32.1%;width:6.1%}

  /* Gameplay overlay stack: image -> team logos -> live lines -> routes -> players/ball. */
  [data-tso-v886e-gamecast] .tso-ps886e__downlines{z-index:3!important;mix-blend-mode:screen!important;transform:none!important}
  [data-tso-v886e-gamecast] .tso-ps886e__routes{z-index:5!important;transform:none!important;filter:drop-shadow(0 0 4px rgba(37,190,255,.28))}
  [data-tso-v886e-gamecast] .tso-ps886e__actors{z-index:6!important;transform:none!important}
  [data-tso-v886e-gamecast] .tso-ps886e__ball{z-index:8!important}

  /* Disable visual FX injected by older geometry experiments. */
  [data-tso-v886e-gamecast] .tso-v887-fieldfx,
  [data-tso-v886e-gamecast] .tso-v887-scrim,
  [data-tso-v886e-gamecast] .tso-v888-fieldfx,
  [data-tso-v886e-gamecast] .tso-v888-scrim,
  [data-tso-v886e-gamecast] .tso-v889-fieldfx,
  [data-tso-v886e-gamecast] .tso-v889-scrim{display:none!important}

  /* Hide the old vector sprite immediately so refreshes do not flash cartoon players. */
  [data-tso-v886e-gamecast] .tso-ps886e__actorGraphic>svg:not(.v888-player):not(.v890-player-ready){opacity:0}
  [data-tso-v886e-gamecast] .tso-ps886e__actor{will-change:left,top,transform,opacity;transition:left .58s cubic-bezier(.18,.76,.22,1),top .58s cubic-bezier(.18,.76,.22,1),transform .58s cubic-bezier(.18,.76,.22,1),opacity .22s ease!important}
  [data-tso-v886e-gamecast] .tso-ps886e__ball{will-change:left,top;transition:left .58s cubic-bezier(.18,.76,.22,1),top .58s cubic-bezier(.18,.76,.22,1)!important}

  @media(max-width:760px){
    [data-tso-v886e-gamecast] .tso-v890-teamLogo{max-height:31px}
  }
  `;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.appendChild(style);
}
