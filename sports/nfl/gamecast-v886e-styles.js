
const STYLE_ID='tso-nfl-playstage-v886e-styles';

export function ensureNflPlaystageV886EStyles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
  const css=`
  .tso-ps886e,.tso-ps886e *{box-sizing:border-box}
  .tso-ps886e{width:100%;margin:0;background:#06101b;color:#eef7ff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
  .tso-ps886e__scene{position:relative;width:100%;aspect-ratio:1672/415;min-height:360px;background:#071523;overflow:hidden;isolation:isolate}
  .tso-ps886e__fieldSvg{position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block}
  .tso-ps886e__downlines{z-index:2;pointer-events:none;mix-blend-mode:screen}
  .tso-ps886e__shell{position:absolute;inset:0;width:100%;height:100%;z-index:3;display:block;object-fit:fill;pointer-events:none}
  .tso-ps886e__actors{position:absolute;inset:0;z-index:4;pointer-events:none}
  .tso-ps886e__routes{z-index:4;pointer-events:none}
  .tso-ps886e__actor{position:absolute;width:46px;height:92px;transform:translate(-50%,-97%) scale(var(--scale,1));transform-origin:50% 100%;filter:drop-shadow(0 8px 7px rgba(0,0,0,.42));transition:left .72s cubic-bezier(.16,.82,.22,1),top .72s cubic-bezier(.16,.82,.22,1),transform .72s cubic-bezier(.16,.82,.22,1),opacity .35s ease;will-change:left,top,transform}
  .tso-ps886e__actorGraphic{position:absolute;inset:0;display:block;z-index:2}
  .tso-ps886e__actor svg{width:100%;height:100%;display:block;overflow:visible}
  .tso-ps886e__actor.key{filter:drop-shadow(0 0 7px rgba(31,181,255,.58)) drop-shadow(0 8px 7px rgba(0,0,0,.42))}
  .tso-ps886e__actor.ghost{opacity:.34;filter:drop-shadow(0 5px 5px rgba(0,0,0,.18));mix-blend-mode:screen}
  .tso-ps886e__actorSpot{position:absolute;left:50%;bottom:-1px;width:45px;height:14px;transform:translateX(-50%);border:2px solid #18b7ff;border-radius:50%;background:rgba(12,126,255,.10);box-shadow:0 0 0 4px rgba(18,171,255,.11),0 0 15px 4px rgba(18,171,255,.58);z-index:1}
  .tso-ps886e__actorSpot:after{content:'';position:absolute;inset:2px 7px;border-radius:50%;background:rgba(94,210,255,.26);filter:blur(2px)}
  .tso-ps886e__actorLabel{position:absolute;left:50%;top:91px;z-index:3;transform:translateX(-50%);padding:3px 8px;border-radius:999px;border:1px solid rgba(57,163,255,.72);background:rgba(2,13,28,.90);color:#fff;font:800 10px/1 system-ui,Arial,sans-serif;white-space:nowrap;box-shadow:0 3px 9px rgba(0,0,0,.35),0 0 8px rgba(37,169,255,.18)}
  .tso-ps886e__ball{position:absolute;width:23px;height:13px;z-index:6;transform:translate(-50%,-50%) rotate(-18deg);border-radius:70% 55% 70% 55%;background:linear-gradient(155deg,#bd7042 0%,#8b451f 42%,#5a2a12 100%);border:1px solid rgba(255,235,215,.72);box-shadow:0 0 0 4px rgba(70,186,255,.09),0 5px 10px rgba(0,0,0,.42);transition:left .72s cubic-bezier(.16,.82,.22,1),top .72s cubic-bezier(.16,.82,.22,1)}
  .tso-ps886e__ball:before{content:'';position:absolute;left:4px;right:4px;top:5px;height:1px;background:#f3e7dc;box-shadow:4px -2px 0 -0.2px #f3e7dc,7px -2px 0 -0.2px #f3e7dc,10px -2px 0 -0.2px #f3e7dc}
  .tso-ps886e__ball:after{content:'';position:absolute;inset:1px;border-radius:inherit;border-top:1px solid rgba(255,255,255,.24)}
  .tso-ps886e__panels{display:grid;grid-template-columns:1.28fr 1.05fr 1fr 1.08fr;gap:10px;padding:10px 14px 0;background:linear-gradient(180deg,#06111d,#050e18)}
  .tso-ps886e__panel{min-height:188px;padding:14px;border:1px solid rgba(53,142,255,.48);border-radius:10px;background:linear-gradient(180deg,#061b34 0%,#061425 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 8px 18px rgba(0,0,0,.16)}
  .tso-ps886e__title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;color:#20c7ff;font:900 13px/1 system-ui,Arial,sans-serif;letter-spacing:.045em;text-transform:uppercase}
  .tso-ps886e__chip{padding:6px 10px;border-radius:8px;border:1px solid rgba(48,150,255,.65);background:#073165;color:#eaf9ff;font:800 10px/1 system-ui,Arial,sans-serif;box-shadow:0 0 10px rgba(33,156,255,.16)}
  .tso-ps886e__row{display:flex;align-items:center;gap:12px}
  .tso-ps886e__avatar{width:74px;height:74px;flex:0 0 74px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#0a2748;border:2px solid #168cff;box-shadow:0 0 13px rgba(22,140,255,.16)}
  .tso-ps886e__avatar img{width:100%;height:100%;object-fit:cover}
  .tso-ps886e__avatar .init{font:900 28px/1 system-ui,Arial,sans-serif;color:#fff}
  .tso-ps886e__pname{font:900 20px/1.06 system-ui,Arial,sans-serif;color:#fff}
  .tso-ps886e__psub{margin-top:4px;font:700 12px/1.2 system-ui,Arial,sans-serif;color:#60bfff}
  .tso-ps886e__copy{min-height:64px;margin:10px 0 0;color:#f2f7ff;font:700 14px/1.25 system-ui,Arial,sans-serif}
  .tso-ps886e__stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
  .tso-ps886e__stats>div{padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}
  .tso-ps886e__stats b{display:block;color:#fff;font:900 17px/1 system-ui,Arial,sans-serif}
  .tso-ps886e__stats small{display:block;margin-top:3px;color:#6da8dc;font:800 10px/1 system-ui,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase}
  .tso-ps886e__wp{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px;color:#fff;font:900 18px/1 system-ui,Arial,sans-serif}
  .tso-ps886e__chart{height:92px;border:1px solid rgba(58,136,255,.32);border-radius:8px;background:linear-gradient(180deg,#071a31,#061321);overflow:hidden}
  .tso-ps886e__chart svg{width:100%;height:100%}
  .tso-ps886e__axis{display:flex;justify-content:space-between;margin-top:8px;color:#8bbbe5;font:700 11px/1 system-ui,Arial,sans-serif}
  .tso-ps886e__summary{display:grid;gap:11px}
  .tso-ps886e__srow{display:grid;grid-template-columns:auto 1fr auto auto;gap:9px;align-items:center;color:#eaf5ff;font:800 13px/1.1 system-ui,Arial,sans-serif}
  .tso-ps886e__srow i{width:14px;height:14px;border-radius:50%;background:#39df78;box-shadow:0 0 8px rgba(57,223,120,.42)}
  .tso-ps886e__srow.cur i{background:#159cff;box-shadow:0 0 8px rgba(21,156,255,.55)}
  .tso-ps886e__footer{display:grid;grid-template-columns:1.32fr 1fr auto;gap:16px;align-items:center;padding:12px 14px 15px;background:linear-gradient(180deg,#06111d,#040c15);border-top:1px solid rgba(45,127,255,.24)}
  .tso-ps886e__brand{display:flex;align-items:center;gap:18px;color:#fff}
  .tso-ps886e__brandMark{font:900 21px/1 system-ui,Arial,sans-serif;color:#fff}
  .tso-ps886e__brand strong{font:900 12px/1 system-ui,Arial,sans-serif;color:#4ecaff;letter-spacing:.27em;text-transform:uppercase}
  .tso-ps886e__nav{display:flex;justify-content:center;gap:26px;color:#42baff;font:800 11px/1 system-ui,Arial,sans-serif;text-transform:uppercase}
  .tso-ps886e__nav span{display:grid;justify-items:center;gap:6px}
  .tso-ps886e__nav i{font-style:normal;font-size:21px}
  .tso-ps886e__lab{display:flex;align-items:center;gap:11px;padding:10px 14px;border:1px solid rgba(45,144,255,.55);border-radius:10px;background:#082c59;color:#fff;font:900 16px/1 system-ui,Arial,sans-serif}
  .tso-ps886e__lab i{font-style:normal;font-size:25px}
  .tso-ps886e__lab small{display:block;margin-top:4px;color:#73c9ff;font:700 11px/1.15 system-ui,Arial,sans-serif}
  .tso-possession-football{display:inline-flex!important;align-items:center!important;font-size:.72em!important;line-height:1!important;margin-left:9px!important;vertical-align:middle!important;filter:drop-shadow(0 0 4px rgba(255,175,55,.32))}
  .nxg-teamblock.home .tso-possession-football{margin-left:0!important;margin-right:9px!important}
  @media(max-width:1180px){.tso-ps886e__panels{grid-template-columns:1fr 1fr}.tso-ps886e__footer{grid-template-columns:1fr}.tso-ps886e__nav{justify-content:flex-start}}
  @media(max-width:760px){.tso-ps886e__scene{min-height:0}.tso-ps886e__panels{grid-template-columns:1fr}.tso-ps886e__actor{width:36px;height:72px}.tso-ps886e__actorLabel{top:70px;font-size:8px;padding:2px 6px}.tso-ps886e__actorSpot{width:34px;height:10px}.tso-ps886e__footer{grid-template-columns:1fr}.tso-ps886e__brand{display:grid;gap:7px}.tso-ps886e__brand strong{letter-spacing:.12em;font-size:10px}}
  `;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.appendChild(style);
}
