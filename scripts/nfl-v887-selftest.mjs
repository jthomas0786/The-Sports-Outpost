#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { __V887_TEST__ } from '../sports/nfl/gamecast-v887-enhancer.js';

assert.equal(__V887_TEST__.ROLE_MAP.length,22);
assert.equal(__V887_TEST__.ROLE_MAP[0],'QB');
assert.deepEqual(__V887_TEST__.ROLE_MAP.slice(1,6),['OL','OL','OL','OL','OL']);
assert.deepEqual(__V887_TEST__.ROLE_MAP.slice(11,15),['DL','DL','DL','DL']);

const enhancer=fs.readFileSync('sports/nfl/gamecast-v887-enhancer.js','utf8');
const styles=fs.readFileSync('sports/nfl/gamecast-v887-styles.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v887.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
assert(enhancer.includes('realisticPlayerSvg'));
assert(enhancer.includes("actor.dataset.v887Role=role"));
assert(enhancer.includes('tso-v887-fieldfx'));
assert(styles.includes('width:58px!important;height:116px!important'));
assert(styles.includes('stroke-width:31!important'));
assert(wrapper.includes("./nfl-preview.js?v=88.6e"));
assert(wrapper.includes("gamecast-v887-enhancer.js?v=88.7"));
assert(router.includes("nfl-preview-v887.js?v=88.7"));
console.log('✓ v88.7 Gamecast player + field overlay enhancer self-test passed');
