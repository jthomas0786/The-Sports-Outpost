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
const outer=index.match(/\.\/sports\/router\.js\?v=(\d+)\.(\d+)/);
assert.ok(outer,'outer cache bust missing');
assert.ok(Number(outer[1])>90||(Number(outer[1])===90&&Number(outer[2])>=52),'selector must retain v90.52-or-newer outer cache bust');
console.log('MLB v925 regression passed: live selector DOM is stable and change handling is delegated');
