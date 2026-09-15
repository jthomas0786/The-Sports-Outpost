import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('sports/mlb/live-game-switcher-v901.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const marker of [
  'host.dataset.gameSignature',
  'document.activeElement!==select',
  "document.addEventListener('change'",
  'switchGame(select.value)',
]) assert.ok(src.includes(marker),`live selector stability missing ${marker}`);

assert.ok(!src.includes("host.querySelector('select')?.addEventListener('change'"),'selector must not depend on a disposable select listener');
assert.ok(router.includes("./mlb/live-game-switcher-v901.js?v=90.23"),'live switcher cache bust missing');
assert.ok(index.includes('./sports/router.js?v=90.52'),'outer cache bust missing');
console.log('MLB v925 regression passed: live selector DOM is stable and change handling is delegated');
