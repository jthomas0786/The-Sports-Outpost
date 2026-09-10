#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const ht=fs.readFileSync('sports/nfl/halftime-ui.js','utf8');
const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(ht,/export\s+function\s+ensureHalftimeLabStyles\s*\(/);
assert.match(ht,/export\s+function\s+halftimeBannerHTML\s*\(/);
assert.match(ht,/export\s+function\s+halftimeGamecastBannerHTML\s*\(/);
assert.match(ht,/export\s+function\s+isHalftimeGameState\s*\(/);
assert.match(ht,/export\s+async\s+function\s+openHalftimeParlayLab\s*\(/);
assert.match(preview,/halftime-ui\.js\?v=88\.3c/);
assert.match(router,/nfl-preview\.js\?v=88\.3c/);
assert.equal(pkg.scripts?.['nfl:v88.3c:test'],'node scripts/nfl-v883c-selftest.mjs');
console.log('✓ v88.3c halftime module export test passed');
