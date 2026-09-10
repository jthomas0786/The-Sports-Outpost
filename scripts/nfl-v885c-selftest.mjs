#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const preview=read('sports/nfl-preview.js');
const router=read('sports/router.js');
const index=read('index.html');
const pkg=JSON.parse(read('package.json'));

assert.match(preview,/renderNflPlaystageV885aHTML/);
assert.match(preview,/const gameView=renderNflPlaystageV885aHTML\(g,\{halftime:state\.halftime\}\);/);
assert.doesNotMatch(preview,/const gameView=fieldOverlayLiveRedesignHTML\(g,p\);/);
assert.match(preview,/playstage-v885a\.js\?v=88\.5c/);
assert.match(preview,/gamecast-v885-styles\.js\?v=88\.5c/);
assert.doesNotMatch(preview,/export async function mount\(\)\{\s*__tsoV885InstallObserver/);
assert.match(router,/nfl-preview\.js\?v=88\.5c/);
assert.match(index,/sports\/router\.js\?v=88\.5c/);
assert.equal(pkg.scripts['nfl:v88.5c:test'],'node scripts/nfl-v885c-selftest.mjs');

console.log('✓ v88.5c direct PlayStage self-test passed');
console.log('✓ Game View selects PlayStage renderer');
console.log('✓ legacy field renderer is not selected');
console.log('✓ observer injector is disabled');
console.log('✓ full cache chain is v88.5c');
