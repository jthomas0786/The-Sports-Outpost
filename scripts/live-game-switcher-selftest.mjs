import assert from 'node:assert/strict';
import fs from 'node:fs';

const nfl=fs.readFileSync('sports/nfl/live-game-switcher-v894.js','utf8');
const mlb=fs.readFileSync('sports/mlb/live-game-switcher-v901.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');

for(const marker of [
  'tsoNflLiveGameSelect',
  './slates/nfl.json',
  'itemFromSlate',
  'preferredGame',
  '.nfl-live-empty',
  '[data-nfl-inline-gamecast]',
  'DW_nflCommandCenterGame',
  "DW_nflPreviewSelectTab==='function'",
  "DW_nflPreviewSelectTab('live')",
  '@media(max-width:680px)',
  'ON SLATE',
]) assert.ok(nfl.includes(marker),`NFL game selector missing ${marker}`);
assert.ok(!nfl.includes('No live games available'),'NFL selector must remain useful when nothing is live');

for(const marker of [
  'tsoMlbLiveGameSwitcher',
  'tsoMlbModalLiveGameSwitcher',
  '.slate-card[data-gid]',
  '#modalOverlay.open #modalBody',
  '#modalBody #modalClose',
  'scrollIntoView',
  'preferred(games)',
  '@media(max-width:680px)',
  'ON SLATE',
]) assert.ok(mlb.includes(marker),`MLB game selector missing ${marker}`);
assert.ok(!mlb.includes('.slate-card.is-live[data-gid]'),'MLB selector must include pregame/final games too');
assert.ok(!mlb.includes('No live games available'),'MLB selector must remain useful when nothing is live');

assert.ok(wrapper.includes("./nfl/live-game-switcher-v894.js?v=89.5"));
assert.ok(wrapper.includes('installNflLiveGameSwitcherV894()'));
assert.ok(router.includes("./mlb/live-game-switcher-v901.js?v=90.19"));
assert.ok(router.includes("./nfl-preview-v893.js?v=89.22"));
assert.ok(router.includes("./nhl/view-v906.js?v=90.17"),'NHL live experience should remain untouched');

console.log('Game selectors: NHL full-slate behavior mirrored into MLB and NFL; live games preferred, selector remains visible when none are live');
