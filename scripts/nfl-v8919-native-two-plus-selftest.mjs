import fs from 'node:fs';
import assert from 'node:assert/strict';

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const research=fs.readFileSync('sports/nfl-research-ui.js','utf8');
const v890=fs.readFileSync('sports/nfl-preview-v890.js','utf8');
const v893=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');

for(const needle of [
  'function twoPlusTdProbability(p)',
  "['2+ TD',two==null?'—':`${(two*100).toFixed(1)}%`]",
  'twoPlusTd:prop===\'atd\'?twoPlusTdProbability(player):null',
  'nfl-mlb-two-plus-inline'
]) assert.ok(preview.includes(needle),`preview missing ${needle}`);

for(const needle of [
  "'2+ TD']",
  'const canonicalAtd=findPreviewPropResult',
  'ctx.twoPlusTd=twoPlusTd',
  'chance for 2+ TDs'
]) assert.ok(research.includes(needle),`modal missing ${needle}`);

assert.ok(v890.includes('./nfl-preview.js?v=89.40'));
assert.ok(v893.includes('./nfl-preview-v890.js?v=89.40'));
assert.ok(router.includes('./nfl-preview-v893.js?v=89.42'));
assert.ok(router.includes('./nfl-research-ui.js?v=86.9'));

console.log('NFL v89.19 native 2+ TD visibility regression passed');
