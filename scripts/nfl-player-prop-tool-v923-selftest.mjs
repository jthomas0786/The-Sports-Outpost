import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync('sports/nfl/player-prop-tool-v926.js','utf8');
const css=fs.readFileSync('sports/nfl/player-prop-tool-v926.css','utf8');
const visibilityCss=fs.readFileSync('sports/nfl/player-prop-tool-visibility-v927.css','utf8');
const snapshot=fs.readFileSync('sports/nfl/player-prop-tool-snapshot-v928.js','utf8');
const snapshotCss=fs.readFileSync('sports/nfl/player-prop-tool-snapshot-v928.css','utf8');
const staticGuard=fs.readFileSync('sports/nfl/player-prop-tool-static-guard-v929.js','utf8');
const backgroundFreeze=fs.readFileSync('sports/nfl/player-prop-tool-background-freeze-v930.js','utf8');
const ux=fs.readFileSync('sports/nfl/player-prop-tool-ux-v930.js','utf8');
const controls=fs.readFileSync('sports/nfl/player-prop-tool-controls-v933.js','utf8');
const themeJs=fs.readFileSync('sports/nfl/player-prop-tool-theme-v936.js','utf8');
const themeCss=fs.readFileSync('sports/nfl/player-prop-tool-theme-v936.css','utf8');
const preview=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const swipe=fs.readFileSync('sports/mobile-edge-swipe-v894.js','utf8');

for(const marker of [
  'PLAYER PROP TOOL','TSO Picks','All Props','MODEL PROB','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H',
  "getJson('./slates/nfl.json')","getJson('./slates/nfl-odds.json')","getJson('./slates/nfl-sim.json')","getJson('./slates/nfl-research.json')",
  'rushYds','recYds','receptions','passYds','passTds','completions','atd',
  'hitRate','h2hRate','recentAverage','impliedFromAmerican','defenseRankMap','buildRows',
  'data-nfl-tool-player','data-nfl-player','openExistingPlayerModal','Player Prop Tool','Quick Guide','Color Cells','Filters',
  'PAGE_SIZE=5000','renderLimit','Show ${Math.min(PAGE_SIZE,more)} more','loading="lazy"','decoding="async"',
  'nfl-ppt-ring-track','nfl-ppt-ring-fill','nfl-ppt-ring-label'
]) assert(js.includes(marker),`Player Prop Tool v92.6 missing ${marker}`);

for(const marker of ['nfl-ppt-table','nfl-ppt-player-sticky','nfl-ppt-prob','nfl-ppt-ring-track','nfl-ppt-ring-fill','nfl-ppt-more','overflow-x:auto','overflow-y:visible','overscroll-behavior-y:auto','contain:none','@media(max-width:700px)']){
  assert(css.includes(marker),`Player Prop Tool v92.6 CSS missing ${marker}`);
}
for(const marker of ['max-width:1500px','height:48px','width:1420px','height:78px','width:50px','font-size:15px','width:58px','overflow-y:visible','touch-action:pan-x pan-y','@media(max-width:700px)']){
  assert(visibilityCss.includes(marker),`Player Prop Tool v92.7 visibility CSS missing ${marker}`);
}

for(const marker of [
  'nflPptSnapshot','STATIC SNAPSHOT · REFRESH TO UPDATE','requestAnimationFrame','row.hidden','DocumentFragment',
  'parkedTool','restoreParkedTool','snapshotReady','nflPptSnapshotRows','data-nfl-tool-player',
  'waitForTableReplacement','for(let i=0;i<100;i++)more.click()','beginPrepare(tool.querySelector(\'.nfl-ppt-table\'))',
  'player-prop-tool-snapshot-v928.css?v=93.1','.modal-close'
]) assert(snapshot.includes(marker),`Player Prop Tool v93.2 snapshot layer missing ${marker}`);
for(const marker of [
  'width:1535px','height:86px','width:64px','transition:none','animation:none','overflow-y:visible',
  'touch-action:pan-x pan-y','tr[data-nfl-ppt-row][hidden]','nfl-ppt-snapshot-badge',
  'display:grid!important','content-visibility:auto!important','contain-intrinsic-size:auto 86px!important','contain:layout paint style!important'
]) assert(snapshotCss.includes(marker),`Player Prop Tool v93.1 smooth snapshot CSS missing ${marker}`);

for(const marker of [
  '__TSO_NFL_PROP_SNAPSHOT_ACTIVE__','BLOCKED_PATHS','SOURCE_PATHS','sourceCache','sourceInflight','sourceRefreshBudget',
  '/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json',
  '/slates/nfl-live.json','/slates/nfl-halftime.json','/slates/nfl-live-odds.json','/slates/nfl-quarter.json',
  'guardedFetch','armSourceRefresh','enableStaticMode','disableStaticMode','suspendNflBackgroundFreezeV930','resumeNflBackgroundFreezeV930',
  '#sbSportAccordion [data-nfl-preview-tab="props"]','#nflSideNav [data-nfl-tab="props"]','watchSidebar','sidebarObserver',
  'scheduleEnsureButton','installPlayerPropTool','sourceNetworkCounts'
]) assert(staticGuard.includes(marker),`Player Prop Tool v93.0 static guard missing ${marker}`);

for(const marker of [
  '__TSO_NFL_BACKGROUND_FREEZE_V930__','installNflBackgroundFreezeV930','suspendNflBackgroundFreezeV930','resumeNflBackgroundFreezeV930',
  'window.setInterval=function','window.setTimeout=function','window.MutationObserver=class','managedIntervals','runningIntervals',
  'managedTimeouts','runningTimeouts','managedObservers','observingObservers','isNflStack','isPropToolStack'
]) assert(backgroundFreeze.includes(marker),`NFL background freeze v93.0 missing ${marker}`);

for(const marker of [
  'captureReturnState','restoreReturnState','window.scrollTo(saved.x,saved.y)','wrap.scrollLeft=saved.tableX',
  '#nflPptRefresh','nflPptClientUpdatedAt','snapshot updated','requestAnimationFrame','recoverSavedTool',
  '.modal-close','background-attachment:scroll','contain:layout paint'
]) assert(ux.includes(marker),`Player Prop Tool UX v93.2 missing ${marker}`);

for(const marker of [
  "week=tool.querySelector('.nfl-ppt-selects #nflPptWeek')",'<span>Prop</span>','id="nflPptMarket"','All Props',
  "oldMarket=tool.querySelector('#nflPptFilterPanel #nflPptMarket')",'data-nfl-ppt-top-prop="1"','state.market','schedulePatch'
]) assert(controls.includes(marker),`Player Prop Tool controls v93.3 missing ${marker}`);
assert(!controls.includes('MutationObserver'),'v93.3 Prop selector must not use a DOM observer');
assert(!controls.includes('setInterval('),'v93.3 Prop selector must not add background polling');

for(const marker of [
  "STYLE_ID='nfl-player-prop-tool-theme-v936-css'",'player-prop-tool-theme-v936.css?v=93.6','installNflPlayerPropToolThemeV936'
]) assert(themeJs.includes(marker),`Player Prop Tool v93.6 theme loader missing ${marker}`);
for(const marker of [
  '--ppt-bg:#050a14','--ppt-panel:#0a1730','--ppt-blue:#2d7fff','--ppt-cyan:#6edcff','color-scheme:dark',
  '.nfl-ppt-table-wrap','.nfl-ppt-table tbody tr[data-nfl-ppt-row]','.nfl-ppt-selects select','.nfl-ppt-hit.good','.nfl-ppt-guide'
]) assert(themeCss.includes(marker),`Player Prop Tool v93.6 Outpost theme missing ${marker}`);
assert(!themeCss.includes('content-visibility:'),'v93.6 theme must not alter the snapshot rendering engine');
assert(!themeCss.includes('grid-template-columns:305px'),'v93.6 theme must not alter fixed snapshot geometry');

assert(!js.includes('new MutationObserver'),'v92.6 Player Prop Tool must not use mutation observers');
assert(!js.includes('setInterval('),'v92.6 Player Prop Tool must not auto-rerender on an interval');
assert(!snapshot.includes('new MutationObserver'),'v93.2 snapshot layer must not observe/rebuild the DOM');
assert(!snapshot.includes('setInterval('),'v93.2 snapshot layer must not auto-refresh on an interval');
assert(!snapshot.includes('renderTool('),'v93.2 snapshot controls must not call the base renderer');
assert(!ux.includes('new MutationObserver'),'v93.2 UX layer must not observe/rebuild the DOM');
assert(!ux.includes('setInterval('),'v93.2 UX layer must not add interval work');
assert(staticGuard.includes('if(guardActive)return;\n  for(const delay of [0,80,220,500,1000,2000])'),'v93.0 sidebar retry work must stop while the snapshot is active');
assert(staticGuard.includes("if(target.closest?.(`#${TOOL_ID} #nflPptRefresh`))"),'v93.0 Refresh must explicitly arm the four-file source refresh');
assert(!staticGuard.includes('setInterval('),'v93.0 static guard must not add a permanent timer');

assert(preview.includes("player-prop-tool-background-freeze-v930.js?v=93.0"),'NFL production wrapper must import the v93.0 background freeze');
assert(preview.includes("player-prop-tool-ux-v930.js?v=93.2"),'NFL production wrapper must import the v93.2 modal/smooth-scroll UX layer');
assert(preview.includes("player-prop-tool-static-guard-v929.js?v=93.0"),'NFL production wrapper must use the v93.0 static guard cache key');
assert(preview.includes("player-prop-tool-snapshot-v928.js?v=93.2"),'NFL production wrapper must load the v93.2 modal-safe snapshot module');
assert(preview.includes("player-prop-tool-controls-v933.js?v=93.3"),'NFL production wrapper must load the v93.3 top-level Prop selector');
assert(preview.includes("player-prop-tool-theme-v936.js?v=93.6"),'NFL production wrapper must load the v93.6 Outpost theme layer');
assert(preview.includes('installNflBackgroundFreezeV930();'),'NFL production wrapper must install the background freeze before base mount');
assert(preview.includes('installNflPlayerPropToolUxV930();'),'NFL production wrapper must install exact modal return behavior');
assert(preview.includes('installNflPlayerPropToolControlsV933();'),'NFL production wrapper must install the Prop selector enhancement');
assert(preview.includes('installNflPlayerPropToolThemeV936();'),'NFL production wrapper must install the Outpost theme');
assert(preview.indexOf('installNflPlayerPropToolUxV930();')<preview.indexOf('installNflPlayerPropToolSnapshotV928();'),'modal return capture must install before the snapshot parking layer');
assert(preview.indexOf('installNflPlayerPropToolSnapshotV928();')<preview.indexOf('installNflPlayerPropToolThemeV936();'),'Outpost theme must load after snapshot CSS so theme colors win without altering geometry');
assert(preview.indexOf('installPlayerPropTool();')<preview.indexOf('ensurePlayerPropVisibilityV927();'),'larger visibility CSS must be appended after the base tool styles');
assert(!preview.includes('installNflPlayerPropToolPerformanceV925'),'NFL production wrapper must not install the old repaint-heavy v92.5 layer');

assert(router.includes("player-prop-tool-background-freeze-v930.js?v=93.0"),'router must install the freeze before NFL global enhancements');
assert(router.indexOf('installNflBackgroundFreezeV930();')<router.indexOf('installNflChibiPreviewPrivateV901();'),'router must install the freeze before NFL observers are created');
assert(router.includes("import('./nfl-preview-v893.js?v=93.6')"),'router must load the v93.6 NFL Player Prop Tool theme wrapper');
assert(router.includes("./mobile-edge-swipe-v894.js?v=93.5")||router.includes("./mobile-edge-swipe-v894.js?v=91.2"),'router must load the current mobile swipe module');
assert(swipe.includes('if(playerPropToolActive()||!mobileViewport()'),'Player Prop Tool must reject swipe-to-open before a gesture is armed');
assert(!swipe.includes('PROP_OPEN_DISTANCE'),'Player Prop Tool swipe-to-open must be disabled rather than merely desensitized');

console.log('NFL Player Prop Tool regression passed: v93.6 keeps the full readable static snapshot, current-week Prop selector, exact modal return and disabled swipe-to-open behavior while matching the Sports Outpost dark navy/electric-blue/cyan visual system through a theme-only layer that does not alter snapshot geometry or rendering.');
