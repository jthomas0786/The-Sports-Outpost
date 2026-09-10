const STYLE_ID='tso-nfl-playstage-v885-styles';
export function ensureNflPlaystageV885Styles(){
  if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
  const css=`
  .tso-playstage-v885{margin:14px 0 0;border:1px solid rgba(42,123,255,.35);border-radius:18px;overflow:hidden;background:linear-gradient(180deg,#08172e 0%,#071425 100%);box-shadow:0 18px 42px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04);}
  .tso-playstage-v885 *{box-sizing:border-box}
  .tso-playstage-v885__hero{position:relative;padding:14px 16px 10px;background:radial-gradient(circle at 50% 0%,rgba(34,133,255,.20),transparent 34%),linear-gradient(180deg,#0b2142 0%,#0a1830 45%,#091322 100%);overflow:hidden}
  .tso-playstage-v885__lights,.tso-playstage-v885__lights:before,.tso-playstage-v885__lights:after{position:absolute;top:12px;width:128px;height:64px;background:radial-gradient(circle,rgba(111,203,255,.68) 0,rgba(111,203,255,.18) 36%,transparent 66%);content:'';pointer-events:none}
  .tso-playstage-v885__lights{left:20px}.tso-playstage-v885__lights:before{left:calc(100vw - 1px);display:none}.tso-playstage-v885__lights:after{right:-980px;display:none}
  .tso-playstage-v885__banner{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 auto 10px;padding:8px 14px;max-width:780px;border:1px solid rgba(40,140,255,.35);border-radius:12px;background:linear-gradient(90deg,rgba(17,48,93,.82),rgba(11,31,61,.92));font:700 13px/1.1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#d9f4ff}
  .tso-playstage-v885__banner b{font-weight:900;color:#29c6ff}.tso-playstage-v885__banner span{opacity:.94}
  .tso-playstage-v885__fieldWrap{position:relative;border:1px solid rgba(61,139,255,.32);border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#17385f 0%,#11263f 18%,#143c17 18.5%,#1e6b23 30%,#196e22 70%,#12471a 82%,#0f2037 100%);padding:0 0 18px;box-shadow:inset 0 16px 22px rgba(0,0,0,.22)}
  .tso-playstage-v885__field{position:relative;height:420px;margin:0 auto;max-width:1280px;transform-origin:center center;perspective:1200px}
  .tso-playstage-v885__crowd{position:absolute;left:0;right:0;top:0;height:110px;background:linear-gradient(180deg,rgba(6,15,30,.06),rgba(4,9,18,.18));pointer-events:none}
  .tso-playstage-v885__sideline{position:absolute;left:0;right:0;top:100px;height:10px;background:linear-gradient(90deg,rgba(255,255,255,.25),rgba(255,255,255,.5),rgba(255,255,255,.25));opacity:.25}
  .tso-playstage-v885__surface{position:absolute;left:58px;right:58px;top:110px;bottom:44px;transform:perspective(1200px) rotateX(62deg);transform-style:preserve-3d}
  .tso-playstage-v885__playfield{position:absolute;left:9%;right:9%;top:0;bottom:0;border-left:2px solid rgba(255,255,255,.78);border-right:2px solid rgba(255,255,255,.78);background:
    linear-gradient(90deg,transparent 0 9%, rgba(255,255,255,.14) 9.2%, transparent 9.4%, transparent 19%, rgba(255,255,255,.14) 19.2%, transparent 19.4%, transparent 29%, rgba(255,255,255,.14) 29.2%, transparent 29.4%, transparent 39%, rgba(255,255,255,.14) 39.2%, transparent 39.4%, transparent 49%, rgba(255,255,255,.14) 49.2%, transparent 49.4%, transparent 59%, rgba(255,255,255,.14) 59.2%, transparent 59.4%, transparent 69%, rgba(255,255,255,.14) 69.2%, transparent 69.4%, transparent 79%, rgba(255,255,255,.14) 79.2%, transparent 79.4%, transparent 89%, rgba(255,255,255,.14) 89.2%, transparent 89.4%),
    repeating-linear-gradient(90deg,rgba(255,255,255,.10) 0 2px,transparent 2px calc(10% - 2px),rgba(255,255,255,.10) calc(10% - 2px) 10%),
    repeating-linear-gradient(180deg,rgba(255,255,255,.22) 0 2px,transparent 2px 36px),
    linear-gradient(180deg,#309432 0%,#2c8d2d 46%,#257924 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16), inset 0 40px 60px rgba(255,255,255,.06), inset 0 -30px 40px rgba(0,0,0,.20)}
  .tso-playstage-v885__playfield:after{content:'';position:absolute;left:0;right:0;top:0;bottom:0;background:linear-gradient(180deg,rgba(255,255,255,.12),transparent 26%,transparent 74%,rgba(0,0,0,.18));pointer-events:none}
  .tso-playstage-v885__endzone{position:absolute;top:0;bottom:0;width:9%;display:flex;align-items:center;justify-content:center;overflow:hidden;border-top:2px solid rgba(255,255,255,.78);border-bottom:2px solid rgba(255,255,255,.78);box-shadow:inset 0 0 18px rgba(0,0,0,.28)}
  .tso-playstage-v885__endzone--away{left:0;background:linear-gradient(135deg,var(--away-primary,#0a3568),var(--away-secondary,#0c2340));border-left:2px solid rgba(255,255,255,.78)}
  .tso-playstage-v885__endzone--home{right:0;background:linear-gradient(135deg,var(--home-secondary,#0c2340),var(--home-primary,#245ea8));border-right:2px solid rgba(255,255,255,.78)}
  .tso-playstage-v885__endzoneName{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);font:900 20px/1.05 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;opacity:.96;white-space:nowrap;text-shadow:0 2px 6px rgba(0,0,0,.35)}
  .tso-playstage-v885__endzone--home .tso-playstage-v885__endzoneName{transform:translate(-50%,-50%) rotate(90deg)}
  .tso-playstage-v885__logoMark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);opacity:.92;max-width:48px;max-height:48px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.28))}
  .tso-playstage-v885__hashes{position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none}
  .tso-playstage-v885__number{position:absolute;top:18px;transform:translateX(-50%) rotateX(0deg);font:900 18px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.78)}
  .tso-playstage-v885__number.bottom{top:auto;bottom:18px}
  .tso-playstage-v885__los,.tso-playstage-v885__fd{position:absolute;top:0;bottom:0;width:4px;transform:translateX(-50%);box-shadow:0 0 12px currentColor;z-index:3}
  .tso-playstage-v885__los{background:#30a7ff;color:#30a7ff}
  .tso-playstage-v885__fd{background:#ffd200;color:#ffd200}
  .tso-playstage-v885__path{position:absolute;top:48%;height:0;border-top:4px dashed #54c2ff;transform-origin:left center;z-index:2;filter:drop-shadow(0 0 6px rgba(84,194,255,.45));opacity:.96}
  .tso-playstage-v885__pathArrow{position:absolute;right:-10px;top:-8px;width:0;height:0;border-left:14px solid #54c2ff;border-top:8px solid transparent;border-bottom:8px solid transparent}
  .tso-playstage-v885__token{position:absolute;width:22px;height:22px;border-radius:999px;z-index:4;box-shadow:0 6px 12px rgba(0,0,0,.28);transition:left .58s cubic-bezier(.2,.85,.2,1),top .58s cubic-bezier(.2,.85,.2,1),transform .58s cubic-bezier(.2,.85,.2,1),opacity .38s ease;will-change:left,top,transform}
  .tso-playstage-v885__token:before{content:'';position:absolute;inset:0;border-radius:999px;border:2px solid rgba(255,255,255,.86);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
  .tso-playstage-v885__token--off{background:linear-gradient(180deg,#45adff,#166fff)}
  .tso-playstage-v885__token--def{background:linear-gradient(180deg,#f4f8ff,#cdd8ea)}
  .tso-playstage-v885__token--key{width:28px;height:28px;border:3px solid rgba(41,198,255,.5);box-shadow:0 0 0 8px rgba(41,198,255,.10), 0 8px 14px rgba(0,0,0,.32)}
  .tso-playstage-v885__tokenLabel{position:absolute;left:50%;top:30px;transform:translateX(-50%);padding:4px 8px;border-radius:999px;background:rgba(5,17,34,.82);border:1px solid rgba(67,155,255,.34);font:700 11px/1.1 system-ui,Segoe UI,Arial,sans-serif;color:#f3f8ff;white-space:nowrap}
  .tso-playstage-v885__ball{position:absolute;width:18px;height:18px;border-radius:999px;background:radial-gradient(circle at 35% 32%,#d38a4a 0 24%,#8d4519 25% 75%,#5d2c0d 76% 100%);border:1px solid rgba(255,255,255,.35);box-shadow:0 0 0 5px rgba(255,255,255,.10),0 6px 10px rgba(0,0,0,.28);z-index:6;transition:left .58s cubic-bezier(.2,.85,.2,1),top .58s cubic-bezier(.2,.85,.2,1),transform .58s cubic-bezier(.2,.85,.2,1)}
  .tso-playstage-v885__ball:before{content:'';position:absolute;left:7px;top:3px;bottom:3px;width:2px;background:#f9f2e6;transform:rotate(24deg)}
  .tso-playstage-v885__legend{display:flex;justify-content:center;gap:22px;padding-top:10px;font:700 11px/1.1 system-ui,Segoe UI,Arial,sans-serif;color:#d6e7ff}
  .tso-playstage-v885__legend span{display:inline-flex;align-items:center;gap:8px}.tso-playstage-v885__legend i{display:inline-block;width:22px;height:4px;border-radius:999px;background:#2fa7ff}.tso-playstage-v885__legend i.fd{background:#ffd200}.tso-playstage-v885__legend i.path{height:0;width:24px;border-top:3px dashed #54c2ff;background:transparent}
  .tso-playstage-v885__panels{display:grid;grid-template-columns:1.35fr 1fr 1fr 1fr;gap:12px;padding:12px 14px 14px;background:linear-gradient(180deg,#081629,#071321)}
  .tso-playstage-v885__panel{min-height:150px;padding:14px;border:1px solid rgba(52,132,255,.32);border-radius:14px;background:linear-gradient(180deg,#081d37,#07152a);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  .tso-playstage-v885__panelTitle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;font:900 13px/1.1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#28c3ff}
  .tso-playstage-v885__liveChip{padding:6px 10px;border-radius:10px;background:linear-gradient(180deg,#0d3d73,#0a2c54);border:1px solid rgba(70,150,255,.4);font:800 11px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#bfe8ff}
  .tso-playstage-v885__playerLine{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .tso-playstage-v885__avatar{width:62px;height:62px;border-radius:50%;overflow:hidden;border:2px solid rgba(48,167,255,.54);background:linear-gradient(180deg,#0f2d54,#0b213d);display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .tso-playstage-v885__avatar img{width:100%;height:100%;object-fit:cover}.tso-playstage-v885__avatar span{font:900 22px/1 system-ui,Segoe UI,Arial,sans-serif;color:#fff}
  .tso-playstage-v885__name{font:900 17px/1.05 system-ui,Segoe UI,Arial,sans-serif;color:#fff}.tso-playstage-v885__sub{font:700 12px/1.1 system-ui,Segoe UI,Arial,sans-serif;color:#7cc4ff;margin-top:4px}
  .tso-playstage-v885__copy{font:700 14px/1.3 system-ui,Segoe UI,Arial,sans-serif;color:#d5e8ff;margin:8px 0 14px}
  .tso-playstage-v885__metrics,.tso-playstage-v885__statline{display:grid;gap:12px}
  .tso-playstage-v885__metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.tso-playstage-v885__statline{grid-template-columns:repeat(4,minmax(0,1fr))}
  .tso-playstage-v885__metric{padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
  .tso-playstage-v885__metric b{display:block;font:900 17px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff}.tso-playstage-v885__metric small{display:block;margin-top:6px;font:800 10px/1.1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7ea6d5}
  .tso-playstage-v885__wp{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}.tso-playstage-v885__wpTeam{display:flex;align-items:center;gap:8px;font:900 15px/1 system-ui,Segoe UI,Arial,sans-serif;color:#fff}.tso-playstage-v885__wpValue{font:900 23px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff}
  .tso-playstage-v885__chart{height:76px;border:1px solid rgba(56,137,255,.28);border-radius:12px;background:linear-gradient(180deg,rgba(12,32,61,.8),rgba(8,20,39,.92));padding:8px;display:flex;align-items:flex-end;gap:4px}
  .tso-playstage-v885__chart svg{width:100%;height:100%}.tso-playstage-v885__summary{display:flex;flex-direction:column;gap:10px}.tso-playstage-v885__summaryRow{display:grid;grid-template-columns:16px 1fr auto auto;align-items:center;gap:8px;font:700 13px/1.2 system-ui,Segoe UI,Arial,sans-serif;color:#f2f7ff}.tso-playstage-v885__summaryRow i{width:10px;height:10px;border-radius:50%;background:#48d976;box-shadow:0 0 0 4px rgba(72,217,118,.14)}.tso-playstage-v885__summaryRow.current i{background:#3ea3ff;box-shadow:0 0 0 4px rgba(62,163,255,.14)}.tso-playstage-v885__summaryRow small{color:#93b8e4}
  .tso-playstage-v885__footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border-top:1px solid rgba(42,123,255,.28);background:linear-gradient(180deg,#071625,#06111d)}
  .tso-playstage-v885__brand{display:flex;align-items:center;gap:14px;font:900 14px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#b8d4ff}.tso-playstage-v885__brand strong{color:#28c3ff}
  .tso-playstage-v885__footerNav{display:flex;align-items:center;gap:24px;color:#89b6ef;font:800 12px/1.1 system-ui,Segoe UI,Arial,sans-serif;text-transform:uppercase;letter-spacing:.08em}
  .tso-playstage-v885__footerNav span{display:inline-flex;flex-direction:column;align-items:center;gap:6px}.tso-playstage-v885__footerNav i{font-style:normal;font-size:20px;color:#39a8ff}
  .tso-playstage-v885__lab{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;border:1px solid rgba(55,144,255,.38);background:linear-gradient(180deg,#0d2f5b,#0a2140);font:800 13px/1.1 system-ui,Segoe UI,Arial,sans-serif;color:#f4fbff;white-space:nowrap}
  .tso-playstage-v885__lab small{display:block;margin-top:4px;font:700 11px/1.1 system-ui,Segoe UI,Arial,sans-serif;color:#8ed0ff}.tso-playstage-v885__lab i{font-style:normal;font-size:22px;color:#65b9ff}
  @media (max-width: 1200px){.tso-playstage-v885__panels{grid-template-columns:1fr 1fr}.tso-playstage-v885__field{height:360px}}
  @media (max-width: 860px){.tso-playstage-v885__field{height:300px}.tso-playstage-v885__surface{left:12px;right:12px;top:90px;bottom:30px}.tso-playstage-v885__panels{grid-template-columns:1fr}.tso-playstage-v885__footer{flex-direction:column;align-items:stretch}.tso-playstage-v885__footerNav{justify-content:space-between;gap:8px;flex-wrap:wrap}.tso-playstage-v885__banner{font-size:11px;padding:8px 10px}}
  `;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.appendChild(style);
}
