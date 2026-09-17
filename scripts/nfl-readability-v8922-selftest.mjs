import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const css=read('sports/nfl/readability-v8922.js');
const wrapper=read('sports/nfl-preview-v893.js');
const router=read('sports/router.js');
const index=read('index.html');

for(const needle of [
  "style.id='tso-nfl-readability-v8922'",
  '#nflView .nfl-mlb-prop-tab',
  '#nflView .nfl-mlb-prop-name span',
  '#nflView .nfl-mlb-prop-detail>span',
  '#nflView .nfl-mlb-prop-market>span',
  '#nflView .tso-nfl-research-pill',
  '#nflView .tso-nfl-prop-odds-chip span',
  '#nflView .tso-live-switcher label',
  '#nflView .nxg-concept .nxg-tab',
  '#nflView .tso-ht-summary-grid span',
  'font-size:16px!important'
]) assert.ok(css.includes(needle),`missing readability rule: ${needle}`);

assert.ok(!css.includes('6.5px'),'readability layer must not reintroduce 6.5px microtype');
assert.ok(!css.includes('font-size:7px'),'readability layer must not reintroduce 7px microtype');
assert.ok(!css.includes('font-size:8px'),'readability layer must not reintroduce 8px microtype');
assert.ok(!css.includes('font-size:9px'),'readability layer must not reintroduce 9px microtype');

assert.ok(wrapper.includes("readability-v8922.js?v=89.22"),'NFL wrapper must import readability v89.22');
assert.ok(wrapper.includes('installNflReadabilityV8922();'),'NFL wrapper must install readability v89.22');
assert.ok(/\.\/nfl-preview-v893\.js\?v=\d+\.\d+/.test(router),'router must cache-bust NFL wrapper');
assert.ok(/\.\/sports\/router\.js\?v=\d+\.\d+/.test(index),'index must cache-bust shared router');

console.log('NFL readability v89.22 regression passed');
