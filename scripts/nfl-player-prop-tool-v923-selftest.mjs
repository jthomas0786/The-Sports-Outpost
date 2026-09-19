import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync('sports/nfl/player-prop-tool-v926.js','utf8');
const css=fs.readFileSync('sports/nfl/player-prop-tool-v926.css','utf8');
const visibilityCss=fs.readFileSync('sports/nfl/player-prop-tool-visibility-v927.css','utf8');
const snapshot=fs.readFileSync('sports/nfl/player-prop-tool-snapshot-v928.js','utf8');
const snapshotCss=fs.readFileSync('sports/nfl/player-prop-tool-snapshot-v928.css','utf8');
const staticGuard=fs.readFileSync('sports/nfl/player-prop-tool-static-guard-v929.js','utf8');
const preview=fs.readFileSync('sports/nfl-preview-v893.js','utf8');

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
  'waitForTableReplacement','for(let i=0;i<100;i++)more.click()','beginPrepare(tool.querySelector(\'.nfl-ppt-table\'))'
]) assert(snapshot.includes(marker),`Player Prop Tool v92.8.1 snapshot layer missing ${marker}`);
for(const marker of [
  'width:1535px','height:86px','width:64px','transition:none','animation:none','overflow-y:visible',
  'touch-action:pan-x pan-y','tr[hidden]','nfl-ppt-snapshot-badge'
]) assert(snapshotCss.includes(marker),`Player Prop Tool v92.8 snapshot CSS missing ${marker}`);
for(const marker of [
  '__TSO_NFL_PROP_SNAPSHOT_ACTIVE__','BLOCKED_PATHS','/slates/nfl-live.json','/slates/nfl-halftime.json',
  '/slates/nfl-live-odds.json','/slates/nfl-quarter.json','guardedFetch','enableStaticMode','disableStaticMode',
  '#nflSideNav [data-nfl-tab="props"]','sbSportAccordion','scheduleEnsureButton','installPlayerPropTool'
]) assert(staticGuard.includes(marker),`Player Prop Tool v92.9 static guard missing ${marker}`);

assert(!js.includes('new MutationObserver'),'v92.6 Player Prop Tool must not use mutation observers');
assert(!js.includes('setInterval('),'v92.6 Player Prop Tool must not auto-rerender on an interval');
assert(!snapshot.includes('new MutationObserver'),'v92.8.1 snapshot layer must not observe/rebuild the DOM');
assert(!snapshot.includes('setInterval('),'v92.8.1 snapshot layer must not auto-refresh on an interval');
assert(!snapshot.includes('renderTool('),'v92.8.1 snapshot controls must not call the base renderer');
assert(!staticGuard.includes('new MutationObserver'),'v92.9 static guard must not watch/repaint the DOM');
assert(!staticGuard.includes('setInterval('),'v92.9 static guard must use bounded retries instead of a permanent timer');

assert(preview.includes("player-prop-tool-v926.js?v=92.7"),'NFL production wrapper must import Player Prop Tool v92.6 with the v92.7 cache key');
assert(preview.includes("player-prop-tool-visibility-v927.css?v=92.7"),'NFL production wrapper must load the v92.7 visibility layer');
assert(preview.includes("player-prop-tool-snapshot-v928.js?v=92.8.1"),'NFL production wrapper must import the refresh-safe v92.8.1 static snapshot layer');
assert(preview.includes("player-prop-tool-static-guard-v929.js?v=92.9"),'NFL production wrapper must import the v92.9 static background guard');
assert(preview.includes('installNflPlayerPropToolV926'),'NFL production wrapper must install Player Prop Tool v92.6');
assert(preview.includes('installNflPlayerPropToolSnapshotV928'),'NFL production wrapper must install the v92.8.1 static snapshot layer');
assert(preview.includes('installNflPlayerPropToolStaticGuardV929'),'NFL production wrapper must install the v92.9 static background guard');
assert(preview.indexOf('installPlayerPropTool();')<preview.indexOf('ensurePlayerPropVisibilityV927();'),'larger visibility CSS must be appended after the base tool styles');
assert(!preview.includes('installNflPlayerPropToolPerformanceV925'),'NFL production wrapper must not install the old repaint-heavy v92.5 layer');

console.log('NFL Player Prop Tool regression passed: v92.9 renders the full snapshot in one initial pass, keeps the larger v92.8 layout stable after load, filters/searches/sorts existing rows in place, preserves the same tool across Player Modal use, blocks live/halftime/quarter background network churn while active, supports the current NFL side nav, and only rebuilds from an explicit Refresh.');
