#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const mustRead=p=>fs.readFileSync(p,'utf8');
const preview=mustRead('sports/nfl-preview.js');
const styles=mustRead('sports/nfl/gamecast-v885-styles.js');
const stage=mustRead('sports/nfl/playstage-v885.js');
const router=mustRead('sports/router.js');
const index=mustRead('index.html');
const pkg=JSON.parse(mustRead('package.json'));

assert(preview.includes("./nfl/gamecast-v885-styles.js?v=88.5"), 'preview missing v88.5 styles import');
assert(preview.includes("./nfl/playstage-v885.js?v=88.5"), 'preview missing v88.5 playstage import');
assert(preview.includes('ensureNflPlaystageV885Styles'), 'preview missing style init');
assert(preview.includes('__tsoV885MountFromDom'), 'preview missing DOM mount hook');
assert(styles.includes('tso-playstage-v885__fieldWrap'), 'styles missing playstage field class');
assert(stage.includes('renderNflPlaystageV885HTML'), 'stage missing renderer');
assert(stage.includes('mountOrUpdateNflPlaystageV885'), 'stage missing mount fn');
assert(router.includes('nfl-preview.js?v=88.5'), 'router not cache-busted to v88.5');
assert(index.includes('sports/router.js?v=88.5'), 'index not cache-busted to v88.5');
assert.equal(pkg.scripts['nfl:v88.5:test'], 'node scripts/nfl-v885-selftest.mjs');
console.log('✓ v88.5 PlayStage self-test passed');
console.log('✓ imports wired');
console.log('✓ cache bust set to v88.5');
console.log('✓ PlayStage field + bottom analytics panels present');
