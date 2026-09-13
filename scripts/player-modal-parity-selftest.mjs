import assert from 'node:assert/strict';
import fs from 'node:fs';

const mlb=fs.readFileSync('sports/mlb/player-modal-parity-v901.js','utf8');
const nhlJs=fs.readFileSync('sports/nhl/player-modal-v918.js','utf8');
const nhlCss=fs.readFileSync('sports/nhl/player-modal-v918.css','utf8');
const nhlView=fs.readFileSync('sports/nhl/view-v906.js','utf8');
const sticky=fs.readFileSync('sports/player-modal-sticky-header-v901.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');

for(const marker of [
  'tso-mlb-nfl-player-parity',
  'Player Prop',
  'tso-mlb-parity-prop-select',
  'PROP_LABELS',
  "['HR','HITS','TB','H+R+RBI','RBI','SB']",
  '[data-tab]',
  'data-tso-mlb-native-prop',
  'hideNativeProps',
  "card.classList.add(CARD_CLASS,'tso-nfl-player-card-v70','tso-nfl-player-card-v72')",
  'tso-nfl-parity-bars',
  "grid-template-columns:repeat(var(--tso-parity-count,5),minmax(0,1fr))",
  'width:100%!important',
  'max-width:none!important',
  'grid-template-rows:minmax(0,1fr) 34px',
  'min-height:137px',
  '@media(max-width:680px)',
]) assert.ok(mlb.includes(marker),`MLB NFL-parity modal missing ${marker}`);

assert.ok(mlb.includes("group&&group!==hdr&&group!==card"),'MLB prop conversion must never hide the whole header/card');
assert.ok(mlb.includes("chart.style.setProperty('--tso-parity-count'"),'MLB recent chart must derive column count from rendered games');
assert.ok(mlb.includes("cols.length>20?'2px':cols.length>10?'4px':'6px'"),'MLB recent chart must use NFL range-aware gaps');

for(const marker of [
  "installNhlPlayerModalV917",
  'tso-nhl-player-card-v918',
  'player-modal-v918.css?v=90.18',
]) assert.ok(nhlJs.includes(marker),`NHL v90.18 installer missing ${marker}`);

for(const marker of [
  '.tso-nhl-rg-bar',
  'width:100%!important',
  'max-width:none!important',
  'min-width:0!important',
  'height:112px!important',
  'justify-content:stretch!important',
]) assert.ok(nhlCss.includes(marker),`NHL NFL-parity CSS missing ${marker}`);
assert.ok(!nhlCss.includes('76px'),'NHL parity layer must not reintroduce the old L5 cap');
assert.ok(!nhlCss.includes('58px'),'NHL parity layer must not reintroduce the old mobile cap');
assert.ok(!nhlCss.includes('46px'),'NHL parity layer must not reintroduce the old compact cap');

for(const marker of [
  'tso-player-sticky-shell',
  'tso-player-watch-action',
  'position:sticky!important',
  'top:0!important',
  'padding-right:112px!important',
  'right:58px!important',
  'watchButton(card)',
  "hdr.appendChild(watch)",
  "hdr.appendChild(close)",
  'overflow-y:auto!important',
  '@media(max-width:680px)',
]) assert.ok(sticky.includes(marker),`Shared sticky player header missing ${marker}`);

assert.ok(nhlView.includes("player-modal-v918.js?v=90.18"),'NHL view must mount v90.18 parity modal');
assert.ok(nhlView.includes('installNhlPlayerModalV918'),'NHL view must install v90.18 modal');
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'Router must cache-bust NHL v90.18');
assert.ok(router.includes("./mlb/player-modal-parity-v901.js?v=90.2"),'Router must load hardened MLB NFL-parity modal');
assert.ok(router.includes('installMlbPlayerModalParityV901'),'Router must install MLB modal parity enhancer');
assert.ok(router.includes("./player-modal-sticky-header-v901.js?v=90.1"),'Router must load shared sticky player header');
assert.ok(router.includes('installPlayerModalStickyHeaderV901();'),'Router must install sticky player headers for all sports');

console.log('Player modal parity: NFL remains source of truth; MLB/NHL bars align and MLB/NFL/NHL headers stay fixed with a reserved Watch List action gutter.');
