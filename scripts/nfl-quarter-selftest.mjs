#!/usr/bin/env node
import assert from 'node:assert/strict';
import { __V861_TEST__ } from '../sports/nfl/sim/engine-v861.js';

assert.deepEqual(__V861_TEST__.QUARTERS,['q1','q2','q3','q4']);
assert.equal(__V861_TEST__.periodKey('1'),'q1');
assert.equal(__V861_TEST__.periodKey('Q2'),'q2');
assert.equal(__V861_TEST__.periodKey('quarter3'),'q3');
let x=7;
const parts=__V861_TEST__.splitInteger(x,[1,1,1,1],()=>.5);
assert.equal(parts.reduce((a,b)=>a+b,0),x);
assert.equal(parts.length,4);
console.log('✓ v86.1 quarter simulation helper self-test passed');
