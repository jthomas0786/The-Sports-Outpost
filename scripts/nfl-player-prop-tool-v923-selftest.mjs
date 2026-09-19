import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const base=read('sports/nfl/player-prop-tool-v926.js');
const baseCss=read('sports/nfl/player-prop-tool-v926.css');
const snapshot=read('sports/nfl/player-prop-tool-snapshot-v928.js');
const snapshotCss=read('sports/nfl/player-prop-tool-snapshot-v928.css');
const staticGuard=read('sports/nfl/player-prop-tool-static-guard-v929.js');
const freeze=read('sports/nfl/player-prop-tool-background-freeze-v930.js');
const ux=read('sports/nfl/player-prop-tool-ux-v930.js');
const controls=read('sports/nfl/player-prop-tool-controls-v933.js');
const themeJs=read('sports/nfl/player-prop-tool-theme-v936.js');
const themeCss=read('sports/nfl/player-prop-tool-theme-v936.css');
const polishJs=read('sports/nfl/player-prop-tool-polish-v938.js');
const polishCss=read('sports/nfl/player-prop-tool-polish-v938.css');
const sim=read('sports/nfl/player-prop-tool-sim-v939.js');
const preview=read('sports/nfl-preview-v893.js');
const router=read('sports/router.js');
const swipe=read('sports/mobile-edge-swipe-v894.js');
const simData=JSON.parse(read('slates/nfl-sim.json'));

function hasAll(text,markers,label){
  for(const marker of markers)assert(text.includes(marker),`${label} missing ${marker}`);
}

// Base tool still owns the one-time four-file snapshot and the established table/player-modal surfaces.
hasAll(base,[
  "getJson('./slates/nfl.json')","getJson('./slates/nfl-odds.json')","getJson('./slates/nfl-sim.json')","getJson('./slates/nfl-research.json')",
  'rushYds','recYds','receptions','passYds','passTds','completions','atd','data-nfl-tool-player','openExistingPlayerModal','PAGE_SIZE=5000'
],'base Player Prop Tool');
assert(!base.includes('new MutationObserver'),'base Player Prop Tool must not use a MutationObserver');
assert(!base.includes('setInterval('),'base Player Prop Tool must not auto-rerender on an interval');
hasAll(baseCss,['overflow-x:auto','touch-action:pan-x pan-y','nfl-ppt-player-sticky'],'base Player Prop Tool CSS');

// Static snapshot/performance architecture remains intact.
hasAll(snapshot,['nflPptSnapshot','requestAnimationFrame','DocumentFragment','parkedTool','restoreParkedTool','waitForTableReplacement'],'snapshot layer');
hasAll(snapshotCss,['content-visibility:auto!important','contain-intrinsic-size:auto 86px!important','contain:layout paint style!important','overflow-y:visible'],'snapshot CSS');
assert(!snapshot.includes('new MutationObserver'),'snapshot layer must not observe/rebuild the DOM');
assert(!snapshot.includes('setInterval('),'snapshot layer must not auto-refresh');
assert(!snapshot.includes('renderTool('),'snapshot controls must not call the base renderer');
hasAll(staticGuard,[
  '__TSO_NFL_PROP_SNAPSHOT_ACTIVE__','SOURCE_PATHS','sourceCache','sourceRefreshBudget','armSourceRefresh',
  '/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json','sourceNetworkCounts'
],'static guard');
assert(!staticGuard.includes('setInterval('),'static guard must not add permanent polling');
hasAll(freeze,['__TSO_NFL_BACKGROUND_FREEZE_V930__','suspendNflBackgroundFreezeV930','resumeNflBackgroundFreezeV930','managedIntervals','managedTimeouts','managedObservers'],'background freeze');
hasAll(ux,['captureReturnState','restoreReturnState','window.scrollTo(saved.x,saved.y)','wrap.scrollLeft=saved.tableX','#nflPptRefresh'],'modal return UX');
assert(!ux.includes('new MutationObserver'),'UX must not observe/rebuild the DOM');
assert(!ux.includes('setInterval('),'UX must not add interval work');

// Current-week Prop selector remains in-memory and also drives the sim-authority retry pass.
hasAll(controls,[
  '<span>Prop</span>','id="nflPptMarket"','All Props','data-nfl-ppt-top-prop="1"','state.market','schedulePatch','__TSO_NFL_PROP_SIM_V939__','applyIfReady'
],'v93.9 Prop controls');
assert(!controls.includes('MutationObserver'),'Prop selector must not use a DOM observer');
assert(!controls.includes('setInterval('),'Prop selector must not add background polling');

// Outpost visual theme is preserved.
hasAll(themeJs,["STYLE_ID='nfl-player-prop-tool-theme-v936-css'",'player-prop-tool-theme-v936.css?v=93.7'],'theme loader');
hasAll(themeCss,['--ppt-bg:#050a14','--ppt-panel:#0a1730','--ppt-blue:#2d7fff','--ppt-cyan:#6edcff','color-scheme:dark','.nfl-ppt-table-wrap','.nfl-ppt-table tbody tr[data-nfl-ppt-row]'],'theme CSS');
assert(!themeCss.includes('content-visibility:'),'theme must not alter snapshot rendering');

// v93.9 removes the dedicated/native visible horizontal scrollbar while retaining native horizontal scrolling.
hasAll(polishJs,["STYLE_ID='nfl-player-prop-tool-polish-v938-css'",'player-prop-tool-polish-v938.css?v=93.9','removeLegacyScroller'],'v93.9 no-scrollbar polish');
assert(!polishJs.includes('ensureNflPlayerPropToolScrollerV938'),'dedicated scrollbar synchronizer must be removed');
assert(!polishJs.includes('createElement(\'div\')'),'polish must not create a dedicated scrollbar');
assert(!polishJs.includes('setTimeout('),'polish must not add scrollbar retry timers');
assert(!polishJs.includes('MutationObserver'),'polish must not add a DOM observer');
hasAll(polishCss,['td:first-child','background:#081426!important','nfl-ppt-xscroll-v938{display:none!important}','scrollbar-width:none!important','overflow-x:auto'],'v93.9 no-scrollbar CSS');

// All displayed model/value/stat columns are now simulation-authoritative.
hasAll(sim,[
  '__TSO_NFL_PROP_SIM_V939__','nflPptSimAuthority','nflPptSimIterations','SIM MEAN','SIM MEDIAN','SIM PROB','SIM EDGE',
  'P10 FLOOR','P25','P75','P90 CEILING','SIM RUNS','50K SIM PROJECTION + VALUE','SIM DISTRIBUTION','SIM RANGE + SAMPLE',
  'distributionFor','simProbability','impliedFromAmerican','Historical L5/L10/H2H and defensive-average fallbacks are not used'
],'v93.9 simulation authority');
assert(!sim.includes('recentAverage('),'v93.9 simulation authority must not use research-average projections');
assert(!sim.includes('hitRate('),'v93.9 simulation authority must not use historical hit-rate calculations');
assert(!sim.includes('h2hRate('),'v93.9 simulation authority must not use H2H hit-rate calculations');
assert(!sim.includes('defenseRankMap'),'v93.9 simulation authority must not use historical defense-rank fallbacks');
assert(!sim.includes('setInterval('),'simulation authority must not add interval work');
assert(!sim.includes('MutationObserver'),'simulation authority must not observe/rebuild the DOM');
assert.equal(Number(simData?.meta?.pregameIterations),50000,'nfl-sim.json pregame simulation count must be 50,000');
assert((simData?.games||[]).some(g=>Number(g?.iterations)===50000),'nfl-sim.json must contain 50,000-run pregame game simulations');

// Production wrapper order: snapshot first, sim authority next, controls/theme/polish afterward.
hasAll(preview,[
  'player-prop-tool-sim-v939.js?v=93.9','player-prop-tool-controls-v933.js?v=93.9','player-prop-tool-theme-v936.js?v=93.7','player-prop-tool-polish-v938.js?v=93.9',
  'installNflPlayerPropToolSnapshotV928();','installNflPlayerPropToolSimV939();','installNflPlayerPropToolControlsV933();','installNflPlayerPropToolThemeV936();','installNflPlayerPropToolPolishV938();'
],'NFL production wrapper');
assert(preview.indexOf('installNflPlayerPropToolSnapshotV928();')<preview.indexOf('installNflPlayerPropToolSimV939();'),'simulation authority must apply after the static snapshot');
assert(preview.indexOf('installNflPlayerPropToolSimV939();')<preview.indexOf('installNflPlayerPropToolControlsV933();'),'controls retry scheduler must run after simulation authority installs');
assert(!preview.includes('installNflPlayerPropToolPerformanceV925'),'old repaint-heavy performance layer must remain disabled');

// Swipe-to-open remains disabled only while the Player Prop Tool is active.
hasAll(swipe,['if(playerPropToolActive()||!mobileViewport()','swipe it\n  // left from inside the drawer to dismiss it'],'mobile swipe guard');
assert(!swipe.includes('PROP_OPEN_DISTANCE'),'Player Prop Tool must not arm a page-specific swipe-to-open threshold');
hasAll(router,['player-prop-tool-background-freeze-v930.js?v=93.0','./mobile-edge-swipe-v894.js?v=93.5'],'shared NFL router');

console.log('NFL Player Prop Tool regression passed: v93.9 keeps the frozen snapshot/modal-return architecture, removes the visible horizontal scrollbar, and makes projection, probability, edge and displayed distribution stats authoritative to the existing 50,000-run NFL simulation output.');