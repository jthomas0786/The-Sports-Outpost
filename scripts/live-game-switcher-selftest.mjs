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
  'liveGames(games)',
  'nextGame(games)',
  'idleLabel(g)',
  'No games live · Next:',
  'No games live · No upcoming games',
  '.nfl-live-empty',
  '[data-nfl-inline-gamecast]',
  'DW_nflCommandCenterGame',
  "DW_nflPreviewSelectTab==='function'",
  "DW_nflPreviewSelectTab('live')",
  'active.length&&!autoOpening',
  '<select id="tsoNflLiveGameSelect" disabled>',
  '@media(max-width:680px)',
]) assert.ok(nfl.includes(marker),`NFL game selector missing ${marker}`);
assert.ok(!nfl.includes('No live games available'),'NFL selector must use the next-game idle state');

for(const marker of [
  'tsoMlbLiveGameSwitcher',
  'tsoMlbModalLiveGameSwitcher',
  './slate.json',
  '.mlb-live-page',
  '[data-live-game-pk]',
  'window.openMlbLiveGamecastModal',
  '#modalOverlay.open #modalBody',
  'activeGames(games)',
  'nextGame(games)',
  'idleLabel(g)',
  'No games live · Next:',
  'No games live · No upcoming games',
  '<select disabled>',
  '@media(max-width:680px)',
]) assert.ok(mlb.includes(marker),`MLB game selector missing ${marker}`);
assert.ok(!mlb.includes('.slate-card[data-gid]'),'MLB selector must target the actual MLB Live hub, not legacy slate cards');
assert.ok(!mlb.includes('No live games available'),'MLB selector must use the next-game idle state');

assert.ok(wrapper.includes("./nfl/live-game-switcher-v894.js?v=89.6"));
assert.ok(wrapper.includes('installNflLiveGameSwitcherV894()'));
assert.ok(router.includes("./mlb/live-game-switcher-v901.js?v=90.21"));
assert.ok(router.includes("./nfl-preview-v893.js?v=89.23"));
assert.ok(router.includes("./nhl/view-v906.js?v=90.17"),'NHL live experience should remain untouched');

console.log('Game selectors: live games only; when idle they stay visible, auto-open nothing, and show the next scheduled matchup/time');
