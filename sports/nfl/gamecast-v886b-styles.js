const STYLE_ID = 'tso-nfl-playstage-v886b-styles';

export function ensureNflPlaystageV886BStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const css = `
  .tso-ps886b,
  .tso-ps886b * { box-sizing: border-box; }
  .tso-ps886b {
    margin: 12px 0 0;
    border: 1px solid rgba(48, 130, 255, .34);
    border-radius: 20px;
    overflow: hidden;
    background: linear-gradient(180deg, #081729 0%, #07111d 70%, #06101a 100%);
    box-shadow: 0 22px 70px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.04);
  }
  .tso-ps886b__hero {
    position: relative;
    padding: 14px 14px 0;
    background:
      radial-gradient(circle at 50% -10%, rgba(42,136,255,.22), transparent 34%),
      linear-gradient(180deg, #08192f 0%, #07111d 100%);
  }
  .tso-ps886b__topRibbon {
    position: relative;
    z-index: 3;
    margin: 0 auto 14px;
    width: min(1100px, 94%);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  .tso-ps886b__topCard {
    height: 48px;
    border: 1px solid rgba(74, 155, 255, .32);
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(12, 56, 110, .95), rgba(9, 37, 74, .95));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font: 900 13px/1 system-ui, Arial, sans-serif;
    letter-spacing: .06em;
    text-transform: uppercase;
    box-shadow: 0 10px 18px rgba(0,0,0,.20);
  }
  .tso-ps886b__topCard strong { color: #16c1ff; font-size: 18px; }

  .tso-ps886b__stadium {
    position: relative;
    height: 560px;
    border: 1px solid rgba(58, 138, 255, .24);
    border-radius: 18px;
    overflow: hidden;
    background:
      radial-gradient(circle at 6% 18%, rgba(206, 243, 255, .95), rgba(206,243,255,.18) 12%, transparent 25%),
      radial-gradient(circle at 94% 18%, rgba(206, 243, 255, .95), rgba(206,243,255,.18) 12%, transparent 25%),
      linear-gradient(180deg, #11263e 0%, #081523 14%, #0b1725 28%, #0d2418 29%, #1f7b2d 34%, #1c6f28 100%);
    box-shadow: inset 0 16px 60px rgba(255,255,255,.03);
  }
  .tso-ps886b__upperGlow {
    position: absolute;
    left: 7%; right: 7%; top: 52px;
    height: 120px;
    border-radius: 999px;
    background: radial-gradient(ellipse at center, rgba(79, 184, 255, .18), transparent 70%);
    filter: blur(4px);
  }
  .tso-ps886b__adDeck {
    position: absolute;
    left: 4%; right: 4%; top: 76px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    z-index: 3;
  }
  .tso-ps886b__adDeck > div {
    height: 54px;
    border: 1px solid rgba(72, 149, 255, .26);
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(10, 47, 95, .92), rgba(8, 30, 61, .92));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font: 900 13px/1 system-ui, Arial, sans-serif;
    letter-spacing: .06em;
    text-transform: uppercase;
    box-shadow: 0 10px 16px rgba(0,0,0,.18);
  }
  .tso-ps886b__adDeck > div:nth-child(2) { color: #11c6ff; font-size: 18px; }
  .tso-ps886b__crowd {
    position: absolute;
    left: 0; right: 0; top: 118px;
    height: 120px;
    background:
      radial-gradient(circle at 10px 10px, rgba(255,255,255,.20) 0 1.3px, transparent 1.5px) 0 0 / 18px 18px,
      radial-gradient(circle at 8px 8px, rgba(255,255,255,.13) 0 1.2px, transparent 1.4px) 8px 9px / 19px 19px,
      linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.32));
    opacity: .34;
  }
  .tso-ps886b__sidelineBand {
    position: absolute;
    left: 0; right: 0; top: 220px;
    height: 44px;
    background: linear-gradient(180deg, rgba(20,39,62,.95), rgba(10,21,35,.95));
    border-top: 1px solid rgba(255,255,255,.08);
    border-bottom: 1px solid rgba(255,255,255,.08);
  }
  .tso-ps886b__sidelineBand:before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-radial-gradient(circle at 8px 22px, rgba(255,255,255,.16) 0 2px, transparent 3px 12px);
    opacity: .45;
  }
  .tso-ps886b__lightTower {
    position: absolute;
    top: 98px;
    width: 74px;
    height: 128px;
    z-index: 3;
  }
  .tso-ps886b__lightTower:before {
    content: '';
    position: absolute;
    left: 34px; top: 24px; bottom: 0;
    width: 6px;
    background: linear-gradient(180deg, #294d70, #9ec7ec 50%, #294d70);
    box-shadow: 0 0 10px rgba(165, 220, 255, .18);
  }
  .tso-ps886b__lightTower:after {
    content: '';
    position: absolute;
    left: 0; top: 0;
    width: 74px; height: 26px;
    border-radius: 8px;
    background: repeating-linear-gradient(90deg, #f3fcff 0 7px, #d6f2ff 7px 11px);
    box-shadow: 0 0 28px rgba(179, 231, 255, .95);
  }
  .tso-ps886b__lightTower--left { left: 26px; }
  .tso-ps886b__lightTower--right { right: 26px; }

  .tso-ps886b__goal {
    position: absolute;
    top: 266px;
    width: 40px;
    height: 120px;
    z-index: 3;
  }
  .tso-ps886b__goal .post,
  .tso-ps886b__goal .crossbar,
  .tso-ps886b__goal .upright {
    position: absolute;
    background: #f2c84a;
    box-shadow: 0 0 10px rgba(242,200,74,.34);
  }
  .tso-ps886b__goal .post { left: 50%; transform: translateX(-50%); top: 44px; bottom: 0; width: 4px; }
  .tso-ps886b__goal .crossbar { left: 0; right: 0; top: 44px; height: 4px; }
  .tso-ps886b__goal .upright { top: 0; width: 4px; height: 46px; }
  .tso-ps886b__goal .upright.left { left: 0; }
  .tso-ps886b__goal .upright.right { right: 0; }
  .tso-ps886b__goal--left { left: 74px; }
  .tso-ps886b__goal--right { right: 74px; }

  .tso-ps886b__fieldStage {
    position: absolute;
    left: 16px; right: 16px; bottom: 84px;
    height: 308px;
    z-index: 2;
    perspective: 1400px;
  }
  .tso-ps886b__fieldPlane {
    position: absolute; inset: 0;
    transform: rotateX(62deg);
    transform-style: preserve-3d;
  }
  .tso-ps886b__fieldShadow {
    position: absolute;
    left: 7%; right: 7%; top: 0;
    height: 28px;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(73,188,255,.22), transparent 70%);
  }
  .tso-ps886b__field {
    position: absolute;
    inset: 18px 0 0 0;
    border-radius: 0 0 14px 14px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255,255,255,.08), transparent 10%),
      repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 2px, transparent 2px calc(10% - 2px), rgba(255,255,255,.18) calc(10% - 2px) 10%),
      repeating-linear-gradient(180deg, rgba(255,255,255,.10) 0 2px, transparent 2px 40px),
      linear-gradient(180deg, #33943d 0%, #298532 55%, #216e29 100%);
    box-shadow: inset 0 0 0 2px rgba(255,255,255,.16), inset 0 18px 40px rgba(255,255,255,.04), inset 0 -24px 44px rgba(0,0,0,.22);
  }
  .tso-ps886b__endzone {
    position: absolute;
    top: 18px; bottom: 0; width: 11.5%;
    overflow: hidden;
  }
  .tso-ps886b__endzone--away { left: 0; background: linear-gradient(135deg, var(--away-a), var(--away-b)); }
  .tso-ps886b__endzone--home { right: 0; background: linear-gradient(135deg, var(--home-a), var(--home-b)); }
  .tso-ps886b__endText {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font: 900 40px/1 Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
    color: #fff;
    letter-spacing: .04em;
    text-transform: uppercase;
    text-shadow: 0 4px 10px rgba(0,0,0,.34);
    white-space: nowrap;
  }
  .tso-ps886b__endzone--away .tso-ps886b__endText { transform: rotate(-90deg); }
  .tso-ps886b__endzone--home .tso-ps886b__endText { transform: rotate(90deg); }

  .tso-ps886b__playfield {
    position: absolute;
    left: 11.5%; right: 11.5%; top: 18px; bottom: 0;
  }
  .tso-ps886b__yardNum {
    position: absolute;
    top: 10px;
    transform: translateX(-50%);
    color: rgba(255,255,255,.82);
    font: 900 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .tso-ps886b__yardNum.bot { top: auto; bottom: 10px; }
  .tso-ps886b__line {
    position: absolute;
    top: 0; bottom: 0;
    width: 4px;
    transform: translateX(-50%);
    z-index: 2;
    box-shadow: 0 0 12px currentColor;
  }
  .tso-ps886b__line.los { background: #2da8ff; color: #2da8ff; }
  .tso-ps886b__line.fd { background: #ffe000; color: #ffe000; }
  .tso-ps886b__path {
    position: absolute; inset: 0;
    z-index: 3;
    pointer-events: none;
  }

  .tso-ps886b__player {
    position: absolute;
    width: 42px;
    height: 62px;
    transform: translate(-50%, -50%);
    z-index: 4;
    filter: drop-shadow(0 10px 10px rgba(0,0,0,.30));
    transition: left .55s cubic-bezier(.2,.8,.2,1), top .55s cubic-bezier(.2,.8,.2,1), transform .55s cubic-bezier(.2,.8,.2,1);
  }
  .tso-ps886b__player svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }
  .tso-ps886b__player.off { --primary: #ffffff; --secondary: #174cc7; --trim: #df1139; }
  .tso-ps886b__player.def { --primary: #0a223c; --secondary: #69be28; --trim: #b6c0c8; }
  .tso-ps886b__player.key { transform: translate(-50%, -50%) scale(1.12); }
  .tso-ps886b__player.fade { opacity: .24; }
  .tso-ps886b__playerLabel {
    position: absolute;
    left: 50%; top: 56px;
    transform: translateX(-50%);
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(5, 18, 32, .88);
    border: 1px solid rgba(65, 155, 255, .34);
    color: #fff;
    font: 700 10px/1 system-ui, Arial, sans-serif;
    white-space: nowrap;
  }
  .tso-ps886b__ball {
    position: absolute;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 32% 28%, #d79c6a 0 24%, #8e4922 25% 76%, #5f2c10 77% 100%);
    border: 1px solid rgba(255,255,255,.60);
    box-shadow: 0 0 0 6px rgba(255,255,255,.08), 0 10px 18px rgba(0,0,0,.32);
    z-index: 6;
    transition: left .55s cubic-bezier(.2,.8,.2,1), top .55s cubic-bezier(.2,.8,.2,1);
  }
  .tso-ps886b__ball:before {
    content: '';
    position: absolute;
    left: 7px; top: 2px; bottom: 2px;
    width: 2px;
    background: #f8f0e5;
    transform: rotate(22deg);
  }
  .tso-ps886b__midLogo {
    position: absolute;
    left: 50%; bottom: 16px;
    transform: translateX(-50%);
    padding: 5px 18px;
    border-radius: 8px;
    background: rgba(9, 42, 74, .86);
    color: #74d7ff;
    font: 900 34px/1 system-ui, Arial, sans-serif;
    letter-spacing: .02em;
    text-transform: uppercase;
    box-shadow: 0 6px 16px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.10);
  }
  .tso-ps886b__legend {
    display: flex;
    justify-content: center;
    gap: 22px;
    padding: 8px 0 12px;
    color: #e8f5ff;
    font: 800 11px/1 system-ui, Arial, sans-serif;
  }
  .tso-ps886b__legend span { display: inline-flex; align-items: center; gap: 8px; }
  .tso-ps886b__legend i { display: inline-block; width: 24px; height: 4px; border-radius: 999px; background: #2da8ff; }
  .tso-ps886b__legend i.fd { background: #ffe000; }
  .tso-ps886b__legend i.path { width: 26px; height: 0; background: transparent; border-top: 3px dashed #68d6ff; }

  .tso-ps886b__panels {
    display: grid;
    grid-template-columns: 1.25fr 1.05fr 1fr 1fr;
    gap: 10px;
    padding: 12px;
    background: linear-gradient(180deg, #071523, #060f19);
  }
  .tso-ps886b__panel {
    min-height: 188px;
    padding: 14px;
    border: 1px solid rgba(57,137,255,.28);
    border-radius: 14px;
    background: linear-gradient(180deg, #081b34, #071321);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
  }
  .tso-ps886b__title {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #15c3ff;
    font: 900 13px/1 system-ui, Arial, sans-serif;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  .tso-ps886b__chip {
    padding: 7px 10px;
    border-radius: 10px;
    border: 1px solid rgba(71,160,255,.38);
    background: linear-gradient(180deg, #0d3b74, #0a2751);
    color: #f0fbff;
    font: 800 11px/1 system-ui, Arial, sans-serif;
    text-transform: uppercase;
  }
  .tso-ps886b__row { display: flex; gap: 12px; align-items: center; }
  .tso-ps886b__avatar {
    width: 74px; height: 74px; border-radius: 50%; overflow: hidden;
    display: grid; place-items: center;
    border: 2px solid rgba(45,170,255,.55);
    background: linear-gradient(180deg, #0d2748, #081728);
  }
  .tso-ps886b__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .tso-ps886b__avatar .init { color: #fff; font: 900 28px/1 system-ui, Arial, sans-serif; }
  .tso-ps886b__pname { color: #fff; font: 900 20px/1.05 system-ui, Arial, sans-serif; }
  .tso-ps886b__psub { margin-top: 4px; color: #9ec5eb; font: 700 13px/1.2 system-ui, Arial, sans-serif; }
  .tso-ps886b__copy { min-height: 74px; margin-top: 10px; color: #ecf5ff; font: 700 15px/1.25 system-ui, Arial, sans-serif; }
  .tso-ps886b__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 10px;
  }
  .tso-ps886b__stats div { padding-top: 8px; border-top: 1px solid rgba(255,255,255,.08); }
  .tso-ps886b__stats b { display: block; color: #fff; font: 900 17px/1.1 system-ui, Arial, sans-serif; }
  .tso-ps886b__stats small { display: block; margin-top: 2px; color: #7eb0dd; font: 700 11px/1 system-ui, Arial, sans-serif; letter-spacing: .05em; text-transform: uppercase; }
  .tso-ps886b__wp {
    display: flex; justify-content: space-between; gap: 8px;
    margin-bottom: 8px;
    color: #fff;
    font: 900 18px/1 system-ui, Arial, sans-serif;
  }
  .tso-ps886b__chart {
    height: 92px;
    border-radius: 12px;
    border: 1px solid rgba(57,137,255,.25);
    background: linear-gradient(180deg, rgba(9,29,56,.74), rgba(6,18,34,.94));
  }
  .tso-ps886b__chart svg { width: 100%; height: 100%; }
  .tso-ps886b__axis {
    display: flex; justify-content: space-between; margin-top: 8px;
    color: #9cc4ed; font: 700 12px/1 system-ui, Arial, sans-serif;
  }
  .tso-ps886b__summary { display: grid; gap: 10px; }
  .tso-ps886b__srow {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 10px;
    align-items: center;
    color: #edf5ff;
    font: 800 14px/1.1 system-ui, Arial, sans-serif;
  }
  .tso-ps886b__srow i {
    width: 14px; height: 14px; border-radius: 50%;
    background: #4be07a;
    box-shadow: 0 0 8px rgba(75,224,122,.40);
  }
  .tso-ps886b__srow.cur i {
    background: #1ea6ff;
    box-shadow: 0 0 8px rgba(30,166,255,.40);
  }

  .tso-ps886b__footer {
    display: grid;
    grid-template-columns: 1.25fr 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 12px 14px 16px;
    border-top: 1px solid rgba(52,132,255,.22);
    background: linear-gradient(180deg, #06111d, #050d16);
  }
  .tso-ps886b__brand { display: flex; align-items: center; gap: 16px; color: #dff3ff; }
  .tso-ps886b__brand span { color: #fff; font: 900 28px/1 system-ui, Arial, sans-serif; }
  .tso-ps886b__brand strong { font: 900 13px/1 system-ui, Arial, sans-serif; letter-spacing: .30em; text-transform: uppercase; }
  .tso-ps886b__nav { display: flex; justify-content: center; gap: 26px; color: #4cbefe; font: 900 13px/1 system-ui, Arial, sans-serif; letter-spacing: .06em; text-transform: uppercase; }
  .tso-ps886b__nav span { display: grid; justify-items: center; gap: 8px; }
  .tso-ps886b__nav i { font-style: normal; font-size: 26px; color: #33afff; }
  .tso-ps886b__lab {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 18px;
    border: 1px solid rgba(65,150,255,.35);
    border-radius: 14px;
    background: linear-gradient(180deg, #0d3b74, #0a2850);
    color: #fff;
    font: 900 22px/1 system-ui, Arial, sans-serif;
  }
  .tso-ps886b__lab i { font-style: normal; font-size: 30px; }
  .tso-ps886b__lab small { display: block; margin-top: 4px; color: #d3ebff; font: 700 12px/1.2 system-ui, Arial, sans-serif; }

  .tso-possession-football {
    display: inline-flex;
    align-items: center;
    margin-left: 8px;
    filter: drop-shadow(0 0 4px rgba(255,191,70,.40));
  }

  @media (max-width: 1180px) {
    .tso-ps886b__panels { grid-template-columns: 1fr 1fr; }
    .tso-ps886b__footer { grid-template-columns: 1fr; }
    .tso-ps886b__nav { justify-content: flex-start; flex-wrap: wrap; }
  }
  @media (max-width: 760px) {
    .tso-ps886b__topRibbon,
    .tso-ps886b__adDeck { grid-template-columns: 1fr; }
    .tso-ps886b__stadium { height: 430px; }
    .tso-ps886b__fieldStage { height: 220px; bottom: 70px; }
    .tso-ps886b__panels { grid-template-columns: 1fr; }
    .tso-ps886b__footer { grid-template-columns: 1fr; }
    .tso-ps886b__endText { font-size: 26px; }
    .tso-ps886b__brand { display: grid; gap: 8px; }
    .tso-ps886b__brand strong { letter-spacing: .12em; font-size: 11px; }
  }
  `;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}
