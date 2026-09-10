const STYLE_ID='tso-nfl-playstage-v886-styles';
export function ensureNflPlaystageV886Styles(){
  if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
  const css=`
  .tso-playstage-v886{margin:12px 0 0;border:1px solid rgba(53,135,255,.34);border-radius:20px;overflow:hidden;background:linear-gradient(180deg,#071424 0%,#06111d 100%);box-shadow:0 18px 45px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.04)}
  .tso-playstage-v886 *{box-sizing:border-box}
  .tso-playstage-v886__hero{position:relative;padding:14px 14px 0;background:radial-gradient(circle at 50% -10%,rgba(31,129,255,.20),transparent 34%),linear-gradient(180deg,#081d37 0%,#08162b 46%,#06111d 100%)}
  .tso-playstage-v886__lightsL,.tso-playstage-v886__lightsR{position:absolute;top:14px;width:120px;height:120px;pointer-events:none;opacity:.9}
  .tso-playstage-v886__lightsL{left:0;background:radial-gradient(circle at 48px 42px,rgba(140,220,255,.8),rgba(140,220,255,.18) 20%,transparent 56%)}
  .tso-playstage-v886__lightsR{right:0;background:radial-gradient(circle at calc(100% - 48px) 42px,rgba(140,220,255,.8),rgba(140,220,255,.18) 20%,transparent 56%)}
  .tso-playstage-v886__banner{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;max-width:1000px;margin:0 auto 10px;padding:7px 14px;border:1px solid rgba(52,129,255,.36);border-radius:12px;background:linear-gradient(180deg,rgba(12,43,82,.95),rgba(9,28,54,.95));font:900 12px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#e4f3ff;text-align:center}
  .tso-playstage-v886__banner b{color:#1dc4ff;font-size:14px}
  .tso-playstage-v886__fieldWrap{position:relative;border-top:1px solid rgba(59,146,255,.26);padding:6px 0 0}
  .tso-playstage-v886__stadium{position:relative;border:1px solid rgba(53,135,255,.3);border-radius:18px 18px 0 0;overflow:hidden;background:
    linear-gradient(180deg,rgba(14,38,74,.96) 0,rgba(10,26,50,.96) 12%,rgba(8,17,32,.7) 12.1%,rgba(8,17,32,.48) 18%,rgba(4,11,21,.16) 18.1%,rgba(6,24,15,.10) 27%,rgba(16,78,21,.95) 27.1%,rgba(27,113,34,.98) 34%,rgba(31,132,37,.98) 70%,rgba(23,84,30,.98) 100%);
    box-shadow:inset 0 20px 30px rgba(255,255,255,.02), inset 0 -30px 40px rgba(0,0,0,.20)}
  .tso-playstage-v886__crowd{position:absolute;left:0;right:0;top:54px;height:126px;background:
    radial-gradient(circle at 18% 12%,rgba(255,255,255,.18) 0 2px,transparent 2px) 0 0/18px 18px,
    radial-gradient(circle at 52% 46%,rgba(255,255,255,.12) 0 2px,transparent 2px) 6px 8px/20px 20px,
    linear-gradient(180deg,rgba(255,255,255,.06),transparent 48%,rgba(0,0,0,.22));opacity:.22;filter:blur(.1px)}
  .tso-playstage-v886__boards{position:absolute;left:6%;right:6%;top:14px;display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:8px;align-items:center;z-index:2}
  .tso-playstage-v886__board{height:46px;border:1px solid rgba(65,150,255,.38);border-radius:10px;background:linear-gradient(180deg,#0d3b74,#08274c);display:flex;align-items:center;justify-content:center;font:900 14px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e6f4ff;box-shadow:0 8px 16px rgba(0,0,0,.16)}
  .tso-playstage-v886__board strong{color:#1cc4ff}
  .tso-playstage-v886__field{position:relative;height:435px;padding-top:92px;overflow:hidden}
  .tso-playstage-v886__lightTower{position:absolute;top:36px;width:78px;height:128px;opacity:.95}
  .tso-playstage-v886__lightTower:before{content:'';position:absolute;left:22px;top:16px;bottom:0;width:6px;background:linear-gradient(180deg,#365f88,#8bb4df 50%,#294e75)}
  .tso-playstage-v886__lightTower:after{content:'';position:absolute;left:0;top:0;width:78px;height:30px;border-radius:8px;background:repeating-linear-gradient(90deg,#b1daf6 0 8px,#dff4ff 8px 14px);box-shadow:0 0 20px rgba(146,214,255,.7)}
  .tso-playstage-v886__lightTower--left{left:8px;transform:skewY(6deg)} .tso-playstage-v886__lightTower--right{right:8px;transform:skewY(-6deg)}
  .tso-playstage-v886__goal{position:absolute;bottom:90px;width:48px;height:132px;z-index:2}
  .tso-playstage-v886__goal:before{content:'';position:absolute;left:22px;bottom:0;width:5px;height:100%;background:#efc94d;box-shadow:0 0 8px rgba(239,201,77,.45)}
  .tso-playstage-v886__goal:after{content:'';position:absolute;left:22px;top:18px;width:22px;height:5px;background:#efc94d;box-shadow:-22px 0 0 #efc94d, 0 48px 0 rgba(0,0,0,0)}
  .tso-playstage-v886__goal i{position:absolute;top:18px;width:5px;height:44px;background:#efc94d;box-shadow:0 0 8px rgba(239,201,77,.45)}
  .tso-playstage-v886__goal i:first-child{left:0}.tso-playstage-v886__goal i:last-child{left:44px}
  .tso-playstage-v886__goal--left{left:58px;transform:perspective(500px) rotateY(18deg)} .tso-playstage-v886__goal--right{right:58px;transform:perspective(500px) rotateY(-18deg)}
  .tso-playstage-v886__stage{position:absolute;left:52px;right:52px;top:92px;bottom:28px;transform:perspective(1250px) rotateX(60deg);transform-style:preserve-3d}
  .tso-playstage-v886__shadow{position:absolute;left:10%;right:10%;top:0;height:34px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(96,180,255,.12) 0,rgba(96,180,255,.04) 38%,transparent 72%)}
  .tso-playstage-v886__surface{position:absolute;left:0;right:0;top:24px;bottom:0;border-radius:0 0 14px 14px;overflow:hidden;background:
     linear-gradient(180deg,rgba(255,255,255,.08),transparent 9%),
     repeating-linear-gradient(90deg,rgba(255,255,255,.16) 0 2px,transparent 2px calc(10% - 2px),rgba(255,255,255,.16) calc(10% - 2px) 10%),
     repeating-linear-gradient(180deg,rgba(255,255,255,.12) 0 2px,transparent 2px 42px),
     linear-gradient(180deg,#358f39 0%,#2f8733 50%,#28742c 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.14), inset 0 20px 44px rgba(255,255,255,.05), inset 0 -30px 40px rgba(0,0,0,.18)}
  .tso-playstage-v886__surface:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.12),transparent 10%,transparent 90%,rgba(0,0,0,.12))}
  .tso-playstage-v886__endzone{position:absolute;top:24px;bottom:0;width:12%;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 18px rgba(0,0,0,.34)}
  .tso-playstage-v886__endzone--away{left:0;background:linear-gradient(135deg,var(--away-primary,#092d58),var(--away-secondary,#a50034))}
  .tso-playstage-v886__endzone--home{right:0;background:linear-gradient(135deg,var(--home-primary,#0d3b74),var(--home-secondary,#0d5f1e))}
  .tso-playstage-v886__endzoneWord{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 38px/1 Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.96);text-shadow:0 3px 8px rgba(0,0,0,.32);white-space:nowrap}
  .tso-playstage-v886__endzone--away .tso-playstage-v886__endzoneWord{transform:rotate(-90deg)} .tso-playstage-v886__endzone--home .tso-playstage-v886__endzoneWord{transform:rotate(90deg)}
  .tso-playstage-v886__playfield{position:absolute;left:12%;right:12%;top:24px;bottom:0}
  .tso-playstage-v886__num{position:absolute;top:12px;transform:translateX(-50%);font:900 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.85)}
  .tso-playstage-v886__num.bottom{top:auto;bottom:12px}
  .tso-playstage-v886__los,.tso-playstage-v886__fd{position:absolute;top:0;bottom:0;width:4px;transform:translateX(-50%);z-index:3;box-shadow:0 0 12px currentColor}
  .tso-playstage-v886__los{background:#23a7ff;color:#23a7ff}.tso-playstage-v886__fd{background:#ffe100;color:#ffe100}
  .tso-playstage-v886__route{position:absolute;height:3px;border-top:4px dashed #5fd0ff;transform-origin:left center;z-index:2;filter:drop-shadow(0 0 5px rgba(95,208,255,.45))}
  .tso-playstage-v886__route:after{content:'';position:absolute;right:-10px;top:-6px;border-left:12px solid #5fd0ff;border-top:7px solid transparent;border-bottom:7px solid transparent}
  .tso-playstage-v886__motion{position:absolute;height:3px;border-top:3px dotted rgba(255,255,255,.75);transform-origin:left center;z-index:2;opacity:.76}
  .tso-playstage-v886__figure{position:absolute;width:26px;height:38px;transform:translate(-50%,-50%);z-index:4;transition:left .55s cubic-bezier(.2,.8,.2,1),top .55s cubic-bezier(.2,.8,.2,1),transform .55s cubic-bezier(.2,.8,.2,1);will-change:left,top,transform}
  .tso-playstage-v886__figure .head{position:absolute;left:7px;top:0;width:12px;height:12px;border-radius:50%;background:#f1c7a1;border:1px solid rgba(0,0,0,.2)}
  .tso-playstage-v886__figure .helmet{position:absolute;left:4px;top:-2px;width:18px;height:12px;border-radius:10px 10px 8px 8px;background:linear-gradient(180deg,var(--c1),var(--c2));border:1px solid rgba(255,255,255,.6);box-shadow:0 1px 0 rgba(255,255,255,.32) inset}
  .tso-playstage-v886__figure .body{position:absolute;left:6px;top:10px;width:14px;height:13px;border-radius:5px;background:linear-gradient(180deg,var(--c1),var(--c2));border:1px solid rgba(255,255,255,.45)}
  .tso-playstage-v886__figure .leg{position:absolute;bottom:0;width:4px;height:14px;border-radius:3px;background:linear-gradient(180deg,var(--c2),rgba(7,12,25,.95))}
  .tso-playstage-v886__figure .leg.l1{left:8px;transform:rotate(8deg)} .tso-playstage-v886__figure .leg.l2{right:8px;transform:rotate(-8deg)}
  .tso-playstage-v886__figure .arm{position:absolute;top:14px;width:4px;height:12px;border-radius:3px;background:#f1c7a1}
  .tso-playstage-v886__figure .arm.a1{left:2px;transform:rotate(28deg)} .tso-playstage-v886__figure .arm.a2{right:2px;transform:rotate(-28deg)}
  .tso-playstage-v886__figure.offense{--c1:#ffffff;--c2:#1a5ecf}.tso-playstage-v886__figure.defense{--c1:#0a223d;--c2:#69be28}
  .tso-playstage-v886__figure.key{width:30px;height:42px;filter:drop-shadow(0 0 8px rgba(35,167,255,.45))}
  .tso-playstage-v886__figure.key .body{width:16px;left:7px}.tso-playstage-v886__figure.key .helmet{width:20px;left:5px}
  .tso-playstage-v886__figure.ghost{opacity:.28;filter:none}
  .tso-playstage-v886__playerTag{position:absolute;left:50%;top:40px;transform:translateX(-50%);padding:4px 8px;border-radius:999px;background:rgba(5,17,34,.86);border:1px solid rgba(67,155,255,.34);font:700 10px/1 system-ui,Segoe UI,Arial,sans-serif;color:#f5fbff;white-space:nowrap}
  .tso-playstage-v886__ball{position:absolute;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#d79b66 0 24%,#8f4922 25% 76%,#5f2d10 77% 100%);border:1px solid rgba(255,255,255,.5);box-shadow:0 0 0 5px rgba(255,255,255,.10),0 8px 12px rgba(0,0,0,.28);z-index:6;transition:left .55s cubic-bezier(.2,.8,.2,1),top .55s cubic-bezier(.2,.8,.2,1)}
  .tso-playstage-v886__ball:before{content:'';position:absolute;left:6px;top:2px;bottom:2px;width:2px;background:#f8f2e8;transform:rotate(22deg)}
  .tso-playstage-v886__legend{display:flex;justify-content:center;gap:22px;padding:10px 10px 12px;font:800 11px/1 system-ui,Segoe UI,Arial,sans-serif;color:#e2efff}
  .tso-playstage-v886__legend span{display:inline-flex;align-items:center;gap:8px}.tso-playstage-v886__legend i{display:inline-block;width:22px;height:4px;border-radius:999px;background:#23a7ff}.tso-playstage-v886__legend i.fd{background:#ffe100}.tso-playstage-v886__legend i.path{width:24px;height:0;background:transparent;border-top:3px dashed #5fd0ff}
  .tso-playstage-v886__panels{display:grid;grid-template-columns:1.15fr 1.1fr .95fr 1.05fr;gap:10px;padding:12px;background:linear-gradient(180deg,#071626,#06111d)}
  .tso-playstage-v886__panel{min-height:176px;padding:14px;border:1px solid rgba(52,132,255,.3);border-radius:14px;background:linear-gradient(180deg,#081b34,#071423);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  .tso-playstage-v886__panelTitle{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;font:900 13px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#1fc4ff}
  .tso-playstage-v886__chip{padding:6px 10px;border:1px solid rgba(68,153,255,.38);border-radius:10px;background:linear-gradient(180deg,#0e3d74,#0a2b54);font:800 11px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#d7f2ff}
  .tso-playstage-v886__playRow{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .tso-playstage-v886__avatar{width:72px;height:72px;border-radius:50%;border:2px solid rgba(39,171,255,.52);background:linear-gradient(180deg,#0d2d53,#081b34);display:grid;place-items:center;overflow:hidden}
  .tso-playstage-v886__avatar img{width:100%;height:100%;object-fit:cover}
  .tso-playstage-v886__initial{font:900 28px/1 system-ui,Segoe UI,Arial,sans-serif;color:#fff}
  .tso-playstage-v886__name{font:900 22px/1 system-ui,Segoe UI,Arial,sans-serif;color:#fff}.tso-playstage-v886__sub{margin-top:4px;font:700 13px/1.25 system-ui,Segoe UI,Arial,sans-serif;color:#9ec4ea}
  .tso-playstage-v886__copy{min-height:70px;font:700 15px/1.2 system-ui,Segoe UI,Arial,sans-serif;color:#edf5ff}
  .tso-playstage-v886__stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
  .tso-playstage-v886__stat{padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}
  .tso-playstage-v886__stat b{display:block;font:900 17px/1.1 system-ui,Segoe UI,Arial,sans-serif;color:#fff}.tso-playstage-v886__stat small{display:block;margin-top:2px;font:700 11px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#7eb0dd}
  .tso-playstage-v886__wpHeader{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font:900 19px/1 system-ui,Segoe UI,Arial,sans-serif;color:#fff}
  .tso-playstage-v886__chart{height:84px;border:1px solid rgba(58,133,255,.25);border-radius:12px;background:linear-gradient(180deg,rgba(9,29,56,.7),rgba(6,18,34,.9));overflow:hidden}
  .tso-playstage-v886__chart svg{width:100%;height:100%}.tso-playstage-v886__wpAxis{display:flex;justify-content:space-between;margin-top:8px;font:700 12px/1 system-ui,Segoe UI,Arial,sans-serif;color:#9cc4ed}
  .tso-playstage-v886__drive{display:grid;gap:10px}.tso-playstage-v886__driveRow{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;font:800 14px/1.1 system-ui,Segoe UI,Arial,sans-serif;color:#eaf5ff}
  .tso-playstage-v886__driveRow i{width:14px;height:14px;border-radius:50%;display:inline-block;background:#4be07a;box-shadow:0 0 8px rgba(75,224,122,.4)} .tso-playstage-v886__driveRow.current i{background:#1ea6ff;box-shadow:0 0 8px rgba(30,166,255,.4)}
  .tso-playstage-v886__footer{display:grid;grid-template-columns:1.2fr 1fr auto;gap:16px;align-items:center;padding:12px 14px 16px;border-top:1px solid rgba(52,132,255,.22);background:linear-gradient(180deg,#06111d,#050e18)}
  .tso-playstage-v886__brand{display:flex;align-items:center;gap:16px;color:#dff2ff}.tso-playstage-v886__brand strong{font:900 13px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.32em;text-transform:uppercase}.tso-playstage-v886__brand span{font:900 22px/1 system-ui,Segoe UI,Arial,sans-serif;color:#fff}
  .tso-playstage-v886__nav{display:flex;justify-content:center;gap:28px;font:900 13px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#4dbefe}.tso-playstage-v886__nav span{display:grid;justify-items:center;gap:8px}.tso-playstage-v886__nav i{font-style:normal;font-size:26px;color:#33afff}
  .tso-playstage-v886__lab{display:flex;align-items:center;gap:14px;padding:12px 18px;border:1px solid rgba(65,150,255,.35);border-radius:14px;background:linear-gradient(180deg,#0d3b74,#0b2750);color:#fff;font:900 22px/1 system-ui,Segoe UI,Arial,sans-serif;box-shadow:0 10px 22px rgba(0,0,0,.18)}
  .tso-playstage-v886__lab small{display:block;margin-top:4px;font:700 12px/1.2 system-ui,Segoe UI,Arial,sans-serif;color:#d3ebff}.tso-playstage-v886__lab i{font-style:normal;font-size:30px}
  .tso-possession-football{display:inline-flex;align-items:center;margin-left:8px;filter:drop-shadow(0 0 4px rgba(255,190,66,.38))}
  @media (max-width: 1180px){.tso-playstage-v886__panels{grid-template-columns:1fr 1fr}.tso-playstage-v886__footer{grid-template-columns:1fr}.tso-playstage-v886__nav{justify-content:flex-start;flex-wrap:wrap}}
  @media (max-width: 760px){.tso-playstage-v886__boards{grid-template-columns:1fr}.tso-playstage-v886__field{height:320px;padding-top:120px}.tso-playstage-v886__stage{left:18px;right:18px;top:116px;transform:perspective(900px) rotateX(63deg)}.tso-playstage-v886__panels{grid-template-columns:1fr}.tso-playstage-v886__footer{padding-bottom:18px}.tso-playstage-v886__brand{display:grid;gap:8px}.tso-playstage-v886__brand strong{letter-spacing:.14em;font-size:11px}.tso-playstage-v886__endzoneWord{font-size:24px}}
  `;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.appendChild(style);
}
