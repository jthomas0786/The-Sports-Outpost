
const STYLE_ID='tso-nfl-playstage-v886d-styles';

export function ensureNflPlaystageV886DStyles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
  const css=`
  .tso-ps886d,.tso-ps886d *{box-sizing:border-box}
  .tso-ps886d{width:100%;margin:0;background:#06101b;color:#eef7ff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
  .tso-ps886d__scene{position:relative;width:100%;aspect-ratio:1672/415;min-height:360px;background:#071523;overflow:hidden;isolation:isolate}
  .tso-ps886d__fieldSvg{position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block}
  .tso-ps886d__shell{position:absolute;inset:0;width:100%;height:100%;z-index:3;display:block;object-fit:fill;pointer-events:none}
  .tso-ps886d__actors{position:absolute;inset:0;z-index:4;pointer-events:none}
  .tso-ps886d__actor{position:absolute;width:58px;height:82px;transform:translate(-50%,-72%) scale(var(--scale,1));transform-origin:50% 100%;filter:drop-shadow(0 10px 9px rgba(0,0,0,.36));transition:left .72s cubic-bezier(.16,.82,.22,1),top .72s cubic-bezier(.16,.82,.22,1),transform .72s cubic-bezier(.16,.82,.22,1),opacity .35s ease;will-change:left,top,transform}
  .tso-ps886d__actor svg{width:100%;height:100%;overflow:visible}
  .tso-ps886d__actor.key{filter:drop-shadow(0 0 9px rgba(38,177,255,.75)) drop-shadow(0 10px 8px rgba(0,0,0,.35))}
  .tso-ps886d__actor.ghost{opacity:.22;filter:drop-shadow(0 6px 6px rgba(0,0,0,.18))}
  .tso-ps886d__actorLabel{position:absolute;left:50%;top:77px;transform:translateX(-50%);padding:3px 9px;border-radius:999px;border:1px solid rgba(57,163,255,.6);background:rgba(3,16,34,.86);color:#fff;font:800 10px/1 system-ui,Arial,sans-serif;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,.25)}
  .tso-ps886d__ball{position:absolute;width:18px;height:18px;border-radius:50%;z-index:6;transform:translate(-50%,-50%);background:radial-gradient(circle at 34% 30%,#d99e69 0 23%,#8b461e 24% 75%,#4e230a 76% 100%);border:1px solid rgba(255,255,255,.62);box-shadow:0 0 0 5px rgba(255,255,255,.08),0 8px 12px rgba(0,0,0,.34);transition:left .72s cubic-bezier(.16,.82,.22,1),top .72s cubic-bezier(.16,.82,.22,1)}
  .tso-ps886d__ball:before{content:'';position:absolute;left:7px;top:2px;bottom:2px;width:2px;background:#f7efe3;transform:rotate(22deg)}
  .tso-ps886d__panels{display:grid;grid-template-columns:1.28fr 1.05fr 1fr 1.08fr;gap:10px;padding:10px 14px 0;background:linear-gradient(180deg,#06111d,#050e18)}
  .tso-ps886d__panel{min-height:188px;padding:14px;border:1px solid rgba(53,142,255,.48);border-radius:10px;background:linear-gradient(180deg,#061b34 0%,#061425 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 8px 18px rgba(0,0,0,.16)}
  .tso-ps886d__title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;color:#20c7ff;font:900 13px/1 system-ui,Arial,sans-serif;letter-spacing:.045em;text-transform:uppercase}
  .tso-ps886d__chip{padding:6px 10px;border-radius:8px;border:1px solid rgba(48,150,255,.65);background:#073165;color:#eaf9ff;font:800 10px/1 system-ui,Arial,sans-serif;box-shadow:0 0 10px rgba(33,156,255,.16)}
  .tso-ps886d__row{display:flex;align-items:center;gap:12px}
  .tso-ps886d__avatar{width:74px;height:74px;flex:0 0 74px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#0a2748;border:2px solid #168cff;box-shadow:0 0 13px rgba(22,140,255,.16)}
  .tso-ps886d__avatar img{width:100%;height:100%;object-fit:cover}
  .tso-ps886d__avatar .init{font:900 28px/1 system-ui,Arial,sans-serif;color:#fff}
  .tso-ps886d__pname{font:900 20px/1.06 system-ui,Arial,sans-serif;color:#fff}
  .tso-ps886d__psub{margin-top:4px;font:700 12px/1.2 system-ui,Arial,sans-serif;color:#60bfff}
  .tso-ps886d__copy{min-height:64px;margin:10px 0 0;color:#f2f7ff;font:700 14px/1.25 system-ui,Arial,sans-serif}
  .tso-ps886d__stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
  .tso-ps886d__stats>div{padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}
  .tso-ps886d__stats b{display:block;color:#fff;font:900 17px/1 system-ui,Arial,sans-serif}
  .tso-ps886d__stats small{display:block;margin-top:3px;color:#6da8dc;font:800 10px/1 system-ui,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase}
  .tso-ps886d__wp{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px;color:#fff;font:900 18px/1 system-ui,Arial,sans-serif}
  .tso-ps886d__chart{height:92px;border:1px solid rgba(58,136,255,.32);border-radius:8px;background:linear-gradient(180deg,#071a31,#061321);overflow:hidden}
  .tso-ps886d__chart svg{width:100%;height:100%}
  .tso-ps886d__axis{display:flex;justify-content:space-between;margin-top:8px;color:#8bbbe5;font:700 11px/1 system-ui,Arial,sans-serif}
  .tso-ps886d__summary{display:grid;gap:11px}
  .tso-ps886d__srow{display:grid;grid-template-columns:auto 1fr auto auto;gap:9px;align-items:center;color:#eaf5ff;font:800 13px/1.1 system-ui,Arial,sans-serif}
  .tso-ps886d__srow i{width:14px;height:14px;border-radius:50%;background:#39df78;box-shadow:0 0 8px rgba(57,223,120,.42)}
  .tso-ps886d__srow.cur i{background:#159cff;box-shadow:0 0 8px rgba(21,156,255,.55)}
  .tso-ps886d__footer{display:grid;grid-template-columns:1.32fr 1fr auto;gap:16px;align-items:center;padding:12px 14px 15px;background:linear-gradient(180deg,#06111d,#040c15);border-top:1px solid rgba(45,127,255,.24)}
  .tso-ps886d__brand{display:flex;align-items:center;gap:18px;color:#fff}
  .tso-ps886d__brandMark{font:900 21px/1 system-ui,Arial,sans-serif;color:#fff}
  .tso-ps886d__brand strong{font:900 12px/1 system-ui,Arial,sans-serif;color:#4ecaff;letter-spacing:.27em;text-transform:uppercase}
  .tso-ps886d__nav{display:flex;justify-content:center;gap:26px;color:#42baff;font:800 11px/1 system-ui,Arial,sans-serif;text-transform:uppercase}
  .tso-ps886d__nav span{display:grid;justify-items:center;gap:6px}
  .tso-ps886d__nav i{font-style:normal;font-size:21px}
  .tso-ps886d__lab{display:flex;align-items:center;gap:11px;padding:10px 14px;border:1px solid rgba(45,144,255,.55);border-radius:10px;background:#082c59;color:#fff;font:900 16px/1 system-ui,Arial,sans-serif}
  .tso-ps886d__lab i{font-style:normal;font-size:25px}
  .tso-ps886d__lab small{display:block;margin-top:4px;color:#73c9ff;font:700 11px/1.15 system-ui,Arial,sans-serif}
  .tso-possession-football{display:inline-flex!important;align-items:center!important;font-size:.72em!important;line-height:1!important;margin-left:9px!important;vertical-align:middle!important;filter:drop-shadow(0 0 4px rgba(255,175,55,.32))}
  .nxg-teamblock.home .tso-possession-football{margin-left:0!important;margin-right:9px!important}
  @media(max-width:1180px){.tso-ps886d__panels{grid-template-columns:1fr 1fr}.tso-ps886d__footer{grid-template-columns:1fr}.tso-ps886d__nav{justify-content:flex-start}}
  @media(max-width:760px){.tso-ps886d__scene{min-height:0}.tso-ps886d__panels{grid-template-columns:1fr}.tso-ps886d__actor{width:42px;height:60px}.tso-ps886d__footer{grid-template-columns:1fr}.tso-ps886d__brand{display:grid;gap:7px}.tso-ps886d__brand strong{letter-spacing:.12em;font-size:10px}}
  `;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.appendChild(style);
}
