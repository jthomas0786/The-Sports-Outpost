#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { __V888_TEST__ } from '../sports/nfl/gamecast-v888-enhancer.js';

assert.equal(__V888_TEST__.ROLE_MAP.length,22);
assert.equal(__V888_TEST__.ROLE_MAP[0],'QB');
assert.deepEqual(__V888_TEST__.ROLE_MAP.slice(1,6),['OL','OL','OL','OL','OL']);
assert.deepEqual(__V888_TEST__.ROLE_MAP.slice(11,15),['DL','DL','DL','DL']);

const enhancer=fs.readFileSync('sports/nfl/gamecast-v888-enhancer.js','utf8');
const styles=fs.readFileSync('sports/nfl/gamecast-v888-styles.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v888.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert(enhancer.includes('realisticPlayerSvg'));
assert(enhancer.includes('ensureStageWarp'));
assert(enhancer.includes('enhanceEndzones'));
assert(enhancer.includes('requestAnimationFrame(run)'));
assert(styles.includes('tso-v888-stageWarp'));
assert(styles.includes('width:60px!important;height:122px!important'));
assert(styles.includes('stroke-width:34!important'));
assert(wrapper.includes("./nfl-preview.js?v=88.6e"));
assert(wrapper.includes("gamecast-v888-enhancer.js?v=88.8"));
assert(router.includes("nfl-preview-v888.js?v=88.8"));
assert.equal(pkg.scripts['nfl:v88.8:test'],'node scripts/nfl-v888-selftest.mjs');
console.log('✓ v88.8 field angle, endzone, player, and animation refinement self-test passed');
