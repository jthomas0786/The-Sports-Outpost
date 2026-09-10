#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const preview=read('sports/nfl-preview.js');
const demo=read('sports/nfl/demo-mode.js');
const compat=read('sports/nfl/playstage-v885a.js');
const odds=read('scripts/nfl-odds-refresh.mjs');
const router=read('sports/router.js');
const index=read('index.html');
const pkg=JSON.parse(read('package.json'));

assert.match(preview,/playstage-v885a\.js\?v=88\.5a/);
assert.match(preview,/demo-mode\.js\?v=88\.5a/);
assert.match(demo,/out\.status='in'/);
assert.match(demo,/out\.liveScore=\{/);
assert.match(demo,/possessionSide:'away'/);
assert.match(demo,/state\.game=firstId/);
assert.match(compat,/g\.liveScore\|\|\{\}/);
assert.match(compat,/mountOrUpdateNflPlaystageV885a/);
assert.match(odds,/const SPORTSBOOK_KEYS = new Set\(\['draftkings','fanduel','caesars','bovada','betmgm','fanatics','pinnacle','fliff','bet365','betrivers','hardrock','parx'\]\);/);
assert.doesNotMatch(odds.match(/const SPORTSBOOK_KEYS[^\n]+/)?.[0]||'',/parxcasino|hardrockbet|betriversca|sportsbetau|espnbet/);
assert.match(odds,/bookmakers:SPORTSBOOK_QUERY/);
assert.match(router,/nfl-preview\.js\?v=88\.5a/);
assert.match(index,/sports\/router\.js\?v=88\.5a/);
assert.equal(pkg.scripts['nfl:v88.5a:test'],'node scripts/nfl-v885a-selftest.mjs');

console.log('✓ v88.5a demo + NFL odds hotfix self-test passed');
console.log('  ✓ demo mode uses canonical live state and Gamecast data shape');
console.log('  ✓ PlayStage normalizes production liveScore');
console.log('  ✓ ParlayAPI request contains only documented sportsbook keys');
console.log('  ✓ cache-bust chain is v88.5a');
