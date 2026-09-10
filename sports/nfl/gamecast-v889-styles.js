const STYLE_ID='tso-nfl-gamecast-v889-enhancer-styles';

export function ensureNflGamecastV889Styles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
  const css=`
  /* v88.9: restore the field to the exact perspective plane used by the
     transparent stadium shell. No CSS 3D transform is applied to the stage. */
  [data-tso-v886e-gamecast] .tso-ps886e__scene{isolation:isolate;perspective:none!important}
  [data-tso-v886e-gamecast] .tso-v889-basefield{transform:none!important;filter:saturate(.98) contrast(1.06) brightness(.94)}
  [data-tso-v886e-gamecast] .tso-ps886e__shell,
  [data-tso-v886e-gamecast] .tso-ps886e__downlines,
  [data-tso-v886e-gamecast] .tso-ps886e__routes,
  [data-tso-v886e-gamecast] .tso-ps886e__actors{transform:none!important}

  .tso-v889-fieldfx{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
  .tso-v889-fieldfx:before{content:'';position:absolute;left:0;right:0;top:21.93%;bottom:3.13%;clip-path:polygon(10.17% 0,89.83% 0,100% 100%,0 100%);background:linear-gradient(180deg,rgba(255,255,255,.045),transparent 18%,transparent 78%,rgba(0,0,0,.13)),repeating-linear-gradient(90deg,rgba(255,255,255,.015) 0 1px,transparent 1px 10px);mix-blend-mode:soft-light;opacity:.88}
  .tso-v889-scrim{position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(180deg,rgba(4,17,34,.05),transparent 20%,transparent 84%,rgba(2,8,16,.06) 100%)}

  [data-tso-v886e-gamecast] .tso-v889-endzone-text{font-size:45px!important;font-family:Impact,'Arial Narrow',sans-serif!important;font-weight:900!important;letter-spacing:.035em;paint-order:stroke;stroke:rgba(0,0,0,.18);stroke-width:.9px}
  [data-tso-v886e-gamecast] .tso-v889-endzone-logo{opacity:.98;filter:drop-shadow(0 2px 2px rgba(0,0,0,.18))}

  /* Keep the refined v88.8 athletes but make live refreshes feel less jumpy. */
  [data-tso-v886e-gamecast] .tso-ps886e__actor{transition:left .58s cubic-bezier(.18,.76,.22,1),top .58s cubic-bezier(.18,.76,.22,1),transform .58s cubic-bezier(.18,.76,.22,1),opacity .22s ease!important}
  [data-tso-v886e-gamecast] .tso-ps886e__ball{transition:left .58s cubic-bezier(.18,.76,.22,1),top .58s cubic-bezier(.18,.76,.22,1)!important}
  `;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.appendChild(style);
}