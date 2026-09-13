import assert from 'node:assert/strict';
import fs from 'node:fs';

const nfl=fs.readFileSync('sports/nfl/live-game-switcher-v894.js','utf8');
const mlb=fs.readFileSync('sports/mlb/live-game-switcher-v901.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

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
assert.ok(!/modal/i.test(nfl.match(/function openGame\([\s\S]*?\n\}/)?.[0]||''),'NFL selector openGame must remain inline and never invoke a modal');

for(const marker of [
  'tsoMlbLiveGameSwitcher',
  'tsoMlbInlineGamecast',
  './slate.json',
  '.mlb-live-page',
  '.mlb-live-rail-wrap',
  '.mlb-live-helper',
  'display:none!important',
  '[data-live-game-pk]',
  '[data-open-live-gamecast]',
  '.so-radar-tip-expand',
  "globalBinding('liveDetailHTML')",
  "globalBinding('mountGamecasts')",
  "globalBinding('wireGamecastTabs')",
  'renderInlineGamecast',
  "activeTab='live'; renderTabs(); renderList();",
  '.notify-watch-btn',
  'activeGames(games)',
  'nextGame(games)',
  'idleLabel(g)',
  'No games live · Next:',
  'No games live · No upcoming games',
  '<select disabled>',
  '@media(max-width:680px)',
]) assert.ok(mlb.includes(marker),`MLB inline game selector missing ${marker}`);
assert.ok(!mlb.includes('window.openMlbLiveGamecastModal'),'MLB selector must not invoke the modal Gamecast');
assert.ok(!mlb.includes('#modalOverlay.open #modalBody'),'MLB selector must not mount inside the modal');
assert.ok(!mlb.includes('.slate-card[data-gid]'),'MLB selector must target the actual MLB Live hub, not legacy slate cards');
assert.ok(!mlb.includes('No live games available'),'MLB selector must use the next-game idle state');

// The base page keeps the notification-only modal routes. Normal Live/Radar/Slate
// clicks are intercepted by the enhancement above before their old modal handlers.
for(const marker of [
  "if(e.data?.type === 'watch-game' && e.data.gamePk)",
  'openRadarGamecastModal(e.data.gamePk)',
  '.notify-watch-btn',
  'openRadarGamecastModal(btn.dataset.gamePk)',
  'function liveDetailHTML(g, opts)',
  'function mountGamecasts()',
  'function wireGamecastTabs(root)',
]) assert.ok(index.includes(marker),`MLB notification/modal contract missing ${marker}`);

assert.ok(wrapper.includes("./nfl/live-game-switcher-v894.js?v=89.9"));
assert.ok(wrapper.includes('installNflLiveGameSwitcherV894()'));
assert.ok(router.includes("./mlb/live-game-switcher-v901.js?v=90.22"));
assert.ok(router.includes("./nfl-preview-v893.js?v=89.24"));
assert.ok(router.includes("./nhl/view-v906.js?v=90.18"),'NHL live experience should remain untouched');

console.log('Game selectors: live games render inline below the selector; redundant MLB Live preview rail is hidden; idle state shows the next matchup; MLB Gamecast modal remains reserved for notification Watch actions');
