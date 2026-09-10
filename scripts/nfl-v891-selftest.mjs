#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { __V891_TEST__ } from '../sports/nfl-alt-props-v891.js';

const router=fs.readFileSync('sports/router.js','utf8');
const workflow=fs.readFileSync('.github/workflows/nfl-odds.yml','utf8');
const wrapper=fs.readFileSync('scripts/nfl-odds-refresh-v891.mjs','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert(router.includes("nfl-alt-props-v891.js?v=89.1"));
assert(workflow.includes('node scripts/nfl-odds-refresh-v891.mjs'));
assert(wrapper.includes('alternates,'));
assert(wrapper.includes('SAME /props response'));
assert.equal(pkg.scripts['nfl:v89.1:test'],'node scripts/nfl-v891-selftest.mjs');

const sample={
  line:49.5,
  alternates:[
    {line:39.5,over:{best:{book:'Book A',price:-180}},under:{best:{book:'Book B',price:140}}},
    {line:49.5,over:{best:{book:'Book C',price:110}},under:{best:{book:'Book D',price:-130}}},
    {line:59.5,over:{best:{book:'Book E',price:180}},under:{best:{book:'Book F',price:-220}}},
  ]
};
const choices=__V891_TEST__.marketChoices(sample,'recYds');
assert.equal(choices.length,6);
assert.equal(choices[0].line,39.5);
assert(__V891_TEST__.optionLabel(choices[2],'recYds').includes('+110'));
assert.equal(__V891_TEST__.fmtAmerican(-125),'-125');
assert(__V891_TEST__.estimateAltProb('recYds',49.5,58)>50);
console.log('✓ v89.1 NFL player-modal alternate prop line selector self-test passed');
