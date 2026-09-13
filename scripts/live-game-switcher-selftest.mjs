import assert from 'node:assert/strict';
import fs from 'node:fs';

const nfl=fs.readFileSync('sports/nfl/live-game-switcher-v894.js','utf8');
const mlb=fs.readFileSync('sports/mlb/live-game-switcher-v901.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');

for(const marker of [
  'tsoNflLiveGameSelect',
  '.nfl-live-chip[data-nfl-open-game]',
  '[data-nfl-inline-gamecast]',
  '[data-nfl-close-game]',
  'data-nfl-origin="live"',
  '@media(max-width:680px)',
  'cache.clear()',
]) assert.ok(nfl.includes(marker),`NFL live switcher missing ${marker}`);

for(const marker of [
  'tsoMlbLiveGameSwitcher',
  'tsoMlbModalLiveGameSwitcher',
  '.slate-card.is-live[data-gid]',
  '#modalOverlay.open #modalBody',
  '#modalBody #modalClose',
  'scrollIntoView',
  '@media(max-width:680px)',
  'liveGames.clear()',
]) assert.ok(mlb.includes(marker),`MLB live switcher missing ${marker}`);

assert.ok(wrapper.includes("./nfl/live-game-switcher-v894.js?v=89.4"));
assert.ok(wrapper.includes('installNflLiveGameSwitcherV894()'));
assert.ok(router.includes("./mlb/live-game-switcher-v901.js?v=90.18"));
assert.ok(router.includes("./nfl-preview-v893.js?v=89.21"));
assert.ok(router.includes("./nhl/view-v906.js?v=90.17"),'NHL live experience should remain untouched');

console.log('Live game switchers: NHL-style selector wired into MLB and NFL without replacing either sport Gamecast');
