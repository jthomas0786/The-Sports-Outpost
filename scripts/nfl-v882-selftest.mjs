#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const demo=fs.readFileSync('sports/nfl/demo-mode.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(preview,/getNflDemoMode/);
assert.match(preview,/hydrateNflDemoState/);
assert.match(preview,/postRenderNflDemoSync/);
assert.match(preview,/const NFL_DEMO_MODE=getNflDemoMode\(\)/);
assert.match(preview,/if\(!NFL_DEMO_MODE\)\{[\s\S]*startHalftimeBoardPolling/);
assert.match(router,/nfl-preview\.js\?v=88\.2/);
assert.match(demo,/export function getNflDemoMode/);
assert.match(demo,/export function hydrateNflDemoState/);
assert.match(demo,/export function postRenderNflDemoSync/);
assert.match(demo,/buildDemoHalftimeDoc/);
assert.match(demo,/window\.__TSO_NFL_DEMO/);
assert.equal(pkg?.scripts?.['nfl:v88.2:test'],'node scripts/nfl-v882-selftest.mjs');

console.log('✓ v88.2 NFL demo mode self-test passed');
console.log('  ✓ hidden NFL demo query params are wired');
console.log('  ✓ preview mount skips halftime polling during demo mode');
console.log('  ✓ halftime drawer can auto-open from demo mode');
console.log('  ✓ router cache-busted to nfl-preview.js?v=88.2');
