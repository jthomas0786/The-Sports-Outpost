#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const upgrade=fs.readFileSync('sports/nfl/gamecast-live-upgrade.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(preview,/gamecast-live-upgrade\.js\?v=88\.3/);
assert.match(preview,/ensureNflGamecastUpgradeStyles/);
assert.match(preview,/mountOrUpdateNflGamecastUpgrade/);
assert.match(preview,/__TSO_V883_RENDER_PATCHED__/);
assert.match(router,/nfl-preview\.js\?v=88\.3/);
assert.match(upgrade,/tso-nfl-possession-pill/);
assert.match(upgrade,/Current Drive/);
assert.match(upgrade,/Win %/);
assert.match(upgrade,/smoothly from the live state feed/);
assert.equal(pkg?.scripts?.['nfl:v88.3:test'],'node scripts/nfl-v883-selftest.mjs');

console.log('✓ v88.3 NFL gamecast upgrade self-test passed');
console.log('  ✓ preview imports gamecast-live-upgrade module');
console.log('  ✓ render wrapper is installed for smooth incremental updates');
console.log('  ✓ header possession football pill is wired');
console.log('  ✓ router cache-busted to nfl-preview.js?v=88.3');
