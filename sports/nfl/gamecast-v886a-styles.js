const STYLE_ID='tso-nfl-playstage-v886a-styles';
export function ensureNflPlaystageV886AStyles(){
  if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
  const css=`
  .tso-ps886a{margin:12px 0 0;border:1px solid rgba(53,135,255,.34);border-radius:20px;overflow:hidden;background:linear-gradient(180deg,#071424,#050f19);box-shadow:0 20px 50px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.04)}
  .tso-ps886a,.tso-ps886a *{box-sizing:border-box}
  .tso-ps886a__hero{position:relative;padding:0 12px 0;background:radial-gradient(circle at 50% -5%,rgba(31,129,255,.14),transparent 32%),linear-gradient(180deg,#081b34 0%,#08162a 55%,#07111b 100%)}
  .tso-ps886a__fieldShell{position:relative;padding:10px 10px 0}
  .tso-ps886a__topBoards{position:absolute;left:9%;right:9%;top:12px;z-index:4;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .tso-ps886a__topBoard{height:52px;border:1px solid rgba(62,145,255,.32);border-radius:12px;background:linear-gradient(180deg,rgba(13,59,116,.95),rgba(8,39,76,.95));display:flex;align-items:center;justify-content:center;font:900 13px/1 system-ui,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#fff;box-shadow:0 12px 20px rgba(0,0,0,.18)}
  .tso-ps886a__topBoard strong{font-size:18px;color:#1cc4ff}
  .tso-ps886a__stadium{position:relative;height:560px;border:1px solid rgba(53,135,255,.28);border-radius:16px;overflow:hidden;background:
    radial-gradient(circle at 6% 15%,rgba(169,228,255,.85),rgba(169,228,255,.12) 16%,transparent 32%),
    radial-gradient(circle at 94% 15%,rgba(169,228,255,.85),rgba(169,228,255,.12) 16%,transparent 32%),
    linear-gradient(180deg,#10233f 0 9%,#081523 9.2% 32%,#0a271a 32.2% 36%,#23782d 36.2% 76%,#14491c 76.2% 100%)}
  .tso-ps886a__roofGlow{position:absolute;left:6%;right:6%;top:58px;height:160px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(65,170,255,.18),transparent 66%);filter:blur(2px)}
  .tso-ps886a__crowd{position:absolute;left:0;right:0;top:76px;height:112px;background:
    radial-gradient(circle at 20% 30%,rgba(255,255,255,.24) 0 1.5px,transparent 1.7px) 0 0/18px 18px,
    radial-gradient(circle at 60% 48%,rgba(255,255,255,.16) 0 1.4px,transparent 1.6px) 7px 8px/20px 20px,
    linear-gradient(180deg,rgba(255,255,255,.06),transparent 44%,rgba(0,0,0,.30));opacity:.32}
  .tso-ps886a__sideline{position:absolute;left:0;right:0;top:180px;height:34px;background:
    repeating-radial-gradient(circle at 10px 17px,rgba(255,255,255,.22) 0 2px,transparent 3px 12px),
    linear-gradient(180deg,#13263f,#0a1730);opacity:.95}
  .tso-ps886a__lightTower{position:absolute;top:72px;width:92px;height:130px;z-index:3}
  .tso-ps886a__lightTower:before{content:'';position:absolute;left:42px;top:28px;bottom:0;width:7px;background:linear-gradient(180deg,#35587d,#99bee1 50%,#29486a)}
  .tso-ps886a__lightTower:after{content:'';position:absolute;left:0;top:0;width:92px;height:32px;border-radius:10px;background:repeating-linear-gradient(90deg,#d5f2ff 0 7px,#f7fdff 7px 12px);box-shadow:0 0 28px rgba(157,220,255,.9)}
  .tso-ps886a__lightTower--left{left:10px}.tso-ps886a__lightTower--right{right:10px}
  .tso-ps886a__goal{position:absolute;top:224px;width:44px;height:128px;z-index:3}
  .tso-ps886a__goal .upright{position:absolute;top:0;width:5px;height:48px;background:#efc94d;box-shadow:0 0 10px rgba(239,201,77,.45)}
  .tso-ps886a__goal .upright.left{left:0}.tso-ps886a__goal .upright.right{right:0}.tso-ps886a__goal .crossbar{position:absolute;left:2px;right:2px;top:44px;height:5px;background:#efc94d}.tso-ps886a__goal .post{position:absolute;left:50%;transform:translateX(-50%);top:44px;bottom:0;width:5px;background:#efc94d}
  .tso-ps886a__goal--left{left:56px}.tso-ps886a__goal--right{right:56px}
  .tso-ps886a__fieldStage{position:absolute;left:18px;right:18px;bottom:88px;height:280px;z-index:2;perspective:1200px}
  .tso-ps886a__fieldPlane{position:absolute;left:0;right:0;top:0;bottom:0;transform:rotateX(62deg);transform-style:preserve-3d}
  .tso-ps886a__fieldShadow{position:absolute;left:7%;right:7%;top:4px;height:28px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(83,190,255,.18),transparent 70%)}
  .tso-ps886a__field{position:absolute;left:0;right:0;top:18px;bottom:0;border-radius:0 0 12px 12px;overflow:hidden;background:
      linear-gradient(180deg,rgba(255,255,255,.08),transparent 8%),
      repeating-linear-gradient(90deg,rgba(255,255,255,.22) 0 2px,transparent 2px calc(10% - 2px),rgba(255,255,255,.22) calc(10% - 2px) 10%),
      repeating-linear-gradient(180deg,rgba(255,255,255,.12) 0 2px,transparent 2px 42px),
      linear-gradient(180deg,#318f39 0,#278332 55%,#1f6d29 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),inset 0 16px 34px rgba(255,255,255,.06),inset 0 -30px 40px rgba(0,0,0,.18)}
  .tso-ps886a__tso50{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:4px 18px;border-radius:6px;background:rgba(16,59,93,.8);font:900 34px/1 system-ui,Arial,sans-serif;color:#77d3ff;letter-spacing:.02em;text-transform:uppercase;text-shadow:0 0 10px rgba(67,190,255,.32)}
  .tso-ps886a__endzone{position:absolute;top:18px;bottom:0;width:11.5%;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .tso-ps886a__endzone--away{left:0;background:linear-gradient(135deg,var(--away-a),var(--away-b))}
  .tso-ps886a__endzone--home{right:0;background:linear-gradient(135deg,var(--home-a),var(--home-b))}
  .tso-ps886a__endText{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 40px/1 Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;color:#fff;letter-spacing:.03em;text-transform:uppercase;text-shadow:0 4px 10px rgba(0,0,0,.35);white-space:nowrap;opacity:.96}
  .tso-ps886a__endzone--away .tso-ps886a__endText{transform:rotate(-90deg)}
  .tso-ps886a__endzone--home .tso-ps886a__endText{transform:rotate(90deg)}
  .tso-ps886a__playfield{position:absolute;left:11.5%;right:11.5%;top:18px;bottom:0}
  .tso-ps886a__yardNum{position:absolute;top:10px;transform:translateX(-50%);font:900 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.84)}
  .tso-ps886a__yardNum.bot{top:auto;bottom:10px}
  .tso-ps886a__line{position:absolute;top:0;bottom:0;width:4px;transform:translateX(-50%);z-index:2;box-shadow:0 0 12px currentColor}.tso-ps886a__line.los{background:#2ea9ff;color:#2ea9ff}.tso-ps886a__line.fd{background:#ffe100;color:#ffe100}
  .tso-ps886a__path{position:absolute;inset:0;z-index:2;pointer-events:none}
  .tso-ps886a__player{position:absolute;width:34px;height:52px;transform:translate(-50%,-50%);z-index:4;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4));transition:left .55s cubic-bezier(.2,.8,.2,1),top .55s cubic-bezier(.2,.8,.2,1),transform .55s cubic-bezier(.2,.8,.2,1)}
  .tso-ps886a__player .helm{position:absolute;left:7px;top:0;width:20px;height:13px;border-radius:12px 12px 9px 9px;background:linear-gradient(180deg,var(--c1),var(--c2));border:1px solid rgba(255,255,255,.6)}
  .tso-ps886a__player .head{position:absolute;left:10px;top:7px;width:14px;height:12px;border-radius:50%;background:#f1c8a6;z-index:-1}
  .tso-ps886a__player .torso{position:absolute;left:8px;top:13px;width:18px;height:18px;border-radius:6px;background:linear-gradient(180deg,var(--c1),var(--c2));border:1px solid rgba(255,255,255,.46)}
  .tso-ps886a__player .arm{position:absolute;top:16px;width:4px;height:15px;border-radius:4px;background:#e9be95}.tso-ps886a__player .arm.l{left:3px;transform:rotate(26deg)}.tso-ps886a__player .arm.r{right:3px;transform:rotate(-26deg)}
  .tso-ps886a__player .leg{position:absolute;top:27px;width:5px;height:18px;border-radius:4px;background:linear-gradient(180deg,var(--c2),#08121f)}.tso-ps886a__player .leg.l{left:10px;transform:rotate(8deg)}.tso-ps886a__player .leg.r{right:10px;transform:rotate(-8deg)}
  .tso-ps886a__player .tag{position:absolute;left:50%;top:46px;transform:translateX(-50%);padding:3px 8px;border-radius:999px;background:rgba(7,17,34,.86);border:1px solid rgba(67,155,255,.34);font:700 10px/1 system-ui,Arial,sans-serif;color:#fff;white-space:nowrap}
  .tso-ps886a__player.off{--c1:#fefefe;--c2:#154fc9}.tso-ps886a__player.def{--c1:#0a223d;--c2:#69be28}.tso-ps886a__player.key{transform:translate(-50%,-50%) scale(1.15)}.tso-ps886a__player.fade{opacity:.24}
  .tso-ps886a__ball{position:absolute;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#d79b66 0 24%,#8f4922 25% 76%,#5f2d10 77% 100%);border:1px solid rgba(255,255,255,.58);box-shadow:0 0 0 5px rgba(255,255,255,.1),0 8px 12px rgba(0,0,0,.26);z-index:6;transition:left .55s cubic-bezier(.2,.8,.2,1),top .55s cubic-bezier(.2,.8,.2,1)}
  .tso-ps886a__ball:before{content:'';position:absolute;left:6px;top:2px;bottom:2px;width:2px;background:#f8f2e8;transform:rotate(22deg)}
  .tso-ps886a__legend{display:flex;justify-content:center;gap:22px;padding:8px 0 12px;font:800 11px/1 system-ui,Arial,sans-serif;color:#e5f2ff}.tso-ps886a__legend span{display:inline-flex;gap:8px;align-items:center}.tso-ps886a__legend i{display:inline-block;width:22px;height:4px;background:#2ea9ff;border-radius:999px}.tso-ps886a__legend i.fd{background:#ffe100}.tso-ps886a__legend i.path{height:0;background:transparent;border-top:3px dashed #6dd7ff;width:26px}
  .tso-ps886a__panels{display:grid;grid-template-columns:1.2fr 1fr .95fr .95fr;gap:10px;padding:12px;background:linear-gradient(180deg,#071626,#06111d)}
  .tso-ps886a__panel{min-height:188px;padding:14px;border:1px solid rgba(53,135,255,.3);border-radius:14px;background:linear-gradient(180deg,#081b34,#071423)}
  .tso-ps886a__title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;font:900 13px/1 system-ui,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#18c3ff}.tso-ps886a__chip{padding:7px 10px;border-radius:10px;border:1px solid rgba(70,160,255,.36);background:linear-gradient(180deg,#0d3b74,#09264b);font:800 11px/1 system-ui,Arial,sans-serif;color:#e9f7ff;text-transform:uppercase}
  .tso-ps886a__row{display:flex;gap:12px;align-items:center}.tso-ps886a__avatar{width:76px;height:76px;border-radius:50%;overflow:hidden;border:2px solid rgba(45,170,255,.55);background:linear-gradient(180deg,#0c2848,#09192c);display:grid;place-items:center}.tso-ps886a__avatar img{width:100%;height:100%;object-fit:cover}.tso-ps886a__avatar .init{font:900 28px/1 system-ui,Arial,sans-serif;color:#fff}.tso-ps886a__pname{font:900 22px/1 system-ui,Arial,sans-serif;color:#fff}.tso-ps886a__psub{margin-top:4px;font:700 13px/1.2 system-ui,Arial,sans-serif;color:#9ec4ea}
  .tso-ps886a__copy{min-height:72px;margin-top:10px;font:700 15px/1.25 system-ui,Arial,sans-serif;color:#ecf4ff}
  .tso-ps886a__stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.tso-ps886a__stats div{padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}.tso-ps886a__stats b{display:block;font:900 17px/1.1 system-ui,Arial,sans-serif;color:#fff}.tso-ps886a__stats small{display:block;margin-top:2px;font:700 11px/1 system-ui,Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#7eb0dd}
  .tso-ps886a__wp{display:flex;justify-content:space-between;margin-bottom:8px;font:900 18px/1 system-ui,Arial,sans-serif;color:#fff}.tso-ps886a__chart{height:92px;border-radius:12px;border:1px solid rgba(58,133,255,.25);background:linear-gradient(180deg,rgba(9,29,56,.7),rgba(6,18,34,.9))}.tso-ps886a__chart svg{width:100%;height:100%}.tso-ps886a__axis{display:flex;justify-content:space-between;margin-top:8px;font:700 12px/1 system-ui,Arial,sans-serif;color:#9cc4ed}
  .tso-ps886a__summary{display:grid;gap:10px}.tso-ps886a__srow{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;font:800 14px/1.1 system-ui,Arial,sans-serif;color:#eaf5ff}.tso-ps886a__srow i{width:14px;height:14px;border-radius:50%;background:#4be07a;box-shadow:0 0 8px rgba(75,224,122,.4)}.tso-ps886a__srow.cur i{background:#1ea6ff;box-shadow:0 0 8px rgba(30,166,255,.4)}
  .tso-ps886a__footer{display:grid;grid-template-columns:1.2fr 1fr auto;gap:16px;align-items:center;padding:12px 14px 16px;border-top:1px solid rgba(52,132,255,.22);background:linear-gradient(180deg,#06111d,#050e18)}
  .tso-ps886a__brand{display:flex;align-items:center;gap:16px;color:#dff2ff}.tso-ps886a__brand span{font:900 30px/1 system-ui,Arial,sans-serif;color:#fff}.tso-ps886a__brand strong{font:900 13px/1 system-ui,Arial,sans-serif;letter-spacing:.32em;text-transform:uppercase}
  .tso-ps886a__nav{display:flex;justify-content:center;gap:26px;font:900 13px/1 system-ui,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#4dbefe}.tso-ps886a__nav span{display:grid;justify-items:center;gap:8px}.tso-ps886a__nav i{font-style:normal;font-size:26px;color:#33afff}
  .tso-ps886a__lab{display:flex;align-items:center;gap:14px;padding:12px 18px;border:1px solid rgba(65,150,255,.35);border-radius:14px;background:linear-gradient(180deg,#0d3b74,#0b2750);color:#fff;font:900 22px/1 system-ui,Arial,sans-serif}.tso-ps886a__lab i{font-style:normal;font-size:30px}.tso-ps886a__lab small{display:block;margin-top:4px;font:700 12px/1.2 system-ui,Arial,sans-serif;color:#d3ebff}
  .tso-possession-football{display:inline-flex;align-items:center;margin-left:8px;filter:drop-shadow(0 0 4px rgba(255,190,66,.38))}
  @media (max-width:1180px){.tso-ps886a__panels{grid-template-columns:1fr 1fr}.tso-ps886a__footer{grid-template-columns:1fr}.tso-ps886a__nav{justify-content:flex-start;flex-wrap:wrap}}
  @media (max-width:760px){.tso-ps886a__topBoards{grid-template-columns:1fr;top:10px}.tso-ps886a__stadium{height:420px}.tso-ps886a__fieldStage{height:200px;bottom:64px}.tso-ps886a__panels{grid-template-columns:1fr}.tso-ps886a__footer{grid-template-columns:1fr}.tso-ps886a__endText{font-size:26px}.tso-ps886a__brand{display:grid;gap:8px}.tso-ps886a__brand strong{letter-spacing:.14em;font-size:11px}}
  `;
  const style=document.createElement('style'); style.id=STYLE_ID; style.textContent=css; document.head.appendChild(style);
}
