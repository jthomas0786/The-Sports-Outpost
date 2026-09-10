#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { __V889_TEST__ } from '../sports/nfl/gamecast-v889-enhancer.js';

assert.equal(__V889_TEST__.endzoneAngle,63.4);
const enhancer=fs.readFileSync('sports/nfl/gamecast-v889-enhancer.js','utf8');
const styles=fs.readFileSync('sports/nfl/gamecast-v889-styles.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v889.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert(enhancer.includes("./gamecast-v888-enhancer.js?v=88.8"));
assert(enhancer.includes('oldObserver?.disconnect?.()'));
assert(enhancer.includes('unwrapV888Stage'));
assert(enhancer.includes("rotate(-63.4 141 248)"));
assert(enhancer.includes("rotate(63.4 1531 248)"));
assert(enhancer.includes("rotate(-5.5 207 132)"));
assert(enhancer.includes("rotate(5.5 1465 132)"));
assert(styles.includes('perspective:none!important'));
assert(!styles.includes('rotateX('));
assert(wrapper.includes("gamecast-v889-enhancer.js?v=88.9"));
assert(router.includes("nfl-preview-v889.js?v=88.9"));
assert.equal(pkg.scripts['nfl:v88.9:test'],'node scripts/nfl-v889-selftest.mjs');
console.log('✓ v88.9 native field geometry + endzone perspective alignment self-test passed');