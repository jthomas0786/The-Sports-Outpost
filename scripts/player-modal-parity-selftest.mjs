import assert from 'node:assert/strict';
import fs from 'node:fs';

const mlb=fs.readFileSync('sports/mlb/player-modal-parity-v901.js','utf8');
const nhlJs=fs.readFileSync('sports/nhl/player-modal-v918.js','utf8');
const nhlFallback=fs.readFileSync('sports/nhl/player-modal-v921.js','utf8');
const nhlCss=fs.readFileSync('sports/nhl/player-modal-v918.css','utf8');
const nhlView=fs.readFileSync('sports/nhl/view-v906.js','utf8');
const sticky=fs.readFileSync('sports/player-modal-sticky-header-v901.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const marker of [
  'tso-mlb-nfl-player-parity','Player Prop','tso-mlb-parity-prop-select','PROP_LABELS',
  "['HR','HITS','TB','H+R+RBI','RBI','SB']",'[data-tab]','data-tso-mlb-native-prop','hideNativeProps',
  "card.classList.add(CARD_CLASS,'tso-nfl-player-card-v70','tso-nfl-player-card-v72')",'tso-nfl-parity-bars',
  "grid-template-columns:repeat(var(--tso-parity-count,5),minmax(0,1fr))",'width:100%!important','max-width:none!important',
  'grid-template-rows:minmax(0,1fr) 34px','min-height:137px','@media(max-width:680px)'
]) assert.ok(mlb.includes(marker),`MLB NFL-parity modal missing ${marker}`);
assert.ok(mlb.includes("group&&group!==hdr&&group!==card"),'MLB prop conversion must never hide the whole header/card');
assert.ok(mlb.includes("chart.style.setProperty('--tso-parity-count'"),'MLB recent chart must derive column count from rendered games');
assert.ok(mlb.includes("cols.length>20?'2px':cols.length>10?'4px':'6px'"),'MLB recent chart must use NFL range-aware gaps');

for(const marker of ["installNhlPlayerModalV917",'tso-nhl-player-card-v918','player-modal-v918.css?v=90.18'])
  assert.ok(nhlJs.includes(marker),`NHL v90.18 installer missing ${marker}`);
for(const marker of ['installNhlPlayerModalV918','installNhlPlayerModalV921','historicalModalFallback','historicalPropProjection','TSO reference'])
  assert.ok(nhlFallback.includes(marker),`NHL v90.21 fallback layer missing ${marker}`);
for(const marker of ['.tso-nhl-rg-bar','width:100%!important','max-width:none!important','min-width:0!important','height:112px!important','justify-content:stretch!important'])
  assert.ok(nhlCss.includes(marker),`NHL NFL-parity CSS missing ${marker}`);
assert.ok(!nhlCss.includes('76px'),'NHL parity layer must not reintroduce the old L5 cap');
assert.ok(!nhlCss.includes('58px'),'NHL parity layer must not reintroduce the old mobile cap');
assert.ok(!nhlCss.includes('46px'),'NHL parity layer must not reintroduce the old compact cap');

for(const marker of [
  "const CARD_SELECTOR='.modal > .player-card-v2,.ms-modal > .player-card-v2,.tso-nhl-modal-backdrop .player-card-v2'",
  "card?.closest?.('.modal,.ms-modal')",'.modal>.player-card-v2.${CARD_CLASS}',
  'tso-player-static-shell','tso-player-modal-scroll-body','tso-player-header-actions','tso-player-watch-action',
  'overflow:hidden!important','overflow-y:auto!important','height:0!important','flex:1 1 0%!important',
  '.watch-star[data-watch-id]','resetActionButton',"['inset','auto']","shell.dataset.tsoStaticPlayerShell='1'",
  "card.dataset.tsoStaticHeader='1'","imp(shell,'height','100%')","imp(shell,'overflow-y','hidden')",
  "imp(card,'overflow-y','hidden')","imp(prop,'grid-column','3')","imp(actions,'grid-column','4')",
  "imp(prop,'grid-column','1 / -1')","actions.appendChild(watch)","actions.appendChild(close)",'ensureBody(card,hdr)',
  'document.querySelectorAll(CARD_SELECTOR).forEach(prepareCard)',"window.addEventListener('resize',queue"
]) assert.ok(sticky.includes(marker),`Shared static player header missing ${marker}`);
assert.ok(!sticky.includes('position:sticky!important'),'Shared header must not rely on sticky positioning');
assert.ok(!sticky.includes('right:58px!important'),'Watch List star must not be absolutely over the prop selector');

assert.ok(nhlView.includes("player-modal-v921.js?v=90.21"),'NHL view must mount v90.21 projection fallback modal');
assert.ok(nhlView.includes('installNhlPlayerModalV921'),'NHL view must install v90.21 modal');
assert.ok(nhlFallback.includes("installNhlPlayerModalV918"),'NHL v90.21 must preserve the v90.18 NFL-parity layer');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'Router must cache-bust NHL v90.18 wrapper');
assert.ok(router.includes("./mlb/player-modal-parity-v901.js?v=90.2"),'Router must load hardened MLB NFL-parity modal');
assert.ok(router.includes('installMlbPlayerModalParityV901'),'Router must install MLB modal parity enhancer');
assert.ok(router.includes("./player-modal-sticky-header-v901.js?v=90.7"),'Router must load the actual MLB/NFL/NHL static-header runtime');
assert.ok(router.includes('installPlayerModalStickyHeaderV901();'),'Router must install static player headers for all sports');
assert.ok(/\.\/sports\/router\.js\?v=[A-Za-z0-9._-]+/.test(index),'Outer page must load a cache-busted sports router');

console.log('Player modal parity: MLB/NFL/NHL keep the shared static-header geometry, while NHL v90.21 layers projection fallback on top of the preserved v90.18 parity modal.');