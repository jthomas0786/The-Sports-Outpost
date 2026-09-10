import { mountOrUpdateNflPlaystageV886, renderNflPlaystageV886HTML } from './nfl/playstage-v886.js?v=88.6';
import { ensureNflPlaystageV886Styles } from './nfl/gamecast-v886-styles.js?v=88.6';
import { startLivePolling, refreshLiveNow } from './nfl/live.js?v=78';
import { ensureHalftimeLabStyles, halftimeBannerHTML, halftimeGamecastBannerHTML, isHalftimeGameState, openHalftimeParlayLab, startHalftimeBoardPolling } from './nfl/halftime-ui-v884.js?v=88.4';
import { getNflDemoMode, hydrateNflDemoState, postRenderNflDemoSync } from './nfl/demo-mode.js?v=88.5b';
import { ensureNflGamecastV883aStyles } from './nfl/gamecast-v883a-styles.js?v=88.3a';
import { ensureNflGamecastV883bStyles } from './nfl/gamecast-v883b-styles.js?v=88.3b';
import { ensureNflGamecastV884Styles } from './nfl/gamecast-v884-styles.js?v=88.4';

/**
 * sports/nfl-preview.js — NFL product mock built from the MLB information
 * architecture. It uses slates/nfl.json for schedule/model data, nfl-research.json
 * for source-backed player context, nfl-odds.json for current sportsbook lines,
 * and the low-latency live feed for Gamecast/TD Feed. v86 also consumes
 * slates/nfl-sim.json so TSO prop probabilities can blend the existing model /
 * research lean with the latest correlated Monte Carlo simulation.
 */

const state = {
  tab: 'props',
  prop: 'atd',
  propView: 'board',
  player: null,
  game: null,
  mapFilter: 'ALL',
  loaded: false,
  data: null,
  research: null,
  odds: null,
  sim: null,
  halftime: null,
  allSort: 'edge',
  gamecastTab: 'game',
  inlineTabs: {},
  expandedSlate: new Set(),
  intelOpenGame: null,
  intelTabs: {},
};

const NFL_FIELD_ART = 'nfl-tso-field.png?v=42';
const NFL_DEMO_MODE=getNflDemoMode();


// v76 — cleaned/scalable NFL Gamecast concept canvas.  The Game View is authored once at
// 1448×1086 (the approved desktop concept) and the entire canvas is uniformly
// scaled to the available content width.  Nothing reflows on phones: mobile is
// the same composition, simply smaller.
const NFL_GAMECAST_CANVAS_W = 1448;
const NFL_GAMECAST_CANVAS_H = 1086;
let _nflGamecastResizeObserver = null;
function ensureNflGamecastConceptStyles(){
  if(document.getElementById('nfl-gamecast-concept-v84')) return;
  const style=document.createElement('style');
  style.id='nfl-gamecast-concept-v84';
  style.textContent=`
  #nflView .nxg-wrap.nxg-concept{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;color:#dcecff!important;overflow:visible!important}
  #nflView .nxg-concept-viewport{position:relative;width:100%;min-width:0;overflow:hidden;background:#020a18;border-radius:0}
  #nflView .nxg-concept-canvas{position:absolute;top:0;left:0;width:${NFL_GAMECAST_CANVAS_W}px;height:${NFL_GAMECAST_CANVAS_H}px;transform-origin:0 0;background:linear-gradient(180deg,#020b1c 0%,#06162e 19%,#020914 100%);font-family:'JetBrains Mono','Space Mono',monospace;overflow:hidden}

  #nflView .nxg-concept .nxg-topbar{height:62px;margin:0!important;padding:10px 16px 8px;display:grid!important;grid-template-columns:448px minmax(0,1fr);align-items:center;gap:16px;background:#020a18;border:0!important;box-sizing:border-box}
  #nflView .nxg-concept .nxg-tabs{width:448px!important;height:40px!important;border-radius:8px!important;display:flex!important;background:#030f23!important;border:1px solid rgba(39,130,244,.58)!important;overflow:hidden!important}
  #nflView .nxg-concept .nxg-tab{height:40px!important;min-width:0!important;flex:1!important;padding:0 16px!important;border:0!important;border-right:1px solid rgba(39,130,244,.42)!important;border-radius:0!important;background:transparent!important;color:#e5efff!important;font:800 11px/40px 'JetBrains Mono',monospace!important;letter-spacing:.02em!important}
  #nflView .nxg-concept .nxg-tab:last-child{border-right:0!important}
  #nflView .nxg-concept .nxg-tab.active{background:linear-gradient(180deg,#1688ff,#0a64db)!important;color:white!important;box-shadow:inset 0 0 0 1px rgba(115,190,255,.28)!important}
  #nflView .nxg-concept .nxg-tools{height:40px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:10px!important;overflow:visible!important;flex-wrap:nowrap!important}
  #nflView .nxg-concept .nxg-livepill,#nflView .nxg-concept .nxg-feedpill,#nflView .nxg-concept .nxg-ghostbtn,#nflView .nxg-concept .nxg-dotbtn{height:38px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0 14px!important;border-radius:9px!important;border:1px solid rgba(42,137,255,.52)!important;background:#031127!important;color:#e8f2ff!important;font:800 10px/1 'JetBrains Mono',monospace!important;white-space:nowrap!important}
  #nflView .nxg-concept .nxg-dotbtn{width:50px!important;min-width:50px!important;padding:0!important;font-size:13px!important}
  #nflView .nxg-concept .nxg-previewpill .dot{width:8px;height:8px;background:#64748b!important;box-shadow:none!important}
  #nflView .nxg-concept .nxg-ghostbtn{color:#7fc2ff!important}

  #nflView .nxg-concept .nxg-scorebar{height:154px!important;min-height:154px!important;margin:0 16px!important;width:1416px!important;display:grid!important;grid-template-columns:500px 282px 500px 134px!important;overflow:hidden!important;border:1px solid rgba(45,127,255,.52)!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(9,31,63,.98),rgba(5,20,43,.98))!important;box-shadow:0 10px 32px rgba(0,0,0,.22)!important}
  #nflView .nxg-concept .nxg-teamblock{height:152px!important;box-sizing:border-box!important;padding:18px 20px!important;display:grid!important;grid-template-columns:110px minmax(0,1fr) 92px!important;align-items:center!important;gap:14px!important;background:linear-gradient(90deg,rgba(11,38,74,.32),rgba(4,16,35,.08))!important}
  #nflView .nxg-concept .nxg-teamblock.home{grid-template-columns:92px minmax(0,1fr) 110px!important;text-align:right!important;background:linear-gradient(270deg,rgba(11,38,74,.32),rgba(4,16,35,.08))!important}
  #nflView .nxg-concept .nxg-teamlogo{width:104px!important;height:72px!important;object-fit:contain!important;filter:drop-shadow(0 5px 7px rgba(0,0,0,.28))}
  #nflView .nxg-concept .nxg-teamcopy{min-width:0!important;overflow:visible!important}#nflView .nxg-concept .nxg-teamcopy small{display:block!important;margin-bottom:5px!important;color:#9bc5fb!important;font:700 13px/1.05 'JetBrains Mono',monospace!important;letter-spacing:.03em!important;white-space:nowrap!important}
  #nflView .nxg-concept .nxg-teamcopy b{display:block!important;color:white!important;font:700 30px/1 'Oswald',sans-serif!important;letter-spacing:.01em!important;text-transform:uppercase!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important}
  #nflView .nxg-concept .nxg-teamcopy span{display:block!important;margin-top:6px!important;color:#7594c0!important;font:500 12px/1 'JetBrains Mono',monospace!important}
  #nflView .nxg-concept .nxg-scorebox{text-align:center!important;align-self:center!important}
  #nflView .nxg-concept .nxg-score{font:800 68px/.9 'Oswald',sans-serif!important;letter-spacing:-.03em!important;color:#f9fbff!important;text-shadow:0 3px 0 rgba(0,0,0,.25)!important}
  #nflView .nxg-concept .nxg-score-dots{height:16px;margin-top:10px!important;display:flex!important;gap:9px!important;justify-content:center!important}.nxg-concept .nxg-score-dots i{width:7px!important;height:7px!important;border-radius:50%!important;background:#d8e7ff!important}
  #nflView .nxg-concept .nxg-centerblock{height:152px!important;box-sizing:border-box!important;padding:12px 14px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:6px!important;border-left:1px solid rgba(45,127,255,.2)!important;border-right:1px solid rgba(45,127,255,.2)!important;background:rgba(4,17,39,.36)!important}
  #nflView .nxg-concept .nxg-clockline{display:flex!important;flex-direction:column!important;align-items:center!important;gap:0!important}
  #nflView .nxg-concept .nxg-period{font:700 21px/1 'Oswald',sans-serif!important;color:#2f9cff!important;letter-spacing:.01em!important}
  #nflView .nxg-concept .nxg-clock{font:800 42px/.98 'Oswald',sans-serif!important;color:#fff!important;letter-spacing:.005em!important}
  #nflView .nxg-concept .nxg-downchip{height:36px!important;box-sizing:border-box!important;padding:0 18px!important;border:1px solid rgba(45,127,255,.72)!important;border-radius:9px!important;background:rgba(4,20,48,.86)!important;color:#fff!important;font:800 13px/34px 'JetBrains Mono',monospace!important;display:flex!important;align-items:center!important;gap:12px!important;white-space:nowrap!important}
  #nflView .nxg-concept .nxg-downchip i{width:1px!important;height:18px!important;background:rgba(124,170,230,.35)!important}
  #nflView .nxg-concept .nxg-downchip .arr{color:#329fff!important}
  #nflView .nxg-concept .nxg-posstext{font:500 11px/1 'JetBrains Mono',monospace!important;color:#92b3dd!important}
  #nflView .nxg-concept .nxg-weather{height:152px!important;box-sizing:border-box!important;padding:18px 12px!important;border-left:1px solid rgba(45,127,255,.2)!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:6px!important;text-align:left!important;background:rgba(4,16,35,.25)!important}
  #nflView .nxg-concept .nxg-weather-top{display:flex!important;align-items:center!important;gap:8px!important}.nxg-concept .nxg-weather-ico{font-size:20px!important}.nxg-concept .nxg-weather strong{font:800 32px/1 'Oswald',sans-serif!important;color:#fff!important}.nxg-concept .nxg-weather small{font:700 13px/1.2 'Oswald',sans-serif!important;color:#fff!important}.nxg-concept .nxg-weather>span{font:500 11px/1.2 'JetBrains Mono',monospace!important;color:#9eb9dc!important}

  #nflView .nxg-concept .nxg-gameview-modern{height:870px!important;margin:0!important;padding:0!important}
  #nflView .nxg-concept .nxg-live-stage{height:870px!important;margin:0!important;padding:0!important;position:relative!important}
  #nflView .nxg-concept .nxg-fieldshell-live{position:relative!important;width:1448px!important;height:870px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;background:#071326!important;box-shadow:none!important}
  #nflView .nxg-concept .nxg-stadium-exact{display:none!important}
  #nflView .nxg-concept .nxg-fieldart-frame{position:absolute!important;inset:0!important;width:1448px!important;height:870px!important;border-radius:0!important;overflow:hidden!important;box-shadow:none!important;z-index:1!important}
  #nflView .nxg-concept .nxg-fieldart-img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:fill!important;filter:saturate(1.08) contrast(1.02) brightness(.82)!important}
  #nflView .nxg-concept .nxg-fieldart-shade{position:absolute!important;inset:0!important;z-index:2!important;background:linear-gradient(180deg,rgba(0,7,20,.12) 0%,rgba(0,7,20,.02) 26%,rgba(0,8,16,.02) 67%,rgba(0,8,18,.32) 100%)!important}
  #nflView .nxg-concept .nxg-fieldsvg{z-index:3!important}
  #nflView .nxg-concept .nxg-svg-los{stroke:#2ba7ff!important;stroke-width:7!important;filter:drop-shadow(0 0 5px rgba(43,167,255,.65))!important}.nxg-concept .nxg-svg-first{stroke:#fff000!important;stroke-width:7!important;filter:drop-shadow(0 0 4px rgba(255,240,0,.55))!important}.nxg-concept .nxg-svg-route{stroke:#48b9ff!important;stroke-width:12!important}.nxg-concept .nxg-svg-route-dash{stroke:#37baff!important;stroke-width:5!important}.nxg-concept .nxg-svg-off{fill:#168aff!important;stroke:#b6e5ff!important}.nxg-concept .nxg-svg-def{fill:#dbe7ff!important;stroke:#8fa4c7!important}
  #nflView .nxg-concept .nxg-brandmark-exact{display:none!important}
  #nflView .nxg-concept .nxg-nfllive,#nflView .nxg-concept .nxg-fieldtag{display:none!important}

  #nflView .nxg-concept .nxg-overlay-stack{position:absolute!important;top:30px!important;z-index:8!important;display:flex!important;flex-direction:column!important;gap:12px!important;width:430px!important}
  #nflView .nxg-concept .nxg-overlay-stack.left{left:18px!important}.nxg-concept .nxg-overlay-stack.right{right:18px!important}
  #nflView .nxg-concept .nxg-overlay-panel{width:430px!important;box-sizing:border-box!important;padding:14px 18px!important;border:1px solid rgba(55,151,255,.55)!important;border-radius:10px!important;background:linear-gradient(180deg,rgba(3,17,39,.60),rgba(3,15,34,.39))!important;backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important;box-shadow:0 10px 24px rgba(0,0,0,.10)!important;color:#fff!important}
  #nflView .nxg-concept .nxg-overlay-scoring{height:154px!important}.nxg-concept .nxg-overlay-drive{height:318px!important}.nxg-concept .nxg-overlay-metrics{height:154px!important}.nxg-concept .nxg-overlay-watch{height:258px!important}
  #nflView .nxg-concept .nxg-overlay-title{height:24px!important;box-sizing:border-box!important;margin:0 0 9px!important;padding:0 0 8px!important;border-bottom:1px solid rgba(70,155,255,.36)!important;color:#2d9fff!important;font:900 15px/1 'JetBrains Mono',monospace!important;letter-spacing:.045em!important;text-transform:uppercase!important;display:flex!important;align-items:center!important}
  #nflView .nxg-concept .nxg-overlay-scoring-row{display:flex!important;align-items:center!important;gap:14px!important}.nxg-concept .nxg-gauge-sm{width:76px!important;height:76px!important;flex:0 0 76px!important}.nxg-concept .nxg-gauge-sm::after{inset:9px!important}.nxg-concept .nxg-gauge-sm b{font:800 22px/1 'Oswald',sans-serif!important}.nxg-concept .nxg-overlay-copy strong{font:800 21px/1 'Oswald',sans-serif!important;color:#63e777!important}.nxg-concept .nxg-overlay-copy span{display:block!important;margin-top:6px!important;color:#d8e7fb!important;font:600 12px/1.4 'JetBrains Mono',monospace!important}
  #nflView .nxg-concept .nxg-overlay-meta{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:nowrap!important;color:#fff!important;font:800 12px/1 'JetBrains Mono',monospace!important;text-transform:uppercase!important}.nxg-concept .nxg-overlay-meta img,.nxg-concept .nxg-overlay-meta .ms-nfl-team-logo{width:22px!important;height:18px!important;object-fit:contain!important}
  #nflView .nxg-concept .nxg-overlay-plays{display:flex!important;flex-direction:column!important;gap:10px!important;margin-top:13px!important}.nxg-concept .nxg-overlay-play{display:grid!important;grid-template-columns:12px minmax(0,1fr)!important;gap:9px!important;align-items:start!important}.nxg-concept .nxg-overlay-play i{width:10px!important;height:10px!important;border-radius:50%!important;background:#44e493!important;box-shadow:0 0 0 2px rgba(68,228,147,.14)!important;margin-top:2px!important}.nxg-concept .nxg-overlay-play.current i{background:#dceaff!important}.nxg-concept .nxg-overlay-play small{display:block!important;color:#9ab6dc!important;font:600 10.5px/1.15 'JetBrains Mono',monospace!important;margin:0 0 2px!important}.nxg-concept .nxg-overlay-play span{display:block!important;color:white!important;font:600 12px/1.28 'JetBrains Mono',monospace!important;white-space:normal!important}
  #nflView .nxg-concept .nxg-overlay-metric-grid{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:0!important;height:87px!important}.nxg-concept .nxg-overlay-metric-grid>div{position:relative!important;text-align:center!important;padding:7px 6px!important;border-right:1px solid rgba(89,154,230,.25)!important}.nxg-concept .nxg-overlay-metric-grid>div:last-child{border-right:0!important}.nxg-concept .nxg-overlay-metric-grid b{display:block!important;color:#fff!important;font:800 29px/1 'Oswald',sans-serif!important}.nxg-concept .nxg-overlay-metric-grid span{display:block!important;margin-top:7px!important;color:#d7e5f7!important;font:800 10px/1.1 'JetBrains Mono',monospace!important;text-transform:uppercase!important}.nxg-concept .nxg-overlay-metric-grid small{display:block!important;margin-top:5px!important;color:#9dc4f4!important;font:700 9px/1 'JetBrains Mono',monospace!important}
  #nflView .nxg-concept .nxg-overlay-watch-list{display:flex!important;flex-direction:column!important;gap:0!important}.nxg-concept .nxg-overlay-watch-row{height:63px!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:52px minmax(0,1fr) 150px!important;gap:10px!important;align-items:center!important;padding:7px 0!important;border-bottom:1px solid rgba(85,154,230,.20)!important}.nxg-concept .nxg-overlay-watch-row:last-child{border-bottom:0!important}.nxg-concept .nxg-overlay-watch-avatar{width:49px!important;height:49px!important;border-radius:8px!important;border:1px solid rgba(63,150,255,.45)!important;background:#09234b!important;overflow:hidden!important}.nxg-concept .nxg-overlay-watch-avatar img{width:100%!important;height:100%!important;object-fit:cover!important}.nxg-concept .nxg-overlay-watch-copy{min-width:0!important}.nxg-concept .nxg-overlay-watch-copy b{display:block!important;color:#fff!important;font:700 17px/1 'Oswald',sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.nxg-concept .nxg-overlay-watch-copy small{display:block!important;margin-top:4px!important;color:#8caed8!important;font:700 10.5px/1 'JetBrains Mono',monospace!important}.nxg-concept .nxg-overlay-watch-stats{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:4px!important}.nxg-concept .nxg-overlay-watch-stats div{text-align:center!important}.nxg-concept .nxg-overlay-watch-stats b{display:block!important;color:#fff!important;font:800 20px/1 'Oswald',sans-serif!important}.nxg-concept .nxg-overlay-watch-stats span{display:block!important;margin-top:4px!important;color:#d2e0f3!important;font:700 9px/1 'JetBrains Mono',monospace!important;text-transform:uppercase!important}
  #nflView .nxg-concept .nxg-fieldlegend{position:absolute!important;left:50%!important;right:auto!important;bottom:22px!important;transform:translateX(-50%)!important;z-index:10!important;width:850px!important;height:42px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:27px!important;padding:0 18px!important;border:1px solid rgba(45,127,255,.45)!important;border-radius:10px!important;background:rgba(2,11,27,.88)!important;color:#edf5ff!important;font:700 10px/1 'JetBrains Mono',monospace!important}.nxg-concept .nxg-fieldlegend span{display:flex!important;align-items:center!important;gap:8px!important;white-space:nowrap!important}.nxg-concept .nxg-fieldlegend i.off,.nxg-concept .nxg-fieldlegend i.def{width:15px!important;height:15px!important;border-radius:50%!important}.nxg-concept .nxg-fieldlegend i.off{background:#168aff!important}.nxg-concept .nxg-fieldlegend i.def{background:#dbe7ff!important}.nxg-concept .nxg-fieldlegend i.los,.nxg-concept .nxg-fieldlegend i.fd,.nxg-concept .nxg-fieldlegend i.path{width:28px!important;height:0!important;border:0!important;border-top:4px solid #32a9ff!important;border-radius:0!important}.nxg-concept .nxg-fieldlegend i.fd{border-top-color:#ffe600!important}.nxg-concept .nxg-fieldlegend i.path{border-top:4px dashed #3ab8ff!important}
  #nflView .nxg-concept .nxg-footerline{display:none!important}

  /* Explicitly neutralize all old breakpoint reflow rules inside the concept. */
  @media(max-width:1180px){#nflView .nxg-concept .nxg-scorebar{grid-template-columns:500px 282px 500px 134px!important}#nflView .nxg-concept .nxg-weather{grid-column:auto!important;display:flex!important}#nflView .nxg-concept .nxg-overlay-stack{top:30px!important;width:430px!important}#nflView .nxg-concept .nxg-overlay-stack.left{left:18px!important}#nflView .nxg-concept .nxg-overlay-stack.right{right:18px!important}}
  @media(max-width:920px){#nflView .nxg-concept .nxg-score{font-size:68px!important}#nflView .nxg-concept .nxg-clock{font-size:42px!important}#nflView .nxg-concept .nxg-fieldshell-live{height:870px!important}#nflView .nxg-concept .nxg-fieldart-frame{inset:0!important}#nflView .nxg-concept .nxg-overlay-stack{top:30px!important;left:auto!important;right:auto!important;width:430px!important}#nflView .nxg-concept .nxg-overlay-stack.left{left:18px!important}#nflView .nxg-concept .nxg-overlay-stack.right{right:18px!important}}
  @media(max-width:760px){#nflView .nxg-concept .nxg-topbar{display:grid!important;grid-template-columns:448px minmax(0,1fr)!important}#nflView .nxg-concept .nxg-tabs{width:448px!important}#nflView .nxg-concept .nxg-tools{width:auto!important;overflow:visible!important}#nflView .nxg-concept .nxg-scorebar{grid-template-columns:500px 282px 500px 134px!important}#nflView .nxg-concept .nxg-teamblock,#nflView .nxg-concept .nxg-teamblock.home{grid-template-columns:110px minmax(0,1fr) 92px!important;text-align:left!important;padding:18px 20px!important}#nflView .nxg-concept .nxg-teamblock.home{grid-template-columns:92px minmax(0,1fr) 110px!important;text-align:right!important}#nflView .nxg-concept .nxg-teamlogo{width:104px!important;height:72px!important}#nflView .nxg-concept .nxg-teamcopy b{font-size:30px!important}#nflView .nxg-concept .nxg-score{font-size:68px!important}#nflView .nxg-concept .nxg-centerblock{border-left:1px solid rgba(45,127,255,.2)!important;border-right:1px solid rgba(45,127,255,.2)!important;border-top:0!important;border-bottom:0!important}#nflView .nxg-concept .nxg-weather{display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;justify-content:center!important}#nflView .nxg-concept .nxg-fieldshell-live{height:870px!important}#nflView .nxg-concept .nxg-fieldart-frame{inset:0!important}#nflView .nxg-concept .nxg-overlay-stack{left:auto!important;right:auto!important;bottom:auto!important;gap:12px!important;width:430px!important}#nflView .nxg-concept .nxg-overlay-stack.left{left:18px!important}#nflView .nxg-concept .nxg-overlay-stack.right{right:18px!important}#nflView .nxg-concept .nxg-overlay-metric-grid{grid-template-columns:repeat(4,1fr)!important}#nflView .nxg-concept .nxg-overlay-watch-row{grid-template-columns:52px minmax(0,1fr) 150px!important}#nflView .nxg-concept .nxg-overlay-watch-stats{grid-column:auto!important;grid-template-columns:repeat(3,1fr)!important}}
  

  /* v76 — same broadcast header/scoreboard across all three tabs. Detail
     content stays responsive and readable instead of inheriting legacy sizes. */
  #nflView .nxg-concept-head-viewport{position:relative;width:100%;min-width:0;overflow:hidden;background:#020a18}
  #nflView .nxg-concept-head-canvas{position:absolute;top:0;left:0;width:${NFL_GAMECAST_CANVAS_W}px;height:216px;transform-origin:0 0;background:#020a18;font-family:'JetBrains Mono','Space Mono',monospace;overflow:hidden}
  #nflView .nxg-concept-detail-body{background:#020a18;padding:16px 16px 32px;color:#dcecff;min-width:0}
  #nflView .nxg-concept-detail-body>.nxg-card{margin:0!important;padding:14px!important;background:#06142c!important;border:1px solid rgba(45,127,255,.34)!important;border-radius:14px!important;box-shadow:none!important}
  #nflView .nxg-concept-detail-body .nxg-pbp-list{display:flex!important;flex-direction:column!important;gap:8px!important}
  #nflView .nxg-concept-detail-body .nxg-pbp-item{display:grid!important;grid-template-columns:110px minmax(0,1fr) 110px!important;align-items:start!important;gap:14px!important;padding:12px 14px!important;border:1px solid rgba(75,139,215,.18)!important;border-radius:9px!important;background:rgba(7,25,53,.78)!important;color:#eaf3ff!important}
  #nflView .nxg-concept-detail-body .nxg-pbp-item>b{font:800 12px/1.25 'JetBrains Mono',monospace!important;color:#71b8ff!important;white-space:nowrap!important}
  #nflView .nxg-concept-detail-body .nxg-pbp-item>div:nth-child(2){min-width:0!important}
  #nflView .nxg-concept-detail-body .nxg-pbp-item>div:nth-child(2)>span{display:block!important;font:700 14px/1.4 'Oswald',sans-serif!important;color:#f6f9ff!important}
  #nflView .nxg-concept-detail-body .nxg-pbp-item>div:nth-child(2)>small{display:block!important;margin-top:5px!important;font:700 10px/1.3 'JetBrains Mono',monospace!important;color:#8faed2!important}
  #nflView .nxg-concept-detail-body .nxg-pbp-tag{justify-self:end!important;padding:6px 9px!important;border:1px solid rgba(45,127,255,.34)!important;border-radius:7px!important;background:#071a38!important;font:800 9px/1 'JetBrains Mono',monospace!important;color:#9ac9ff!important;white-space:nowrap!important}
  @media(max-width:680px){
    #nflView .nxg-concept-detail-body{padding:10px 8px 24px}
    #nflView .nxg-concept-detail-body .nxg-pbp-item{grid-template-columns:74px minmax(0,1fr)!important;gap:8px!important;padding:10px!important}
    #nflView .nxg-concept-detail-body .nxg-pbp-tag{grid-column:2!important;justify-self:start!important;margin-top:2px!important}
    #nflView .nxg-espn-box{grid-template-columns:1fr!important}
    #nflView .nxg-espn-table{font-size:12px!important}
    #nflView .nxg-espn-table td:first-child{font-size:13px!important}
  }

  /* v74 — ESPN-complete Box Score, presented in TSO styling. */
  #nflView .nxg-espn-box{padding:16px 0 28px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
  #nflView .nxg-espn-team{min-width:0;background:#06142c;border:1px solid rgba(45,127,255,.34);border-radius:14px;overflow:hidden}
  #nflView .nxg-espn-teamtop{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#0a2146,#071a38);border-bottom:1px solid rgba(45,127,255,.28)}
  #nflView .nxg-espn-teamtop img{width:30px;height:30px;object-fit:contain}
  #nflView .nxg-espn-teamtop b{font:800 16px/1.1 'Oswald',sans-serif;color:#f5f9ff;text-transform:uppercase;letter-spacing:.02em}
  #nflView .nxg-espn-teamtop span{margin-left:auto;font:700 11px/1 'JetBrains Mono',monospace;color:#80bcff}
  #nflView .nxg-espn-section{padding:0 12px 14px}
  #nflView .nxg-espn-section-title{display:flex;align-items:center;gap:7px;padding:14px 2px 7px;border-bottom:1px solid rgba(124,164,211,.28);font:800 12px/1 'JetBrains Mono',monospace;color:#eaf3ff;text-transform:uppercase;letter-spacing:.025em}
  #nflView .nxg-espn-section-title img{width:17px;height:17px;object-fit:contain}
  #nflView .nxg-espn-scroll{width:100%;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin}
  #nflView .nxg-espn-table{width:100%;min-width:480px;border-collapse:collapse;table-layout:auto;font:600 12px/1.25 'JetBrains Mono',monospace;color:#d9e8fa}
  #nflView .nxg-espn-table th{padding:7px 7px;text-align:right;color:#8eacd0;font-size:11px;font-weight:800;white-space:nowrap;border-bottom:1px solid rgba(124,164,211,.18)}
  #nflView .nxg-espn-table th:first-child{text-align:left;min-width:155px}
  #nflView .nxg-espn-table td{padding:7px 7px;text-align:right;white-space:nowrap;border-bottom:1px solid rgba(124,164,211,.11)}
  #nflView .nxg-espn-table td:first-child{text-align:left;font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;color:#f2f7ff}
  #nflView .nxg-espn-table tr.team-total td{font-weight:900;background:rgba(255,255,255,.025);color:#eef6ff}
  #nflView .nxg-espn-player-no{font-family:'JetBrains Mono',monospace;color:#7894b8;font-size:11px;margin-left:4px;font-weight:600}
  #nflView .nxg-espn-empty{grid-column:1/-1;padding:28px;border:1px solid rgba(45,127,255,.3);border-radius:14px;text-align:center;background:#06142c;color:#9eb8d6;font:700 12px/1.6 'JetBrains Mono',monospace}
  #nflView .nxg-espn-note{grid-column:1/-1;padding:0 4px;color:#6f8eb5;font:700 10px/1.5 'JetBrains Mono',monospace}
  @media(max-width:820px){#nflView .nxg-espn-box{grid-template-columns:1fr;gap:12px;padding-top:10px}#nflView .nxg-espn-table{min-width:520px}}
  /* v84 — clean-field Game Intel. Desktop uses a dock below the field; mobile uses a bottom sheet. */
  #nflView .nxg-intel-desktop-toggle{height:38px!important;box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;gap:8px!important;padding:0 14px!important;border-radius:9px!important;border:1px solid rgba(42,137,255,.52)!important;background:#031127!important;color:#8ecbff!important;font:800 10px/1 'JetBrains Mono',monospace!important;white-space:nowrap!important;cursor:pointer!important}
  #nflView .nxg-intel-desktop-toggle.is-open{background:linear-gradient(180deg,#1688ff,#0a64db)!important;color:#fff!important;border-color:#2d94ff!important}
  #nflView .nxg-intel-mobile-launch{display:none}
  #nflView .nxg-intel-dock{margin:12px 0 0;border:1px solid rgba(45,127,255,.38);border-radius:14px;background:linear-gradient(180deg,#07172f,#041024);box-shadow:0 14px 30px rgba(0,0,0,.24);overflow:hidden}
  #nflView .nxg-intel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(45,127,255,.18);background:rgba(8,27,58,.76)}
  #nflView .nxg-intel-title{display:flex;align-items:center;gap:8px;color:#dcecff;font:900 11px 'JetBrains Mono',monospace;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
  #nflView .nxg-intel-title i{width:8px;height:8px;border-radius:50%;background:#2d94ff;box-shadow:0 0 0 5px rgba(45,148,255,.11)}
  #nflView .nxg-intel-tabs{display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none}.nxg-intel-tabs::-webkit-scrollbar{display:none}
  #nflView .nxg-intel-tab{appearance:none;border:1px solid rgba(45,127,255,.26);background:#06152c;color:#91afd3;border-radius:8px;padding:7px 10px;font:800 9px 'JetBrains Mono',monospace;letter-spacing:.03em;text-transform:uppercase;cursor:pointer;white-space:nowrap}
  #nflView .nxg-intel-tab.active{background:rgba(45,127,255,.18);border-color:#2d7fff;color:#fff}
  #nflView .nxg-intel-close{appearance:none;width:32px;height:30px;border:1px solid rgba(45,127,255,.28);border-radius:8px;background:#06152c;color:#a8c7ee;cursor:pointer;font-size:16px;line-height:1}
  #nflView .nxg-intel-body{padding:12px}
  #nflView .nxg-intel-body .nxg-overlay-panel{width:100%;box-sizing:border-box;padding:14px 16px;border-radius:12px;background:linear-gradient(180deg,rgba(7,25,52,.92),rgba(5,17,37,.96));border:1px solid rgba(92,166,255,.18);box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
  #nflView .nxg-intel-team{display:grid;grid-template-columns:minmax(120px,.75fr) repeat(2,minmax(0,1fr));gap:1px;border:1px solid rgba(45,127,255,.18);border-radius:10px;overflow:hidden;background:rgba(45,127,255,.18)}
  #nflView .nxg-intel-team>div{background:#06152c;padding:9px 10px;min-width:0}.nxg-intel-team .label{color:#8ca9ce;font:800 9px 'JetBrains Mono',monospace;text-transform:uppercase}.nxg-intel-team .team{display:flex;align-items:center;gap:7px;color:#fff;font:900 10px 'JetBrains Mono',monospace}.nxg-intel-team .team img{width:24px;height:20px;object-fit:contain}.nxg-intel-team .value{text-align:center;color:#fff;font:900 14px 'JetBrains Mono',monospace}
  #nflView .nxg-intel-backdrop{display:none}

  @media(max-width:760px){
    #nflView .nxg-intel-desktop-toggle{display:none!important}
    #nflView .nxg-intel-mobile-launch{display:block;padding:10px 0 2px}
    #nflView .nxg-intel-mobile-launch button{width:100%;height:44px;border:1px solid rgba(45,127,255,.45);border-radius:11px;background:linear-gradient(180deg,#082247,#061830);color:#dcecff;font:900 11px 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
    #nflView .nxg-intel-backdrop{display:block;position:fixed;inset:0;z-index:2147482500;background:rgba(0,5,15,.56);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
    #nflView .nxg-intel-dock{position:fixed;left:0;right:0;bottom:0;z-index:2147482501;margin:0;border-radius:18px 18px 0 0;border-left:0;border-right:0;border-bottom:0;max-height:min(68vh,620px);overflow:hidden;box-shadow:0 -22px 46px rgba(0,0,0,.48)}
    #nflView .nxg-intel-head{position:sticky;top:0;z-index:2;flex-direction:column;align-items:stretch;padding:10px 12px 9px;background:#071a36}
    #nflView .nxg-intel-title{justify-content:space-between}.nxg-intel-title .nxg-intel-close{margin-left:auto}
    #nflView .nxg-intel-tabs{width:100%;gap:5px}.nxg-intel-tab{flex:1;min-width:max-content;text-align:center}
    #nflView .nxg-intel-body{max-height:calc(min(68vh,620px) - 94px);overflow:auto;padding:10px 10px max(18px,env(safe-area-inset-bottom))}
    #nflView .nxg-intel-body .nxg-overlay-panel{padding:12px}
    #nflView .nxg-overlay-scoring-row{align-items:center}.nxg-overlay-metric-grid{grid-template-columns:repeat(2,1fr)!important}
    #nflView .nxg-intel-team{grid-template-columns:96px repeat(2,minmax(0,1fr))}.nxg-intel-team>div{padding:8px 6px}.nxg-intel-team .team{font-size:9px}.nxg-intel-team .value{font-size:12px}
  }

  @media(max-width:640px){
    #nflView .nxg-concept .nxg-overlay-stack.left{transform:scale(1.28)!important;transform-origin:top left!important}
    #nflView .nxg-concept .nxg-overlay-stack.right{transform:scale(1.28)!important;transform-origin:top right!important}
  }

  /* v77 — crop NFL player headshots tighter so they match the MLB-style zoom. */
  #nflView .ms-avatar,
  #nflView .nfl-match-leader-avatar,
  #nflView .nfl-slate-player-head,
  #nflView .nxg-avatar,
  #nflView .nxg-overlay-watch-avatar{overflow:hidden!important}
  #nflView .ms-avatar img,
  #nflView .nfl-match-leader-avatar img,
  #nflView .nfl-slate-player-head img,
  #nflView .nxg-overlay-watch-avatar img,
  #nflView .nxg-watch .nxg-avatar img,
  #nflView .nxg-targetrow .nxg-avatar img,
  #nflView .nxg-profile .nxg-avatar:not(.nxg-team-avatar) img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center 18%!important;transform:scale(1.18)!important;transform-origin:center 24%!important}
  #nflView .ms-avatar.big img{transform:scale(1.22)!important;transform-origin:center 22%!important}
`;
  document.head.appendChild(style);
}
function fitNflGamecastConcept(root=document){
  _nflGamecastResizeObserver?.disconnect?.();
  _nflGamecastResizeObserver=null;
  const viewports=[...root.querySelectorAll?.('.nxg-concept-viewport,.nxg-concept-head-viewport')||[]];
  if(!viewports.length) return;
  const fit=()=>{
    for(const viewport of viewports){
      const canvas=viewport.querySelector('.nxg-concept-canvas,.nxg-concept-head-canvas');
      if(!canvas) continue;
      const height=canvas.classList.contains('nxg-concept-head-canvas')?216:NFL_GAMECAST_CANVAS_H;
      const available=Math.max(1,viewport.clientWidth||NFL_GAMECAST_CANVAS_W);
      const scale=Math.min(1,available/NFL_GAMECAST_CANVAS_W);
      const renderedW=NFL_GAMECAST_CANVAS_W*scale;
      canvas.style.transform=`scale(${scale})`;
      canvas.style.left=`${Math.max(0,(available-renderedW)/2)}px`;
      viewport.style.height=`${height*scale}px`;
    }
  };
  fit();
  if('ResizeObserver' in window){
    _nflGamecastResizeObserver=new ResizeObserver(fit);
    viewports.forEach(v=>_nflGamecastResizeObserver.observe(v));
  }else window.addEventListener('resize',fit,{once:true});
}

// v65 performance: build player lookup maps once per loaded slate instead of
// repeatedly filtering the entire player array for every matchup/card render.
let _playerIndexSource = null;
let _playersByGame = new Map();
let _playersByGameTeam = new Map();
function ensurePlayerIndexes(){
  const players=data().players||[];
  if(_playerIndexSource===players) return;
  _playerIndexSource=players;
  _playersByGame=new Map();
  _playersByGameTeam=new Map();
  for(const p of players){
    const gameId=String(p.gameId??'');
    if(gameId){
      if(!_playersByGame.has(gameId)) _playersByGame.set(gameId,[]);
      _playersByGame.get(gameId).push(p);
      const key=`${gameId}|${p.team||''}`;
      if(!_playersByGameTeam.has(key)) _playersByGameTeam.set(key,[]);
      _playersByGameTeam.get(key).push(p);
    }
  }
  for(const list of _playersByGame.values()) list.sort((a,b)=>(b.prob||0)-(a.prob||0));
  for(const list of _playersByGameTeam.values()) list.sort((a,b)=>(b.prob||0)-(a.prob||0));
}

const PROPS = {
  atd: 'Anytime TD',
  firstTd: 'First TD',
  rushYds: 'Rushing Yards',
  recYds: 'Receiving Yards',
  receptions: 'Receptions',
  passYds: 'Passing Yards',
  passTds: 'Passing TDs',
  completions: 'Completions',
  allPlayers: 'All Players',
};

const FALLBACK_GAMES = [
  {id:'ne-sea', away:{abbr:'NE',name:'Patriots'}, home:{abbr:'SEA',name:'Seahawks'}, time:'8:20 PM', venue:'Lumen Field', detail:'Week 1', score:null},
  {id:'sf-la', away:{abbr:'SF',name:'49ers'}, home:{abbr:'LA',name:'Rams'}, time:'8:35 PM', venue:'SoFi Stadium', detail:'Week 1', score:null},
  {id:'buf-mia', away:{abbr:'BUF',name:'Bills'}, home:{abbr:'MIA',name:'Dolphins'}, time:'1:00 PM', venue:'Hard Rock Stadium', detail:'Week 1', score:null},
  {id:'det-gb', away:{abbr:'DET',name:'Lions'}, home:{abbr:'GB',name:'Packers'}, time:'4:25 PM', venue:'Lambeau Field', detail:'Week 1', score:null},
];

const FALLBACK_PLAYERS = [
  {id:'jsn',name:'Jaxon Smith-Njigba',team:'SEA',pos:'WR',opp:'NE',edge:71,prob:.53,grade:'A',usage:77,rz:17,explosive:19,headshot:null},
  {id:'cmc',name:'Christian McCaffrey',team:'SF',pos:'RB',opp:'LA',edge:69,prob:.49,grade:'A',usage:82,rz:24,explosive:17,headshot:null},
  {id:'puka',name:'Puka Nacua',team:'LA',pos:'WR',opp:'SF',edge:66,prob:.44,grade:'A-',usage:84,rz:18,explosive:20,headshot:null},
  {id:'kyren',name:'Kyren Williams',team:'LA',pos:'RB',opp:'SF',edge:63,prob:.40,grade:'B+',usage:77,rz:25,explosive:12,headshot:null},
  {id:'kittle',name:'George Kittle',team:'SF',pos:'TE',opp:'LA',edge:61,prob:.37,grade:'B+',usage:68,rz:20,explosive:17,headshot:null},
  {id:'walker',name:'Kenneth Walker III',team:'SEA',pos:'RB',opp:'NE',edge:59,prob:.34,grade:'B',usage:70,rz:20,explosive:14,headshot:null},
];

function esc(s){ return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function finiteNumberOrNull(v){ if(v==null||v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null; }
function hash(str){ let x=2166136261; for(const c of String(str)){ x^=c.charCodeAt(0); x=Math.imul(x,16777619); } return Math.abs(x>>>0); }
function num(seed,min,max,dec=0){ const v=min+(hash(seed)%10000)/9999*(max-min); return dec?+v.toFixed(dec):Math.round(v); }
function initials(name){ return String(name).split(/\s+/).map(x=>x[0]).slice(0,2).join(''); }
function gradeFor(p){ return p>=.48?'A+':p>=.41?'A':p>=.35?'A-':p>=.29?'B+':p>=.23?'B':'C+'; }
function record(team){ return team?.records?.find?.(r=>r.type==='total')?.summary || '0-0'; }
function signalBadge(edge){ return edge>=60 ? `<span class="ms-nfl-badge signal"><img src="glossy_blue_tso_wireless_badge.png" alt="TSO Signal" title="TSO Signal · Edge ${edge}"></span>` : ''; }
function teamLogo(team,cls=''){ return team?.logo ? `<img class="ms-nfl-team-logo ${cls}" src="${esc(team.logo)}" alt="">` : `<span class="ms-team-token">${esc(team?.abbr||'?')}</span>`; }

function normNflTeam(t){ return ({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(t||'').toUpperCase()] || String(t||'').toUpperCase()); }
function researchNameKey(name){ return String(name||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function buildResearchIndexes(research){
  const byEspn=new Map(),byGsis=new Map(),byTeamName=new Map();
  for(const p of research?.players||[]){
    if(p.espnId) byEspn.set(String(p.espnId),p);
    if(p.gsisId) byGsis.set(String(p.gsisId),p);
    byTeamName.set(`${normNflTeam(p.team)}|${researchNameKey(p.name)}`,p);
  }
  return {byEspn,byGsis,byTeamName};
}
function matchResearchPlayer(idx,p){
  return (p?.espnId&&idx.byEspn.get(String(p.espnId))) || (p?.gsisId&&idx.byGsis.get(String(p.gsisId))) || idx.byTeamName.get(`${normNflTeam(p?.team)}|${researchNameKey(p?.name)}`) || null;
}
function researchFreshnessLabel(){
  const r=state.research; if(!r?.generatedAt) return 'Research feed pending';
  const ms=Date.now()-new Date(r.generatedAt).getTime(); if(!Number.isFinite(ms)) return 'Research feed loaded';
  const mins=Math.max(0,Math.round(ms/60000)); if(mins<60) return `Research updated ${mins}m ago`;
  const hrs=Math.round(mins/60); return `Research updated ${hrs}h ago`;
}


function nflKickoffDateLabel(utc){
  if(!utc) return '';
  const d=new Date(utc); if(!Number.isFinite(d.getTime())) return '';
  // Viewer-local by design. A Central user sees Wednesday, 9/9 while a user
  // elsewhere sees the date that kickoff actually falls on in their own zone.
  try{return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'numeric',day:'numeric'}).format(d);}catch{return d.toLocaleDateString([],{weekday:'long',month:'numeric',day:'numeric'});}
}
function nflKickoffTimeLabel(utc){
  if(!utc) return 'TBD';
  const d=new Date(utc); if(!Number.isFinite(d.getTime())) return 'TBD';
  try{
    const parts=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).formatToParts(d);
    const time=parts.filter(x=>x.type==='hour'||x.type==='minute'||x.type==='dayPeriod').map((x,i,a)=>x.type==='minute'?`:${x.value}`:x.type==='dayPeriod'?` ${x.value}`:x.value).join('');
    const zone=parts.find(x=>x.type==='timeZoneName')?.value||'';
    return `${time}${zone?` ${zone}`:''}`.trim();
  }catch{return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
}
function nflOfficialSlateDate(utc){
  if(!utc) return null;
  const d=new Date(utc); if(!Number.isFinite(d.getTime())) return null;
  try{
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }catch{return d.toISOString().slice(0,10);}
}
function broadcastLabel(g){
  const x=String(g?.broadcast||'').trim();
  return x && x!=='NFL' ? x : 'Broadcast TBD';
}
function priceFmt(v){ if(v==null||v==='') return '—'; const n=Number(v); return Number.isFinite(n)?(n>0?`+${Math.round(n)}`:`${Math.round(n)}`):'—'; }
function americanOdds(v){
  const n=Number(v); if(!Number.isFinite(n)) return null;
  // /odds is requested in American format in v81, but normalize legacy cached
  // decimal values too so a stale 2.65 never renders as "+3".
  if(Math.abs(n)>=100 || n<=-100) return Math.round(n);
  if(n>1 && n<100) return Math.round(n>=2 ? (n-1)*100 : -100/(n-1));
  return Math.round(n);
}
function gamePriceFmt(v){ const n=americanOdds(v); return n==null?'—':(n>0?`+${n}`:`${n}`); }
function fmtLine(v){ const n=Number(v); return Number.isFinite(n)?(Number.isInteger(n)?String(n):n.toFixed(1)):'—'; }
function compactBook(name){
  const x=String(name||'').trim();
  const map={FanDuel:'FD',DraftKings:'DK','BetMGM':'MGM',Caesars:'CZR','ESPN BET':'ESPN BET','bet365':'bet365'};
  return map[x]||x||'Book';
}
function nflOddsPair(a,b){ return [normNflTeam(a),normNflTeam(b)].sort().join('|'); }
function buildPreviewOddsIndex(doc){
  const games=new Map(),players=new Map();
  if(doc?.meta?.sample===true) return {games,players};
  for(const g of doc?.games||[]){
    const pair=nflOddsPair(g.away,g.home); games.set(pair,g);
    for(const p of g.players||[]) players.set(`${pair}|${researchNameKey(p.name)}`,{game:g,player:p});
  }
  return {games,players};
}

function buildPreviewSimIndex(doc){
  const games=new Map(),players=new Map();
  for(const result of doc?.games||[]){
    const gameId=String(result?.game?.gameId||'');
    if(!gameId) continue;
    games.set(gameId,result);
    for(const p of result?.players||[]){
      players.set(`${gameId}|${normNflTeam(p.team)}|${researchNameKey(p.name)}`,p);
    }
  }
  return {games,players};
}
function matchPreviewSimPlayer(idx,gameId,p){
  return idx?.players?.get(`${String(gameId)}|${normNflTeam(p?.team)}|${researchNameKey(p?.name)}`)||null;
}
function simBlendWeights(){
  const b=state.sim?.meta?.probabilityBlend||{};
  let sim=Number(b.simulationWeight),model=Number(b.existingModelWeight);
  if(!Number.isFinite(sim)) sim=.70;
  if(!Number.isFinite(model)) model=.30;
  const total=Math.max(.0001,sim+model);
  return {sim:sim/total,model:model/total,lineTolerance:Number.isFinite(Number(b.lineTolerance))?Number(b.lineTolerance):.01};
}
function blendModelSimulation(modelProb,simProb){
  // IMPORTANT: Number(null) === 0. A pending simulation is missing data, NOT a
  // zero-percent result. Keep the research/model probability at full strength
  // until a real simulation probability exists.
  const m=finiteNumberOrNull(modelProb),sp=finiteNumberOrNull(simProb);
  if(sp==null) return clamp(m!=null?m:.5,0,1);
  if(m==null) return clamp(sp,0,1);
  const w=simBlendWeights();
  return clamp(sp*w.sim+m*w.model,0,1);
}
function simulationFreshnessLabel(){
  const iso=state.sim?.generatedAt; if(!iso) return 'Simulation pending';
  const mins=Math.max(0,Math.round((Date.now()-Date.parse(iso))/60000));
  const age=mins<60?`${mins}m ago`:`${Math.round(mins/60)}h ago`;
  return `Auto simulation updated ${age}`;
}
function simulationProjection(p,prop){
  const key={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions'}[prop];
  const v=Number(p?.sim?.distributions?.[key]?.mean);
  return Number.isFinite(v)?v:null;
}
function simulationOverProbability(p,prop,line){
  const slot=p?.sim?.sportsbook?.over?.[prop];
  if(!slot) return null;
  const simLine=Number(slot.line), currentLine=Number(line), prob=Number(slot.probability);
  if(!Number.isFinite(prob)||!Number.isFinite(simLine)||!Number.isFinite(currentLine)) return null;
  const tol=simBlendWeights().lineTolerance;
  return Math.abs(simLine-currentLine)<=tol?clamp(prob,0,1):null;
}
const NFL_SPORTSBOOKS=/^(bovada|caesars|draftkings|fanduel|fanatics|fliff|hard rock(?: bet)?|parx(?: casino)?|bet365|betmgm|espn bet|pinnacle|betrivers|pmu|unibet|sportsbet|rushbet)$/i;
function isSportsbookOffer(o){ return !!o && NFL_SPORTSBOOKS.test(String(o.book||'').trim()); }
function bestByAmerican(list){
  return [...(list||[])].filter(isSportsbookOffer).filter(x=>Number.isFinite(Number(x.price))).sort((a,b)=>Number(b.price)-Number(a.price))[0]||null;
}
function bestPlayerOffer(p,prop){
  const slot=p?.odds?.[prop]; if(!slot) return null;
  if(prop==='atd'||prop==='firstTd'){
    const best=bestByAmerican(slot.all) || (isSportsbookOffer(slot.best)?slot.best:null);
    return best?{...best,line:.5}:null;
  }
  const best=bestByAmerican(slot.over?.all) || (isSportsbookOffer(slot.over?.best)?slot.over.best:null);
  return best?{...best,line:Number(slot.line)}:null;
}
function pointWagerLegForAtd(p){
  const g=playerGame(p), offer=bestPlayerOffer(p,'atd');
  const playerId=Number(p?.espnId); const gamePk=Number(g?.id);
  if(!p||!g||!playerId||!gamePk||!Number.isFinite(Number(p.prob))) return null;
  const line=.5, pct=Number((Number(p.prob)*100).toFixed(1));
  return {id:`${p.name}|ATD|0.5`,kind:'prop',sport:'nfl',prop_key:'atd',side:'over',player:p.name,player_name:p.name,market:'ATD',line,pct,grade:p.grade||gradeFor(p.prob),game:`${g.away.abbr} @ ${g.home.abbr}`,game_pk:gamePk,event_id:g.fixtureId||null,player_id:playerId,price:offer?.price??null,book:offer?.book??null,link:offer?.link??null,slate_date:nflOfficialSlateDate(g.startTimeUTC)};
}
function slipHasLeg(id){
  try{return (JSON.parse(localStorage.getItem('dw_betslip')||'[]')||[]).some(l=>l?.id===id);}catch{return false;}
}
function atdWagerButtonHTML(p,label='Add ATD to Slip'){
  const leg=pointWagerLegForAtd(p); if(!leg) return '';
  const on=slipHasLeg(leg.id);
  return `<button type="button" class="add-leg nfl-atd-wager-btn ${on?'in-slip':''}" data-legid="${esc(leg.id)}" data-leg="${encodeURIComponent(JSON.stringify(leg))}" data-cta-label="${esc(label)}">${on?'✓ In Slip':esc(label)}</button>`;
}
function oddsChipHTML(p,prop='atd',label=null){
  const o=bestPlayerOffer(p,prop); if(!o) return '';
  const prefix=label || (prop==='atd'?'ATD':prop==='firstTd'?'1st TD':PROPS[prop]||prop);
  const line=(prop==='atd'||prop==='firstTd')?'':` O ${fmtLine(o.line)}`;
  return `<span class="nfl-odds-chip"><b>${esc(prefix)}${line}</b><strong>${priceFmt(o.price)}</strong><small>${esc(compactBook(o.book))}</small></span>`;
}
function gameLineSummary(g){
  const gl=g?.gameLines; if(!gl) return '';
  const parts=[];
  const sp=Number(gl.spread?.line); if(Number.isFinite(sp)) parts.push(`${esc(g.home.abbr)} ${sp>0?'+':''}${fmtLine(sp)}`);
  const total=Number(gl.total?.line); if(Number.isFinite(total)) parts.push(`O/U ${fmtLine(total)}`);
  const awayMl=gl.moneyline?.away?.price,homeMl=gl.moneyline?.home?.price;
  if(Number.isFinite(Number(awayMl))&&Number.isFinite(Number(homeMl))) parts.push(`ML ${esc(g.away.abbr)} ${gamePriceFmt(awayMl)} · ${esc(g.home.abbr)} ${gamePriceFmt(homeMl)}`);
  return parts.join(' · ');
}
function signedLine(v){ const n=Number(v); return Number.isFinite(n)?`${n>0?'+':''}${fmtLine(n)}`:'—'; }
function gameOddsCell(main,price,sub=''){
  return `<div class="nfl-game-odds-cell"><b>${esc(main||'—')}</b>${price!=null?`<span>${gamePriceFmt(price)}</span>`:''}${sub?`<small>${esc(sub)}</small>`:''}</div>`;
}
function gameOddsPanelHTML(g){
  const gl=g?.gameLines;
  if(!gl) return `<div class="nfl-env-tile nfl-game-odds-tile"><div class="nfl-game-odds-title"><span>Game Odds</span><small>Sportsbook lines pending</small></div><div class="nfl-game-odds-empty">Odds will appear automatically when posted.</div></div>`;
  const awaySpread=gl.spread?.away, homeSpread=gl.spread?.home, over=gl.total?.over, under=gl.total?.under;
  const awayMl=gl.moneyline?.away, homeMl=gl.moneyline?.home;
  const total=Number(gl.total?.line);
  const awaySp=Number.isFinite(Number(awaySpread?.point))?awaySpread.point:(Number.isFinite(Number(gl.spread?.line))?-Number(gl.spread.line):null);
  const homeSp=Number.isFinite(Number(homeSpread?.point))?homeSpread.point:gl.spread?.line;
  return `<div class="nfl-env-tile nfl-game-odds-tile"><div class="nfl-game-odds-title"><span>Game Odds</span><small>Best available</small></div><div class="nfl-game-odds-grid"><div></div><em>Spread</em><em>Total</em><em>ML</em><strong>${esc(g.away.abbr)}</strong>${gameOddsCell(signedLine(awaySp),awaySpread?.price)}${gameOddsCell(Number.isFinite(total)?`O ${fmtLine(total)}`:'—',over?.price)}${gameOddsCell(gamePriceFmt(awayMl?.price),null)}<strong>${esc(g.home.abbr)}</strong>${gameOddsCell(signedLine(homeSp),homeSpread?.price)}${gameOddsCell(Number.isFinite(total)?`U ${fmtLine(total)}`:'—',under?.price)}${gameOddsCell(gamePriceFmt(homeMl?.price),null)}</div></div>`;
}

const NFL_RING_C=326.7;
function nflGradeColor(g){ const u=String(g||'').toUpperCase(); return u.startsWith('A')?'#22c55e':u.startsWith('B')?'#f4c430':u.startsWith('C')?'#ff9f43':'#8b95a8'; }
function nflGradeRingHTML(probability,grade,size='md'){
  const raw=Number(probability), pct=clamp((Number.isFinite(raw)?raw:0)*100,0,100), off=(NFL_RING_C*(1-pct/100)).toFixed(1);
  const disp=pct<10?pct.toFixed(1):Math.round(pct);
  return `<span class="sgr sgr-pct nfl-grade-ring nfl-grade-ring-${size}" style="color:${nflGradeColor(grade)}"><svg viewBox="0 0 120 120" class="sgr-svg" aria-hidden="true"><circle class="sgr-rt" cx="60" cy="60" r="52"/><circle class="sgr-rf" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" stroke-dasharray="${NFL_RING_C}" stroke-dashoffset="${off}"/></svg><span class="sgr-l"><b class="sgr-gd2">${esc(grade)}</b><span class="sgr-pv">${disp}%</span></span></span>`;
}
function gradeForLean(p){ return p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C'; }
function playerGame(p){ return data().games.find(g=>String(g.id)===String(p?.gameId))||null; }
function researchRows(p){ const r=p?.research; return Array.isArray(r?.gameLog)&&r.gameLog.length?r.gameLog:(r?.last5?.gamesLog||[]); }
function propGameStat(g,key){
  if(key==='rushYds') return Number(g?.rushYds)||0;
  if(key==='recYds') return Number(g?.recYds)||0;
  if(key==='receptions') return Number(g?.receptions)||0;
  if(key==='passYds') return Number(g?.passYds)||0;
  if(key==='passTds') return Number(g?.passTds)||0;
  if(key==='completions') return Number(g?.completions)||0;
  return Number(g?.tds)||0;
}
function researchRecentAvg(p,key){
  const a=p?.research?.last5?.avg||{};
  const direct={rushYds:a.rushYds,recYds:a.recYds,receptions:a.receptions,passYds:a.passYds,passTds:a.passTds,completions:a.completions}[key];
  if(Number.isFinite(Number(direct))) return Number(direct);
  const rows=researchRows(p).slice(0,5); if(!rows.length) return 0;
  return rows.reduce((sum,g)=>sum+propGameStat(g,key),0)/rows.length;
}
function researchSeasonAvg(p,key){
  const s=p?.research?.previousSeason||{}, pg=s.perGame||{}, games=Math.max(1,Number(s.games)||1);
  const direct={rushYds:pg.rushYds,recYds:pg.recYds,receptions:pg.receptions,passYds:pg.passYds,passTds:pg.passTds,completions:pg.completions}[key];
  if(Number.isFinite(Number(direct))) return Number(direct);
  const totals={rushYds:s.rushYds,recYds:s.recYds,receptions:s.receptions,passYds:s.passYds,passTds:s.passTds,completions:s.completions};
  return Number.isFinite(Number(totals[key]))?Number(totals[key])/games:0;
}
function researchDefenseAvg(p,key){
  const pg=p?.research?.matchup?.previousSeasonAllowed?.perGame||{};
  const v={rushYds:pg.rushYds,recYds:pg.recYds,receptions:pg.receptions,passYds:pg.passYds,passTds:pg.passTds??pg.tds,completions:pg.completions}[key];
  return Number.isFinite(Number(v))?Number(v):0;
}
function researchProjection(p,key){
  const recent=researchRecentAvg(p,key),season=researchSeasonAvg(p,key);
  if(recent>0&&season>0) return +(recent*.65+season*.35).toFixed(1);
  return +(recent||season||0).toFixed(1);
}
function propLeanProbability(key,projection,line){
  if(!Number.isFinite(Number(line))) return .5;
  const scale=key==='receptions'?1.6:key==='passTds'?0.7:key==='completions'?3.5:Math.max(7,Math.abs(Number(line))*.16);
  return clamp(.5+((Number(projection)-Number(line))/Math.max(.5,scale))*.15,.25,.75);
}
function oddsFreshnessLabel(){
  const iso=state.odds?.meta?.fetchedAt; if(!iso) return 'Sportsbook odds pending';
  const mins=Math.max(0,Math.round((Date.now()-Date.parse(iso))/60000));
  return mins<60?`Sportsbook odds updated ${mins}m ago`:`Sportsbook odds updated ${Math.round(mins/60)}h ago`;
}

function ensureNflLaunchStyles(){
  if(document.getElementById('nfl-launch-ui-v83')) return;
  const style=document.createElement('style'); style.id='nfl-launch-ui-v83';
  style.textContent=`
  #nflView .nfl-match-date{display:block;margin:4px 0 2px;color:#8fb7e8;font:800 8px 'JetBrains Mono',monospace;letter-spacing:.055em;text-transform:uppercase}
  #nflView .nfl-game-lines{display:block;margin-top:5px;color:#fbbf24;font:800 8px 'JetBrains Mono',monospace;white-space:normal}
  #nflView .nfl-odds-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:3px 6px;border:1px solid rgba(34,197,94,.24);border-radius:6px;background:rgba(8,68,43,.18);font:800 7px 'JetBrains Mono',monospace;white-space:nowrap;color:#b8c9df}
  #nflView .nfl-odds-chip b{color:#67e8a5}#nflView .nfl-odds-chip strong{color:#fff;font-size:8px}#nflView .nfl-odds-chip small{color:#86a2c5;font-size:7px}
  #nflView .nfl-leader-odds{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}#nflView .nfl-slate-odds{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}
  #nflView .nfl-atd-wager-btn{height:23px!important;width:auto!important;padding:0 8px!important;border:1px solid rgba(45,127,255,.48)!important;border-radius:6px!important;background:rgba(45,127,255,.10)!important;color:#a8d5ff!important;font:900 7px 'JetBrains Mono',monospace!important;white-space:nowrap!important;cursor:pointer!important}
  #nflView .nfl-atd-wager-btn:hover{border-color:#2d7fff!important;background:rgba(45,127,255,.20)!important;color:#fff!important}#nflView .nfl-atd-wager-btn.in-slip{background:#22c55e!important;border-color:#22c55e!important;color:#061423!important}
  #nflView .nfl-match-broadcast{display:block;margin-top:3px;color:#d9e9ff;font:800 8px 'JetBrains Mono',monospace;letter-spacing:.035em}
  #nflView .nfl-game-odds-tile{padding:9px 10px!important;justify-content:flex-start!important;overflow:hidden}
  #nflView .nfl-game-odds-title{display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:6px}#nflView .nfl-game-odds-title>span{color:#8fa5c4;font:900 7px 'JetBrains Mono',monospace;letter-spacing:.07em;text-transform:uppercase}#nflView .nfl-game-odds-title small{color:#5f7da6;font:700 6px 'JetBrains Mono',monospace}
  #nflView .nfl-game-odds-grid{width:100%;display:grid;grid-template-columns:25px repeat(3,minmax(0,1fr));gap:4px;align-items:stretch}#nflView .nfl-game-odds-grid>em{font:900 6px 'JetBrains Mono',monospace;color:#7895ba;text-align:center;text-transform:uppercase;font-style:normal;align-self:end}#nflView .nfl-game-odds-grid>strong{display:flex;align-items:center;color:#d7e9ff;font:900 7px 'JetBrains Mono',monospace}
  #nflView .nfl-game-odds-cell{min-width:0;min-height:30px;padding:3px 2px;border:1px solid rgba(45,127,255,.20);border-radius:6px;background:linear-gradient(180deg,rgba(12,38,76,.88),rgba(7,24,51,.92));display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}#nflView .nfl-game-odds-cell b{color:#55a8ff!important;font:900 9px 'JetBrains Mono',monospace!important}#nflView .nfl-game-odds-cell span{margin-top:2px;color:#d8e6f7;font:800 6px 'JetBrains Mono',monospace}#nflView .nfl-game-odds-cell small{margin-top:1px;color:#7791b1;font:700 5px 'JetBrains Mono',monospace}#nflView .nfl-game-odds-empty{color:#7895ba;font:700 7px 'JetBrains Mono',monospace}

  #nflView .nfl-grade-ring{position:relative;display:inline-grid;place-items:center;flex:0 0 auto}
  #nflView .nfl-grade-ring-sm{width:48px;height:48px}#nflView .nfl-grade-ring-md{width:62px;height:62px}#nflView .nfl-grade-ring-lg{width:76px;height:76px}
  #nflView .nfl-grade-ring .sgr-svg{position:absolute;inset:0;width:100%;height:100%}
  #nflView .nfl-grade-ring .sgr-rt{fill:none;stroke:rgba(116,145,183,.22);stroke-width:8}
  #nflView .nfl-grade-ring .sgr-rf{fill:none;stroke:currentColor;stroke-width:8;stroke-linecap:round}
  #nflView .nfl-grade-ring .sgr-l{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
  #nflView .nfl-grade-ring .sgr-gd2{font:800 13px 'Oswald',sans-serif;color:#fff}#nflView .nfl-grade-ring .sgr-pv{margin-top:2px;font:800 7px 'JetBrains Mono',monospace;color:currentColor}
  #nflView .nfl-grade-ring-sm .sgr-gd2{font-size:12px}#nflView .nfl-grade-ring-sm .sgr-pv{font-size:6px}
  #nflView .nfl-slate-player-stat.grade{display:grid!important;place-items:center!important;min-width:54px;background:none!important;border:0!important;box-shadow:none!important;padding:0!important}
  #nflView .nfl-slate-player-stat.grade::before,#nflView .nfl-slate-player-stat.grade::after{display:none!important;content:none!important}
  #nflView .nfl-slate-player-stat.grade .nfl-grade-ring .sgr-gd2{width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;padding:0!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;display:block!important}
  #nflView .nfl-slate-player-stat.grade .nfl-grade-ring,#nflView .nfl-slate-player-stat.grade .nfl-grade-ring .sgr-l{border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important}
  #nflView .nfl-slate-player-stat.grade .nfl-grade-ring::before,#nflView .nfl-slate-player-stat.grade .nfl-grade-ring::after,#nflView .nfl-slate-player-stat.grade .sgr-l::before,#nflView .nfl-slate-player-stat.grade .sgr-l::after,#nflView .nfl-slate-player-stat.grade .sgr-gd2::before,#nflView .nfl-slate-player-stat.grade .sgr-gd2::after{display:none!important;content:none!important}
  #nflView .nfl-slate-player-stat.edge{display:grid!important;place-items:center!important;text-align:center!important}#nflView .nfl-slate-player-stat.edge b{display:block!important;width:100%!important;text-align:center!important;margin:0!important}

  /* v82 — v81 added a fourth content lane (sportsbook odds + ATD wager) to a
     Slate player row that was still hard-coded for three 20/17/20px rows.
     Let the identity lane size itself so odds never overlap the next player. */
  #nflView .nfl-match-threats{align-items:start!important}
  #nflView .nfl-team-board{min-width:0!important;overflow:hidden!important}
  #nflView .nfl-team-board .nfl-slate-player{display:grid!important;grid-template-columns:50px minmax(0,1fr) 58px 64px!important;gap:8px!important;width:100%!important;box-sizing:border-box!important;min-height:96px!important;align-items:center!important;cursor:pointer!important}
  #nflView .nfl-team-board .nfl-slate-player>*{min-width:0!important}
  #nflView .nfl-slate-player{min-height:96px!important;align-items:center!important}
  #nflView .nfl-slate-player-main{display:flex!important;flex-direction:column!important;justify-content:center!important;align-self:stretch!important;gap:3px!important;min-width:0!important;min-height:80px!important;padding:6px 0!important}
  #nflView .nfl-slate-player-name{height:auto!important;min-height:18px!important}
  #nflView .nfl-slate-player-meta{line-height:1.25!important;min-height:14px!important}
  #nflView .nfl-slate-badges{height:auto!important;min-height:18px!important;overflow:visible!important;flex-wrap:wrap!important;row-gap:3px!important}
  #nflView .nfl-slate-odds{margin-top:1px!important;min-height:23px!important;align-items:center!important;row-gap:3px!important}
  #nflView .nfl-slate-player-stat.grade,#nflView .nfl-slate-player-stat.edge{align-self:center!important}
  #nflView .nfl-slate-wager,#nflView .nfl-atd-wager-btn{flex:0 0 auto!important}

  #nflView .nfl-mlb-prop-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px;border:1px solid rgba(45,127,255,.20);border-radius:10px;background:linear-gradient(180deg,rgba(8,31,67,.72),rgba(4,18,40,.70))}
  #nflView .nfl-mlb-prop-tabs{display:flex;gap:5px;flex-wrap:wrap;min-width:0}
  #nflView .nfl-mlb-prop-tab{padding:7px 10px;border:1px solid rgba(88,153,236,.24);border-radius:7px;background:#071933;color:#9bb8da;font:900 8px 'JetBrains Mono',monospace;text-transform:uppercase;cursor:pointer}
  #nflView .nfl-mlb-prop-tab.active{border-color:#2d7fff;background:linear-gradient(180deg,#1788ff,#0b63d6);color:#fff;box-shadow:0 0 18px rgba(45,127,255,.16)}
  #nflView .nfl-mlb-prop-fresh{font:800 8px 'JetBrains Mono',monospace;color:#7e9fc6;white-space:nowrap}
  #nflView .nfl-mlb-prop-fresh b{color:#62dda0}
  #nflView .nfl-mlb-prop-market-control{display:flex;align-items:center;gap:8px;min-width:260px}#nflView .nfl-mlb-prop-market-control>span{font:900 7px 'JetBrains Mono',monospace;color:#7896ba;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
  #nflView .nfl-mlb-prop-list{display:flex;flex-direction:column;gap:8px}
  #nflView .nfl-mlb-prop-card{width:100%;display:grid;grid-template-columns:34px 68px minmax(0,1fr) minmax(230px,.42fr) 82px;gap:12px;align-items:center;padding:10px 12px;border:1px solid rgba(89,144,213,.17);border-radius:11px;background:linear-gradient(180deg,rgba(6,25,55,.96),rgba(4,18,40,.96));color:#fff;text-align:left;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.08);transition:border-color .15s,transform .15s}
  #nflView .nfl-mlb-prop-card:hover{border-color:rgba(45,127,255,.48);transform:translateY(-1px)}
  #nflView .nfl-mlb-prop-rank{font:900 18px 'Oswald',sans-serif;color:#6282aa;text-align:center}#nflView .nfl-mlb-prop-card:nth-child(1) .nfl-mlb-prop-rank{color:#fbbf24}#nflView .nfl-mlb-prop-card:nth-child(2) .nfl-mlb-prop-rank{color:#d8e2ee}#nflView .nfl-mlb-prop-card:nth-child(3) .nfl-mlb-prop-rank{color:#d49164}
  #nflView .nfl-mlb-prop-avatar{width:64px;height:64px;border:1px solid rgba(77,145,230,.42);border-radius:10px;overflow:hidden;background:#071b39;display:grid;place-items:center}#nflView .nfl-mlb-prop-avatar img{width:100%;height:100%;object-fit:cover;object-position:center 18%;transform:scale(1.18);transform-origin:center 24%}
  #nflView .nfl-mlb-prop-main{min-width:0}#nflView .nfl-mlb-prop-name{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}#nflView .nfl-mlb-prop-name b{font:700 17px 'Oswald',sans-serif;color:#fff}#nflView .nfl-mlb-prop-name span{font:800 8px 'JetBrains Mono',monospace;color:#7f9cc0}
  #nflView .nfl-mlb-prop-match{margin-top:3px;font:700 8px 'JetBrains Mono',monospace;color:#9cb4d2}#nflView .nfl-mlb-prop-badges{margin-top:5px}#nflView .nfl-mlb-prop-main .ms-nfl-badges{margin:0}
  #nflView .nfl-mlb-prop-detail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}#nflView .nfl-mlb-prop-detail>span{padding:5px 6px;border:1px solid rgba(93,145,210,.14);border-radius:6px;background:rgba(5,20,43,.56);font:700 7px 'JetBrains Mono',monospace;color:#7898be}#nflView .nfl-mlb-prop-detail b{display:block;margin-top:2px;color:#dce9fa;font-size:8px}
  #nflView .nfl-mlb-prop-market{min-width:0;padding:8px 10px;border-left:1px solid rgba(89,144,213,.14)}#nflView .nfl-mlb-prop-market>span{display:block;font:900 7px 'JetBrains Mono',monospace;color:#6596ce;text-transform:uppercase}#nflView .nfl-mlb-prop-market>strong{display:block;margin-top:4px;font:800 18px 'Oswald',sans-serif;color:#fff}#nflView .nfl-mlb-prop-market>small{display:block;margin-top:3px;color:#8aa6c7;font:700 8px 'JetBrains Mono',monospace;line-height:1.35}
  #nflView .nfl-mlb-prop-odds{display:inline-flex;align-items:center;gap:6px;margin-top:7px;padding:5px 7px;border:1px solid rgba(34,197,94,.28);border-radius:6px;background:rgba(6,68,42,.18);font:900 8px 'JetBrains Mono',monospace;color:#67e8a5}#nflView .nfl-mlb-prop-odds b{font-size:11px;color:#fff}#nflView .nfl-mlb-prop-odds em{font-style:normal;color:#9eb6d2}
  #nflView .nfl-mlb-prop-grade{display:flex;flex-direction:column;align-items:center;gap:3px}#nflView .nfl-mlb-prop-grade>small{font:800 6px 'JetBrains Mono',monospace;color:#758faf;text-transform:uppercase;text-align:center}
  #nflView .nfl-td-odds{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}#nflView .nfl-td-odds .nfl-odds-chip{background:rgba(7,60,39,.28)}
  @media(max-width:900px){
    #nflView .nfl-match-threats{grid-template-columns:1fr!important}
  }
  @media(max-width:760px){
    #nflView .nfl-mlb-prop-toolbar{padding:8px}#nflView .nfl-mlb-prop-tab{padding:6px 7px;font-size:7px}
    #nflView .nfl-mlb-prop-card{grid-template-columns:24px 56px minmax(0,1fr) 66px;gap:8px;padding:8px}#nflView .nfl-mlb-prop-avatar{width:54px;height:54px}#nflView .nfl-mlb-prop-market{grid-column:3/5;grid-row:2;border-left:0;border-top:1px solid rgba(89,144,213,.14);padding:7px 0 0}#nflView .nfl-mlb-prop-grade{grid-column:4;grid-row:1}#nflView .nfl-grade-ring-lg{width:62px;height:62px}#nflView .nfl-mlb-prop-name b{font-size:15px}#nflView .nfl-mlb-prop-detail{grid-template-columns:repeat(2,minmax(0,1fr))}
    #nflView .nfl-match-date{font-size:7px}#nflView .nfl-odds-chip{font-size:6px;padding:3px 5px}#nflView .nfl-mlb-prop-market-control{min-width:0;width:100%}#nflView .nfl-mlb-prop-select-wrap{min-width:0;flex:1}
    #nflView .nfl-slate-player{min-height:100px!important}
    #nflView .nfl-slate-player-main{min-height:84px!important;padding:5px 0!important}
    #nflView .nfl-game-odds-grid{grid-template-columns:22px repeat(3,minmax(0,1fr))!important;gap:3px!important}
    #nflView .nfl-game-odds-cell{min-height:32px!important}
  }
  @media(max-width:430px){
    #nflView .nfl-team-board .nfl-slate-player{grid-template-columns:34px minmax(0,1fr) 46px 46px!important;gap:5px!important;padding-left:7px!important;padding-right:7px!important}
    #nflView .nfl-slate-player-head{width:32px!important;height:32px!important}
    #nflView .nfl-slate-odds{gap:3px!important}
    #nflView .nfl-atd-wager-btn{height:21px!important;padding:0 6px!important;font-size:6px!important}
  }
  `;
  document.head.appendChild(style);
}

async function loadData(){
  if(state.loaded) return;
  state.loaded = true;
  try{
    const r = await fetch('./slates/nfl.json',{cache:'no-cache'});
    if(!r.ok) throw new Error('NFL slate unavailable');
    const d = await r.json();
    let research=null,odds=null,sim=null,halftime=null;
    await Promise.all([
      (async()=>{try{const rr=await fetch('./slates/nfl-research.json',{cache:'no-cache'});if(rr.ok)research=await rr.json();}catch(_e){}})(),
      (async()=>{try{const or=await fetch('./slates/nfl-odds.json',{cache:'no-cache'});if(or.ok){const candidate=await or.json();if(candidate?.meta?.sample===false)odds=candidate;}}catch(_e){}})(),
      (async()=>{try{const sr=await fetch('./slates/nfl-sim.json',{cache:'no-cache'});if(sr.ok){const candidate=await sr.json();if(Array.isArray(candidate?.games)&&String(candidate?.engineVersion||'').startsWith('v86'))sim=candidate;}}catch(_e){}})(),
      (async()=>{try{const hr=await fetch('./slates/nfl-halftime.json',{cache:'no-cache'});if(hr.ok){const candidate=await hr.json();if(Array.isArray(candidate?.games))halftime=candidate;}}catch(_e){}})(),
    ]);
    state.research=research; state.odds=odds; state.sim=sim; state.halftime=halftime;
  
    const researchIdx=buildResearchIndexes(research);
    const oddsIdx=buildPreviewOddsIndex(odds);
    const simIdx=buildPreviewSimIndex(sim);
    const games=(d.games||[]).map(g=>({
      id:String(g.gameId),
      away:{...g.away,abbr:g.away?.abbr||'AWY',name:g.away?.shortName||g.away?.name||'Away',fullName:g.away?.name||g.away?.shortName||'Away'},
      home:{...g.home,abbr:g.home?.abbr||'HME',name:g.home?.shortName||g.home?.name||'Home',fullName:g.home?.name||g.home?.shortName||'Home'},
      time:g.startTimeUTC?new Date(g.startTimeUTC).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'TBD',
      venue:g.venue?.name||'NFL Stadium', city:g.venue?.city||'', detail:g.statusDetail||`Week ${d.week||1}`, status:g.status||'pre',
      broadcast:(g.broadcast||[]).flatMap(x=>x?.names||[]).filter(Boolean).join(', ') || 'NFL',
      startTimeUTC:g.startTimeUTC||null,
      liveScore:g.liveScore?{...g.liveScore}:null,
      gameLines:oddsIdx.games.get(nflOddsPair(g.away?.abbr,g.home?.abbr))?.gameLines||null,
      score:g.status==='pre'?null:`${g.away?.score||0} – ${g.home?.score||0}`,
    }));
    const players=[];
    for(const g of d.games||[]){
      for(const p of g.players||[]){
        const modelAtd=Number(p.props?.atd?.probability);
        if(!Number.isFinite(modelAtd)) continue;
        const simPlayer=matchPreviewSimPlayer(simIdx,String(g.gameId),p);
        const simAtd=finiteNumberOrNull(simPlayer?.probabilities?.atd);
        const atd=blendModelSimulation(modelAtd,simAtd);
        const inp=p.props?.atd?.inputs||{};
        const rzAllowed=Number(inp.oppRzTdRateAllowed);
        const oppFactor=Number(inp.oppRzDefFactor)||1;
        const snap=Number(p.stats?.snapShare);
        const rzOpp=(Number(p.stats?.rzTargets)||0)+(Number(p.stats?.rzCarries)||0);
        const edge=clamp(Math.round(50+(atd-.25)*35+(oppFactor-1)*42+(Number.isFinite(snap)?(snap-.65)*12:0)),30,78);
        const rp=matchResearchPlayer(researchIdx,p);
        players.push({
          id:p.gsisId||p.espnId||p.name, espnId:p.espnId||rp?.espnId||null, gsisId:p.gsisId||rp?.gsisId||null,
          name:p.name, team:normNflTeam(p.team), pos:p.position||rp?.position||'SKILL', opp:normNflTeam(p.opponent||rp?.opponent||''),
          edge, prob:atd, modelProb:modelAtd, simProb:Number.isFinite(simAtd)?simAtd:null, sim:simPlayer, simIterations:simIdx.games.get(String(g.gameId))?.iterations||null, grade:gradeFor(atd), headshot:p.headshot||rp?.headshot||null,
          usage:Number.isFinite(snap)?Math.round(snap*100):Math.round((Number(rp?.model?.snapShare)||0)*100)||num(p.name+'snap',58,88),
          rz:rzOpp||((Number(rp?.model?.rzTargets)||0)+(Number(rp?.model?.rzCarries)||0))||num(p.name+'rz',6,25), explosive:num(p.name+'exp',9,24),
          gamesPlayed:Number(p.stats?.gamesPlayed)||Number(rp?.previousSeason?.games)||17, tds:Number(p.stats?.tds)||Number(rp?.previousSeason?.totalTds)||0,
          oppRzAllowed:Number.isFinite(rzAllowed)?rzAllowed:null, gameId:String(g.gameId), depthRank:p.depthRank||rp?.depth?.rank||null,
          research:rp,
          odds:oddsIdx.players.get(`${nflOddsPair(p.team,p.opponent||rp?.opponent||'')}|${researchNameKey(p.name)}`)?.player?.odds||null,
        });
      }
    }
    players.sort((a,b)=>b.prob-a.prob);
    state.data={games:games.length?games:FALLBACK_GAMES,players:players.length?players:FALLBACK_PLAYERS,week:d.week||1,generatedAt:d.generatedAt||null,researchGeneratedAt:research?.generatedAt||null,oddsFetchedAt:odds?.meta?.fetchedAt||null,simGeneratedAt:sim?.generatedAt||null};
    hydrateNflDemoState(state,{data:state.data,research,odds,sim,halftime});
    if(!NFL_DEMO_MODE) startLivePolling(d,()=>{
      syncPreviewGamesFromRaw(d);
      const root=document.getElementById('nflView');
      if(!root || root.hidden || !(state.tab==='slate' || state.tab==='live' || state.tab==='feed' || state.game)) return;
      if(state.game && state.gamecastTab==='game'){
        const current=gameForId(state.game);
        const halfNow=!!(current&&isHalftimeGameState(current));
        const halfShown=!!root.querySelector('[data-tso-halftime-gamecast]');
        if(halfNow!==halfShown){ requestAnimationFrame(()=>render()); return; }
        if(current && root.querySelector('[data-tso-v886-gamecast]')){ requestAnimationFrame(()=>render()); return; }
        if(current && patchLiveGamecastDOM(root,current)) return;
      }
      if(state.tab==='slate' && !state.game && 'requestIdleCallback' in window){
        requestIdleCallback(()=>{ if(state.tab==='slate' && !state.game) render(); },{timeout:1200});
      }else{
        requestAnimationFrame(()=>render());
      }
    });
  }catch(e){
    state.data={games:FALLBACK_GAMES,players:FALLBACK_PLAYERS,week:1,generatedAt:null,researchGeneratedAt:null};
  }
  const dd=state.data;
  // v83 — expose canonical slate/game IDs for companion NFL UI modules.
  // Player-modal research objects do not always carry gameId/startTimeUTC,
  // especially when a sportsbook has not posted that player's market yet.
  // Keep a small read-only lookup sourced from the actual nfl.json slate so
  // ATD legs created from the modal still receive valid wager metadata.
  const gameMetaById=Object.fromEntries(dd.games.map(g=>[String(g.id),{gameId:String(g.id),startTimeUTC:g.startTimeUTC||null,away:g.away?.abbr||null,home:g.home?.abbr||null}]));
  const wagerByEspnId={}, wagerByTeamName={};
  for(const p of dd.players){
    const gm=gameMetaById[String(p.gameId)]||null;
    const meta={playerId:p.espnId||null,gameId:p.gameId||null,startTimeUTC:gm?.startTimeUTC||null,team:p.team||null,name:p.name||null,game:gm};
    if(p.espnId) wagerByEspnId[String(p.espnId)]=meta;
    wagerByTeamName[`${p.team}|${researchNameKey(p.name)}`]=meta;
  }
  window.DW_NFL_WAGER_META={byEspnId:wagerByEspnId,byTeamName:wagerByTeamName,games:gameMetaById};
  // v86.2 — canonical prop-result bridge. Slate, Props and Player Modal must
  // consume the same final TSO result instead of grading independently.
  window.DW_NFL_PROP_RESULT=({id,name,team,prop}={})=>{
    const sid=id!=null?String(id):'';
    const nk=researchNameKey(name);
    const nt=normNflTeam(team);
    const pool=dd.players||[];
    let player=sid?pool.find(p=>[p.espnId,p.id,p.gsisId].some(v=>v!=null&&String(v)===sid)):null;
    if(!player&&nk&&nt) player=pool.find(p=>normNflTeam(p.team)===nt&&researchNameKey(p.name)===nk);
    if(!player&&nk) player=pool.find(p=>researchNameKey(p.name)===nk);
    if(!player||!prop) return null;
    const v=propValue(player,prop);
    if(!v) return null;
    const o=v.offer||null;
    return {
      prop,
      playerId:player.espnId||player.id||null,
      name:player.name,
      team:player.team,
      prob:finiteNumberOrNull(v.prob),
      grade:v.grade||null,
      projection:finiteNumberOrNull(v.projection),
      line:finiteNumberOrNull(v.line),
      main:v.main||null,
      sub:v.sub||null,
      modelProb:finiteNumberOrNull(v.modelProb),
      simProb:finiteNumberOrNull(v.simProb),
      simUsed:!!v.simUsed,
      offer:o?{
        line:finiteNumberOrNull(o.line),
        price:finiteNumberOrNull(o.price),
        book:o.book||null,
        link:o.link||null,
        gameId:o.gameId||null,
        eventId:o.eventId||null,
        startDateUTC:o.startDateUTC||null
      }:null
    };
  };

  const firstTdRank=[...dd.players].map(p=>({p,prob:firstTdProbability(p)})).filter(x=>x.prob!=null).sort((a,b)=>b.prob-a.prob);
  window.DW_NFL_PREVIEW_SUMMARY={
    week:dd.week,
    gameCount:dd.games.length,
    playerCount:dd.players.length,
    topAtdPct:dd.players.length?Math.round((dd.players[0].prob||0)*100):null,
    topFirstTdPct:firstTdRank.length?Math.round(firstTdRank[0].prob*100):null,
    signals:dd.players.filter(p=>p.edge>=60).slice(0,6).map(p=>({name:p.name,team:p.team,edge:p.edge,prob:p.prob,firstTd:firstTdProbability(p),headshot:p.headshot||null})),
  };
}


function syncPreviewGamesFromRaw(raw){
  if(!state.data?.games || !raw?.games) return;
  const byId=new Map(state.data.games.map(g=>[String(g.id),g]));
  for(const rg of raw.games){
    const g=byId.get(String(rg.gameId)); if(!g) continue;
    g.status=rg.status||g.status;
    g.detail=rg.statusDetail||g.detail;
    g.liveScore=rg.liveScore?{...rg.liveScore}:g.liveScore;
    if(rg.away?.score!=null) g.away={...g.away,score:rg.away.score};
    if(rg.home?.score!=null) g.home={...g.home,score:rg.home.score};
    g.score=g.status==='pre'?null:`${g.away?.score||0} – ${g.home?.score||0}`;
  }
}

function scoreNum(team){ const n=Number(team?.score); return Number.isFinite(n)?n:0; }
function quarterLabel(period){ return period===1?'1ST':period===2?'2ND':period===3?'3RD':period===4?'4TH':period>=5?'OT':''; }
function clockLabel(clockMin){
  if(!Number.isFinite(Number(clockMin))) return '';
  const total=Math.max(0,Math.round(Number(clockMin)*60));
  return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
}
function liveState(g){
  const live=g?.liveScore||{};
  const period=Number(live.period)||0;
  const q=quarterLabel(period);
  const clock=clockLabel(live.clockMin);
  const label=g?.status==='in' ? [q,clock].filter(Boolean).join(' ') : g?.status==='post' ? 'FINAL' : (g?.time||'TBD');
  return {live,period,q,clock,label};
}
function possessionAbbr(g){
  const poss=g?.liveScore?.possession;
  return poss==='home'?g.home.abbr:poss==='away'?g.away.abbr:null;
}
function ballFieldPct(g){
  const live=g?.liveScore||{};
  const y=Number(live.yardFromOwn);
  if(Number.isFinite(y) && live.possession){
    return clamp(live.possession==='home'?100-y:y,5,95);
  }
  return num(g.id+'ball',34,68);
}
function firstDownPct(g,ball){
  const live=g?.liveScore||{};
  const dist=Number(live.distance);
  const d=Number.isFinite(dist)?clamp(dist,1,20):10;
  return clamp(ball+(live.possession==='home'?-d:d),7,93);
}
function fieldPositionLabel(g){
  if(g?.status==='post') return 'Game Complete';
  const live=g?.liveScore||{};
  const y=Math.round(Number(live.yardFromOwn));
  if(!Number.isFinite(y)||!live.possession) return `${g.home.abbr} 50`;
  const own=live.possession==='home'?g.home.abbr:g.away.abbr;
  const opp=live.possession==='home'?g.away.abbr:g.home.abbr;
  return y<=50?`${own} ${y}`:`${opp} ${100-y}`;
}
function downDistanceLabel(g){
  const live=g?.liveScore||{};
  if(live.downDistanceText) return live.downDistanceText;
  const down=Number(live.down), dist=Number(live.distance);
  if(Number.isFinite(down)&&Number.isFinite(dist)) return `${down}${down===1?'st':down===2?'nd':down===3?'rd':'th'} & ${dist}`;
  if(g?.status==='post') return 'Final';
  return g?.status==='in'?'1st & 10':'Pregame';
}
function lastPlayLabel(g){ return g?.liveScore?.lastPlayText || (g?.status==='in'?'Live play data updating':'Awaiting kickoff'); }

function data(){ return state.data || {games:FALLBACK_GAMES,players:FALLBACK_PLAYERS,week:1}; }

const TEST_LIVE_GAME_ID='tso-nfl-live-preview-test';
function testLiveGame(){
  const d=data();
  const source=d.games.find(g=>g.away?.abbr==='NE' && g.home?.abbr==='SEA')
    || d.games.find(g=>g.status==='pre')
    || d.games[0]
    || FALLBACK_GAMES[0];
  if(!source) return null;
  const sourceId=String(source.id);
  const watch=(d.players||[]).filter(p=>String(p.gameId)===sourceId && p.team===source.away.abbr).slice(0,3);
  const byId={},byName={};
  watch.forEach((p,i)=>{
    const flat=['QB'].includes(p.pos)?{compAtt:`${15+i}/${22+i}`,passYds:188+i*24,passTds:i===0?1:0,interceptions:0}:['RB','HB'].includes(p.pos)?{carries:11+i*2,rushYds:64+i*9,rushTds:i===0?1:0}:{receptions:5+i,recYds:72+i*13,recTds:i===1?1:0,targets:7+i};
    const row={id:p.espnId||String(p.id),name:p.name,team:p.team,position:p.pos,flat};
    byId[String(row.id)]=row; byName[`${p.team}|${String(p.name).toLowerCase()}`]=row;
  });
  const drivePlays=[
    {id:'t1',text:`${source.away.abbr} run for 6 yards.`,period:3,clock:'9:14',downDistanceText:'1st & 10',team:source.away.abbr},
    {id:'t2',text:`Short pass complete for 11 yards.`,period:3,clock:'8:47',downDistanceText:'2nd & 4',team:source.away.abbr},
    {id:'t3',text:`Inside run gains 4 yards.`,period:3,clock:'8:21',downDistanceText:'1st & 10',team:source.away.abbr},
    {id:'t4',text:`Crossing route moves the chains for 13 yards.`,period:3,clock:'7:58',downDistanceText:'2nd & 6',team:source.away.abbr},
    {id:'t5',text:`${source.away.abbr} gains 8 yards on a crossing route.`,period:3,clock:'7:42',downDistanceText:'2nd & 6',team:source.away.abbr},
  ];
  return {
    ...source,
    id:TEST_LIVE_GAME_ID,
    __test:true,
    __sourceGameId:sourceId,
    status:'in',
    detail:'3rd · 7:42',
    score:'17 – 14',
    away:{...source.away,score:17},
    home:{...source.home,score:14},
    liveScore:{
      ...(source.liveScore||{}),
      period:3,clockMin:7.7,possession:'away',yardFromOwn:50,down:2,distance:6,downDistanceText:'2nd & 6',isRedZone:false,
      lastPlayText:drivePlays.at(-1).text,
      currentDrive:{id:'test-drive-7',team:source.away.abbr,playCount:5,yards:42,elapsedDisplay:'2:06',plays:drivePlays},
      plays:drivePlays,
      playerStats:{byId,byName},
      teamStats:{
        [source.away.abbr]:{totalYards:286,passingYards:196,rushingYards:90,turnovers:0,timeOfPossession:'19:44'},
        [source.home.abbr]:{totalYards:241,passingYards:167,rushingYards:74,turnovers:1,timeOfPossession:'17:34'},
      },
      linescores:{away:[7,3,7,null],home:[7,7,0,null]},
      scoringPlays:[],lastFetchedAt:Date.now(),
    },
  };
}
function gameForId(id){
  if(String(id)===TEST_LIVE_GAME_ID) return testLiveGame();
  return data().games.find(x=>String(x.id)===String(id));
}

/**
 * First-touchdown preview probability. ATD remains the connected scoring model;
 * until a dedicated drive-order model is wired, First TD is derived from ATD
 * plus the player's red-zone role and snap share so it behaves like a distinct
 * market instead of a flat percentage of ATD.
 */
function firstTdProbability(p){
  const atd=Number(p?.prob);
  if(!Number.isFinite(atd)) return null;
  const usage=clamp((Number(p?.usage)||65)/100,.35,.95);
  const rz=clamp((Number(p?.rz)||8)/24,0,1.35);
  const roleShare=clamp(.17 + usage*.10 + rz*.12, .20, .43);
  return clamp(atd*roleShare,.015,.22);
}

function propValue(p,prop){
  const atd=Number(p.prob)||0;
  if(prop==='atd'){
    const offer=bestPlayerOffer(p,'atd');
    const simProb=finiteNumberOrNull(p.simProb),modelProb=finiteNumberOrNull(p.modelProb);
    return {main:`${Math.round(atd*100)}%`,sub:'Anytime TD probability',prob:atd,modelProb,simProb,simUsed:simProb!=null,grade:p.grade||gradeFor(atd),projection:atd,line:.5,offer,recent:null,season:null,defense:null};
  }
  if(prop==='firstTd'){
    const prob=firstTdProbability(p)||.025,offer=bestPlayerOffer(p,'firstTd');
    return {main:`${Math.round(prob*100)}%`,sub:'First TD probability',prob,grade:gradeForLean(prob),projection:prob,line:.5,offer,recent:null,season:null,defense:null,simUsed:finiteNumberOrNull(p.simProb)!=null};
  }
  const recent=researchRecentAvg(p,prop),season=researchSeasonAvg(p,prop),defense=researchDefenseAvg(p,prop),researchProj=researchProjection(p,prop),offer=bestPlayerOffer(p,prop);
  const line=Number.isFinite(Number(offer?.line))?Number(offer.line):null;
  const simProj=simulationProjection(p,prop),w=simBlendWeights();
  const projection=Number.isFinite(simProj)&&researchProj>0?+(simProj*w.sim+researchProj*w.model).toFixed(1):(Number.isFinite(simProj)?+simProj.toFixed(1):researchProj);
  if(!(projection>0)&&line==null) return {main:'—',sub:'Data pending',prob:0,grade:'—',projection:0,line:null,offer:null,recent,season,defense,simUsed:false};
  const modelProb=propLeanProbability(prop,researchProj||projection,line);
  const simProb=line!=null?simulationOverProbability(p,prop,line):null;
  const prob=blendModelSimulation(modelProb,simProb),grade=gradeForLean(prob);
  return {
    main:line!=null?`O ${fmtLine(line)}`:fmtLine(projection),
    sub:offer?`${priceFmt(offer.price)} · ${compactBook(offer.book)}`:(Number.isFinite(simProj)?'TSO simulation projection':'TSO research projection'),
    prob,modelProb,simProb,simUsed:Number.isFinite(simProb),grade,projection,line,offer,recent,season,defense,
  };
}

function nflBadges(p){
  const out=[];
  if(p.edge>=60) out.push(signalBadge(p.edge));
  if(p.rz>=20) out.push('<span class="ms-nfl-badge">RZ THREAT</span>');
  if(p.usage>=80) out.push('<span class="ms-nfl-badge">HIGH USAGE</span>');
  if(p.explosive>=18) out.push('<span class="ms-nfl-badge">BIG PLAY</span>');
  return `<div class="ms-nfl-badges">${out.join('')}</div>`;
}


function headerHTML(){
  if(state.game) return '';
  const propTitle=state.prop==='allPlayers'?'All Players':`${PROPS[state.prop]} Props`;
  const titles={radar:'Game Radar',slate:'NFL Slate',live:'NFL Live',feed:'TD Feed',props:propTitle,players:'All Players',foryou:'For You'};
  const subs={
    radar:'Every Week 1 matchup plotted by competitiveness and scoring pressure.',
    slate:'Pregame matchup research built like MLB Slate: team context, scoring leaders, TSO Edge and each side’s top touchdown threats.',
    live:'Every NFL game in progress right now. Open any matchup for the full Sports Outpost Gamecast, Box Score and Play by Play.',
    feed:'A touchdown stream built like the MLB Home Run Feed, using football scoring context.',
    props:state.prop==='allPlayers'?'Every modeled skill player in one searchable board, inside the same Props dropdown as the markets.':'Ranked NFL props with one market dropdown, Board/Radar views, grades and TSO Edge.',
    players:'Every modeled skill player in one searchable board, with TSO Edge sorting.',
    foryou:'The same shared community feed, now inside the NFL experience.',
  };
  return `<header class="ms-head"><div><div class="ms-kicker"><span>🏈</span>NFL · WEEK ${data().week} PREVIEW</div><h2>${esc(titles[state.tab])}</h2><p>${esc(subs[state.tab])}</p></div><div class="ms-head-actions">${signalBadge(67)}<span>${esc(researchFreshnessLabel())}</span></div></header>`;
}

function footballField(g,{gamecast=false}={}){
  const ball=clamp(ballFieldPct(g), 8, 92);
  const first=clamp(firstDownPct(g,ball), 8, 92);
  return `<div class="ms-field ms-field-art"><img class="ms-field-art-img" src="${NFL_FIELD_ART}" alt="The Sports Outpost branded football field"><div class="ms-field-overlay">${gamecast?`<span class="ms-los" style="left:${ball}%"></span><span class="ms-firstdown" style="left:${first}%"></span>`:''}<span class="ms-ball" style="left:${ball}%"></span></div></div>`;
}

function slateGamecastCard(g){
  const p=featuredPlayerForGame(g);
  const st=liveState(g);
  const live=g.status==='in', final=g.status==='post';
  const poss=possessionAbbr(g);
  const homeWp=num(g.id+'wp',43,64);
  const statusText=live?'Live':final?'Final':'Game Preview';
  const centerMain=live?st.label:(final?'FINAL':g.time);
  const centerSub=live?`${downDistanceLabel(g)} · ${fieldPositionLabel(g)}`:esc(g.detail);
  const featuredAtd=Math.round((p.prob||0)*100), featuredFirst=Math.round((firstTdProbability(p)||0)*100);
  const defAbbr=p.opp||g.home.abbr;
  const last=lastPlayLabel(g);
  const edge=num(g.id+'rze',57,73);
  const scoring=live?num(g.id+'liveScoreChance',48,79):num(g.id+'preScoreChance',45,68);
  const sideTeam=p.team||g.away.abbr;
  const teamCopy=t=>`<div class="ms-slate-team-copy"><small>${esc(t.abbr)}</small><b>${esc(t.name)}</b><span>${esc(record(t))}</span></div>`;
  return `<article class="ms-slate-cast ${live?'is-live':final?'is-final':'is-pre'}" data-nfl-game="${esc(g.id)}" tabindex="0" role="button" aria-label="Open ${esc(g.away.name)} at ${esc(g.home.name)} Gamecast">
    <div class="ms-slate-statusbar"><span class="ms-slate-status">${esc(statusText)}</span><span class="ms-slate-network">${esc(g.broadcast||'NFL')} · ${esc(g.detail)}</span></div>
    <div class="ms-slate-scorebar">
      <div class="ms-slate-team">${teamLogo(g.away)}${teamCopy(g.away)}<strong class="ms-slate-score">${scoreNum(g.away)}</strong></div>
      <div class="ms-slate-center"><strong>${esc(centerMain)}</strong><b>${esc(centerSub)}</b><small>${poss?`${esc(poss)} has the ball`:(live?'Possession updating':'Kickoff preview')}</small></div>
      <div class="ms-slate-team home"><strong class="ms-slate-score">${scoreNum(g.home)}</strong>${teamCopy(g.home)}${teamLogo(g.home)}</div>
    </div>
    <div class="ms-slate-body">
      <div class="ms-slate-side"><div class="ms-slate-side-head">Player to Watch · ${esc(sideTeam)}</div><div class="ms-slate-person"><div class="ms-avatar">${p.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p.name))}</span>`}</div><div><b>${esc(p.name)}</b><span>${esc(p.pos)} · vs ${esc(p.opp||'DEF')}</span></div></div><div class="ms-slate-person-stats"><div><b>${featuredAtd}%</b><span>ATD</span></div><div><b>${featuredFirst}%</b><span>1ST TD</span></div><div><b>${p.edge}</b><span>TSO EDGE</span></div></div></div>
      <div class="ms-slate-field-wrap">${footballField(g,{gamecast:true})}<div class="ms-slate-field-tag">${esc(downDistanceLabel(g))} · ${esc(fieldPositionLabel(g))}</div><div class="ms-slate-field-legend"><span><i class="los"></i>Line of scrimmage</span><span><i class="fd"></i>First down</span></div></div>
      <div class="ms-slate-side"><div class="ms-slate-side-head">Defensive Look · ${esc(defAbbr)}</div><div class="ms-slate-defense"><div><span>MAN</span><b>${num(defAbbr+'man',31,48)}%</b></div><div><span>BLITZ</span><b>${num(defAbbr+'blitz',18,34)}%</b></div><div><span>RZ TD ALLOW</span><b>${p.oppRzAllowed!=null?(p.oppRzAllowed*100).toFixed(1):num(defAbbr+'rz',18,29)}%</b></div><div><span>TSO EDGE</span><b>${edge}</b></div></div><div class="ms-slate-defense-note">Coverage, pressure and red-zone context update the football matchup read.</div></div>
    </div>
    <div class="ms-slate-lower"><div><span>Last Play</span><b>${esc(last)}</b><small>${live?'Live feed · refreshes automatically':'Full play-by-play appears once the game starts'}</small></div><div><span>Scoring Chance</span><b>${scoring}%</b><small>${live?'Current drive':'Pregame scoring environment'}</small></div><div><span>Possession</span><b>${esc(poss||'—')}</b><small>${esc(fieldPositionLabel(g))}</small></div><div><span>TSO Game Edge</span><b>${edge}</b><small>${live?'Live context':'Pregame matchup'}</small></div></div>
    <div class="ms-slate-footer"><span>${esc(g.venue)}${g.city?` · ${esc(g.city)}`:''} · ${homeWp}% home win prob</span><button type="button" class="ms-slate-open" data-nfl-game="${esc(g.id)}">${live?'Watch Live Gamecast':'Open Gamecast'}</button></div>
  </article>`;
}

function gameCard(g){ return slateGamecastCard(g); }

function nflSlatePlayersForTeam(g,abbr){
  ensurePlayerIndexes();
  const indexed=_playersByGameTeam.get(`${String(g.id)}|${abbr}`);
  if(indexed) return indexed;
  // Fallback data may not carry gameId; keep the preview useful without
  // sacrificing the indexed fast path for connected slates.
  return playersForGame(g).filter(p=>p.team===abbr).sort((a,b)=>(b.prob||0)-(a.prob||0));
}
function nflSlateLeaderHTML(g,team,isHome=false){
  const list=nflSlatePlayersForTeam(g,team.abbr);
  const p=list[0] || featuredPlayerForGame(g);
  const atd=Math.round((p?.prob||0)*100);
  const first=Math.round((firstTdProbability(p)||0)*100);
  const avatar=p?.headshot?`<img src="${esc(p.headshot)}" alt="" loading="lazy" decoding="async">`:`<span>${esc(initials(p?.name||team.abbr))}</span>`;
  return `<section class="nfl-match-leader ${isHome?'home':''}">
    <div class="nfl-match-leader-primary">
      <div class="nfl-match-leader-avatar">${avatar}</div>
      <div class="nfl-match-leader-info"><span>Top Scoring Threat · ${esc(team.abbr)}</span><b>${esc(p?.name||'Player TBD')}</b><small>${esc(p?.pos||'SKILL')} · ${atd}% Anytime TD</small><div class="nfl-leader-odds">${p?(oddsChipHTML(p,'atd')||'<span class="nfl-odds-chip"><b>ATD</b><small>Odds pending</small></span>'):''}${p?oddsChipHTML(p,'firstTd'):''}</div></div>
    </div>
    <div class="nfl-match-leader-stats">
      <div><span>ATD</span><b>${atd}%</b></div><div><span>1st TD</span><b>${first}%</b></div><div><span>RZ Opps</span><b>${p?.rz??'—'}</b></div><div class="edge"><span>TSO Edge</span><b>${p?.edge??'—'}</b></div>
    </div>
  </section>`;
}
function nflSlatePlayerRowHTML(p,extra=false){
  const avatar=p.headshot?`<img src="${esc(p.headshot)}" alt="" loading="lazy" decoding="async">`:`<span>${esc(initials(p.name))}</span>`;
  const grade=p.grade||gradeFor(p.prob||0);
  // A Slate player row contains its own Add ATD button, so the row itself must
  // NOT be a <button>. Nested buttons are invalid HTML; browsers auto-close the
  // outer button and spill the grade/edge cells outside the team board. That was
  // the actual cause of the broken v81/v82 Slate layout.
  return `<div class="nfl-slate-player ${extra?'is-extra':''}" data-nfl-player="${esc(p.id)}" role="button" tabindex="0" aria-label="Open ${esc(p.name)} player profile">
    <div class="nfl-slate-player-head">${avatar}</div>
    <div class="nfl-slate-player-main"><span class="nfl-slate-player-name"><strong>${esc(p.name)}</strong></span><span class="nfl-slate-player-meta">${esc(p.pos)} · ${p.usage}% snaps · ${p.rz} RZ opps</span><div class="nfl-slate-badges">${nflBadges(p)}</div><div class="nfl-slate-odds">${oddsChipHTML(p,'atd')||'<span class="nfl-odds-chip"><b>ATD</b><small>Odds pending</small></span>'}${oddsChipHTML(p,'firstTd')}${atdWagerButtonHTML(p,'Add ATD')}</div></div>
    <div class="nfl-slate-player-stat grade">${nflGradeRingHTML(p.prob||0,grade,'sm')}</div>
    <div class="nfl-slate-player-stat edge"><b>${p.edge}</b></div>
  </div>`;
}

function nflThreatBoardHTML(g,team){
  const list=nflSlatePlayersForTeam(g,team.abbr);
  const expanded=state.expandedSlate.has(String(g.id));
  // v65: keep hidden bench players out of the DOM until requested. On a full
  // Sunday slate this cuts hundreds of nodes, badges and headshot decodes.
  const visible=expanded?list:list.slice(0,5);
  const rows=visible.map(p=>nflSlatePlayerRowHTML(p,false)).join('');
  return `<section class="nfl-team-board"><div class="nfl-team-board-head">${teamLogo(team)}<div><b>${esc(team.name)}</b><span>Top TD Threats · ${list.length} modeled players</span></div></div><div class="nfl-team-board-cols"><span class="player-col">Player</span><span>TD Grade</span><span>TSO Edge</span></div>${rows||'<div style="padding:14px;color:var(--mute);font-size:11px;">Player model data not posted yet.</div>'}</section>`;
}
function nflSlateMatchupCard(g){
  const live=g.status==='in', final=g.status==='post', st=liveState(g), wx=weatherForGame(g);
  const expanded=state.expandedSlate.has(String(g.id));
  const awayList=nflSlatePlayersForTeam(g,g.away.abbr), homeList=nflSlatePlayersForTeam(g,g.home.abbr);
  const canExpand=Math.max(awayList.length,homeList.length)>5;
  const gameEdge=Math.max(
    awayList[0]?.edge||0,
    homeList[0]?.edge||0,
    num(g.id+'gameedge',52,72)
  );
  const homeWp=num(g.id+'wp',43,64);
  const stateLabel=live?'Live':final?'Final':'Pregame';
  const time=live?(st.label||'LIVE'):final?'FINAL':nflKickoffTimeLabel(g.startTimeUTC);
  const poss=possessionAbbr(g);
  const statusClass=live?'live':final?'final':'';
  return `<article class="nfl-match-card ${live?'is-live':final?'is-final':''} ${expanded?'is-expanded':''}" data-nfl-slate-card="${esc(g.id)}">
    <div class="nfl-match-head">
      <div class="nfl-match-team">${teamLogo(g.away)}<div class="nfl-match-team-copy"><small>${esc(g.away.abbr)}</small><b>${esc(g.away.name)}</b><span>${esc(record(g.away))}</span></div></div>
      <div class="nfl-match-center"><span class="nfl-match-state ${statusClass}">${live?'<i></i>':''}${esc(stateLabel)}</span>${!live&&!final?`<span class="nfl-match-date">${esc(nflKickoffDateLabel(g.startTimeUTC))}</span>`:''}<span class="nfl-match-time">${esc(time)}</span>${!live&&!final?`<span class="nfl-match-broadcast">${esc(broadcastLabel(g))}</span>`:''}<span class="nfl-match-venue">${esc(g.venue)}${g.city?` · ${esc(g.city)}`:''}</span>${live?`<button type="button" class="nfl-live-gamecast-btn" data-nfl-open-game="${esc(g.id)}" data-nfl-origin="live">Open Live Gamecast</button>`:''}</div>
      <div class="nfl-match-team home"><div class="nfl-match-team-copy"><small>${esc(g.home.abbr)}</small><b>${esc(g.home.name)}</b><span>${esc(record(g.home))}</span></div>${teamLogo(g.home)}</div>
    </div>
    <div class="nfl-match-leaders">${nflSlateLeaderHTML(g,g.away,false)}${nflSlateLeaderHTML(g,g.home,true)}</div>
    <div class="nfl-match-env">
      <div class="nfl-env-tile"><span>Weather</span><b>${wx.ico} ${wx.temp}°</b><small>${esc(wx.cond)}</small></div>
      ${gameOddsPanelHTML(g)}
      <div class="nfl-env-tile edge"><span>TSO Game Edge</span><b>${gameEdge}</b><small>Best scoring matchup signal</small></div>
      <div class="nfl-env-tile ${live?'live':''}"><span>${live?'Live State':'Home Win Prob'}</span><b>${live?esc(downDistanceLabel(g)):`${homeWp}%`}</b><small>${live?esc(fieldPositionLabel(g)):`${esc(g.home.abbr)} modeled win probability`}</small></div>
    </div>
    <div class="nfl-match-threats">${nflThreatBoardHTML(g,g.away)}${nflThreatBoardHTML(g,g.home)}</div>
    ${canExpand?`<div class="nfl-lineup-expand"><button type="button" data-nfl-expand-slate="${esc(g.id)}">${expanded?'Show top 5':'View full player pools'} <span class="chev">⌄</span></button></div>`:''}
    <div class="nfl-slate-footer"><span>TD probability · red-zone role · snap share · TSO Edge</span><span>${live?'Live Gamecast available on NFL Live':'Tap any player for the full matchup profile'}</span></div>
  </article>`;
}
function slateHTML(){
  const ordered=[...data().games].sort((a,b)=>{const rank=x=>x.status==='in'?0:x.status==='pre'?1:2; return rank(a)-rank(b);});
  return `<div class="nfl-matchup-slate">${ordered.map(nflSlateMatchupCard).join('')}</div>`;
}

function nflLivePreviewHTML(g){
  const st=liveState(g);
  const poss=possessionAbbr(g);
  return `<button type="button" class="nfl-live-chip ${g.__test?'is-test':''}" data-nfl-open-game="${esc(g.id)}" data-nfl-origin="live">
    <div class="nfl-live-chip-top"><span class="nfl-live-now"><i></i> ${g.__test?'Test Game':'Live'}</span><span class="nfl-live-clock">${esc(st.label||'LIVE')}</span></div>
    <div class="nfl-live-score"><div class="nfl-live-team">${teamLogo(g.away)}<b>${esc(g.away.name)}</b><strong>${scoreNum(g.away)}</strong></div><div class="nfl-live-vs">VS</div><div class="nfl-live-team home"><strong>${scoreNum(g.home)}</strong><b>${esc(g.home.name)}</b>${teamLogo(g.home)}</div></div>
    <div class="nfl-live-context"><div><span>Down & Distance</span><b>${esc(downDistanceLabel(g))}</b></div><div><span>Field Position</span><b>${esc(fieldPositionLabel(g))}${poss?` · ${esc(poss)} ball`:''}</b></div></div>
    <div class="nfl-live-openhint">Open full Gamecast →</div>
  </button>`;
}
function liveHTML(){
  const realLive=data().games.filter(g=>g.status==='in');
  const qaTest=(typeof window!=='undefined' && window.DW_NFL_TEST_MODE===true) ? testLiveGame() : null;
  const live=[...realLive,...(qaTest?[qaTest]:[])];
  const next=data().games.filter(g=>g.status==='pre').sort((a,b)=>new Date(a.startTimeUTC||0)-new Date(b.startTimeUTC||0))[0]||null;
  const rail=live.length?live.map(nflLivePreviewHTML).join(''):`<div class="nfl-live-empty"><b>No NFL game is live right now.</b><span>${next?`Next: ${esc(next.away.name)} at ${esc(next.home.name)} · ${esc(next.time||'TBD')}`:'The next live matchup will appear here automatically.'}</span></div>`;
  return `<div class="nfl-live-page">${halftimeBannerHTML(state.halftime,data().games)}<div class="nfl-live-rail-wrap"><div class="nfl-live-rail-label"><span>● Live Games</span><span>${realLive.length?`${realLive.length} game${realLive.length===1?'':'s'} in progress`:'Waiting for kickoff'}</span></div><div class="nfl-live-rail">${rail}</div></div><div class="nfl-live-helper"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><div>${realLive.length?'Open any matchup for the full live Gamecast, Box Score and Play by Play.':'This page switches to live automatically when the game begins.'}${qaTest?' · QA test mode is enabled.':''}</div></div></div>`;
}


function gameRadarHTML(){
  const games=data().games.slice(0,12);
  const pts=games.map((g,i)=>{
    const a=(i/games.length)*Math.PI*2-.5, r=18+(hash(g.id)%28); const x=50+Math.cos(a)*r,y=50+Math.sin(a)*r;
    return `<button class="ms-radar-dot" data-nfl-game="${esc(g.id)}" style="left:${x}%;top:${y}%;--i:${i}"><b>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}</b><span>${esc(g.detail)}</span></button>`;
  }).join('');
  return `<section class="ms-radar-wrap"><div class="ms-radar"><i></i><i></i><i></i><div class="ms-radar-cross x"></div><div class="ms-radar-cross y"></div><div class="ms-radar-core">TSO<br><small>NFL</small></div>${pts}</div><div class="ms-radar-side"><h3>Closest games</h3>${games.slice(0,6).map((g,i)=>`<button data-nfl-game="${esc(g.id)}"><b>${i+1}</b><span>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}</span><em>${num(g.id+'close',52,78)} GAME EDGE</em></button>`).join('')}</div></section>`;
}

function isTouchdownScoringPlay(p){
  const s=`${p?.type||''} ${p?.text||''}`;
  return /touchdown|\btd\b/i.test(s) && !/extra point|field goal/i.test(s);
}
function tdFeedEvents(){
  const out=[];
  for(const g of data().games){
    for(const p of g.liveScore?.scoringPlays||[]){
      if(!isTouchdownScoringPlay(p)) continue;
      const q=Number(p.period)||0;
      const parts=String(p.clock||'').split(':');
      const clockSec=parts.length===2?(Number(parts[0])*60+Number(parts[1])):900;
      // TD Feed persists for the entire NFL week, so order across GAME dates,
      // not merely by quarter/clock inside one game.
      const gameStart=new Date(g.startTimeUTC||0).getTime();
      const elapsedSec=Math.max(0,(Math.max(1,q)-1)*900+(900-Math.max(0,Math.min(900,clockSec))));
      out.push({g,p,order:(Number.isFinite(gameStart)?gameStart:0)+elapsedSec*1000});
    }
  }
  return out.sort((a,b)=>b.order-a.order);
}
function tdScorerForPlay(g,play){
  const raw=String(play?.text||play?.shortText||'');
  const text=raw.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const team=normNflTeam(play?.team||'');
  const list=(data().players||[]).filter(p=>String(p.gameId)===String(g.id)&&(!team||p.team===team));
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const ranked=[...list].sort((a,b)=>String(b.name||'').length-String(a.name||'').length);
  const afterTo=/\bpass\b|\bcomplete/i.test(raw)?norm(raw.split(/\bto\b/i).slice(1).join(' to ')):'';
  if(afterTo){
    for(const p of ranked){const full=norm(p.name),last=full.split(' ').at(-1)||'';if((full&&afterTo.includes(full))||(last.length>=4&&new RegExp(`\\b${last}\\b`).test(afterTo)))return p;}
  }
  const runner=/\b(rush|run|scramble)\b/i.test(raw)?text:'';
  if(runner){
    for(const p of ranked){const full=norm(p.name),last=full.split(' ').at(-1)||'';if((full&&runner.includes(full))||(last.length>=4&&new RegExp(`\\b${last}\\b`).test(runner)))return p;}
  }
  for(const p of ranked){const full=norm(p.name);if(full&&text.includes(full))return p;}
  for(const p of ranked){const last=norm(p.name).split(' ').at(-1)||'';if(last.length>=4&&new RegExp(`\\b${last}\\b`).test(text))return p;}
  return null;
}

function firstTdPlayForGame(g,play){
  const tds=(g.liveScore?.scoringPlays||[]).filter(isTouchdownScoringPlay);
  return !!tds.length && String(tds[0]?.id||tds[0]?.text)===String(play?.id||play?.text);
}
function tdOddsHTML(g,play,player){
  if(!player) return '';
  const atd=oddsChipHTML(player,'atd','Pregame ATD');
  const first=firstTdPlayForGame(g,play)?oddsChipHTML(player,'firstTd','Pregame 1st TD'):'';
  return (atd||first)?`<div class="nfl-td-odds">${atd}${first}</div>`:'';
}
function tdFeedPriceHTML(player,market,label){
  if(!player) return '';
  const offer=bestPlayerOffer(player,market);
  if(!offer) return `<div class="nfl-td-price pending"><span>${esc(label)}</span><b>Odds pending</b></div>`;
  return `<div class="nfl-td-price"><span>${esc(label)}</span><b>${esc(priceFmt(offer.price))}</b><em>${esc(compactBook(offer.book||'Sportsbook'))}</em></div>`;
}
function feedHTML(){
  const feed=tdFeedEvents();
  if(!feed.length){
    const liveNow=data().games.some(g=>g.status==='in');
    return `<div class="nfl-td-feed-modern"><div class="nfl-live-empty"><b>${liveNow?'No touchdowns yet.':'TD Feed is standing by.'}</b><span>${liveNow?'The first touchdown will appear here as soon as the live scoring play posts.':'Live touchdown events will populate here automatically once an NFL game begins.'}</span></div></div><div class="ms-preview-foot"><b>Live TD Feed.</b> Real scoring plays, player photos and stored pregame sportsbook prices.</div>`;
  }
  return `<div class="nfl-td-feed-modern">${feed.map(({g,p})=>{
    const scorer=tdScorerForPlay(g,p); const first=firstTdPlayForGame(g,p);
    const teamAbbr=normNflTeam(p.team||scorer?.team||''); const team=teamAbbr===g.away.abbr?g.away:g.home;
    const photo=scorer?.headshot?`<img src="${esc(scorer.headshot)}" alt="${esc(scorer.name)}">`:(team?.logo?`<img class="team-logo" src="${esc(team.logo)}" alt="${esc(team.name)}">`:`<span>${esc(teamAbbr||'TD')}</span>`);
    const atd=tdFeedPriceHTML(scorer,'atd','Pregame ATD'); const firstOdds=first?tdFeedPriceHTML(scorer,'firstTd','Pregame 1st TD'):'';
    return `<article class="nfl-td-feed-card"><div class="nfl-td-feed-time">Q${esc(p.period||'?')}<br>${esc(p.clock||'')}</div><div class="nfl-td-feed-photo">${photo}</div><div class="nfl-td-feed-main"><div class="nfl-td-feed-name"><b>${esc(scorer?.name||team?.name||'Touchdown')}</b><span>${esc(teamAbbr||'TD')} · TOUCHDOWN</span></div><p>${esc(p.text||p.type||'Touchdown')}</p><div class="nfl-td-feed-score">${esc(g.away.abbr)} ${p.awayScore??scoreNum(g.away)} · ${esc(g.home.abbr)} ${p.homeScore??scoreNum(g.home)}</div></div><div class="nfl-td-feed-prices">${atd}${firstOdds}</div></article>`;
  }).join('')}</div><div class="ms-preview-foot"><b>Live TD Feed.</b> Real touchdown scoring plays from Gamecast with player photo and latest stored pregame sportsbook price when available.</div>`;
}

function propToolbar(){
  return `<div class="prop-market-bar nfl-mlb-prop-toolbar"><div class="prop-market-control nfl-mlb-prop-market-control"><span class="prop-market-label">Player Prop</span><div class="prop-market-select-wrap nfl-mlb-prop-select-wrap"><select id="nflMlbPropSelect" class="prop-market-select nfl-mlb-prop-select" aria-label="NFL player prop market">${Object.entries(PROPS).map(([id,label])=>`<option value="${esc(id)}" ${state.prop===id?'selected':''}>${esc(label)}</option>`).join('')}</select></div></div><div class="nfl-mlb-prop-fresh"><b>● LIVE ODDS</b> · ${esc(oddsFreshnessLabel())}<br><b>◆ TSO SIM</b> · ${esc(simulationFreshnessLabel())}</div></div>`;
}
function propCardDetail(p,v,prop){
  if(prop==='atd'||prop==='firstTd') return [
    ['SNAP',`${p.usage}%`],['RZ OPPS',p.rz],['TSO EDGE',p.edge],
  ];
  return [
    ['TSO PROJ',fmtLine(v.projection)],['L5 AVG',fmtLine(v.recent)],['OPP AVG',fmtLine(v.defense)],
  ];
}
function playerCard(p,prop,rank){
  const v=propValue(p,prop); if(v.main==='—') return '';
  const grade=v.grade||gradeForLean(v.prob),g=playerGame(p),date=g?nflKickoffDateLabel(g.startTimeUTC):'',offer=v.offer;
  const matchup=[`vs ${p.opp||'DEF'}`,date,g?.time].filter(Boolean).join(' · ');
  const marketLabel=PROPS[prop]||prop;
  const marketMain=(prop==='atd'||prop==='firstTd')?v.main:(v.line!=null?`Over ${fmtLine(v.line)}`:`Proj ${fmtLine(v.projection)}`);
  const odds=offer?`<div class="nfl-mlb-prop-odds"><span>BEST ODDS</span><b>${priceFmt(offer.price)}</b><em>${esc(offer.book||'Sportsbook')}</em></div>`:`<div class="nfl-mlb-prop-odds" style="border-color:rgba(110,137,171,.18);background:rgba(8,25,49,.32);color:#7f9ab9"><span>ODDS</span><b style="font-size:9px">Sportsbook pending</b></div>`;
  const wager=prop==='atd'?atdWagerButtonHTML(p,'Add ATD to Slip'):'';
  return `<article class="nfl-mlb-prop-card" data-nfl-player="${esc(p.id)}" role="button" tabindex="0">
    <div class="nfl-mlb-prop-rank">${rank}</div>
    <div class="nfl-mlb-prop-avatar">${p.headshot?`<img src="${esc(p.headshot)}" alt="" loading="lazy" decoding="async">`:`<span>${esc(initials(p.name))}</span>`}</div>
    <div class="nfl-mlb-prop-main"><div class="nfl-mlb-prop-name"><b>${esc(p.name)}</b><span>${esc(p.team)} · ${esc(p.pos)}</span></div><div class="nfl-mlb-prop-match">${esc(matchup)}</div><div class="nfl-mlb-prop-badges">${nflBadges(p)}</div><div class="nfl-mlb-prop-detail">${propCardDetail(p,v,prop).map(([l,x])=>`<span>${esc(l)}<b>${esc(x)}</b></span>`).join('')}</div></div>
    <div class="nfl-mlb-prop-market"><span>${esc(marketLabel)}</span><strong>${esc(marketMain)}</strong><small>${prop==='atd'?(v.simUsed?`TSO blend · ${Math.round((p.simIterations||0)/1000)||50}K sim + model · ${p.rz} RZ opps`:`TSO model · ${p.rz} red-zone opps`):prop==='firstTd'?(v.simUsed?`TSO first-TD model · ATD sim-informed`:`TSO first-TD model · ${p.rz} red-zone opps`):(v.simUsed?`TSO blend · ${Math.round((p.simIterations||0)/1000)||50}K sim + research · book ${fmtLine(v.line)}`:`TSO research projection ${fmtLine(v.projection)} · ${v.line!=null?`book line ${fmtLine(v.line)}`:'line pending'}`)}</small>${odds}${wager}</div>
    <div class="nfl-mlb-prop-grade">${nflGradeRingHTML(v.prob,grade,'lg')}<small>${prop==='atd'||prop==='firstTd'?'TD grade':'Over lean'}</small></div>
  </article>`;
}

function propRadar(players){
  const shown=players.slice(0,16);
  const nodes=shown.map((x,i)=>{
    const rank=i+1, ring=rank<=4?0:rank<=9?1:2, radius=[17,30,42][ring], a=(i/(shown.length))*Math.PI*2-.8;
    const xPos=50+Math.cos(a)*radius, yPos=50+Math.sin(a)*radius;
    return `<button class="ms-prop-radar-player" data-nfl-player="${esc(x.p.id)}" style="left:${xPos}%;top:${yPos}%"><b>#${rank} ${esc(x.p.name)}</b><span>${esc(x.v.main)}</span></button>`;
  }).join('');
  return `<div class="ms-prop-radar"><div class="ms-prop-radar-ring r1"></div><div class="ms-prop-radar-ring r2"></div><div class="ms-prop-radar-ring r3"></div><div class="ms-prop-radar-core">TSO<br><small>${esc(PROPS[state.prop])}</small></div>${nodes}</div>`;
}

function propsHTML(){
  if(state.prop==='allPlayers') return propToolbar()+allPlayersHTML();
  // NFL is a weekly product. Always rank the FULL Tuesday→Monday modeled pool.
  // Sportsbook availability enriches a card; it must never hide an otherwise
  // valid weekly player just because that book has not posted the market yet.
  const pool=data().players.map(p=>({p,v:propValue(p,state.prop)})).filter(x=>x.v.main!=='—');
  const scored=pool.sort((a,b)=>b.v.prob-a.v.prob);
  const cards=scored.slice(0,20).map((x,i)=>playerCard(x.p,state.prop,i+1)).filter(Boolean).join('');
  return `${propToolbar()}<div class="ms-list-head"><span>Top 20 · ${esc(PROPS[state.prop])}</span><small>MLB-style research cards · tap a player for the full modal</small></div><div class="nfl-mlb-prop-list">${cards||'<div class="nfl-live-empty"><b>No posted/player data for this market yet.</b><span>The card will appear automatically once a sportsbook line and/or research baseline is available.</span></div>'}</div>`;
}

function allPlayersHTML(){
  let players=[...data().players];
  if(state.allSort==='primary') players.sort((a,b)=>b.prob-a.prob);
  else if(state.allSort==='firstTd') players.sort((a,b)=>(firstTdProbability(b)||0)-(firstTdProbability(a)||0));
  else if(state.allSort==='usage') players.sort((a,b)=>b.usage-a.usage);
  else if(state.allSort==='rz') players.sort((a,b)=>b.rz-a.rz);
  else players.sort((a,b)=>b.edge-a.edge);
  const cardProp=state.allSort==='firstTd'?'firstTd':'atd';
  return `<div class="ms-all-toolbar"><div class="ms-all-left"><label>Sort<select id="nflAllSort"><option value="edge" ${state.allSort==='edge'?'selected':''}>TSO Edge · high to low</option><option value="primary" ${state.allSort==='primary'?'selected':''}>Anytime TD probability</option><option value="firstTd" ${state.allSort==='firstTd'?'selected':''}>First TD probability</option><option value="usage" ${state.allSort==='usage'?'selected':''}>Snap share</option><option value="rz" ${state.allSort==='rz'?'selected':''}>Red-zone opportunities</option></select></label><label>Search<input id="nflSearch" placeholder="Player or team"></label></div><div class="ms-prop-note"><b>${players.length}</b> modeled skill players</div></div><div class="nfl-mlb-prop-list" id="nflAllList">${players.map((p,i)=>playerCard(p,cardProp,i+1)).join('')}</div>`;
}


function featuredPlayerForGame(g){
  const list=playersForGame(g);
  const poss=possessionAbbr(g);
  const offense=poss==='home'?g.home.abbr:poss==='away'?g.away.abbr:(g.away.abbr);
  return list.find(p=>p.team===offense) || list[0] || data().players[0] || FALLBACK_PLAYERS[0];
}

const TEAM_GUIDE = {
  ARI:{qb:'Kyler Murray',qbNo:'1',def:'Budda Baker',defPos:'S',defNo:'3'}, ATL:{qb:'Michael Penix Jr.',qbNo:'9',def:'Jessie Bates III',defPos:'S',defNo:'3'},
  BAL:{qb:'Lamar Jackson',qbNo:'8',def:'Kyle Hamilton',defPos:'S',defNo:'14'}, BUF:{qb:'Josh Allen',qbNo:'17',def:'Terrel Bernard',defPos:'LB',defNo:'43'},
  CAR:{qb:'Bryce Young',qbNo:'9',def:'Derrick Brown',defPos:'DT',defNo:'95'}, CHI:{qb:'Caleb Williams',qbNo:'18',def:'Montez Sweat',defPos:'EDGE',defNo:'98'},
  CIN:{qb:'Joe Burrow',qbNo:'9',def:'Trey Hendrickson',defPos:'EDGE',defNo:'91'}, CLE:{qb:'Deshaun Watson',qbNo:'4',def:'Myles Garrett',defPos:'EDGE',defNo:'95'},
  DAL:{qb:'Dak Prescott',qbNo:'4',def:'Micah Parsons',defPos:'LB',defNo:'11'}, DEN:{qb:'Bo Nix',qbNo:'10',def:'Pat Surtain II',defPos:'CB',defNo:'2'},
  DET:{qb:'Jared Goff',qbNo:'16',def:'Aidan Hutchinson',defPos:'EDGE',defNo:'97'}, GB:{qb:'Jordan Love',qbNo:'10',def:'Xavier McKinney',defPos:'S',defNo:'29'},
  HOU:{qb:'C.J. Stroud',qbNo:'7',def:'Will Anderson Jr.',defPos:'EDGE',defNo:'51'}, IND:{qb:'Anthony Richardson',qbNo:'5',def:'DeForest Buckner',defPos:'DT',defNo:'99'},
  JAX:{qb:'Trevor Lawrence',qbNo:'16',def:'Josh Hines-Allen',defPos:'EDGE',defNo:'41'}, KC:{qb:'Patrick Mahomes',qbNo:'15',def:'Chris Jones',defPos:'DT',defNo:'95'},
  LA:{qb:'Matthew Stafford',qbNo:'9',def:'Jared Verse',defPos:'EDGE',defNo:'8'}, LAC:{qb:'Justin Herbert',qbNo:'10',def:'Derwin James Jr.',defPos:'S',defNo:'3'},
  LV:{qb:'Gardner Minshew',qbNo:'15',def:'Maxx Crosby',defPos:'EDGE',defNo:'98'}, MIA:{qb:'Tua Tagovailoa',qbNo:'1',def:'Jalen Ramsey',defPos:'CB',defNo:'5'},
  MIN:{qb:'J.J. McCarthy',qbNo:'9',def:'Jonathan Greenard',defPos:'EDGE',defNo:'58'}, NE:{qb:'Drake Maye',qbNo:'10',def:'Kyle Dugger',defPos:'S',defNo:'23'},
  NO:{qb:'Derek Carr',qbNo:'4',def:'Demario Davis',defPos:'LB',defNo:'56'}, NYG:{qb:'Daniel Jones',qbNo:'8',def:'Dexter Lawrence',defPos:'DT',defNo:'97'},
  NYJ:{qb:'Aaron Rodgers',qbNo:'8',def:'Sauce Gardner',defPos:'CB',defNo:'1'}, PHI:{qb:'Jalen Hurts',qbNo:'1',def:'Jalen Carter',defPos:'DT',defNo:'98'},
  PIT:{qb:'Russell Wilson',qbNo:'3',def:'T.J. Watt',defPos:'EDGE',defNo:'90'}, SEA:{qb:'Geno Smith',qbNo:'7',def:'Devon Witherspoon',defPos:'CB',defNo:'21'},
  SF:{qb:'Brock Purdy',qbNo:'13',def:'Fred Warner',defPos:'LB',defNo:'54'}, TB:{qb:'Baker Mayfield',qbNo:'6',def:'Antoine Winfield Jr.',defPos:'S',defNo:'31'},
  TEN:{qb:'Will Levis',qbNo:'8',def:'Jeffery Simmons',defPos:'DT',defNo:'98'}, WAS:{qb:'Jayden Daniels',qbNo:'5',def:'Bobby Wagner',defPos:'LB',defNo:'54'}
};

function teamGuide(abbr){ return TEAM_GUIDE[abbr] || {qb:`${abbr} QB`,qbNo:'—',def:`${abbr} DEF`,defPos:'DEF',defNo:'—'}; }

function teamLocation(t){
  const full=String(t?.fullName||'').trim();
  const short=String(t?.name||'').trim();
  if(full && short && full.toLowerCase().endsWith(short.toLowerCase())) return full.slice(0,-short.length).trim();
  const map={ARI:'ARIZONA',ATL:'ATLANTA',BAL:'BALTIMORE',BUF:'BUFFALO',CAR:'CAROLINA',CHI:'CHICAGO',CIN:'CINCINNATI',CLE:'CLEVELAND',DAL:'DALLAS',DEN:'DENVER',DET:'DETROIT',GB:'GREEN BAY',HOU:'HOUSTON',IND:'INDIANAPOLIS',JAX:'JACKSONVILLE',KC:'KANSAS CITY',LA:'LOS ANGELES',LAC:'LOS ANGELES',LV:'LAS VEGAS',MIA:'MIAMI',MIN:'MINNESOTA',NE:'NEW ENGLAND',NO:'NEW ORLEANS',NYG:'NEW YORK',NYJ:'NEW YORK',PHI:'PHILADELPHIA',PIT:'PITTSBURGH',SEA:'SEATTLE',SF:'SAN FRANCISCO',TB:'TAMPA BAY',TEN:'TENNESSEE',WAS:'WASHINGTON'};
  return map[t?.abbr]||t?.abbr||'';
}
function qbForTeam(g,abbr){
  return playersForGame(g).find(p=>p.team===abbr && p.pos==='QB') || null;
}
function safeHeadshot(p){ return p?.headshot ? `<img src="${esc(p.headshot)}" alt="">` : `<span>${esc(initials(p?.name||'TSO'))}</span>`; }
function weatherForGame(g){
  const temp=num(g.id+'temp',61,78), code=num(g.id+'wx',0,3);
  const cond=['Clear Skies','Partly Cloudy','Breezy','Light Clouds'][code]||'Clear Skies';
  const ico=cond==='Breezy'?'💨':cond.includes('Cloud')?'⛅':'☀️';
  return {temp,cond,ico};
}
function driveSummary(g){
  const d=g?.liveScore?.currentDrive;
  if(d){
    const plays=Number.isFinite(Number(d.playCount))?Number(d.playCount):(Array.isArray(d.plays)?d.plays.length:0);
    const yards=Number.isFinite(Number(d.yards))?Number(d.yards):'—';
    const time=d.elapsedDisplay||'—';
    return {plays,yards,time,real:true};
  }
  if(g?.status==='in') return {plays:'—',yards:'—',time:'—',real:false};
  return {plays:num(g.id+'plays',4,8), yards:num(g.id+'yards',34,76), time:`${num(g.id+'dm',1,3)}:${String(num(g.id+'ds',5,58)).padStart(2,'0')}`,real:false};
}
function scoringChance(g){
  const live=g.liveScore||{}; const dist=Number(live.distance); const y=Number(live.yardFromOwn);
  let base=48;
  if(Number.isFinite(y)) base += (y-50)*0.52;
  if(Number.isFinite(dist)) base += (10-Math.min(dist,18))*1.4;
  if(live.isRedZone) base += 14;
  const pct=clamp(Math.round(base),18,84);
  const label=pct>=68?'Good Chance':pct>=52?'Fair Chance':'Long Shot';
  return {pct,label};
}
function playersForGame(g){
  ensurePlayerIndexes();
  const gameId=String(g?.__sourceGameId||g?.id||'');
  const indexed=_playersByGame.get(gameId);
  if(indexed) return indexed;
  return data().players.filter(p=>String(p.gameId)===gameId);
}
function keyTargetsForGame(g){
  const list=playersForGame(g);
  const poss=possessionAbbr(g);
  const offense=poss==='home'?g.home.abbr:poss==='away'?g.away.abbr:g.away.abbr;
  const filtered=list.filter(p=>p.team===offense);
  return (filtered.length?filtered:list).slice(0,3);
}
function playerLine(p,i=0){
  if(!p) return {a:'REC',b:'YDS',c:'TD',v1:6+i,v2:num((p?.name||'p')+'yd',42,112),v3:num((p?.name||'p')+'td',0,2)};
  if(['RB','HB'].includes(p.pos)) return {a:'CAR',b:'YDS',c:'TD',v1:num(p.name+'car',9,18),v2:num(p.name+'ry',44,108),v3:num(p.name+'rtd',0,2)};
  if(['QB'].includes(p.pos)) return {a:'COMP',b:'YDS',c:'TD',v1:`${num(p.name+'cmp',12,24)}/${num(p.name+'att',18,34)}`,v2:num(p.name+'py',148,322),v3:num(p.name+'ptd',0,3)};
  return {a:'REC',b:'YDS',c:'TD',v1:num(p.name+'rec',4,9),v2:num(p.name+'yd',38,119),v3:num(p.name+'td',0,2)};
}
function livePlayerLine(g,p,i=0){
  const ps=g?.liveScore?.playerStats; if(!ps||!p) return playerLine(p,i);
  const byId=ps.byId||{},byName=ps.byName||{};
  const row=(p.espnId&&byId[String(p.espnId)]) || byId[String(p.id)] || byName[`${p.team}|${String(p.name).toLowerCase()}`];
  if(!row) return g?.status==='in' ? (['QB'].includes(p.pos)?{a:'COMP',b:'YDS',c:'TD',v1:'—',v2:'—',v3:'—'}:['RB','HB'].includes(p.pos)?{a:'CAR',b:'YDS',c:'TD',v1:'—',v2:'—',v3:'—'}:{a:'REC',b:'YDS',c:'TD',v1:'—',v2:'—',v3:'—'}) : playerLine(p,i);
  const f=row.flat||{};
  if(['QB'].includes(p.pos)) return {a:'COMP',b:'YDS',c:'TD',v1:f.compAtt??'0/0',v2:f.passYds??0,v3:f.passTds??0,real:true};
  if(['RB','HB'].includes(p.pos)) return {a:'CAR',b:'YDS',c:'TD',v1:f.carries??0,v2:f.rushYds??0,v3:f.rushTds??0,real:true};
  return {a:'REC',b:'YDS',c:'TD',v1:f.receptions??0,v2:f.recYds??0,v3:f.recTds??0,real:true};
}
function offenseContext(g){
  const poss=possessionAbbr(g);
  const offense=poss==='home'?g.home:g.away;
  const defense=poss==='home'?g.away:g.home;
  return { offense, defense, offenseGuide:teamGuide(offense.abbr), defenseGuide:teamGuide(defense.abbr), poss };
}
function playLogForGame(g){
  const real=g?.liveScore?.currentDrive?.plays;
  if(Array.isArray(real)&&real.length){
    return real.slice(-5).map((r,i,arr)=>({
      state:r.downDistanceText||downDistanceLabel(g), text:r.text||r.shortText||'Play updating',
      sub:[r.period?`Q${r.period}`:'',r.clock||'',r.team||''].filter(Boolean).join(' · '), current:i===arr.length-1
    }));
  }
  if(g?.status==='in') return [{state:downDistanceLabel(g),text:lastPlayLabel(g),sub:'Current drive feed syncing',current:true}];
  const {offense}=offenseContext(g); const p=featuredPlayerForGame(g); const targets=keyTargetsForGame(g); const ds=driveSummary(g);
  const last=lastPlayLabel(g); const fp=fieldPositionLabel(g); const dd=downDistanceLabel(g);
  const t1=targets[0]?.name||p?.name||'receiver', t2=targets[1]?.name||p?.name||'runner', t3=targets[2]?.name||p?.name||'receiver';
  return [
    {state:'1st & 10', text:`${num(g.id+'p1',7,14)} yd pass to ${t1}`, sub:`at ${fp}`},
    {state:'1st & 10', text:`${num(g.id+'p2',4,9)} yd run by ${t2.split(' ')[0]}`, sub:`Tempo pushing current drive`},
    {state:'2nd & 2', text:`${num(g.id+'p3',11,22)} yd pass to ${t3}`, sub:`Move the chains`},
    {state:'1st & 10', text:`${num(g.id+'p4',3,8)} yd rush by ${t2.split(' ')[0]}`, sub:`${ds.plays} plays · ${ds.yards} yards`},
    {state:dd, text:last, sub:'Current play', current:true},
  ];
}
function splitScore(total, played, seed){
  if(!played) return [null,null,null,null];
  const weights=Array.from({length:played},(_,i)=>1+((hash(seed+i)%90)/100));
  const sum=weights.reduce((a,b)=>a+b,0);
  const vals=weights.map(w=>Math.floor(total*w/sum));
  vals[played-1]+= total - vals.reduce((a,b)=>a+b,0);
  return [0,1,2,3].map(i=>i<played?vals[i]:null);
}
function boxScoreData(g){
  const real=g?.liveScore?.linescores;
  if(real && (Array.isArray(real.away)||Array.isArray(real.home))){
    const norm=a=>Array.from({length:4},(_,i)=>a?.[i]??null);
    return {away:norm(real.away),home:norm(real.home),played:Math.max(real.away?.length||0,real.home?.length||0),real:true};
  }
  const st=liveState(g); const played=g.status==='post'?4:Math.max(1,Math.min(4,st.period||1));
  if(g?.status==='in') return {away:[null,null,null,null],home:[null,null,null,null],played,real:false};
  return {away:splitScore(scoreNum(g.away), played, g.id+'aq'),home:splitScore(scoreNum(g.home), played, g.id+'hq'),played,real:false};
}
function teamStatsData(g){
  const real=g?.liveScore?.teamStats;
  const a=real?.[g.away.abbr],h=real?.[g.home.abbr];
  if(a||h) return {aY:a?.totalYards??'—',hY:h?.totalYards??'—',aPass:a?.passingYards??'—',hPass:h?.passingYards??'—',aRush:a?.rushingYards??'—',hRush:h?.rushingYards??'—',aTo:a?.turnovers??'—',hTo:h?.turnovers??'—',aTop:a?.timeOfPossession??'—',hTop:h?.timeOfPossession??'—',real:true};
  if(g?.status==='in') return {aY:'—',hY:'—',aPass:'—',hPass:'—',aRush:'—',hRush:'—',aTo:'—',hTo:'—',aTop:'—',hTop:'—',real:false};
  const aY=num(g.id+'ay',218,386), hY=num(g.id+'hy',192,368);
  const aPass=Math.min(aY-40,num(g.id+'ap',118,268)), hPass=Math.min(hY-40,num(g.id+'hp',112,254));
  const aRush=Math.max(28,aY-aPass), hRush=Math.max(28,hY-hPass);
  const aTo=num(g.id+'ato',0,2), hTo=num(g.id+'hto',0,2);
  const aTop=`${num(g.id+'atm',12,19)}:${String(num(g.id+'ats',0,59)).padStart(2,'0')}`;
  const hTop=`${num(g.id+'htm',10,18)}:${String(num(g.id+'hts',0,59)).padStart(2,'0')}`;
  return {aY,hY,aPass,hPass,aRush,hRush,aTo,hTo,aTop,hTop,real:false};
}
function ballLeftPct(g){ return ballFieldPct(g); }
function firstLeftPct(g){ return firstDownPct(g, ballLeftPct(g)); }
function routeTargetPct(g){ const ball=ballLeftPct(g), first=firstLeftPct(g); return clamp(first + (first>ball?10:-10), 12, 88); }

function fieldOverlayHTML(g,p){
  const ball=ballLeftPct(g)/100, first=firstLeftPct(g)/100, target=routeTargetPct(g)/100;
  const ctx=offenseContext(g), dir=target>ball?1:-1;
  const topL=208, topR=1326, botL=6, botR=1530, topY=90, botY=528;
  const topX=pct=>topL+(topR-topL)*pct, botX=pct=>botL+(botR-botL)*pct;
  const point=(pct,yf)=>({x:topX(pct)+(botX(pct)-topX(pct))*yf,y:topY+(botY-topY)*yf});
  const losA=point(ball,0), losB=point(ball,1), fdA=point(first,0), fdB=point(first,1);
  const ballPt=point(ball,.72), targetPt=point(target,.40), ctrl=point(clamp(ball+dir*.12,.08,.92),.52);
  const offDef=[];
  const off=[[-.07,.75],[-.035,.67],[0,.74],[.035,.66],[.07,.75],[-.11,.82],[-.02,.84],[.055,.83],[-.15,.88],[.11,.88]];
  const def=[[-.07,.58],[-.025,.55],[.025,.59],[.075,.55],[-.12,.62],[.12,.62],[-.045,.69],[.035,.69],[.105,.72],[-.105,.72],[-.18,.75]];
  for(const [dx,y] of def){const q=point(clamp(ball+dx,.09,.91),y);offDef.push(`<circle cx="${q.x}" cy="${q.y}" r="10" class="nxg-svg-def"/>`)}
  off.forEach(([dx,y],i)=>{const q=point(clamp(ball+dx,.09,.91),y);offDef.push(`<circle cx="${q.x}" cy="${q.y}" r="${i===1?11:10}" class="${i===1?'nxg-svg-qb':'nxg-svg-off'}"/>`)});
  const targetLabel=point(target,.37);
  const playerNo=String(p?.id||'88').slice(-2);
  return `<div class="nxg-fieldshell nxg-fieldshell-exact"><div class="nxg-stadium-exact"><div class="nxg-stadium-lights"></div><div class="nxg-stadium-crowd"></div></div><div class="nxg-nfllive"><span>🏈</span><b>NFL LIVE</b></div><div class="nxg-fieldtag">${esc(g.status==='in'?downDistanceLabel(g):'Pregame')}</div><div class="nxg-fieldart-frame"><img class="nxg-fieldart-img" src="${NFL_FIELD_ART}" alt="The Sports Outpost football field"><div class="nxg-fieldart-shade"></div><svg class="nxg-fieldsvg" viewBox="0 0 1536 600" preserveAspectRatio="none" aria-label="NFL field visualization"><defs><filter id="nxgShadow-${esc(g.id)}"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity=".42"/></filter></defs><line x1="${losA.x}" y1="${losA.y}" x2="${losB.x}" y2="${losB.y}" class="nxg-svg-los"/><line x1="${fdA.x}" y1="${fdA.y}" x2="${fdB.x}" y2="${fdB.y}" class="nxg-svg-first"/>${offDef.join('')}<path d="M ${ballPt.x} ${ballPt.y} Q ${ctrl.x} ${ctrl.y} ${targetPt.x} ${targetPt.y}" class="nxg-svg-route"/><path d="M ${ballPt.x} ${ballPt.y} Q ${point(clamp(ball+dir*.06,.08,.92),.57).x} ${point(clamp(ball+dir*.06,.08,.92),.57).y} ${point(clamp(ball+dir*.14,.08,.92),.45).x} ${point(clamp(ball+dir*.14,.08,.92),.45).y}" class="nxg-svg-route-dash"/><ellipse cx="${ballPt.x}" cy="${ballPt.y}" rx="12" ry="7" transform="rotate(-18 ${ballPt.x} ${ballPt.y})" class="nxg-svg-ball"/><g transform="translate(${targetLabel.x-44},${targetLabel.y-20})" filter="url(#nxgShadow-${esc(g.id)})"><rect width="88" height="40" rx="10" fill="#071a3b" stroke="#258cff" stroke-width="1.4"/><circle cx="20" cy="20" r="11" fill="#1688ff"/><text x="20" y="24" text-anchor="middle" fill="#fff" font-size="9" font-weight="800">${esc((p?.team||ctx.offense.abbr).slice(0,3))}</text><text x="38" y="24" fill="#fff" font-size="11" font-weight="800">#${esc(playerNo)}</text></g></svg></div><div class="nxg-fieldlegend"><span><i class="off"></i>Offense (${esc(ctx.offense.abbr)})</span><span><i class="def"></i>Defense (${esc(ctx.defense.abbr)})</span><span><i class="los"></i>Line of Scrimmage</span><span><i class="fd"></i>First Down</span><span><i class="path"></i>Play Path</span></div></div>`;
}

function scoringChanceOverlayHTML(g){
  const sc=scoringChance(g);
  return `<section class="nxg-overlay-panel nxg-overlay-scoring"><div class="nxg-overlay-title">▲ Scoring Chance</div><div class="nxg-overlay-scoring-row"><div class="nxg-gauge nxg-gauge-sm" style="--p:${sc.pct}"><b>${sc.pct}%</b></div><div class="nxg-chancecopy nxg-overlay-copy"><strong>${esc(sc.label)}</strong><span>Based on field position, down and distance, possession, and live game state.</span></div></div></section>`;
}
function currentDriveOverlayHTML(g){
  const ds=driveSummary(g), offense=offenseContext(g).offense, log=playLogForGame(g).slice(0,5);
  return `<section class="nxg-overlay-panel nxg-overlay-drive"><div class="nxg-overlay-title">◉ Current Drive</div><div class="nxg-overlay-meta">${teamLogo(offense)}<span>${esc(offense.abbr)}</span><span>•</span><span>${ds.plays} plays</span><span>•</span><span>${ds.yards} yards</span><span>•</span><span>${ds.time}</span></div><div class="nxg-overlay-plays">${log.map(r=>`<div class="nxg-overlay-play ${r.current?'current':''}"><i></i><div><small>${esc(r.state)}${r.sub?` · ${esc(r.sub)}`:''}</small><span>${esc(r.text)}</span></div></div>`).join('')}</div></section>`;
}
function driveMetricsOverlayHTML(g){
  const ds=driveSummary(g); const yfo=Number(g?.liveScore?.yardFromOwn); const left=Number.isFinite(yfo)?Math.max(0,100-Math.round(yfo)):num(g.id+'left',18,73); const start=fieldPositionLabel(g);
  return `<section class="nxg-overlay-panel nxg-overlay-metrics"><div class="nxg-overlay-title">▣ Drive Metrics</div><div class="nxg-overlay-metric-grid"><div><b>${ds.yards}</b><span>Yards</span></div><div><b>${ds.time}</b><span>Time</span></div><div><b>${ds.plays}</b><span>Plays</span></div><div><b>${left}</b><span>Yds to go</span><small>${esc(start)}</small></div></div></section>`;
}
function playersWatchOverlayHTML(g){
  const watch=keyTargetsForGame(g).slice(0,3);
  return `<section class="nxg-overlay-panel nxg-overlay-watch"><div class="nxg-overlay-title">✦ Players to Watch</div><div class="nxg-overlay-watch-list">${watch.map((p,i)=>{ const line=livePlayerLine(g,p,i); const head=p?.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p?.name||'TSO'))}</span>`; return `<div class="nxg-overlay-watch-row"><div class="nxg-avatar nxg-overlay-watch-avatar">${head}</div><div class="nxg-overlay-watch-copy"><b>${esc(p.name)}</b><small>${esc(p.pos)}${p.research?.jersey?` #${esc(p.research.jersey)}`:''}</small></div><div class="nxg-overlay-watch-stats"><div><b>${esc(line.v1)}</b><span>${line.a}</span></div><div><b>${esc(line.v2)}</b><span>${line.b}</span></div><div><b>${esc(line.v3)}</b><span>${line.c}</span></div></div></div>`;}).join('')}</div></section>`;
}
function teamIntelOverlayHTML(g){
  const s=teamStatsData(g);
  const rows=[
    ['Total Yards',s.aY,s.hY],['Passing',s.aPass,s.hPass],['Rushing',s.aRush,s.hRush],['Turnovers',s.aTo,s.hTo],['Possession',s.aTop,s.hTop]
  ];
  return `<section class="nxg-overlay-panel"><div class="nxg-overlay-title">▤ Team Snapshot</div><div class="nxg-intel-team"><div class="label">Metric</div><div class="team">${teamLogo(g.away)}<span>${esc(g.away.abbr)}</span></div><div class="team">${teamLogo(g.home)}<span>${esc(g.home.abbr)}</span></div>${rows.map(([label,a,h])=>`<div class="label">${esc(label)}</div><div class="value">${esc(a)}</div><div class="value">${esc(h)}</div>`).join('')}</div></section>`;
}
function gameIntelDockHTML(g){
  const id=String(g.id), open=String(state.intelOpenGame||'')===id;
  if(!open) return `<div class="nxg-intel-mobile-launch"><button type="button" data-nfl-intel-toggle="${esc(id)}">▦ Game Intel</button></div>`;
  const tab=state.intelTabs[id]||'drive';
  const content=tab==='scoring'?scoringChanceOverlayHTML(g):tab==='players'?playersWatchOverlayHTML(g):tab==='team'?teamIntelOverlayHTML(g):currentDriveOverlayHTML(g);
  const tabs=[['drive','Drive'],['scoring','Scoring'],['players','Players'],['team','Team']];
  return `<div class="nxg-intel-mobile-launch"><button type="button" data-nfl-intel-toggle="${esc(id)}">▦ Hide Game Intel</button></div><div class="nxg-intel-backdrop" data-nfl-intel-toggle="${esc(id)}"></div><section class="nxg-intel-dock" aria-label="Game Intel"><div class="nxg-intel-head"><div class="nxg-intel-title"><i></i><span>Game Intel</span><button type="button" class="nxg-intel-close" data-nfl-intel-toggle="${esc(id)}" aria-label="Close Game Intel">×</button></div><div class="nxg-intel-tabs">${tabs.map(([key,label])=>`<button type="button" class="nxg-intel-tab ${tab===key?'active':''}" data-nfl-intel-tab="${key}" data-nfl-intel-game="${esc(id)}">${label}</button>`).join('')}</div></div><div class="nxg-intel-body">${content}</div></section>`;
}

function v883bPlayYards(text){
  const s=String(text||'');
  if(/no gain|two-minute warning|end of quarter|timeout/i.test(s)) return 0;
  const loss=s.match(/loss of\s+(\d+)\s+yards?/i);
  if(loss) return -Number(loss[1]);
  const m=s.match(/(?:for|gain(?:s|ed)?|penalty[, ]+)\s+(-?\d+)\s+yards?/i) || s.match(/(-?\d+)\s+yard(?:s)?\b/i);
  return m?Number(m[1]):0;
}
function v883bPlayTitle(play,text){
  const s=String(text||play?.text||''); const y=Math.abs(v883bPlayYards(s));
  if(/two-minute warning/i.test(s)) return 'Two-minute warning';
  if(/timeout/i.test(s)) return 'Timeout';
  if(/penalty|false start|holding|offside|encroachment/i.test(s)) return y?`${y}-Yard Penalty`:'Penalty';
  if(/intercept/i.test(s)) return 'Interception';
  if(/fumble/i.test(s)) return 'Fumble';
  if(/sack/i.test(s)) return 'Sack';
  if(/punt/i.test(s)) return 'Punt';
  if(/field goal/i.test(s)) return 'Field Goal';
  if(/touchdown/i.test(s)) return 'Touchdown';
  if(/pass|complete|incomplete/i.test(s)) return y?`${y}-Yard Pass`:'Pass';
  if(/rush|run|scramble/i.test(s)) return y?`${y}-Yard Rush`:'Rush';
  return play?.type||'Current Play';
}
function v883bPlayerForPlay(g,play){
  const text=String(play?.text||play?.shortText||g?.liveScore?.lastPlayText||'');
  const team=normNflTeam(play?.team||possessionAbbr(g)||'');
  const pool=(data().players||[]).filter(p=>String(p.gameId)===String(g.id)&&(!team||p.team===team));
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const low=norm(text);
  const afterTo=/\bpass\b|\bcomplete/i.test(text) ? norm(text.split(/\bto\b/i).slice(1).join(' to ')) : '';
  const ranked=[...pool].sort((a,b)=>String(b.name).length-String(a.name).length);
  if(afterTo){
    for(const p of ranked){const n=norm(p.name);const last=n.split(' ').at(-1)||'';if((n&&afterTo.includes(n))||(last.length>=4&&new RegExp(`\\b${last}\\b`).test(afterTo)))return p;}
  }
  for(const p of ranked){const n=norm(p.name);if(n&&low.includes(n))return p;}
  for(const p of ranked){const last=norm(p.name).split(' ').at(-1)||'';if(last.length>=4&&new RegExp(`\\b${last}\\b`).test(low))return p;}
  return featuredPlayerForGame(g);
}
function v883bWinPct(g){
  const wp=g?.liveScore?.winProbability;
  const poss=g?.liveScore?.possession;
  if(!wp||!poss) return null;
  const v=Number(wp[poss]);
  if(!Number.isFinite(v)) return null;
  return Math.round((v<=1?v*100:v)*10)/10;
}

// Yard positions inside the PLAYABLE 100-yard field only. End zones are separate
// DOM regions, so LOS / first-down / play-path overlays can never spill into them.
function v883bPlayableYard(g){
  const live=g?.liveScore||{};
  const y=Number(live.yardFromOwn);
  if(!Number.isFinite(y)||!live.possession) return 50;
  const fromOwn=clamp(y,0,100);
  return live.possession==='home' ? 100-fromOwn : fromOwn;
}
function v883bFirstDownYard(g){
  const live=g?.liveScore||{};
  const ball=v883bPlayableYard(g);
  const dist=Number(live.distance);
  if(!Number.isFinite(dist)) return ball;
  const dir=live.possession==='home'?-1:1;
  return clamp(ball+dir*clamp(dist,0,30),0,100);
}
function v883bPlayStartYard(g,ball){
  const last=(g?.liveScore?.plays||[]).at(-1);
  const yards=v883bPlayYards(last?.text||g?.liveScore?.lastPlayText||'');
  const dir=g?.liveScore?.possession==='home'?-1:1;
  return clamp(ball-dir*yards,0,100);
}
function v883bPathStyle(start,end){
  const left=Math.min(start,end),width=Math.max(.8,Math.abs(end-start));
  return `left:${left}%;width:${width}%;`;
}
function v883bFieldNumbers(){
  return ['10','20','30','40','50','40','30','20','10'].map(v=>`<span>${v}</span>`).join('');
}

const V884_TEAM_COLORS={
  ARI:['#97233F','#000000'],ATL:['#A71930','#000000'],BAL:['#241773','#111111'],BUF:['#00338D','#C60C30'],CAR:['#0085CA','#101820'],CHI:['#0B162A','#C83803'],CIN:['#FB4F14','#000000'],CLE:['#311D00','#FF3C00'],DAL:['#003594','#041E42'],DEN:['#FB4F14','#002244'],DET:['#0076B6','#B0B7BC'],GB:['#203731','#FFB612'],HOU:['#03202F','#A71930'],IND:['#002C5F','#A2AAAD'],JAX:['#006778','#101820'],KC:['#E31837','#FFB81C'],LV:['#000000','#A5ACAF'],LAC:['#0080C6','#FFC20E'],LA:['#003594','#FFA300'],MIA:['#008E97','#FC4C02'],MIN:['#4F2683','#FFC62F'],NE:['#002244','#C60C30'],NO:['#D3BC8D','#101820'],NYG:['#0B2265','#A71930'],NYJ:['#125740','#FFFFFF'],PHI:['#004C54','#A5ACAF'],PIT:['#101820','#FFB612'],SF:['#AA0000','#B3995D'],SEA:['#002244','#69BE28'],TB:['#D50A0A','#34302B'],TEN:['#0C2340','#4B92DB'],WAS:['#5A1414','#FFB612']
};
function v884EndzoneStyle(abbr){
  const [a,b]=V884_TEAM_COLORS[String(abbr||'').toUpperCase()]||['#0d3e75','#092a52'];
  return `--ez-primary:${a};--ez-secondary:${b};`;
}
function v884MarkerLeft(yard){return `clamp(16px, ${clamp(Number(yard)||0,0,100)}%, calc(100% - 16px))`;}

function fieldOverlayLiveRedesignHTML(g,p){
  const live=g?.status==='in';
  const ball=v883bPlayableYard(g), first=v883bFirstDownYard(g), start=v883bPlayStartYard(g,ball);
  const ctx=offenseContext(g), ds=driveSummary(g), last=(g?.liveScore?.plays||[]).at(-1)||null;
  const playText=last?.text||lastPlayLabel(g), playTitle=v883bPlayTitle(last,playText), playPlayer=v883bPlayerForPlay(g,last), line=livePlayerLine(g,playPlayer,0), wp=v883bWinPct(g);
  const yards=v883bPlayYards(playText), pathLeft=start>ball?' is-left':'';
  const head=playPlayer?.headshot?`<img src="${esc(playPlayer.headshot)}" alt="">`:`<span>${esc(initials(playPlayer?.name||ctx.offense.abbr))}</span>`;
  const phase=g.status==='post'?(liveState(g).period>=5?'FINAL / OT':'FINAL'):live?downDistanceLabel(g):'PREGAME';
  const awayLogo=g.away.logo?`<img src="${esc(g.away.logo)}" alt="${esc(g.away.name)}">`:'';
  const homeLogo=g.home.logo?`<img src="${esc(g.home.logo)}" alt="${esc(g.home.name)}">`:'';
  return `<section class="nxg-live-stage tso-espn-drive tso-espn-drive-v883b" data-v883b-drive data-game-id="${esc(g.id)}"><div class="tso-espn-drive-card">
    <div class="tso-drive-head"><div class="tso-drive-titlewrap">${ctx.offense.logo?`<img class="tso-drive-teamlogo" src="${esc(ctx.offense.logo)}" alt="">`:''}<div><div class="tso-drive-title">Current Drive</div><div class="tso-drive-summary" data-v883b-drive-summary>${esc(ds.plays)} plays, ${esc(ds.yards)} yards, ${esc(ds.time)}</div></div></div><button class="tso-drive-expand" type="button" aria-label="Drive view">↗</button></div>
    <div class="tso-drive-rule"></div>
    <div class="tso-play-state"><div class="tso-play-kind" data-v883b-play-kind>${esc(playTitle)}</div><div class="tso-situation"><div><span>Down:</span><strong data-v883b-down>${esc(downDistanceLabel(g))}</strong></div><div><span>Ball on:</span><strong data-v883b-ball-label>${esc(fieldPositionLabel(g))}</strong></div></div></div>

    <div class="tso-3d-field-stage" data-v883b-field>
      <div class="tso-3d-stadium-glow"></div>
      <div class="tso-3d-field-plane">
        <div class="tso-3d-endzone away" data-team="${esc(g.away.abbr)}" style="${v884EndzoneStyle(g.away.abbr)}">${awayLogo}<span>${esc(g.away.name)}</span></div>
        <div class="tso-3d-playable">
          <div class="tso-3d-grid"></div>
          <div class="tso-3d-hash top"></div><div class="tso-3d-hash bottom"></div>
          <div class="tso-3d-los" data-v883b-los style="left:${ball}%"></div>
          <div class="tso-3d-first" data-v883b-first style="left:${first}%"></div>
          <div class="tso-3d-path${pathLeft}" data-v883b-path style="${v883bPathStyle(start,ball)}"></div>
          <div class="tso-3d-ball" data-v883b-ball style="left:${v884MarkerLeft(ball)}"><span>🏈</span></div>
          <div class="tso-3d-yards" data-v883b-yards style="left:${v884MarkerLeft(clamp(ball+3,4,96))}">${yards>0?'+':''}${yards} Yds</div>
          <div class="tso-3d-yardnumbers top">${v883bFieldNumbers()}</div>
          <div class="tso-3d-yardnumbers bottom">${v883bFieldNumbers()}</div>
        </div>
        <div class="tso-3d-endzone home" data-team="${esc(g.home.abbr)}" style="${v884EndzoneStyle(g.home.abbr)}">${homeLogo}<span>${esc(g.home.name)}</span></div>
      </div>
      <div class="tso-3d-field-legend"><span><i class="los"></i>Line of Scrimmage</span><span><i class="fd"></i>First Down</span><span><i class="path"></i>Play Path</span></div>
    </div>

    <div class="tso-play-card"><div><h3 data-v883b-play-title>${esc(playTitle)}</h3><p data-v883b-play-text>${esc(playText||'Live play information is updating.')}</p></div><div class="tso-play-side"><div class="tso-win-pct">Win % <strong data-v883b-win>${wp==null?'—':`${esc(ctx.offense.abbr)} ${wp}%`}</strong></div><div class="tso-last-tag">Last Play</div></div></div>
    <div class="tso-play-player"><div class="tso-play-player-photo" data-v883b-player-photo>${head}</div><div class="tso-play-player-copy"><b data-v883b-player-name>${esc(playPlayer?.name||'Live Player')}</b><span data-v883b-player-meta>${esc(playPlayer?.team||ctx.offense.abbr)} · ${esc(playPlayer?.pos||'Player')}</span></div><div class="tso-play-player-stats"><div><b data-v883b-stat1>${esc(line.v1)}</b><span data-v883b-stat1-label>${esc(line.a)}</span></div><div><b data-v883b-stat2>${esc(line.v2)}</b><span data-v883b-stat2-label>${esc(line.b)}</span></div><div><b data-v883b-stat3>${esc(line.v3)}</b><span data-v883b-stat3-label>${esc(line.c)}</span></div></div></div>
    <div class="tso-drive-footerline" data-v883b-footer>${esc(phase)} · ${esc(ctx.offense.abbr)} possession${ds.result?` · ${esc(ds.result)}`:''}</div>
  </div></section>`;
}

function patchLiveGamecastDOM(root,g){
  if(!root||!g||!state.game||state.gamecastTab!=='game') return false;
  const drive=root.querySelector('[data-v883b-drive]');
  const scorebar=root.querySelector('.nxg-scorebar');
  if(!drive||!scorebar) return false;

  // Kill any stale v88.3 floating possession pill from a previously cached bundle.
  root.querySelectorAll('#tso-nfl-possession-pill').forEach(el=>el.remove());

  const st=liveState(g),ctx=offenseContext(g),ball=v883bPlayableYard(g),first=v883bFirstDownYard(g),start=v883bPlayStartYard(g,ball),ds=driveSummary(g),last=(g?.liveScore?.plays||[]).at(-1)||null;
  const playText=last?.text||lastPlayLabel(g),playTitle=v883bPlayTitle(last,playText),playPlayer=v883bPlayerForPlay(g,last),line=livePlayerLine(g,playPlayer,0),wp=v883bWinPct(g),yards=v883bPlayYards(playText);
  const set=(sel,val)=>{const el=root.querySelector(sel);if(el&&el.textContent!==String(val))el.textContent=String(val)};
  set('[data-v883a-away-score]',scoreNum(g.away));set('[data-v883a-home-score]',scoreNum(g.home));set('[data-v883a-period]',st.q||'LIVE');set('[data-v883a-clock]',st.clock||'');
  set('[data-v883a-situation-primary]',downDistanceLabel(g));set('[data-v883a-situation-secondary]',fieldPositionLabel(g));set('[data-v883a-posstext]',ctx.poss?`${ctx.offense.abbr} has the ball`:'Possession updating');

  root.querySelectorAll('[data-v883a-possession-football],[data-v883b-possession-football],[data-v884-possession-football]').forEach(el=>el.remove());
  if(ctx.poss){
    const name=root.querySelector(`[data-v883a-team-name="${ctx.poss}"],[data-v883b-team-name="${ctx.poss}"]`);
    if(name){
      const icon=document.createElement('span');icon.dataset.v884PossessionFootball='1';icon.className='tso-possession-football';icon.textContent='🏈';
      if(ctx.poss==='home') name.prepend(icon); else name.append(icon);
    }
  }

  set('[data-v883b-drive-summary]',`${ds.plays} plays, ${ds.yards} yards, ${ds.time}`);set('[data-v883b-play-kind]',playTitle);set('[data-v883b-down]',downDistanceLabel(g));set('[data-v883b-ball-label]',fieldPositionLabel(g));set('[data-v883b-play-title]',playTitle);set('[data-v883b-play-text]',playText||'Live play information is updating.');set('[data-v883b-win]',wp==null?'—':`${ctx.offense.abbr} ${wp}%`);set('[data-v883b-player-name]',playPlayer?.name||'Live Player');set('[data-v883b-player-meta]',`${playPlayer?.team||ctx.offense.abbr} · ${playPlayer?.pos||'Player'}`);set('[data-v883b-stat1]',line.v1);set('[data-v883b-stat1-label]',line.a);set('[data-v883b-stat2]',line.v2);set('[data-v883b-stat2-label]',line.b);set('[data-v883b-stat3]',line.v3);set('[data-v883b-stat3-label]',line.c);set('[data-v883b-yards]',`${yards>0?'+':''}${yards} Yds`);set('[data-v883b-footer]',`${g.status==='post'?'FINAL':g.status==='in'?downDistanceLabel(g):'PREGAME'} · ${ctx.offense.abbr} possession${ds.result?` · ${ds.result}`:''}`);

  const los=root.querySelector('[data-v883b-los]'),fd=root.querySelector('[data-v883b-first]'),marker=root.querySelector('[data-v883b-ball]'),badge=root.querySelector('[data-v883b-yards]'),path=root.querySelector('[data-v883b-path]');
  if(los)los.style.left=`${ball}%`;if(fd)fd.style.left=`${first}%`;if(marker)marker.style.left=v884MarkerLeft(ball);if(badge)badge.style.left=v884MarkerLeft(clamp(ball+3,4,96));if(path){path.style.left=`${Math.min(start,ball)}%`;path.style.width=`${Math.max(.8,Math.abs(ball-start))}%`;path.classList.toggle('is-left',start>ball);}
  const photo=root.querySelector('[data-v883b-player-photo]');if(photo){const desired=playPlayer?.headshot||'';const img=photo.querySelector('img');if(desired&&(!img||img.getAttribute('src')!==desired))photo.innerHTML=`<img src="${esc(desired)}" alt="">`;else if(!desired&&!img)photo.textContent=initials(playPlayer?.name||ctx.offense.abbr);}
  return true;
}

function offenseSideHTML(g){
  const {offense, offenseGuide}=offenseContext(g); const ds=driveSummary(g); const log=playLogForGame(g);
  const qbp=qbForTeam(g,offense.abbr); const guide=qbp?{qb:qbp.name,qbNo:String(qbp.id||offenseGuide.qbNo).slice(-2)}:offenseGuide;
  const cmp=num(g.id+'cmp',12,24), att=Math.max(cmp+1,num(g.id+'att',18,31));
  const passY=num(g.id+'py',142,286), td=num(g.id+'ptd',0,3), inter=num(g.id+'int',0,2);
  return `<aside class="nxg-card nxg-sidecard"><div class="nxg-card-head"><span>${teamLogo(offense,'')} OFFENSE – ${esc(offense.abbr)}</span></div><div class="nxg-side-body"><div class="nxg-profile"><div class="nxg-avatar">${safeHeadshot(qbp||{name:guide.qb})}</div><div><b>${esc(guide.qb)}</b><span>QB #${esc(guide.qbNo)}</span></div></div><div class="nxg-mini4"><div><b>${cmp}/${att}</b><span>COMP/ATT</span></div><div><b>${passY}</b><span>PASS YDS</span></div><div><b>${td}</b><span>TD</span></div><div><b>${inter}</b><span>INT</span></div></div><div class="nxg-drivebox"><div class="nxg-subtle-head">CURRENT DRIVE</div><div class="nxg-drive-meta">${ds.plays} plays &nbsp; ${ds.yards} yards &nbsp; ${ds.time}</div><div class="nxg-playlist">${log.map(r=>`<div class="nxg-playrow ${r.current?'current':''}"><i></i><span><small>${esc(r.state)} ${r.sub?`· ${esc(r.sub)}`:''}</small>${esc(r.text)}</span></div>`).join('')}</div></div></div></aside>`;
}
function defenseSideHTML(g){
  const {defense, defenseGuide}=offenseContext(g); const look=['Nickel 3–3–5','Base 4–3','Big Nickel','Dime 4–1–6'][hash(g.id+'look')%4];
  return `<aside class="nxg-card"><div class="nxg-card-head"><span>${teamLogo(defense,'')} Defense – ${esc(defense.abbr)}</span><img src="${defense.logo||''}" alt=""></div><div class="nxg-side-body"><div class="nxg-profile"><div class="nxg-avatar nxg-team-avatar">${defense.logo?`<img src="${esc(defense.logo)}" alt="">`:`<span>${esc(defense.abbr)}</span>`}</div><div><b>${esc(defenseGuide.def)}</b><span>${esc(defenseGuide.defPos)} #${esc(defenseGuide.defNo)}</span></div></div><div class="nxg-mini4"><div><b>${num(g.id+'tkl',2,7)}</b><span>TKL</span></div><div><b>${num(g.id+'tfl',0,2)}</b><span>TFL</span></div><div><b>${num(g.id+'sk',0,2)}</b><span>SACK</span></div><div><b>${num(g.id+'hit',1,5)}</b><span>QB Hits</span></div></div></div><div class="nxg-deflookcopy"><div class="nxg-subtle-head">Defensive Look</div><b>${look}</b><div>${num(defense.abbr+'man',31,48)}% man &nbsp;•&nbsp; ${num(defense.abbr+'blitz',18,34)}% blitz &nbsp;•&nbsp; ${num(defense.abbr+'rz',18,32)}% red-zone TD allowed</div></div><div class="nxg-defense-grid"><span class="l1">S</span><span class="l2">S</span><span class="m1">CB</span><span class="m2">LB</span><span class="m3">LB</span><span class="m4">LB</span><span class="m5">CB</span><span class="b1">DE</span><span class="b2">DT</span><span class="b3">DT</span><span class="b4">DE</span></div></aside>`;
}
function lastPlayPanelHTML(g){
  return `<section class="nxg-card"><div class="nxg-card-head"><span>⟳ Last Play</span></div><div class="nxg-card-pad"><div class="nxg-lastmeta">${teamLogo(offenseContext(g).offense,'')}<span>${esc(downDistanceLabel(g))} at ${esc(fieldPositionLabel(g))}</span><small style="margin-left:auto">${num(g.id+'ago',8,24)} sec ago</small></div><div class="nxg-bodytext">${esc(lastPlayLabel(g))}</div></div></section>`;
}
function scoringChancePanelHTML(g){
  const sc=scoringChance(g);
  return `<section class="nxg-card"><div class="nxg-card-head"><span>◔ Scoring Chance</span></div><div class="nxg-card-pad"><div class="nxg-gaugewrap"><div class="nxg-gauge" style="--p:${sc.pct}"><b>${sc.pct}%</b></div><div class="nxg-chancecopy"><strong>${esc(sc.label)}</strong><span>Based on field position, down and distance, possession, and live game state.</span></div></div></div></section>`;
}
function playerWatchPanelHTML(g,p){
  const line=playerLine(p); const head=p?.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p?.name||'TSO'))}</span>`;
  return `<section class="nxg-card"><div class="nxg-card-head"><span>✦ Player to Watch</span></div><div class="nxg-card-pad"><div class="nxg-watch"><div class="nxg-avatar">${head}</div><div><b>${esc(p?.name||'Featured Player')}</b><small>${esc(p?.pos||'WR')} #${esc(String((p?.id||'14')).slice(-2))}</small></div><div class="nxg-watchstats"><div><b>${line.v1}</b><span>${line.a}</span></div><div><b>${line.v2}</b><span>${line.b}</span></div><div><b>${line.v3}</b><span>${line.c}</span></div></div></div><div class="nxg-watch-note">Big-play threat · ${num((p?.name||g.id)+'yac',11,19)}.${num((p?.name||g.id)+'ypc',0,9)} YPC tonight · ${Math.round((p?.prob||0)*100)}% ATD · ${Math.round((firstTdProbability(p)||0)*100)}% First TD.</div></div></section>`;
}
function driveMetricsPanelHTML(g){
  const ds=driveSummary(g); const yfo=Number(g?.liveScore?.yardFromOwn); const start=fieldPositionLabel(g); const left=Number.isFinite(yfo)?Math.max(0,100-Math.round(yfo)):num(g.id+'left',18,73);
  return `<section class="nxg-card"><div class="nxg-card-head"><span>▣ Drive Metrics</span></div><div class="nxg-card-pad"><div class="nxg-drive-metrics"><div class="nxg-metric3"><div><b>${ds.yards}</b><span>Yards</span></div><div><b>${ds.time}</b><span>Time</span></div><div><b>${ds.plays}</b><span>Plays</span></div></div><div class="nxg-drivebar"><i style="width:${clamp(100-left,12,94)}%"></i></div><div class="nxg-drivebarcopy"><span>${esc(start)}</span><span>${left} yds to go</span><span>${esc(offenseContext(g).defense.abbr)} 0</span></div></div></div></section>`;
}
function bottomPanelsHTML(g){
  const box=boxScoreData(g), stats=teamStatsData(g), keys=keyTargetsForGame(g), awayRows=box.away.map(v=>v==null?'–':v), homeRows=box.home.map(v=>v==null?'–':v);
  return `<div class="nxg-bottom"><section class="nxg-card"><div class="nxg-card-head"><span>☷ Box Score</span></div><div class="nxg-card-pad"><table class="nxg-table"><thead><tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>T</th></tr></thead><tbody><tr><td><div class="nxg-rowteam">${teamLogo(g.away)}<span>${esc(g.away.name)}</span></div></td>${awayRows.map(v=>`<td>${v}</td>`).join('')}<td><strong>${scoreNum(g.away)}</strong></td></tr><tr><td><div class="nxg-rowteam">${teamLogo(g.home)}<span>${esc(g.home.name)}</span></div></td>${homeRows.map(v=>`<td>${v}</td>`).join('')}<td><strong>${scoreNum(g.home)}</strong></td></tr></tbody></table></div></section><section class="nxg-card"><div class="nxg-card-head"><span>≣ Team Stats</span></div><div class="nxg-card-pad"><div class="nxg-teamstats"><img class="logo" src="${esc(g.away.logo||'')}" alt=""><div class="nxg-teamstats-grid"><b>${stats.aY}</b><span>Total Yards</span><em>${stats.hY}</em><b>${stats.aPass}</b><span>Passing Yards</span><em>${stats.hPass}</em><b>${stats.aRush}</b><span>Rushing Yards</span><em>${stats.hRush}</em><b>${stats.aTo}</b><span>Turnovers</span><em>${stats.hTo}</em><b>${stats.aTop}</b><span>Time of Possession</span><em>${stats.hTop}</em></div><img class="logo" src="${esc(g.home.logo||'')}" alt=""></div></div></section><section class="nxg-card"><div class="nxg-card-head"><span>➤ Due Up – Key Targets</span><small style="color:#fff">${esc(offenseContext(g).offense.abbr)}</small></div><div class="nxg-card-pad"><div class="nxg-targets">${keys.map((p,i)=>{const line=playerLine(p,i); return `<div class="nxg-targetrow"><strong>${i+1}</strong><div class="nxg-avatar">${p.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p.name))}</span>`}</div><div><b>${esc(p.name)}</b><small>${esc(p.pos)} #${esc(String(p.id||'14').slice(-2))}</small></div><span>${line.v1} ${line.a}</span><span>${line.v2} ${line.b}</span><span>${line.v3} ${line.c}</span></div>`;}).join('')}</div></div></section></div>`;
}

function boxSectionTitle(section){
  const raw=String(section?.displayName||section?.label||section?.name||'Statistics');
  return raw.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\bdefensive\b/i,'Defense').replace(/\bpassing\b/i,'Passing').replace(/\brushing\b/i,'Rushing').replace(/\breceiving\b/i,'Receiving').replace(/\bfumbles\b/i,'Fumbles').replace(/\bkicking\b/i,'Kicking').replace(/\bpunting\b/i,'Punting').replace(/\bkick returns?\b/i,'Kick Returns').replace(/\bpunt returns?\b/i,'Punt Returns');
}
function normalizeBoxSectionsFromPlayers(g,teamAbbr){
  const ps=g?.liveScore?.playerStats;
  if(!ps?.byId) return [];
  const byCat=new Map();
  for(const row of Object.values(ps.byId)){
    if(normNflTeam(row?.team)!==normNflTeam(teamAbbr)) continue;
    for(const [name,obj] of Object.entries(row.categories||{})){
      if(!byCat.has(name)) byCat.set(name,{name,displayName:name,labels:Object.keys(obj||{}),rows:[],totals:[]});
      const sec=byCat.get(name);
      for(const k of Object.keys(obj||{})) if(!sec.labels.includes(k)) sec.labels.push(k);
      sec.rows.push({id:row.id,name:row.name,jersey:row.jersey,position:row.position,stats:sec.labels.map(k=>obj?.[k]??'—'),_obj:obj});
    }
  }
  for(const sec of byCat.values()) sec.rows=sec.rows.map(r=>({...r,stats:sec.labels.map(k=>r._obj?.[k]??'—')}));
  return [...byCat.values()];
}
function espnBoxTeamData(g,team){
  const bs=g?.liveScore?.boxScore;
  const key=normNflTeam(team?.abbr);
  if(bs?.teams?.[key]) return bs.teams[key];
  return {team:{abbr:key,name:team?.name||key,logo:team?.logo||''},sections:normalizeBoxSectionsFromPlayers(g,key)};
}
function espnBoxSectionHTML(team,section){
  const labels=Array.isArray(section?.labels)?section.labels:[];
  const rows=Array.isArray(section?.rows)?section.rows:[];
  const totals=Array.isArray(section?.totals)?section.totals:[];
  if(!labels.length || (!rows.length && !totals.length)) return '';
  const title=boxSectionTitle(section);
  const rowHtml=rows.map(r=>`<tr><td>${esc(r.name||'Player')}${r.jersey?`<span class="nxg-espn-player-no">#${esc(r.jersey)}</span>`:''}</td>${labels.map((_,i)=>`<td>${esc(r.stats?.[i]??'—')}</td>`).join('')}</tr>`).join('');
  const totalHtml=totals.length?`<tr class="team-total"><td>TEAM</td>${labels.map((_,i)=>`<td>${esc(totals[i]??'—')}</td>`).join('')}</tr>`:'';
  return `<section class="nxg-espn-section"><div class="nxg-espn-section-title">${team?.logo?`<img src="${esc(team.logo)}" alt="">`:''}<span>${esc(team?.name||team?.abbr||'Team')} ${esc(title)}</span></div><div class="nxg-espn-scroll"><table class="nxg-espn-table"><thead><tr><th></th>${labels.map(l=>`<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${rowHtml}${totalHtml}</tbody></table></div></section>`;
}
function espnBoxTeamHTML(g,team){
  const d=espnBoxTeamData(g,team);
  const sections=(d?.sections||[]).map(sec=>espnBoxSectionHTML({...team,...(d.team||{})},sec)).join('');
  return `<div class="nxg-espn-team"><div class="nxg-espn-teamtop">${teamLogo(team)}<b>${esc(teamLocation(team))} ${esc(team.name)}</b><span>${scoreNum(team)} PTS</span></div>${sections||'<div class="nxg-espn-empty" style="margin:12px">Player box-score data will populate when ESPN publishes it.</div>'}</div>`;
}
function espnCompleteBoxScoreHTML(g){
  const hasStructured=!!(g?.liveScore?.boxScore?.teams && Object.keys(g.liveScore.boxScore.teams).length);
  const hasLegacy=!!(g?.liveScore?.playerStats?.byId && Object.keys(g.liveScore.playerStats.byId).length);
  if(!hasStructured&&!hasLegacy){
    return `<div class="nxg-espn-box"><div class="nxg-espn-empty"><b>FULL BOX SCORE</b><br>Passing, rushing, receiving, fumbles, defense, returns, kicking and punting will appear here as ESPN publishes the official in-game box score.</div></div>`;
  }
  return `<div class="nxg-espn-box">${espnBoxTeamHTML(g,g.away)}${espnBoxTeamHTML(g,g.home)}<div class="nxg-espn-note">Live categories and column labels mirror the ESPN game-summary feed. Sections appear dynamically, so if ESPN adds kicking, punting, returns or additional defensive columns, The Sports Outpost displays them without a code change.</div></div>`;
}

function playByPlayHTML(g){
  const real=g?.liveScore?.plays;
  if(Array.isArray(real)&&real.length){
    const rows=real.slice(-18).reverse();
    return `<div class="nxg-pbp-list">${rows.map((r,i)=>`<article class="nxg-pbp-item"><b>${esc([r.period?`Q${r.period}`:'',r.clock||''].filter(Boolean).join(' ')||'LIVE')}</b><div><span>${esc(r.text||r.shortText||'Play updating')}</span><small>${esc(r.downDistanceText||r.type||'Live play')}${r.team?` · ${esc(r.team)}`:''}</small></div><div class="nxg-pbp-tag">${i===0?'Current Play':r.scoring?'Scoring':'Play'}</div></article>`).join('')}</div>`;
  }
  const log=playLogForGame(g); const offense=offenseContext(g).offense;
  const stamps=['Q3 12:14','Q3 10:58','Q3 09:41','Q3 08:57',`${liveState(g).q||'Q1'} ${liveState(g).clock||'15:00'}`];
  return `<div class="nxg-pbp-list">${log.map((r,i)=>`<article class="nxg-pbp-item"><b>${stamps[i]||'Q1 15:00'}</b><div><span>${esc(r.text)}</span><small>${esc(r.state)} · ${esc(offense.abbr)} offense</small></div><div class="nxg-pbp-tag">${r.current?'Current Play':'Drive'}</div></article>`).join('')}</div>`;
}


function gamecastDashboardHTML(g,p,{embedded=false,tab=null}={}){
  const wx=weatherForGame(g), st=liveState(g), ctx=offenseContext(g);
  const activeTab=tab || state.gamecastTab || 'game', live=g.status==='in';
  const dateLabel=g.startTimeUTC?new Date(g.startTimeUTC).toLocaleDateString([], {weekday:'short', month:'short', day:'numeric', year:'numeric'}):`Week ${data().week}`;
  const topLabel=live?(st.q||'LIVE'):g.status==='post'?(st.period>=5?'FINAL/OT':'FINAL'):'PREGAME';
  const displayClock=live?(st.clock||''):g.status==='post'?'':(g.time||'TBD');
  const scoreDots='<i></i><i></i><i></i>';
  const gameView=renderNflPlaystageV886HTML(g,{halftime:state.halftime});
  const boxView=`<div>${espnCompleteBoxScoreHTML(g)}<div class="nxg-footerline"><span>NFL Gamecast</span><span>Full Box Score</span><span>The Sports Outpost</span></div></div>`;
  const pbpView=`<div class="nxg-card" style="padding:14px">${playByPlayHTML(g)}</div><div class="nxg-footerline"><span>NFL Gamecast</span><span>Play by Play</span><span>The Sports Outpost</span></div>`;
  const tabButton=(id,label)=> embedded
    ? `<button type="button" class="nxg-tab ${activeTab===id?'active':''}" data-nfl-inline-game="${esc(g.id)}" data-nfl-inline-tab="${id}">${label}</button>`
    : `<button type="button" class="nxg-tab ${activeTab===id?'active':''}" data-nfl-gamecast-tab="${id}">${label}</button>`;
  const backLabel=state.tab==='live'?'Live':'Slate';
  const backTool=embedded
    ? `<button type="button" class="nxg-ghostbtn" data-nfl-slate-top>← Back to ${backLabel}</button>`
    : `<button type="button" class="nxg-ghostbtn" data-nfl-close-game>← Back to ${backLabel}</button>`;
  const statusTool=live?`<span class="nxg-livepill"><span class="dot"></span>Live <span class="nxg-livebars"><i></i><i></i><i></i></span></span>`:g.status==='post'?`<span class="nxg-livepill nxg-previewpill"><span class="dot"></span>Final</span>`:`<span class="nxg-livepill nxg-previewpill"><span class="dot"></span>Game Preview</span>`;
  const intelOpen=String(state.intelOpenGame||'')===String(g.id);
  const intelToggle=`<button type="button" class="nxg-intel-desktop-toggle ${intelOpen?'is-open':''}" data-nfl-intel-toggle="${esc(g.id)}">▦ ${intelOpen?'Hide Intel':'Game Intel'}</button>`;
  const topbar=`<div class="nxg-topbar"><div class="nxg-tabs">${tabButton('game','Game View')}${tabButton('box','Box Score')}${tabButton('pbp','Play by Play')}</div><div class="nxg-tools">${statusTool}${intelToggle}<button type="button" class="nxg-feedpill" data-nfl-gamecast-feed>TD Feed</button><button type="button" class="nxg-dotbtn" data-nfl-refresh-live title="Refresh live data">↻</button>${backTool}</div></div>`;
  const situationPrimary=live?downDistanceLabel(g):g.status==='post'?'FINAL':'Pregame';
  const situationSecondary=live?fieldPositionLabel(g):g.status==='post'?(st.period>=5?'Overtime Complete':'Game Complete'):(g.time||'Kickoff');
  const situationArrow=live?'<span class="arr">▲</span>':'';
  const scorebar=`<section class="nxg-scorebar ${live?'is-live':g.status==='post'?'is-final':'is-pregame'}"><div class="nxg-teamblock away">${teamLogo(g.away,'nxg-teamlogo')}<div class="nxg-teamcopy"><small>${esc(teamLocation(g.away))}</small><b data-v883a-team-name="away">${esc(g.away.name)}${live&&ctx.poss==='away'?'<span data-v884-possession-football class=\"tso-possession-football\">🏈</span>':''}</b><span>${esc(record(g.away))}</span></div><div class="nxg-scorebox"><div class="nxg-score" data-v883a-away-score>${scoreNum(g.away)}</div><div class="nxg-score-dots">${scoreDots}</div></div></div><div class="nxg-centerblock"><div class="nxg-clockline"><div class="nxg-period" data-v883a-period>${esc(topLabel)}</div><div class="nxg-clock" data-v883a-clock>${esc(displayClock)}</div></div><div class="nxg-downchip"><span data-v883a-situation-primary>${esc(situationPrimary)}</span><i></i><span data-v883a-situation-secondary>${esc(situationSecondary)}</span>${situationArrow}</div><div class="nxg-posstext" data-v883a-posstext>${live&&ctx.poss?`${esc(ctx.offense.abbr)} has the ball`:(g.status==='post'?'Game complete':'Kickoff preview')}</div></div><div class="nxg-teamblock home"><div class="nxg-scorebox"><div class="nxg-score" data-v883a-home-score>${scoreNum(g.home)}</div><div class="nxg-score-dots">${scoreDots}</div></div><div class="nxg-teamcopy"><small>${esc(teamLocation(g.home))}</small><b data-v883a-team-name="home">${live&&ctx.poss==='home'?'<span data-v884-possession-football class=\"tso-possession-football\">🏈</span>':''}${esc(g.home.name)}</b><span>${esc(record(g.home))}</span></div>${teamLogo(g.home,'nxg-teamlogo')}</div><div class="nxg-weather"><div class="nxg-weather-top"><span class="nxg-weather-ico">${wx.ico}</span><strong>${wx.temp}°</strong></div><small>${esc(wx.cond)}</small><span>${esc(g.venue)}</span><span>${esc(g.city||teamLocation(g.home))}</span></div></section>`;

  // Game View is the approved 1448×1086 composition.  It never switches to a
  // stacked/mobile layout; fitNflGamecastConcept uniformly scales this canvas.
  if(activeTab==='game'){
    return `<article class="nxg-wrap nxg-concept ${embedded?'nxg-embedded':''}" data-nfl-inline-gamecast="${esc(g.id)}"><div class="nxg-concept-viewport"><div class="nxg-concept-canvas">${topbar}${scorebar}${halftimeGamecastBannerHTML(g,state.halftime,data().games)}<div class="nxg-gameview-modern">${gameView}</div></div></div>${gameIntelDockHTML(g)}</article>`;
  }

  const body=activeTab==='box'?boxView:pbpView;
  return `<article class="nxg-wrap nxg-concept nxg-concept-detail ${embedded?'nxg-embedded':''}" data-nfl-inline-gamecast="${esc(g.id)}"><div class="nxg-concept-head-viewport"><div class="nxg-concept-head-canvas">${topbar}${scorebar}</div></div><div class="nxg-concept-detail-body">${body}</div></article>`;
}
function gamecastHTML(g){
  if(!g) return '';
  const p=featuredPlayerForGame(g);
  return gamecastDashboardHTML(g,p);
}

function recentBars(p){
  const logs=p?.research?.last5?.gamesLog;
  if(Array.isArray(logs)&&logs.length){
    const ordered=[...logs].reverse();
    const isQb=p.pos==='QB';
    const vals=ordered.map(g=>Number(isQb?g.passYds:g.scrimmageYds)||0); const max=Math.max(...vals,1);
    return `<div class="ms-recent-chart">${ordered.map((g,i)=>`<div><span style="height:${Math.max(5,Math.round(vals[i]/max*100))}%"></span><b>${vals[i]}</b><small>W${esc(g.week||'—')}</small></div>`).join('')}</div>`;
  }
  const vals=[0,1,2,3,4].map(i=>num(p.name+'g'+i,38,126)); const max=Math.max(...vals,1);
  return `<div class="ms-recent-chart">${vals.map((v,i)=>`<div><span style="height:${Math.round(v/max*100)}%"></span><b>${v}</b><small>G${5-i}</small></div>`).join('')}</div>`;
}

function matchupPanel(p){
  const opp=p.opp||'Opponent';
  const vals=[['Man coverage',num(p.name+'man',48,84)],['Zone coverage',num(p.name+'zone',46,82)],['Red-zone usage',num(p.name+'rzm',54,89)],['Explosive fit',num(p.name+'xp',46,86)]];
  return `<div class="ms-matchup-head"><div><span>PLAYER</span><b>${esc(p.name)}</b><small>${esc(p.pos)} · ${esc(p.team)}</small></div><section><span>TSO EDGE</span><strong>${p.edge}</strong>${signalBadge(p.edge)}</section><div class="right"><span>DEFENSE</span><b>${esc(opp)}</b><small>${p.oppRzAllowed!=null?(p.oppRzAllowed*100).toFixed(1):num(opp+'rz',18,29)}% RZ TD allowed</small></div></div><div class="ms-edge-bars">${vals.map(([l,v])=>`<div><span>${l}</span><i><em style="width:${v}%"></em></i><b>${v}</b></div>`).join('')}</div>`;
}

function routeData(p){
  return [
    {type:'REC',path:'M18 168 Q105 80 190 54',x:190,y:54,yds:num(p.name+'a',12,28),label:'Deep out'},
    {type:'REC',path:'M18 168 Q95 142 170 120',x:170,y:120,yds:num(p.name+'b',7,18),label:'Cross'},
    {type:'RZ',path:'M18 168 Q118 105 218 82',x:218,y:82,yds:num(p.name+'c',5,14),label:'RZ seam'},
    {type:'EXP',path:'M18 168 Q135 72 267 40',x:267,y:40,yds:num(p.name+'d',24,46),label:'Explosive'},
    {type:'RUSH',path:'M18 168 Q90 166 165 150',x:165,y:150,yds:num(p.name+'e',4,13),label:'Inside zone'},
    {type:'RUSH',path:'M18 168 Q98 174 208 162',x:208,y:162,yds:num(p.name+'f',6,18),label:'Outside zone'},
  ];
}

function routeMapHTML(p){
  const filter=state.mapFilter; const all=routeData(p); const shown=all.filter(r=>filter==='ALL'||r.type===filter);
  const avg=shown.length?Math.round(shown.reduce((a,r)=>a+r.yds,0)/shown.length):0;
  const rz=shown.filter(r=>r.type==='RZ').length; const exp=shown.filter(r=>r.type==='EXP').length;
  const lines=shown.map((r,i)=>`<path class="ms-route-line ${i%2?'alt':''}" d="${r.path}"/><circle class="ms-route-dot" cx="${r.x}" cy="${r.y}" r="5" fill="#fff"/>`).join('');
  return `<div class="ms-map-controls">${['ALL','REC','RUSH','RZ','EXP'].map(x=>`<button data-nfl-mapfilter="${x}" class="${x===filter?'active':''}">${x}</button>`).join('')}</div><svg class="ms-nfl-map" viewBox="0 0 300 190" preserveAspectRatio="none"><image href="${NFL_FIELD_ART}" x="0" y="0" width="300" height="190" preserveAspectRatio="xMidYMid slice"/><rect width="300" height="190" fill="rgba(4,12,28,.18)"/>${lines}<circle cx="18" cy="168" r="6" fill="#f59e0b" stroke="#fff" stroke-width="1.2"/></svg><div class="ms-route-stats"><div><span>PLAYS</span><b>${shown.length}</b></div><div><span>AVG YDS</span><b>${avg}</b></div><div><span>RZ LOOKS</span><b>${rz}</b></div><div><span>EXPLOSIVE</span><b>${exp}</b></div></div><p class="ms-filtered-note">Filters update both the route/touch trajectories and Recent Opportunities below. The same TSO stadium field used in Gamecast is used here for a consistent NFL visual language.</p>`;
}

function recentOpportunitiesHTML(p){
  const shown=routeData(p).filter(r=>state.mapFilter==='ALL'||r.type===state.mapFilter);
  return shown.map((r,i)=>`<div><b>${i+1}</b><span>${esc(r.type)} · ${esc(r.label)}</span><em>${r.yds} yds${r.type==='RZ'?' · TD look':''}</em></div>`).join('') || '<div><b>—</b><span>No opportunities in this filter</span><em>—</em></div>';
}

function researchSnapshotHTML(p){
  const r=p?.research;
  if(!r) return `<div class="nfl-research-empty">Research feed is not generated yet. The TSO model is still available; run the NFL Research Refresh workflow to populate roster, depth, injury and historical production.</div>`;
  const prev=r.previousSeason||{}, last=r.last5||{}, avg=last.avg||{}, cur=r.currentSeason||{};
  const isQb=p.pos==='QB';
  const seasonYds=isQb?(prev.passYds??'—'):(prev.scrimmageYds??'—');
  const lastYds=isQb?(avg.passYds??'—'):(avg.scrimmageYds??'—');
  const depth=r.depth?.rank?`${r.depth.position||p.pos}${r.depth.rank}`:(r.depth?.position||p.pos||'—');
  const status=r.injury?.status||r.rosterStatus||'Active';
  const injuryDetail=r.injury?.detail?`<div class="nfl-research-alert"><b>${esc(status)}</b><span>${esc(r.injury.detail)}</span></div>`:'';
  const currentYds=isQb?(cur.passYds??0):(cur.scrimmageYds??0);
  const items=[
    ['Depth',depth],['Status',status],[`${state.research?.previousSeason||'Prev'} Yards`,seasonYds],[`${state.research?.previousSeason||'Prev'} TD`,prev.totalTds??'—'],
    ['Last 5 Yds/G',lastYds],['TD Games L5',last.tdGames??'—'],['Current Yards',currentYds],['RZ Opps',p.rz??'—']
  ];
  return `${injuryDetail}<div class="ms-quality nfl-research-grid">${items.map(([l,v])=>`<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div><div class="nfl-research-source">${esc(researchFreshnessLabel())} · ESPN roster/depth/injury + nflverse production · TSO probabilities use the latest simulation blend when available</div>`;
}
function playerResearchWhy(p){
  const r=p?.research, prev=r?.previousSeason, last=r?.last5?.avg;
  if(!r) return `${esc(p.name)} combines a ${p.edge} TSO Edge with ${p.usage}% snap share and ${p.rz} red-zone opportunities against ${esc(p.opp)}.`;
  const isQb=p.pos==='QB';
  const seasonMetric=isQb?`${prev?.passYds??'—'} passing yards`:`${prev?.scrimmageYds??'—'} scrimmage yards`;
  const lastMetric=isQb?`${last?.passYds??'—'} pass yds/game`:`${last?.scrimmageYds??'—'} scrimmage yds/game`;
  const depth=r.depth?.rank?`${r.depth.position||p.pos}${r.depth.rank}`:p.pos;
  const status=r.injury?.status||r.rosterStatus||'Active';
  return `${esc(p.name)} enters this matchup as ${esc(depth)} (${esc(status)}) with a ${p.edge} TSO Edge. The research baseline adds ${esc(seasonMetric)} from the previous season and ${esc(lastMetric)} over the latest five available games, alongside ${p.usage}% modeled snap share and ${p.rz} red-zone opportunities. TSO probabilities blend the existing model/research signal with the latest correlated simulation when available; roster, depth, injury and historical production remain source-backed research inputs.`;
}

function playerModal(p){
  if(!p) return '';
  const quality=[['Snap Share',`${p.usage}%`],['RZ Opps',`${p.rz}`],['Explosive %',`${p.explosive}%`],['Route/Touch Edge',`${num(p.name+'route',56,86)}`]];
  const atd=propValue(p,'atd'), first=propValue(p,'firstTd');
  const scoring=[['Anytime TD',atd.main],['First TD',first.main],['RZ Opportunities',`${p.rz}`],['TSO Edge',`${p.edge}`]];
  return `<div class="ms-modal-backdrop" data-nfl-close-modal><div class="ms-modal" onclick="event.stopPropagation()"><button class="ms-modal-x" data-nfl-close-modal>×</button><header><div class="ms-avatar big">${p.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p.name))}</span>`}</div><div><div class="ms-modal-name"><h2>${esc(p.name)}</h2>${signalBadge(p.edge)}</div><p>${esc(p.team)} · ${esc(p.pos)} · vs ${esc(p.opp)}</p></div><section><span>TSO EDGE</span><strong>${p.edge}</strong><small>${p.edge>=60?'Strong matchup':'Balanced matchup'}</small></section></header><div class="ms-modal-body"><div class="ms-sec"><div class="ms-sec-title">Gameday Research</div>${researchSnapshotHTML(p)}</div><div class="ms-sec"><div class="ms-sec-title">Scoring Outlook</div><div class="ms-quality">${scoring.map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div></div><div class="ms-sec"><div class="ms-sec-title">Recent Games</div>${recentBars(p)}</div><div class="ms-sec"><div class="ms-sec-title">Usage & Efficiency</div><div class="ms-quality">${quality.map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div></div><div class="ms-sec"><div class="ms-sec-title">Matchup Mix</div>${matchupPanel(p)}</div><div class="ms-sec"><div class="ms-sec-title">Route / Touch Map <small style="color:var(--mute);font-weight:600">Illustrative until tracking data is connected</small></div><div id="nflMapHost">${routeMapHTML(p)}</div></div><div class="ms-sec"><div class="ms-sec-title">Recent Opportunities</div><div class="ms-recent-list">${recentOpportunitiesHTML(p)}</div></div><div class="ms-sec"><div class="ms-sec-title">Why</div><p class="ms-why">${playerResearchWhy(p)}</p></div></div></div></div>`;
}

function contentHTML(){
  if(state.game){ const g=gameForId(state.game); return gamecastHTML(g); }
  if(state.tab==='radar') return gameRadarHTML();
  if(state.tab==='slate') return slateHTML();
  if(state.tab==='live') return liveHTML();
  if(state.tab==='feed') return feedHTML();
  if(state.tab==='players') return allPlayersHTML();
  if(state.tab==='foryou') return '<div id="nflForYouHost"></div>';
  return propsHTML();
}

function render(){
  const root=document.getElementById('nflView'); if(!root) return;
  window.DW_nflPreviewTab=state.tab;
  document.querySelectorAll('#nflSideNav [data-nfl-tab]').forEach(btn=>btn.classList.toggle('is-active', btn.dataset.nflTab===state.tab));
  root.style.setProperty('--ms-accent','#f59e0b'); root.style.setProperty('--ms-accent2','#fbbf24');
  const p=state.player?data().players.find(x=>String(x.id)===String(state.player)):null;
  root.innerHTML=`${headerHTML()}<div class="ms-content">${contentHTML()}</div>${p?playerModal(p):''}<footer class="ms-preview-foot"><b>NFL Research + Simulation + Live Engine.</b> v88 blends the existing TSO model/research lean with the latest correlated Monte Carlo result when the sportsbook line matches the simulated line. Automatic 50K runs publish at key pregame checkpoints and halftime; live state continues through the low-latency NFL endpoint. Route/player tracking remains illustrative.</footer>`;
  wire(root);
  fitNflGamecastConcept(root);
  if(state.tab==='foryou') window.renderForYou?.(root.querySelector('#nflForYouHost'));
  window.renderSidebarSports?.();
}

function wire(root){
  root.querySelectorAll('[data-nfl-halftime-open]').forEach(b=>b.addEventListener('click',()=>openHalftimeParlayLab({halftimeDoc:state.halftime})));
  root.querySelector('#nflPropSelect')?.addEventListener('change',e=>{state.prop=e.target.value;if(state.prop==='allPlayers')state.propView='board';render();});
  root.querySelector('#nflMlbPropSelect')?.addEventListener('change',e=>{state.prop=e.target.value||'atd';state.propView='board';render();});
  root.querySelectorAll('[data-nfl-prop-key]').forEach(b=>b.addEventListener('click',()=>{state.prop=b.dataset.nflPropKey||'atd';state.propView='board';render();}));
  root.querySelectorAll('[data-nfl-prop-view]').forEach(b=>b.addEventListener('click',()=>{state.propView=b.dataset.nflPropView;render();}));
  root.querySelectorAll('[data-nfl-player]').forEach(b=>{const open=()=>{state.player=b.dataset.nflPlayer;state.mapFilter='ALL';render();};b.addEventListener('click',open);if(b.getAttribute('role')==='button')b.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===b){e.preventDefault();open();}});});
  root.querySelectorAll('.nfl-mlb-prop-card[tabindex]').forEach(card=>card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();state.player=card.dataset.nflPlayer;state.mapFilter='ALL';render();}}));
  root.querySelectorAll('[data-nfl-open-game]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.game=b.dataset.nflOpenGame;state.intelOpenGame=null;state.gamecastTab=b.dataset.nflOpenTab||'game';state.tab=b.dataset.nflOrigin==='live'?'live':'slate';render();window.scrollTo?.({top:0,behavior:'smooth'});}));
  root.querySelectorAll('[data-nfl-game]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.game=b.dataset.nflGame;state.intelOpenGame=null;state.gamecastTab='game';state.tab='slate';render();window.scrollTo?.({top:0,behavior:'smooth'});}));
  root.querySelectorAll('[data-nfl-expand-slate]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=String(b.dataset.nflExpandSlate);state.expandedSlate.has(id)?state.expandedSlate.delete(id):state.expandedSlate.add(id);render();document.querySelector(`[data-nfl-slate-card="${CSS.escape(id)}"]`)?.scrollIntoView({block:'nearest'});}));
  root.querySelectorAll('.ms-slate-cast[tabindex]').forEach(card=>card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();state.game=card.dataset.nflGame;state.gamecastTab='game';state.tab='slate';render();window.scrollTo?.({top:0,behavior:'smooth'});}}));
  root.querySelectorAll('[data-nfl-close-game]').forEach(b=>b.addEventListener('click',()=>{state.game=null;state.intelOpenGame=null;state.gamecastTab='game';render();}));
  root.querySelectorAll('[data-nfl-gamecast-tab]').forEach(b=>b.addEventListener('click',()=>{state.gamecastTab=b.dataset.nflGamecastTab;render();window.scrollTo?.({top:0,behavior:'smooth'});}));
  root.querySelectorAll('[data-nfl-gamecast-feed]').forEach(b=>b.addEventListener('click',()=>selectTab('feed')));
  root.querySelectorAll('[data-nfl-refresh-live]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await refreshLiveNow();render();}finally{b.disabled=false;}}));
  root.querySelectorAll('[data-nfl-inline-tab]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.inlineTabs[String(b.dataset.nflInlineGame)]=b.dataset.nflInlineTab;render();const el=document.querySelector(`[data-nfl-inline-gamecast=\"${CSS.escape(String(b.dataset.nflInlineGame))}\"]`);el?.scrollIntoView({block:'start'});}));
  root.querySelectorAll('[data-nfl-intel-toggle]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=String(b.dataset.nflIntelToggle||'');state.intelOpenGame=String(state.intelOpenGame||'')===id?null:id;render();}));
  root.querySelectorAll('[data-nfl-intel-tab]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=String(b.dataset.nflIntelGame||'');state.intelOpenGame=id;state.intelTabs[id]=b.dataset.nflIntelTab||'drive';render();}));
  root.querySelectorAll('[data-nfl-slate-top]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();window.scrollTo?.({top:0,behavior:'smooth'});}));
  root.querySelectorAll('[data-nfl-close-modal]').forEach(b=>b.addEventListener('click',()=>{state.player=null;state.mapFilter='ALL';render();}));
  root.querySelectorAll('[data-nfl-mapfilter]').forEach(b=>b.addEventListener('click',()=>{state.mapFilter=b.dataset.nflMapfilter;render();}));
  root.querySelector('#nflAllSort')?.addEventListener('change',e=>{state.allSort=e.target.value;render();});
  const search=root.querySelector('#nflSearch');
  search?.addEventListener('input',()=>{const q=search.value.toLowerCase();root.querySelectorAll('#nflAllList .nfl-mlb-prop-card').forEach(c=>c.hidden=!c.textContent.toLowerCase().includes(q));});
}

export function selectTab(tab){
  if(!['radar','slate','live','feed','props','players','foryou'].includes(tab)) return;
  state.tab=tab; state.game=null; state.player=null; state.intelOpenGame=null;
  if(tab==='props'){state.prop='atd'; state.propView='board';}
  render(); window.scrollTo({top:0,behavior:'smooth'});
}
window.DW_nflPreviewSelectTab=selectTab;

let navBound=false;
function bindLegacyNflNav(){
  if(navBound) return;
  navBound=true;
  document.querySelectorAll('#nflSideNav [data-nfl-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>selectTab(btn.dataset.nflTab));
  });
}

export async function mount(){
  ensureNflGamecastConceptStyles(); ensureNflLaunchStyles(); ensureHalftimeLabStyles(); ensureNflGamecastV883aStyles(); ensureNflGamecastV883bStyles(); ensureNflGamecastV884Styles(); ensureNflPlaystageV886Styles();
  await loadData(); bindLegacyNflNav();
  if(!NFL_DEMO_MODE){
    startHalftimeBoardPolling(doc=>{
      state.halftime=doc;
      if((state.tab==='live'&&!state.game)||(state.game&&state.gamecastTab==='game')) requestAnimationFrame(()=>render());
    });
  }
  render();
  requestAnimationFrame(()=>postRenderNflDemoSync(state,{openHalftimeParlayLab}));
}

function __tsoV885ResolveGameContext(){
  try{
    if(typeof activeGame!=='undefined' && activeGame) return activeGame;
    if(typeof selectedGame!=='undefined' && selectedGame) return selectedGame;
    if(typeof state!=='undefined'){
      if(state?.activeGame) return state.activeGame;
      if(state?.selectedGame) return state.selectedGame;
      if(state?.liveGame) return state.liveGame;
    }
    if(typeof data==='function'){
      const payload=data();
      const games=Array.isArray(payload?.games) ? payload.games : [];
      return games.find(g=>String(g?.status||'').toLowerCase()==='in' || g?.isLive || g?.live) || games[0] || null;
    }
  }catch(_err){}
  return null;
}
function __tsoV885Root(){
  return document.querySelector('[data-nfl-root], .nfl-root, .nfl-page, .sports-page, main') || document.body;
}
function __tsoV885MountFromDom(){
  if(typeof document==='undefined') return;
  try{
    const g=__tsoV885ResolveGameContext();
    if(!g) return;
    mountOrUpdateNflPlaystageV886(__tsoV885Root(), g, { halftime: typeof state!=='undefined' ? state?.halftime : null });
  }catch(err){ console.warn('TSO v88.5 PlayStage mount failed', err); }
}
function __tsoV885InstallObserver(){
  if(typeof document==='undefined' || globalThis.__TSO_V885_OBSERVER__) return;
  const fire=()=>{ clearTimeout(globalThis.__TSO_V885_TICK__); globalThis.__TSO_V885_TICK__=setTimeout(__tsoV885MountFromDom, 60); };
  const obs=new MutationObserver(fire);
  obs.observe(document.body,{childList:true,subtree:true});
  globalThis.__TSO_V885_OBSERVER__=obs;
  fire();
}
