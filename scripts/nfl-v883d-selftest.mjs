#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync('index.html','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const ht=fs.readFileSync('sports/nfl/halftime-ui.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(index,/sports\/router\.js\?v=88\.3d/);
assert.match(router,/\.\/nfl-preview\.js\?v=88\.3d/);
assert.match(preview,/\.\/nfl\/halftime-ui\.js\?v=88\.3d/);
assert.match(ht,/export\s+function\s+ensureHalftimeLabStyles\s*\(/);
assert.match(ht,/export\s+function\s+halftimeBannerHTML\s*\(/);
assert.match(ht,/export\s+function\s+halftimeGamecastBannerHTML\s*\(/);
assert.match(ht,/export\s+function\s+isHalftimeGameState\s*\(/);
assert.equal(pkg.scripts?.['nfl:v88.3d:test'],'node scripts/nfl-v883d-selftest.mjs');

console.log('✓ v88.3d import-chain/cache-bust self-test passed');
console.log('  ✓ index -> router v88.3d');
console.log('  ✓ router -> NFL preview v88.3d');
console.log('  ✓ NFL preview -> halftime UI v88.3d');
console.log('  ✓ required halftime exports exist');
